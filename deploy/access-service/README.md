# arena-access — Stripe webhook + access service

Closes the payment-verification hole in the lean launch. Once deployed, access to the app
is **verified against Stripe** instead of trusted client-side:

- **Grant on payment:** Stripe webhooks (`checkout.session.completed`) record the subscriber.
- **Revoke on cancel:** `customer.subscription.updated/deleted` flip the record; the app
  re-verifies grants every 24h, so canceled subs lose access within a day.
- **Cross-device:** subscribers unlock any device with the email they paid with.
- **No more open welcome page:** `welcome.html` exchanges the real `{CHECKOUT_SESSION_ID}`
  for a grant — visiting the page no longer grants anything by itself.

## Endpoints
| Endpoint | Purpose |
|---|---|
| `POST /webhook` | Stripe events (signature-verified with the webhook secret) |
| `GET /api/access?email=` | `{ active: bool }` — paywall unlock check (boolean-only by design) |
| `GET /api/checkout-session?id=cs_…` | verify a session with Stripe → grant + `{ email }` |
| `GET /healthz` | liveness + record count |

Data lives in `./data/access.json` (atomic writes). Include it in backups.
Unlike the ops-MCP, this container mounts **no Docker socket** — it can only talk to Stripe.

## Setup (~15 min)

**1. Run it on AiSync**
```bash
cd /mnt/user/appdata/248-arena/deploy/access-service
cp .env.example .env    # fill in STRIPE_KEY (restricted) + STRIPE_WEBHOOK_SECRET (step 3)
docker compose up -d --build
curl -s localhost:8766/healthz
```
Use a **restricted** Stripe key with READ on Checkout Sessions, Customers, Subscriptions.

**2. Expose it** — add `arena-api.248arena.com → http://<AiSync-LAN-IP>:8766` to the
Cloudflare Tunnel + DNS route. (The webhook must be publicly reachable; do **not** put
Cloudflare Access in front of `/webhook` — Stripe can't log in. Access on `/api/*` is
optional but usually unnecessary since it only answers booleans.)

**3. Create the webhook in Stripe** — Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://arena-api.248arena.com/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`
- Copy the signing secret (`whsec_…`) into `.env` → restart the container.

**4. Point checkout redirects at the session exchange** — in the Pricing Table (and any
Payment Link) set the confirmation redirect to:
```
https://248arena.com/welcome.html?session_id={CHECKOUT_SESSION_ID}
```
Stripe substitutes the real session id at redirect time.

**5. Flip the app gate** — in `js/subscription.js` set `mode: 'server'` (and confirm
`apiBase` matches your hostname), deploy the site. Done: paying customers get verified,
cross-device access; canceled ones lose it automatically.

## Hardening built in
- **Pre-existing subscribers backfill automatically:** on a store miss, `/api/access` does a
  throttled live Stripe lookup, so flipping to server mode never locks out people who paid
  before the webhook existed. Throttling is two-layer — per-email TTL (bounded cache with
  eviction) **plus a global cap of 30 live lookups per 10 minutes** — so varying the email
  can't be used to hammer the Stripe API or grow memory. Lookups preserve the caller's
  email casing (Stripe's filter is case-sensitive) while store keys stay normalized.
- **Saved welcome URLs can't re-grant:** `/api/checkout-session` checks the subscription's
  *current* status with Stripe, not the historical session state.
- **Email changes can't orphan access:** lifecycle events match records by
  customer/subscription id and migrate the email key, retiring the old one.
- **Revocations can't be silently lost:** transient Stripe failures during webhook handling
  return non-2xx, so Stripe retries the event.

## Email touchpoints
- **Welcome email** sends automatically on a first successful subscription (needs
  `RESEND_API_KEY`) — getting-started steps, sign-in explainer, cancel info.
- **Magic-link sign-in** uses the same key.
- **Trial-ending reminder:** use Stripe's built-in one — Dashboard → Settings →
  Subscriptions and emails → enable "Send a reminder email before a trial ends."
  No code needed.

## Honest limitations (v1)
- **Email = key.** Anyone who knows an active subscriber's email can unlock. That's a big
  step up from a shared code, but the next hardening is a magic-link email check.
- `past_due` keeps access (grace) until Stripe gives up and cancels — intentional.
- One-time sponsor payments do **not** grant app access (they're gifts, not subscriptions).
