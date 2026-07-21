/**
 * arena-deploy-mcp
 * -----------------------------------------------------------------------------
 * A narrow, token-gated MCP server that lets an authorized Claude session deploy
 * and manage the 248 Arena container on the Unraid host — WITHOUT SSH/Tailnet.
 *
 * It exposes exactly four tools (status, deploy, restart, logs). It never runs
 * arbitrary shell: every action is a fixed command with validated arguments.
 *
 * Transport: Streamable HTTP (stateless JSON) so it can be reached over HTTPS
 * through your existing Cloudflare Tunnel. Auth: a static bearer token; the
 * server refuses to start without one (fail closed). Put it behind Cloudflare
 * Access too — these tools control Docker, i.e. root on the box.
 *
 * See README.md for run + connect instructions.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import { execFile } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// ---- Config (from environment) ----------------------------------------------
const CFG = {
  port: parseInt(process.env.MCP_PORT ?? "8765", 10),
  authToken: process.env.MCP_AUTH_TOKEN ?? "",
  appDir: process.env.APP_DIR ?? "/mnt/user/appdata/248-arena",
  repoSlug: process.env.REPO_SLUG ?? "Johnsonbros/248-arena",
  defaultBranch: process.env.DEFAULT_BRANCH ?? "claude/repo-overview-h1p7ls",
  gitToken: process.env.GIT_TOKEN ?? "",
  container: process.env.CONTAINER_NAME ?? "arena248",
  appPort: parseInt(process.env.ARENA_PORT ?? "8248", 10),
};

if (!CFG.authToken || CFG.authToken.length < 16) {
  console.error("FATAL: MCP_AUTH_TOKEN must be set (>=16 chars). Refusing to start.");
  process.exit(1);
}

const BRANCH_RE = /^[A-Za-z0-9._/-]{1,200}$/;

// ---- Command runner (no shell; fixed argv) ----------------------------------
function run(cmd: string, args: string[], cwd?: string, timeoutMs = 120_000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err && typeof (err as any).code === "number" ? (err as any).code : err ? 1 : 0;
      resolve({ code, stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

const redact = (s: string) => (CFG.gitToken ? s.split(CFG.gitToken).join("***") : s);

// ---- MCP server factory (fresh per request for stateless transport) ---------
function buildServer(): McpServer {
  const server = new McpServer({ name: "arena-deploy", version: "0.1.0" });

  server.registerTool(
    "arena_status",
    {
      title: "Arena status",
      description: "Report whether the 248 Arena container is running, its health, and whether it is serving HTTP 200 locally.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ lines }) => {
      const n = String(lines ?? 50);
      const r = await run("docker", ["logs", "--tail", n, CFG.container]);
      const text = (r.stdout + r.stderr).trim() || "(no output)";
      return { content: [{ type: "text", text }], structuredContent: { lines: Number(n), log: text } };
    }
  );

  return server;
}

// ---- HTTP layer -------------------------------------------------------------
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "arena-deploy-mcp" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const auth = req.header("authorization") ?? "";
  const expected = `Bearer ${CFG.authToken}`;
  // constant-time-ish compare
  if (auth.length !== expected.length || auth !== expected) {
    return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
  }
  next();
});

app.post("/mcp", async (req: Request, res: Response) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
  }
});

// Stateless server: GET/DELETE session streams are not supported.
app.get("/mcp", (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed (stateless server)" }, id: null }));

app.listen(CFG.port, () => {
  console.log(`arena-deploy-mcp listening on :${CFG.port}  (repo=${CFG.repoSlug} appDir=${CFG.appDir} container=${CFG.container})`);
});
