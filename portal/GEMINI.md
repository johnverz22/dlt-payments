# DLT Merchant Portal — AI Coding Rules

## Project Overview
This is a **DLT Merchant Portal** — a React Router v7 (framework mode, SSR) web dashboard for DLT merchants. It acts as a BFF (Backend For Frontend) / secure token proxy.

## Stack
- **Framework**: React Router v7 (framework mode, SSR) with Node adapter
- **Language**: TypeScript (strict)
- **Validation**: Zod (env, URL parsing, forms, API responses)
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Charts**: Recharts
- **Dates**: Luxon (IANA timezones, DST-safe)
- **Money**: Decimal strings end-to-end; `decimal.js` for derived math; `Intl.NumberFormat` for display
- **Tests**: Vitest + MSW (mocks) + Playwright (E2E)

## Critical Architecture Rules

### Security (NEVER violate)
1. **Never expose secrets to the browser.** The PAT, portal client ID/secret, and DLT_ORIGIN must never appear in client bundles, `import.meta.env`, or `VITE_*` variables.
2. **All secrets live in `app/.server/`** — React Router guarantees these never ship to the client.
3. **Session cookie**: `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, session ID rotated at login.
4. **CSRF protection** on every non-GET request: Origin/Sec-Fetch-Site check + per-session token.
5. **Never log** passwords, tokens, OTPs, secrets, or `Authorization` headers.
6. **One-time secrets** (machine client credentials) must never be stored in session, URL, storage, or logs.

### DLT API Rules
1. **No generic proxy.** Every upstream call goes through typed functions in `app/.server/dlt/`. The browser cannot choose the upstream path.
2. **No business rules re-implemented.** Status, totals, rates come from the API as-is.
3. **Handle 204 without calling `.json()`.** 
4. **Use `URLSearchParams`** for all query building — a `+` in `+08:00` must encode as `%2B`.
5. **Route IDs are opaque** — use returned values, never do arithmetic on IDs.
6. **Money is decimal strings** — never use `parseFloat` for financial math. Convert to Number only for chart plotting.
7. **Nulls are valid** — amount, brand, payment_method, timestamps can all be null.

### Data Loading Rules
1. **No polling/auto-refresh** by default. Provide manual Refresh button.
2. **Reads**: up to 2 retries with exponential backoff on 502/503/504. Never retry 4xx.
3. **Mutations**: NEVER auto-retry.
4. **On 429**: honor `Retry-After`, stop requests. Do not queue retries.
5. **On 401 (protected routes)**: destroy session, redirect to login.

### Conventions
- Page data: route `loader`s. Mutations: route `action`s.
- Filter/pagination state lives in URL query string (linkable, cancelable).
- `shouldRevalidate` must be configured to avoid unnecessary refetches.
- Debounce text filters by ~400ms.
- Use `en-PH` locale for formatting.
- Default timezone: `Asia/Manila` (IANA only, API rejects numeric offsets).

## File Structure
```
app/
  root.tsx
  routes.ts
  routes/           # Route modules
  .server/          # Server-only (secrets, DLT client, session)
    env.ts          # Zod-validated env
    session.ts      # Session management
    csrf.ts         # CSRF protection
    dlt/            # DLT API client layer
      client.ts     # Fetch wrapper
      errors.ts     # Error types
      schemas.ts    # Zod response schemas
  components/       # UI components
  lib/              # Shared utilities (money, dates, filters, csv)
tests/
  unit/ contract/ e2e/
```

## API Spec Reference
The full API specification is at `docs/specs/merchant-portal-api-v1.10.md` in the project root.
The dashboard spec is at `docs/specs/dlt-merchant-dashboard-spec.md` in the project root.
Always consult these before implementing any API integration.
- **Design System**: See `docs/DESIGN_SYSTEM.md` for the logo-derived palette (Vibrant Blue + Deep Navy). Use these colors for all UI.
