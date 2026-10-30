# DLT Merchant Dashboard (BFF): Project Specification

| | |
| --- | --- |
| Version | 0.2 (draft for review) |
| Date | 2026-10-06 |
| Source contract | DLT Merchant Portal API **v1.10** (updated 2026-10-04) |
| Stack | React Router v7 (framework mode, successor to Remix), TypeScript, Node |
| Audience | Merchants (DLT clients) who accept payments through the DLT gateway |

---

## 1. Purpose and scope

Build a web dashboard where a DLT merchant can see what happened to the payments collected through DLT on their own platform: transactions, per-transaction history, reporting and analytics. The same app also covers account administration (profile, merchant details, team, developer credentials) because the Portal API exposes it.

**This app is a frontend and a secure token proxy only.**

| Concern | Owner |
| --- | --- |
| Rendering UI, forms, navigation, role-aware screens | **This app** |
| Browser session (cookie), CSRF, security headers | **This app** (the API doc assigns these to the Portal application) |
| Holding the user PAT and the Portal application secret server-side, attaching them to DLT calls | **This app** |
| Authentication, authorization, merchant isolation | DLT backend |
| Rate limiting | DLT backend (this app only reacts to `429` / `Retry-After`) |
| Financial state, status normalization, metrics, evidence policy | DLT backend |

Rules that follow from this:

- No business rules are re-implemented here. Status, totals, success rates and bucket boundaries come from the API as-is.
- No database in this app. State lives in the DLT backend, plus a server-side session store.
- The browser never sees the PAT, the Portal application secret, or any DLT URL.

### 1.1 Capabilities

1. **Overview dashboard**: KPIs, collection trend, status mix, recent transactions.
2. **Transactions**: filterable list, detail, merchant-to-DLT history timeline.
3. **Reports**: daily/monthly/yearly period reports with totals, charts and a table.
4. **Account**: own profile, email verification, password change.
5. **Merchant**: business profile and logo.
6. **Team**: members, roles, invitations.
7. **Developer**: machine API clients (issue/rotate/revoke, one-time secret handover), web-integration key status and replacement.
8. **Public flows**: login, forgot/reset password, invitation acceptance.

### 1.2 Non-goals (not in the API contract)

Initiating, refunding, reversing or replaying payments; settlement, fees and payout balances; customer/PII data; provider-level history; full-dataset export; real-time streaming (no WebSocket/SSE); multi-merchant switching; webhook URL / `x_token` management; cursor pagination. Adding any of these requires a new API agreement with DLT.

---

## 2. Blockers to resolve before coding

### 2.1 Credential mapping

Status after DLT's reply: the Portal application credentials, application code, a dummy merchant user and both API origins have been supplied. The API defines two Portal credentials, and the rest of the supplied items map to them as follows.

| Item supplied | Maps to | Used by |
| --- | --- | --- |
| Portal application client ID | `DLT_PORTAL_CLIENT_ID` | Basic auth on `POST /auth/login` and `POST /portal/team/invitations/accept` (server-side only) |
| Portal application client secret | `DLT_PORTAL_CLIENT_SECRET` | Same as above (server-side only, never in the browser) |
| Application code | `DLT_APPLICATION_CODE`, sent as `X-DLT-Application` (the doc says `merchant_portal`) | Same two calls |
| `DLT_ORIGIN` (test) | `DLT_ORIGIN` for dev/staging builds | All DLT calls |
| `DLT_ORIGIN` (production) | `DLT_ORIGIN` for production builds | All DLT calls |
| Dummy merchant user email + password | Login input (`username`, `password`) | Manual testing and the Playwright E2E user (`E2E_ADMIN_*`) |
| User PAT | Not provisioned. Returned by login and stored in the session (60 min default, no refresh). | Never configured as an env var |

Still needed from DLT: the allowed origin(s) registered for this app (otherwise login returns `401 ECOSYSTEM_CLIENT_UNAUTHENTICATED` when an `Origin` header is sent), confirmation that the `merchant-portal` scope is granted, and `APP_MERCHANT_URL` pointing at this app. The dummy user's role (Administrator or Developer) should be confirmed. A Developer user is pending and not needed for the first phases.

### 2.2 Other items to confirm with DLT (see section 16 for the full list)

- `APP_MERCHANT_URL` must point at this app. DLT sends email links (verification redirect, invitation, password reset) to it.
- Per-IP limiters on public/login routes will see the BFF's IP for every user (section 11.3).

---

## 3. Architecture

```
Browser ──HTTPS──▶ React Router server (this app) ──HTTPS──▶ DLT API
  cookie only        holds PAT + Portal app secret            Bearer user PAT
  (opaque session)   server-side session store                (Basic app creds only for
                                                               login / invitation accept)
```

### 3.1 Data flow patterns

1. **Default: loaders and actions.** Page data is fetched in route `loader`s, mutations go through route `action`s. All DLT calls happen server-side. Filter/page state lives in the URL query string, so pages are linkable and navigation naturally cancels stale requests.
2. **Resource routes** (`/_api/...`) only where client-side interaction needs data without a navigation (for example a lazy-loaded history payload). Each resource route is a typed, purpose-built handler.
3. **No generic proxy.** The BFF must not forward arbitrary paths to DLT. Every upstream call goes through a fixed allowlist of operations in the DLT client layer (section 5). The browser cannot choose the upstream path, headers or method.

### 3.2 Credential handling

| Secret | Where it lives | Rule |
| --- | --- | --- |
| Portal app client ID/secret + app code | Server env vars | Used only for login and invitation accept. Never in client bundles or logs. |
| User PAT | Server-side session record (encrypted at rest) | Attached as `Authorization: Bearer` by the DLT client. Never sent to the browser. |
| Session ID | `__Host-` cookie | `HttpOnly; Secure; SameSite=Lax; Path=/`. Opaque, rotated at login. |
| User password | Request memory only | Never stored or logged. `current_password` fields are forwarded and discarded. |

`Lax` (not `Strict`) is deliberate: DLT emails link to this app and one DLT route redirects here, and `Strict` cookies would not be sent on those cross-site navigations.

---

## 4. Stack and conventions

| Area | Choice |
| --- | --- |
| Framework | React Router v7 framework mode (SSR), Node adapter (`@react-router/node`, `@react-router/serve`), Vite |
| Language | TypeScript (strict) |
| Validation | Zod, for env config, URL filter parsing, form input, and upstream response parsing |
| Styling/UI | Tailwind CSS + shadcn/ui (Radix) |
| Charts | Recharts |
| Dates/time zones | Luxon (IANA time zones, DST-safe boundaries) |
| Money | Decimal strings end to end; `decimal.js` for any derived math; `Intl.NumberFormat` for display |
| Session store | Redis in production (memory/file in dev) via `createSessionStorage` |
| Tests | Vitest, MSW (DLT mocks from documented examples), Playwright (E2E) |
| Lint/format | ESLint, Prettier; `tsc --noEmit` in CI |

Conventions:

- Anything touching secrets lives in `app/.server/**` (React Router guarantees these never ship to the client).
- Every URL builder uses `URLSearchParams` (a literal `+` in a `+08:00` offset must be encoded as `%2B`, never sent as a space).
- Route IDs are opaque: use the values DLT returned, URL-encode path segments, never do arithmetic on IDs.

---

## 5. DLT client layer (`app/.server/dlt/`)

One module is the only place that talks to DLT. Everything else calls typed functions.

### 5.1 Responsibilities

- Build the request (origin from env, `Accept: application/json`, JSON or multipart body, bearer from session).
- Parse the response with Zod, normalize into `Result<T, DltError>`.
- Handle `204` without calling `.json()`.
- Redact secrets in logs.
- Apply a **timeout** (suggested 10 s reads, 15 s mutations) and bounded retry for reads only (section 11.2).

### 5.2 Error model

```ts
type DltError = {
  status: number;            // HTTP status is authoritative
  errorCode?: string;        // machine-readable; absent on legacy/OAuth/public-reset shapes
  message: string;           // display only, never branch on it
  fieldErrors?: Record<string, string[]>;
  retryAfterSeconds?: number // from Retry-After on 429
};
```

Fallbacks are required: login, password-reset and OAuth routes can return legacy envelopes without `error_code`.

### 5.3 Upstream operations allowlist

| Group | Operation | Method + path (relative to `DLT_ORIGIN`) | Auth |
| --- | --- | --- | --- |
| Auth | login | `POST /api/v1/auth/login` | Basic app + `X-DLT-Application` |
| Auth | logout | `POST /api/v1/auth/logout` | Bearer |
| Auth | request reset link | `POST /api/v1/auth/reset-password/reset-link` | none |
| Auth | set new password | `POST /api/v1/auth/reset-password/new-password` | none (reset proof) |
| Auth | accept invitation | `POST /api/v1/portal/team/invitations/accept` | Basic app + `X-DLT-Application` |
| Me | get / patch profile | `GET`, `PATCH /api/v1/portal/me` | Bearer |
| Me | verify / resend email OTP | `POST /api/v1/portal/me/email/verify`, `/resend` | Bearer |
| Me | change password | `PUT /api/v1/portal/me/password` | Bearer |
| Merchant | get / patch | `GET`, `PATCH /api/v1/portal/merchant` | Bearer |
| Merchant | logo get / upload / delete | `GET`, `POST`, `DELETE /api/v1/portal/merchant/logo` | Bearer |
| Machine clients | list / issue | `GET`, `POST /api/v1/portal/merchant/machine-clients` | Bearer |
| Machine clients | rotate / revoke | `POST .../machine-clients/{client}/rotate`, `/revoke` | Bearer |
| Machine clients | consume secret | `POST .../credential-deliveries/{delivery}/consume` | Bearer |
| Integration keys | get / replace / delete | `GET /api/v1/portal/merchant/integration-keys`, `PUT`, `DELETE .../{keyType}` | Bearer |
| Team | members list / role / remove | `GET /api/v1/portal/team/members`, `PATCH .../{member}/role`, `DELETE .../{member}` | Bearer |
| Team | invitations list / create / resend / revoke | `/api/v1/portal/team/invitations[/{id}[/resend]]` | Bearer |
| Collections | list / detail | `GET /api/v1/portal/collections/transactions[/{transaction}]` | Bearer |
| Collections | history list / detail | `GET .../transactions/{transaction}/history[/{history}]` | Bearer |
| Reporting | metrics / charts | `GET /api/v1/portal/collections/metrics`, `/charts` | Bearer |
| Reference | currency catalogue | `GET /api/v1/json/currency` | public |

`{client}` is the ownership `id` (not `oauth_client_id`), `{transaction}` is the internal numeric `id` (not the merchant reference), `{history}` is the ULID, `{keyType}` is exactly `authentication_token` or `secret_key`.

Do **not** use legacy `/user/*`, `/collection/*`, `/asset/*`, `/metric/*` routes or `/oauth/token`. They are not part of the Portal contract.

---

## 6. Authentication and session

### 6.1 Login

1. Browser posts email + password to the BFF `/login` action (CSRF-protected).
2. BFF calls `POST /api/v1/auth/login` with Basic app credentials, `X-DLT-Application`, JSON `{ username, password }`.
3. On success, read `data.access_token`, `data.expires_at`, `data.user`. Then call `GET /portal/me` to get the canonical role (`administrator` | `developer`) and merchant identity. Login's numeric `role` (`1`/`10`) is only a hint.
4. Create a **new** session (rotate ID), store `{ pat, expiresAt, user, csrfSecret }` encrypted, set cookie, redirect to the originally requested page (validate that the redirect target is a same-origin relative path).

Error mapping on login:

| Response | UI |
| --- | --- |
| `401 INVALID_CREDENTIALS` | Inline form error: wrong email or password |
| `401 ECOSYSTEM_CLIENT_UNAUTHENTICATED` | **Not** a user error. Generic "service unavailable" + server alert (misconfigured app credentials/code/origin) |
| `403 MERCHANT_USER_NOT_AUTHORIZED`, `ACCESS_TOKEN_SCOPE_INSUFFICIENT`, `ECOSYSTEM_APPLICATION_NOT_AUTHORIZED` | "Your account isn't eligible to use this portal" |
| `429` | Show retry delay from `Retry-After` |
| `503 TOKEN_ISSUER_MISCONFIGURED` | Generic unavailable + server alert |

### 6.2 Session lifetime

- Session expiry **must not exceed** the PAT's `expires_at` (default 60 min). There is no refresh and no silent renewal; the user must log in again. Do not store the password to auto-relogin.
- Show a non-blocking "session expires in N min" notice in the last few minutes. On expiry, redirect to `/login?reason=expired&returnTo=<path>`.
- Optional idle timeout (product decision), always capped by the PAT expiry.

### 6.3 Session invalidation

| Trigger | Behavior |
| --- | --- |
| Any DLT response `401` on a protected call | Destroy session, redirect to login (`reason=expired`) |
| User logs out | `POST /auth/logout`, then destroy session **even if the DLT call fails** |
| Password change succeeds (`reauthentication_required: true`) | Destroy session, redirect to login with success notice |
| Password reset completes | No PAT is returned; send user to login |
| Self-demotion or self-removal succeeds | Destroy session (token already revoked); a demoted active member can log back in |
| Email change verified | PATs are preserved; refetch profile only |

### 6.4 Route guards

- `requireUser(request)` in every protected loader/action: validates session, expiry, returns `{ pat, user }` or throws a redirect.
- `requireRole(user, 'administrator')` for admin-only screens/actions. UI hides controls for Developers, **and** the BFF refuses the action (defense in depth). The DLT API remains the real authority (`403 FORBIDDEN` is still handled).

### 6.5 Role matrix (UI gating)

| Capability | Administrator | Developer |
| --- | --- | --- |
| Dashboard, transactions, history, reports | Yes | Yes |
| Own profile, email verification, password | Yes | Yes |
| View merchant profile/logo/services | Yes | Yes |
| Edit merchant profile, logo | Yes | No |
| View machine-client and integration-key *metadata* | Yes | Yes |
| Issue / rotate / revoke machine clients, consume secret | Yes | No |
| Replace / delete integration keys | Yes | No |
| View team members | Yes | Yes |
| Invitations, change role, remove member | Yes | No |

---

## 7. Security requirements

1. **Cookies:** `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, session ID rotation at login, expiry ≤ PAT expiry.
2. **CSRF:** all non-GET requests must pass (a) `Origin`/`Sec-Fetch-Site` same-origin check and (b) a per-session CSRF token embedded in forms/fetchers. React Router does not provide this out of the box, so implement it in a shared helper used by every action.
3. **Secrets at rest:** PAT encrypted (AES-256-GCM, key from env) in the session store. Support key rotation (`SESSION_SECRETS` as a list).
4. **Headers:** strict CSP (no inline scripts except nonce), `Referrer-Policy: no-referrer` (stronger on token-bearing pages), `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`, HSTS.
5. **Cache:** `Cache-Control: no-store` on every authenticated HTML/JSON response. DLT marks profile, credential, team and history responses `no-store` and this app must not weaken that.
6. **Logging redaction:** never log `Authorization`, `password`, `current_password`, `password_confirmation`, `token`, `otp`, `value` (integration key), `oauth_client_secret`, request/response bodies of credential endpoints, reset tokens, invitation fragments. Log method, route template, status, duration, request ID only.
7. **Open redirect:** `returnTo` accepted only if it is a same-origin relative path.
8. **One-time secrets** (machine client secret): shown once from an action response, never written to session, URL, storage, logs, or telemetry; cleared from React state on navigation; copy-to-clipboard + explicit "I have stored it" confirmation. If the response is lost, issue/rotate again (cannot be re-fetched).
9. **Reset and invitation proofs:** the reset page reads `?token&email`, moves them into transient form state, and strips them from the visible URL (`history.replaceState`). The invitation page reads `#token=` from the fragment on the client and posts it to the BFF; the fragment never reaches server logs. Neither is persisted.
10. **Uploads:** logo is multipart `file`, PNG/JPEG/WebP, max **2,048 KB**. Pre-check type and size in the BFF for fast feedback; DLT validates authoritatively.
11. **Dependencies:** lockfile, `npm audit`/Dependabot in CI.
12. **PII in analytics:** if analytics is added, disable it on credential, reset, invitation and history pages.

---

## 8. Information architecture

### 8.1 Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | public | Email + password login |
| `/forgot-password` | public | Request reset link (always show the same generic confirmation) |
| `/reset-password` | public | Set new password using `?token&email` from email |
| `/team/invitations/accept` | public | Accept invitation using `#token=` fragment |
| `/` | user | Dashboard (also receives `?email_verification=verified\|invalid` redirect from DLT) |
| `/transactions` | user | List + filters |
| `/transactions/:id` | user | Detail, with History tab |
| `/reports` | user | Period reports |
| `/settings/profile` | user | Profile, email verification |
| `/settings/security` | user | Change password |
| `/settings/merchant` | user (edit: admin) | Business profile, logo, enabled services |
| `/settings/team` | user (manage: admin) | Members and invitations |
| `/settings/developer` | user (manage: admin) | Machine clients, integration keys |
| `/logout` | user | Action only |
| `/healthz` | internal | Liveness (no DLT call) |

If DLT's `APP_MERCHANT_URL` includes a base path, set React Router's `basename` from env to match.

### 8.2 Global layout

- Left nav (collapsible on mobile), top bar with user menu (profile, security, logout), session expiry notice.
- Developer sees the same nav; admin-only controls are hidden or disabled with an explanatory tooltip.

---

## 9. Feature specifications

### 9.1 Global deployment, currency and time zone rules

- **No test/live selector.** As of API v1.10 collections, history, metrics and charts are scoped to the authenticated merchant **within the DLT deployment the app points at**. `environment`, `env` and `is_production` are rejected with `422` if sent, and responses no longer carry environment fields. Do not build an environment switch, a Test/Live badge, or read `is_production` from merchant/service data.
- **Staging vs production is a deployment concern**: the app is configured with one `DLT_ORIGIN` per deployment (test origin for dev/staging builds, production origin for production). Show a small, non-data "Connected to: Test API / Production API" indicator in the footer or user menu, derived from app config, so developers never mistake which backend they are on.
- Historical transactions are all readable regardless of their retired classification; the UI makes no assumption about test vs live.
- **Currency:** metrics and charts require exactly one currency (no mixing). Default to `merchant.currency` from `GET /portal/merchant`; selector options come from `GET /api/v1/json/currency` (code field `cc`), cached server-side (e.g. 1 h). If the catalogue is unavailable, fall back to the merchant currency only.
- **Time zone:** reporting default `Asia/Manila` (matches the API default), user-overridable (IANA names only; the API rejects numeric offsets). All `from`/`to` values sent are full ISO 8601 instants with seconds and explicit offset, computed with Luxon, `from < to`, start-inclusive and end-exclusive.
- **Money:** decimal strings with currency. No `parseFloat` for business math. Convert to `Number` only at the last step for chart plotting.
- **Nulls are valid:** amount, brand, `payment_method` (always null today), timestamps, history. Render "—"; hide columns that are entirely null (`payment_method`).

### 9.2 Dashboard (`/`)

Controls: currency, date range presets (Today, Last 7 days, Last 30 days, This month, Last month, Custom), time zone (in a "more" menu).

**Upstream calls per load (3):** `metrics`, `charts?interval=day`, `transactions?per_page=10`.

| Widget | Source | Notes |
| --- | --- | --- |
| KPI: Total collected | `metrics.collection_total` | Gross, **before fees**; tooltip says so. Not net settlement. |
| KPI: Transactions | `transaction_count` | |
| KPI: Success rate | `success_rate_percent` | `null` shows "No transactions"; `"0.00"` shows 0% |
| KPI: Pending / Rejected | `pending_count`, `rejected_count` | |
| Collection trend | `charts.buckets[].collection_total` | Daily bars/area; `partial=true` buckets visually marked |
| Transaction volume by status | buckets: successful / pending / rejected | Stacked bar |
| Success rate trend | buckets: `success_rate_percent` | Line, gaps for `null` |
| Status mix | summary counts | Donut |
| Recent transactions | list page 1 | Link to `/transactions` with the same filters |
| Data freshness | `as_of` | "As of HH:mm". Metrics are **creation-cohort** based and pending items can change status later, so numbers can change on reload. Show this in a tooltip. |

Optional (flagged as extra call): "vs previous period" deltas using a second `metrics` call for the preceding range of equal length. Derived deltas are computed in the UI and labeled "derived".

Limits to enforce in the UI before calling: daily ≤ **366** buckets, monthly ≤ **120**, yearly ≤ **10**, total range ≤ 10 calendar years. Choose interval automatically on the dashboard (≤ 62 days → day, ≤ 24 months → month, otherwise year) so presets never exceed limits.

### 9.3 Transactions (`/transactions`)

**Filters (all URL-synced, applied with AND):**

| Filter | Param | Notes |
| --- | --- | --- |
| Date range | `from`, `to` | **paired**: both or neither. Applies to creation time. |
| Status | `status` | `PAID` / `PENDING` / `REJECTED` |
| Merchant reference (exact) | `merchant_transaction_id` | max 100 chars |
| Reference search (contains) | `query` | max 100 chars |
| Currency | `currency` | optional on list |
| Payment brand | `payment_brand` | exact stored value, max 100 chars |
| Page / size | `page`, `per_page` | 10, 25, 50, 100 |

Behaviors:

- Sort is fixed by the API (`created_at DESC, id DESC`); do not offer column sorting.
- Changing any filter resets to page 1. Offset pagination can shift as new data arrives (no frozen snapshot); show a subtle "list updated" hint when `meta.total` changes between pages.
- Empty result: friendly empty state with a "Clear filters" action; this is `200` with `data: []`, not an error.
- Columns: Merchant reference, Amount + currency, Status (badge), Payment brand, Created (in selected time zone), History indicator (`history_available`). Row click opens detail.
- Do not claim a transaction is "paid" from anything other than `status`.
- Per-page CSV export of the **currently loaded page** (client-side, no extra API calls) is allowed. A full-result export is out of contract (section 16).

### 9.4 Transaction detail and history (`/transactions/:id`)

**Summary tab:** all fields of the transaction object (internal ID, merchant reference, amount/currency, status, brand, created/updated, history availability).

**History tab** (`/history`, paginated, chronological ascending):

- Header with `meta.coverage` for the four event kinds: `merchant_request`, `dlt_response`, `merchant_webhook_request`, `merchant_webhook_response`. Badges: `captured`, `not_captured`, `purged`.
- Timeline items show event type and direction (merchant to DLT / DLT to merchant), `captured_at`, `http_status`, `attempt_number`, `delivery.state`/`duration_ms`, and `capture_status` (`available`, `omitted`, `unavailable`, `purged`).
- Expandable read-only payload viewer (JSON) for `capture_status=available`. Show `omissions` as a footnote ("Some fields are intentionally not shown").
- Retention footer: `retain_until`, `purged_at`.
- **Wording requirements** (the API is explicit about these):
  - Payloads are *sanitized, allowlisted projections*, not raw traffic.
  - "Queued" or "prepared for return" does **not** prove merchant receipt or payment success.
  - Webhook HTTP success does not prove business success.
  - Absence of history means "not captured", not "nothing happened"; coverage is currently limited to supported APN hosted checkout and qualifying legacy flows, and other providers can show empty history.
- Never offer replay, resend, or reconstruct events from transaction fields. Nothing in the UI may imply it can re-run a payment request.
- Detail pages show `404` as "Not found", never hinting at other merchants.

### 9.5 Reports (`/reports`)

**Inputs:** currency (required), date range (required, from/to), time zone, optional `payment_brand`, interval (`day` | `month` | `year`).

**Upstream calls (2):** `metrics` and `charts`, with identical filters (the summary rejects `interval`; neither accepts status/search/pagination fields. Build separate query objects, never one shared object).

**Output:**

1. KPI strip: totals from `charts.data.totals` (reconcile with buckets). Overall success rate uses overall counts, never an average of bucket rates.
2. Charts: collection amount (bars), counts by status (stacked), success-rate (line).
3. Table: one row per bucket (`period`, collection total, count, successful, pending, rejected, success rate, partial flag), plus a totals row.
4. CSV download of the bucket table (client-side).
5. Derived analytics, clearly labeled "derived in dashboard": average ticket size (`collection_total / successful_count`, decimal math), best/worst day by collection, peak success-rate period.
6. Notes panel explaining: creation-time basis, gross before fees, no refund/reversal accounting, pending items can resolve later, DST days can be 23/25 hours.

**Edge handling:**

- `422` with an `interval` field error when bucket limits are exceeded: show a message suggesting a coarser interval or shorter range (never truncate silently).
- `503` (paid transactions with null amounts, or currency catalogue down) is a DLT-side issue: show "Report temporarily unavailable" with a request ID, not a retry loop.
- Empty buckets show zero totals and "No transactions" for the rate.

Analytics deliberately **not** included because the API has no endpoint for it: breakdown by payment brand (brand filter exists, but no group-by), hourly distribution (minimum interval is a day), refunds/chargebacks, settlement and fees. Listed as asks in section 16.

### 9.6 Account (`/settings/profile`, `/settings/security`)

- **Profile:** edit `first_name`, `last_name` (1–50 chars), `email`. PATCH sends only changed fields. If the response carries `pending_email`, show a banner with expiry and an OTP form (6 digits, **string**, leading zeros preserved) plus "Resend code".
  - OTP/link expires in 15 min; after five wrong attempts the API returns `429`: prompt to resend.
  - Sending the current email cancels a pending change.
  - Duplicate email returns `422` with an `email` field error.
  - Email can also be verified via link; DLT redirects to `/?email_verification=verified|invalid`: show a toast, strip the param, refetch profile.
  - Role, merchant and username are read-only.
- **Security:** change password (`current_password`, `password`, `password_confirmation`). Policy: 12–128 chars with upper, lower, number and symbol. Show the policy inline, but DLT remains the authority. Success destroys the session and redirects to login.

### 9.7 Merchant (`/settings/merchant`)

- View: name, contact person, email, phone (`dial_code` + `phone`), address, website, currency, `is_active`, enabled `services` (id, code, type, `is_active`), logo.
- Admin edit: `name` (1–150), `contact_person` (1–100), `email`, `dial_code` (≤ 8), `phone` (≤ 30), `address` (≤ 500), `website` (HTTPS only, ≤ 2,048, nullable). Send only changed fields; at least one is required. Merchant email is a business contact, not the user's login email.
- Logo: upload (admin), delete (`204`, idempotent). Use the returned URL; `url: null` shows a placeholder.
- Read-only by design: currency, activation, production flag, services, fees, settlement and provider settings (DLT-controlled).

### 9.8 Team (`/settings/team`)

- **Members** (both roles can view): name, email, role, `is_active`, `joined_at` (note: currently the account creation date, not the acceptance date).
- **Admin actions:** change role (`administrator` / `developer`), remove member.
  - `409 LAST_ADMINISTRATOR`: explain the sole active admin cannot be demoted/removed.
  - Actual role change or removal revokes that user's tokens. Warn before confirming. Self-demotion/removal ends the current session.
- **Invitations** (admin only): list with status filter (`pending`, `accepted`, `expired`, `revoked`), invite (`email`, `role`), resend, revoke.
  - `201` can include `sent: false`: show "Saved, email not sent; Resend". **Do not auto-create another invitation.**
  - Invitations are valid 48 h. Handle `409 MEMBER_ALREADY_EXISTS`, `INVITATION_ALREADY_PENDING`, `USER_BELONGS_TO_ANOTHER_MERCHANT`, `USER_NOT_ELIGIBLE`, `USER_IDENTITY_CONFLICT`; `410 INVITATION_UNAVAILABLE`.
- **Acceptance page** (public): two forms.
  - New account: `first_name`, `last_name`, `password`, `password_confirmation`.
  - Existing detached account: `current_password` only. Send no extra fields.
  - Success returns no PAT, so send the user to login. After `410`, tell them to ask the admin to resend; do not resubmit the same proof. The BFF uses Basic app credentials here, **not** a Bearer.

### 9.9 Developer (`/settings/developer`)

**Machine API clients** (server-to-server credentials for the merchant's own backend):

- List (both roles): label, `is_active`, created, last used, revoked, rotation deadline, replaces.
- Admin: issue (`label` 3–100, unique, `reason` 10–500, `current_password`), rotate (+ `overlap_minutes` 5–10,080), revoke (`reason`, `current_password`).
- **Secret handover:** after issue/rotate, a 5-minute, issuer-only delivery is created. The UI prompts for the admin password and calls consume once, then displays `oauth_client_id`, `oauth_client_secret`, `grant_type`, `token_url` in a one-time reveal (section 7 item 8). `410` means expired/consumed: issue or rotate again.
- **No automatic retry** of issue, rotate or consume after a timeout/ambiguous failure: refetch the client list first (the issuer's `delivery` reference lets them recover).
- Revocation is irreversible and kills the client's tokens: type-to-confirm dialog.
- Labels stay reserved after revocation.

**Web-integration keys:** show presence flags (`has_authentication_token`, `has_secret_key`) and `updated_at`. Values can never be read back. Admin can replace (`value` ≤ 4,096 chars, preserved byte-exact including spaces, `reason`, `current_password`) or delete (`DELETE` with JSON body, `204`). Explain that `secret_key` signs webhook notifications and that queued events retain the earlier key version.

**Do not confuse** the three credential types in copy and layout: Portal login (this app), machine OAuth client, web-integration key.

---

## 10. Cross-cutting UI behavior

### 10.1 Error handling matrix

| HTTP | Handling |
| --- | --- |
| 401 | End session, go to login (except login's own `INVALID_CREDENTIALS`) |
| 403 | Permission message; do not retry login; never invent a merchant selector |
| 404 | "Not available for this account"; no cross-merchant hints |
| 409 | Refresh affected state, show the reason by `error_code` |
| 410 | One-time proof/delivery is gone: guide to obtaining a new one |
| 422 | Bind `errors` to form fields, preserve user input |
| 429 | Honor `Retry-After`, disable the triggering control for that time |
| 500 / 503 | Generic retryable message with request ID, no internals |

### 10.2 Forms

- Disable the submit button while pending; mutations are never double-submitted.
- On network timeout for a mutation, show "We couldn't confirm the result": offer *Refresh state* rather than *Retry*.
- Sensitive forms (`current_password`) clear the password field after every attempt.

### 10.3 Accessibility, responsiveness, i18n

WCAG 2.1 AA target; keyboard-navigable tables and dialogs; status shown by text and color, not color alone; responsive down to 360 px; tables scroll within their container. Locale `en-PH` by default (formatting via `Intl`), copy kept in a message catalogue so translation is possible later.

---

## 11. Rate-limit-aware data loading

The DLT backend owns rate limiting (API default 60 requests/minute per user; separate stricter limits on profile PATCH (3/min), OTP verify (10/min), password change (6/min), credential/team mutations (5/min), login (5/min)). This app must be a *good citizen*, not a limiter.

### 11.1 Rules

1. No polling or auto-refresh by default. Provide a manual **Refresh** button and the "as of" label.
2. Parallelize only the calls a page needs (dashboard: 3, reports: 2). Do not prefetch other pages.
3. Configure `shouldRevalidate` so a mutation on one page doesn't refetch unrelated loaders (React Router revalidates all active loaders after any action by default).
4. Debounce text filters (`query`, `merchant_transaction_id`) by about 400 ms before navigating.
5. Cache only public reference data (currency catalogue) globally. Profile/merchant are fetched per session and stored in the session only as needed (role, name). Everything else is fetched fresh.
6. On `429`, surface the delay and stop; do not queue retries.

### 11.2 Retry policy

- **Reads** (GET collections/metrics/charts/history/lists): up to 2 retries with exponential backoff and jitter on network errors, `502/503/504`. Never on `4xx`. Retry must respect the current session and filter version.
- **Mutations**: never auto-retried.

### 11.3 Shared-IP concern

Because every browser request reaches DLT from the BFF's address, any limiter keyed by IP (public reset-link route at 30/min, login by app + identity + IP, invitation acceptance at 5/min per IP) can be exhausted collectively. Ask DLT either to key by forwarded client IP (this app would send `X-Forwarded-For` and DLT would trust the BFF), or to allowlist the BFF for those limiters. **Do not add a limiter in this app to work around it**; the policy is DLT's.

---

## 12. Project structure

```
app/
  root.tsx
  routes.ts                      # route config
  routes/
    public.login.tsx
    public.forgot-password.tsx
    public.reset-password.tsx
    public.team.invitations.accept.tsx
    app._index.tsx               # dashboard
    app.transactions._index.tsx
    app.transactions.$id.tsx     # summary + history tab
    app.reports.tsx
    app.settings.profile.tsx
    app.settings.security.tsx
    app.settings.merchant.tsx
    app.settings.team.tsx
    app.settings.developer.tsx
    app.logout.tsx
    healthz.ts
  .server/
    env.ts                       # Zod-validated env, fails fast
    session.ts                   # storage, encrypt/decrypt, rotation, requireUser/requireRole
    csrf.ts
    security-headers.ts
    logger.ts                    # redaction
    dlt/
      client.ts                  # fetch wrapper, timeouts, error normalization
      errors.ts
      schemas.ts                 # Zod schemas for every response
      auth.ts  profile.ts  merchant.ts  credentials.ts
      team.ts  collections.ts  reporting.ts  reference.ts
  components/                    # ui primitives, charts, tables, status badges
  lib/
    money.ts  dates.ts  filters.ts  csv.ts  intervals.ts
tests/
  unit/  contract/  e2e/
  fixtures/                      # JSON taken from API doc examples
```

---

## 13. Configuration

| Variable | Purpose |
| --- | --- |
| `DLT_ORIGIN` | DLT API origin for the deployment this build talks to (test vs production, never hard-code) |
| `DLT_PORTAL_CLIENT_ID`, `DLT_PORTAL_CLIENT_SECRET` | Portal ecosystem application credentials (login, invitation accept) |
| `DLT_APPLICATION_CODE` | Value for `X-DLT-Application` (expected `merchant_portal`) |
| `APP_ORIGIN` | This app's public origin, must match DLT's allowed origin and `APP_MERCHANT_URL` |
| `APP_BASE_PATH` | Optional React Router `basename` |
| `SESSION_SECRETS` | Comma-separated keys (first encrypts, all decrypt) |
| `REDIS_URL` | Session store (prod) |
| `DEFAULT_TIMEZONE` | Defaults to `Asia/Manila` |
| `LOG_LEVEL` | |

Testing-only (never committed, loaded from CI secrets): `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_DEVELOPER_EMAIL`, `E2E_DEVELOPER_PASSWORD`, `E2E_MERCHANT_REFERENCE`, `DEV_SMOKE_PAT`.

`env.ts` validates everything at boot and refuses to start if a secret is missing. Secrets never appear in `import.meta.env` / `VITE_*`.

---

## 14. Testing strategy

| Layer | Scope |
| --- | --- |
| Unit | date/instant conversion and DST, bucket-limit calculator, money formatting, filter ↔ URL parsing, CSV builder, redaction |
| Contract | MSW handlers built from the API doc's example payloads; Zod schemas must parse them; includes `204`, null amounts, `sent:false`, `error_code`-less legacy errors |
| Integration | Loaders/actions with mocked DLT: login mapping, 401 session teardown, 429 handling, role refusal in BFF |
| Security | Cookie flags, CSRF rejection, no secret in rendered HTML/bundles (grep the build), no PAT in logs, open-redirect rejection |
| E2E (Playwright) | Against the DLT test deployment: login → dashboard → filter transactions → detail/history → reports → logout, for both Admin and Developer; Developer cannot see/perform admin actions |
| Smoke | Script using `DEV_SMOKE_PAT` calls `GET /portal/me` to verify origin and connectivity |

---

## 15. Delivery plan

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| **0. Foundations** | Repo, CI, env validation, DLT client, error model, session store, CSRF, headers, layout shell, MSW fixtures | Smoke call to `GET /portal/me` succeeds; secrets never reach the client |
| **1. Access** | Login/logout, `requireUser/requireRole`, forgot/reset password, session expiry UX | Admin and Developer can log in against the DLT test env; expiry and 401 flows verified |
| **2. Core insight** | Dashboard, transactions list, detail, history, reports | A merchant can answer "how much did we collect, what failed, and what happened to order X" in both modes |
| **3. Account** | Profile, email verification, password change, merchant profile/logo | Email change round-trip with OTP and with link redirect |
| **4. Team** | Members, roles, invitations, acceptance page | Invite → email → accept → login works; last-admin and `sent:false` paths handled |
| **5. Developer** | Machine clients, secret handover, integration keys | One-time secret never persisted; no auto-retry on ambiguous failure |
| **6. Hardening** | A11y pass, perf, logging/alerts, pen-test checklist, runbook | Section 7 checklist signed off |

Phases 1 and 2 are the minimum viable release.

---

## 16. Open questions and requests for DLT

1. **Credentials:** register this app's origin(s) for the Portal application, confirm the `merchant-portal` scope is granted, and confirm the role (Administrator or Developer) of the dummy user. A Developer user is wanted later for role-gating tests.
2. **`APP_MERCHANT_URL`:** set it to this app's URL (including any base path) for each deployment so reset, verification and invitation links land correctly.
3. **Shared IP limiters:** forwarded-IP trust or allowlist for the BFF (section 11.3).
4. **Deployments:** test and production API origins (supplied); synthetic Administrator and Developer users with transactions on the test deployment (one dummy merchant user supplied, Developer pending).
5. **PAT lifetime:** is 60 min configurable for this application? Any plan for a refresh mechanism? Today users must re-login hourly.
6. **Numeric IDs:** confirm maximum size of transaction/member/client IDs (JS safe-integer risk), or agree on string transport.
7. **Timestamps:** confirm the database timezone assumption (`Asia/Singapore`) is valid for legacy/imported data, since list date filters depend on it.
8. **Aggregations:** request a group-by-payment-brand metrics endpoint and, if wanted, hourly granularity for the analytics page.
9. **Export:** is a server-side CSV export of filtered transactions on the roadmap? (A client-side loop over pages would be rate-limit-hostile.)
10. **Logo hosting:** confirm public file serving is configured so logo URLs resolve.
11. **History coverage:** timeline for when providers beyond APN hosted checkout will have history; until then the UI must communicate partial coverage.

---

## Appendix A: Screen to endpoint map

| Screen | Endpoints |
| --- | --- |
| Login | `POST /auth/login`, `GET /portal/me` |
| Dashboard | `GET /portal/collections/metrics`, `/charts`, `/transactions`; `GET /portal/merchant` (currency default); `GET /json/currency` |
| Transactions list | `GET /portal/collections/transactions` |
| Transaction detail | `GET /portal/collections/transactions/{id}`, `/history`, `/history/{historyId}` |
| Reports | `GET /portal/collections/metrics`, `/charts` |
| Profile | `GET`, `PATCH /portal/me`, `POST /portal/me/email/verify`, `/resend` |
| Security | `PUT /portal/me/password` |
| Merchant | `GET`, `PATCH /portal/merchant`, logo `GET/POST/DELETE` |
| Team | `GET /portal/team/members`, `PATCH`, `DELETE`; invitations `GET/POST/resend/DELETE`; `POST /portal/team/invitations/accept` |
| Developer | machine-clients `GET/POST/rotate/revoke`, credential-deliveries `consume`, integration-keys `GET/PUT/DELETE` |
| Forgot / reset | `POST /auth/reset-password/reset-link`, `/new-password` |

## Appendix B: Response contracts to model in Zod

- Standard envelope: `{ success, message, data }`; paginated adds `meta { current_page, per_page, total, last_page }`; history list adds `meta.coverage`.
- Error envelope: `{ success:false, error_code, message, errors? }`, with fallback for legacy shapes.
- Login: `data { access_token, token_type, expires_at, user }`.
- Transaction: `id, merchant_transaction_id, amount|null, currency, status, payment_brand|null, payment_method|null, created_at, updated_at, history_available`.
- Metrics: `currency, timezone, from, to, as_of, date_basis, collection_total, transaction_count, successful_count, pending_count, rejected_count, success_rate_percent|null`.
- Charts: metrics fields + `interval`, `totals`, `buckets[] { period, from, to, partial, ...six metrics }`.
- History item: `id (ULID), transaction_id, event_type, direction, captured_at, capture_format, capture_status, event_id|null, attempt_number|null, http_status|null, delivery|null, response|null, payload|null, omissions[], retain_until, purged_at|null`.
- `204` responses: logo delete, integration-key delete, member remove, invitation revoke. Treat as success with no body.
