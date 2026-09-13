# Technical Specification v2: Multi-Merchant DLT Payment Link Platform

A Next.js + TypeScript Backend-for-Frontend (BFF) payment link application integrating with the DLT Hosted Checkout API (Channel 4). Core payment/link metadata is stateless (encrypted JWE tokens); a small amount of purpose-built infrastructure (KV store) is used for sessions, CSRF, and rate limiting rather than a full application database. Transaction history is served from a static dummy-data stub for this iteration (see §7.3).

**Revision note:** This is a full revision of the original v1 spec, resolving 18 issues identified in review (concurrency, credential handling, CSRF, rate limiting, money representation, logging, cryptography, token validation, polling, expiry enforcement, and transaction history). Decisions and rationale are documented inline where they diverge from v1.

---

## 1. Visual System & Color Palette

Unchanged from v1.

| Token | Hex / Value | Tailwind Reference | Usage |
| --- | --- | --- | --- |
| **Primary Brand** | `#012FFF` | `bg-[#012fff]` | Buttons, active states, key focus rings, primary branding |
| **Primary Hover** | `#0026DB` | `hover:bg-[#0026db]` | Primary button hover state |
| **Primary Active** | `#001EC2` | `active:bg-[#001ec2]` | Button press state |
| **Primary Subtle** | `#E6EBFF` | `bg-[#e6ebff]` | Selected item backgrounds, badge backgrounds, light highlights |
| **Background** | `#F8FAFC` | `bg-slate-50` | Main application canvas background |
| **Card / Surface** | `#FFFFFF` | `bg-white` | Form cards, dashboard containers, modals |
| **Border / Divider** | `#E2E8F0` | `border-slate-200` | Input borders, card outlines, table borders |
| **Foreground Text** | `#0F172A` | `text-slate-900` | Primary headings, body copy, active labels |
| **Muted Text** | `#64748B` | `text-slate-500` | Subtitles, helper text, form field descriptions |
| **Success Status** | `#10B981` | `text-emerald-500` | Paid badges, transaction success alerts |
| **Error Status** | `#EF4444` | `text-red-500` | Validation errors, payment failure alerts |

---

## 2. Authentication & Session Architecture

### 2.1 Login Flow

1. **Payee Login Input** (`/login`): payee submits `client_id`, `client_secret`, `merchant_account_id`, `service_code`.
2. **`POST /api/auth/login`**: server exchanges `client_id` + `client_secret` for a DLT OAuth **access token** via DLT's `/token` endpoint. DLT does not issue a `refresh_token`.
   - **`client_id` and `client_secret` are used once, at this exchange, and are never persisted anywhere** — not in the session cookie, not in logs, not in memory beyond the request lifecycle.
   - Success (`200 OK` from DLT): server builds a `SessionPayload` (below), encrypts it as a JWE, and sets it as an HTTP-only, `Secure`, `SameSite=Lax` cookie (`dlt_session`).
   - Failure: server distinguishes failure modes rather than collapsing everything to "invalid credentials" (see §2.4).
3. **Session Management**: all authenticated route handlers decrypt `dlt_session` to get `access_token`, `merchant_account_id`, `service_code` for calls to DLT.

### 2.2 Session Payload (JWE-encrypted cookie contents)

```ts
interface SessionPayload {
  access_token: string;
  merchant_account_id: string;
  service_code: string;     // required for /brands and /submit calls
  expires_at: number;       // Unix timestamp (ms) — set to issued_at + min(token TTL, 24h)
  issued_at: number;
}
```

- Only `access_token`, `merchant_account_id`, and `service_code` are carried forward. This is a materially smaller blast radius than a permanent `client_secret`, since these are scoped/expiring credentials rather than the merchant's root secret.
- **DLT's `/token` response does not include a `refresh_token`** — confirmed from the API reference (`token_type`, `expires_in`, `access_token` only). Silent refresh is not possible. When the session expires the payee must fully re-authenticate (re-enter `client_id`/`client_secret`).
- **DLT token TTL is very long** (`expires_in: 31536000` = ~1 year). The cookie `Max-Age` must **not** mirror this blindly — cap it at 24 hours. Set `expires_at = issued_at + min(expires_in_ms, 86_400_000)`. This bounds session lifetime to a reasonable window without requiring daily re-authentication in normal use.
- Cookie `SameSite=Lax`, `Secure`, `HttpOnly`.

### 2.3 Session Encryption

Session cookies use the same JWE scheme defined in §3.3, with their own independent secret (`SESSION_APP_SECRET`, not shared with the link-token secret) so that rotating one does not force rotating the other.

### 2.4 Login Failure Handling

`POST /api/auth/login` must distinguish failure causes rather than returning a single generic error:

| DLT response | App-facing result |
|---|---|
| `401` / `403` | "Invalid DLT credentials" |
| `429` | "Rate limited — try again shortly" |
| `5xx` / timeout | "DLT is currently unavailable — try again later" |
| Network failure (no response) | "Unable to reach DLT — try again later" |

This prevents a temporary DLT outage from being misreported to the merchant as a credentials problem.

---

## 3. Stateless Link Token & Security Architecture

### 3.1 Payment Link Payload

```ts
interface PaymentLinkPayload {
  link_id: string;                  // Autogenerated unique ID (nanoid)
  merchant_transaction_id: string;  // Generated ONCE at link creation. Immutable. See §3.2.
  amount: string;                   // Decimal string, e.g. "1500.00". See §7.1.
  currency: "PHP";

  product_name?: string;            // Max 60 chars
  product_description?: string;     // Max 120 chars (DLT /submit field limit)
  product_reference_id?: string;    // Max 40 chars

  labels?: {
    product_name?: string;          // Max 30 chars
    product_description?: string;   // Max 30 chars
    product_reference_id?: string;  // Max 30 chars
  };

  created_at: number;               // Unix timestamp (ms)
  expires_at?: number;              // Unix timestamp (ms), exclusive (see §7.4)
}
```

### 3.2 Reusable Link Mechanics (resolved — was Issue 1)

**Decision:** each payment link is **single-use at the transaction level**. `merchant_transaction_id` is generated exactly once, at link-creation time, and embedded immutably in the JWE. It is never regenerated on submission or retry.

- All submissions/retries originating from a given link use the **same** `merchant_transaction_id`.
- This aligns with DLT's documented idempotency behavior:
  - Same `merchant_transaction_id` + same request fingerprint → replays the already-accepted result.
  - Same `merchant_transaction_id` + different request content → `409 TRANSACTION_REFERENCE_CONFLICT`.
  - Ambiguous outcome → `503 SUBMISSION_UNKNOWN`.
- **`/api/payment/submit` must never auto-resubmit on `409` or `503`.** These are surfaced to the client distinctly:
  - `409` → "This link's payment attempt doesn't match a prior attempt" (do not retry with different data under the same ID).
  - `503` → route the user to verification (`/sync`) rather than resubmitting; DLT explicitly warns that blind retries risk duplicate charges.
- A successful (`PAID`) transaction permanently consumes the link. Once terminal, `/pay/[token]` renders the "already completed" view rather than a checkout form.

### 3.3 JWE Cryptographic Scheme (resolved — was Issue 12)

- **Algorithm:** `alg: "dir"`, `enc: "A256GCM"` (direct symmetric encryption — no key wrapping). Chosen for simplicity and minimal token size, since the key never leaves the server and per-token key isolation isn't needed here.
- **Key format:** secrets are base64url-encoded 32-byte random values:
  ```
  crypto.randomBytes(32).toString('base64url')
  ```
  decoded to raw bytes before use as the AES-256-GCM key. (The placeholder `a_secure_32_byte_random_string_here` from v1 was ambiguous about byte-length vs. character-length; this format removes that ambiguity.)
- **Separate secrets** for link tokens and session cookies: `LINK_APP_SECRET_CURRENT` / `LINK_APP_SECRET_PREVIOUS`, `SESSION_APP_SECRET_CURRENT` / `SESSION_APP_SECRET_PREVIOUS`.
- **Rotation:** every JWE carries a `kid` header identifying which secret encrypted it.
  - New tokens are always issued with `*_CURRENT`.
  - Decryption tries `CURRENT` first by `kid`, falls back to `PREVIOUS` if present and matching, fails otherwise.
  - `PREVIOUS` is removed once all tokens issued under it have naturally expired (bounded by each token's own `expires_at`).
- **Additional claims:**
  - `kid` — key/version identifier (JWE header)
  - `iat` — issued-at (JWE header, standard claim)
  - `token_version` — payload schema version, so future shape changes can be detected on decrypt rather than causing a hard failure

### 3.4 Final Token-Length Validation (resolved — was Issue 13)

- Per-field max-length limits (as in §3.1) remain as fast, cheap first-pass validation/UX feedback.
- **Authoritative check:** after building and encrypting the complete `PaymentLinkPayload`, construct the final `https://[domain]/pay/[token]` string and measure its actual length.
- Define `MAX_LINK_URL_LENGTH` (e.g., `2000`, leaving headroom under the practical ~2048-character boundary).
- If exceeded, `POST /api/payment/create-link` is rejected with a `4xx` and a clear message (e.g., "Link content is too long — shorten the product description or labels and try again").
- Per-field limits are advisory only; the final measured length is the only guarantee.

---

## 4. User Journeys & UI Components

### 4.1 Payee Dashboard (`/dashboard`)

```text
PAYEE DASHBOARD
 ├── Header (Merchant Account ID, Settings Drawer Trigger, Logout)
 ├── Tab 1: Create Payment Link
 │    ├── Link Metadata Form (Amount, Product Name, Description, Reference ID)
 │    ├── Label Configuration Trigger ("Customize Labels for Payor View")
 │    └── Generated Link Output Card (Copy URL, View QR Code)
 └── Tab 2: Transactions Log
      ├── Filters (status, date range — applied client-side over stub data for this iteration)
      └── Data Table (paginated, backed by dummy-data stub — see §7.3)
```

- **Local Storage Label Management**: unchanged — payees define default UI label overrides stored in `window.localStorage['dlt_payee_label_preferences']`.
- **Token Length Validation**: see §3.4.

### 4.2 Payor Interface (`/pay/[token]`)

```text
PAYOR PAGE LOAD
 ├── Decrypt JWE Token
 │    ├── Decryption Failure / Expired ──► Render 404 / Invalid Link View
 │    └── Decryption Success
 └── Render Payor Checkout Form
      └── (no /sync call here — transaction does not exist until /submit is called)
```

- **`/sync` is NOT called on initial page load.** DLT's `/sync` requires the transaction to already exist; calling it before `/submit` will return an error because there is no transaction yet. The payor simply sees the billing form.
- The "already completed" state is handled on `/pay/[token]/verify` after DLT redirects back (§5), not on initial load.
- **Payor Billing Form** fields unchanged: `first_name`, `last_name`, `email`, `phone`, `billing_address` (all required).
- **Action:** "Pay ₱X.XX" posts the billing payload to `/api/payment/submit`, which returns `data.payment_url` from DLT Channel 4 and performs a redirect.
- **Expiry enforcement:** `/pay/[token]` rejects expired tokens per §7.4 (strict, no exceptions).

---

## 5. Polling & Real-Time Sync Strategy (resolved — was Issue 7)

DLT redirects the browser back to `/pay/[token]/verify?status=success|failure` after Hosted Checkout. **This query parameter is a non-authoritative hint only** — it may influence which loading state renders first, but is never treated as proof of payment.

### 5.1 Transaction ID Recovery (resolved — was Issue 5/6)

`/pay/[token]/verify` re-decrypts `[token]` server-side to recover the immutable `merchant_transaction_id` (§3.2). The transaction ID is **never** taken from a client-supplied query parameter or trusted client input.

### 5.2 Client Polling State Machine

```text
[Mount /verify page]
         │
         ▼
Trigger /api/payment/sync ──► POST DLT /api/v1/collection/apn/sync { merchant_transaction_id }
         │
 ┌───────┴──────────────────────────────┐
 ▼                                      ▼
data.payment_status: PAID / REJECTED   data.payment_status: PENDING
 │                                      │
 ▼                                      ▼
Stop polling (terminal)             Retry? (attempt count < 6)
Update UI immediately                    ├── YES: wait backoff, re-poll
                                          └── NO:  render "Verification Delayed" + manual retry
```

- **Attempts:** 1 immediate + 5 retries = 6 total calls.
- **Backoff:** `1s, 2s, 4s, 8s, 16s`, with **full jitter** applied to each interval (e.g., `delay = Math.random() * base_delay`) to avoid many clients hitting `/sync` at the same moments.
- **Hard ceiling:** 60 seconds total wall-clock duration, independent of attempt count.
- **On exhaustion:** render "Verification Delayed" with a manual retry button.
- **Manual retry:** triggers a single immediate `/sync` call — does not restart the backoff sequence. Debounce the button (disable briefly after each press) to avoid rapid-click abuse.
- **Status values:** `PAID` and `REJECTED` are terminal per DLT's contract (DLT guarantees `/sync` will not downgrade a terminal status back to `PENDING`). There is no `NOT_FOUND` value from this endpoint — the v1 spec's enum was incorrect and has been corrected throughout (§8).

---

## 6. Security Cross-Cutting Concerns

### 6.1 CSRF Protection (resolved — was Issue 9)

**All state-changing POST endpoints** (`/api/auth/login`, `/api/auth/logout`, `/api/payment/create-link`, `/api/payment/submit`):
- Validate `Origin` header against the app's own domain (fall back to `Referer` if `Origin` is absent; reject if both are missing or mismatched).

**`/api/payment/create-link` and `/api/payment/submit`** additionally require:
- A double-submit CSRF token: a cryptographically random token (32 bytes, base64url) issued in a readable, non-HttpOnly, `SameSite=Lax`, `Secure` cookie (`csrf_token`) when the session is created.
- The frontend echoes this token back as a request header (`x-csrf-token`) on these two calls.
- The server rejects the request if the header doesn't match the cookie.
- The CSRF token is rotated whenever the session is rotated/re-issued.

### 6.2 Rate Limiting (resolved — was Issue 17)

**Layered:**
- **Outer layer:** edge/platform-level rate limiting (e.g., Vercel Firewall or a fronting CDN/WAF) for coarse IP-based volumetric protection across all routes. Documented as a deployment requirement, not application code.
- **Inner layer:** a lightweight serverless KV store (e.g., Upstash Redis + `@upstash/ratelimit`) for fine-grained, business-aware limits.

| Endpoint | Limit | Key |
|---|---|---|
| `/api/auth/login` | 5 attempts / 5 min | per IP; consider lockout after repeated failures per attempted `client_id` |
| `/api/payment/submit` | 5 attempts / min | per `link_id`, plus a per-IP cap |
| `/api/payment/sync` | 20 requests / min | per `link_id` |
| `/api/payment/create-link` | 30 / hour | per authenticated session |

**Note:** introducing this KV store means "database-free" is redefined as "no relational/application database" rather than "zero external state" — the same redefinition already accepted for session handling.

### 6.3 PII / Secret Logging Rules (resolved — was Issue 18)

**Policy: allowlist-only logging.** Nothing is logged unless explicitly permitted; a new field added later is excluded by default until deliberately allowlisted.

**Allowlisted:**
- `link_id`, `merchant_transaction_id`, `merchant_account_id`
- `status` (payment/transaction status values)
- Timestamps (`created_at`, `expires_at`, request time)
- HTTP method, path, response status code
- Sanitized error name/message/code

**Never logged (explicit, even though excluded by default):**
- `payor_info.*` (`first_name`, `last_name`, `email`, `phone`, `billing_address`)
- `client_id`, `client_secret`
- `access_token`
- Decrypted `dlt_session` contents
- Decrypted JWE plaintext payloads
- `Authorization` / any auth headers
- Raw request/response bodies to/from DLT

**Implementation requirement:** a dedicated `lib/logger.ts` exposing a typed `logEvent(eventName, allowedFields)` function is the only sanctioned logging path — no raw `console.log`/`console.error` scattered through route handlers. All `catch` blocks log a sanitized summary (`error.name`, `error.message`, HTTP status) via a shared `sanitizeError()` utility, never the raw error/response object.

### 6.4 Token Expiry Enforcement (resolved — was Issue 11)

**Strict enforcement everywhere, no exceptions.** Every endpoint that accepts a token independently validates `expires_at`:

- `GET /pay/[token]`
- `POST /api/payment/submit`
- `GET /api/payment/sync`

**Boundary semantics:** `expires_at` is exclusive — `current_time >= expires_at` ⇒ expired. Implemented once as a shared `isTokenExpired(payload): boolean` utility used by all three routes.

**Accepted tradeoff:** a payor who completes payment on DLT's Hosted Checkout just before `expires_at`, with the redirect landing after expiry, will receive an "expired" response from `/sync` even if payment succeeded. This is an intentional simplicity/security tradeoff; `expires_at` should be set with buffer past the expected checkout+redirect duration to make this rare in practice.

---

## 7. Data Contracts

### 7.1 Money Representation (resolved — was Issue 10)

```ts
amount: string; // e.g. "1500.00" — validated against /^\d{1,10}\.\d{2}$/
```

- DLT's API accepts decimal strings (e.g., `"1500.00"`) directly — confirmed, no minor-unit conversion needed.
- Validated strictly on input with a regex; never passed through `parseFloat`/`Number()` anywhere in the pipeline (form → JWE payload → DLT request → display).
- Display formatting (thousands separators, currency symbol) is done via string manipulation or `Intl.NumberFormat` applied only at render time — never used as the canonical stored value.

### 7.2 Transaction Status Enum (corrected — see §8)

```ts
type PaymentStatus = "PAID" | "PENDING" | "REJECTED";
```

Replaces v1's incorrect `"SUCCESS" | "PENDING" | "REJECTED" | "NOT_FOUND"` used in `GET /api/payment/sync` output, `TransactionRecord.status`, and `TransactionFilterParams.status`.

### 7.3 Transaction Service (stub — dummy data)

```ts
export interface TransactionRecord {
  id: string;
  merchant_transaction_id: string;
  amount: string;                // decimal string, see §7.1
  currency: "PHP";
  status: PaymentStatus;
  product_name?: string;
  payor_name?: string;
  created_at: string;
}

export interface TransactionFilterParams {
  startDate?: string;
  endDate?: string;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface ITransactionService {
  getTransactions(params: TransactionFilterParams): Promise<{
    data: TransactionRecord[];
    total: number;
  }>;
}
```

- **For this iteration, `ITransactionService` is backed by a static dummy-data implementation** (`lib/dlt-transaction-service.ts` returns hardcoded `TransactionRecord[]`). The interface is defined now so the real implementation can be swapped in later without touching consumers.
- The Transactions Log tab renders against this stub — filters and pagination operate client-side over the static dataset.
- **Why not live DLT data:** DLT's v4.0 API reference does not document a transaction-history/list endpoint. When/if DLT exposes one, confirm its URL, supported filters, pagination style (offset/limit vs. cursor), max page size, and rate limits before replacing the stub.
- The dummy dataset should include at least one record of each status (`PAID`, `PENDING`, `REJECTED`) and vary amounts and dates enough to exercise filter UI.

### 7.4 Session Payload

See §2.2.

---

## 8. API Route Handlers & Integration Contracts

### `POST /api/auth/login`
- **Input:** `{ client_id, client_secret, merchant_account_id, service_code }`
- **Process:** exchanges credentials for a DLT access token via `/token`. `client_secret`/`client_id` discarded after this call — never persisted.
- **Output:** sets encrypted `dlt_session` cookie (§2.2) and `csrf_token` cookie (§6.1) on success. Distinguishes failure modes per §2.4.
- **Protections:** Origin/Referer check, rate limited (§6.2).

### `POST /api/auth/logout`
- Clears `dlt_session` and `csrf_token` cookies.
- **Protections:** Origin/Referer check.

### `POST /api/payment/create-link`
- **Input:** payload matching `PaymentLinkPayload` (minus `merchant_transaction_id`, generated server-side) + custom labels.
- **Process:**
  1. Validate per-field lengths.
  2. Generate `merchant_transaction_id` (immutable, §3.2).
  3. Build `PaymentLinkPayload`, encrypt as JWE (§3.3).
  4. Measure final URL length; reject if over `MAX_LINK_URL_LENGTH` (§3.4).
- **Output:** `{ url: "https://[domain]/pay/[token]" }`
- **Protections:** Origin/Referer check + double-submit CSRF token, rate limited (§6.2).

### `POST /api/payment/submit`
- **Input:** `{ token: string, payor_info: PayorBillingDetails }`
- **Process:**
  1. Decrypt `token`; reject if expired (§6.4).
  2. Use the token's existing immutable `merchant_transaction_id` — **never generate a new one here.**
  3. Construct DLT Channel 4 request:
     ```json
     {
       "merchant_account_id": "...",
       "service_code": "...",
       "merchant_transaction_id": "<from token>",
       "amount": "1500.00",
       "currency": "PHP",
       "channel": 4,
       "success_url": "https://[domain]/pay/[token]/verify?status=success",
       "failure_url": "https://[domain]/pay/[token]/verify?status=failure",
       "payor": { ... }
     }
     ```
  4. Call DLT `/submit`. Handle `409 TRANSACTION_REFERENCE_CONFLICT` and `503 SUBMISSION_UNKNOWN` explicitly (§3.2) — never auto-resubmit.
- **Output:** `{ payment_url: data.payment_url }` on success; distinct error shapes for `409`/`503`.
- **Protections:** Origin/Referer check + double-submit CSRF token, expiry check, rate limited per `link_id` (§6.2).

### `POST /api/payment/sync`
- **Input:** `token` (from `/pay/[token]/verify`'s route context — not a client-supplied transaction ID).
- **Process:**
  1. Decrypt `token`; reject if expired (§6.4, strict — no exception for in-flight payments).
  2. Recover `merchant_transaction_id` from the decrypted payload.
  3. Call DLT `POST /api/v1/collection/apn/sync { merchant_transaction_id }` with the merchant's bearer access token.
- **Output:** `{ status: "PAID" | "PENDING" | "REJECTED", provider_message?: string, timestamp: string }`
- **Protections:** Origin/Referer check, rate limited per `link_id` (§6.2). `PAID`/`REJECTED` are terminal per DLT's contract.

### `GET /api/transactions`
- **Input:** `TransactionFilterParams` (§7.3), scoped to the authenticated session's `merchant_account_id`.
- **Process:** calls the `ITransactionService` implementation (currently the dummy-data stub — see §7.3); filters and paginates in memory.
- **Output:** `{ data: TransactionRecord[], total: number }`

---

## 9. Directory Structure

```text
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     # Redirects to /login or /dashboard
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Session barrier check
│   │   ├── dashboard/page.tsx       # Link generator & label settings
│   │   └── transactions/page.tsx    # Transaction view (live DLT data)
│   ├── pay/
│   │   └── [token]/
│   │       ├── page.tsx             # Payor billing form / status check
│   │       └── verify/page.tsx      # Polling landing page after DLT return
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   └── logout/route.ts
│       ├── payment/
│       │   ├── create-link/route.ts
│       │   ├── submit/route.ts
│       │   └── sync/route.ts
│       └── transactions/route.ts
├── components/
│   ├── ui/                          # shadcn/ui components customized with #012fff
│   ├── forms/
│   │   ├── link-create-form.tsx
│   │   ├── label-settings-modal.tsx
│   │   └── payor-billing-form.tsx
│   └── tables/
│       └── transactions-table.tsx
├── lib/
│   ├── crypto.ts                    # JWE encryption/decryption utilities (dir/A256GCM, kid rotation)
│   ├── session.ts                   # Session cookie encryption/decryption
│   ├── csrf.ts                      # Double-submit CSRF token issuance/validation
│   ├── rate-limit.ts                # Upstash-backed rate limiting per endpoint
│   ├── logger.ts                    # Allowlist-only structured logging (§6.3)
│   ├── dlt-client.ts                # Server-side HTTP wrapper for DLT API
│   └── dlt-transaction-service.ts   # Live ITransactionService implementation backed by DLT
```

---

## 10. Environment Variables

```env
# Link token encryption (dir/A256GCM, base64url 32 bytes)
LINK_APP_SECRET_CURRENT=<base64url-encoded 32 random bytes>
LINK_APP_SECRET_PREVIOUS=<base64url-encoded 32 random bytes>   # optional, rotation window only

# Session cookie encryption (independent from link secret)
SESSION_APP_SECRET_CURRENT=<base64url-encoded 32 random bytes>
SESSION_APP_SECRET_PREVIOUS=<base64url-encoded 32 random bytes> # optional, rotation window only

# Base URL of the Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# DLT API Endpoint Gateway
DLT_API_BASE_URL=https://api.dlt.example.com/v4.0

# Rate limiting / KV store
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Link token size guard
MAX_LINK_URL_LENGTH=2000
```

---

## 11. Open Items to Confirm Before Implementation

These are explicitly flagged rather than assumed, since they depend on DLT documentation/behavior not yet fully confirmed in this spec process:

1. ~~Does DLT's `/token` OAuth response include `expires_in` and a `refresh_token`?~~ **Resolved:** DLT returns `expires_in` but no `refresh_token`. Session TTL is capped at 24h regardless of the token TTL (§2.2).
2. ~~Exact contract for DLT's transaction-history/list endpoint.~~ **Resolved:** DLT v4.0 does not document a transaction-history endpoint. Transaction log uses a dummy-data stub for this iteration (§7.3).
3. Confirm `merchant_transaction_id` character constraints match DLT's documented limit (ASCII letters/numbers/dash/underscore, max 45) at generation time (§3.2).
4. Confirm final `MAX_LINK_URL_LENGTH` value against real-world testing across target browsers/proxies (§3.4).

---

## Summary of Resolved Issues (vs. v1 spec)

| # | Issue | Resolution |
|---|---|---|
| 1 | Duplicate/concurrent payments on reusable links | `merchant_transaction_id` generated once at link creation, immutable; relies on DLT idempotency/409 behavior |
| 2 | Public payor flow authenticating to DLT | Option C1: Next.js BFF holds merchant credentials server-side; payor never touches DLT directly |
| 3 | (merged into #2) | — |
| 4 | Transaction log has no real data source | Live DLT transaction-history endpoint; no local storage |
| 5 | `/sync` lookup ambiguity (prefix matching) | Exact `merchant_transaction_id` recovered server-side from token, never client-supplied |
| 6 | Redirect URL inconsistency / trusting `status=` param | Query param is a non-authoritative hint only; `/sync` is authoritative |
| 7 | Polling timing/jitter undefined | 6 attempts, defined backoff + full jitter, 60s hard ceiling |
| 8 | Permanent credentials in session cookie | Only access token + merchant_account_id + service_code persisted; client_secret discarded after login |
| 9 | CSRF protection undefined | Origin/Referer everywhere; double-submit token on create-link/submit |
| 10 | `amount: number` float risk | `amount: string`, strictly validated, never parsed as float |
| 11 | Token expiry not enforced on all endpoints | Strict enforcement on all three token-accepting endpoints |
| 12 | JWE algorithm/key format underspecified | `dir`/`A256GCM`, base64url 32-byte keys, `kid`-based rotation |
| 13 | Token-length "guarantee" not actually guaranteed | Authoritative post-encryption length check |
| 14 | Reusable link state semantics incomplete | Resolved via #1 — link is single-use at the transaction level |
| 15 | "PAID" status scoped incorrectly to link_id | Resolved via #1/#5 — status is scoped to the immutable transaction ID |
| 16 | Login failures collapsed to one error message | Distinguishes 401/403, 429, 5xx/timeout, network failure |
| 17 | No rate limiting | Edge-level + Upstash-backed limits per endpoint |
| 18 | No PII/secret logging policy | Allowlist-only logging, sanitized error handling |