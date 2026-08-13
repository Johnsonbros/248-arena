#!/usr/bin/env bash
# Rotate the arena-ops-mcp bearer token in place. Run on the AiSync host after
# a token has been exposed anywhere it shouldn't be (chat, screenshot, log).
# Prints the new token ONCE — put it straight into the Claude connector config.
set -euo pipefail

APP_DIR="${APP_DIR:-/mnt/user/appdata/248-arena}"
ENV_FILE="$APP_DIR/deploy/mcp-server/.env"

[ -f "$ENV_FILE" ] || { echo "no $ENV_FILE — run install-on-aisync.sh first"; exit 1; }

NEW="$(openssl rand -hex 24 2>/dev/null || head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
if grep -qE '^MCP_AUTH_TOKEN=' "$ENV_FILE"; then
  sed -i "s|^MCP_AUTH_TOKEN=.*|MCP_AUTH_TOKEN=$NEW|" "$ENV_FILE"
else
  printf 'MCP_AUTH_TOKEN=%s\n' "$NEW" >> "$ENV_FILE"
fi

# Pick up the new token if the container exists; silent no-op otherwise.
docker restart arena-deploy-mcp >/dev/null 2>&1 || true

echo "New MCP_AUTH_TOKEN (update the Claude connector now):"
echo "$NEW"
echo "The old token stopped working the moment the container restarted."
