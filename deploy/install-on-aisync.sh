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
BRANCH="${BRANCH:-main}"
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

# -----------------------------------------------------------------------------
# The backend stack: access (payments/gate), examiner (AI tutor), ops-mcp
# (the agent cockpit). Secrets an agent can own are GENERATED here; only the
# Stripe keys and the tunnel remain human steps.
# -----------------------------------------------------------------------------
gen() { openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
env_get() { grep -E "^$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2-; }
env_set() { # env_set FILE KEY VALUE — replace or append
  if grep -qE "^$2=" "$1" 2>/dev/null; then
    sed -i "s|^$2=.*|$2=$3|" "$1"
  else
    printf '%s=%s\n' "$2" "$3" >> "$1"
  fi
}

log "Scaffolding service .envs (existing files are never overwritten)"
for svc in access-service examiner-service mcp-server; do
  d="$APP_DIR/deploy/$svc"
  [ -f "$d/.env" ] || cp "$d/.env.example" "$d/.env"
done

ACC_ENV="$APP_DIR/deploy/access-service/.env"
MCP_ENV="$APP_DIR/deploy/mcp-server/.env"

# One admin key gates reports/pulse/scholarships; the MCP server needs the same
# value to drive them. Generate once, wire both sides.
REPORTS_KEY="$(env_get "$ACC_ENV" REPORTS_KEY)"
if [ -z "$REPORTS_KEY" ]; then
  REPORTS_KEY="$(gen)"
  env_set "$ACC_ENV" REPORTS_KEY "$REPORTS_KEY"
  echo "   generated REPORTS_KEY (access-service)"
fi
env_set "$MCP_ENV" ACCESS_ADMIN_KEY "$REPORTS_KEY"

MCP_TOKEN="$(env_get "$MCP_ENV" MCP_AUTH_TOKEN)"
if [ -z "$MCP_TOKEN" ] || [ "$MCP_TOKEN" = "change-me-to-a-long-random-string" ]; then
  MCP_TOKEN="$(gen)"
  env_set "$MCP_ENV" MCP_AUTH_TOKEN "$MCP_TOKEN"
  echo "   generated MCP_AUTH_TOKEN (save this for the Claude connector):"
  echo "   $MCP_TOKEN"
  echo "   Type it into the connector config directly — a secret pasted into a"
  echo "   chat is burned. Rotate any time with:"
  echo "     deploy/rotate-mcp-token.sh"
fi

# Shared docker network so mcp -> access and examiner -> access resolve by name.
# A busy fleet can exhaust Docker's default address pools ("all predefined
# address pools have been fully subnetted") — fall back to an explicit subnet.
# Override with ARENA_SUBNET if 10.248.0.0/24 collides with your LAN/VPN.
if ! docker network inspect arena-net >/dev/null 2>&1; then
  docker network create arena-net 2>/dev/null \
    || docker network create --subnet "${ARENA_SUBNET:-10.248.0.0/24}" arena-net
fi

log "Starting backend services (each skips itself if not yet configured)"
STRIPE_SET="$(env_get "$ACC_ENV" STRIPE_KEY)"
if [ -n "$STRIPE_SET" ]; then
  (cd "$APP_DIR/deploy/access-service" && $DC up -d --build) && echo "   arena-access: up"
else
  echo "   arena-access: SKIPPED — set STRIPE_KEY + STRIPE_WEBHOOK_SECRET in deploy/access-service/.env, then:"
  echo "     cd $APP_DIR/deploy/access-service && $DC up -d --build"
fi
(cd "$APP_DIR/deploy/examiner-service" && $DC up -d --build) && echo "   arena-examiner: up (talks to ai-router-controller:4000)"
(cd "$APP_DIR/deploy/mcp-server" && $DC up -d --build) && echo "   arena-ops-mcp: up"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
cat <<EOF

$(log "Almost done — the two human steps")

1) STRIPE (once): put the LIVE keys in deploy/access-service/.env
   (STRIPE_KEY=sk_live_..., STRIPE_WEBHOOK_SECRET=whsec_...), then:
     cd $APP_DIR/deploy/access-service && $DC up -d --build
   If a test key was ever pasted in chat/anywhere, ROTATE it in the Stripe
   dashboard first (Developers -> API keys -> roll).

2) CLOUDFLARE TUNNEL: add ingress rules (ABOVE the final http_status:404):
     - hostname: ${DOMAIN}
       service: http://${LAN_IP:-<AiSync-LAN-IP>}:${PORT}
     - hostname: arena-api.thejohnsonbros.com
       service: http://${LAN_IP:-<AiSync-LAN-IP>}:8766
     - hostname: arena-ai.thejohnsonbros.com
       service: http://${LAN_IP:-<AiSync-LAN-IP>}:8767
     - hostname: mcp-arena.thejohnsonbros.com     # protect with Cloudflare Access too
       service: http://${LAN_IP:-<AiSync-LAN-IP>}:8765
   Then one DNS route per hostname:
     cloudflared tunnel route dns <tunnel-name> <hostname>
   ...and restart the tunnel.

Verify:   curl -s https://arena-api.thejohnsonbros.com/healthz
Full runbook (Stripe webhook, end-to-end money test, scholarship pilot):
  $APP_DIR/deploy/GO-LIVE.md

To update later:  git -C ${APP_DIR} pull && docker restart arena248
Or connect the MCP (https://mcp-arena.thejohnsonbros.com/mcp + the bearer token
above) to a Claude session and say "deploy" — the agent takes it from there.
EOF
