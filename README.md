# 🚕 DRIVER HUB

**Driver Operating System inside Telegram.**
**Ko'proq toping. Kamroq sarflang.**

Driver Hub is *not* another taxi aggregator. It is a personal financial manager + car manager + AI coach + driver community + driver marketplace for professional drivers (taxi, private, delivery, cargo). It helps working drivers keep more of what they already earn.

> Sizga buyurtma bermaymiz. Sizga mavjud ishingizdan ko'proq pul qolishiga yordam beramiz.

## Product principles (from spec §69)

1. **Do not copy Yandex.** No fake taxi orders, no fake live maps, no fake demand heatmaps, no fake traffic data.
2. Driver Hub does not need to own the taxi order marketplace to be valuable.
3. **The core metric is real net profit the driver made.**
4. **Never fabricate external data.** Unavailable features are marked as unavailable.
5. **Never fake AI intelligence.** The AI Coach is a real deterministic engine over the driver's own data; an LLM chat layer activates only when an API key is configured. All AI output is tagged `FACT` / `ESTIMATE` / `RECOMMENDATION`.
6. Financial calculations are deterministic (all amounts in integer UZS).
7. AI explains and recommends; the backend calculates.

## Modules

| Module | Status |
| --- | --- |
| Telegram Bot | ✅ core |
| Telegram Mini App | ✅ core |
| Backend REST API | ✅ core |
| PostgreSQL (Prisma) | ✅ core |
| Redis + background workers | ✅ core (dev in-memory fallback) |
| Onboarding / Dashboard / Money / Car / Goals / Analytics | ✅ core |
| AI Driver Coach + Chat | ✅ core |
| Driver Score / Levels / Achievements | ✅ core |
| PRO subscription + PaymentProvider interface | ✅ core (server-verified) |
| Admin Panel + Partner Panel | ✅ core |
| Notifications + Support + Moderation + Audit | ✅ core |
| Driver Club / Marketplace / Routes / Challenges / Referrals | ◐ scaffold (real schema + CRUD) |

## Monorepo layout

```
apps/
  web/       Telegram Mini App (Vite + React + TypeScript)
  api/       REST API (Fastify + Zod)
  bot/       Telegram bot (Telegraf)
  admin/     Admin + Partner panels (Vite + React)
  worker/    Background jobs (BullMQ + cron)
packages/
  database/  Prisma schema + client + dev seed
  config/    env config + feature flags
  types/     shared TypeScript types
  validation/ Zod input schemas
  telegram/  server-side initData validation, bot helpers
  ai/        analytics + driver context + recommendations + chat
  ui/        shared React UI kit (dark fintech theme)
prisma/      schema + migrations
docker/      docker-compose (Postgres + Redis)
docs/        architecture, API, deploy, legal notes
```

## Quick start

```bash
npm install
cp .env.example .env      # fill TELEGRAM_BOT_TOKEN, JWT_SECRET, DATABASE_URL
# 1) Start Postgres + Redis (Docker) — or install natively (see docs/infra.md)
docker compose -f docker/docker-compose.yml up -d
# 2) Migrations + seed
npm run db:migrate
npm run db:seed
# 3) Run everything
npm run dev:api
npm run dev:web    # Mini App (browser: set VITE_TG_MOCK=1)
npm run dev:admin  # Admin / Partner panel
npm run dev:bot    # Telegram bot (needs TELEGRAM_BOT_TOKEN)
npm run dev:worker # background jobs
```

### No Telegram token yet?
- The **Mini App** runs in a normal browser with `VITE_TG_MOCK=1` (mock Telegram WebApp injected).
- The **bot** needs a token from [@BotFather](https://t.me/BotFather) to go live; the code is webhook/polling-ready.

## Scripts (root)

| Script | Purpose |
| --- | --- |
| `npm run build` | Production build of all workspaces |
| `npm run typecheck` | `tsc --noEmit` for all workspaces |
| `npm run lint` | ESLint all workspaces |
| `npm run test:unit` | Vitest unit tests (**no DB needed**) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (prod) |
| `npm run db:seed` | Dev seed data (clearly labeled dev-only) |

## Docs
- [docs/architecture.md](docs/architecture.md)
- [docs/api.md](docs/api.md) (+ live OpenAPI at `/docs` on the API)
- [docs/deploy.md](docs/deploy.md) (local dev + production topology)
- [docs/deploy-oracle.md](docs/deploy-oracle.md) (free 24/7 Docker deployment on Oracle Cloud Always Free)
- [docs/legal.md](docs/legal.md) (route marketplace, payments, data)
- [docs/roadmap.md](docs/roadmap.md) (explicit deferrals: live payments, Elasticsearch, continuous location)

## Security posture
Telegram `initData` is validated **server-side** (HMAC-SHA256 over the bot token); `initDataUnsafe` is never trusted. Money is integer UZS. Payments are verified server-side, never from frontend state. Secrets (`DATABASE_URL`, `BOT_TOKEN`, `AI_API_KEY`, `PAYMENT_SECRET`, `JWT_SECRET`) are never shipped to the frontend. Admin actions are audit-logged. Add `.env` to `.gitignore` (already done).