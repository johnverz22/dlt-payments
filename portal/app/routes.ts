import { type RouteConfig, route, layout } from '@react-router/dev/routes';

export default [
  // Public routes
  route('login', 'routes/public.login.tsx'),
  route('forgot-password', 'routes/public.forgot-password.tsx'),
  route('reset-password', 'routes/public.reset-password.tsx'),
  route('team/invitations/accept', 'routes/public.team.invitations.accept.tsx'),

  // Authenticated app routes
  layout('routes/app.layout.tsx', [
    route('/', 'routes/app._index.tsx'),
    route('transactions', 'routes/app.transactions._index.tsx'),
    route('transactions/export.csv', 'routes/app.transactions.export.csv.ts'),
    route('transactions/pdf', 'routes/app.transactions._index.pdf.ts'),
    route('transactions/:id', 'routes/app.transactions.$id.tsx'),
    route('transactions/:id/pdf', 'routes/app.transactions.$id.pdf.ts'),
    route('settings/profile', 'routes/app.settings.profile.tsx'),
    route('settings/merchant', 'routes/app.settings.merchant.tsx'),
    route('settings/team', 'routes/app.settings.team.tsx'),

  ]),

  // Actions
  route('logout', 'routes/app.logout.tsx'),

  // Internal
  route('healthz', 'routes/healthz.ts'),
] satisfies RouteConfig;
