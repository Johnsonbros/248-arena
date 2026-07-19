# 248 Arena — Platform Design (v3: Self-Hosted Subscription SaaS)

**Goal:** Evolve 248 Arena from a static, single-user localStorage app into a real,
self-hosted, subscription study platform that (a) genuinely helps you pass the MA
Journeyman Plumbing exam, and (b) can be sold to other plumbers as a monthly subscription.

**Business model:** 7-day free trial → single monthly plan (with an optional discounted annual plan).

**Where it runs:** Your Unraid server — i9 / 128 GB RAM / 8 TB NVMe / RTX 3090 — behind
your own domain via port-forward. Everything self-hosted except payments (Stripe) and,
optionally, transactional email + a CDN/proxy in front.

---

## 0. TL;DR of the recommendation

Run the whole thing as a **Docker Compose stack on Unraid**:

- **Web app + API:** one Next.js application (frontend + backend in one codebase).
- **Database:** PostgreSQL (with the `pgvector` extension for AI search).
- **Auth:** self-hosted email/password + magic-link (Auth.js), sessions in Postgres.
- **Payments:** Stripe Billing (free trial → monthly). Card data never touches your server.
- **The Examiner (AI tutor):** Ollama on the 3090 + a RAG layer grounded in the actual
  248 CMR text, so answers *cite the code* instead of hallucinating.
- **Edge:** Caddy or Nginx Proxy Manager for automatic HTTPS, with Cloudflare (free) in
  front to hide your home IP and absorb attacks.
- **Backups:** automated `pg_dump` to the RAID array, plus one offsite copy.

The one thing we do **not** self-host is card processing — Stripe is required and correct
there (it keeps you out of PCI scope entirely).

This is the standard "indie SaaS" architecture, adapted to run on your own hardware. It's
well-trodden, heavily documented, and easy to get AI help with as you build.

---

## 1. Why change the architecture at all

The current app is pure HTML/CSS/JS with `localStorage`. That's great for a demo, but it
**cannot** support a paid product because:

| Requirement for a paid product | localStorage app | What we need |
|---|---|---|
| User accounts across devices | ❌ data trapped in one browser | Central database + auth |
| Take payments / gate content | ❌ anyone can read the JS | Server-side subscription checks |
| Protect the question bank (your moat) | ❌ shipped in plaintext to every visitor | Questions served per-request to paying users |
| Real leaderboards | ❌ fake/local only | Server-computed from real attempts |
| Track learning over time | ❌ wiped when cache clears | Durable per-user history |
| AI tutor grounded in code | ❌ none | Local LLM + retrieval |

So the study *content and design* carry forward, but the app becomes a client to a real backend.

---

## 2. Deployment architecture (Unraid + Docker)

Unraid runs Docker natively (use the **Docker Compose Manager** community plugin). The whole
platform is one Compose stack of small containers on a private Docker network. Only the
reverse proxy is exposed to the internet.

```
                       Internet
                          │
                   [ Cloudflare ]        ← free: hides home IP, DDoS/WAF, caching
                          │  (443)
                 ┌────────▼─────────┐
                 │  Caddy / NPM     │    ← auto-HTTPS (Let's Encrypt), only exposed port
                 └────────┬─────────┘
      ┌───────────────────┼───────────────────────────┐
      │   private docker network (nothing else public) │
      │                   │                             │
 ┌────▼─────┐      ┌───────▼────────┐          ┌────────▼────────┐
 │ Next.js  │◄────►│  PostgreSQL    │          │  Ollama (GPU)   │
 │ web+API  │      │  + pgvector    │          │  3090 passthru  │
 └────┬─────┘      └───────┬────────┘          └────────┬────────┘
      │                    │                            │
      │             ┌──────▼───────┐            ┌────────▼────────┐
      │             │ pg_dump cron │            │ Examiner RAG    │
      │             │  → RAID      │            │ retrieval svc   │
      │             └──────────────┘            └─────────────────┘
      │
      └───► Stripe (webhooks in/out)   ───►  Resend/Postmark (email, or self-hosted)
```

**Containers:**

| Container | Image / basis | Purpose | Notes |
|---|---|---|---|
| `caddy` (or `npm`) | caddy / nginx-proxy-manager | TLS + reverse proxy | Only container with a forwarded port |
| `web` | your Next.js app | Frontend + API + auth + Stripe webhooks | Scales to multiple replicas later |
| `postgres` | postgres:16 + pgvector | All app data + vector search | Data dir on **NVMe** |
| `ollama` | ollama/ollama | Local LLM for The Examiner | GPU passthrough to the 3090 |
| `examiner` | small Python/Node svc | RAG: embed + retrieve 248 CMR, call Ollama | Can start as part of `web` |
| `backup` | alpine + cron | `pg_dump` to RAID share nightly | Plus weekly offsite copy |
| `uptime-kuma` *(opt)* | louislam/uptime-kuma | Status monitoring / alerts | Nice-to-have |

**Why Unraid fits well:** 128 GB RAM and an i9 mean Postgres + Next.js + Ollama coexist
comfortably. The NVMe gives you fast DB I/O; the RAID array is your backup/cold-storage tier.
The 3090's 24 GB VRAM is enough to run a strong quantized model (see §6).

---

## 3. Application stack choice

**Recommendation: Next.js (React) as a single full-stack app.**

Reasoning for a solo builder who wants to ship *and* sell:

- One codebase for UI **and** server (API routes / server actions) — less to juggle.
- Server-side rendering means the question bank and subscription gates live on the server,
  so premium content isn't leaked in client JS (your moat stays protected).
- The **most documented** stack on earth for auth + Stripe + Postgres — every pattern you'll
  hit has a tutorial and is easy to get AI help with.
- Runs as a single Docker container on Unraid.

Companion libraries:

- **Prisma** — type-safe database access + schema migrations.
- **Auth.js (NextAuth)** — self-hosted auth, sessions stored in Postgres.
- **Stripe SDK** — subscriptions + webhooks.
- **Tailwind CSS** — rebuild the arena theme cleanly and responsively.

> **Alternative if you'd rather not rewrite the frontend now:** keep the current vanilla
> HTML/JS as the UI and add a thin backend API (Node/Express or Python/FastAPI) + Postgres.
> It's less work up front but more work forever (two mental models, more glue). For a product
> you intend to sell and grow, consolidating into Next.js pays off. Your **content**
> (questions, code book, theme) ports over regardless of this choice.

---

## 4. Data model (PostgreSQL)

Core tables (simplified):

```
users
  id, email (unique), password_hash, display_name, avatar,
  role (user|admin), email_verified_at, created_at

subscriptions
  user_id, stripe_customer_id, stripe_subscription_id,
  status (trialing|active|past_due|canceled),
  plan (monthly|annual), trial_ends_at, current_period_end

questions
  id, category, difficulty (1-5), stem, explanation,
  cmr_refs (array), active, created_at            -- the moat: server-only
question_choices
  id, question_id, label, is_correct

code_sections            -- 248 CMR content for the Code Book AND for AI retrieval
  id, section_number, title, body, tags
code_sections_embeddings -- pgvector column for semantic search / RAG

attempts                 -- every answer a user gives
  id, user_id, question_id, mode, chosen_choice_id,
  is_correct, ms_taken, created_at

reviews                  -- spaced-repetition scheduling (see §7)
  user_id, question_id, ease, interval_days, due_at, last_reviewed_at

user_stats
  user_id, xp, level, current_streak, longest_streak,
  per_category_mastery (jsonb)

badges / user_badges     -- achievements
leaderboard_snapshots    -- precomputed weekly/monthly/all-time rankings
ai_conversations / ai_messages  -- The Examiner chat history (per user)
audit_log                -- security-relevant events
```

Key design points:

- **Questions are server-only.** The browser only ever sees the questions for the session
  it's currently taking, gated by subscription status — never the whole bank as a JS file.
- **`attempts` is the source of truth.** XP, streaks, mastery, and leaderboards are all
  derived from it, so nothing is trusted from the client.
- **`code_sections` does double duty:** it powers the searchable Code Book *and* is the
  knowledge base the AI tutor retrieves from.

---

## 5. Auth & subscription gating

**Auth (self-hosted):**

- Email + password (hashed with Argon2/bcrypt) and/or passwordless magic-link.
- Sessions stored in Postgres via Auth.js; HTTP-only, Secure cookies.
- Optional SMS later (Twilio) — but SMS costs money per message, so default to email.
- Email verification + password reset via a transactional email provider (Resend/Postmark
  free tier) — or a self-hosted SMTP relay if you want zero external services.

**Subscription gating (the part that makes money):**

1. Stripe **Checkout** for signup → returns them to the app.
2. Stripe **webhook** hits your server on every billing event (trial started, payment
   succeeded/failed, canceled) → you update the `subscriptions` row.
3. A single server-side check — `hasActiveAccess(user)` (`trialing` or `active`) — guards
   every premium route and API call.
4. Free trial (7 days) is a native Stripe Billing feature; no custom trial logic needed.
5. Dunning (retrying failed cards, reminder emails) is handled by Stripe automatically.

> **Tax note:** SaaS subscriptions are taxable in MA and many states. Two options: enable
> **Stripe Tax** (you stay the merchant, Stripe calculates tax), or use **Lemon Squeezy /
> Paddle** as a *merchant of record* (they handle all sales tax/VAT for a slightly higher
> fee). For a solo builder, an MoR removes a real compliance headache — worth considering.

---

## 6. The Examiner — local AI tutor (your differentiator)

The 3090 lets you run a genuinely useful AI tutor *for free* (no per-token API cost), and —
critically — grounded in the actual 248 CMR so it doesn't make up code requirements.

**Stack:**

- **Ollama** container with the GPU passed through.
- **Model:** start with an 8B–14B instruct model (fast, plenty smart for Q&A); the 3090's
  24 GB comfortably runs up to ~32B quantized (Q4) if you want more depth. Pick per
  speed/quality taste — Ollama makes swapping models a one-line change.
- **Embeddings:** a small embedding model (e.g. `nomic-embed-text` / `bge`) to vectorize the
  248 CMR sections and the question explanations into `pgvector`.

**RAG flow (grounding):**

```
user question → embed → semantic search over 248 CMR (pgvector)
             → top passages injected into the prompt
             → Ollama answers, citing the specific 248 CMR sections
             → answer + clickable Code Book links returned
```

This turns "an AI chatbot" into "a tutor that quotes 248 CMR §X and links you to it" —
that's a real, defensible selling point for a licensing-exam product, and it keeps the AI
honest on a subject where wrong answers are dangerous.

**Guardrails:** cap tokens/requests per user (protects the GPU), always show citations,
and add a disclaimer that it's a study aid, not legal/authoritative code interpretation.

---

## 7. Making it *actually* teach (worth paying for)

A quiz app is a commodity. What justifies a subscription and drives pass rates:

1. **Spaced repetition (SRS).** Implement an SM-2 style scheduler (`reviews` table): missed
   and shaky questions come back at increasing intervals; mastered ones fade out. This is the
   single biggest lever on retention and is why people pay for Anki-style tools.
2. **Adaptive difficulty.** Weight what you serve toward the categories where a user is weak.
3. **Exam-blueprint alignment.** Match the category mix to the real exam's weighting so
   practice mirrors the test.
4. **Great explanations with code citations.** Every question links to the exact 248 CMR
   section — reinforced by The Examiner.
5. **Progress you can feel.** Per-category mastery bars, a realistic "exam-readiness %", and
   streaks — honest signals, all derived server-side from real attempts.
6. **Full-length timed Exam Sim** that mirrors the real format, with a scored report.

These are what convert a free trial into a paying, renewing subscriber.

---

## 8. Security & operations (you're now holding customer data + card relationships)

- **Cloudflare in front** (free): hides your home IP, provides WAF + DDoS protection, and
  works around residential-ISP restrictions. Consider **Cloudflare Tunnel** so you don't even
  open router ports.
- **TLS everywhere** via Caddy/NPM (auto Let's Encrypt). Secure, HTTP-only cookies.
- **Never store card data** — Stripe Checkout/Elements keep you out of PCI scope.
- **Hash passwords** (Argon2id). Rate-limit auth endpoints; add fail2ban.
- **Backups:** nightly `pg_dump` to the RAID array + one offsite copy (e.g. encrypted to a
  cloud bucket). Test a restore before you have customers.
- **Least exposure:** only 80/443 forwarded; every other container stays on the internal
  Docker network.
- **Legal pages:** Terms of Service, Privacy Policy, refund policy, and a disclaimer that
  248 Arena is an independent study aid, **not affiliated with the state board**.

> **Honest risk to plan for — home-hosting uptime.** Paying customers expect the app to be
> up. A home server is exposed to power cuts, ISP outages, and hardware failure. Mitigate
> with: a **UPS**, uptime monitoring + alerts (Uptime Kuma), solid backups, and a documented
> recovery plan. If the subscriber base grows, plan a cheap cloud **failover/standby** (or
> migrate the web tier to a VPS while keeping the AI on the 3090). Self-hosting keeps costs
> near-zero and is a great way to start — just go in eyes-open about reliability.

---

## 9. Cost picture (self-hosted)

| Item | Cost |
|---|---|
| Hardware | already owned |
| Electricity | your existing server power draw |
| Domain | ~$12 / year |
| Cloudflare | free tier is plenty |
| Transactional email | free tier (Resend/Postmark) or self-hosted |
| Local AI | $0 per use (runs on your 3090) |
| **Stripe fees** | ~2.9% + $0.30 per charge (only when you get paid) |

Fixed monthly cost is essentially a domain + power. Margins on a subscription are excellent —
the trade-off you're accepting for that is operational responsibility (uptime, backups, security).

---

## 10. Suggested pricing

- **7-day free trial**, no charge until it ends (native Stripe).
- **Monthly:** land around **$14.99–$19.99/mo** for a specialized, exam-specific tool with an
  AI tutor. (Generic quiz apps are cheap; a MA-specific, code-cited, AI-tutored exam prep is
  premium — price for the value, not the commodity.)
- **Annual:** ~$99–$149/yr (2–3 months free) — improves cash flow and retention.
- Everything is behind the trial/paywall; no permanent free tier to start (simplest to build
  and sell). You can add a limited free tier later as a growth funnel if you want.

---

## 11. Phased roadmap

**Phase 0 — Foundations (infra)**
- Restructure repo into a Next.js app; port the arena theme to Tailwind.
- Stand up the Docker Compose stack on Unraid (Postgres, web, Caddy/Cloudflare).
- Get it reachable at your domain over HTTPS. No features yet — just a deployed shell.

**Phase 1 — Accounts + core study engine**
- Auth (email/password + magic link), user profiles, avatars.
- Migrate the question bank and Code Book into Postgres (server-only questions).
- Practice, Ranked, and Exam Sim modes writing real `attempts`.
- Server-derived XP, streaks, per-category mastery, and a real leaderboard.

**Phase 2 — Payments (turn it into a business)**
- Stripe Billing: 7-day trial → monthly/annual.
- Webhooks + `hasActiveAccess()` gating on every premium route.
- Billing portal (update card, cancel), Terms/Privacy/refund pages, Stripe Tax or MoR.

**Phase 3 — The Examiner (AI moat)**
- Ollama on the 3090; embed 248 CMR + explanations into pgvector.
- RAG tutor with citations and Code Book deep-links; per-user rate limits.

**Phase 4 — Retention & growth**
- Spaced repetition (SM-2) + adaptive difficulty.
- Exam-readiness scoring, richer analytics, badges.
- Content expansion, referrals, and reliability hardening (UPS, monitoring, failover plan).

---

## 12. Open decisions to confirm before we build Phase 0

1. **Frontend:** commit to a Next.js rewrite (recommended), or keep vanilla UI + add a
   separate backend API?
2. **Email:** external provider (Resend/Postmark free tier — easiest) or fully self-hosted SMTP?
3. **Networking:** Cloudflare Tunnel (no open ports — recommended) vs. classic port-forward?
4. **Tax:** Stripe Tax (you stay merchant) vs. Lemon Squeezy/Paddle (merchant of record)?
5. **Exact price point** within the ranges in §10.

Once these are settled, the next deliverable is a concrete Phase 0: the actual
`docker-compose.yml`, the Prisma schema, and a running deployed shell on your Unraid box.
