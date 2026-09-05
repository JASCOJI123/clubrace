# DRIVER HUB — Free 24/7 Deployment (Oracle Cloud Always Free + Docker)

**Goal:** run the whole DRIVER HUB 24/7 for ₮0/month. We use an **Oracle Cloud
Always Free** ARM VM (free forever, always-on) running everything in Docker,
fronted by a **Cloudflare Tunnel** for the public HTTPS URL that Telegram needs.

> **Why not Render/Railway free?** Their free tiers *scale to zero* — they sleep
> after a few minutes of inactivity. That suspends the bot's long-polling and the
> worker's cron (reminders, reports, score recalcs), so the product is not truly
> 24/7. An always-on VM has no such limit.

Stack on the VM (total RAM ~1–2 GB of your 24 GB free allowance):

| Service | What it runs |
| --- | --- |
| `db` | PostgreSQL 16 (`postgres:16-alpine`) |
| `redis` | Redis 7 (`redis:7-alpine`) |
| `api` | **Single process for everything**: Mini App (/) + Admin (/admin) + REST API + uploads. Runs `prisma migrate deploy` + an idempotent bootstrap on boot. |
| `bot` | Telegraf long-polling (needs `TELEGRAM_BOT_TOKEN`) |
| `worker` | BullMQ (real Redis) + node-cron background jobs |
| `tunnel` | `cloudflare/cloudflared` — public HTTPS → `api:4000`, no ports opened on the VM |

Everything is defined in:
- `Dockerfile` (root, multi-stage, builds all workspaces)
- `docker/docker-compose.prod.yml` (the stack)
- `docker/.env.prod.example` → `docker/.env` (secrets)
- `docker/setup-oracle.sh` (one-shot VM bootstrap)

---

## Step 1 — Push the repo to GitHub

The VM needs a copy of the code.

```bash
git remote add origin https://github.com/YOUR_USER/clubrace.git
git push -u origin main
```

## Step 2 — Create the Oracle Cloud VM (free)

1. Sign up at <https://signup.oraclecloud.com> (home or free tier). Some regions
   ask for a card to verify identity; Always Free resources are still free.
2. Console → **Compute → Instances → Create instance**.
   - **Name:** `driverhub`, **Image:** Ubuntu 24.04 (Canonical, Minimal optional).
   - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM). Scroll **Advanced** and set
     **OCPU count = 4, memory = 24 GB** (the free A1 allowance) — or just 1 OCPU /
     6 GB, which is plenty for this stack.
   - **SSH keys:** add your public key (Windows: `ssh-keygen -t ed25519`) so you
     can `ssh` in.
3. **Network → Security list / allow ingress** to ports **22 (SSH)**, **80**, **443**
   (optional — the Cloudflare tunnel works without 80/443, but keep SSH at least).
4. Wait for **Running**, note the **public IP**.

## Step 3 — SSH in and start the stack

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@<PUBLIC_IP>
```

Then (the script handles Docker install, clone, `.env` creation and `up`):

```bash
sudo bash -c \
  "REPO_URL=https://github.com/YOUR_USER/clubrace.git APP_DIR=/srv/driverhub bash <(curl -fsSL https://raw.githubusercontent.com/YOUR_USER/clubrace/main/docker/setup-oracle.sh)"
```

or, if you cloned manually:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
git clone https://github.com/YOUR_USER/clubrace.git /srv/driverhub
cd /srv/driverhub
cp docker/.env.prod.example docker/.env && nano docker/.env   # fill secrets
docker compose -f docker/docker-compose.prod.yml up -d --build
```

During the first boot, `api` runs `prisma migrate deploy` (creates tables) and the
idempotent bootstrap (creates the first admin + default settings/categories).

## Step 4 — Public HTTPS via Cloudflare Tunnel

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** →
   **Cloudflared** → copy the **token**.
2. Put the token in `docker/.env`: `CLOUDFLARE_TUNNEL_TOKEN=...`
3. In the tunnel config, add a public hostname (e.g. `app.yourdomain.com` or a
   free `*.trycloudflare.com` for quick tests) → service `http://api:4000`.
4. Restart: `docker compose -f docker/docker-compose.prod.yml up -d tunnel`

Now `https://<your-hostname>/` serves the Mini App, `/admin/` the admin panel,
`/api/*` the API. `/docs` is Swagger.

## Step 5 — Point Telegram at the Mini App

1. `@BotFather` → `/mybots` → your bot → **Bot Settings** → **Menu Button** → set
   the **WebApp** URL to `https://<your-hostname>/` (HTTPS, matches
   `TELEGRAM_WEBAPP_URL`).
2. Open the bot in Telegram and tap the menu button → the Mini App opens and
   logs in via initData.

## Step 6 — Verify (checklist)

```bash
docker compose -f docker/docker-compose.prod.yml ps          # all services Up
curl -I http://localhost:4000/                               # 200, Mini App HTML
curl    http://localhost:4000/api/health                     # {"status":"ok",...} or similar
curl -I http://localhost:4000/admin/                         # 200, Admin HTML
docker compose -f docker/docker-compose.prod.yml logs -f worker   # cron lines every minute/hour
docker compose -f docker/docker-compose.prod.yml logs bot         # "polling" started, no errors
```

Then in a browser: `https://<your-hostname>/` → Mini App; `https://<your-hostname>/admin/`
→ login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `docker/.env`.

## Day-to-day operations

```bash
# status / logs
docker compose -f docker/docker-compose.prod.yml ps
docker compose -f docker/docker-compose.prod.yml logs -f api

# update to a new commit
git -C /srv/driverhub pull && docker compose -f docker/docker-compose.prod.yml up -d --build

# restart everything / a single service
docker compose -f docker/docker-compose.prod.yml restart
docker compose -f docker/docker-compose.prod.yml restart worker

# one-off migrations after schema changes (already on every api restart, but explicit):
docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate deploy

# backups (Postgres is on a Docker volume — snapshot it periodically)
docker compose -f docker/docker-compose.prod.yml exec db pg_dump -U driverhub driverhub > backup.sql
```

## Security notes

- `db` and `redis` are **not published** to the VM network (`ports:` is only on
  `api`), so they are reachable only inside the Docker network. Still set a strong
  `POSTGRES_PASSWORD`.
- Cloudflare Tunnel means **no inbound firewall rules needed** except SSH. If you
  ever bypass the tunnel, restrict ingress to 80/443 to Cloudflare IPs.
- Change `ADMIN_PASSWORD` after first login; the bootstrap only creates the admin,
  it never resets an existing account.

## Cost

Oracle Always Free: 4 OCPU / 24 GB ARM VM, PostgreSQL+Redis run inside Docker on
the same VM (no paid database). Cloudflare Tunnel + `*.trycloudflare.com` are free.
Total: **$0/month** (no expiry — Official Always Free resources).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `api` keeps restarting | DB not ready yet — check `docker compose logs db`. `depends_on: condition: service_healthy` retries 12×5s, so Postgres usually wins the race. |
| `bot` exits with an error | `TELEGRAM_BOT_TOKEN` empty → the bot refuses to start in production. Fill it in `docker/.env` and `up -d bot`. |
| Mini App opens but shows an error | Check `TELEGRAM_WEBAPP_URL` matches the real tunnel hostname; verify `/api/health` and CORS origins. |
| Cold blank page on `/` | `docker compose logs api` — old `dist` in the image is refreshed on rebuild (`up -d --build`). |
| Want real driver data but no demo rows | Expected — the production bootstrap creates only the admin + settings, **not** the dev seed (which wipes data). |