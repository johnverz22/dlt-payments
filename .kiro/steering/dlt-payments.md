---
inclusion: fileMatch
fileMatchPattern: ["lib/dlt-*.ts", "lib/link-token.ts", "app/api/payment/**", "app/pay/**"]
---

# DLT Hosted Checkout integration — read before touching payment code

This loads automatically whenever you're working in a DLT-adjacent file. Full field-level reference lives in the `dlt-hosted-checkout-api` skill (`skills/dlt-hosted-checkout-api/`, mirrored into `.kiro/skills/`) — this file is the "don't get this wrong" summary specific to how *this app* uses it, including the corrections made versus the original v2 spec draft. See `DESIGN.md` §1 for the full write-up of why each of these exists.

## The one thing that must not be skipped: embedded credentials in the link token

The payor who opens `/pay/[token]` has **no session cookie** — `dlt_session` belongs to the payee's browser only. Every DLT call made on the payor's behalf (`/brands`, `/submit`, `/sync`) needs `merchant_account_id`, `service_code`, and a bearer `access_token`. Those three fields are therefore embedded **inside the encrypted `PaymentLinkPayload` itself** at link-creation time (copied from the payee's decrypted session), not fetched from anywhere else at payor-request time.

- If you're writing a payor-facing route and find yourself looking for a session cookie or asking "where does the merchant's token come from here?" — the answer is: decrypt the link token, it's in there as `dlt_access_token` / `merchant_account_id` / `service_code`.
- `dlt_access_token` is exactly as sensitive as `access_token` — never logged, never sent to the client, never included in an error message.
- If a DLT call made via an embedded link-token credential returns `401`, that's terminal for the request (there's no payee present to re-authenticate mid-flow). Return "this payment link is temporarily unavailable — ask the merchant for a new link" and log the failure (allowlisted fields only) so the merchant can be made aware.

## The flow, in order

1. `GET /pay/[token]` — decrypt, check expiry, render checkout shell. **No `/sync` call here** — the transaction doesn't exist until `/submit` is called.
2. `GET /api/payment/brands?token=...` — decrypt the same token, call DLT's brands endpoint with the embedded credentials, return `{ value, code, image, is_card }[]` to the browser **unmodified**. `code` is opaque and time-sensitive — fetch it fresh every checkout session, never cache it.
3. Payor fills the billing form + picks a brand → `POST /api/payment/submit`.
4. On DLT success → redirect the payor's browser (real navigation, not a client-side route push — `payment_url` is off-origin) to `data.payment_url`.
5. DLT redirects back to `/pay/[token]/verify?status=success|failure` — that query param is a **non-authoritative UI hint only**. The polling state machine there calls `POST /api/payment/sync`, which re-decrypts the token server-side to recover `merchant_transaction_id` — never trust a client-supplied transaction ID.

## Submit Payment — required fields (don't build a partial payload)

```json
{
  "merchant_account_id": "<from decrypted link token>",
  "service_code": "<from decrypted link token>",
  "merchant_transaction_id": "<from decrypted link token, immutable, never regenerated>",
  "time_offset": "+08:00",
  "channel": 4,
  "amount": "1500.00",
  "currency": "PHP",
  "payment_brand": "<from the brand picker>",
  "payment_brand_code": "<from the brand picker, opaque, pass through unchanged>",
  "product_name": "...",
  "product_description": "...",
  "first_name": "...", "last_name": "...", "email": "...", "phone": "...",
  "address_line_one": "...", "address_line_two": "...",
  "city_municipality": "...", "state_province_region": "...",
  "country_code": "PH", "postal_code": "...",
  "success_url": "https://[domain]/pay/[token]/verify?status=success",
  "failure_url": "https://[domain]/pay/[token]/verify?status=failure"
}
```

- `product_description` is technically optional per DLT's docs but **DLT's server 500s if it's omitted in practice** — treat it as required.
- `time_offset` and `channel` are hardcoded server-side constants (`"+08:00"`, `4`) — never derived from client input.
- `amount`: `0 < amount <= 500000.00`, validated via `lib/money.ts`, never `parseFloat`.
- `merchant_transaction_id`: ASCII `[A-Za-z0-9_-]`, max 45 chars, generated once, never regenerated on retry.
- Billing address is **structured fields**, not one free-text string: `address_line_one` (required), `address_line_two` (optional), `city_municipality` (required), `state_province_region` (required), `country_code` (required, default `"PH"`), `postal_code` (required).
- Never send card fields (`card_number`, `ccv`, etc.) or `device.*` 3DS fields — DLT v4.0 Hosted Checkout rejects them outright; there is no `is_card_payment: true` branch that accepts raw card data in this version.

## Error handling — never auto-resubmit

- `409 TRANSACTION_REFERENCE_CONFLICT` — same `merchant_transaction_id`, different request content. Surface: "this link's payment attempt doesn't match a prior attempt." Do not retry with different data under the same ID.
- `503 SUBMISSION_UNKNOWN` — DLT couldn't determine the outcome. Surface: route to `/pay/[token]/verify` for reconciliation via `/sync`. Do not resubmit.
- `401` — see "embedded credentials" section above; terminal for payor-facing calls.
- `PAID` and `REJECTED` from `/sync` are terminal — DLT guarantees it will never downgrade a terminal status back to `PENDING`. Stop polling immediately on either.

## Rate limits for these endpoints (Upstash-backed, in addition to edge/WAF)

| Endpoint | Limit | Key |
|---|---|---|
| `/api/payment/create-link` | 30 / hour | per authenticated session |
| `/api/payment/submit` | 5 / min | per `link_id`, plus a per-IP cap |
| `/api/payment/sync` | 20 / min | per `link_id` |
| `/api/payment/brands` | 20 / min | per `link_id` |

## Polling state machine (`/pay/[token]/verify`)

1 immediate `/sync` call + 5 retries (6 total), backoff `1s, 2s, 4s, 8s, 16s` with full jitter (`Math.random() * base_delay`), 60s hard wall-clock ceiling independent of attempt count. On exhaustion: "Verification Delayed" + a debounced manual retry button (single immediate call, does not restart the backoff sequence).