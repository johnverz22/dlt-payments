# Multi-Merchant DLT Payment Link Platform

A Next.js (App Router) + TypeScript Backend-for-Frontend that lets merchants log in with their DLT credentials, generate shareable payment links, and let anonymous payors complete a Hosted Checkout payment via DLT's Collection API v4.0 — with no card data ever touching this app.

## How it works

1. **Merchant logs in** with their DLT `client_id` / `client_secret`. The app exchanges these for a `dlt_access_token` and seals both into a JWE session cookie.
2. **Merchant creates a payment link** — entering product details, amount, and optional VAT rate. The app mints a signed JWE token (containing the embedded DLT credentials) and returns a shareable URL: `/pay/<token>`.
3. **Payor opens the link** — no login required. The app fetches available payment brands from DLT and redirects the payor to DLT's Hosted Checkout page. No card data is ever submitted to this app.
4. **Payor completes payment** on DLT's domain. The app polls `/api/payment/sync` to recover the final status (`PAID` / `PENDING` / `REJECTED`) and shows the result.

## State model

There is no application database. State lives in exactly three places:

| Store | What lives there |
|---|---|
| JWE-encrypted tokens | Merchant sessions (`dlt_session` cookie) and payment link payloads (`/pay/[token]`) |
| Upstash Redis | Rate-limit counters only — no PII, no tokens, no transaction data |
| DLT | The authoritative source of truth for all payment status |

## Project structure

```
src/
├── app/
│   ├── (auth)/login/           # Merchant login page
│   ├── (dashboard)/
│   │   ├── dashboard/          # Create-link form
│   │   └── transactions/       # Transaction history (stub data)
│   ├── pay/[token]/            # Payor-facing payment page + verify poller
│   └── api/
│       ├── auth/{login,logout}
│       └── payment/{create-link,submit,sync,brands}
└── lib/
    ├── crypto.ts               # JWE encrypt/decrypt, kid-based key rotation
    ├── session.ts              # Merchant session seal/unseal
    ├── link-token.ts           # Payment link token seal/unseal
    ├── dlt-client.ts           # DLT API client (OAuth2, brands, submit, sync)
    ├── money.ts                # Decimal-string amount validation + VAT math
    ├── csrf.ts                 # Origin/Referer + double-submit cookie checks
    ├── rate-limit.ts           # Upstash Redis rate-limit helpers
    ├── logger.ts               # Structured logging — no PII or secrets ever logged
    ├── expiry.ts               # Shared token expiry check
    ├── merchant-txn-id.ts      # Unique merchant_transaction_id generator
    └── dlt-transaction-service.ts  # Transaction list stub (intentional, see below)
```

## Setup

### Prerequisites

- Node.js 20+
- An [Upstash Redis](https://upstash.com) database (free tier is fine)
- DLT merchant credentials (`client_id` + `client_secret`)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Generate secrets for JWE encryption (run once each for `LINK` and `SESSION`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Key variables:

| Variable | Description |
|---|---|
| `LINK_APP_SECRET_CURRENT` | 32-byte base64url key for payment link JWE |
| `SESSION_APP_SECRET_CURRENT` | 32-byte base64url key for session JWE (independent) |
| `NEXT_PUBLIC_APP_URL` | Full origin, e.g. `https://pay.example.com` |
| `DLT_API_BASE_URL` | DLT gateway, defaults to `https://checkout.dxp.dtic.com.ph` |
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |
| `MAX_LINK_URL_LENGTH` | Max payment link URL length (default `4096`) |

### 3. Run

```bash
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm start         # serve production build
```

## Development

```bash
npm run typecheck   # TypeScript type check
npm run lint        # ESLint
npm test            # Vitest unit tests
npm run verify      # All of the above + no-raw-logging check (run before committing)
```

`npm run verify` is the gate. It runs typecheck, lint, tests, and a grep that enforces the logging invariant (no raw `console.log`/`console.error` in route handlers).

## Key design decisions

**No `encodeURIComponent` on JWE tokens in URLs.** JWE compact serialization uses only base64url characters (`[A-Za-z0-9_-]`) and `.` separators — all URL-safe. Encoding inflates the URL with no benefit.

**`merchant_transaction_id` is immutable.** Generated once at link creation, never regenerated on retry or resubmit. This prevents duplicate charges on retries against DLT.

**`409` and `503` are never auto-retried.** `409` is a conflict (duplicate transaction), `503` is ambiguous — the correct response is to check status via `/sync`, not to resubmit.

**Amount is always a decimal string.** `"1500.00"` — never `parseFloat` or `Number()`. All money math goes through `lib/money.ts`.

**Transaction history is intentionally stubbed.** `lib/dlt-transaction-service.ts` returns dummy data. There is no transaction database and that is by design for this iteration.

## UI & Design

The application utilizes a custom modern design system built purely with **Tailwind CSS v4**. 
- It uses `@theme inline` in `src/app/globals.css` rather than a `tailwind.config.ts`.
- Components use `rounded-2xl` styling, deep interactive shadows, and custom status indicators.
- No external UI libraries (such as Shadcn, Radix, or HeadlessUI) are used. 

## Security invariants

- Secrets never logged: `client_id`, `client_secret`, `access_token`, `dlt_access_token`, decrypted JWE contents, `Authorization` headers, raw payor PII (name, email, phone, address), raw DLT request/response bodies.
- CSRF: Origin/Referer check on every state-changing POST; double-submit `x-csrf-token` additionally required on `create-link` and `submit`.
- JWE: `dir` / `A256GCM` algorithm, `kid`-based key rotation, independent secret pairs for sessions vs. links.
- Token expiry is enforced at every entry point (`/pay/[token]`, `/api/payment/brands`, `/api/payment/submit`, `/api/payment/sync`) via the shared `isTokenExpired` utility — no endpoint rolls its own check.
