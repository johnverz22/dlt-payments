# Design Document — Multi-Merchant DLT Payment Link Platform

Status: ready for implementation
Stack: Next.js (App Router) + TypeScript, Upstash Redis (KV), no application database
Base spec: `Technical Specification v2` (provided), cross-checked against the DLT Hosted Checkout API v4.0 reference (`references/api-reference.md`) and the project's DLT integration skill (`SKILL.md`)

---

## 0. Why this document exists

The v2 spec resolved 18 review issues at the *product/security* layer, but it was written without the DLT v4.0 field-level reference open next to it. Diffing the two surfaced **one blocking architectural gap** and **several payload/field corrections** that must be fixed before implementation starts, or the agentic build will produce code that compiles but fails against the real DLT API on the first real submit call. Section 1 lists these; the rest of the document is the corrected design. Everything not called out in Section 1 carries over from the v2 spec unchanged.

---

## 1. Corrections to the v2 spec (read this first)

### 1.1 BLOCKING: `PaymentLinkPayload` is missing the credentials needed to call DLT on the payor's behalf

The payor who opens `/pay/[token]` has **no session cookie** — `dlt_session` belongs to the payee's browser, not the payor's. But `/api/payment/submit`, the new brands lookup (§1.2), and `/api/payment/sync` all need `merchant_account_id`, `service_code`, and a DLT `access_token` to call DLT. The v2 `PaymentLinkPayload` (§3.1) carries none of these.

**Fix:** at link-creation time, the server already has the payee's decrypted session (`access_token`, `merchant_account_id`, `service_code`). Embed a copy of all three directly into the JWE-encrypted `PaymentLinkPayload`. This is safe because:
- The payload is opaque to the payor — only the server can decrypt it (`LINK_APP_SECRET_CURRENT`, separate secret from the session).
- DLT's OAuth tokens are extremely long-lived (`expires_in` ≈ 1 year, no refresh token), so embedding one in a link is not materially different from embedding it in the 24h-capped session cookie — the link simply carries its own independent copy, scoped to that link's own `expires_at`.

```ts
interface PaymentLinkPayload {
  link_id: string;
  merchant_transaction_id: string;
  amount: string;
  currency: "PHP";

  // NEW — required so anonymous payor requests can call DLT server-side
  merchant_account_id: string;
  service_code: string;
  dlt_access_token: string;       // copied from the payee's session at creation time

  product_name?: string;
  product_description?: string;   // see 1.3 — treat as effectively required
  product_reference_id?: string;

  labels?: {
    product_name?: string;
    product_description?: string;
    product_reference_id?: string;
  };

  created_at: number;
  expires_at?: number;
}
```

Treat `dlt_access_token` exactly like `access_token` in the session model for logging purposes (§6.3 of the spec — never logged, never in error messages).

**Failure mode to design for:** if DLT ever rejects the embedded token with `401` (revoked client, rotated secret), the payor-facing endpoints cannot silently re-authenticate (no payee credentials are available in that request). On `401` from any DLT call made via a link token, return a distinct error — *"This payment link is temporarily unavailable — please ask the merchant for a new link"* — and log (allowlisted fields only) so the merchant can be made aware their credentials changed. Do not attempt any retry beyond the standard 401-retry-once described in §1.4.

### 1.2 MISSING FLOW: Payment brand selection (Get Payment Brands)

The v2 spec's payor journey (§4.2) goes straight from billing form to `/submit`. The real API requires two fields on Submit — `payment_brand` and `payment_brand_code` — sourced from `GET /api/v1/collection/apn/brands`, called with the merchant's Bearer token. `code` is opaque, signed, and time-sensitive: **fetch it fresh per checkout session, never cache it.**

**Fix — new route + new UI step:**
- `GET /api/payment/brands?token=<link_token>`: decrypts the link token (rejects if expired, §6.4 semantics), calls DLT `/api/v1/collection/apn/brands` using the embedded credentials, and returns `{ value, code, image, is_card }[]` to the payor's browser unmodified.
- Payor page renders a **brand picker** (cards or a grouped list: e-wallets vs. cards, split on `is_card`) before or alongside the billing form.
- The chosen `value`/`code` pair travels with the billing form submission to `/api/payment/submit` and is passed through to DLT verbatim — the server does not re-derive or validate it further than "present and non-empty" (DLT itself validates the signed `code`).
- This call is read-only (no state change) but still token-scoped: apply the same expiry check as the other token-accepting endpoints, and a light rate limit per `link_id` to prevent brand-list scraping.

### 1.3 Field corrections on Submit Payment

The v2 spec's example submit payload (§8) omits several fields that the real API needs — the SKILL.md notes DLT's server returns a `500` if `product_description` is absent even though the docs mark it optional. Reconciled request body for `/api/payment/submit`:

```json
{
  "merchant_account_id": "<from link token>",
  "service_code": "<from link token>",
  "merchant_transaction_id": "<from link token, immutable>",
  "time_offset": "+08:00",
  "channel": 4,
  "amount": "1500.00",
  "currency": "PHP",
  "payment_brand": "<from brand picker>",
  "payment_brand_code": "<from brand picker, opaque>",
  "product_name": "...",
  "product_description": "...",
  "first_name": "...",
  "last_name": "...",
  "email": "...",
  "phone": "...",
  "address_line_one": "...",
  "address_line_two": "...",
  "city_municipality": "...",
  "state_province_region": "...",
  "country_code": "PH",
  "postal_code": "...",
  "success_url": "https://[domain]/pay/[token]/verify?status=success",
  "failure_url": "https://[domain]/pay/[token]/verify?status=failure"
}
```

Corresponding fix to the payor billing form (§4.2 of the spec, which just said `billing_address` as one field): it must collect **structured** address fields — `address_line_one` (required), `address_line_two` (optional), `city_municipality` (required), `state_province_region` (required), `country_code` (required, default `PH`), `postal_code` (required) — not a single free-text address string. `time_offset` is not user input; hardcode `"+08:00"` server-side since the whole platform is PH-only (matches `currency: "PHP"`).

**Server-side, never client-authoritative:** `merchant_account_id`, `service_code`, `merchant_transaction_id`, `time_offset`, `channel` are all derived server-side from the decrypted link token / constants. The client only supplies payor identity, address, and the chosen brand.

### 1.4 Amount and ID validation limits (tightened)

- `amount`: in addition to the v2 regex `^\d{1,10}\.\d{2}$`, DLT requires `0 < amount ≤ 500000.00`. Validate the numeric bound at the same layer (compare as integer cents, not float) both at link-creation time and again at submit time.
- `merchant_transaction_id`: DLT caps this at **max 45 chars**, ASCII letters/numbers/dash/underscore only (this matches spec Open Item #3, which is now resolved — enforce it at generation, not just as a TODO).
- `product_name` max is **80** per the DLT reference (spec said 60 in the field table — DLT is more permissive, so 60 remains a safe app-level cap, no change needed, just noting the discrepancy isn't a blocker).

### 1.5 Token caching / 401 handling on outbound DLT calls

DLT's own guidance: cache the access token and retry once on a `401` by discarding the cached token and re-authenticating. In this platform, the "cache" for a payee's live dashboard session *is* `dlt_session` — no separate cache needed there. But two call sites don't have a live payee session:

- Payor-facing calls (brands, submit, sync) use the **token embedded in the link** (§1.1) — there is nothing to refresh mid-request; a `401` here is terminal for that request (see §1.1's failure mode).
- The payee's own dashboard calls to DLT (if any beyond login, e.g. a future "regenerate link" action) should reuse `dlt_session.access_token` and, on `401`, force a clean logout (`dlt_session` cleared) rather than a silent retry, since the BFF cannot fetch a new token without the payee re-entering `client_id`/`client_secret`.

### 1.6 Everything else from the v2 spec is confirmed accurate

CSRF (§6.1), rate limiting (§6.2), PII/secret logging allowlist (§6.3), token expiry enforcement (§6.4), JWE scheme (§3.3), reusable-link/idempotency handling (§3.2), money-as-string (§7.1, now with the added bound above), the polling/backoff state machine (§5), and the transaction-history stub (§7.3) all match the real DLT contract and require no changes. Carry them forward as written.

---

## 2. Architecture overview

```
┌─────────────┐        ┌──────────────────────────────────────────────┐        ┌─────────────┐
│   Payee     │        │              Next.js BFF (App Router)         │        │     DLT     │
│  (browser)  │◄──────►│                                                │◄──────►│  Hosted      │
└─────────────┘        │  /login  /dashboard  /pay/[token]  /api/*      │        │  Checkout    │
                        │                                                │        │  API v4.0    │
┌─────────────┐        │  lib/crypto.ts   (JWE, dir/A256GCM, kid rot.)  │        └─────────────┘
│   Payor     │◄──────►│  lib/session.ts  lib/csrf.ts  lib/rate-limit.ts│
│  (browser,  │        │  lib/logger.ts   lib/dlt-client.ts             │        ┌─────────────┐
│  no session)│        │  lib/dlt-transaction-service.ts (stub)         │        │  Upstash KV  │
└─────────────┘        └──────────────────────────────────────────────┘◄──────►│ (rate limit  │
                                                                                  │  counters)   │
                                                                                  └─────────────┘
```

No application database. State lives in three places only:
1. **JWE-encrypted, stateless tokens** — payment links and sessions (this is the primary store of truth for both).
2. **Upstash Redis** — rate-limit counters only (no PII, no tokens).
3. **DLT itself** — the actual payment status (`PAID`/`PENDING`/`REJECTED`), fetched live via `/sync`.

---

## 3. Data models (final, corrected)

### 3.1 `SessionPayload` (unchanged from spec §2.2)

```ts
interface SessionPayload {
  access_token: string;
  merchant_account_id: string;
  service_code: string;
  expires_at: number;   // issued_at + min(expires_in_ms, 86_400_000)
  issued_at: number;
}
```

### 3.2 `PaymentLinkPayload` (corrected — see §1.1)

```ts
interface PaymentLinkPayload {
  link_id: string;
  merchant_transaction_id: string;   // ASCII [A-Za-z0-9_-], max 45, immutable
  amount: string;                    // "1500.00", 0 < amount <= 500000.00
  currency: "PHP";

  merchant_account_id: string;
  service_code: string;
  dlt_access_token: string;          // never logged, never sent to the client

  product_name?: string;             // max 60
  product_description?: string;      // max 120 — treat as required (DLT 500s without it)
  product_reference_id?: string;     // max 40

  labels?: {
    product_name?: string;
    product_description?: string;
    product_reference_id?: string;
  };

  created_at: number;
  expires_at?: number;
}
```

### 3.3 Payor billing input (corrected — see §1.3)

```ts
interface PayorBillingDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line_one: string;
  address_line_two?: string;
  city_municipality: string;
  state_province_region: string;
  country_code: string;   // default "PH"
  postal_code: string;
}

interface PaymentBrandSelection {
  payment_brand: string;       // DLT brand "value", e.g. "GCash", "Visa"
  payment_brand_code: string;  // opaque DLT "code", pass-through only
}
```

### 3.4 `PaymentStatus`, `TransactionRecord` (unchanged from spec §7.2–7.3)

No change — carry forward as written, including the dummy-data stub decision and the corrected three-value enum (`PAID` | `PENDING` | `REJECTED`).

---

## 4. Journeys (corrected end-to-end)

### 4.1 Payee: create a link
1. Login → `dlt_session` + `csrf_token` cookies issued (spec §2.1, unchanged).
2. Dashboard "Create Payment Link" form → `POST /api/payment/create-link`.
3. Server: validates fields, generates `merchant_transaction_id` once, builds the corrected `PaymentLinkPayload` (§3.2) **including a copy of the session's `access_token`/`merchant_account_id`/`service_code`**, encrypts as JWE, measures final URL length (§3.4 of spec), returns `{ url }`.

### 4.2 Payor: pay
1. `GET /pay/[token]` — decrypt, check expiry. If already `PAID` per a prior visit... *(the app has no way to know this without calling DLT; see note below)* — render checkout form.
2. Payor page calls `GET /api/payment/brands?token=...` to populate the brand picker (§1.2). Rendered before/alongside the billing form.
3. Payor fills billing form (§3.3) + selects a brand, clicks "Pay ₱X.XX".
4. `POST /api/payment/submit` — decrypt token, check expiry, build the corrected DLT payload (§1.3), call `/submit`.
   - `200` → redirect payor's browser to `data.payment_url`.
   - `409` → "This link's payment attempt doesn't match a prior attempt" (no retry).
   - `503` → route to `/pay/[token]/verify` for reconciliation instead of resubmitting.
5. DLT hosted page → payor redirected to `success_url`/`failure_url` (both point at `/pay/[token]/verify`).
6. `/pay/[token]/verify` runs the polling state machine (spec §5, unchanged) against `POST /api/payment/sync`, which decrypts the link token to recover `merchant_transaction_id` + DLT credentials and calls DLT `/sync`.

**Known gap, explicitly accepted for this iteration:** step 4.2.1's "already completed" check only happens after a `/submit` attempt or via `/verify`; a payor who reloads `/pay/[token]` after paying, without having gone through `/verify` in that browser, will see the billing form again rather than an "already paid" screen, because there is no local record of prior payment to check against on a bare page load (checking would require calling `/sync` speculatively, which the spec's §4.2 explicitly forbids before a transaction exists). Mitigate by having `/submit` reject with a clear "already completed" message if the resubmission is a benign duplicate. This mirrors DLT's own idempotency contract (spec §3.2) — no new code path is needed. Document this in the payor UI copy (e.g. a note that says "already paid? just wait — this page will confirm it") but do not attempt to persist local paid/unpaid state outside DLT.

### 4.3 Payee: view transactions
Unchanged from spec §7.3 — dummy-data stub for this iteration, `ITransactionService` interface defined so the real thing can swap in later (no live DLT list endpoint exists in v4.0, confirmed against the reference doc).

---

## 5. Security model (carried forward, unchanged)

- **CSRF:** Origin/Referer check on all state-changing POSTs; double-submit token on `create-link` and `submit`. `GET /api/payment/brands` is read-only — Origin/Referer check only, no double-submit token required, but still rate-limited per `link_id`.
- **Rate limiting:** as spec §6.2, plus:

  | Endpoint | Limit | Key |
  |---|---|---|
  | `/api/payment/brands` | 20 requests / min | per `link_id` |

- **Logging:** allowlist-only (spec §6.3). Add `dlt_access_token` (from the link payload) to the "never logged" list alongside `access_token`.
- **Token expiry:** strict, exclusive boundary, applied uniformly to `/pay/[token]`, `/api/payment/brands`, `/api/payment/submit`, `/api/payment/sync`.
- **JWE:** `dir` / `A256GCM`, `kid`-based rotation, independent secrets for link vs. session (spec §3.3) — no change, other than the link payload now carrying more sensitive fields, which is exactly what the link secret is for.

---

## 6. Environment variables (additive)

All variables from spec §10 carry forward unchanged. No new environment variables are required — the brand-lookup and corrected submit flow use the same `DLT_API_BASE_URL` and the credentials already embedded in tokens/sessions. Confirm `DLT_API_BASE_URL` actually resolves to `https://checkout.dxp.dtic.com.ph` (the v4.0 reference's real base URL) rather than a placeholder — the original spec used an example domain.

---

## 7. Open items before/at implementation time

1. **Webhooks are out of scope for this iteration.** DLT's v4.0 reference recommends signed merchant webhooks as the authoritative status channel, with `/sync` for recovery only. This platform relies solely on `/sync` (browser-driven polling), which is explicitly supported but is *recovery-oriented*, not the primary channel DLT recommends. Acceptable for v1 given the transaction log is a stub anyway; flag as a fast-follow once a real transaction store exists (a webhook needs somewhere durable to write to).
2. Confirm the production `DLT_API_BASE_URL`.
3. Confirm final `merchant_transaction_id` generation is bounded to 45 chars and the allowed character set at the point of generation (nanoid alphabet must be restricted to `[A-Za-z0-9_-]`).
4. Confirm `MAX_LINK_URL_LENGTH` against real browsers/proxies — now more pressing, since `PaymentLinkPayload` is larger (carries an access token), so the encrypted token itself is meaningfully longer than in the original spec. Budget for this in testing (§ Tasks, "link length regression test").