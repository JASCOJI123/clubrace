# DRIVER HUB — Deployment

## 1. Local development

### Option A — Docker (recommended)

Start the two backing services:

```bash
docker compose -f docker/docker-compose.yml up -d
# postgres on :5432 (driverhub/driverhub), redis on :6379
```

### Option B — native installs (no Docker)

- **PostgreSQL 16** — `winget install PostgreSQL.PostgreSQL.16` (Windows) or
  your distro's package; create the DB:
  ```sql
  CREATE USER driverhub WITH PASSWORD 'driverhub';
  CREATE DATABASE driverhub OWNER driverhub;
  ```
- **Redis 7** — optional. The worker uses BullMQ when `REDIS_URL` is set and an
  in-memory queue otherwise, so dev works without it.

### Environment + database

```bash
npm install
cp .env.example .env        # fill TELEGRAM_BOT_TOKEN, JWT_SECRET, DATABASE_URL
npm run db:migrate
npm run db:seed             # dev seed (clearly labeled dev-only)
```

### Run everything

```bash
npm run dev:api      # Fastify on :4000
npm run dev:web      # Mini App on :5173 (browser: set VITE_TG_MOCK=1)
npm run dev:admin    # Admin/Partner on :5174
npm run dev:bot      # Telegram bot (needs TELEGRAM_BOT_TOKEN from @BotFather)
npm run dev:worker   # background jobs
```

Verify: `GET http://localhost:4000/health` → 200; Swagger at
`http://localhost:4000/docs`.

## 2. Production build & smoke (no live DB)

```bash
npm run lint
npm run typecheck
npm run test:unit       # pure-logic unit tests, no DB
npm run build           # api, bot, worker, web, admin, packages
```

## 3. Production topology (single origin)

The Mini App requires the API at the **same origin** (`/api`). The Fastify
process serves the built SPAs itself:

| Path | Content |
| --- | --- |
| `/` | Mini App — `apps/web/dist` |
| `/admin` | Admin + Partner — `apps/admin/dist` |
| `/api/*`, `/docs`, `/health`, `/uploads/*` | API (never swallowed by the SPA fallback) |

`apps/api/src/plugins/ui.ts` mounts the dist folders only when they exist, so the
API still runs UI-less in dev/tests.

### Free 24/7 — Docker on an Oracle Always Free VM (recommended)

The full production stack (Postgres + Redis + api + bot + worker + Cloudflare
Tunnel for HTTPS) is defined in `Dockerfile`, `docker/docker-compose.prod.yml`
and `docker/.env.prod.example`. Follow the step-by-step runbook:

📄 **[docs/deploy-oracle.md](deploy-oracle.md)** — Oracle signup, VM creation,
`docker/setup-oracle.sh`, Cloudflare Tunnel, BotFather setup, verification.

The `api` service runs `npx prisma migrate deploy` + an idempotent bootstrap
(`packages/database/src/bootstrap.ts`, which creates the first admin and default
settings **without** wiping data) on every boot.

### Render (alternative — not truly 24/7)

Render's free tier *scales to zero*: the bot's long-polling and the worker's cron
are suspended on inactivity, so it is a demo/starting point rather than an
always-on deployment.

1. Push the repo to GitHub.
2. Render → **New → Web Service** → `api` (`docker/` build or the root
   `Dockerfile`), plus a worker service and an attached Postgres.
3. Fill `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBAPP_URL`, `JWT_SECRET`,
   `ADMIN_PASSWORD`; optional `REDIS_URL`, `AI_API_KEY`.
4. `startCommand`: `npx prisma migrate deploy && npx tsx packages/database/src/bootstrap.ts && node apps/api/dist/server.js`.

The bot can run long-polling (its own service) or webhook mode
(`WEBHOOK_URL`/`WEBHOOK_SECRET`).

## 4. Environment variable checklist

All variables and their meaning live in `.env.example` (committed) — copy it to
`.env` for local runs. The critical ones: `DATABASE_URL`, `JWT_SECRET`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBAPP_URL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
`AI_API_KEY` (optional), `REDIS_URL` (optional), `PAYMENT_PROVIDER_KEY`
(optional — interface-only until a processor is chosen).