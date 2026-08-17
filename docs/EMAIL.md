# Email for 248arena.com (and the other AiSync sites)

**The decision: don't run an outbound mail server.** Receiving is trivial and
free. Sending is a reputation game you cannot win from a home circuit, and the
thing you'd be risking is the login system itself.

Magic-link sign-in *is* how a subscriber gets back into 248 Arena on a new
phone. If that email lands in spam, a customer who paid you cannot use what
they bought — and the address they'd complain to is one you also control. That
is why sending goes through a provider with existing reputation, and why this
document exists at all.

Three IPs' worth of reasons self-hosted SMTP fails here:

- A fresh IP has no sending reputation; Gmail and Outlook throttle or junk new
  senders for weeks regardless of configuration.
- Most ISPs block outbound port 25 on business lines, and won't issue the
  reverse-DNS (PTR) record that receivers check.
- Failures are **silent**. No bounce, no log line — the customer simply never
  gets the link.

---

## The split

| Job | Tool | Cost | Effort |
|---|---|---|---|
| **Receive** `support@248arena.com` | Cloudflare Email Routing → forwards to an inbox you already read | Free | 5 min |
| **Send** magic links, welcome mail | Resend (already wired in `access-service`) | Free ≤3,000/mo, then $20/mo | 15 min |
| **Real mailboxes** (optional, later) | Migadu or Google Workspace | $19/yr — $7/user/mo | 30 min |

**Migadu is worth a look for AiSync specifically:** it's flat-rate for
*unlimited domains*, so `248arena.com`, `thejohnsonbros.com` and
`aisyncservices.com` share one $19/yr account instead of per-domain pricing.

### Minimum viable: receiving only

If you do nothing else, **do this one.** Twelve pages link to
`support@248arena.com`; a paying customer emailing that address and getting a
bounce is worse than having published no support address at all.

Cloudflare Dashboard → your domain → **Email** → Email Routing → Enable.
Add a custom address `support@248arena.com` → destination = your existing
inbox → verify the destination once by clicking the link Cloudflare emails you.
Cloudflare adds the MX and SPF records automatically.

Everything below is for the *sending* side, which you can defer until you have
customers.

---

## DNS records (Cloudflare, per domain)

Cloudflare Email Routing writes its own MX records when you enable it. These
are the ones you add for sending:

| Type | Name | Value | Why |
|---|---|---|---|
| TXT | `248arena.com` | `v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all` | Authorizes Cloudflare (receiving) and Resend's sending infrastructure |
| TXT | `resend._domainkey` | *(the DKIM value Resend shows you)* | Cryptographically signs your mail |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:support@248arena.com` | Tells receivers what to do with failures, and sends you reports |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | Bounce/complaint handling — Resend will specify the exact host |

**Only ever one SPF record per domain.** If a domain already has one, merge the
`include:` directives into it rather than adding a second — two SPF records is a
hard failure, not a merge.

**Start DMARC at `p=none`.** Read the aggregate reports for two weeks, confirm
your legitimate mail passes, *then* move to `p=quarantine`. Jumping straight to
`p=reject` is the classic way to blackhole your own mail on day one.

---

## Wiring Resend into arena-access

The code is already written — `sendWelcomeEmail()` and the magic-link endpoint
both POST to `api.resend.com`. It needs three env values:

```bash
# deploy/access-service/.env
RESEND_API_KEY=re_...                          # Resend → API Keys → Create
MAIL_FROM=248 Arena <noreply@248arena.com>     # must be on a VERIFIED domain
APP_URL=https://248arena.com                   # magic links are built from this
```

Then `docker compose up -d --build` in `deploy/access-service`.

Order matters: **verify the domain in Resend first** (Resend → Domains → Add,
then add the DKIM record it gives you and wait for it to go green). Sending from
an unverified domain fails, and `MAIL_FROM` pointing at a domain Resend doesn't
know is the most common cause.

**Send from `noreply@`, not `support@`.** Bounces and out-of-office replies land
back on the From address; you don't want that traffic burying real support mail
in the inbox a human reads.

### Verifying it works

```bash
# Should return {"sent":true} rather than 501
curl -s -X POST https://arena-api.248arena.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@yourdomain.com"}'
```

A `501 login-email not configured` means `RESEND_API_KEY` is unset — the service
is behaving correctly, it just has no mailer.

---

## What breaks while sending is unconfigured

The system degrades on purpose rather than failing. Verified against the code:

| Path | Behavior with no mailer |
|---|---|
| **Buying a subscription** | Unaffected. Checkout → `welcome.html` verifies the real Stripe Checkout Session → access granted. Never touches email. |
| **Welcome email** | Silently skipped (`sendWelcomeEmail` returns early). Stripe still sends its own payment receipt, so the charge is never a mystery. |
| **Magic-link sign-in** | `/api/login` returns 501 → the client falls back to `grantByEmail`, which unlocks on a subscription-status check alone. |
| **Scholarship redemption** | Unaffected — code plus email address, nothing sent. |

⚠️ **Read that third row carefully.** Without a mailer, cross-device unlock is
"type a subscriber's email address," not "prove you own it." Anyone who knows a
customer's email can unlock the app on their own device. For a $19.99 study app
at launch that is a survivable trade, but it is a real weakening of the gate and
configuring Resend closes it.

---

## If you still want to self-host

There is a legitimate middle path, and it's the one to take if you want the
control: run **Mailcow** or **docker-mailserver** on the fleet for *receiving
and mailbox storage* — real IMAP, your data, unlimited addresses — but configure
it to **relay outbound through a smarthost** (Resend, Postmark, or SES SMTP).

You self-host the part that's just storage, and outsource the part that's a
reputation contest. Budget ~2 GB RAM, a Sunday afternoon, and a static IP with a
PTR record your ISP is willing to set.

What to avoid: Mailcow delivering directly to the internet for anything a
paying customer depends on.

---

## Per-domain status

| Domain | Receiving | Sending | Notes |
|---|---|---|---|
| `248arena.com` | ☐ Cloudflare Routing → `support@` | ☐ Resend, `noreply@` | The one that matters for launch |
| `thejohnsonbros.com` | existing | — | Plumbing business |
| `aisyncservices.com` | existing | — | Operating entity |

Each domain that sends needs its **own** DKIM record and its own verification in
Resend. SPF and DMARC are per-domain too — they do not inherit.
