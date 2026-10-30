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
- **Required product fields:** `product_name`, `product_description`, `product_reference_id` are all required at link creation (min 1 char each). API returns 400 if any are missing.
- **JWE token in URL:** place the token directly in the path segment — no `encodeURIComponent`. JWE compact serialization is pure base64url + dots, all URL-safe. `MAX_LINK_URL_LENGTH` defaults to 4096.

## PaymentLinkPayload — key fields

- `product_name`, `product_description`, `product_reference_id` — **required** strings (min 1 char).
- `vat_rate` — optional integer, basis points (e.g. `1200` = 12%). **Display-only** — never sent to DLT. Used to render a base/VAT/total breakdown on the merchant form and payor pay page. Formula: `vatCents = round(total × rate / (10000 + rate))`. Implemented in `lib/money.ts` (`computeVat`, `formatCents`).
- `labels` — optional map of custom display names for the three product fields, stamped at creation from merchant's `localStorage['dlt_payee_label_preferences']`. Payor pay page falls back to "Product / Description / Reference" if absent.

## Invariants
- **Never Log Allowlist:** `client_id`, `client_secret`, `access_token`, `dlt_access_token`, decrypted token contents, `Authorization` headers, raw payor PII, and raw DLT bodies must **never** be logged. Use `lib/logger.ts`.
- **Money:** `amount` is always a decimal string (`"1500.00"`). Validated via `/^\d{1,10}\.\d{2}$/` and integer-cents bounds check `0 < amount <= 500000.00`. Never `parseFloat`.
- **Transaction IDs:** `merchant_transaction_id` is generated once at link creation. Never regenerated on retry.

## UI & Styling Conventions
- **Tailwind v4:** The app uses Tailwind CSS v4 with `@theme inline` in `src/app/globals.css`. Do not create or look for a `tailwind.config.ts`.
- **Component Library:** There is **NO** external component library (no shadcn/ui, Radix, etc.). All UI components are hand-crafted.
- **Design Language:** Use `rounded-2xl` for cards, deep shadows (`shadow-xl shadow-slate-200/50`), and `bg-slate-50/70` for inputs with specific focus states: `focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]`. Primary CTAs should use `bg-[#0052FF] hover:bg-[#0045d8] shadow-lg shadow-blue-500/25`.
- **Status Badges & Icons:** Use glowing animated icons for terminal states (e.g., emerald for PAID, amber for EXHAUSTED/PENDING, red for REJECTED) and colored badges for table rows.

## Antigravity Workflow
- Each Phase in the task list should map to one Antigravity **implementation-plan** artifact.
- Task **8.5 (end-to-end happy path)** specifically should be run in Antigravity's Planning/browser-driving mode so it produces a **browser recording artifact** of the full login → create-link → pay → verify flow.

## Commands
- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run verify` (runs typecheck + lint + tests + no-raw-logging grep)
