# GO-LIVE — first paying customer

The goal's done-state: **a stranger can pay $19.99 and study, and a vo-tech kid
can redeem a scholarship code — on the live domain.** This is the ordered
runbook. Steps marked 🧑 need a human (secrets/dashboards); everything else an
agent can do through arena-ops-mcp once step 3 is done.

Time budget: ~1 hour of human attention, mostly Stripe and Cloudflare.

---

## 0 · 🧑 Rotate the burned Stripe test key (5 min) — do this FIRST

A `sk_test_...` key was pasted into a chat session during development. Test
mode or not, it's burned.

1. Stripe Dashboard → Developers → API keys → **Roll** the test secret key.
2. While there, create the two keys production needs:
   - **Restricted key for arena-access** (this is what goes in `.env` — *not*
     the full live secret): read+write on Subscriptions/Customers/Checkout
     Sessions, read on Charges. Name it `arena-access`.
   - **Restricted read-only key for arena-ops-mcp** (optional, enables the
     `stripe_*` agent tools): read-only on Payment Links, Prices, Products,
     Subscriptions, Charges. Name it `arena-ops-readonly`.

Rule that keeps this from happening again: secret keys go from the Stripe
dashboard **directly into `.env` files on the server** — never through chat,
never into git.

## 1 · 🧑 Merge PR #11 (10 min)

Fact-check gate: spot-check the licensure card (6,800 hours = 4 × 1,700;
550 education hours; 8,000 pre-Sept-2008) against 248 CMR 11.02, and any two
gas questions against 248 CMR 4.00–7.00. Merge when satisfied. The installer
defaults to the feature branch until then (`BRANCH=main` overrides after merge).

## 2 · Run the installer on AiSync (5 min)

```bash
ssh <aisync>   # or Unraid terminal
curl -fsSL https://raw.githubusercontent.com/Johnsonbros/248-arena/main/deploy/install-on-aisync.sh | bash
# private repo: GITHUB_TOKEN=github_pat_... bash install-on-aisync.sh
```

What it now does beyond the static site:
- scaffolds all three service `.env`s from their examples (never overwrites)
- **generates** `REPORTS_KEY` and wires the same value into the MCP server's
  `ACCESS_ADMIN_KEY`; **generates** `MCP_AUTH_TOKEN` and prints it once — save it
- creates the shared `arena-net` docker network (cross-service DNS)
- starts examiner + ops-mcp; starts arena-access only once its Stripe keys exist

## 3 · 🧑 Stripe keys into arena-access (5 min)

```bash
cd /mnt/user/appdata/248-arena/deploy/access-service
nano .env    # STRIPE_KEY=rk_live_...  (the restricted key from step 0)
docker compose up -d --build
curl -s localhost:8766/healthz    # {"ok":true,...}
```

Webhook (same visit): Stripe Dashboard → Developers → Webhooks → Add endpoint
`https://arena-api.thejohnsonbros.com/webhook`, events:
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`.
Copy the signing secret into `.env` as `STRIPE_WEBHOOK_SECRET=whsec_...`,
then `docker compose up -d --build` again.

## 4 · 🧑 Cloudflare Tunnel (10 min)

Add to the existing `cloudflared-tunnel` ingress (above the 404 rule), then a
DNS route per hostname and restart the tunnel:

| hostname | service |
|---|---|
| `arena.thejohnsonbros.com` | `http://<LAN-IP>:8248` |
| `arena-api.thejohnsonbros.com` | `http://<LAN-IP>:8766` |
| `arena-ai.thejohnsonbros.com` | `http://<LAN-IP>:8767` |
| `mcp-arena.thejohnsonbros.com` | `http://<LAN-IP>:8765` |

**mcp-arena additionally gets a Cloudflare Access policy** (Zero Trust →
Access → Applications: allow only your email). It fronts the Docker socket;
bearer token alone is not enough belt for that many suspenders.

## 5 · Flip the gate to server mode (2 min)

`js/subscription.js` → `ACCESS_CONFIG.mode: 'server'` (currently `'code'`),
commit to main, `git pull && docker restart arena248` (or let an agent do it
via `arena_deploy` once the connector is added).

## 6 · 🧑 The money test (10 min) — the goal's acceptance test

Live mode, real card, on your phone (not the dev machine):

1. `arena.thejohnsonbros.com` → START FREE TRIAL → complete checkout.
2. Welcome page grants access → app loads → answer a question.
3. Open the app in a private window → gate blocks → unlock with the same
   email → magic link / unlock works.
4. Stripe Dashboard: subscription shows `trialing`. ✔️ money path works.
5. Customer portal → cancel → within a minute the gate refuses new unlocks
   (webhook revoke). Re-subscribe if you want to keep the account.

## 7 · Scholarship pilot (10 min)

```bash
curl -X POST https://arena-api.thejohnsonbros.com/api/scholarship/mint \
  -H 'Content-Type: application/json' \
  -d '{"key":"<REPORTS_KEY>","count":5,"months":3,"note":"pilot cohort #1"}'
```

Hand the five codes to one shop teacher you know. A student redeems at the
gate with code + email — no card. From that moment Pulse ratings and question
reports start flowing: your improvement benchmark is live with real students.

## 8 · Hand the keys to the agents (5 min)

Add the connector in Claude settings (or Hermes/OpenClaw config):
- URL: `https://mcp-arena.thejohnsonbros.com/mcp`
- Header: `Authorization: Bearer <MCP_AUTH_TOKEN from step 2>`

From then on, the ops loop in `docs/API.md` runs without SSH:
`arena_business_stats` → `arena_pulse_summary` → `arena_question_reports` →
`arena_scholarship_*` → `arena_deploy`/`arena_fetch_page`.

---

## Smoke matrix (agent-runnable after step 8)

| Check | How | Pass |
|---|---|---|
| Site serves | `arena_fetch_page /index.html` | 200, title contains "248 Arena" |
| No broken links | `arena_check_links /` | 0 failures |
| Gate closed | fetch `app.html` fresh session | paywall renders |
| API up | `GET arena-api…/healthz` | `ok:true` |
| Examiner up | `GET arena-ai…/healthz` | `ok:true`, chunks > 0, mix reported |
| Business tools | `arena_business_stats` | structured counts |
| Leaderboard clean | `GET /api/leaderboard` | no demo names |

## Rollbacks

- Site: `git -C /mnt/user/appdata/248-arena checkout <last-good> && docker restart arena248`
- Services: `docker compose down` in the service dir (site keeps working; gate
  falls back to fail-closed on the client's 24 h recheck)
- Gate emergency-open (outage, users locked out): set
  `ACCESS_CONFIG.mode:'off'` on main and redeploy the static site only.
