import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError, isRouteErrorResponse, data } from 'react-router';
import type { LinksFunction, LoaderFunctionArgs, HeadersFunction } from 'react-router';
import { randomBytes } from 'node:crypto';
import { getSecurityHeaders } from '~/.server/security-headers';
import { ToastProvider } from '~/components/ui/toast';
import { ServerError, NotFoundError } from '~/components/ui/error-page';

import './app.css';

export const links: LinksFunction = () => [
  { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
  { rel: 'icon', href: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
  { rel: 'icon', href: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const nonce = randomBytes(16).toString('base64');
  return data({ nonce }, {
    headers: getSecurityHeaders(nonce)
  });
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return loaderHeaders;
};

/**
 * Inline script that runs before React hydrates — resolves the theme
 * preference and applies `dark` + `color-scheme` to <html> without a flash
 * or a hydration mismatch (React never renders the class itself).
 *
 * Preference is stored in the `dlt-theme` cookie: light | dark | system.
 * Falls back to the legacy localStorage key once, then migrates.
 * Must be a plain string so it can carry the CSP nonce.
 */
const themeInitScript = `
(function(){
  function apply(theme){
    var dark = theme === 'dark' || (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
  try {
    var m = document.cookie.match(/(?:^|;)\\s*dlt-theme=(light|dark|system)/);
    var theme = m && m[1];
    if (!theme) {
      var legacy = null;
      try { legacy = localStorage.getItem('theme'); } catch(e) {}
      theme = (legacy === 'dark' || legacy === 'light') ? legacy : 'system';
      document.cookie = 'dlt-theme=' + theme + ';path=/;max-age=31536000;SameSite=Lax';
      try { localStorage.removeItem('theme'); } catch(e) {}
    }
    apply(theme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
      var mm = document.cookie.match(/(?:^|;)\\s*dlt-theme=(light|dark|system)/);
      if (!mm || mm[1] === 'system') apply('system');
    });
  } catch(e) {}
})();
`.trim();

export function Layout({ children }: { children: React.ReactNode }) {
  let nonce = '';
  try {
    const loaderData = useLoaderData<typeof loader>();
    if (loaderData && loaderData.nonce) {
      nonce = loaderData.nonce;
    }
  } catch (e) {
    // Fallback if useLoaderData throws (error boundaries, etc.)
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Theme init — must run before body renders to avoid flash */}
        <script
          nonce={nonce || undefined}
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ScrollRestoration nonce={nonce || undefined} />
        <Scripts nonce={nonce || undefined} />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
}

/**
 * Root error boundary — the last line of defence.
 * Catches errors that bubble past all layout/route-level boundaries.
 * Per spec §10.1: 500/503 shows a generic retryable message with no internal
 * details; 404 shows "not available" without cross-merchant disclosure.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  // Route error responses (thrown `data(..., { status })` or `throw new Response`)
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundError />;
    }
    // 401 should have been caught by the layout boundary, but if it reaches
    // here (e.g. root loader failure), redirect to login via the error page.
    if (error.status === 401) {
      return (
        <ServerError />
      );
    }
    // 500, 503, and any other 5xx — generic retryable
    return <ServerError />;
  }

  // Unknown Error (thrown exception, not a Response)
  return <ServerError />;
}
