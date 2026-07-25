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
import Stripe from "stripe";
import { Store, type AccessStatus } from "./store.js";

const CFG = {
  port: parseInt(process.env.PORT ?? "8766", 10),
  stripeKey: process.env.STRIPE_KEY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  siteOrigin: process.env.SITE_ORIGIN ?? "https://arena.thejohnsonbros.com",
  dataFile: process.env.DATA_FILE ?? "/data/access.json",
};

if (!CFG.stripeKey || !CFG.webhookSecret) {
  console.error("FATAL: STRIPE_KEY and STRIPE_WEBHOOK_SECRET must be set. Refusing to start.");
  process.exit(1);
}

const stripe = new Stripe(CFG.stripeKey);
const store = new Store(CFG.dataFile);

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
          await upsertByIdentity(
            email,
            "trialing", // corrected by the subscription.updated event that follows
            typeof s.customer === "string" ? s.customer : undefined,
            typeof s.subscription === "string" ? s.subscription : undefined
          );
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
app.use(express.json({ limit: "64kb" }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", CFG.siteOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "arena-access", records: store.count() }));

// Throttle live-Stripe backfill lookups so the public endpoint can't be used to
// hammer the Stripe API: at most one live lookup per email per 10 minutes.
const missCache = new Map<string, number>();
const MISS_TTL_MS = 10 * 60 * 1000;

/**
 * Live Stripe lookup for subscribers who paid before this service existed
 * (empty-store backfill). Finds the customer by email and checks their real
 * subscription status; stores the result on a hit.
 */
async function backfillFromStripe(email: string): Promise<boolean> {
  const last = missCache.get(email);
  if (last && Date.now() - last < MISS_TTL_MS) return false;
  missCache.set(email, Date.now());
  try {
    const customers = await stripe.customers.list({ email, limit: 3 });
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
      for (const sub of subs.data) {
        const status = mapStatus(sub.status);
        if (ACTIVE.includes(status)) {
          await store.set(email, {
            status,
            customerId: c.id,
            subscriptionId: sub.id,
            updatedAt: new Date().toISOString(),
          });
          console.log(`grant (backfill): ${email}`);
          return true;
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
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) {
    return res.status(400).json({ active: false, error: "Provide ?email=" });
  }
  const rec = store.get(email);
  if (rec && ACTIVE.includes(rec.status)) return res.json({ active: true });
  // Store miss (or revoked): throttled live check — backfills pre-service
  // subscribers and re-activates legitimate resubscribes.
  const active = await backfillFromStripe(email);
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
    const email = s.customer_details?.email ?? null;
    if (email && s.status === "complete" && s.mode === "subscription") {
      const sub = s.subscription as Stripe.Subscription | null;
      const status = sub ? mapStatus(sub.status) : "revoked";
      if (ACTIVE.includes(status)) {
        await upsertByIdentity(
          email,
          status,
          typeof s.customer === "string" ? s.customer : sub?.customer as string | undefined,
          sub?.id
        );
        return res.json({ active: true, email });
      }
      return res.json({ active: false, email }); // canceled since checkout
    }
    // Sponsor gifts (mode=payment) don't grant app access.
    return res.json({ active: false, email, sponsor: s.mode === "payment" && s.status === "complete" });
  } catch (e: any) {
    return res.status(404).json({ active: false, error: "Session not found or Stripe error." });
  }
});

await store.load();
app.listen(CFG.port, () => {
  console.log(`arena-access listening on :${CFG.port} (origin=${CFG.siteOrigin}, records=${store.count()})`);
});
