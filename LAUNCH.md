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
   `https://arena.thejohnsonbros.com/welcome.html`.
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

### Option A — Cloudflare Access (recommended: real, un-bypassable lock)
You already run `cloudflared-tunnel`. Put the app behind Cloudflare Access:
1. Cloudflare Zero Trust → **Access → Applications → Add** a self-hosted app for
   `arena.thejohnsonbros.com` (or just the `/app.html` path).
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
2. Add a route in **Caddy** for `arena.thejohnsonbros.com` → the static files.
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

## Go / no-go

You can sell the moment Steps 1–3 are done and the end-to-end test passes. Everything else
(real accounts, the Academy, the AI Examiner) is upside you layer on afterward without taking
the store offline.

**Price recap:** 7 days free → **$19.99/mo** or **$200/yr**. Change any time in Stripe; update the
numbers in `pricing.html` + `terms.html` to match.
