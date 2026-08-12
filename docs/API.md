# 248 Arena — API & MCP surface

The operating contract for running 248 Arena **autonomously**: every owner-facing
operation is reachable over plain HTTPS or as an MCP tool — no SSH, no UI-only
paths, no manual steps hiding in a browser. This is the map an agent (Hermes,
OpenClaw, a Claude session) needs to run the business.

Two services, one MCP cockpit:

| Component | Base | Auth |
|---|---|---|
| `arena-access` | `https://arena-api.thejohnsonbros.com` | none (public), email-scoped, or `REPORTS_KEY` (admin) |
| `arena-examiner` | `https://arena-ai.thejohnsonbros.com` | subscriber email, fail-closed via arena-access |
| `arena-ops-mcp` | `https://mcp-arena.thejohnsonbros.com/mcp` | `Authorization: Bearer <MCP_AUTH_TOKEN>` + Cloudflare Access |

Admin endpoints take the key as `?key=` (GET) or `"key"` in the JSON body (POST).
All bodies are JSON. All timestamps ISO-8601 unless noted.

---

## arena-access — public endpoints (what the app itself calls)

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /healthz` | Liveness | `{ok, service, records}` |
| `GET /api/access?email=` | Does this email unlock the app? | `{active}`. Enforces scholarship expiry; falls back to throttled Stripe backfill for unknown emails |
| `GET /api/checkout-session?id=cs_...` | Verify a Stripe Checkout session + live subscription | Used by welcome.html |
| `POST /api/login` `{email}` | Send magic sign-in link | 501 if no mailer configured |
| `GET /api/login/verify?token=` | Redeem magic link | 15-min expiry |
| `GET /api/progress?email=` | Pull synced progress (stats, SRS, profile, locker) | 403 unless active |
| `PUT /api/progress` `{email, stats, srs, profile?, locker?}` | Push progress | Locker is PII-filtered server-side; omitted locker never blanks a stored one |
| `POST /api/score` | Submit ranked/speed score | |
| `GET /api/leaderboard?mode=&period=` | Rankings | No emails in response |
| `POST /api/report` `{email, questionId, reason, question}` | Flag a bad question | |
| `POST /api/pulse` `{email, rating(1-3), mode?, accuracy?, answered?, durMs?}` | Post-session fun rating | 403 unless active |
| `POST /api/scholarship/redeem` `{code, email}` | Redeem a scholarship seat | Idempotent for the same email; 409 for anyone else / active subscribers; rate-limited |
| `POST /webhook` | Stripe webhooks (signature-verified) | Stripe only — not for agents |

## arena-access — admin endpoints (`REPORTS_KEY`)

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /api/stats?key=` | **Business health in one call**: subscribers by status, scholarship seats, engagement counts, open reports | The autonomous agent's heartbeat check |
| `GET /api/pulse-summary?key=` | Fun benchmark: 30-day avg rating overall + per mode, histograms, distinct raters | Drives "which mode gets design time" |
| `GET /api/reports?key=` | Question-report inbox, newest first | Content-trust triage queue |
| `POST /api/scholarship/mint` `{key, count≤50, months 1-12, note}` | Mint scholarship codes | Returns the codes — store them; they're not re-shown |
| `GET /api/scholarship/list?key=` | Full code ledger with redemption status | |

## arena-examiner (subscriber-gated, fail-closed)

| Method & path | Purpose |
|---|---|
| `GET /healthz` | Liveness + RAG chunk count + local/premium routing mix |
| `POST /api/chat` `{email, messages, kind: "tutor"\|"oral"}` | Grounded AI tutor turn with citations |
| `POST /api/voice` `{email, audio(b64), mime, messages, kind}` | STT → chat → TTS loop |

---

## arena-ops-mcp — the agent cockpit

One connector, everything above plus deploy/verify. Tools by group:

**Ops (mutating, scoped to the arena container):**
`arena_status` · `arena_deploy` (branch → live) · `arena_restart` · `arena_logs`

**Git / Verify (read-only):**
`arena_git_info` · `arena_fetch_page` · `arena_check_links` · `fleet_containers`

**Stripe (read-only; needs restricted `STRIPE_KEY`):**
`stripe_payment_links` · `stripe_prices` · `stripe_revenue_summary`

**Business (needs `ACCESS_ADMIN_KEY` = arena-access's `REPORTS_KEY`):**
- `arena_business_stats` — wraps `/api/stats`; the heartbeat
- `arena_pulse_summary` — wraps `/api/pulse-summary`; the fun benchmark
- `arena_question_reports {limit?}` — wraps `/api/reports`; triage queue
- `arena_scholarship_list` — wraps `/api/scholarship/list`
- `arena_scholarship_mint {count, months, note}` — **mutating**; mint only what a sponsorship covers
- `arena_access_check {email}` — wraps public `/api/access`

### The autonomous ops loop this enables

A scheduled agent session needs nothing but the MCP connector:

1. `arena_business_stats` — anything on fire? (revoked spike, zero engagement)
2. `arena_pulse_summary` — any mode trending 😩? File an issue with the numbers.
3. `arena_question_reports` — reports open? Read them, fix the question in
   `js/questions.js` via a PR, then `arena_deploy` once merged.
4. `arena_scholarship_list` — sponsorships paid (per `stripe_revenue_summary`)
   but seats not minted? `arena_scholarship_mint` and email the codes out.
5. `arena_status` + `arena_fetch_page` — is production actually serving?
6. Report the run's findings to the owner; touch nothing that's healthy.

### Rules for agents

- **Mutating tools** are exactly: `arena_deploy`, `arena_restart`,
  `arena_scholarship_mint`. Everything else is read-only. When in doubt, read.
- Minting creates real free seats. The honest ratio is **one 3-month code per
  $20 sponsorship** — don't mint speculatively.
- Never echo `REPORTS_KEY` / `ACCESS_ADMIN_KEY` / bearer tokens into logs,
  commits, or chat replies.
- Question-content fixes go through git + PR (the bank is code), then
  `arena_deploy`. There is deliberately no "edit question over API" — content
  changes deserve review history.
- `/api/stats` and `/api/pulse-summary` are cheap; poll them, not Stripe.

---

## Auth material inventory

| Secret | Lives in | Grants |
|---|---|---|
| `MCP_AUTH_TOKEN` | mcp-server `.env` + connector config | The whole cockpit (behind Cloudflare Access too) |
| `REPORTS_KEY` / `ACCESS_ADMIN_KEY` | access-service `.env` / mcp-server `.env` | Admin API: stats, pulse, reports, scholarships |
| `STRIPE_KEY` (restricted, read-only) | mcp-server `.env` | stripe_* tools |
| `STRIPE_KEY` + `STRIPE_WEBHOOK_SECRET` (full) | access-service `.env` only | Payments — never in the MCP container |

One key per surface, so a leak of the agent cockpit's Stripe key still can't
move money, and the admin key can't touch Docker.
