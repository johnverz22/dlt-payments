<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- NEXT-AGENTS-MD-END -->

# Multi-Merchant DLT Payment Link Platform

## Architecture Summary
Next.js (App Router) + TypeScript Backend-for-Frontend (BFF).
State lives in three places only:
1. **Stateless JWE-encrypted tokens** (sessions and payment links). No application database.
2. **Upstash Redis** for rate-limit counters only.
3. **DLT itself** for payment status (fetched via `/sync`).

## Directory Map
```
lib/crypto.ts, session.ts, link-token.ts, expiry.ts, csrf.ts, rate-limit.ts,
    logger.ts, money.ts, merchant-txn-id.ts, dlt-client.ts, dlt-transaction-service.ts
app/(auth)/login, app/(dashboard)/{dashboard,transactions}, app/pay/[token]/{page,verify}
app/api/auth/{login,logout}, app/api/payment/{create-link,submit,sync,brands}, app/api/transactions
```

## DLT Integration Rules
- **Embedded Credentials:** The payor who opens `/pay/[token]` has no session. To allow server-side calls on their behalf, `merchant_account_id`, `service_code`, and `dlt_access_token` are embedded into the `PaymentLinkPayload` at creation.
- **Brands Step:** Must call `GET /api/v1/collection/apn/brands` with the embedded credentials to present brand choices before submit.
- **409 / 503:** NEVER auto-resubmit on `409` (conflict) or `503` (ambiguous). 503 means check status via `/sync`.

## Invariants
- **Never Log Allowlist:** `client_id`, `client_secret`, `access_token`, `dlt_access_token`, decrypted token contents, `Authorization` headers, raw payor PII, and raw DLT bodies must **never** be logged. Use `lib/logger.ts`.
- **Money:** `amount` is always a decimal string (`"1500.00"`). Validated via `/^\d{1,10}\.\d{2}$/` and integer-cents bounds check `0 < amount <= 500000.00`. Never `parseFloat`.
- **Transaction IDs:** `merchant_transaction_id` is generated once at link creation. Never regenerated on retry.

## Antigravity Workflow
- Each Phase in the task list should map to one Antigravity **implementation-plan** artifact.
- Task **8.5 (end-to-end happy path)** specifically should be run in Antigravity's Planning/browser-driving mode so it produces a **browser recording artifact** of the full login → create-link → pay → verify flow.

## Commands
- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run verify` (runs typecheck + lint + tests + no-raw-logging grep)
