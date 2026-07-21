# arena-deploy-mcp

A **narrow, token-gated MCP server** that lets an authorized Claude session deploy and
manage the 248 Arena container on your Unraid box **over HTTPS** — no SSH, no Tailscale.
This is the one channel that works from a sandboxed Claude session, because MCP rides the
same HTTPS path the session is already allowed to use.

## What it exposes (that's all)
| Tool | Does | Read-only |
|---|---|---|
| `arena_status` | container up? healthy? serving HTTP 200? | ✅ |
| `arena_deploy` | clone/pull a branch + (re)start the nginx container | ❌ |
| `arena_restart` | restart the container | ❌ |
| `arena_logs` | tail the container logs | ✅ |

No arbitrary shell — every action is a fixed command with validated arguments.

## Run it on AiSync
```bash
cd /mnt/user/appdata/248-arena/deploy/mcp-server   # (after cloning the repo)
cp .env.example .env
# edit .env: set a long random MCP_AUTH_TOKEN, and GIT_TOKEN if the repo is private
docker compose up -d --build
curl -s localhost:8765/healthz          # {"ok":true,...}
```

## Expose it (via your existing Cloudflare Tunnel)
Add an ingress rule pointing `mcp-arena.thejohnsonbros.com` at `http://<AiSync-LAN-IP>:8765`,
add the DNS route, reload the tunnel. **Also put it behind Cloudflare Access** — see security.

## Connect it to Claude
In Claude settings → Connectors, add a custom MCP connector:
- **URL:** `https://mcp-arena.thejohnsonbros.com/mcp`
- **Auth header:** `Authorization: Bearer <your MCP_AUTH_TOKEN>`

Enable it for the chat. Its tools then appear in the session, and Claude can run
`arena_deploy` etc. directly against your box.

## ⚠️ Security — read this
This container mounts the **Docker socket**, which is **root-equivalent on the host**. Treat
the endpoint like a root shell:
- Keep the **bearer token** secret and long; the server refuses to start without one.
- Put the hostname behind **Cloudflare Access** (a second, independent auth layer) so a
  leaked token alone isn't enough.
- Never port-forward `8765` raw to the internet — only reach it through the tunnel.
- Scope is intentionally tiny (4 tools) to limit blast radius. Don't widen it casually.

## Local build check (optional)
```bash
npm install && npm run build      # compiles TypeScript to dist/
```
