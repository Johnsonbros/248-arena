#!/usr/bin/env bash
# =============================================================================
# 248 Arena — one-file installer for the AiSync (Unraid) server.
# Run this ON the server (or hand it to an agent that has server access, e.g.
# Codex / claude-max-agent). It clones the repo, starts the nginx container,
# verifies it's serving, and prints the exact Cloudflare Tunnel step to finish.
#
# Usage:
#   # public repo:
#   bash install-on-aisync.sh
#
#   # private repo (fine-grained read token for Johnsonbros/248-arena):
#   GITHUB_TOKEN=ghp_xxx bash install-on-aisync.sh
#
#   # override anything:
#   APP_DIR=/mnt/user/appdata/248-arena BRANCH=claude/repo-overview-h1p7ls \
#   DOMAIN=arena.example.com PORT=8248 bash install-on-aisync.sh
# =============================================================================
set -euo pipefail

REPO_SLUG="${REPO_SLUG:-Johnsonbros/248-arena}"
BRANCH="${BRANCH:-claude/repo-overview-h1p7ls}"   # launch layer lives here until merged to main
APP_DIR="${APP_DIR:-/mnt/user/appdata/248-arena}"
PORT="${PORT:-8248}"
DOMAIN="${DOMAIN:-arena.thejohnsonbros.com}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [ -n "$GITHUB_TOKEN" ]; then
  REPO_URL="https://${GITHUB_TOKEN}@github.com/${REPO_SLUG}.git"
else
  REPO_URL="https://github.com/${REPO_SLUG}.git"
fi

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }

log "Checking prerequisites"
command -v git >/dev/null || { echo "git not found"; exit 1; }
command -v docker >/dev/null || { echo "docker not found"; exit 1; }
DC="docker compose"; docker compose version >/dev/null 2>&1 || DC="docker-compose"

log "Fetching source (branch: $BRANCH) into $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

log "Starting the container on port $PORT"
cd "$APP_DIR/deploy"
PORT="$PORT" $DC up -d 2>/dev/null || {
  # docker-compose.yml pins 8248; if PORT was overridden, publish it explicitly.
  docker rm -f arena248 >/dev/null 2>&1 || true
  docker run -d --name arena248 --restart unless-stopped \
    -p "${PORT}:80" -v "${APP_DIR}:/usr/share/nginx/html:ro" nginx:alpine
}

log "Verifying it's serving locally"
sleep 2
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/index.html" || true)"
if [ "$CODE" = "200" ]; then
  echo "   OK — http://localhost:${PORT}/index.html returned 200"
else
  echo "   WARNING — got HTTP ${CODE}. Check: docker logs arena248"
fi

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
cat <<EOF

$(log "Almost done — expose it publicly")
The app is running at:  http://${LAN_IP:-<AiSync-LAN-IP>}:${PORT}

Finish by routing it through your existing Cloudflare Tunnel (cloudflared-tunnel):
  1) Add to the tunnel's ingress (ABOVE the final http_status:404 rule):
       - hostname: ${DOMAIN}
         service: http://${LAN_IP:-<AiSync-LAN-IP>}:${PORT}
  2) Add the DNS route once:
       cloudflared tunnel route dns <your-tunnel-name> ${DOMAIN}
  3) Reload/restart the tunnel.

Then finish LAUNCH.md: paste your Stripe Payment Link into pricing.html and set
the access-gate mode in js/subscription.js.

To update later:  git -C ${APP_DIR} pull && docker restart arena248
EOF
