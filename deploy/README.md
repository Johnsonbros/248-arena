# Deploy 248 Arena on the AiSync (Unraid) server

The app is static files. You serve them with a tiny nginx container and expose
`arena.thejohnsonbros.com` through your **existing** Cloudflare Tunnel. ~10 minutes.

> I can't deploy this for you — my session only has the GitHub repo, no access to
> your server. These are the exact commands to run on the AiSync box yourself.

---

## 1. Get the files + start the container

SSH into AiSync, then run the one-command deploy (clones/updates + starts nginx):

```bash
APP_DIR=/mnt/user/appdata/248-arena BRANCH=claude/repo-overview-h1p7ls \
  bash <(curl -fsSL https://raw.githubusercontent.com/Johnsonbros/248-arena/claude/repo-overview-h1p7ls/deploy/deploy.sh)
```

(Once the launch layer is merged into `main`, drop the `BRANCH=` override.)

**Verify it's serving locally:**
```bash
curl -I http://localhost:8248/index.html      # expect: HTTP/1.1 200 OK
```

Manual alternative (no script):
```bash
git clone -b claude/repo-overview-h1p7ls https://github.com/Johnsonbros/248-arena.git /mnt/user/appdata/248-arena
cd /mnt/user/appdata/248-arena/deploy && docker compose up -d
```

---

## 2. Put it online (pick ONE)

### Option A — Cloudflare Tunnel direct (simplest)
Edit your `cloudflared-tunnel` config and add the hostname from
[`cloudflared-ingress.snippet.yml`](cloudflared-ingress.snippet.yml) — point it at
`http://<AiSync-LAN-IP>:8248`. Add the DNS route once, reload the tunnel. Done.

### Option B — through your existing Caddy
Use [`Caddyfile.snippet`](Caddyfile.snippet) to reverse-proxy `arena.thejohnsonbros.com` to the
container, then route that hostname via the tunnel as you do for your other sites.

---

## 3. Lock it down + wire payments

Before sharing the link publicly, finish [`../LAUNCH.md`](../LAUNCH.md):
- Stripe checkout is already wired (live Pricing Table in `pricing.html`). In Stripe, set the
  table's **completion redirect** to `https://arena.thejohnsonbros.com/welcome.html` — required,
  or paying customers get locked out by the gate.
- The **access gate** (`js/subscription.js`) is in `code` mode; Cloudflare Access is the real lock.
- Review the legal pages.

Because the files are mounted read-only from the git checkout, **updating is just**:
```bash
cd /mnt/user/appdata/248-arena && git pull && docker restart arena248
```
(or re-run the deploy script). No rebuild needed.

---

## Notes
- Port `8248` is arbitrary — change it in `docker-compose.yml` if it clashes.
- This mirrors your existing `tjb-game` (nginx:alpine) pattern, so it fits the fleet.
- Add the app as an **Uptime-Kuma** monitor and an **Umami** site — both already running.
