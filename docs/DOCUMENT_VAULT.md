# Document Vault — design, requirements, and the security case

**Status:** Tier 1 (License Locker) shipped. Tier 2 (Nextcloud file storage) designed, **off by default**, requires a deliberate decision to enable.

This document answers four questions:

1. What documents does a Massachusetts plumbing apprentice actually need?
2. Which of those should 248 Arena store, and which should it refuse to touch?
3. If we do store files, how do we keep them safe — and what does the law require?
4. What has to exist before we flip it on?

---

## 1. What the Board actually requires

Sources: Board of State Examiners of Plumbers and Gas Fitters application pages on mass.gov (apprentice, journeyman, master, renewal), and 248 CMR 11.00.

### Before you can even accrue hours

| Item | Who produces it | Why it matters |
|---|---|---|
| Apprentice plumber license | You, via eLIPSE ($14) | Work only counts as *qualifying experience* while you hold the license, under a licensed MA master plumber. Hours worked before it are gone. |
| Employment under a licensed master plumber | Employer | 248 CMR 11.02 ties qualifying experience to supervision by a master. |
| Your own hours record | You | **The Board keeps no running total.** Your master attests to it years later on a single form. This is the single highest-value thing the app can do. |
| Tier 1–5 schooling | Approved school | 110 clock hours per tier, 550 total. |

### The application package (journeyman)

| Item | Who signs it | Notes |
|---|---|---|
| Education Verification Form | An official at your school | Certificates alone are not accepted. |
| Statement of Experience Form | Your supervising master plumber | One per master if you changed employers. |
| CORI Acknowledgement Form (DOL) | You — **page 2 notarized** | Contains SSN and date of birth. |
| Government photo ID | — | Needed by the notary and again at the PSI test centre. |
| Vocational transcript | School | Only if claiming vo-tech credit (up to 300 education + 1,700 experience hours per 248 CMR 11.02). |
| Name-change documentation | You | Only if names don't match across documents. A frequent cause of stalled applications. |
| Application + $31 fee | You, on eLIPSE | **Mailed applications are returned unprocessed.** |

### Deadlines and money

- **Incomplete applications are held 180 days**, then treated as abandoned — new application, new fee.
- Fees: apprentice application $14 · apprentice renewal $40/2yr · journeyman application $31 · PSI exam $80 · licence issuance $52.
- After licensure: renewal every two years with **12 hours of Mandatory Continuing Education** (248 CMR 11.04).

### The hour requirement, precisely

248 CMR 11.02: for each year in which an apprentice obtains **165 clock hours of education**, that apprentice must accrue **1,700 clock hours** of qualifying work experience. Four such years = **6,800 hours** for the journeyman exam.

**8,000 hours is the legacy figure** for apprentices licensed before **September 1, 2008**. Both are encoded in `js/locker.js` (`TARGETS.work` / `TARGETS.workLegacy`) with a user toggle, because both are still correct for different people.

---

## 2. What we store — and the line we do not cross

### The governing rule: 201 CMR 17.02

Massachusetts defines **"Personal Information"** as a resident's first name (or initial) and last name **in combination with** any one of:

- **(a)** Social Security number
- **(b)** driver's licence number or state-issued ID card number
- **(c)** financial account number, or credit/debit card number

Hold any of those about a Massachusetts resident and 201 CMR 17.00 applies — **with no revenue threshold, no employee minimum, and no industry carve-out.** It also reaches businesses outside Massachusetts that hold data about MA residents.

### What that costs us if we cross the line

201 CMR 17.03 / 17.04 would require AiSync Services to:

- Maintain a **Written Information Security Program (WISP)** — an actual written document, proportionate to our size and data volume.
- Designate a responsible employee, run risk assessments, impose discipline for violations, and document any breach.
- **Encrypt personal information in transit over public networks and at rest on portable devices.**
- Enforce authentication controls, access restriction to those with a need to know, and monitoring.
- Contractually bind any third-party service provider that touches the data.
- Notify affected residents and the Commonwealth on breach (M.G.L. c. 93H).

Look at the document list above: the **CORI form carries an SSN and DOB**, and a **photo ID carries a licence number**. There is no version of "let users upload their application package to our server" that does not put us squarely inside 201 CMR 17.00.

### The decision

**248 Arena stores document *status*, not document *contents*.**

| We store | We do not store |
|---|---|
| Checklist state (not started / in progress / done) + date | Any uploaded file |
| Hour and education entries: date, hours, work-vs-school | SSN, DOB, driver's licence number |
| Employer or school **name** (a business, not a person) | Financial account or card numbers |
| Short free-text notes, run through a PII filter | Scanned IDs, CORI forms, transcripts |

`Locker.scrub()` in `js/locker.js` enforces this at the input boundary. It rejects notes matching SSN patterns, bare 9-digit numbers, card-length digit runs, MA licence number format, and the literal words "SSN" / "social security". It is deliberately over-eager: a false positive costs the user a rewrite; a false negative costs us a WISP.

**This is not a limitation we're apologising for — it is the feature.** A small company holding a pile of tradespeople's Social Security numbers is a liability with no upside. The tracker delivers ~90% of the user value (knowing what's needed, never losing four years of hours) at ~0% of the risk.

---

## 3. If you still want file storage: the Nextcloud design

There is a legitimate reason to want it — an apprentice juggling a notarized CORI form, a transcript, and two Statements of Experience across four years genuinely benefits from one place to keep them. The right answer is **their storage, provisioned by us, not our database**.

The AiSync fleet already runs Nextcloud. Rather than build custom PII storage, give each subscriber a folder there and deep-link to it from the Locker.

### Architecture

```
248 Arena (248arena.com)
  └─ Locker screen ── deep link ──► Nextcloud (files.248arena.com)
                                      └─ /Plumbing License/
                                           ├─ 01 Apprentice License/
                                           ├─ 02 Education/
                                           ├─ 03 Statements of Experience/
                                           ├─ 04 CORI (notarized)/
                                           ├─ 05 Identification/
                                           └─ 06 Continuing Education/
```

248 Arena passes **no files and no PII**. It knows a folder exists; it never reads it.

### Non-negotiable controls before enabling

| Control | Why |
|---|---|
| **Server-side encryption enabled** on the Nextcloud data directory, and full-disk or dataset encryption on the Unraid array underneath | 201 CMR 17.04(5) encryption expectations; protects at-rest data if a disk leaves the building |
| **HTTPS only**, HSTS, no plain-HTTP listener | 17.04(3): encryption in transit over public networks — already true via Caddy + Cloudflare Tunnel |
| **Per-user folders with no group read**, sharing and public link-sharing **disabled** by policy | A public link is a breach waiting to happen; nobody but the owner and an emergency admin should see these |
| **Two-factor authentication enforced** for every account, admin accounts included | 17.04(1): secure authentication |
| **Encrypted, tested backups** with off-array copies | A ransomware event on unencrypted backups is still a reportable breach |
| **Retention + purge policy**: delete a user's vault N days after subscription ends, on a scheduled job | Holding PII for lapsed customers is pure liability with zero benefit |
| **Access logging + alerting** (Uptime Kuma / Nextcloud audit log) | 17.03(2)(h): monitoring, and you need the log to answer "what was accessed" after an incident |
| **A written WISP naming a responsible person** | 17.03(1). This is the document a regulator asks for first. |
| **Updated privacy policy + explicit consent flow** at upload time | Users must know what they're handing over and to whom |
| **Written provider agreements** for any third party in the path | 17.03(2)(f) |

### Explicitly out of scope even then

- Never store SSN, DOB, or licence numbers as **structured fields** in any 248 Arena database. If a scanned CORI form lives in the user's Nextcloud, it is an opaque blob in their space — not a queryable column in ours.
- Never proxy vault files through `arena-access` or `arena-examiner`. Those services must never see document bytes.
- Never index vault contents into the Examiner's RAG corpus.

### Provisioning

`deploy/nextcloud/provision-vault.sh` creates a user, the folder skeleton, and a quota, and prints the per-user link to paste into `LOCKER_CONFIG.filesBase`. It intentionally does **not** run automatically on subscription — provisioning a PII store should be a deliberate act, not a side effect of a Stripe webhook.

---

## 4. Enabling checklist

Do not set `LOCKER_CONFIG.filesBase` until **all** of these are true:

- [ ] A written WISP exists, names a responsible person, and has been read by everyone with admin access
- [ ] Nextcloud server-side encryption is on and verified against a fresh upload
- [ ] Underlying storage (Unraid share / dataset) is encrypted
- [ ] 2FA is enforced for all accounts including admins
- [ ] Public link sharing is disabled at the instance level
- [ ] Encrypted off-array backups run on a schedule and a **restore has actually been tested**
- [ ] A retention/purge job deletes vaults for lapsed subscribers
- [ ] `privacy.html` and `terms.html` describe the vault, what is stored, and for how long
- [ ] An upload consent screen exists and is shown before the first file
- [ ] An incident response plan exists covering M.G.L. c. 93H notification

Until every box is ticked, `filesBase` stays empty and the Locker keeps doing the valuable, low-risk 90%.

---

## Sources

- [Apply for a Journeyman Plumber license — Mass.gov](https://www.mass.gov/how-to/apply-for-a-journeyman-plumber-license)
- [Apply for a Master Plumber license — Mass.gov](https://www.mass.gov/how-to/apply-for-a-master-plumber-license)
- [Apply for an Apprentice Plumber license — Mass.gov](https://www.mass.gov/how-to/apply-for-an-apprentice-plumber-license)
- [Renew a plumber, gas fitter, or LP installer license — Mass.gov](https://www.mass.gov/how-to/renew-a-plumber-gas-fitter-or-liquified-petroleum-installer-license)
- [Fees and License Renewal Schedules for Plumbers and Gas Fitters — DPL](https://licensing.reg.state.ma.us/public/dpl_fees/dpl_fees_results.asp?board_code=PL)
- [201 CMR 17.00: Standards for the protection of personal information — Mass.gov](https://www.mass.gov/regulations/201-CMR-1700-standards-for-the-protection-of-personal-information-of-residents-of-the-commonwealth)
- [201 CMR 17.00 full text (PDF) — Mass.gov](https://www.mass.gov/doc/201-cmr-17-standards-for-the-protection-of-personal-information-of-residents-of-the-commonwealth/download)
- [201 CMR 17.02 Definitions — Cornell LII](https://www.law.cornell.edu/regulations/massachusetts/201-CMR-17-02)
- [Massachusetts Plumbing License & Certification — ServiceTitan](https://www.servicetitan.com/licensing/plumbing/massachusetts)
- [MA Data Security Law (201 CMR 17.00) Compliance — KLR](https://kahnlitwin.com/blogs/mission-matters-blog/are-you-up-to-speed-on-201-cmr-17-00)
- [Massachusetts Data Security Law guide — UpGuard](https://www.upguard.com/blog/mass-data-security-law)

Fees, forms, and deadlines change. Verify against mass.gov before relying on any figure here.
