# 248 Arena — Platform Design (v4: Three-Pillar Learning Platform)

**Goal:** A self-hosted, subscription study platform for the MA Journeyman Plumbing exam,
built as **three co-equal ways to learn** on **one shared backbone** — sellable to other
plumbers as a monthly subscription.

**The three pillars ("separate yet equal"):**

| Pillar | Learn by… | What it is |
|---|---|---|
| **The Arena** — *compete* | competition | Gamified quizzing: leaderboards, PvP game modes, speed runs, streaks |
| **The Academy** — *study* | instruction | A traditional online school: structured courses → units → lessons, mastery gates, a real syllabus from zero to exam-ready |
| **The Examiner** — *converse* | dialogue | An AI-first, real-time **voice + text** tutor that teaches, drills, coaches, and plans — grounded in 248 CMR |

They are **three doors into the same house**: one account, one subscription, and one shared
**Knowledge Spine** (§3) that tracks your mastery of every topic. Progress in any pillar
updates the others — win a topic in the Arena and the Academy advances you, the Examiner
stops drilling it, and the path builder re-plans.

**Business model:** 7-day free trial → single monthly plan (+ optional discounted annual).

**Where it runs:** Your Unraid server — i9 / 128 GB RAM / 8 TB NVMe / **RTX 3090** — behind
your own domain. Everything self-hosted **including the entire AI voice loop**; the only
external service is Stripe for payments.

---

## 1. TL;DR of the recommendation

Run it all as a **Docker Compose stack on Unraid**:

- **Web app + API:** one Next.js application serving all three pillars.
- **Database:** PostgreSQL + `pgvector` (app data **and** AI retrieval).
- **Auth:** self-hosted email/password + magic-link, sessions in Postgres.
- **Payments:** Stripe Billing (free trial → monthly). Card data never touches your server.
- **The Examiner (all local on the 3090):**
  - **LLM:** Ollama (streaming) — the tutor's brain
  - **Voice in:** faster-whisper (speech-to-text)
  - **Voice out:** Piper or XTTS (text-to-speech)
  - **Grounding:** RAG over the 248 CMR text via pgvector
- **Edge:** Caddy/Nginx Proxy Manager for auto-HTTPS, Cloudflare (free) in front to hide your
  home IP and absorb attacks.
- **Backups:** nightly `pg_dump` to the RAID array + one offsite copy.

The only thing we don't self-host is card processing — Stripe is required and correct there.

---

## 2. Deployment architecture (Unraid + Docker)

Unraid runs Docker (use the **Docker Compose Manager** plugin). One Compose stack, one private
network; only the reverse proxy is exposed.

```
                         Internet
                            │
                     [ Cloudflare ]           ← free: hides home IP, DDoS/WAF
                            │ (443)
                   ┌────────▼─────────┐
                   │  Caddy / NPM     │        ← auto-HTTPS, only exposed port
                   └────────┬─────────┘
    ┌────────────────────────┼─────────────────────────────────────┐
    │            private docker network (nothing else public)        │
    │                        │                                       │
    │                 ┌───────▼────────┐                             │
    │                 │   Next.js       │  ← Arena + Academy + API    │
    │                 │   web + API     │    + Stripe webhooks         │
    │                 └──┬─────────┬────┘                             │
    │                    │         │                                  │
    │        ┌───────────▼──┐   ┌──▼───────────────┐                  │
    │        │ PostgreSQL   │   │  Examiner service │ ← realtime AI    │
    │        │ + pgvector   │   │  (WebSocket/WebRTC)│    orchestrator │
    │        └──────┬───────┘   └──┬──────┬──────┬──┘                  │
    │               │              │      │      │                     │
    │        ┌──────▼──────┐  ┌─────▼─┐ ┌──▼───┐ ┌▼──────────┐         │
    │        │ pg_dump →   │  │Ollama │ │Whisper│ │ Piper/XTTS │        │
    │        │ RAID backup │  │(LLM)  │ │(STT)  │ │  (TTS)     │  GPU   │
    │        └─────────────┘  └───────┘ └───────┘ └────────────┘  3090  │
    └────────────────────────────────────────────────────────────────┘
                            │
                     Stripe (payments)   +   Resend/Postmark (email)
```

**Containers:**

| Container | Purpose | Notes |
|---|---|---|
| `caddy`/`npm` | TLS + reverse proxy | Only forwarded port |
| `web` | Next.js: Arena, Academy, API, auth, Stripe | Stateless; scalable later |
| `postgres` | All data + vector search | Data dir on **NVMe** |
| `examiner` | Real-time AI orchestrator (WebSocket/WebRTC): routes audio↔STT↔LLM↔TTS, runs RAG | The glue for the AI pillar |
| `ollama` | Local LLM (streaming) | GPU |
| `whisper` | Speech-to-text | GPU (faster-whisper) |
| `tts` | Text-to-speech (Piper/XTTS) | Piper=CPU-fine/low-latency; XTTS=GPU/nicer |
| `backup` | Nightly `pg_dump` → RAID + offsite | Test restores early |
| `uptime-kuma` *(opt)* | Monitoring/alerts | Recommended once paid |

**VRAM budget on the 3090 (24 GB) — the whole voice loop fits at once:**

| Component | Approx VRAM |
|---|---|
| LLM (8–14B, Q4) | ~6–10 GB |
| Whisper STT (small/medium) | ~1–2 GB |
| XTTS TTS (Piper is CPU) | ~2–4 GB (0 if Piper) |
| **Headroom** | comfortable |

So one user can talk to the tutor with STT + LLM + TTS all resident on the GPU. For several
concurrent voice users, we queue/scale (start with a small concurrency cap; §7).

---

## 3. The Knowledge Spine — the shared backbone

This is what makes the three pillars *one product* instead of three apps.

**A topic graph of 248 CMR.** Every concept the exam tests is a node — e.g. *fixture units,
trap & trap-arm sizing, DWV venting, water-supply sizing, backflow prevention, materials &
joints, isolation/relief valves*. Nodes have prerequisite edges (you learn drainage basics
before vent sizing).

**Everything hangs off topics:**
- **Questions** (Arena, exam sim) are tagged to topics.
- **Lessons** (Academy) teach topics.
- **AI sessions** (Examiner) target topics.
- **248 CMR sections** (Code Book + RAG source) map to topics.

**One mastery model per user.** For each topic we keep a mastery score (0–1) plus a
spaced-repetition schedule (§6). *Any* pillar updates it:
- Answer questions in the Arena → mastery moves.
- Complete an Academy lesson quiz → mastery moves.
- Nail (or fumble) a topic in an Examiner oral drill → mastery moves.

**The payoff — the pillars feed each other:**
- The **Academy** unlocks the next unit when prerequisite topics hit a mastery threshold.
- The **Arena** can matchmake/serve questions weighted to your weak topics.
- The **Examiner's path builder** reads the whole mastery map and says *"you're shaky on vent
  sizing — do this Academy lesson, then let's drill it out loud."*
- One honest **"exam-readiness %"** rolls up mastery across all topics, shown everywhere.

That shared spine is the architecture's center of gravity — build it first (Phase 1).

---

## 4. Application stack

**Next.js (React) as one full-stack app** for the Arena, Academy, and all APIs — one codebase
for UI + server, questions/content stay server-side (protecting your moat), and it's the most
documented stack for auth + Stripe + Postgres. Companions: **Prisma** (DB + migrations),
**Auth.js** (self-hosted auth), **Stripe SDK**, **Tailwind** (rebuild the arena theme cleanly).

The **Examiner** real-time loop is its own small service (Python fits the AI ecosystem best —
faster-whisper, TTS bindings, Ollama client) that the Next.js app talks to over
WebSocket/WebRTC. Keeping it separate lets the AI pillar evolve (and scale on the GPU)
independently of the web tier — literally "separate yet equal," even in the deployment.

> **If you'd rather not rewrite the frontend yet:** the current vanilla HTML/JS can stay as
> the UI with a thin backend API added behind it. It ships sooner but costs more long-term.
> Your content (questions, Code Book, theme) ports over either way. Recommendation for a
> product you'll grow: consolidate on Next.js.

---

## 5. Data model (PostgreSQL) — highlights

```
-- Identity & billing
users(id, email, password_hash, display_name, avatar, role, email_verified_at, created_at)
subscriptions(user_id, stripe_customer_id, stripe_subscription_id, status,
              plan, trial_ends_at, current_period_end)

-- The Knowledge Spine
topics(id, name, description, exam_weight)
topic_prerequisites(topic_id, requires_topic_id)
user_topic_mastery(user_id, topic_id, mastery, ease, interval_days, due_at, last_seen_at)

-- Content (server-only = the moat)
questions(id, topic_id, difficulty, stem, explanation, cmr_refs[], active)
question_choices(id, question_id, label, is_correct)
code_sections(id, section_number, title, body, topic_id, tags)
code_sections_embeddings(section_id, embedding vector)      -- pgvector, RAG + Code Book

-- The Academy (traditional LMS)
courses(id, title, description, order)
units(id, course_id, title, order)
lessons(id, unit_id, title, body, video_url?, order, topic_ids[])
lesson_progress(user_id, lesson_id, status, score, completed_at)

-- The Arena
attempts(id, user_id, question_id, mode, chosen_choice_id, is_correct, ms_taken, created_at)
matches(id, mode, created_at)   match_players(match_id, user_id, score, rank)
badges / user_badges            leaderboard_snapshots(scope, period, rankings jsonb)

-- The Examiner (AI)
ai_sessions(id, user_id, kind, topic_ids[], modality, started_at, ended_at, summary)
ai_messages(id, session_id, role, text, audio_url?, citations jsonb, created_at)
ai_assessments(session_id, topic_id, verdict, notes)   -- oral-drill scoring → mastery

-- Ops
audit_log(...)
```

Design rules: **questions/lessons never ship wholesale to the browser** (served per-request,
gated by subscription); **`attempts` + `ai_assessments` + `lesson_progress` are the only
sources of truth** for mastery/XP/leaderboards — nothing trusted from the client.

---

## 6. Pillar detail

### 6a. The Arena (compete)
Carries forward today's game modes (Practice, Ranked, Exam Sim, Code Royale, Speed Run,
Imposter) but server-backed: real attempts, real leaderboards (weekly/monthly/all-time from
`leaderboard_snapshots`), XP/levels/badges/streaks derived server-side. Questions served
per-session, weighted toward weak topics from the spine. **Spaced repetition (SM-2)** lives
here and in the Academy: missed/shaky questions resurface on a schedule — the single biggest
lever on real retention and pass rates.

### 6b. The Academy (study)
A real online school: **Courses → Units → Lessons**, an ordered syllabus that takes a total
beginner to exam-ready. Lessons = readable content (text/diagrams/optional video) + a short
mastery check. **Mastery gates:** a unit unlocks when its prerequisite topics clear a
threshold on the spine. Every lesson deep-links to the relevant 248 CMR Code Book section and
can hand off to the Examiner ("discuss this out loud"). This is the structured backbone for
people who don't just want to grind quizzes.

### 6c. The Examiner (converse) — the AI-first, real-time pillar
A first-class way to learn, **voice + text**, fully local on the 3090. One tutor, several
**session kinds** you pick (or the tutor switches between):

- **Teach (Socratic tutor)** — teaches by asking, walks you to the answer, cites 248 CMR.
- **Drill (mock oral examiner)** — simulates exam-day: asks, presses weak answers, scores you
  (writes `ai_assessments` → mastery).
- **Coach (live problem-solving)** — works pipe sizing, fixture-unit and code-lookup problems
  *with* you, step by step.
- **Plan (path builder)** — reads your mastery map and builds/adjusts your plan across **all
  three pillars** ("do this lesson, then this Arena drill, then let's talk it through").
- Always **conversational** — an effective explainer, not a lecture bot.

**Real-time voice loop (all self-hosted):**
```
mic → [Whisper STT, streaming] → text
    → [RAG: pgvector pulls the relevant 248 CMR passages]
    → [Ollama LLM, streaming tokens, grounded + cited]
    → [Piper/XTTS TTS, sentence-by-sentence] → speaker
```
Latency tricks for a natural feel: stream partial transcripts, feed LLM tokens into TTS a
sentence at a time (don't wait for the full answer), support **barge-in** (user interrupts and
the tutor stops). Target < ~1.5 s to first spoken word. Text mode uses the same pipeline minus
STT/TTS. **Grounding is non-negotiable** on a licensing exam: every answer retrieves real
248 CMR and shows citations + Code Book links, with a "study aid, not authoritative code
interpretation" disclaimer.

**Guardrails:** per-user rate/session caps (protects GPU), a concurrency queue for voice, and
transcripts saved to `ai_messages` so sessions inform the spine and can be reviewed.

---

## 7. Auth, subscriptions & the AI cost story

- **Auth (self-hosted):** email/password (Argon2id) + magic-link; Postgres sessions; secure
  HTTP-only cookies; email verification + reset via Resend/Postmark free tier (or self-hosted
  SMTP). SMS optional later (costs per message).
- **Subscription gating:** Stripe **Checkout** → **webhook** updates the `subscriptions` row →
  one server-side `hasActiveAccess(user)` guards every premium route/API across all pillars.
  7-day trial and dunning are native Stripe.
- **The AI economics are your edge:** because the Examiner runs on your 3090, **voice tutoring
  costs you $0 per session** — competitors paying per-token API fees can't match unlimited
  AI at a flat monthly price. That's a real moat. The only limit is GPU concurrency, which we
  manage with a queue and per-user caps.
- **Tax:** enable **Stripe Tax** (you stay merchant) or use **Lemon Squeezy/Paddle** as a
  merchant of record (handles sales tax/VAT for you — less compliance headache for a solo builder).

---

## 8. Security & operations

- **Cloudflare in front** (free) — hides home IP, WAF/DDoS, works around residential-ISP
  limits. Consider **Cloudflare Tunnel** so you never open router ports.
- **TLS everywhere** (Caddy/NPM auto Let's Encrypt); secure cookies; hashed passwords;
  auth rate-limiting + fail2ban.
- **Never store card data** — Stripe Checkout/Elements keep you out of PCI scope.
- **Backups:** nightly `pg_dump` → RAID + one encrypted offsite copy; test a restore before
  you have customers.
- **Least exposure:** only 80/443 forwarded; every other container stays internal.
- **Legal:** Terms, Privacy, refund policy, and an "independent study aid, not affiliated with
  the state board / not authoritative code interpretation" disclaimer (matters doubly for AI output).
- **Honest risk — home-hosting uptime.** Paying users expect uptime; a home server faces
  power/ISP/hardware failure. Mitigate with a **UPS**, monitoring + alerts (Uptime Kuma),
  solid backups, and a recovery plan. As you grow, plan a cheap cloud **failover** for the web
  tier (keep the AI on the 3090). Great way to start — just eyes-open on reliability.

---

## 9. Cost picture (self-hosted)

| Item | Cost |
|---|---|
| Hardware / electricity | already owned |
| Domain | ~$12 / year |
| Cloudflare | free |
| Email | free tier or self-hosted |
| **Local AI (voice + text)** | **$0 per session** — huge structural advantage |
| Stripe fees | ~2.9% + $0.30 per charge (only when paid) |

Near-zero fixed cost; the trade-off is operational responsibility (uptime, backups, security).

---

## 10. Suggested pricing

- **7-day free trial**, then a single plan. Given unlimited **local AI voice tutoring** plus a
  full LMS plus competitive modes, this is premium — price for value:
  - **Monthly:** ~**$19.99–$29.99/mo** (an AI oral-exam coach alone is worth this).
  - **Annual:** ~**$149–$199/yr** (2–3 months free; better cash flow + retention).
- No permanent free tier to start (simplest to build/sell); add a limited free funnel later.

---

## 11. Phased roadmap

**Phase 0 — Foundations (infra).** Next.js app + Docker Compose stack on Unraid (Postgres,
web, Caddy/Cloudflare); reachable at your domain over HTTPS. A deployed shell, no features.

**Phase 1 — Spine + accounts + Arena.** Build the **Knowledge Spine** (topics, mastery), auth,
profiles. Migrate questions + Code Book into Postgres. Ship the Arena server-backed (attempts,
leaderboards, XP) with **spaced repetition**. *This is the foundation everything else reads.*

**Phase 2 — Payments.** Stripe trial → monthly/annual; webhooks + `hasActiveAccess()` gating;
billing portal; Terms/Privacy/refund; Stripe Tax or MoR. **Now it's a business.**

**Phase 3 — The Academy.** Courses/units/lessons authoring, mastery-gated progression, lesson
↔ Code Book ↔ Examiner links. The structured "school" pillar.

**Phase 4 — The Examiner, text first.** Streaming Socratic tutor grounded in 248 CMR
(Ollama + pgvector RAG), session kinds (teach/drill/coach/plan), assessments feeding the spine.

**Phase 5 — The Examiner, voice.** Add Whisper (STT) + Piper/XTTS (TTS), WebSocket/WebRTC
real-time loop, barge-in, mock **oral exam** mode. The flagship differentiator goes live.

**Phase 6 — Polish & growth.** Adaptive difficulty, exam-readiness scoring, richer analytics,
referrals, content expansion, reliability hardening (UPS, monitoring, failover).

*(Sequencing rationale: the spine and payments come before the AI so you have a sellable
product early and a foundation the AI can plug into. If you'd rather lead with the AI wow-factor
for marketing, we can pull Phase 4 forward — tell me and I'll reorder.)*

---

## 12. Decisions to confirm before Phase 0

Resolved: shared spine ✓ · AI is voice **and** text ✓ · Examiner does all roles ✓.

Still open:
1. **Frontend:** commit to the Next.js rewrite (recommended) or keep vanilla UI + a backend API?
2. **Roadmap order:** spine/payments first (sellable sooner) or pull the AI forward (bigger wow)?
3. **Networking:** Cloudflare Tunnel (no open ports — recommended) vs. classic port-forward?
4. **Email:** external free tier (Resend/Postmark — easiest) vs. fully self-hosted SMTP?
5. **Tax:** Stripe Tax (stay merchant) vs. Lemon Squeezy/Paddle (merchant of record)?
6. **TTS voice + LLM model:** Piper (fast) vs. XTTS (nicer) for the tutor's voice; starting
   Ollama model (I'll recommend specifics once we're at Phase 4).
7. **Exact price** within the §10 ranges.

Next concrete deliverable once these are set: a real Phase 0 — the `docker-compose.yml`, the
Prisma schema for the spine, and a deployed shell on your Unraid box.
