# Design Corrections from v2 Spec

This file captures the platform-specific corrections from `DESIGN.md` §1 that diverge from the base API reference or the original spec. **The `dlt-hosted-checkout-api` skill represents the base API; this file overrides it for this project.**

## 1. Embedded Credentials in Link Token (§1.1)
The payor who opens `/pay/[token]` has no session cookie. To allow server-side calls to DLT (`/brands`, `/submit`, `/sync`) on the payor's behalf, the `PaymentLinkPayload` MUST embed `merchant_account_id`, `service_code`, and `dlt_access_token` (copied from the payee's session at link creation time).
- `dlt_access_token` is exactly as sensitive as `access_token` (never logged, never sent to client).
- A 401 on an embedded token is terminal; do not attempt silent refresh.

## 2. Brands Flow Requirement (§1.2)
The checkout flow must include a `GET /api/payment/brands?token=<link_token>` call before submitting.
- Brands must be fetched fresh per checkout session (opaque, time-sensitive `code`).
- Returns `{ value, code, image, is_card }[]`.
- `value` goes to `payment_brand`; `code` goes to `payment_brand_code` on submit.

## 3. Submit Field Corrections (§1.3)
- `product_description` is REQUIRED in practice (DLT 500s without it).
- Address fields are structured: `address_line_one`, `address_line_two`, `city_municipality`, `state_province_region`, `country_code`, `postal_code`.
- `time_offset` (+08:00) and `channel` (4) are hardcoded server-side.
- Never send card fields or 3DS fields.

## 4. Amount and ID Validation (§1.4)
- `amount`: `0 < amount <= 500000.00` (integer-cents comparison).
- `merchant_transaction_id`: Max 45 chars, `[A-Za-z0-9_-]`.

## 5. 401 Handling (§1.5)
- **Payee Dashboard:** On 401, force logout (clear session).
- **Payor Links:** On 401, terminal error ("link temporarily unavailable"). Do not retry.
