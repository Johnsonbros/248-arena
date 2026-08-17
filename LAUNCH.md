# 248 Arena — Launch Checklist (Lean Paid Launch)

**Goal:** go live selling access to the current 248 Arena app with a **7-day free trial → $19.99/mo**,
using a **Stripe Pricing Table** (no payment code to write) and an access gate. Target: live in a day.

This is the "sell right away" path. Real self-serve accounts + server-side subscription checks come
later (see `docs/PLATFORM_DESIGN.md`); this gets you a paying customer now.

---

## What I already built (in this repo)

- `pricing.html` — pricing/paywall page (monthly + annual, trial messaging, FAQ). **Ready.**
- `js/subscription.js` — the access gate (Cloudflare or access-code mode). **Ready, needs config.**
- `terms.html`, `privacy.html`, `refund.html` — legal pages (review before launch). **Ready.**
- Home page + app wired to the pricing page and the gate. **Ready.**

Your job below is ~4 setup tasks. Nothing here requires more coding.

---

## Step 1 — Stripe (take the money) · ~15 min

1. Create/verify a **Stripe account** (business details, bank account for payouts).
2. **Products → Add product:** "248 Arena — Monthly", price **$19.99 / month recurring**.
   - Under the price, set a **Free trial of 7 days**.
3. (Optional) Add "248 Arena — Annual", **$200 / year recurring**.
4. **Pricing table** (already wired into `pricing.html`): Product catalog → Pricing tables →
   build a table with the monthly + annual prices. The table's `prctbl_…` id and your
   `pk_live_` key are already embedded in `pricing.html` — to change plans later, edit the
   table in Stripe (no code change needed).
5. **⚠️ REQUIRED — set the completion redirect.** In the Pricing Table settings, set the
   **"Confirmation page → redirect customers to your website"** to
   `https://248arena.com/welcome.html`.
   - **Why this is not optional:** the access gate runs in `code` mode, and `welcome.html`
     is the *only* page that grants access (`arena248_access`). If the table keeps Stripe's
     default confirmation page, a customer can pay and then be **locked out of `app.html`**.
     Set the redirect, or switch the gate to Cloudflare Access (§2 Option A).
   - Caveat: `code`-mode access is stored per-device in the browser. A subscriber who pays on
     their phone won't automatically be unlocked on their laptop. **Cloudflare Access** (§2)
     is the cross-device, un-bypassable fix — strongly recommended before you scale.
6. **Customer portal:** Settings → Billing → Customer portal → activate, and set
   `billingPortalUrl` in `js/subscription.js` (so subscribers can manage/cancel).

> Turn on **Stripe Tax** (Settings → Tax) so MA sales tax is handled automatically — SaaS is
> taxable in Massachusetts. Alternatively use a merchant-of-record (Lemon Squeezy/Paddle) later.

---

## Step 2 — Choose how you gate access · pick ONE

Edit `ACCESS_CONFIG.mode` at the top of `js/subscription.js`.

### Option S — arena-access service (recommended once deployed: verified, cross-device)
Deploy `deploy/access-service` (see its README): Stripe webhooks grant/revoke access,
`welcome.html` verifies the real checkout session, and subscribers unlock any device with
the email they paid with. Set `mode: 'server'` in `js/subscription.js`. This supersedes
the code-mode caveats below.

### Option A — Cloudflare Access (edge lock, manual per-email)
You already run `cloudflared-tunnel`. Put the app behind Cloudflare Access:
1. Cloudflare Zero Trust → **Access → Applications → Add** a self-hosted app for
   `248arena.com` (or just the `/app.html` path).
2. Policy: allow the **emails you've granted** (add each paying customer's email), or an
   email-OTP policy for a small cohort.
3. Set `mode: 'cloudflare'` in `subscription.js` (the script then trusts the edge — no in-app block).
- **Flow:** customer subscribes via Stripe → you add their email to the Access policy → they log in.
  Manual, but bulletproof and fine for your first cohort. Automatable later via the merge plan.

### Option B — Access code (simplest, no Cloudflare — note: client-side, bypassable)
1. Set `mode: 'code'` and `accessCode: '<something-non-obvious>'` in `subscription.js`.
2. After someone subscribes, email them the code (Stripe can auto-email a receipt; add the code +
   the app URL to your product's confirmation message or a saved email template).
3. They visit the app, hit the paywall overlay, enter the code once → unlocked on their device.
- Good enough to start taking money today; understand a determined user could bypass a client-side
  gate. Upgrade to real accounts (see the platform design doc) when volume justifies it.

> You can start with Option B **today** and switch to Option A once the Cloudflare app is configured.

---

## Step 3 — Deploy on your Unraid fleet · ~15 min

The app is static files — serve them behind Caddy + the existing Cloudflare Tunnel.
1. Add a container (or reuse an `nginx:alpine`, like your `tjb-game` pattern) serving this repo's
   files, or point Caddy at the files directly.
2. Add a route in **Caddy** for `248arena.com` → the static files.
3. Add the hostname to `cloudflared-tunnel`'s config so it's reachable publicly over HTTPS.
4. If using Cloudflare Access (Option A), attach the Access policy to that hostname.
5. Wire it into your Gitea CI if you want auto-deploys on push.

---

## Step 4 — Pre-launch review · ~20 min

- [ ] Replace **all** `REPLACE_WITH_...` placeholders (pricing links, portal link).
- [ ] Set the access gate `mode` (and code, if Option B).
- [ ] Read `terms.html`, `privacy.html`, `refund.html` — fill in anything company-specific;
      ideally a quick attorney review.
- [ ] Test the full flow end to end: visit pricing → click trial → complete Stripe test purchase →
      confirm redirect → confirm the gate lets you in → confirm cancel works in the portal.
- [ ] Confirm the "not affiliated with the Commonwealth of Massachusetts" disclaimer is visible.
- [ ] (Optional) Add the app as an **Uptime-Kuma** monitor and an **Umami** analytics site — both
      already running on your fleet.

---

## Scholarship seats — free accounts for students

Sponsored students (vo-tech kids, apprentices who can't swing $19.99) get in with a
**scholarship code**, not a Stripe checkout. Codes are minted by you, time-boxed, single-use,
and redeemable with nothing but an email address — no card, no billing relationship, nothing
to cancel. Server mode only.

**Mint codes** (one per $20 sponsorship is the honest ratio — 3 months each):

```bash
curl -X POST https://arena-api.248arena.com/api/scholarship/mint \
  -H 'Content-Type: application/json' \
  -d '{"key":"YOUR_REPORTS_KEY","count":10,"months":3,"note":"Worcester Tech cohort Sept 2026"}'
# → {"ok":true,"codes":["SCHLR-XXXX-XXXX", ...]}
```

**See who redeemed what:**

```bash
curl 'https://arena-api.248arena.com/api/scholarship/list?key=YOUR_REPORTS_KEY'
```

**How a student uses one:** open the Arena → the gate asks for email or code → they type the
`SCHLR-` code → enter their email → full access until the code's expiry. Re-entering the same
code with the same email on a new device just works; anyone else gets "already used."

Rules baked in: codes can't downgrade a real subscription, expired seats stop unlocking (and
stop syncing) automatically, and redemption is rate-limited against brute force on top of the
codes' ~10^11 entropy. Print them on cards, email them to a shop teacher, staple them to the
sponsorship thank-you — they're just codes.

**Privacy note for minors:** vo-tech students can be under 18. The whole system asks a student
for exactly one thing — an email address. No name, no DOB, no payment details, no documents
(the Locker refuses PII by design). Keep it that way.

---

## Running it with agents (API + MCP everywhere)

Every owner operation above is also plain HTTPS (`docs/API.md` is the full map) and an
MCP tool on **arena-ops-mcp** — so Hermes/OpenClaw/a scheduled Claude session can run
the day-to-day autonomously: `arena_business_stats` for the heartbeat,
`arena_pulse_summary` for fun trends, `arena_question_reports` for content triage,
`arena_scholarship_mint`/`list` for seats, `arena_deploy` to ship. Set
`ACCESS_ADMIN_KEY` (= `REPORTS_KEY`) in the MCP server's `.env` to switch the business
tools on. Prefer the human view? `admin.html` is the same API surface with buttons.

---

## The fun benchmark — /api/pulse-summary

After every few sessions the app asks players one tap: 😩 / 😐 / 🔥. Ratings land in
`/data/pulse.json` with the session's mode and accuracy. Your improvement loop:

```bash
curl 'https://arena-api.248arena.com/api/pulse-summary?key=YOUR_REPORTS_KEY'
# → avg rating overall + per mode, 😩/😐/🔥 histogram, distinct raters (30-day window)
```

Change a mode → watch its average move release over release. A mode that's played a lot but
rated 😐 is where the next design hour goes. Client-side, the same data feeds each player's
private Fun Index (frequency + volume + variety + stated rating) in `js/pulse.js`.

---

## Go / no-go

You can sell the moment Steps 1–3 are done and the end-to-end test passes. Everything else
(real accounts, the Academy, the AI Examiner) is upside you layer on afterward without taking
the store offline.

**Price recap:** 7 days free → **$19.99/mo** or **$200/yr**. Change any time in Stripe; update the
numbers in `pricing.html` + `terms.html` to match.
