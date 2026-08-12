# arena-ops-mcp

A **token-gated MCP server** that gives an authorized Claude session a builder's cockpit
for 248 Arena on your Unraid box **over HTTPS** — no SSH, no Tailscale. MCP rides the same
HTTPS path a sandboxed Claude session is already allowed to use, so this is the one channel
that works from anywhere.

## What it exposes
| Tool | Does | Read-only |
|---|---|---|
| `arena_status` | container up? healthy? serving HTTP 200? | ✅ |
| `arena_deploy` | clone/pull a branch + (re)start the nginx container | ❌ |
| `arena_restart` | restart the container | ❌ |
| `arena_logs` | tail the container logs | ✅ |
| `arena_git_info` | which commit/branch is actually live on the server | ✅ |
| `arena_fetch_page` | fetch a live page: status, title, text excerpt (post-deploy verification) | ✅ |
| `arena_check_links` | crawl a page's internal links for 404s (post-deploy QA) | ✅ |
| `fleet_containers` | read-only `docker ps`, optionally filtered | ✅ |
| `stripe_payment_links` | verify what a buy.stripe.com link actually charges (amount, one-time vs recurring) | ✅ |
| `stripe_prices` | list active prices + products | ✅ |
| `stripe_revenue_summary` | active/trialing subscription counts + recent charge totals | ✅ |
| `arena_business_stats` | one-call business health: subscribers, scholarship seats, engagement, open reports | ✅ |
| `arena_pulse_summary` | the fun benchmark: 30-day 😩/😐/🔥 ratings, overall + per game mode | ✅ |
| `arena_question_reports` | player-filed bad-question reports (content triage queue) | ✅ |
| `arena_scholarship_list` | scholarship code ledger with redemption status | ✅ |
| `arena_scholarship_mint` | mint single-use, time-boxed free-seat codes for sponsored students | ❌ |
| `arena_access_check` | does an email currently unlock the app? | ✅ |

The only mutating tools are deploy/restart/scholarship-mint. No arbitrary shell — every
action is a fixed command with validated arguments. Stripe tools are **GET-only by
construction** and only activate when `STRIPE_KEY` is set — use a **restricted read-only
key**, never your full secret key. Business tools activate when `ACCESS_ADMIN_KEY`
(= arena-access's `REPORTS_KEY`) is set; they talk to arena-access over the docker
network. This is the full surface an autonomous ops agent (Hermes / OpenClaw / a
scheduled Claude session) needs to run the day-to-day — see `docs/API.md` for the
loop and the rules.

## Run it on AiSync
```bash
cd /mnt/user/appdata/248-arena/deploy/mcp-server   # (after cloning the repo)
cp .env.example .env
# edit .env: set a long random MCP_AUTH_TOKEN, and GIT_TOKEN if the repo is private
docker compose up -d --build
curl -s localhost:8765/healthz          # {"ok":true,...}
```

## Expose it (via your existing Cloudflare Tunnel)
Add an ingress rule pointing `mcp-arena.thejohnsonbros.com` at `http://<AiSync-LAN-IP>:8765`,
add the DNS route, reload the tunnel. **Also put it behind Cloudflare Access** — see security.

## Connect it to Claude
In Claude settings → Connectors, add a custom MCP connector:
- **URL:** `https://mcp-arena.thejohnsonbros.com/mcp`
- **Auth header:** `Authorization: Bearer <your MCP_AUTH_TOKEN>`

Enable it for the chat. Its tools then appear in the session, and Claude can run
`arena_deploy` etc. directly against your box.

## ⚠️ Security — read this
This container mounts the **Docker socket**, which is **root-equivalent on the host**. Treat
the endpoint like a root shell:
- Keep the **bearer token** secret and long; the server refuses to start without one.
- Put the hostname behind **Cloudflare Access** (a second, independent auth layer) so a
  leaked token alone isn't enough.
- Never port-forward `8765` raw to the internet — only reach it through the tunnel.
- Scope is deliberately bounded (2 mutating tools, the rest read-only). Don't widen it casually.
- `STRIPE_KEY` must be a **restricted** key (read-only grants) so even a full compromise of
  this box can't move money.

## Local build check (optional)
```bash
npm install && npm run build      # compiles TypeScript to dist/
```
