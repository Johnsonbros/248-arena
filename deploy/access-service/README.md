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

**2. Expose it** — add `arena-api.thejohnsonbros.com → http://<AiSync-LAN-IP>:8766` to the
Cloudflare Tunnel + DNS route. (The webhook must be publicly reachable; do **not** put
Cloudflare Access in front of `/webhook` — Stripe can't log in. Access on `/api/*` is
optional but usually unnecessary since it only answers booleans.)

**3. Create the webhook in Stripe** — Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://arena-api.thejohnsonbros.com/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`
- Copy the signing secret (`whsec_…`) into `.env` → restart the container.

**4. Point checkout redirects at the session exchange** — in the Pricing Table (and any
Payment Link) set the confirmation redirect to:
```
https://arena.thejohnsonbros.com/welcome.html?session_id={CHECKOUT_SESSION_ID}
```
Stripe substitutes the real session id at redirect time.

**5. Flip the app gate** — in `js/subscription.js` set `mode: 'server'` (and confirm
`apiBase` matches your hostname), deploy the site. Done: paying customers get verified,
cross-device access; canceled ones lose it automatically.

## Honest limitations (v1)
- **Email = key.** Anyone who knows an active subscriber's email can unlock. That's a big
  step up from a shared code, but the next hardening is a magic-link email check.
- `past_due` keeps access (grace) until Stripe gives up and cancels — intentional.
- One-time sponsor payments do **not** grant app access (they're gifts, not subscriptions).
