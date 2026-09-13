# DLT Payment Collection API — Reference (v4.0, published 09/01/2026)

Source: DLT Payment API Documentation, Collection API 4.0.

**This version is DLT Hosted Checkout only.** Unlike earlier versions, there is no merchant-hosted card form and no `is_card_payment: true` branch that accepts card fields — DLT rejects raw card data outright. Every payment type (card and e-wallet/APN) is collected on a DLT-hosted page reached via `payment_url`.

## Table of Contents
1. [Authentication](#authentication)
2. [Get Payment Brands](#get-payment-brands)
3. [Submit Payment](#submit-payment)
4. [Collection API Journey](#collection-api-journey)
5. [Synchronize Payment Status](#synchronize-payment-status)
6. [Payment Status and Duplicate Requests](#payment-status-and-duplicate-requests)
7. [Payor Return and DLT Payment Status](#payor-return-and-dlt-payment-status)
8. [Merchant Payment Status Webhook](#merchant-payment-status-webhook)
9. [Quick Link Checkout Flow](#quick-link-checkout-flow)
10. [Create Quick Link Session](#create-quick-link-session)
11. [Get Quick Link Session](#get-quick-link-session)
12. [Response Payload Shapes](#response-payload-shapes)
13. [Data Tables](#data-tables)
14. [Version History](#version-history)

---

## Authentication

OAuth 2.0 Client Credentials Grant. All protected endpoints require `Authorization: Bearer <access_token>`.

**Critical trust model change in v4.0:** DLT maps each confidential machine client to exactly **one** merchant account. `merchant_account_id` sent in a request is only a **compatibility assertion** — DLT does not trust it as the source of authority. The actual merchant is derived from the OAuth token itself. If a request's `merchant_account_id` doesn't match the merchant owned by the OAuth client, treat that as a tenant mismatch, not a spoofable input.

### Common Settings (Basic)

| Field | Value |
|---|---|
| Base URL | `https://checkout.dxp.dtic.com.ph/` |
| Client ID | Issued by DLT for one merchant account |
| Client Secret | Shown once when the machine client is created — store immediately, cannot be re-displayed |

**Common headers (all requests):**
```
Content-Type: application/json
Accept: application/json
```

### Get Client Access Token

`POST /oauth/token`

Request body:

| Field | Sample Value | Mandatory | Type |
|---|---|---|---|
| grant_type | `client_credentials` (always this literal value) | Yes | String |
| client_id | `<DLT_MACHINE_CLIENT_ID>` | Yes | String |
| client_secret | `<DLT_MACHINE_CLIENT_SECRET>` | Yes | String |
| scope | — | No | String |

Response body:

| Field | Type |
|---|---|
| token_type | String (`Bearer`) |
| expires_in | Integer, seconds |
| access_token | String — keep server-side and confidential |

Example:
```json
{
  "token_type": "Bearer",
  "expires_in": 31536000,
  "access_token": "<ACCESS_TOKEN>"
}
```

Keep client secrets and access tokens on the merchant server only. Cache the token and its computed expiry; refresh proactively rather than fetching a new token per request.

---

## Get Payment Brands

`GET /api/v1/collection/apn/brands`

Rate-limited. Call from a trusted server only.

### Request (query params)

| Field | Type | Required | Remarks |
|---|---|---|---|
| merchant_account_id | String | Yes | Compatibility assertion — must match the OAuth-owned merchant for protected calls |
| service_code | String | Yes | Currently `APNCOLLECTION` |

### Response

| Field | Type |
|---|---|
| value | String — human-readable brand name (e.g. `Visa`, `GCash`) |
| code | String — **opaque, signed, time-sensitive** `payment_brand_code` |
| image | String (URL) or null |
| is_card | Boolean — brand metadata only |

**`code` handling rule:** copy it unchanged into `payment_brand_code` on Submit Payment. Do not decode it, persist it, or treat it as stable across calls — it's opaque and time-sensitive, so fetch brands freshly each checkout session rather than caching codes long-term.

---

## Submit Payment

`POST /api/v1/collection/apn/submit`

Creates a **Hosted Checkout** transaction. DLT selects the test/live processing configuration from the merchant account internally.

### Security boundary (hard rule)

This endpoint supports Hosted Checkout only. **Never send:** PAN, CVV/CVC, card expiry, card objects, private processing credentials, device fingerprints, or signed internal tokens — DLT rejects those fields. There is no `is_card_payment: true` path that accepts raw card data in this version; card entry happens on DLT's hosted page, not in the merchant's request body.

### Request

**General fields**

| Parameter | Mandatory | Type | Notes |
|---|---|---|---|
| service_code | Yes | String, max 50 | Currently `APNCOLLECTION` |
| merchant_account_id | Yes | String | Must match the OAuth-owned merchant |
| merchant_transaction_id | Yes | ASCII letters/numbers/dash/underscore, max 45 | Stable unique merchant reference |
| time_offset | Yes | String | UTC offset `+/-HH:MM`, within ±14:00, e.g. `+08:00` |
| channel | Yes | Integer, 1–4 | See [Channel table](#channel-integer) |
| callback_url | No | HTTP(S) URL, max 2048 | Dynamic **payor browser return** override. **Not** the merchant payment-notification/webhook URL — don't confuse the two. |
| success_url | No | URL, max 255 | Final success destination (compatible custom/web integration flows) |
| failure_url | No | URL, max 255 | Final failure destination |
| description | No | String, max 200 | Optional transaction description |
| is_card_payment | No | Boolean | **Compatibility metadata only** — Hosted Checkout is always the selected flow regardless of this value |

**Payment details**

| Parameter | Mandatory | Type | Notes |
|---|---|---|---|
| amount | Yes | Decimal, 0–2 places | > 0 and ≤ 500,000.00 |
| currency | No | 3-letter ISO code | Uppercased. Falls back to merchant currency, then DLT default `PHP` |
| payment_brand | Yes | String, max 20 | `value` from Get Payment Brands, e.g. `Visa` or `GCash` |
| payment_brand_code | Yes | Opaque string, max 2048 | Copy the DLT-returned `code` unchanged — don't decode or persist |

**Product/service details** (all optional)

| Parameter | Mandatory | Type | Notes |
|---|---|---|---|
| product_name | No | String, max 80 | Short label |
| product_description | No | String, max 120 | Concise description |
| product_reference_id | No | String, max 100 | Merchant-owned reference; DLT does not store inventory |

**Payor details**

| Parameter | Mandatory | Type |
|---|---|---|
| first_name | Yes | String, max 50 |
| last_name | Yes | String, max 50 |
| email | Yes | Email, max 100 |
| phone | No | String, max 16 |

**Billing address**

| Parameter | Mandatory | Type |
|---|---|---|
| address_line_one | Yes | String, max 80 |
| address_line_two | No | String, max 80 |
| city_municipality | Yes | String, max 60 |
| state_province_region | Yes | String, max 40 |
| country_code | Yes | 2-letter ISO code, uppercased (e.g. `PH`) |
| postal_code | Yes | String, max 10 |

**Optional merchant references**

| Parameter | Mandatory | Type |
|---|---|---|
| other_reference_1 | No | String, max 45 |
| other_reference_1_caption | No | String, max 100 |
| other_reference_2 | No | String, max 45 |
| other_reference_2_caption | No | String, max 100 |

### Response

| Field | Type | Notes/e.g. |
|---|---|---|
| success | Boolean | `true` when DLT accepted the submission |
| message | String | e.g. `Transaction ready for payment` |
| data.is_card_payment | Boolean | `false` for Hosted Checkout |
| data.payment_status | String | `PAID` \| `PENDING` \| `REJECTED` |
| data.transaction_id | String | DLT transaction ID |
| data.merchant_transaction_id | String | Merchant-generated reference (echoed back) |
| data.amount | Decimal string | e.g. `1299.00` |
| data.payment_url | URL or null | **Redirect the payor here** — the DLT hosted checkout page |
| data.success_url | URL or null | Resolved success destination when applicable |
| data.failure_url | URL or null | Resolved failure destination when applicable |
| data.timestamp | ISO 8601 datetime | Includes UTC offset or `Z` suffix |

There is **no branching on payment type** in the response handling — regardless of card vs. e-wallet, the integration's job is: submit → get `payment_url` → redirect the payor there → wait for the webhook (or `/sync` if recovery is needed).

---

## Collection API Journey

High-level flow (Figure 1 in the source doc):

1. **Merchant application:** create an order reference, request an OAuth access token, submit the payment request to the DLT Collection API.
2. **DLT Collection API:** validates merchant ownership (via OAuth), creates the transaction, returns a `payment_url`.
3. **Payor browser:** redirect the payor to the secure hosted checkout page. No card number or CVV is ever sent in the merchant API request.
4. **DLT payment status:** DLT maintains `PAID`, `PENDING`, or `REJECTED` as the source of truth. Use `/sync` when an authenticated recovery check is needed.
5. **Merchant notification endpoint:** DLT sends a signed payment-status webhook to the merchant. Verify the signature, deduplicate the event, and return HTTP 2xx.

Security & best practices baked into this flow: OAuth 2.0 + secure credentials, HTTPS everywhere, verify webhook signatures, deduplicate webhook events by `reference_id`/`event_id`.

---

## Synchronize Payment Status

`POST /api/v1/collection/apn/sync`

Authenticated recovery path — use when a Hosted Checkout transaction remains `PENDING` or the payor's browser return is inconclusive. **This is the only supported way to actively re-check status** (do not poll a generic status-by-transaction-ID endpoint — see [Payor Return](#payor-return-and-dlt-payment-status)).

### Request

| Parameter | Mandatory | Type | Notes |
|---|---|---|---|
| merchant_transaction_id | Yes | ASCII letters/numbers/dash/underscore, max 45 | Must belong to the OAuth-owned merchant. **Use `merchant_transaction_id`, not `data.transaction_id`.** |

Authentication: Bearer machine access token. Rate limited.

### Response

| Field | Type | Notes/e.g. |
|---|---|---|
| success | Boolean | `true` when the request was processed |
| message | String | e.g. `Success` |
| data.merchant_transaction_id | String | Merchant reference |
| data.payment_status | String | `PAID` \| `PENDING` \| `REJECTED` |
| data.provider_message | String or null | DLT processing status description |
| data.timestamp | ISO 8601 datetime | DLT response time |

**`PAID` and `REJECTED` are terminal** — `/sync` returns them without downgrading the transaction; it will never flip a terminal status back to `PENDING`.

---

## Payment Status and Duplicate Requests

- A newly accepted Hosted Checkout transaction is normally `PENDING` while the payor completes payment.
- DLT's internal status processing, or an authenticated `/sync` call, reconciles `PENDING` → `PAID`/`REJECTED`.
- `PAID`/`REJECTED` are terminal — merchant webhook delivery failures do not change them.
- **Idempotency / replay:** reusing a `merchant_transaction_id` with the *same* safe request fingerprint replays the already-accepted result. Reusing it with *different* request content returns **HTTP 409 `TRANSACTION_REFERENCE_CONFLICT`**.
- If DLT cannot determine the submission outcome, it returns **HTTP 503 `SUBMISSION_UNKNOWN`**.
- **Do not automatically resubmit** on ambiguous outcomes — call `/sync` or contact DLT support instead. Blind retries on 503/409 risk duplicate charges or corrupted reconciliation.

---

## Payor Return and DLT Payment Status

- `callback_url` (optional, per-payment) is the payor's **browser return URL**. DLT resolves the return destination in this priority order:
  1. request `callback_url`
  2. the merchant's environment-specific default payor return URL
  3. DLT's fallback return page
- Live return URLs must use HTTPS; all merchant URLs must be pre-approved for the applicable environment.
- **Never put credentials, fragments, or sensitive data in return URLs.**
- DLT updates transactions through **protected internal status processing** — merchants do not supply or call internal status endpoints. The **payor's browser is not the source of truth** for payment status; only DLT's own status (via webhook or `/sync`) is authoritative.
- The DLT fallback return page uses a short-lived internal `return_token`. It's a browser capability generated by DLT, **not a merchant API credential** — don't try to use it for server-side auth.
- **Merchant systems should use `/sync` and signed webhooks; do not poll a `/collection/status` endpoint with a transaction ID** — that pattern is explicitly unsupported in this version.

---

## Merchant Payment Status Webhook

Configure **separate test and live** payment notification URLs in Web Integration (this is the actual server-to-server notification channel — distinct from `callback_url`, which only handles the payor's browser redirect).

After DLT records a payment status or completes a `/sync` reconciliation, it queues a webhook event. **Return any HTTP 2xx to acknowledge delivery.** Network errors and non-2xx responses are retried by DLT; a failed delivery does not roll back the payment.

### Headers

| Header | Required | Description | Example |
|---|---|---|---|
| Content-Type | Yes | JSON request body | `application/json` |
| X-DLT-Event-Id | Yes | Stable event ID for deduplication | `evt_...` |
| X-DLT-Timestamp | Yes | Unix timestamp used in the signature | `1788264000` |
| X-DLT-Signature | Yes | HMAC-SHA256 of `<timestamp>.<exact raw body>` | `sha256=<hex digest>` |
| X-DLT-Token | Transitional | Legacy compatibility token, when configured | Treat as confidential |

### Payload

| Field | Type | Notes/e.g. |
|---|---|---|
| event_id | String | Same value as `X-DLT-Event-Id` |
| event_type | String | `collection.payment_status` |
| merchant_transaction_id | String | Merchant transaction reference |
| provider_transaction_id | String or null | DLT processing transaction ID |
| payment_status | String | `PAID` \| `PENDING` \| `REJECTED` |
| previous_payment_status | String or null | Status before this event |
| provider_status_code | String or null | DLT processing status code |
| amount | Decimal string | Original transaction amount |
| currency | String | 3-letter ISO code |
| payment_flow | String | `Hosted Checkout` |
| environment | String | `test` or `live` |
| message | String or null | DLT processing message |
| other_references | Object | Merchant-supplied references and captions |
| provider_occurred_at | ISO 8601 or null | DLT processing event time |
| observed_at | ISO 8601 | Time DLT observed the status |

### Signature verification (mandatory, do not skip)

1. Compute `HMAC-SHA256` over the string `<X-DLT-Timestamp value>.<exact raw HTTP body>` using the merchant's webhook signing secret.
2. Format the result as `sha256=<hex digest>`.
3. Compare it to `X-DLT-Signature` **in constant time** (not `==`/`string.Equals`) to avoid timing attacks.
4. **Reject stale timestamps** (define and enforce a max age, e.g. 5 minutes).
5. **Reject previously processed event IDs** (dedupe by `event_id`).

Only after all of the above passes should the handler update the local order/transaction record and return HTTP 2xx.

---

## Quick Link Checkout Flow

Reusable DLT-hosted checkout session — for when you want to send a payer a payment link without building a full Submit Payment integration flow up front (Figure 2 in the source doc).

1. **Merchant application (authenticated):** create a Quick Link session with the merchant OAuth token; send order, amount, currency, and optional return URLs.
2. **DLT Quick Link API:** returns an **opaque session token** that expires in **30 minutes**. The session is bound to the authenticated merchant.
3. **Payor browser:** open the DLT checkout using the returned session token. **OAuth credentials must never be placed in the browser.**
4. **DLT payment status:** DLT records `PAID`/`PENDING`/`REJECTED` for the transaction — the payor return page is **not** the payment-status authority.
5. **Merchant application:** receive the signed DLT webhook and update the order. Use authenticated `/sync` only when recovery is required.

Security & best practices: keep OAuth server-side only; session token expires in 30 minutes; never expose OAuth in the browser; verify signed webhooks; use `/sync` for recovery only (not routine polling).

---

## Create Quick Link Session

`POST /api/v1/quick-link/session`

Create from the merchant server using the machine OAuth token.

### Request

| Parameter | Mandatory | Type | Notes (e.g.) |
|---|---|---|---|
| service_code | Yes | String, max 50 | Currently `APNCOLLECTION` |
| merchant_account_id | Yes | String | Must match the OAuth-owned merchant |
| merchant_transaction_id | Yes | ASCII alphanumeric, max 45 | Unique merchant reference |
| product_name | No | String, max 100 | DLT does not store merchant inventory |
| product_description | No | String, max 255 | Shown during checkout |
| amount | Yes | Decimal | Minimum `0.01` |
| quantity | No | Integer | e.g. `1`, `2`, `3` |
| currency | Yes | 3-letter code | e.g. `PHP` |
| success_url | No | URL, max 255 | Merchant success destination |
| failure_url | No | URL, max 255 | Merchant failure destination |
| custom_fields | No | Array | Optional merchant-defined key/value fields |
| custom_fields.*.key | No | String, max 50 | Custom field label |
| custom_fields.*.value | No | String, max 255 | Custom field value |

### Response

| Field | JSON path | Type |
|---|---|---|
| success | success | Boolean |
| message | message | String |
| token | data.token | Opaque string |
| merchant_account_id | data.merchant_account_id | String |
| merchant_transaction_id | data.merchant_transaction_id | String |
| website | data.website | String or null |
| service_code | data.service_code | String |
| amount | data.amount | Decimal string |
| currency | data.currency | String |
| product_name | data.product_name | String or null |
| product_description | data.product_description | String or null |
| quantity | data.quantity | Integer or null |
| payment_brands | data.payment_brands | Array or null |
| custom_fields | data.custom_fields | Array or null |
| success_url | data.success_url | URL or null |
| failure_url | data.failure_url | URL or null |
| expires_at | data.expires_at | ISO 8601 datetime |

---

## Get Quick Link Session

`GET /api/v1/quick-link/session`

### Request

| Field | Mandatory | Type | Notes (e.g.) |
|---|---|---|---|
| token | Yes | Opaque string | Session token returned by Create Quick Link Session |

### Response

Same shape as Create Quick Link Session:

| Field | JSON path | Type |
|---|---|---|
| success | success | Boolean |
| message | message | String |
| token | data.token | Opaque string |
| merchant_account_id | data.merchant_account_id | String |
| merchant_transaction_id | data.merchant_transaction_id | String |
| service_code | data.service_code | String |
| amount | data.amount | Decimal string |
| currency | data.currency | String |
| product_name | data.product_name | String or null |
| product_description | data.product_description | String or null |
| quantity | data.quantity | Integer or null |
| payment_brands | data.payment_brands | Array or null |
| custom_fields | data.custom_fields | Array or null |
| success_url | data.success_url | URL or null |
| failure_url | data.failure_url | URL or null |
| expires_at | data.expires_at | ISO 8601 datetime |

Use this to check session/payment state after the payor returns from the hosted checkout — but treat it as a convenience read, not the reconciliation mechanism; use `/sync` or the webhook for authoritative status.

---

## Response Payload Shapes

**Successful**

| Field | Type | Notes/e.g. |
|---|---|---|
| success | Boolean | `true` |
| message | String | `Successful` |
| data | Array, Null | Endpoint-specific payload |

**General Error**

| Field | Type | Notes/e.g. |
|---|---|---|
| success | Boolean | `false` |
| message | String | `Something went wrong` |
| data | Array, Null | |

**Validation Error**

| Field | Type | Notes/e.g. |
|---|---|---|
| success | Boolean | `false` |
| message | String | `Validation error` |
| errors | Array | Per-field validation error details |

**Client branching logic:** check `success` first; if `false`, check for an `errors` array to distinguish a validation error (fix the request) from a general error (retry/alert per the duplicate-request rules above — never blind-retry a 409/503).

---

## Data Tables

### Channel (Integer)

Used in the `channel` field of Submit Payment.

| Value | Definition | Notes/e.g. |
|---|---|---|
| 1 | API | Server-to-server merchant integration |
| 2 | Quick Link | DLT reusable checkout session |
| 3 | WooCommerce | WooCommerce integration |
| 4 | Custom | Custom web integration |

---

## Version History

| Version | Description | Updated by | Date |
|---|---|---|---|
| 1.0.0 | Initial release | Arnel Miraflores | 09/26/2025 |
| 1.2.0 | Payment journey; Submit payment endpoint | Arnel Miraflores | 10/06/2025 |
| 1.2.1 | Transaction fee details added on payment submission response payload | Arne Miraflores *(sic)* | 10/09/2025 |
| 1.3 | Added `v1` to API base route; `service_code` required; updated brands endpoint query params | Arnel Miraflores | 06/29/2026 |
| 2.0 | Added Quick Link session; added response payload formats | Arnel Miraflores | 07/08/2026 |
| 2.1 | Added Get Quick Link Session endpoint | Arnel Miraflores | 07/08/2026 |
| 2.2 | Renamed `redirect_url` to `payment_url`; updated Submit Payment response payload | Arnel Miraflores | 07/12/2026 |
| 3.0 | Updated Submit Payment request payload; added `channel`, `success_url`, `failure_url`; added Data Tables | Arnel Miraflores | 08/15/2026 |
| **4.0 (current)** | **Merchant-bound OAuth and tenant checks; DLT Hosted Checkout rules (card fields no longer accepted); updated payment brands, submit, sync, payor-return, signed merchant webhook, status lifecycle, Quick Link guidance, DLT-only integration language, simplified diagrams** | Arnel Miraflores | 09/01/2026 |

**Breaking change vs. v3.0:** v3.0's `is_card_payment: true` branch (raw `card_holder_name`/`card_number`/`expiration_month`/`expiration_year`/`ccv` fields and mandatory 3DS `device.*` block on Submit Payment) is **removed/rejected** in v4.0. Any integration migrating from v3.0 to v4.0 must strip all card and device fields from its Submit Payment payload and switch to redirecting the payor to `data.payment_url` unconditionally. `is_card_payment` still exists as a response/request field but is compatibility metadata only — it no longer changes which fields are required or how the response is shaped.
