#!/usr/bin/env bash
# 248 Arena — one-command deploy/update on the AiSync (Unraid) server.
# Clones the repo if missing, pulls the latest, and (re)starts the nginx container.
#
# Usage (on the server):
#   APP_DIR=/mnt/user/appdata/248-arena BRANCH=claude/repo-overview-h1p7ls \
#     bash <(curl -fsSL https://raw.githubusercontent.com/Johnsonbros/248-arena/claude/repo-overview-h1p7ls/deploy/deploy.sh)
# or, if you already have the repo checked out:
#   cd /path/to/248-arena && bash deploy/deploy.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Johnsonbros/248-arena.git}"
APP_DIR="${APP_DIR:-/mnt/user/appdata/248-arena}"
BRANCH="${BRANCH:-main}"   # set to claude/repo-overview-h1p7ls until the launch layer is merged

echo "==> 248 Arena deploy"
echo "    repo:   $REPO_URL"
echo "    dir:    $APP_DIR"
echo "    branch: $BRANCH"

if [ -d "$APP_DIR/.git" ]; then
  echo "==> Updating existing checkout"
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  echo "==> Cloning"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "==> Starting container"
cd "$APP_DIR/deploy"
docker compose up -d

echo
echo "==> Done. Local test:  curl -I http://localhost:8248/index.html"
echo "    Now expose arena.thejohnsonbros.com via Cloudflare Tunnel — see deploy/README.md"
