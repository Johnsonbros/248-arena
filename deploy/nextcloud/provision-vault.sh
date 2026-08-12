#!/usr/bin/env bash
# 248 Arena — provision a per-user document vault on the fleet's Nextcloud.
#
# READ docs/DOCUMENT_VAULT.md BEFORE RUNNING THIS.
#
# This creates a Nextcloud account and the folder skeleton an apprentice needs
# for their licence paperwork. It is deliberately manual: provisioning a store
# that will hold Social Security numbers and government IDs should be a decision
# someone makes on purpose, not a side effect of a Stripe webhook firing.
#
# Everything this script touches falls under Massachusetts 201 CMR 17.00 the
# moment a real CORI form lands in it. The preflight below refuses to run until
# the instance-level controls are actually in place.
#
# Usage:
#   ./provision-vault.sh <username> <email> [quota]
#
# Example:
#   ./provision-vault.sh jdoe jdoe@example.com 2GB

set -euo pipefail

NC_CONTAINER="${NC_CONTAINER:-jbp-files-app}"
NC_USER="${NC_USER:-www-data}"
QUOTA_DEFAULT="2GB"

USERNAME="${1:-}"
EMAIL="${2:-}"
QUOTA="${3:-$QUOTA_DEFAULT}"

if [[ -z "$USERNAME" || -z "$EMAIL" ]]; then
  echo "usage: $0 <username> <email> [quota]" >&2
  exit 64
fi

occ() { docker exec -u "$NC_USER" "$NC_CONTAINER" php occ "$@"; }

# --- Preflight ---------------------------------------------------------------
# Refuse to create a vault on an instance that is not configured to hold this
# class of data. Each check maps to a control in docs/DOCUMENT_VAULT.md §3.
echo "==> Preflight: verifying instance controls"

fail=0
note() { echo "    ✗ $1"; fail=1; }
ok()   { echo "    ✓ $1"; }

if ! docker inspect "$NC_CONTAINER" >/dev/null 2>&1; then
  echo "Nextcloud container '$NC_CONTAINER' not found. Set NC_CONTAINER=<name>." >&2
  exit 69
fi
ok "container $NC_CONTAINER is present"

# Server-side encryption must be on before any PII arrives — enabling it later
# does not retroactively encrypt files already written to disk.
if occ app:list 2>/dev/null | grep -qi 'encryption'; then
  ok "encryption app enabled"
else
  note "server-side encryption is NOT enabled (occ app:enable encryption && occ encryption:enable)"
fi

# A public link on a scanned ID is the whole breach, in one click.
share_links="$(occ config:app:get core shareapi_allow_links 2>/dev/null || echo 'yes')"
if [[ "$share_links" == "no" ]]; then
  ok "public link sharing disabled"
else
  note "public link sharing is ENABLED (occ config:app:set core shareapi_allow_links --value=no)"
fi

# 201 CMR 17.04(1): secure authentication.
if occ app:list 2>/dev/null | grep -qi 'twofactor'; then
  ok "a two-factor provider is installed"
else
  note "no two-factor app installed — 2FA must be enforced for every account"
fi

# HTTPS only. Nextcloud records its canonical URL; an http:// one means the
# in-transit encryption requirement is not met.
overwrite="$(occ config:system:get overwrite.cli.url 2>/dev/null || echo '')"
if [[ "$overwrite" == https://* ]]; then
  ok "instance URL is https"
else
  note "instance URL is not https (overwrite.cli.url = '${overwrite:-unset}')"
fi

if (( fail )); then
  cat >&2 <<'EOF'

Refusing to provision. The controls above are the minimum for holding
Massachusetts personal information (SSN on the CORI form, licence number on a
photo ID). Fix them, or keep using the License Locker's tracker-only mode,
which stores no personal information at all.

Override at your own risk with: ALLOW_UNSAFE=1 ./provision-vault.sh ...
EOF
  [[ "${ALLOW_UNSAFE:-0}" == "1" ]] || exit 78
  echo "ALLOW_UNSAFE=1 set — continuing anyway." >&2
fi

# --- Create the account ------------------------------------------------------
echo "==> Creating user '$USERNAME'"

# Nextcloud reads the password from OC_PASS rather than argv so it never lands
# in the shell history or the process list.
PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 20)"

if occ user:info "$USERNAME" >/dev/null 2>&1; then
  echo "    user already exists — skipping creation"
else
  docker exec -u "$NC_USER" -e "OC_PASS=$PASSWORD" "$NC_CONTAINER" \
    php occ user:add --password-from-env --display-name="$USERNAME" "$USERNAME"
  occ user:setting "$USERNAME" settings email "$EMAIL"
  echo "    created. Temporary password: $PASSWORD"
  echo "    Give this to the user over a channel you trust, then have them change it and enrol in 2FA."
fi

occ user:setting "$USERNAME" files quota "$QUOTA"
echo "    quota set to $QUOTA"

# --- Folder skeleton ---------------------------------------------------------
# Mirrors the checklist phases in js/locker.js so the two stay legible together.
echo "==> Creating folder skeleton"
BASE="/var/www/html/data/$USERNAME/files/Plumbing License"
FOLDERS=(
  "01 Apprentice License"
  "02 Education"
  "03 Statements of Experience"
  "04 CORI (notarized)"
  "05 Identification"
  "06 Continuing Education"
)
for f in "${FOLDERS[@]}"; do
  docker exec -u "$NC_USER" "$NC_CONTAINER" mkdir -p "$BASE/$f"
done

# A README in the vault itself, because the person reading it at 9pm on a
# Sunday will not have this repo open.
docker exec -i -u "$NC_USER" "$NC_CONTAINER" tee "$BASE/README.txt" >/dev/null <<'EOF'
Your Plumbing License documents
===============================

This is YOUR private storage. 248 Arena tracks whether each document is done —
it never reads or stores the files themselves.

01 Apprentice License      Your apprentice licence and renewals.
02 Education               Tier certificates, transcripts, Education
                           Verification Form once your school signs it.
03 Statements of Experience One per master plumber you worked under.
04 CORI (notarized)        Your CORI Acknowledgement Form. Page 2 must be
                           notarized. This has your SSN on it — do not email
                           it, do not share a public link to it.
05 Identification          Photo ID. Check the expiry date well before exam day.
06 Continuing Education    After you are licensed: 12 hours every 2 years.

Never create a public share link for anything in this folder.
EOF

occ files:scan --path="/$USERNAME/files" >/dev/null
echo "    skeleton created and indexed"

# --- Done --------------------------------------------------------------------
BASE_URL="${overwrite:-https://files.example.com}"
cat <<EOF

==> Done.

    Vault:  $BASE_URL/apps/files/?dir=/Plumbing%20License
    User:   $USERNAME <$EMAIL>
    Quota:  $QUOTA

Next:
  1. Have the user sign in, change the password, and enrol in 2FA.
  2. Set LOCKER_CONFIG.filesBase in js/locker.js to:
       $BASE_URL/apps/files/?dir=/Plumbing%20License
  3. Confirm every box in docs/DOCUMENT_VAULT.md §4 is ticked.
  4. Add this user to the retention/purge job so the vault is deleted after
     their subscription ends. Holding PII for lapsed customers is all risk.
EOF
