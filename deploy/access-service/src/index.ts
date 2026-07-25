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
 *                                     paywall ("email you subscribed with").
 *   GET  /api/checkout-session?id=    Verifies a real Checkout Session with
 *                                     Stripe and grants by its customer email —
 *                                     welcome.html calls this with
 *                                     {CHECKOUT_SESSION_ID}, so merely visiting
 *                                     the page no longer grants anything.
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

async function emailForCustomer(customerId: string): Promise<string | null> {
  try {
    const c = await stripe.customers.retrieve(customerId);
    if (!c || (c as Stripe.DeletedCustomer).deleted) return null;
    return (c as Stripe.Customer).email ?? null;
  } catch {
    return null;
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
          await store.set(email, {
            status: "trialing",
            customerId: typeof s.customer === "string" ? s.customer : undefined,
            subscriptionId: typeof s.subscription === "string" ? s.subscription : undefined,
            updatedAt: new Date().toISOString(),
          });
          console.log(`grant (checkout): ${email}`);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const email = await emailForCustomer(customerId);
        if (email) {
          const status = event.type === "customer.subscription.deleted" ? "revoked" : mapStatus(sub.status);
          await store.set(email, {
            status,
            customerId,
            subscriptionId: sub.id,
            updatedAt: new Date().toISOString(),
          });
          console.log(`${status}: ${email} (${event.type})`);
        }
        break;
      }
      default:
        break; // ignore everything else
    }
    res.json({ received: true });
  } catch (e: any) {
    console.error("webhook handler error:", e?.message ?? e);
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

// Boolean-only by design: knowing an email is active is required for unlock,
// but nothing else about the subscriber is exposed.
app.get("/api/access", (req: Request, res: Response) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 200) {
    return res.status(400).json({ active: false, error: "Provide ?email=" });
  }
  const rec = store.get(email);
  res.json({ active: !!rec && ACTIVE.includes(rec.status) });
});

// Verify a real Checkout Session with Stripe, then grant by its customer email.
app.get("/api/checkout-session", async (req: Request, res: Response) => {
  const id = String(req.query.id ?? "").trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return res.status(400).json({ active: false, error: "Provide ?id=cs_..." });
  }
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const email = s.customer_details?.email ?? null;
    const paid = s.status === "complete";
    if (email && paid && s.mode === "subscription") {
      // Webhook normally lands first; this is the synchronous fallback so the
      // welcome page can grant even if webhook delivery lags.
      const existing = store.get(email);
      if (!existing || !ACTIVE.includes(existing.status)) {
        await store.set(email, {
          status: "trialing",
          customerId: typeof s.customer === "string" ? s.customer : undefined,
          subscriptionId: typeof s.subscription === "string" ? s.subscription : undefined,
          updatedAt: new Date().toISOString(),
        });
        console.log(`grant (session verify): ${email}`);
      }
      return res.json({ active: true, email });
    }
    // Sponsor gifts (mode=payment) don't grant app access.
    return res.json({ active: false, email, sponsor: s.mode === "payment" && paid });
  } catch (e: any) {
    return res.status(404).json({ active: false, error: "Session not found or Stripe error." });
  }
});

await store.load();
app.listen(CFG.port, () => {
  console.log(`arena-access listening on :${CFG.port} (origin=${CFG.siteOrigin}, records=${store.count()})`);
});
