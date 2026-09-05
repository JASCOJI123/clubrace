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

### Render (blueprint included in `render.yaml`)

1. Push the repo to GitHub.
2. Render → **New → Blueprint** → select the repo.
3. It provisions two services (api web, worker) + Postgres. Fill the `sync: false`
   env vars in the dashboard:
   - `TELEGRAM_BOT_TOKEN` (from @BotFather) and `TELEGRAM_WEBAPP_URL` (the API
     URL — the Mini App link in BotFather must point here, HTTPS).
   - `JWT_SECRET` (auto-generated, override if you prefer), `ADMIN_PASSWORD`.
   - Optional: `REDIS_URL` (Upstash/KeyDB) for durable queues, `AI_API_KEY`
     (Anthropic) to enable natural-language chat. Without them the in-memory
     queue fallback and the deterministic AI engine are used.
4. Run migrations on the provisioned Postgres (one-off):
   ```bash
   # from a local shell with the Render DATABASE_URL:
   npx prisma migrate deploy
   ```
   (or a small release command — recommended: add `startCommand` prefix:
   `npx prisma migrate deploy && npm run start ...`)

### Bottime

Set the webhook for the bot (`WEBHOOK_URL`/`WEBHOOK_SECRET` env) or keep polling
(the default). Renders config: run the bot as its own service if you want a
persistent long-poll process; otherwise the API can host it.

## 4. Environment variable checklist

All variables and their meaning live in `.env.example` (committed) — copy it to
`.env` for local runs. The critical ones: `DATABASE_URL`, `JWT_SECRET`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBAPP_URL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
`AI_API_KEY` (optional), `REDIS_URL` (optional), `PAYMENT_PROVIDER_KEY`
(optional — interface-only until a processor is chosen).