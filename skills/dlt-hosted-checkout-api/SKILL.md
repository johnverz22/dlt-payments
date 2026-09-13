---
name: dlt-hosted-checkout-api
description: Integrate with the DLT Payment Collection API v4.0 — a Philippine payment gateway where ALL payment types (card and e-wallet/APN like GCash) go through DLT's own Hosted Checkout page, not a merchant-built form. Uses OAuth2 client-credentials auth (merchant-bound, not just a passed-in ID), "Submit Payment" to create a transaction and get a redirect payment_url, an authenticated "/sync" endpoint for status recovery, and signed merchant webhooks for payment status. Also supports "Quick Link" hosted checkout sessions. Use this skill whenever the user asks to integrate DLT payments, DLT Collection API v4, DXP hosted checkout, build a redirect-based checkout flow against checkout.dxp.dtic.com.ph, add GCash/card/e-wallet collection via DLT without building their own card form, verify/handle DLT signed payment webhooks, reconcile payment status via /sync, generate a Quick Link session, or write client code (any language) calling /oauth/token, /api/v1/collection/apn/brands, /api/v1/collection/apn/submit, /api/v1/collection/apn/sync, or /api/v1/quick-link/session. Also use for migrating an existing DLT integration off client-hosted card forms onto Hosted Checkout, debugging DLT API errors, or explaining the DLT v4.0 collection/status lifecycle.
---

# DLT Payment Collection API — Hosted Checkout (v4.0)
## Project implementation guide — what actually works in this codebase

This skill documents what has been **verified to work** in this Laravel app. All patterns below are drawn from `app/Services/DltPaymentService.php` and the subscription payment flow. Check `references/api-reference.md` for the full field tables; check here first for project-specific behaviour and gotchas.

---

## Orientation

| Item | Value |
|---|---|
| Base URL | `https://checkout.dxp.dtic.com.ph` (config `services.dlt.base_url`) |
| Auth | OAuth 2.0 client credentials → `POST /oauth/token` → `Bearer` on every call |
| Endpoints used | `/oauth/token`, `/api/v1/collection/apn/brands`, `/api/v1/collection/apn/submit`, `/api/v1/collection/apn/sync`, `/api/v1/quick-link/session` (both POST and GET) |
| Service class | `App\Services\DltPaymentService` (injected via constructor; `final` — cannot be Mockery-mocked in tests, use `Http::fake()` instead) |
| Config keys | `services.dlt.client_id`, `services.dlt.client_secret`, `services.dlt.merchant_account_id`, `services.dlt.service_code` |

The merchant **never handles card numbers, CVVs, or 3DS device fields** — DLT's hosted page does. Every payment type (card and e-wallet) follows the same code path: submit → get `payment_url` → redirect payor there.

---

## Authentication

### Token request

```
POST /oauth/token
Content-Type: application/json

{
    "grant_type": "client_credentials",
    "client_id": "<client_id>",
    "client_secret": "<client_secret>"
}
```

Response: `{ "token_type": "Bearer", "expires_in": 31536000, "access_token": "..." }`

### Token caching

Cache the token under key `'dlt:bearer_token'` with TTL = `expires_in - 60` seconds (minimum 60s). **Do not fetch a new token per request.**

**401 retry pattern:** if any endpoint returns HTTP 401, flush the cache (`Cache::forget('dlt:bearer_token')`), fetch a fresh token, and retry **once**. This handles token expiry between requests without error propagation. Implemented on both `/submit` and `/sync`.

### Tests

Because the token is cached in Laravel's cache store, `Http::fake()` for `/oauth/token` **will not fire** if a previous test already populated the cache. Always call `Cache::forget('dlt:bearer_token')` in `beforeEach` for any test file that uses `Http::fake` with DLT endpoints. See `.ai/rules/feature.md` for the full test isolation rule.

---

## Get Payment Brands

```
GET /api/v1/collection/apn/brands?merchant_account_id=<id>&service_code=<code>
Authorization: Bearer <token>
```

Returns an array of brand objects. Each has:

| Field | Type | Notes |
|---|---|---|
| value | String | Human-readable name, e.g. `Visa`, `GCash`. Sent as `payment_brand` on Submit. |
| code | String | **Opaque, signed, time-sensitive.** Sent as `payment_brand_code` on Submit — copy verbatim, never decode or persist. |
| image | String\|null | Logo URL |
| is_card | Boolean | `true` for card brands, `false` for e-wallets. Used to split the brand picker UI. |

**`code` is time-sensitive** — fetch brands fresh per checkout session, never long-cache the codes.

---

## Submit Payment

```
POST /api/v1/collection/apn/submit
Authorization: Bearer <token>
Content-Type: application/json
```

### Required fields (as used in this project)

| Field | Type | Notes |
|---|---|---|
| `merchant_account_id` | String | Auto-injected from config |
| `service_code` | String | Auto-injected from config |
| `merchant_transaction_id` | String, max 45 | ASCII alphanumeric, dash, underscore only. Generated per attempt. |
| `time_offset` | String | `+08:00` for PH |
| `channel` | Integer | **Must be `4` (Custom)** in this project — not `1` |
| `amount` | String | Decimal string, e.g. `"1200.00"`. **> 0, ≤ 500,000.00** |
| `currency` | String | `"PHP"` |
| `payment_brand` | String | `value` from Get Brands |
| `payment_brand_code` | String | `code` from Get Brands — copy verbatim |
| `product_name` | String, max 80 | |
| `product_description` | String, max 120 | **Required in practice** — DLT server crashes (500) if omitted, even though the docs say optional |
| `first_name`, `last_name` | String | |
| `email` | String | |
| `phone` | String\|null | |
| `address_line_one` | String, max 80 | |
| `address_line_two` | String\|null | |
| `city_municipality` | String, max 60 | |
| `state_province_region` | String, max 40 | |
| `country_code` | String | 2-letter ISO, e.g. `"PH"` |
| `postal_code` | String, max 10 | |
| `success_url` | URL | Payor browser return on completion |
| `failure_url` | URL | Payor browser return on failure |

**Do NOT send:** `is_card_payment`, card fields (`card_number`, `ccv`, etc.), or `device.*` 3DS fields — DLT rejects them in v4.0.

### Response

```json
{
    "success": true,
    "message": "Transaction ready for payment",
    "data": {
        "payment_url": "https://checkout.dxp.dtic.com.ph/...",
        "payment_status": "PENDING",
        "amount": "1200.00",
        "merchant_transaction_id": "sub00043...",
        "transaction_id": "...",
        "is_card_payment": false,
        "success_url": "...",
        "failure_url": "..."
    }
}
```

### Redirecting the payor

**Never use Livewire's `$this->redirect()` for `payment_url`** — it breaks in Firefox ("'open' called on an object that does not implement interface Window"). Always dispatch a browser event and handle with Alpine:

```php
// In Livewire component:
$this->dispatch('redirect-to-payment', url: $paymentUrl);
```

```html
<!-- In Blade template root element: -->
<div x-data x-on:redirect-to-payment.window="window.location.href = $event.detail.url">
```

### Database column for payment URL

Store `payment_url` in a `TEXT` column (not `VARCHAR(255)`) — e-wallet redirect URLs (GCash etc.) routinely exceed 500 characters.

---

## Synchronize Payment Status (`/sync`)

```
POST /api/v1/collection/apn/sync
Authorization: Bearer <token>
Content-Type: application/json

{ "merchant_transaction_id": "<your_txn_id>" }
```

**Use `merchant_transaction_id`, not `data.transaction_id`.** Pass the string generated by the merchant, not DLT's internal ID.

Response: `{ "success": true, "data": { "payment_status": "PAID|PENDING|REJECTED", ... } }`

- **`PAID` and `REJECTED` are terminal** — `/sync` never downgrades them.
- Use for recovery only, not routine polling.
- Implements 401-retry-once (same as submit).

### How `/sync` fits into the subscription flow

| Trigger | Action |
|---|---|
| `success_url` callback from DLT | Call `/sync` immediately; on PAID → activate; on REJECTED → cancel; on PENDING → dispatch `SyncPendingPaymentJob` |
| `failure_url` callback from DLT | Always REJECTED — skip `/sync`, cancel immediately |
| Admin "Activate" button (pending DLT attempt) | Call `/sync` first; on PAID → activate immediately; on PENDING → show warning modal; on REJECTED/ERROR → cancel |
| `SyncPendingPaymentJob` (background, exponential backoff) | Polls with backoff: 1/5/15/30/60 min, max 5 attempts; on give-up → email admin via `PaymentStuckAdminNotification` |
| Seller returns to payment page (stale pending attempt on mount) | Call `/sync`; on PAID → activate; on REJECTED → allow fresh start; on PENDING → show `sync_pending` step |

---

## Error handling

All endpoints return `{ success, message, data }` on success and `{ success: false, message }` or `{ success: false, errors: [...] }` on failure. Branch on `success` first:

```php
private function throwIfFailed(Response $response): void
{
    if ($response->successful() && $response->json('success') === true) {
        return;
    }
    if ($errors = $response->json('errors')) {
        throw new RuntimeException('DLT validation error: ' . json_encode($errors));
    }
    throw new RuntimeException('DLT request failed: ' . ($response->json('message') ?? $response->body()));
}
```

**Never auto-resubmit on HTTP 503 `SUBMISSION_UNKNOWN` or HTTP 409 `TRANSACTION_REFERENCE_CONFLICT`** — use `/sync` to check the actual status instead.

---

## Quick Link (implemented but not used for subscriptions)

```
POST /api/v1/quick-link/session   → create a hosted-checkout link session
GET  /api/v1/quick-link/session?token=<token>  → read back
```

Session token expires in **30 minutes**. The actual checkout URL is **not** `data.website` (that's the merchant's own site). Build it as:

```
https://checkout-ql.dltc.com.ph/?merchant=<merchant_account_id>&transaction_id=<merchant_transaction_id>&amount=<amount>&quantity=1
```

`product_description` is required even though the docs say optional — same issue as Submit Payment.

---

## Webhook (not implemented in this project)

Configured separately in DLT Web Integration (test and live URLs). Not used — this project relies on `success_url`/`failure_url` callbacks + `/sync` for status reconciliation. If you add webhooks, signature verification is mandatory:

1. `HMAC-SHA256("<X-DLT-Timestamp>.<raw body>", signingSecret)` → `sha256=<hex>`
2. Compare to `X-DLT-Signature` in constant time
3. Reject stale timestamps (e.g. > 5 min)
4. Deduplicate by `X-DLT-Event-Id`

---

## Config reference

```php
// config/services.php
'dlt' => [
    'base_url'           => env('DLT_BASE_URL', 'https://checkout.dxp.dtic.com.ph'),
    'client_id'          => env('DLT_CLIENT_ID'),
    'client_secret'      => env('DLT_CLIENT_SECRET'),
    'merchant_account_id'=> env('DLT_MERCHANT_ACCOUNT_ID'),
    'service_code'       => env('DLT_SERVICE_CODE', 'APN-COLLECTION'),
],
```

## Testing

`DltPaymentService` is `final` — **Mockery cannot mock it**. Use `Http::fake()` instead.

```php
Http::fake([
    '*/oauth/token' => Http::response(['access_token' => 'fake-token', 'expires_in' => 3600]),
    '*/api/v1/collection/apn/sync' => Http::response(['success' => true, 'data' => ['payment_status' => 'PAID']]),
]);
```

**Never set `Http::fake` in `beforeEach` AND also in individual test functions for the same URL pattern** — the stacking behaviour is unreliable; prefer per-test-only fakes. Always call `Cache::forget('dlt:bearer_token')` in `beforeEach`.
