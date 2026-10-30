# Agent Instructions

## Before any implementation
1. Read the relevant section of `docs/specs/dlt-merchant-dashboard-spec.md` (dashboard spec)
2. Read the relevant endpoint in `docs/specs/merchant-portal-api-v1.10.md` (API spec)
3. Check `app/.server/dlt/schemas.ts` for existing Zod schemas
4. Check `app/.server/dlt/errors.ts` for error handling patterns

## Code generation checklist
- [ ] Server-only code is in `app/.server/`
- [ ] No secrets in client-accessible paths
- [ ] Zod validation on all API responses
- [ ] Proper error handling (see error matrix in dashboard spec §10.1)
- [ ] CSRF token in all forms/fetchers
- [ ] `requireUser()` in every protected loader/action
- [ ] `requireRole('administrator')` for admin-only operations
- [ ] Money uses decimal strings, not floats
- [ ] Dates use Luxon with IANA timezone
- [ ] URLSearchParams for query building
- [ ] No auto-retry on mutations
- [ ] Handle 204 responses without `.json()`
- [ ] Handle null values gracefully (display "—")
- [ ] Follow Design System colors (`primary-*`, `brand-*`) from docs/DESIGN_SYSTEM.md

## Deployment notes (stage)
- `react-router-serve` does NOT load `.env` — `app/.server/env.ts` calls
  `process.loadEnvFile()` (requires Node 20.12+ on the server) reading
  `.env` from the process cwd (`/var/www/dlt-portal`).
- `.env` is never shipped in the tarball — it must exist on the server at
  `/var/www/dlt-portal/.env`. First deploy leaves the app crash-looping (502)
  until it is created and `pm2 restart dlt-portal` is run.
- Runtime file assets (e.g. `assets/dlt.png` for PDFs) resolve relative to
  the deploy root, not `app/` — `deploy.sh` stages `app/assets/` into the
  tarball as top-level `assets/`.
- Diagnose a 502: `ssh -t ifrc "ssh -t ifrc-web-stage 'pm2 logs dlt-portal --lines 30 --nostream'"`
