# DRIVER HUB — REST API

Base path: `/api` (Mini App + panels call this same-origin prefix).
Live OpenAPI/Swagger UI is served by the API at **`/docs`**.

## Auth

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| POST | `/auth/telegram` | public | body `{ initData }` — server-side HMAC validation, find-or-create, returns `{ token, user }` |
| POST | `/auth/dev-login` | dev only | `DEMO_MODE` + non-production; `{ demoUserId?, role? }` |
| POST | `/auth/admin/login` | public | `adminUser` bcrypt login → admin/partner JWT |
| GET | `/auth/whoami` | bearer | restores the session identity + role |

All other endpoints require `Authorization: Bearer <JWT>`. Errors return
`{ message, code?, details? }`; `401` and `403` are typed:
- driver-only routes → `401` for guests, `403` when role mismatch.

## Driver core

| Group | Endpoints |
| --- | --- |
| Profile (`/me`) | GET `/me` · POST `/me/onboarding` · PATCH `/me` · PATCH `/me/privacy` · DELETE `/me` (delete account) |
| Dashboard (`/me`) | GET `/me/dashboard` · GET `/me/analytics?range=` · GET `/me/money-table` · GET `/me/share-week` · GET `/me/score` · POST `/me/score/recompute` · GET `/me/export` |
| Cars | GET/POST `/cars` · GET/PATCH/DELETE `/cars/:id` · GET `/cars/:id/cost` · POST `/cars/:id/documents` |
| Maintenance | GET `/maintenance` · POST `/maintenance` · GET `/maintenance/due` |
| Income | GET/POST `/income` · PATCH/DELETE `/income/:id` · GET `/income/stats` |
| Expenses | GET/POST `/expenses` · PATCH/DELETE `/expenses/:id` |
| Work sessions | GET `/work-sessions/current` · POST `/work-sessions/start` · POST `/work-sessions/:id/finish` · GET `/work-sessions` |
| Goals | GET/POST `/goals` · PATCH/DELETE `/goals/:id` · POST `/goals/:id/transactions` · PATCH `/goals/:id/status` |
| AI | POST `/ai/chat` · POST `/ai/coach` · GET `/ai/stats` |
| Notifications | GET `/notifications` · GET `/notifications/unread-count` · POST `/notifications/:id/read` · POST `/notifications/read-all` · GET/PATCH `/notifications/preferences` |
| Support | POST `/support/tickets` · GET `/support/tickets` · GET `/support/tickets/:id` · POST `/support/tickets/:id/replies` |

## Extended / scaffold modules (real schema + CRUD)

| Group | Endpoints |
| --- | --- |
| Club | GET `/club/offers` · GET `/club/offers/:id` · POST `/club/offers/:id/click` · POST `/club/offers/:id/claim` · GET `/club/my-claims` |
| Marketplace | GET `/marketplace/categories` · GET/POST `/marketplace/listings` · GET `/marketplace/my-listings` · GET/PATCH/DELETE `/marketplace/listings/:id` · POST `/marketplace/listings/:id/images` |
| Routes | GET `/routes/search?q=` · POST `/routes` · GET/PATCH/DELETE `/routes/:id` · POST `/routes/:id/request` · GET `/routes/:id/requests` · POST `/routes/:id/requests/:requestId/respond` |
| Challenges | GET `/challenges` · POST `/challenges/:id/join` · GET `/challenges/my` · GET `/challenges/:id/leaderboard` · PATCH `/challenges/:id/opt-out` |
| Partners | POST `/partners/onboarding` · GET/PATCH `/partners/profile` · GET/POST `/partners/offers` · PATCH/DELETE `/partners/offers/:id` · GET `/partners/offers/:id/stats` |
| Referrals | GET `/referrals` |
| Subscriptions | GET `/subscriptions/current` · POST `/subscriptions/subscribe` |
| Payments | GET `/payments` (admin) · POST `/payments/:id/verify` (admin) |

## Admin (`/admin/*`, `requireRole('ADMIN' | 'MODERATOR')`)

GET `/admin/stats` · GET `/admin/drivers` (cursor) · GET `/admin/drivers/:id` ·
PATCH `/admin/drivers/:id` · GET `/admin/moderation/listings` ·
POST `/admin/moderation/listings/:id` · GET `/admin/moderation/offers` ·
POST `/admin/moderation/offers/:id` · (partners/reports moderation) ·
POST `/admin/broadcast` · GET/PATCH `/admin/challenges` ·
GET/PATCH `/admin/settings` · GET `/admin/audit` · GET `/admin/support` ·
POST `/admin/support/:id/reply` · PATCH `/admin/support/:id/status`

Partners use `/partner/*` and `/partners/*` (login-gated, role `PARTNER`).

## Uploads

POST `/uploads/image` (auth) — MIME allow-list, ≤5 MB, sanitized filename;
files land under `uploads/` and are served from `/uploads/...`.

## Conventions

- **Money**: integers (so'm) everywhere; strings like `"1 250 000"` appear only
  as pre-formatted *display* summaries from `/me/analytics`.
- **Pagination**: cursor-based `{ items, nextCursor }`; pass `?cursor=` until
  `nextCursor: null`.
- **Honesty**: no fabricated numbers in any response. When data is insufficient
  (`null` mileage, expenses < 70% coverage) the payload says so explicitly
  (e.g. `expensesIncomplete: true`, `profitPerKm: null`).