---
inclusion: always
---

# Multi-Merchant DLT Payment Link Platform — project context

Full docs: `DESIGN.md` (architecture) and `TASKS.md` (ordered build plan) at the repo root. This file is the condensed version that's always in context; go to those two files for anything not covered here.

## What this is

A Next.js (App Router) + TypeScript Backend-for-Frontend that lets a payee (merchant) log in with their DLT credentials, generate shareable payment links, and let an anonymous payor complete a Hosted Checkout payment via DLT's Collection API v4.0 (Channel 4), with no card data ever touching this app.

## Where state lives (there is no application database)

1. **Stateless, JWE-encrypted tokens** are the primary store of truth — both the payee's session (`dlt_session` cookie) and every payment link (`/pay/[token]`). If you're tempted to add a database table, stop and re-read `DESIGN.md` §2/§3 first — it's almost certainly meant to be a token field instead.
2. **Upstash Redis** exists for exactly one purpose: rate-limit counters. No PII, no tokens, no transaction data ever goes there.
3. **DLT itself** is the only source of truth for payment status (`PAID` / `PENDING` / `REJECTED`), fetched live via `/sync`. The transactions dashboard tab is backed by a hardcoded dummy-data stub for this iteration (`lib/dlt-transaction-service.ts`) — that's intentional, not a TODO to "fix" by wiring up a real database.

## Directory map (see spec §9 / DESIGN.md for the full tree)

```
lib/crypto.ts, session.ts, link-token.ts, expiry.ts, csrf.ts, rate-limit.ts,
    logger.ts, money.ts, merchant-txn-id.ts, dlt-client.ts, dlt-transaction-service.ts
app/(auth)/login, app/(dashboard)/{dashboard,transactions}, app/pay/[token]/{page,verify}
app/api/auth/{login,logout}, app/api/payment/{create-link,submit,sync,brands}, app/api/transactions
```

## Non-negotiable invariants

- **Never log:** `client_id`, `client_secret`, `access_token`, `dlt_access_token`, decrypted session/JWE contents, `Authorization` headers, raw payor PII (`first_name`, `last_name`, `email`, `phone`, address fields), raw request/response bodies to/from DLT. Logging goes through `lib/logger.ts`'s `logEvent`/`sanitizeError` only — never a raw `console.log`/`console.error` in a route handler.
- **Money:** `amount` is always a decimal string (`"1500.00"`), validated by `lib/money.ts`, `0 < amount <= 500000.00`. Never `parseFloat`/`Number()` it anywhere in the pipeline.
- **`merchant_transaction_id`:** generated exactly once at link creation, immutable, ASCII `[A-Za-z0-9_-]`, max 45 chars. Never regenerate it on retry/resubmit.
- **Never auto-resubmit on DLT `409` or `503`.** These are surfaced to the user distinctly (see the DLT-specific steering file for the exact handling). Blind retries risk duplicate charges.
- **Token expiry is strict everywhere** (`/pay/[token]`, `/api/payment/brands`, `/api/payment/submit`, `/api/payment/sync`) via the single shared `isTokenExpired` utility — no endpoint hand-rolls its own check, and there is no exception for "payment was probably in flight."
- **CSRF:** Origin/Referer check on every state-changing POST; double-submit `x-csrf-token` additionally required on `create-link` and `submit`.
- **JWE:** `dir` / `A256GCM`, `kid`-based key rotation, independent secret pairs for sessions vs. links. Never share a secret between the two.
- **JWE tokens in URLs:** place the token directly in the path segment — **no `encodeURIComponent`**. JWE compact serialization is pure base64url (`[A-Za-z0-9_-]`) plus `.` separators; all URL-safe. Wrapping it in `encodeURIComponent` inflates the URL by ~30% for no benefit.

## PaymentLinkPayload — key fields (see DESIGN.md §3.2 for full shape)

- `product_name`, `product_description`, `product_reference_id` — **required** at link creation (min 1 char each). The API returns 400 if any are missing.
- `vat_rate` — optional integer (basis points, e.g. `1200` = 12%). **Display-only** — the full VAT-inclusive `amount` is what goes to DLT. Used to render a base/VAT/total breakdown on both the merchant form and the payor pay page. Formula: `vatCents = round(total × rate / (10000 + rate))`.
- `labels` — optional map of custom field labels (merchant's localStorage preference, stamped into the token at creation). Payor pay page resolves these; falls back to "Product / Description / Reference".

## Custom field labels — persistence

Labels (`product_name`, `product_description`, `product_reference_id` display names) are stored in `localStorage['dlt_payee_label_preferences']`. Origin-scoped (per browser/device). No server storage. Stamped into `PaymentLinkPayload.labels` at creation so the payor sees the same labels without an extra round-trip.

## lib/money.ts exports

- `isValidAmount(amount)` — validates decimal string + range
- `formatDisplayAmount(amount)` — display-only Intl formatting
- `computeVat(amount, rateBps?)` — integer-cents VAT breakdown: `{ baseCents, vatCents, totalCents }`
- `formatCents(cents)` — display-only cents formatter

## Environment

- `MAX_LINK_URL_LENGTH` — default **4096** (raised from original 2000). Schema rejects values outside 500–8000. Raise freely in `.env`.

## Commands

- `npm run dev` — local dev server
- `npm run typecheck` / `npm run lint` / `npm test` — individual checks
- `npm run verify` — the composite check (typecheck + lint + tests + the no-raw-logging grep). Run this before considering any task in `TASKS.md` done.

## Where to look for more

- DLT API specifics (auth, `/brands`, `/submit`, `/sync`, error codes, field limits) — see the `dlt-hosted-checkout-api` skill and the scoped steering file that loads automatically when you touch payment-related files.
- Project-specific conventions (crypto rotation pattern, rate-limit key table, CSRF scoping) — see the `payment-link-platform-conventions` skill.