---
name: payment-link-platform-conventions
description: Project-specific conventions for the Multi-Merchant DLT Payment Link Platform. Covers JWE/kid rotation pattern, which secret pair to use for sessions vs. links, the shared utility rule (isTokenExpired/logEvent/sanitizeError), the full rate-limit table, and CSRF scoping. Read this whenever working on any lib/ file, any API route, or anything that touches tokens, logging, CSRF, or rate limiting.
---

# Payment Link Platform — Conventions & Invariants

This skill captures the conventions specific to *this project's* implementation — things that aren't obvious from the DLT API reference alone but that every file in the codebase must follow. The DLT API detail lives in the `dlt-hosted-checkout-api` skill; this file is about how *we* use it.

---

## 1. JWE Encryption Scheme

**Algorithm:** `alg: "dir"`, `enc: "A256GCM"` (direct symmetric encryption).
**Keys:** base64url-encoded 32-byte random values, decoded to raw bytes before use.

### Two independent secret pairs — never share them

| Token type | Env vars |
|---|---|
| Payee session cookie (`dlt_session`) | `SESSION_APP_SECRET_CURRENT` / `SESSION_APP_SECRET_PREVIOUS` |
| Payor link token (`/pay/[token]`) | `LINK_APP_SECRET_CURRENT` / `LINK_APP_SECRET_PREVIOUS` |

Rotating one pair must never force rotating the other.

### `kid`-based rotation

- Every JWE carries a `kid` header identifying the encrypting secret.
- **Issue** with `*_CURRENT` always.
- **Decrypt:** try `CURRENT` first by `kid`; fall back to `PREVIOUS` if `kid` matches; throw if neither matches.
- Remove `PREVIOUS` once all tokens encrypted under it have naturally expired (bounded by their own `expires_at`).

### `token_version` claim

All JWE payloads include a `token_version` integer. The decrypt function must throw a distinct `UnsupportedTokenVersionError` (not silently coerce) if it doesn't match the current schema version.

---

## 2. Shared Utility Rule

> **Never hand-roll** expiry checks, logging, or error sanitization in a route handler. Always delegate to the shared lib utilities.

| Task | The ONE implementation to use |
|---|---|
| Check if a token is expired | `isTokenExpired()` from `lib/expiry.ts` |
| Log an event | `logEvent()` from `lib/logger.ts` |
| Log/surface an error | `sanitizeError()` from `lib/logger.ts` |

If you're writing `Date.now() >= payload.expires_at` in a route handler, stop — use `isTokenExpired`.
If you're writing `console.log(error)` in a catch block, stop — use `sanitizeError` then `logEvent`.

---

## 3. Rate-Limit Table

All limits are enforced via `lib/rate-limit.ts` (Upstash-backed), on top of edge/WAF volumetric protection:

| Endpoint | Limit | Key |
|---|---|---|
| `POST /api/auth/login` | 5 / 5 min | per IP |
| `POST /api/payment/create-link` | 30 / hour | per authenticated session |
| `POST /api/payment/submit` | 5 / min | per `link_id` + IP cap |
| `POST /api/payment/sync` | 20 / min | per `link_id` |
| `GET /api/payment/brands` | 20 / min | per `link_id` |

---

## 4. CSRF Scoping

**Origin/Referer check** — on every state-changing POST:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/payment/create-link`
- `POST /api/payment/submit`

**Double-submit `x-csrf-token`** — additionally required on:
- `POST /api/payment/create-link`
- `POST /api/payment/submit`

`GET /api/payment/brands` is read-only — Origin/Referer check only, no double-submit token.

Implementation: `lib/csrf.ts` — never hand-roll in a route handler.

---

## 5. Never-Log Allowlist

Policy: **allowlist-only**. A field not in this list is excluded by default.

**Allowlisted (may appear in logs):**
- `link_id`, `merchant_transaction_id`, `merchant_account_id`
- `status` (payment/transaction status values)
- Timestamps (`created_at`, `expires_at`, `request_time`)
- `method`, `path`, `response_status`
- `error_name`, `error_message`, `error_code`

**Explicitly forbidden (even though excluded by default):**
- `payor_info.*` — `first_name`, `last_name`, `email`, `phone`, any address field
- `client_id`, `client_secret`
- `access_token`, `dlt_access_token`
- Decrypted `dlt_session` or JWE plaintext contents
- `Authorization` / auth headers
- Raw DLT request/response bodies

The TypeScript type of `logEvent`'s second argument enforces this at compile time.

---

## 6. Money Invariants

- `amount` is always a **decimal string** — e.g. `"1500.00"`.
- Validated by `lib/money.ts`: regex `/^\d{1,10}\.\d{2}$/` + integer-cents bound `0 < amount <= 500000.00`.
- **Never `parseFloat`/`Number()` the canonical value** anywhere in the pipeline (form → JWE payload → DLT request).
- `formatDisplayAmount()` is the only place that converts to a number, and only for display.

---

## 7. `merchant_transaction_id` Invariants

- Generated **exactly once** at link-creation time via `generateMerchantTransactionId()` in `lib/merchant-txn-id.ts`.
- Alphabet: ASCII `[A-Za-z0-9_-]`, max 45 chars.
- **Never regenerated** on submit retry, resubmit, or any other path.
- Never accepted from the client — always recovered server-side from the decrypted link token.

---

## 8. Self-Verification

Run `npm run verify` before marking any task done. It runs:
1. `npm run typecheck` — TypeScript compiles with no errors
2. `npm run lint` — ESLint passes
3. `npm test` — Vitest passes
4. `bash scripts/check-no-raw-logging.sh` — no `console.log`/`console.error` outside `lib/logger.ts`

---

## 9. UI & Design System

- **Tailwind v4:** Configure theme variables directly in `src/app/globals.css` using `@theme inline`. There is no `tailwind.config.ts`.
- **No Component Libraries:** Do not install Shadcn, Radix, or Heroicons. Use native HTML with Tailwind classes and inline SVGs.
- **Form Controls:** Use `bg-slate-50/70 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 transition-all duration-150 outline-none focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]` for text inputs.
- **Primary Buttons:** Use `bg-[#0052FF] hover:bg-[#0045d8] rounded-xl shadow-lg shadow-blue-500/25 text-white font-semibold`.
- **Cards & Layouts:** Use `rounded-2xl` and `shadow-xl shadow-slate-200/50` to wrap main page content, with uppercase tracking section labels (`text-xs font-bold uppercase tracking-wider text-slate-500`).
