# DRIVER HUB — Legal notes (spec §25 related)

This project ships as a **tool for drivers**, not as a regulated transport
operator. Read this before going live in a real market.

## Route marketplace (§25)

- `routes` lets drivers publish intercity/commuter trips and passengers request
  a seat. **This is the only segment with regulatory exposure**, and it remains
  a scaffold (real schema + CRUD) — not auto-enabled.
- Before turning it on for real users in Uzbekistan (or any market), get advice
  on: passenger-transport licensing/permits for driver-operated routes,
  liability and insurance rules for shared trips, and whether the operator has
  an obligation as an "information intermediary" vs. a transit operator.
- The product is shipped with a **legal review flag** (docs + code comments);
  the route marketplace should not be marketed until that review is signed off.

## Payments (§44)

- Only a `local` provider is implemented (admin-verified payment rows). There is
  no real money movement, no card data, no payment CUI — none of it is collected.
- When a real processor is attached (Telegram Stars, Stripe, Payme, Click), the
  operator becomes a payment participant and must meet its terms (receipts,
  KYC, refund policy, transaction records). Implement `PaymentProvider` behind
  the interface and keep verification server-side.

## User data

- The app processes drivers' financial and location-adjacent data. Minimal,
  purpose-scoped collection: income/expense records, car details, contact info,
  Telegram identity.
- Provide what the jurisdiction requires (Uzbekistan: Law "On Personal Data",
  № O'RQ-547; EU users: GDPR) — a data export endpoint exists
  (`GET /me/export`) and account deletion (`DELETE /me`).
- `.env` and `uploads/` are gitignored; logs redact tokens/passwords/initData.

## Telegram platform terms

- The bot and Mini App operate under Telegram's Platform Terms. The Mini App
  must live at an HTTPS URL, and the button payload/initData flow must match
  Telegram's documented scheme (the server validates the HMAC — never trusts
  `initDataUnsafe`).

## Advertising / honesty (§69)

- Partner offers, leaderboards, and the AI Coach present estimates and
  recommendations, never fabricated facts. Where profit is approximate or
  mileage is unknown, the UI says so (RULE 4/5/6). This is both a product
  principle and a consumer-protection posture — keep it.