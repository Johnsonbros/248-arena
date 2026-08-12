/**
 * arena-access — Stripe webhook + access-check service for 248 Arena.
 * -----------------------------------------------------------------------------
 * Closes the payment-verification hole in the lean launch:
 *
 *   POST /webhook                     Stripe webhooks (signature-verified) keep
 *                                     the access store current:
 *                                       checkout.session.completed  -> grant
 *                                       customer.subscription.updated/deleted
 *                                                                   -> refresh/revoke
 *   GET  /api/access?email=           { active } — cross-device unlock for the
 *                                     paywall. On a store miss, does a throttled
 *                                     LIVE Stripe lookup, so subscribers who paid
 *                                     before this service existed are backfilled
 *                                     automatically.
 *   GET  /api/checkout-session?id=    Verifies a Checkout Session AND its live
 *                                     subscription status with Stripe before
 *                                     granting — a canceled customer cannot
 *                                     re-grant from a saved welcome URL.
 *   GET  /healthz                     liveness + record count.
 *
 * Security posture: no Docker socket, no shell-outs, GET+webhook only. The
 * Stripe key should be a RESTRICTED key (read Checkout Sessions + Customers +
 * Subscriptions); the webhook secret authenticates Stripe's calls. /api/access
 * answers only a boolean, so it can't be used to harvest subscriber data.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { JsonList, JsonMap, Store, type AccessStatus } from "./store.js";

const CFG = {
  port: parseInt(process.env.PORT ?? "8766", 10),
  stripeKey: process.env.STRIPE_KEY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  siteOrigin: process.env.SITE_ORIGIN ?? "https://arena.thejohnsonbros.com",
  dataFile: process.env.DATA_FILE ?? "/data/access.json",
  // Magic-link sign-in (optional; /api/login returns 501 until configured)
  resendKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "248 Arena <arena@thejohnsonbros.com>",
  appUrl: process.env.APP_URL ?? "https://arena.thejohnsonbros.com",
  // Key that lets YOU read question reports (GET /api/reports?key=...)
  reportsKey: process.env.REPORTS_KEY ?? "",
};

if (!CFG.stripeKey || !CFG.webhookSecret) {
  console.error("FATAL: STRIPE_KEY and STRIPE_WEBHOOK_SECRET must be set. Refusing to start.");
  process.exit(1);
}

const stripe = new Stripe(CFG.stripeKey);
const store = new Store(CFG.dataFile);

interface ProgressRecord {
  stats: unknown;
  srs: unknown;
  profile?: { name?: string; avatar?: string };
  /** License Locker: checklist status + hour log. Never document files, never
   *  personal information — see sanitizeLocker() and docs/DOCUMENT_VAULT.md. */
  locker?: LockerRecord;
  updatedAt: string;
}
interface LockerEntry {
  id: string;
  date: string;
  hours: number;
  kind: "work" | "education";
  where: string;
  note: string;
}
interface LockerRecord {
  items: Record<string, { status?: string; date?: string; note?: string }>;
  entries: LockerEntry[];
  legacy: boolean;
}

// Massachusetts 201 CMR 17.02 defines "Personal Information" as a resident's
// name plus an SSN, driver's licence / state ID number, or financial account
// number. This service must never come to hold any of those, so the Locker's
// client-side filter is mirrored here — a client is not a trust boundary, and
// a hand-rolled PUT would otherwise walk straight past it.
const PII_RE = [
  /\b\d{3}-\d{2}-\d{4}\b/,        // SSN
  /\b\d{9}\b/,                     // bare 9-digit (SSN without dashes)
  /\b(?:\d[ -]?){13,16}\b/,        // card / account number
  /\bS\d{8}\b/i,                   // MA licence number
  /\b(ssn|social security)\b/i,
];
const clean = (v: unknown, max: number): string => {
  const s = String(v ?? "").replace(/[<>]/g, "").slice(0, max);
  return PII_RE.some((re) => re.test(s)) ? "" : s;
};

function sanitizeLocker(raw: unknown): LockerRecord | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const items: LockerRecord["items"] = {};
  if (r.items && typeof r.items === "object") {
    for (const [k, v] of Object.entries(r.items as Record<string, unknown>).slice(0, 40)) {
      if (!v || typeof v !== "object") continue;
      const it = v as Record<string, unknown>;
      items[clean(k, 40)] = {
        status: ["todo", "doing", "done"].includes(String(it.status)) ? String(it.status) : "todo",
        date: clean(it.date, 10),
        note: clean(it.note, 240),
      };
    }
  }
  const entries: LockerEntry[] = [];
  // 4 years of weekly entries is ~210; 3,000 is generous headroom and still a
  // hard bound on how much a single account can push into the store.
  if (Array.isArray(r.entries)) {
    for (const e of (r.entries as unknown[]).slice(0, 3000)) {
      if (!e || typeof e !== "object") continue;
      const x = e as Record<string, unknown>;
      const hours = Number(x.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 400) continue;
      entries.push({
        id: clean(x.id, 32) || String(entries.length),
        date: clean(x.date, 10),
        hours: Math.round(hours * 10) / 10,
        kind: x.kind === "education" ? "education" : "work",
        where: clean(x.where, 80),
        note: clean(x.note, 160),
      });
    }
  }
  return { items, entries, legacy: r.legacy === true };
}
interface ReportRecord {
  email: string;
  questionId: number;
  reason: string;
  question: string;
  ts: number;
}
interface ScoreRecord {
  email: string;      // stored for dedupe/rank; NEVER returned by the API
  name: string;
  avatar: string;
  title: string;
  level: number;
  mode: "ranked" | "speed";
  score: number;
  correct: number;
  total: number;
  time: number;
  ts: number;
}
const progress = new JsonMap<ProgressRecord>(process.env.PROGRESS_FILE ?? "/data/progress.json");
const scores = new JsonList<ScoreRecord>(process.env.SCORES_FILE ?? "/data/scores.json", 5000);
const reports = new JsonList<ReportRecord>(process.env.REPORTS_FILE ?? "/data/reports.json", 2000);

const ACTIVE: AccessStatus[] = ["active", "trialing", "past_due"];

function mapStatus(s: Stripe.Subscription.Status): AccessStatus {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due"; // grace period; Stripe dunning handles retries
  return "revoked"; // canceled, unpaid, incomplete, incomplete_expired, paused
}

/**
 * Resolve a customer's email. Returns null only for the definitive cases
 * (deleted customer / no email on file). Transient Stripe errors PROPAGATE so
 * the webhook returns non-2xx and Stripe retries — otherwise a cancellation
 * could be silently lost.
 */
async function emailForCustomer(customerId: string): Promise<string | null> {
  const c = await stripe.customers.retrieve(customerId);
  if (!c || (c as Stripe.DeletedCustomer).deleted) return null;
  return (c as Stripe.Customer).email ?? null;
}

/** Write a lifecycle status, migrating the record if the email changed in Stripe. */
async function upsertByIdentity(
  email: string | null,
  status: AccessStatus,
  customerId?: string,
  subscriptionId?: string
): Promise<void> {
  const existingKey = store.findKeyByIds(customerId, subscriptionId);
  const targetEmail = email ?? existingKey ?? null;
  if (!targetEmail) return; // nothing to key the record on
  if (existingKey && email && existingKey !== email.trim().toLowerCase()) {
    // Email changed in Stripe: retire the old key so it can't unlock anymore.
    await store.delete(existingKey);
  }
  await store.set(targetEmail, {
    status,
    customerId,
    subscriptionId,
    updatedAt: new Date().toISOString(),
  });
  console.log(`${status}: ${targetEmail}${existingKey && existingKey !== targetEmail ? ` (migrated from ${existingKey})` : ""}`);
}

/** Best-effort welcome email on first subscription (needs RESEND_API_KEY). */
async function sendWelcomeEmail(email: string): Promise<void> {
  if (!CFG.resendKey) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CFG.resendKey}` },
      body: JSON.stringify({
        from: CFG.mailFrom,
        to: email,
        subject: "Welcome to the Arena ⚔️ — here's how to start",
        html: `
<p>You're in. Your 7-day free trial of <strong>248 Arena</strong> just started.</p>
<p><strong>Getting started:</strong></p>
<ol>
  <li><a href="${CFG.appUrl}/app.html">Open the Arena</a> and start with <strong>Practice mode</strong> — it adapts to you.</li>
  <li>Watch your <strong>Exam Readiness</strong> score climb on the dashboard. Past 70%, run full Exam Sims.</li>
  <li>Ask <strong>The Examiner</strong> (the AI tutor) anything about 248 CMR — or tap the mic and say it out loud.</li>
</ol>
<p>On another device? Just enter this email in the app and tap the sign-in link we send.</p>
<p>Questions or a wrong answer to report? Reply to this email — plumbers read it. <a href="${CFG.appUrl}/help.html">Help &amp; FAQ</a></p>
<p style="color:#888;font-size:12px;">You won't be charged until your trial ends. Cancel anytime from the app (avatar → Manage Subscription). 248 Arena is an independent study aid, not affiliated with the Commonwealth of Massachusetts.</p>`,
      }),
    });
    if (!r.ok) console.error(`welcome email error ${r.status}: ${(await r.text()).slice(0, 200)}`);
  } catch (e: any) {
    console.error("welcome email error:", e?.message ?? e);
  }
}

const app = express();

// --- Stripe webhook (raw body required for signature verification) ----------
app.post("/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.header("stripe-signature") ?? "", CFG.webhookSecret);
  } catch (e: any) {
    return res.status(400).send(`Webhook signature verification failed: ${e.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const email = s.customer_details?.email;
        // Only subscriptions grant app access; one-time payments are sponsor gifts.
        if (email && s.mode === "subscription") {
          const existing = store.get(email);
          const isNewSubscriber = !existing || !ACTIVE.includes(existing.status);
          await upsertByIdentity(
            email,
            "trialing", // corrected by the subscription.updated event that follows
            typeof s.customer === "string" ? s.customer : undefined,
            typeof s.subscription === "string" ? s.subscription : undefined
          );
          if (isNewSubscriber) void sendWelcomeEmail(email); // fire-and-forget
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        // Throws on transient failure -> 500 -> Stripe retries (never lose a revocation).
        const email = await emailForCustomer(customerId);
        const status = event.type === "customer.subscription.deleted" ? "revoked" : mapStatus(sub.status);
        await upsertByIdentity(email, status, customerId, sub.id);
        break;
      }
      default:
        break; // ignore everything else
    }
    res.json({ received: true });
  } catch (e: any) {
    console.error("webhook handler error (will be retried by Stripe):", e?.message ?? e);
    res.status(500).json({ error: "handler failed" });
  }
});

// --- JSON API (CORS-limited to the app's origin) -----------------------------
app.use(express.json({ limit: "256kb" }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", CFG.siteOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function normEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}
function isActiveSubscriber(email: string): boolean {
  const rec = store.get(email);
  return !!rec && ACTIVE.includes(rec.status);
}

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "arena-access", records: store.count() }));

// Throttling for live-Stripe backfill lookups. Two layers, because the endpoint
// is public and unauthenticated:
//   1) per-email TTL cache — bounded (expired entries pruned, hard size cap with
//      oldest-first eviction) so varied inputs can't grow memory forever;
//   2) a GLOBAL sliding-window cap on live lookups, so varying the email can't
//      be used to hammer the Stripe API at all.
const missCache = new Map<string, number>();
const MISS_TTL_MS = 10 * 60 * 1000;
const MISS_CACHE_MAX = 5000;
const globalLookups: number[] = [];
const GLOBAL_WINDOW_MS = 10 * 60 * 1000;
const GLOBAL_MAX_LOOKUPS = 30;

function allowLiveLookup(key: string): boolean {
  const now = Date.now();
  // per-email TTL
  const last = missCache.get(key);
  if (last && now - last < MISS_TTL_MS) return false;
  // prune + bound the cache
  if (missCache.size >= MISS_CACHE_MAX) {
    for (const [k, t] of missCache) if (now - t >= MISS_TTL_MS) missCache.delete(k);
    while (missCache.size >= MISS_CACHE_MAX) {
      const oldest = missCache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      missCache.delete(oldest);
    }
  }
  // global sliding window
  while (globalLookups.length && now - globalLookups[0] > GLOBAL_WINDOW_MS) globalLookups.shift();
  if (globalLookups.length >= GLOBAL_MAX_LOOKUPS) return false;
  missCache.set(key, now);
  globalLookups.push(now);
  return true;
}

/**
 * Live Stripe lookup for subscribers who paid before this service existed
 * (empty-store backfill). Finds the customer by email and checks their real
 * subscription status; stores the result on a hit.
 *
 * Stripe's customers.list email filter is case-sensitive, so we search with the
 * caller's original casing first, then the normalized form — while the local
 * store key stays normalized.
 */
async function backfillFromStripe(rawEmail: string, storeKey: string): Promise<boolean> {
  if (!allowLiveLookup(storeKey)) return false;
  try {
    const candidates = rawEmail === storeKey ? [rawEmail] : [rawEmail, storeKey];
    for (const candidate of candidates) {
      const customers = await stripe.customers.list({ email: candidate, limit: 3 });
      for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
        for (const sub of subs.data) {
          const status = mapStatus(sub.status);
          if (ACTIVE.includes(status)) {
            await store.set(storeKey, {
              status,
              customerId: c.id,
              subscriptionId: sub.id,
              updatedAt: new Date().toISOString(),
            });
            console.log(`grant (backfill): ${storeKey}`);
            return true;
          }
        }
      }
    }
  } catch (e: any) {
    console.error("backfill lookup failed:", e?.message ?? e);
  }
  return false;
}

// Boolean-only by design: knowing an email is active is required for unlock,
// but nothing else about the subscriber is exposed.
app.get("/api/access", async (req: Request, res: Response) => {
  const rawEmail = String(req.query.email ?? "").trim();
  const email = rawEmail.toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) {
    return res.status(400).json({ active: false, error: "Provide ?email=" });
  }
  const rec = store.get(email);
  if (rec && ACTIVE.includes(rec.status)) return res.json({ active: true });
  // Store miss (or revoked): throttled live check — backfills pre-service
  // subscribers and re-activates legitimate resubscribes.
  const active = await backfillFromStripe(rawEmail, email);
  res.json({ active });
});

// Verify a real Checkout Session AND its live subscription with Stripe, then
// grant by customer email. A canceled customer revisiting a saved welcome URL
// gets the subscription's CURRENT status — not the historical session state.
app.get("/api/checkout-session", async (req: Request, res: Response) => {
  const id = String(req.query.id ?? "").trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return res.status(400).json({ active: false, error: "Provide ?id=cs_..." });
  }
  try {
    const s = await stripe.checkout.sessions.retrieve(id, { expand: ["subscription"] });
    const historicalEmail = s.customer_details?.email ?? null;
    if (historicalEmail && s.status === "complete" && s.mode === "subscription") {
      const sub = s.subscription as Stripe.Subscription | null;
      const status = sub ? mapStatus(sub.status) : "revoked";
      if (ACTIVE.includes(status)) {
        const customerId =
          typeof s.customer === "string" ? s.customer : (sub?.customer as string | undefined);
        // The session carries the CHECKOUT-ERA email. If the customer has since
        // changed their email, granting under the old one would resurrect a
        // retired key and lock out the current address — so resolve the current
        // email first. A transient failure here must not grant on stale data.
        let email = historicalEmail;
        if (customerId) {
          try {
            const current = await emailForCustomer(customerId);
            if (current) email = current;
          } catch {
            return res.status(502).json({ active: false, error: "Stripe lookup failed — try again." });
          }
        }
        await upsertByIdentity(email, status, customerId, sub?.id);
        return res.json({ active: true, email });
      }
      return res.json({ active: false, email: historicalEmail }); // canceled since checkout
    }
    // Sponsor gifts (mode=payment) don't grant app access.
    return res.json({ active: false, email: historicalEmail, sponsor: s.mode === "payment" && s.status === "complete" });
  } catch (e: any) {
    return res.status(404).json({ active: false, error: "Session not found or Stripe error." });
  }
});

// --- Progress sync (active subscribers only) ---------------------------------
// One record per subscriber email: app stats + the spaced-repetition schedule.
app.get("/api/progress", (req: Request, res: Response) => {
  const email = normEmail(req.query.email);
  if (!email.includes("@")) return res.status(400).json({ error: "Provide ?email=" });
  if (!isActiveSubscriber(email)) return res.status(403).json({ error: "No active subscription." });
  const rec = progress.get(email);
  res.json(rec ? { found: true, ...rec } : { found: false });
});

app.put("/api/progress", async (req: Request, res: Response) => {
  const email = normEmail(req.body?.email);
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (!isActiveSubscriber(email)) return res.status(403).json({ error: "No active subscription." });
  const { stats, srs, profile, locker } = req.body ?? {};
  if (stats == null || typeof stats !== "object") return res.status(400).json({ error: "stats object required" });
  const size = JSON.stringify({ stats, srs, locker }).length;
  if (size > 400_000) return res.status(413).json({ error: "Progress payload too large." });
  const cleanProfile = profile && typeof profile === "object"
    ? { name: String((profile as any).name ?? "").slice(0, 20), avatar: String((profile as any).avatar ?? "").slice(0, 4) }
    : undefined;
  // Never let a client blank out a Locker it simply didn't send — four years of
  // logged hours must not evaporate because an old build pushed a short payload.
  const cleanLocker = sanitizeLocker(locker) ?? progress.get(email)?.locker;
  await progress.set(email, {
    stats,
    srs: srs ?? {},
    ...(cleanProfile ? { profile: cleanProfile } : {}),
    ...(cleanLocker ? { locker: cleanLocker } : {}),
    updatedAt: new Date().toISOString(),
  });
  res.json({ ok: true, updatedAt: new Date().toISOString() });
});

// --- Question reports (the content-trust pipeline) ---------------------------
app.post("/api/report", async (req: Request, res: Response) => {
  const email = normEmail(req.body?.email);
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (!isActiveSubscriber(email)) return res.status(403).json({ error: "No active subscription." });
  const questionId = Number(req.body?.questionId);
  if (!Number.isFinite(questionId)) return res.status(400).json({ error: "questionId required" });
  await reports.push({
    email,
    questionId: Math.round(questionId),
    reason: String(req.body?.reason ?? "").replace(/[<>]/g, "").slice(0, 500),
    question: String(req.body?.question ?? "").replace(/[<>]/g, "").slice(0, 300),
    ts: Date.now(),
  });
  res.json({ ok: true });
});

// Owner-only report inbox. Set REPORTS_KEY in .env; without it this stays closed.
app.get("/api/reports", (req: Request, res: Response) => {
  if (!CFG.reportsKey || req.query.key !== CFG.reportsKey) return res.status(403).json({ error: "forbidden" });
  res.json({ reports: [...reports.all()].reverse() });
});

// --- Magic-link sign-in (optional hardening; needs RESEND_API_KEY) -----------
const loginTokens = new Map<string, { email: string; exp: number }>();
const loginRequests = new Map<string, number>();

app.post("/api/login", async (req: Request, res: Response) => {
  const email = normEmail(req.body?.email);
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (!CFG.resendKey) return res.status(501).json({ error: "login-email not configured" });
  // Do not leak subscription status here: always claim "sent" for well-formed
  // requests, only actually sending to active subscribers. Throttle 1/min/email.
  const last = loginRequests.get(email);
  if (last && Date.now() - last < 60_000) return res.json({ sent: true });
  loginRequests.set(email, Date.now());
  if (loginRequests.size > 5000) loginRequests.clear();
  if (isActiveSubscriber(email)) {
    const token = randomBytes(24).toString("hex");
    // prune expired tokens; bound the map
    for (const [t, v] of loginTokens) if (v.exp < Date.now()) loginTokens.delete(t);
    if (loginTokens.size > 2000) loginTokens.clear();
    loginTokens.set(token, { email, exp: Date.now() + 15 * 60_000 });
    const link = `${CFG.appUrl}/app.html?login=${token}`;
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${CFG.resendKey}` },
        body: JSON.stringify({
          from: CFG.mailFrom,
          to: email,
          subject: "Your 248 Arena sign-in link",
          html: `<p>Tap to sign in to 248 Arena on this device:</p><p><a href="${link}">Enter the Arena</a></p><p>This link works once and expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
        }),
      });
      if (!r.ok) console.error(`resend error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    } catch (e: any) {
      console.error("login email error:", e?.message ?? e);
    }
  }
  res.json({ sent: true });
});

app.get("/api/login/verify", (req: Request, res: Response) => {
  const token = String(req.query.token ?? "");
  const entry = loginTokens.get(token);
  if (!entry || entry.exp < Date.now()) return res.status(400).json({ ok: false, error: "Link expired or already used — request a new one." });
  loginTokens.delete(token); // single use
  res.json({ ok: true, email: entry.email });
});

// --- Leaderboard -------------------------------------------------------------
// Honest caveat: scores are client-submitted; the server validates ranges and
// requires an active subscription, which stops drive-by junk but not a
// determined cheater. Server-authoritative scoring needs server-run sessions.
app.post("/api/score", async (req: Request, res: Response) => {
  const b = req.body ?? {};
  const email = normEmail(b.email);
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (!isActiveSubscriber(email)) return res.status(403).json({ error: "No active subscription." });
  const mode = b.mode === "speed" ? "speed" : b.mode === "ranked" ? "ranked" : null;
  if (!mode) return res.status(400).json({ error: "mode must be ranked|speed" });
  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null;
  };
  const score = num(b.score, 1_000_000);
  const correct = num(b.correct, 500) ?? 0;
  const total = num(b.total, 500) ?? 0;
  const time = num(b.time, 24 * 60 * 60 * 1000) ?? 0;
  const level = num(b.level, 999) ?? 1;
  if (score == null) return res.status(400).json({ error: "score out of range" });
  const clean = (v: unknown, max: number) => String(v ?? "").replace(/[<>]/g, "").slice(0, max);
  await scores.push({
    email,
    name: clean(b.name, 20) || "Fighter",
    avatar: clean(b.avatar, 4) || "⚔️",
    title: clean(b.title, 30),
    level, mode, score, correct, total, time,
    ts: Date.now(),
  });
  res.json({ ok: true });
});

app.get("/api/leaderboard", (req: Request, res: Response) => {
  const period = String(req.query.period ?? "all");
  const mode = req.query.mode === "speed" ? "speed" : "ranked";
  const email = normEmail(req.query.email); // optional: used only to compute yourRank / mark your row
  const now = Date.now();
  const since = period === "weekly" ? now - 7 * 86400_000 : period === "monthly" ? now - 30 * 86400_000 : 0;
  const best = new Map<string, ScoreRecord>();
  for (const s of scores.all()) {
    if (s.mode !== mode || s.ts < since) continue;
    const prev = best.get(s.email);
    if (!prev || s.score > prev.score) best.set(s.email, s);
  }
  const sorted = [...best.values()].sort((a, b) => b.score - a.score);
  const yourRank = email ? (sorted.findIndex((s) => s.email === email) + 1 || null) : null;
  const entries = sorted.slice(0, 100).map((s) => ({
    name: s.name, avatar: s.avatar, title: s.title, level: s.level,
    score: s.score, correct: s.correct, total: s.total, ts: s.ts,
    you: !!email && s.email === email,
  }));
  res.json({ entries, total: sorted.length, yourRank });
});

await store.load();
await progress.load();
await reports.load();
await scores.load();
app.listen(CFG.port, () => {
  console.log(`arena-access listening on :${CFG.port} (origin=${CFG.siteOrigin}, access=${store.count()}, progress=${progress.count()}, scores=${scores.count()})`);
});
