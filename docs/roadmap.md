# DRIVER HUB — Roadmap & explicit deferrals

Everything below is **not** implemented on purpose — each has a reason.
Nothing is faked to hide that (RULE 4/5).

## Deferred (documented choices, spec-compliant)

| Area | Status | Why |
| --- | --- | --- |
| **Live payment processor** | interface only (`PaymentsProvider`; `local` provider verifies server-side, admin-verified rows) | real money needs a licensed processor + legal review; no card data collected at all |
| **Elasticsearch search** | PostgreSQL full-text (`routes/search`, marketplace queries) | enough at this scale; Elasticsearch is a drop-in later |
| **Continuous location tracking** | not implemented | not required by the product spec (§36); avoids battery/privacy tax; driver enters mileage manually (honest) |
| **Regulated route-transport go-live** | scaffold + legal flag only | §25 — needs licensing/insurance review before real users (see legal.md) |
| **Telegram Stars native checkout** | `telegram_stars` provider stub | needs a live stars/API payment flow; documented, gated behind `PAYMENT_PROVIDER=telegram_stars` |
| **LLM chat out of the box** | deterministic engine is the default | no API key → honest rule-based Q&A; `AI_API_KEY` turns on Claude |
| **Fake demand/heatmaps/orders** | never implemented, never will be | the core is real net profit, not an order bazaar |

## Backlog (would build next)

- S3 storage adapter real connection (interface + local are wired; `s3` logs a
  fallback note).
- Route marketplace moderation UX + driver payout ledger.
- Smart reminders wording (personalized templates) behind the notification
  service.
- Metrics/observability — request_id logging already in place; add Prometheus
  + Grafana dashboards.
- i18n: full Uzbek / Russian / English message catalogs (UI strings are
  Uzbek-first today).
- PWA/preload for the Mini App to cut cold starts on slow mobile networks.