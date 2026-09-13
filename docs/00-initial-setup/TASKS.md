# Task List — Multi-Merchant DLT Payment Link Platform

Companion to `DESIGN.md`. Tasks are ordered by dependency; work top to bottom within a phase. Each task lists target files, what "done" means, and what it depends on. Written for an agentic coding tool to execute sequentially, checking items off as completed.

Conventions:
- `[ ]` not started · check off as `[x]` when acceptance criteria pass.
- File paths follow the directory structure in the spec (§9), extended per `DESIGN.md`.
- Every task that touches money, tokens, or PII must respect the logging allowlist (Phase 3) once it exists — do not `console.log` raw values in the meantime; use temporary sanitized logs if needed and remove before merging.

---

## Phase 0 — Project scaffolding

- [x] **0.1 Init Next.js + TypeScript project**
  Files: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`
  Done when: `npm run dev` serves a blank app; strict TypeScript enabled; App Router in use.

- [x] **0.2 Install dependencies**
  `nanoid`, `jose` (or equivalent JWE library supporting `dir`/`A256GCM`), `@upstash/redis`, `@upstash/ratelimit`, `zod` (for input validation), `shadcn/ui` + Tailwind.
  Done when: all imports resolve; Tailwind configured with the tokens in `DESIGN.md` §... (color table from spec §1) added to `tailwind.config.ts` / CSS variables.

- [x] **0.3 Directory scaffolding**
  Create the full tree from spec §9 (empty files with `TODO` markers are fine): `lib/`, `components/ui`, `components/forms`, `components/tables`, `app/(auth)/login`, `app/(dashboard)/dashboard`, `app/(dashboard)/transactions`, `app/pay/[token]`, `app/pay/[token]/verify`, `app/api/auth/{login,logout}`, `app/api/payment/{create-link,submit,sync,brands}`, `app/api/transactions`.
  Depends on: 0.1.

- [x] **0.4 Env template**
  File: `.env.example` — all vars from spec §10, unchanged (no new vars needed per `DESIGN.md` §6).
  Done when: app reads config via a single typed `lib/env.ts` (fail fast at boot if a required var is missing), not scattered `process.env` reads.

---

## Phase 0.5 — AI-ready development environment (Kiro, Antigravity, OpenCode)

Do this right after scaffolding, before any feature code. Goal: every one of the three tools you're actually using has the corrected DLT integration knowledge, the project conventions, and the right guardrails loaded — without three divergent copies of the same instructions drifting apart. Strategy: **author once, place per tool's native discovery path.** All three tools now implement (or are compatible with) the open **Agent Skills standard** (`SKILL.md` + frontmatter + optional `references/`), so the skill content is written once and copied/symlinked into each tool's own skills folder. Rules/instructions are the one place they genuinely differ, so those get a canonical root file plus a thin per-tool adapter.

- [x] **0.5.1 Canonical skill package** — `skills/dlt-hosted-checkout-api/` (repo root, not inside any tool-specific folder)
  Copy the uploaded skill (`SKILL.md` + `references/api-reference.md`) here as the single source of truth. Add an addendum section (or `references/design-corrections.md`) capturing the platform-specific deltas from `DESIGN.md` §1 — the embedded-credentials fix, the `/brands` step, the corrected submit field list — so the skill reflects *this* project's implementation, not just the generic DLT API.
  Also author `skills/payment-link-platform-conventions/SKILL.md` here: the JWE/`kid` rotation pattern and which secret pair to use for sessions vs. links; the shared `isTokenExpired`/`logEvent`/`sanitizeError` utilities and the rule that no route hand-rolls its own expiry check or raw `console.log`; the rate-limit table (spec §6.2 + the `brands` row from `DESIGN.md` §5); the CSRF rule (double-submit only on `create-link`/`submit`).
  Acceptance: both skills validate against the Agent Skills frontmatter spec (`name`, `description` required; `name` lowercase-hyphenated, matches its directory).

- [x] **0.5.2 Wire the canonical skills into each tool's discovery path**
  - **Kiro:** copy (or `git subtree`/symlink, whichever the team prefers for staying in sync) `skills/*` into `.kiro/skills/<name>/`. Kiro's default agent auto-loads everything under `.kiro/skills/` — no config needed. If you add any custom Kiro agents later, remember they *don't* load skills by default and need `"resources": ["skill://.kiro/skills/*/SKILL.md"]` added explicitly.
  - **OpenCode:** copy the same folders into `.opencode/skills/<name>/` (OpenCode's native project-local skill path; it also separately discovers `.claude/skills/` and `.agents/skills/` if you ever want a single copy shared with other tools instead of two).
  - **Antigravity:** Antigravity has no native SKILL.md discovery mechanism today — fold the *essential* points from both skills (the embedded-credentials rule, the 409/503 no-retry rule, the brands-fetch step) directly into `AGENTS.md` (0.5.3) as a dedicated "DLT integration — read before touching payment code" section, and keep a link back to `skills/dlt-hosted-checkout-api/references/api-reference.md` for the full field tables.
  Acceptance: open a session in each of the three tools and ask "what's the never-log allowlist for this project?" — all three should answer correctly from loaded context, not by being told to go search.

- [x] **0.5.3 Root `AGENTS.md`** (repo root)
  This is read natively by OpenCode (project `AGENTS.md`, merged with `~/.config/opencode/AGENTS.md`, project taking precedence) and is the file Antigravity-oriented tooling conventionally looks for; Kiro does not read it natively, so 0.5.4 mirrors its essentials into Kiro's own steering format rather than relying on Kiro picking it up.
  Contents: one-paragraph architecture summary (BFF, stateless JWE tokens, no app DB); the directory map from spec §9; the "state lives in three places" summary from `DESIGN.md` §2; the DLT integration section described in 0.5.2 for Antigravity's benefit (harmless redundancy for Kiro/OpenCode, which also have the full skill); the "never log" allowlist (spec §6.3 + `dlt_access_token`); the money/ID invariants (`DESIGN.md` §1.4); the hard rule "never auto-resubmit on 409/503"; commands to run (`npm run dev`, `npm run typecheck`, `npm test`, `npm run lint`, `npm run verify` — see 0.5.6).
  Acceptance: a fresh session in OpenCode or Antigravity, given only this file, can correctly state the storage model and the three forbidden-retry status codes without further searching.

- [x] **0.5.4 Kiro steering files** — `.kiro/steering/`
  - `product.md` with `inclusion: always` — a condensed version of `AGENTS.md` (0.5.3), since Kiro won't read that file on its own.
  - `dlt-payments.md` with `inclusion: fileMatch`, `fileMatchPattern: ["lib/dlt-*.ts", "app/api/payment/**", "app/pay/**"]` — the DLT-specific gotchas (embedded credentials, brands step, 409/503 handling), scoped so it only loads into context when payment code is actually being touched, keeping other sessions (e.g. dashboard UI work) lighter.
  Depends on: 0.5.3.

- [x] **0.5.5 MCP server configuration, per tool**
  - **Kiro:** `.kiro/settings/mcp.json` (project scope, takes precedence over `~/.kiro/settings/mcp.json`). Use `${VAR_NAME}` substitution for any secret — never a literal token in the committed file. Candidates: a GitHub MCP server for issue/PR workflow, and an Upstash-aware server (if one exists) for inspecting rate-limit keys during debugging.
  - **OpenCode:** the `mcp` block in `opencode.json` (project-committable). Same candidate servers; `type: "remote"` entries can read secrets via `{env:VAR_NAME}` templating, so the file itself stays secret-free.
  - **Antigravity:** MCP servers live in a config shared across all projects and the Gemini CLI — `~/.gemini/config/mcp_config.json` — *not* a per-repo file, and remote HTTP servers there use `serverUrl`, not `url` (stricter schema than the other two). Because this can't be committed to the repo, add a short `docs/antigravity-setup.md` documenting exactly which server entries a new teammate should paste in by hand, with secrets referenced by name only (never pasted into the doc).
  Acceptance: for Kiro and OpenCode, `git grep` for anything that looks like a raw secret in `.kiro/settings/mcp.json` / `opencode.json` returns nothing; `docs/antigravity-setup.md` exists and a new teammate can follow it without asking anyone what the entries mean.

- [x] **0.5.6 Agent self-verification script**
  Add `npm run verify` = typecheck + lint + unit tests + a grep-based logging-allowlist check (formalize task 8.1 as `scripts/check-no-raw-logging.sh`, failing if `console.log`/`console.error` appears outside `lib/logger.ts`). Reference it from `AGENTS.md` (0.5.3) and the Kiro `product.md` steering file (0.5.4) as "run this before considering any task done," and — since OpenCode supports custom slash commands — add `.opencode/command/verify.md` that simply shells out to it.
  Depends on: 0.5.3, 0.5.4 (full green pass only happens once Phase 8 lands — expected at this point).

- [x] **0.5.7 Permissions / tool allowlists, per tool**
  - **OpenCode:** set a `permission` block in `opencode.json` — deny `edit` on `.env*` paths, require explicit allow for `bash` beyond `npm`/`git`/test commands, and (once native skills ship in your OpenCode version) scope `permission.skill` to just the two skills from 0.5.1 rather than `"*": "allow"`.
  - **Kiro:** set `.kiro/settings/permissions.yaml` (project scope) with the equivalent restrictions — same deny-list on `.env*` edits, same bash scoping.
  - **Antigravity:** there's no committable per-repo permissions file today; this is controlled via the IDE's Agent Manager settings (trust level / Planning vs. Fast mode) per workspace. Note the required manual setting in `docs/antigravity-setup.md` (0.5.5) rather than skipping it.
  Acceptance: a deliberately careless prompt to edit `.env.local` directly, or to force-push, is blocked or requires explicit confirmation in each tool.

- [x] **0.5.8 Kiro hook: secret/log guard**
  Add a `.kiro/hooks/` pre-commit-style hook (Kiro supports pre/post tool-use hooks) that blocks any staged change containing a bare `client_secret`, `access_token`, or `dlt_access_token` string literal outside `lib/*.ts` type definitions, and blocks raw `console.log`/`console.error` outside `lib/logger.ts` — the same rule as 0.5.6's script, but enforced at edit-time instead of only at CI-time.
  Depends on: 0.5.6 (reuse the same grep logic rather than writing it twice).

- [x] **0.5.9 Antigravity artifact alignment**
  Antigravity's distinguishing behavior is that agents produce **Artifacts** (implementation plans, task lists, diffs, browser recordings) as reviewable receipts rather than a bare chat log. Note in `AGENTS.md` (0.5.3) that each phase in this task list should map to one Antigravity implementation-plan artifact, and that task **8.5 (end-to-end happy path)** specifically should be run in Antigravity's Planning/browser-driving mode so it produces a **browser recording artifact** of the full login → create-link → pay → verify flow — a strictly better deliverable there than a text-only test report.
  Depends on: Phase 8 existing (informational note only — no blocking dependency).

---

## Phase 1 — Cryptography & shared utilities

- [x] **1.1 JWE crypto core** — `lib/crypto.ts`
  Implement `encryptJWE(payload, secretCurrent, kid)` / `decryptJWE(token, { current, previous }) → { payload, kid }`.
  - `alg: "dir"`, `enc: "A256GCM"`.
  - Secrets are base64url 32-byte values decoded to raw bytes.
  - `kid` in JWE header selects which secret to try; falls back to `PREVIOUS` on `kid` mismatch with `CURRENT`, throws if neither matches.
  - Include `token_version` claim in the payload; decrypt function throws a distinct `UnsupportedTokenVersionError` if it doesn't match the current schema version (don't silently coerce).
  Acceptance: unit tests cover — round-trip encrypt/decrypt, `kid` rotation (encrypt with `PREVIOUS`, decrypt succeeds), tampered ciphertext fails, wrong secret fails, `token_version` mismatch throws.

- [x] **1.2 Session codec** — `lib/session.ts`
  `createSessionCookie(payload: SessionPayload)`, `readSessionCookie(cookieValue)`. Uses `SESSION_APP_SECRET_CURRENT/PREVIOUS` via 1.1. Sets/reads `dlt_session` (`HttpOnly`, `Secure`, `SameSite=Lax`).
  Depends on: 1.1.

- [x] **1.3 Link token codec** — `lib/link-token.ts`
  `createLinkToken(payload: PaymentLinkPayload)`, `readLinkToken(token)`. Uses `LINK_APP_SECRET_CURRENT/PREVIOUS`. Includes `expires_at`/`isTokenExpired` shared utility (see 1.4).
  Depends on: 1.1. Uses the **corrected** `PaymentLinkPayload` shape from `DESIGN.md` §3.2 (includes `merchant_account_id`, `service_code`, `dlt_access_token`).

- [x] **1.4 Expiry utility** — `lib/expiry.ts`
  `isTokenExpired(payload: { expires_at?: number }): boolean` — exclusive boundary (`now >= expires_at` ⇒ expired; no `expires_at` ⇒ never expires, only valid for sessions if applicable). Single shared implementation used by every token-accepting route (spec §6.4).

- [x] **1.5 Logger** — `lib/logger.ts`
  `logEvent(eventName: string, fields: AllowlistedFields)` — typed so only allowlisted keys compile (spec §6.3, extended per `DESIGN.md` §5 to also forbid `dlt_access_token`). `sanitizeError(err): { name, message, code? }` for use in every `catch` block.
  Acceptance: attempting to pass a non-allowlisted key (e.g. `email`, `access_token`, `dlt_access_token`) is a **type error**, not just a runtime check.

- [x] **1.6 CSRF utilities** — `lib/csrf.ts`
  `issueCsrfToken()` (32-byte base64url, sets non-HttpOnly `csrf_token` cookie), `validateCsrf(request)` (compares header `x-csrf-token` to cookie; also does Origin/Referer check for all state-changing routes).
  Depends on: nothing beyond 0.x.

- [x] **1.7 Rate limiter** — `lib/rate-limit.ts`
  Thin wrapper over `@upstash/ratelimit` with one exported limiter per row in the rate-limit table (spec §6.2 + the added `brands` row in `DESIGN.md` §5). Each limiter takes a `key` (IP, `link_id`, or session id) and returns `{ success, remaining }`.
  Depends on: Upstash env vars (0.4).

- [x] **1.8 Money validation** — `lib/money.ts`
  `isValidAmount(amount: string): boolean` — regex `^\d{1,10}\.\d{2}$` **and** numeric bound `0 < amount <= 500000.00`, computed via integer-cents comparison (never `parseFloat` on the canonical value). `formatDisplayAmount(amount: string): string` for UI only (may use `Intl.NumberFormat`).
  Acceptance: rejects `"0.00"`, `"500000.01"`, `"12.5"`, `"abc"`; accepts `"1500.00"`, `"500000.00"`.

- [x] **1.9 Merchant transaction ID generator** — `lib/merchant-txn-id.ts`
  `generateMerchantTransactionId(): string` — `nanoid` restricted to `[A-Za-z0-9_-]`, length ≤ 45 (`DESIGN.md` §1.4).
  Acceptance: 1000-run property test — every output matches `/^[A-Za-z0-9_-]{1,45}$/`.

---

## Phase 2 — DLT client

- [x] **2.1 DLT HTTP wrapper** — `lib/dlt-client.ts`
  Functions:
  - `getAccessToken({ client_id, client_secret }): Promise<{ access_token, expires_in }>` → `POST /oauth/token`.
  - `getBrands({ access_token, merchant_account_id, service_code }): Promise<Brand[]>` → `GET /api/v1/collection/apn/brands`.
  - `submitPayment({ access_token, ...payload }): Promise<SubmitResult>` → `POST /api/v1/collection/apn/submit`. Payload shape = `DESIGN.md` §1.3 exactly (all fields, including `time_offset: "+08:00"` and `channel: 4` hardcoded here, not passed in by callers).
  - `syncPayment({ access_token, merchant_transaction_id }): Promise<{ payment_status, provider_message?, timestamp }>` → `POST /api/v1/collection/apn/sync`.
  - Every function throws typed errors distinguishing: `DltAuthError` (401/403), `DltRateLimitError` (429), `DltConflictError` (409, submit only), `DltAmbiguousError` (503, submit only), `DltValidationError` (`success:false` + `errors[]`), `DltUnavailableError` (5xx/timeout/network).
  - **Never auto-retry on 409/503.** A single 401-retry-once is only applicable where a fresh token can plausibly be obtained (login flow) — not for brands/submit/sync calls made via an embedded link token per `DESIGN.md` §1.5.
  Acceptance: unit tests with mocked `fetch` cover every status branch above; confirm no field named in `DESIGN.md` §1.3 is missing from the submit request builder.

- [x] **2.2 DLT base URL sanity check**
  Confirm `DLT_API_BASE_URL` in `.env.example` resolves to the real v4.0 base (`https://checkout.dxp.dtic.com.ph`) rather than a placeholder domain, and that route builders in 2.1 append `/oauth/token`, `/api/v1/collection/apn/brands`, `/api/v1/collection/apn/submit`, `/api/v1/collection/apn/sync` correctly.
  Depends on: 2.1.

---

## Phase 3 — Auth & session routes

- [x] **3.1 `POST /api/auth/login`**
  Input: `{ client_id, client_secret, merchant_account_id, service_code }` (zod-validated). Calls `getAccessToken` (2.1). On success: build `SessionPayload` (§3.1 of `DESIGN.md`), `expires_at = issued_at + min(expires_in_ms, 86_400_000)`, set `dlt_session` (1.2) + issue `csrf_token` (1.6). On failure: branch per spec §2.4 table (401/403, 429, 5xx/timeout, network failure → distinct messages). `client_id`/`client_secret` must not exist in scope after this handler returns — do not stash on any longer-lived object.
  Protections: Origin/Referer check (1.6), rate-limited 5/5min per IP (1.7).
  Depends on: 1.2, 1.6, 1.7, 2.1.
  Acceptance: integration test hits each DLT response branch (mocked) and asserts the correct app-facing message; asserts `client_secret` never appears in the response, cookie, or any log call.

- [x] **3.2 `POST /api/auth/logout`**
  Clears `dlt_session` and `csrf_token`. Origin/Referer check only.
  Depends on: 1.2, 1.6.

- [x] **3.3 Dashboard session barrier** — `app/(dashboard)/layout.tsx`
  Redirects to `/login` if `dlt_session` is absent/invalid/expired.
  Depends on: 1.2, 1.4.

- [x] **3.4 `/login` page** — `app/(auth)/login/page.tsx`
  Form for `client_id`, `client_secret`, `merchant_account_id`, `service_code`; posts to 3.1; renders the distinct error messages from §2.4 verbatim.
  Depends on: 3.1.

---

## Phase 4 — Payment link creation

- [x] **4.1 `POST /api/payment/create-link`**
  Input: subset of `PaymentLinkPayload` fields + labels (zod-validated against per-field max lengths from spec §3.1). Requires valid `dlt_session` (3.3-equivalent check inside the route) + CSRF (1.6, double-submit) + rate limit 30/hr per session (1.7).
  Process: validate → `generateMerchantTransactionId()` (1.9) → build corrected `PaymentLinkPayload` (**embedding `merchant_account_id`, `service_code`, `access_token` copied from the decrypted session** — `DESIGN.md` §1.1/§3.2) → `createLinkToken` (1.3) → build final URL → measure length against `MAX_LINK_URL_LENGTH`; reject with 4xx + clear message if exceeded.
  Depends on: 1.1–1.9, 3.1–3.3.
  Acceptance: created link, when decrypted, contains a usable `dlt_access_token` that independently authenticates against DLT (verified via a mocked/staging call) — i.e., the anonymous-payor gap from `DESIGN.md` §1.1 is closed. Also test the long-payload case (long `product_description` + labels) to confirm the length-guard actually fires before hitting DLT.

- [x] **4.2 Link creation form + label settings** — `components/forms/link-create-form.tsx`, `components/forms/label-settings-modal.tsx`
  Amount input using `lib/money.ts` (1.8) for client-side pre-validation (server remains authoritative). Label overrides persisted to `window.localStorage['dlt_payee_label_preferences']` (spec §4.1, unchanged).
  Depends on: 1.8, 4.1.

- [x] **4.3 Dashboard "Create Payment Link" tab** — `app/(dashboard)/dashboard/page.tsx`
  Wires 4.2's form to 4.1, renders the generated link output card (copy URL, QR code).
  Depends on: 4.2.

---

## Phase 5 — Payor flow (brands, billing, submit)

- [ ] **5.1 `GET /api/payment/brands`**
  Input: `token` query param. Decrypt (1.3), check expiry (1.4) → reject with a clear "link invalid/expired" response if failed. Otherwise call `getBrands` (2.1) using the token's embedded credentials. Return `{ value, code, image, is_card }[]` unmodified. Rate-limited 20/min per `link_id` (1.7). Origin/Referer check only — no double-submit CSRF token (read-only).
  Depends on: 1.3, 1.4, 1.7, 2.1.
  Acceptance: expired token → 4xx before any DLT call is made; brand codes are passed through byte-for-byte, never logged, never persisted.

- [ ] **5.2 `GET /pay/[token]` page**
  Decrypt token server-side; on failure/expiry render a 404/"invalid link" view (no leakage of *why* it's invalid beyond generic messaging). On success, render the checkout form: brand picker (fed by 5.1) + billing form (5.3). No `/sync` call here (spec §4.2, unchanged — transaction doesn't exist yet).
  Depends on: 1.3, 1.4, 5.1.

- [ ] **5.3 Payor billing form** — `components/forms/payor-billing-form.tsx`
  Corrected structured fields per `DESIGN.md` §3.3: `first_name`, `last_name`, `email`, `phone` (optional), `address_line_one`, `address_line_two` (optional), `city_municipality`, `state_province_region`, `country_code` (default `"PH"`), `postal_code`. Plus brand selection state from the picker in 5.2. Client-side zod validation matching DLT's field limits (spec's reference field-length table).
  Depends on: 5.2.

- [ ] **5.4 `POST /api/payment/submit`**
  Input: `{ token, payor: PayorBillingDetails, payment_brand, payment_brand_code }`. Process: decrypt token (1.3), check expiry (1.4, no exceptions), pull `merchant_transaction_id`/credentials from payload (never regenerate the ID — spec §3.2), build the DLT request per `DESIGN.md` §1.3 (server hardcodes `time_offset` and `channel`), call `submitPayment` (2.1).
  - `200` → `{ payment_url }`.
  - `409` (`DltConflictError`) → distinct error, no retry.
  - `503` (`DltAmbiguousError`) → distinct error directing the client to `/pay/[token]/verify`, no retry.
  - `401` (`DltAuthError`) → the "link temporarily unavailable" message from `DESIGN.md` §1.1, logged (allowlisted fields only) for merchant follow-up.
  Protections: Origin/Referer + double-submit CSRF (1.6), expiry check, rate-limited 5/min per `link_id` + IP cap (1.7).
  Depends on: 1.3, 1.4, 1.6, 1.7, 2.1, 5.3.
  Acceptance: integration tests for every branch above (mocked DLT); confirm no auto-resubmit occurs on 409/503 even under simulated rapid double-click.

- [ ] **5.5 Redirect handling**
  On `submit` success, redirect the payor's browser to `data.payment_url` (external DLT domain) — implement as a real `window.location` navigation, not a framework-level client-side route push (`payment_url` is off-origin).
  Depends on: 5.4.

---

## Phase 6 — Verification & polling

- [ ] **6.1 `POST /api/payment/sync`**
  Input: `{ token }` only — `merchant_transaction_id` is recovered server-side from the decrypted token, never accepted from the client (spec §5.1). Expiry check strict, no exception for in-flight payments (spec §6.4). Calls `syncPayment` (2.1). Output: `{ status, provider_message?, timestamp }`.
  Protections: Origin/Referer check, rate-limited 20/min per `link_id` (1.7).
  Depends on: 1.3, 1.4, 1.7, 2.1.

- [ ] **6.2 `/pay/[token]/verify` page — polling state machine**
  Implement exactly per spec §5.2: 1 immediate call + 5 retries (6 total), backoff `1s,2s,4s,8s,16s` with full jitter (`Math.random() * base_delay`), 60s hard wall-clock ceiling independent of attempt count, `PAID`/`REJECTED` stop polling immediately (terminal), exhaustion renders "Verification Delayed" + debounced manual retry (single immediate call, does not restart backoff).
  The `status=success|failure` query param from the DLT redirect is read only as a UI hint (e.g. which spinner copy to show first) — never treated as authoritative; `/sync`'s response is the only source of truth.
  Depends on: 6.1.
  Acceptance: a component/unit test drives the state machine with mocked timers and a mocked `/sync` that returns `PENDING` 5 times then `PAID`, asserting exactly 6 calls, correct backoff timing bounds, and terminal-state stop; a second test asserts the 60s ceiling fires even if the attempt count hasn't been exhausted (mock a slow `/sync`).

- [ ] **6.3 "Already completed" view**
  If a submit attempt returns a benign duplicate (same `merchant_transaction_id`, same fingerprint) or `/sync` returns a terminal status on a page that isn't mid-poll, render the "already completed" state instead of the billing form (spec §3.2's terminal-consumption rule).
  Depends on: 5.4, 6.1.

---

## Phase 7 — Transactions stub

- [ ] **7.1 `ITransactionService` + dummy implementation** — `lib/dlt-transaction-service.ts`
  Implement per spec §7.3 exactly: hardcoded `TransactionRecord[]` with at least one record of each status, varied amounts/dates. Interface defined so a live implementation can swap in later without touching consumers.

- [ ] **7.2 `GET /api/transactions`**
  Scoped to the authenticated session's `merchant_account_id` (even though the stub ignores it for now — wire the scoping through so swapping the stub for a real implementation later is a one-file change). Filters/paginates in memory.
  Depends on: 1.2 (session), 7.1.

- [ ] **7.3 Transactions tab UI** — `app/(dashboard)/transactions/page.tsx`, `components/tables/transactions-table.tsx`
  Client-side filters (status, date range) + pagination over 7.2's response.
  Depends on: 7.2.

---

## Phase 8 — Cross-cutting hardening pass

- [ ] **8.1 Logging audit**
  Grep the whole codebase for `console.log`/`console.error` outside `lib/logger.ts`; replace all with `logEvent`/`sanitizeError`. Confirm the "never logged" list (spec §6.3 + `DESIGN.md` §5 addition of `dlt_access_token`) has zero matches anywhere in logs during a full manual test run (login → create link → pay → verify).

- [ ] **8.2 Token-length regression test**
  Because the corrected `PaymentLinkPayload` now embeds an access token (`DESIGN.md` §1.1), the encrypted link token is meaningfully longer than in the original spec's estimate. Generate a link with maximum-length `product_name`/`product_description`/`product_reference_id`/labels and assert the final URL is still comfortably under `MAX_LINK_URL_LENGTH` (2000) and under the practical ~2048 boundary across at least Chrome/Safari/Firefox share behavior (can be a static length assertion in CI rather than a real cross-browser test).
  Depends on: 4.1.

- [ ] **8.3 Rate limit smoke test**
  Hit each endpoint in the rate-limit table (spec §6.2 + `DESIGN.md` §5's `brands` row) past its limit and confirm a 429 with a sane retry-after, using a local/mock Upstash instance.

- [ ] **8.4 CSRF smoke test**
  Confirm `create-link` and `submit` reject requests with a missing/mismatched `x-csrf-token`, and that all four state-changing endpoints reject mismatched `Origin`/`Referer`.

- [ ] **8.5 End-to-end happy path**
  Login → create link → open link as a second (unauthenticated) browser context → pick a brand → fill billing form → submit → redirect to a mocked DLT hosted page → simulate DLT redirecting back to `/verify?status=success` → confirm the polling machine reaches `PAID` and renders success.

---

## Deliberately out of scope for this iteration (do not build)

- DLT signed webhooks (`DESIGN.md` §7.1) — `/sync`-only reconciliation is accepted for now.
- Live DLT transaction-history endpoint — no such endpoint exists in v4.0; the stub (Phase 7) is final for this iteration.
- Quick Link sessions (`/api/v1/quick-link/session`) — not part of this platform's flow; only the Channel-4 Submit/Sync path is in scope.
- Any card-field or `device.*` 3DS handling — v4.0 Hosted Checkout rejects these outright; nothing in this app should construct or accept them.