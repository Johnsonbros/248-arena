/**
 * arena-ops-mcp — tool registrations.
 *
 * Groups:
 *   Ops    (mutating, scoped): arena_status, arena_deploy, arena_restart, arena_logs
 *   Git    (read-only):        arena_git_info
 *   Verify (read-only):        arena_fetch_page, arena_check_links
 *   Fleet  (read-only):        fleet_containers
 *   Stripe (read-only, GET):   stripe_payment_links, stripe_prices, stripe_revenue_summary
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BRANCH_RE, CFG, accessApi, htmlToText, redact, run, stripeGet, usd } from "./shared.js";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const RO_NET = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerAll(server: McpServer): void {
  // ---------------------------------------------------------------- Ops -----
  server.registerTool(
    "arena_status",
    {
      title: "Arena status",
      description: "Report whether the 248 Arena container is running, its health, and whether it is serving HTTP 200 locally.",
      inputSchema: {},
      annotations: RO,
    },
    async () => {
      const ps = await run("docker", ["ps", "-a", "--filter", `name=^/${CFG.container}$`, "--format", "{{.Status}}"]);
      const running = ps.stdout.trim().toLowerCase().startsWith("up");
      const http = await run("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "5", `http://localhost:${CFG.appPort}/index.html`]);
      const structured = { container: CFG.container, running, status: ps.stdout.trim() || "not created", httpCode: http.stdout.trim() || "000" };
      return {
        content: [{ type: "text", text: `Container ${CFG.container}: ${structured.status || "absent"}\nLocal HTTP ${CFG.appPort}: ${structured.httpCode}` }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    "arena_deploy",
    {
      title: "Deploy Arena",
      description: "Clone/pull the given branch of the 248 Arena repo and (re)start the nginx container. Idempotent — safe to run repeatedly. Returns the resulting status.",
      inputSchema: {
        branch: z.string().regex(BRANCH_RE).optional().describe(`Git branch to deploy. Defaults to "${CFG.defaultBranch}".`),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ branch }) => {
      const b = branch ?? CFG.defaultBranch;
      if (!BRANCH_RE.test(b)) {
        return { isError: true, content: [{ type: "text", text: `Invalid branch name: ${b}` }] };
      }
      const remote = CFG.gitToken
        ? `https://${CFG.gitToken}@github.com/${CFG.repoSlug}.git`
        : `https://github.com/${CFG.repoSlug}.git`;

      const steps: string[] = [];
      const isRepo = await run("git", ["-C", CFG.appDir, "rev-parse", "--is-inside-work-tree"]);
      if (isRepo.code === 0) {
        await run("git", ["-C", CFG.appDir, "remote", "set-url", "origin", remote]);
        const f = await run("git", ["-C", CFG.appDir, "fetch", "origin", b]);
        if (f.code !== 0) return { isError: true, content: [{ type: "text", text: `git fetch failed:\n${redact(f.stderr)}` }] };
        await run("git", ["-C", CFG.appDir, "checkout", b]);
        const r = await run("git", ["-C", CFG.appDir, "reset", "--hard", `origin/${b}`]);
        steps.push(`updated -> ${redact(r.stdout).trim()}`);
      } else {
        const c = await run("git", ["clone", "--branch", b, remote, CFG.appDir]);
        if (c.code !== 0) return { isError: true, content: [{ type: "text", text: `git clone failed (private repo needs GIT_TOKEN):\n${redact(c.stderr)}` }] };
        steps.push("cloned");
      }

      await run("docker", ["rm", "-f", CFG.container]); // ignore result if absent
      const up = await run("docker", [
        "run", "-d", "--name", CFG.container, "--restart", "unless-stopped",
        "-p", `${CFG.appPort}:80`, "-v", `${CFG.appDir}:/usr/share/nginx/html:ro`, "nginx:alpine",
      ]);
      if (up.code !== 0) return { isError: true, content: [{ type: "text", text: `docker run failed:\n${up.stderr}` }] };

      await new Promise((r) => setTimeout(r, 1500));
      const http = await run("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "5", `http://localhost:${CFG.appPort}/index.html`]);
      const ok = http.stdout.trim() === "200";
      return {
        content: [{ type: "text", text: `Deploy of ${b}: ${steps.join(", ")}\nContainer restarted. Local HTTP ${CFG.appPort}: ${http.stdout.trim()}${ok ? " ✓" : " (check logs)"}` }],
        structuredContent: { branch: b, steps, httpCode: http.stdout.trim(), ok },
      };
    }
  );

  server.registerTool(
    "arena_restart",
    {
      title: "Restart Arena",
      description: "Restart the 248 Arena container without redeploying code.",
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const r = await run("docker", ["restart", CFG.container]);
      if (r.code !== 0) return { isError: true, content: [{ type: "text", text: `Restart failed:\n${r.stderr}` }] };
      return { content: [{ type: "text", text: `Restarted ${CFG.container}.` }], structuredContent: { container: CFG.container, restarted: true } };
    }
  );

  server.registerTool(
    "arena_logs",
    {
      title: "Arena logs",
      description: "Return the last N lines of the 248 Arena container logs (for debugging a failed deploy).",
      inputSchema: { lines: z.number().int().min(1).max(500).optional().describe("How many trailing log lines (default 50).") },
      annotations: RO,
    },
    async ({ lines }) => {
      const n = String(lines ?? 50);
      const r = await run("docker", ["logs", "--tail", n, CFG.container]);
      const text = (r.stdout + r.stderr).trim() || "(no output)";
      return { content: [{ type: "text", text }], structuredContent: { lines: Number(n), log: text } };
    }
  );

  // ---------------------------------------------------------------- Git -----
  server.registerTool(
    "arena_git_info",
    {
      title: "Server checkout info",
      description: "Report which commit/branch the server's checkout is actually on, when it was last updated, and whether the working tree is dirty — i.e. what code is really live.",
      inputSchema: {},
      annotations: RO,
    },
    async () => {
      const head = await run("git", ["-C", CFG.appDir, "log", "-1", "--format=%h %ad %s", "--date=iso-strict"]);
      const branch = await run("git", ["-C", CFG.appDir, "rev-parse", "--abbrev-ref", "HEAD"]);
      const dirty = await run("git", ["-C", CFG.appDir, "status", "--porcelain"]);
      if (head.code !== 0) {
        return { isError: true, content: [{ type: "text", text: `No git checkout at ${CFG.appDir} — run arena_deploy first.\n${head.stderr}` }] };
      }
      const dirtyCount = dirty.stdout.split("\n").filter((l) => l.trim()).length;
      const structured = { head: head.stdout.trim(), branch: branch.stdout.trim(), dirtyFiles: dirtyCount, appDir: CFG.appDir };
      return {
        content: [{ type: "text", text: `Live checkout: ${structured.branch} @ ${structured.head}\nDirty files: ${dirtyCount}` }],
        structuredContent: structured,
      };
    }
  );

  // ------------------------------------------------------------- Verify -----
  server.registerTool(
    "arena_fetch_page",
    {
      title: "Fetch live page",
      description: "Fetch a page from the locally served site (e.g. '/pricing.html') and return its HTTP status, <title>, and readable text excerpt. Use after a deploy to verify the live content end-to-end.",
      inputSchema: {
        path: z.string().max(300).describe("Site-relative path, e.g. '/index.html' or '/pricing.html'."),
        maxChars: z.number().int().min(100).max(20000).optional().describe("Max characters of extracted text to return (default 2000)."),
      },
      annotations: RO,
    },
    async ({ path, maxChars }) => {
      const p = path.startsWith("/") ? path : `/${path}`;
      if (p.includes("..")) return { isError: true, content: [{ type: "text", text: "Path traversal is not allowed." }] };
      const res = await fetch(`http://localhost:${CFG.appPort}${p}`).catch((e: any) => e);
      if (!(res instanceof Response)) {
        return { isError: true, content: [{ type: "text", text: `Fetch failed: ${res?.message ?? res}. Is the container running? Try arena_status.` }] };
      }
      const html = await res.text();
      const { title, text } = htmlToText(html);
      const excerpt = text.slice(0, maxChars ?? 2000);
      const structured = { path: p, status: res.status, title, chars: text.length, excerpt };
      return {
        content: [{ type: "text", text: `${res.status} ${p}\nTitle: ${title || "(none)"}\n---\n${excerpt}` }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    "arena_check_links",
    {
      title: "Check internal links",
      description: "Fetch a page and verify every internal href/src it references resolves on the live site (no 404s). Returns broken links. Great post-deploy QA.",
      inputSchema: {
        path: z.string().max(300).optional().describe("Page to scan (default '/index.html')."),
      },
      annotations: RO,
    },
    async ({ path }) => {
      const p0 = path ?? "/index.html";
      const p = p0.startsWith("/") ? p0 : `/${p0}`;
      const res = await fetch(`http://localhost:${CFG.appPort}${p}`).catch((e: any) => e);
      if (!(res instanceof Response) || !res.ok) {
        return { isError: true, content: [{ type: "text", text: `Could not fetch ${p} (${res instanceof Response ? res.status : res?.message}).` }] };
      }
      const html = await res.text();
      const refs = new Set<string>();
      const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        const u = m[1];
        if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(u)) continue;
        refs.add(u.split("#")[0].split("?")[0]);
      }
      const results: { url: string; status: number }[] = [];
      for (const u of refs) {
        if (!u) continue;
        const full = u.startsWith("/") ? u : `/${u}`;
        const r = await fetch(`http://localhost:${CFG.appPort}${full}`).catch(() => null);
        results.push({ url: full, status: r ? r.status : 0 });
      }
      const broken = results.filter((r) => r.status >= 400 || r.status === 0);
      const structured = { page: p, checked: results.length, broken };
      return {
        content: [{
          type: "text",
          text: broken.length === 0
            ? `${p}: all ${results.length} internal links resolve ✓`
            : `${p}: ${broken.length}/${results.length} broken:\n` + broken.map((b) => `  ${b.status || "ERR"}  ${b.url}`).join("\n"),
        }],
        structuredContent: structured,
      };
    }
  );

  // -------------------------------------------------------------- Fleet -----
  server.registerTool(
    "fleet_containers",
    {
      title: "List containers",
      description: "Read-only docker ps: list running containers (name, image, status), optionally filtered by a name substring. For checking what's up on the host.",
      inputSchema: {
        filter: z.string().max(60).optional().describe("Case-insensitive name substring filter, e.g. 'arena'."),
      },
      annotations: RO,
    },
    async ({ filter }) => {
      const r = await run("docker", ["ps", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}"]);
      if (r.code !== 0) return { isError: true, content: [{ type: "text", text: `docker ps failed:\n${r.stderr}` }] };
      let rows = r.stdout.trim().split("\n").filter(Boolean).map((l) => {
        const [name, image, ...status] = l.split("\t");
        return { name, image, status: status.join(" ") };
      });
      if (filter) rows = rows.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));
      return {
        content: [{ type: "text", text: rows.map((c) => `${c.name}  |  ${c.image}  |  ${c.status}`).join("\n") || "(no matches)" }],
        structuredContent: { count: rows.length, containers: rows },
      };
    }
  );

  // ------------------------------------------------------------- Stripe -----
  server.registerTool(
    "stripe_payment_links",
    {
      title: "Inspect Stripe payment links",
      description: "Read-only: list active Stripe Payment Links with their line items — amount, currency, and whether each is one-time or recurring. Use to verify a buy.stripe.com URL charges what you think it does. Requires STRIPE_KEY (restricted, read-only).",
      inputSchema: {
        urlContains: z.string().max(120).optional().describe("Optional substring to match against the link URL, e.g. '8x2eV6'."),
      },
      annotations: RO_NET,
    },
    async ({ urlContains }) => {
      const list = await stripeGet("/v1/payment_links?limit=100&active=true");
      let links: any[] = list.data ?? [];
      if (urlContains) links = links.filter((l) => (l.url ?? "").includes(urlContains));
      links = links.slice(0, 10);
      const out: any[] = [];
      for (const l of links) {
        const items = await stripeGet(`/v1/payment_links/${l.id}/line_items`);
        const lines = (items.data ?? []).map((it: any) => {
          const qty = it.quantity ?? 1;
          return {
            description: it.description,
            quantity: qty,
            unitAmount: usd(it.price?.unit_amount),
            lineTotal: usd((it.price?.unit_amount ?? 0) * qty),
            currency: it.price?.currency,
            billing: it.price?.recurring ? `recurring/${it.price.recurring.interval}` : "one-time",
          };
        });
        out.push({ url: l.url, id: l.id, active: l.active, lines });
      }
      const text = out.length
        ? out.map((l) => `${l.url}\n` + l.lines.map((li: any) => `  ${li.quantity} × ${li.unitAmount} = ${li.lineTotal} ${li.billing}  (${li.description ?? "item"})`).join("\n")).join("\n\n")
        : "No matching active payment links.";
      return { content: [{ type: "text", text }], structuredContent: { links: out } };
    }
  );

  server.registerTool(
    "stripe_prices",
    {
      title: "List Stripe prices",
      description: "Read-only: list Stripe prices (amount, currency, one-time vs recurring interval, product name). Requires STRIPE_KEY (restricted, read-only).",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max prices to return (default 20)."),
      },
      annotations: RO_NET,
    },
    async ({ limit }) => {
      const res = await stripeGet(`/v1/prices?limit=${limit ?? 20}&active=true&expand[]=data.product`);
      const rows = (res.data ?? []).map((p: any) => ({
        id: p.id,
        product: typeof p.product === "object" ? p.product?.name : p.product,
        amount: usd(p.unit_amount),
        currency: p.currency,
        billing: p.recurring ? `recurring/${p.recurring.interval}` : "one-time",
      }));
      return {
        content: [{ type: "text", text: rows.map((r: any) => `${r.amount} ${r.billing}  ${r.product}  (${r.id})`).join("\n") || "(none)" }],
        structuredContent: { prices: rows },
      };
    }
  );

  server.registerTool(
    "stripe_revenue_summary",
    {
      title: "Stripe revenue summary",
      description: "Read-only: active subscription count and recent charges (succeeded totals). A quick business-health check. Requires STRIPE_KEY (restricted, read-only).",
      inputSchema: {},
      annotations: RO_NET,
    },
    async () => {
      const subs = await stripeGet("/v1/subscriptions?status=active&limit=100");
      const trialing = await stripeGet("/v1/subscriptions?status=trialing&limit=100");
      const charges = await stripeGet("/v1/charges?limit=20");
      const succeeded = (charges.data ?? []).filter((c: any) => c.status === "succeeded");
      // Net of refunds: a charge's amount_refunded reflects partial/full refunds.
      const recentNet = succeeded.reduce((s: number, c: any) => s + (c.amount ?? 0) - (c.amount_refunded ?? 0), 0);
      const refunded = succeeded.reduce((s: number, c: any) => s + (c.amount_refunded ?? 0), 0);
      const structured = {
        activeSubscriptions: (subs.data ?? []).length,
        activeHasMore: !!subs.has_more,
        trialingSubscriptions: (trialing.data ?? []).length,
        recentSucceededCharges: succeeded.length,
        recentNetTotal: usd(recentNet),
        recentRefundedTotal: usd(refunded),
      };
      return {
        content: [{
          type: "text",
          text:
            `Active subscriptions: ${structured.activeSubscriptions}${structured.activeHasMore ? "+" : ""}\n` +
            `Trialing: ${structured.trialingSubscriptions}\n` +
            `Last ${succeeded.length} succeeded charges, net of refunds: ${structured.recentNetTotal}` +
            (refunded > 0 ? ` (refunded: ${structured.recentRefundedTotal})` : ""),
        }],
        structuredContent: structured,
      };
    }
  );

  // ------------------------------------------------------------ Business -----
  // Wrappers over arena-access's admin API, so an autonomous agent (Hermes,
  // OpenClaw, a Claude session) can run the day-to-day without SSH or a UI:
  // read the fun benchmark, mint scholarship codes, triage question reports,
  // check any account. Requires ACCESS_ADMIN_KEY (= the service's REPORTS_KEY).
  const needKey = () =>
    CFG.accessAdminKey
      ? null
      : { content: [{ type: "text" as const, text: "ACCESS_ADMIN_KEY is not configured on arena-ops-mcp — business tools are disabled." }], isError: true };

  const asResult = (r: { ok: boolean; status: number; body: any }, summarize: (b: any) => string) =>
    r.ok
      ? { content: [{ type: "text" as const, text: summarize(r.body) }], structuredContent: r.body }
      : { content: [{ type: "text" as const, text: `arena-access returned ${r.status}: ${r.body?.error ?? "unknown error"}` }], isError: true };

  server.registerTool(
    "arena_business_stats",
    {
      title: "Business health snapshot",
      description: "One-call overview from arena-access: subscriber counts by status, scholarship seats (minted/redeemed/active/expired), engagement (progress records, leaderboard scores, pulse ratings), and open question reports.",
      inputSchema: {},
      annotations: RO_NET,
    },
    async () => {
      const gate = needKey(); if (gate) return gate;
      const r = await accessApi(`/api/stats?key=${encodeURIComponent(CFG.accessAdminKey)}`);
      return asResult(r, (b) =>
        `Subscribers: ${b.subscribers?.active ?? 0} active, ${b.subscribers?.trialing ?? 0} trialing, ${b.subscribers?.pastDue ?? 0} past-due\n` +
        `Scholarships: ${b.scholarships?.activeSeats ?? 0} active seats (${b.scholarships?.redeemed ?? 0}/${b.scholarships?.minted ?? 0} codes redeemed)\n` +
        `Engagement: ${b.engagement?.progressRecords ?? 0} synced players, ${b.engagement?.pulseRatings7d ?? 0} fun ratings this week\n` +
        `Open question reports: ${b.content?.openQuestionReports ?? 0}`);
    }
  );

  server.registerTool(
    "arena_pulse_summary",
    {
      title: "Fun benchmark (Pulse)",
      description: "30-day post-session fun ratings (😩/😐/🔥): average overall and per game mode with histograms, plus distinct raters. The benchmark for whether a mode needs design time.",
      inputSchema: {},
      annotations: RO_NET,
    },
    async () => {
      const gate = needKey(); if (gate) return gate;
      const r = await accessApi(`/api/pulse-summary?key=${encodeURIComponent(CFG.accessAdminKey)}`);
      return asResult(r, (b) => {
        const modes = Object.entries(b.byMode ?? {})
          .map(([m, s]: [string, any]) => `  ${m}: avg ${s.avg} over ${s.ratings} ratings`).join("\n");
        return `Avg rating (30d): ${b.avgRating ?? "no data"} across ${b.totalRatings} ratings from ${b.distinctRaters} players\n${modes || "  (no per-mode data yet)"}`;
      });
    }
  );

  server.registerTool(
    "arena_question_reports",
    {
      title: "Question report inbox",
      description: "Player-filed reports of wrong/unclear questions, newest first — the content-trust triage queue. Each row: question id, excerpt, reason, reporter, timestamp.",
      inputSchema: { limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 25)") },
      annotations: RO_NET,
    },
    async ({ limit }) => {
      const gate = needKey(); if (gate) return gate;
      const r = await accessApi(`/api/reports?key=${encodeURIComponent(CFG.accessAdminKey)}`);
      if (!r.ok) return asResult(r, () => "");
      const rows = (r.body.reports ?? []).slice(0, limit ?? 25);
      return {
        content: [{ type: "text", text: rows.length ? rows.map((x: any) => `#${x.questionId} [${new Date(x.ts).toISOString().slice(0, 10)}] ${x.reason} — "${(x.question ?? "").slice(0, 80)}"`).join("\n") : "No open reports." }],
        structuredContent: { reports: rows },
      };
    }
  );

  server.registerTool(
    "arena_scholarship_list",
    {
      title: "Scholarship code ledger",
      description: "Every minted scholarship code with months, note, and redemption status (who redeemed, when). Use to audit sponsored seats or find unredeemed codes to hand out.",
      inputSchema: {},
      annotations: RO_NET,
    },
    async () => {
      const gate = needKey(); if (gate) return gate;
      const r = await accessApi(`/api/scholarship/list?key=${encodeURIComponent(CFG.accessAdminKey)}`);
      return asResult(r, (b) => {
        const rows = b.scholarships ?? [];
        const open = rows.filter((x: any) => !x.usedBy);
        return `${rows.length} codes minted, ${rows.length - open.length} redeemed, ${open.length} available.\n` +
          open.slice(0, 10).map((x: any) => `  ${x.code} (${x.months}mo${x.note ? `, ${x.note}` : ""})`).join("\n");
      });
    }
  );

  server.registerTool(
    "arena_scholarship_mint",
    {
      title: "Mint scholarship codes",
      description: "Mint single-use, time-boxed scholarship codes (SCHLR-XXXX-XXXX) that grant free access with just an email — for sponsored vo-tech students. MUTATING: creates real codes that unlock real seats; mint only what a sponsorship or the owner's ask covers.",
      inputSchema: {
        count: z.number().int().min(1).max(50).describe("How many codes to mint"),
        months: z.number().int().min(1).max(12).describe("Months of access per code"),
        note: z.string().max(120).describe("Who these are for, e.g. 'Worcester Tech Sept cohort'"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ count, months, note }) => {
      const gate = needKey(); if (gate) return gate;
      const r = await accessApi("/api/scholarship/mint", { method: "POST", body: { key: CFG.accessAdminKey, count, months, note } });
      return asResult(r, (b) => `Minted ${b.codes?.length ?? 0} codes × ${b.months}mo (${note}):\n` + (b.codes ?? []).join("\n"));
    }
  );

  server.registerTool(
    "arena_access_check",
    {
      title: "Check account access",
      description: "Whether an email currently unlocks the app (subscription or scholarship seat). Read-only; uses the same public endpoint the app's gate uses.",
      inputSchema: { email: z.string().email().describe("Account email to check") },
      annotations: RO_NET,
    },
    async ({ email }) => {
      const r = await accessApi(`/api/access?email=${encodeURIComponent(email)}`);
      return asResult(r, (b) => `${email}: ${b.active ? "ACTIVE" : "no access"}`);
    }
  );
}
