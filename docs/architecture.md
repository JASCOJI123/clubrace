# DRIVER HUB — Architecture

**Driver Operating System inside Telegram** — a personal financial manager + car
manager + AI coach + driver community for professional drivers (taxi, private,
delivery, cargo). Not a taxi aggregator; no fake orders, maps, or demand data
(spec §69.1).

## Monorepo

`npm workspaces` — Node 24 / PostgreSQL 16 / Prisma / TypeScript strict.

```
apps/
  web/       Telegram Mini App (Vite + React 19 + TanStack Query + Tailwind)
  api/       REST API (Fastify 5 + Zod)  — single-origin server (see below)
  bot/       Telegram bot (Telegraf 4, polling or webhook)
  admin/     Admin + Partner panel (Vite + React 19)
  worker/    Background jobs (BullMQ + node-cron; in-memory fallback in dev)
packages/
  database/  Prisma schema + generated client + dev seed
  config/    env parsing + validation (Zod) + feature flags
  types/     shared TypeScript types
  validation/ Zod input schemas shared by API + frontend
  telegram/  server-side initData validation (HMAC) + bot helpers
  ai/        DriverAnalyticsEngine · DriverContextBuilder · Recommendations · Chat
  ui/        shared React UI kit (dark premium fintech theme)
prisma/      schema.prisma is the single source of truth + migration at
             prisma/migrations/20260905000000_init
```

### Import rules that keep the build fast
- `packages/ui` is **source-direct** (package.json `main`/`types` → `src/index.tsx`):
  Vite compiles it, no watch/build dependency.
- `types`/`validation`/`config`/`ai`/`database` expose built `dist` (tsc project refs).
- `apps/web` + `apps/admin` are **standalone** (`moduleResolution: bundler`,
  `noEmit`, `types: ["vite/client"]`) — `vite build` does not need tsc.
- `apps/bot` must not be imported by the worker (bot.ts has a `void main()` side
  effect that starts polling).

## Runtime topology

```
Telegram ──initData──► Fastify API ──► PostgreSQL (Prisma)
   │                    │   │   └──► receives income/expense/goal/… rows
   │                    │   ▼
   │                    │  worker (BullMQ / in-memory) ──► rows + Telegram pushes
   │                    ▼
   Mini App (web) ◄── same origin /  + /api
Admin/Partner ◄──── same origin /admin
```

### Single origin
The Mini App calls the API at the **same origin** `/api` (dev: Vite proxy). In
production the Fastify process itself serves the two built SPAs via
`apps/api/src/plugins/ui.ts`:
- `/`          → `apps/web/dist`     (Mini App, SPA fallback via BrowserRouter)
- `/admin`     → `apps/admin/dist`   (Admin + Partner panel)
- `/api/*`, `/uploads/*`, `/docs`, `/health` are never swallowed — a non-API
  404 stays a JSON 404. The plugin is inert when the dist folders don't exist,
  so dev and unit tests run API-only.

## Authentication (server-side, never trusts the client)

| Flow | How |
| --- | --- |
| Driver (Mini App) | sends Telegram `initData` → API validates HMAC-SHA256 over the bot token (expiry + auth_date), find-or-create user + driver, returns signed JWT carrying `{ kind: 'driver' }` |
| Admin / Moderator / Partner | `POST /auth/admin/login` with bcrypt-password (`admin_users`), JWT with role claim; `POST /auth/dev-login` is gated by `DEMO_MODE` + `NODE_ENV !== production` |
| RBAC | `requireRole('ADMIN','MODERATOR')` preHandler; panel restores role via `GET /auth/whoami` — never trusts a client-side guess |

## Money & honesty invariants (driving every module)

- **All amounts are integer so'm (UZS).** No floats; profit = income − expenses,
  computed deterministically by the backend (`@driverhub/ai`, `computePeriod`).
- **Never fabricate.** Mileage that wasn't logged is `null` and rendered
  "— km noma'lum". When expense coverage < 70% the profit is labeled
  *approximate*. A driver with zero records in a period gets **no** report row.
- **Never fake AI.** The Coach is a deterministic rule engine over the driver's
  own data; an LLM layer activates only with `AI_API_KEY`. Every answer is
  tagged `FACT` / `ESTIMATE` / `RECOMMENDATION`; the AI computes nothing —
  the backend calculates, the AI explains.
- **Payments are verified server-side.** `PaymentProvider` interface; the `local`
  provider creates an audited `payment` row and marks it paid on admin
  verification. PRO price is always returned from the server (`amount`), never
  hardcoded in the client.
- **Admin actions are audited** (`audit_logs` with actor, action, target,
  metadata). Partner revenue is only counted on payment-linked redemptions —
  otherwise it shows "hali o'lchanmagan", never an invented number.
- **Leaderboards respect privacy opt-out** (`Driver.privacy.showInLeaderboard`,
  `shareWeekly`); challenges can be opted out per public leaderboard.

## Background worker (`apps/worker`, spec §33)

`createJobQueue` returns **BullMQ** when `REDIS_URL` is set, else an **in-memory
fallback** with the identical `add`/handler API (no Redis needed in dev).

Jobs: `send_notification`, `dispatch_notifications`, `generate_weekly_report`,
`generate_monthly_report`, `maintenance_reminder`, `goal_reminder`,
`subscription_expiry`, `process_referral_reward`, `calculate_driver_score`,
`update_analytics`, `cleanup_expired_data`.

`node-cron` gates the push-style jobs (dispatch every minute; reports/lifecycle
daily at `WORKER_CRON_REPORTS_DAILY`; score hourly at `WORKER_CRON_SCORE_HOURLY`),
each with a tracked `stop()` handle for graceful shutdown.

Note: the worker reads activity from the **record tables directly** —
`income`/`expenses` relations live on `User`, and `Driver.privacy` is a direct
`Json?` field; there are no `_count` relations on Driver.

## Database

Full Prisma schema (users/drivers/cars/maintenance/income/expense/sessions/goals/
scores-achievements/challenges/partners-offers-claims-redemptions-leads/
marketplace/routes/referrals/subscriptions-payments/notifications/support/admin-
actions/audit). Every business table has `id UUID`, `created_at`, `updated_at`,
soft-delete `deleted_at`. Initial migration:
`prisma/migrations/20260905000000_init` (generated via `migrate diff`, reviewed).

## Feature flags (`packages/config`)

`AI_PROVIDER` (deterministic | anthropic), `PAYMENT_PROVIDER` (local |
telegram_stars | none), `DEMO_MODE`, `STORAGE_PROVIDER` (local | s3),

## Dev tooling

- `VITE_TG_MOCK=1` + Vite dev server = the Mini App runs in a normal browser.
- `npm run typecheck` / `test:unit` / `build` run **without a live database**.
- `docker/docker-compose.yml` gives Postgres + Redis for full local runs.