import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from 'react-router';
import { redirect, data } from 'react-router';
import { getSession, commitSession } from '~/.server/session';
import { generateCsrfToken, validateCsrfToken, isSameOrigin } from '~/.server/csrf';
import { dltLoginCall, dltGet } from '~/.server/dlt/client';
import { env } from '~/.server/env';
import { loginResponseSchema, userProfileSchema } from '~/.server/dlt/schemas';
import { DltLogo } from '~/components/dlt-logo';
import { Callout } from '~/components/ui/callout';
import { FormField } from '~/components/ui/form-field';
import { Input } from '~/components/ui/input';
import { PasswordInput } from '~/components/ui/password-input';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ui/theme-toggle';

export const meta: MetaFunction = () => [{ title: 'Login | DLT Portal' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  let csrfSecret = session.get('csrfSecret');
  let headers = new Headers();
  
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set('csrfSecret', csrfSecret);
    headers.set('Set-Cookie', await commitSession(session));
  }

  const url = new URL(request.url);
  const reason = url.searchParams.get('reason');
  const returnTo = url.searchParams.get('returnTo');

  return data({ csrfToken: csrfSecret, reason, returnTo }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const csrfSecret = session.get('csrfSecret');

  if (!isSameOrigin(request, env.APP_ORIGIN)) {
    return data({ error: 'Invalid origin.' }, { status: 403 });
  }

  const formData = await request.formData();
  const csrf = formData.get('csrfToken');
  
  if (typeof csrf !== 'string' || typeof csrfSecret !== 'string' || !validateCsrfToken(csrf, csrfSecret)) {
    return data({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  const email = formData.get('email');
  const password = formData.get('password');
  const returnTo = formData.get('returnTo');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return data({ error: 'Email and password are required.' }, { status: 400 });
  }

  const loginResult = await dltLoginCall('/api/v1/auth/login', { username: email, password });
  
  if (!loginResult.ok) {
    const error = loginResult.error;
    if (error.status === 401 && error.errorCode === 'INVALID_CREDENTIALS') {
      return data({ error: 'Wrong email or password' }, { status: 401 });
    }
    if (error.status === 401 && error.errorCode === 'ECOSYSTEM_CLIENT_UNAUTHENTICATED') {
      return data({ error: 'Service unavailable' }, { status: 503 });
    }
    if (error.status === 403) {
      return data({ error: "Your account isn't eligible" }, { status: 403 });
    }
    if (error.status === 429) {
      return data({ error: `Too many attempts. Try again in ${error.retryAfterSeconds || 60} seconds.` }, { status: 429 });
    }
    if (error.status === 503) {
      return data({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    return data({ error: error.message || 'Login failed.' }, { status: 400 });
  }

  const parsedLogin = loginResponseSchema.safeParse(loginResult.data);
  if (!parsedLogin.success) {
    return data({ error: 'Unexpected login response format.' }, { status: 500 });
  }

  const { access_token, expires_at } = parsedLogin.data;

  const profileResult = await dltGet('/api/v1/portal/me', access_token);
  if (!profileResult.ok) {
    return data({ error: 'Failed to retrieve profile.' }, { status: 400 });
  }

  const parsedProfile = userProfileSchema.safeParse(profileResult.data);
  if (!parsedProfile.success) {
    return data({ error: 'Unexpected profile response format.' }, { status: 500 });
  }

  session.set('pat', access_token);
  session.set('expiresAt', expires_at);
  session.set('user', {
    id: parsedProfile.data.id,
    email: parsedProfile.data.email,
    firstName: parsedProfile.data.first_name,
    lastName: parsedProfile.data.last_name,
    role: parsedProfile.data.role,
    merchantId: parsedProfile.data.merchant.id,
    merchantName: parsedProfile.data.merchant.name,
  });

  const safeReturnTo = (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//'))
    ? returnTo
    : '/';

  return redirect(safeReturnTo, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function LoginPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  let bannerMessage = null;
  if (loaderData.reason === 'expired') {
    bannerMessage = 'Your session has expired. Please sign in again.';
  } else if (loaderData.reason === 'password_changed') {
    bannerMessage = 'Your password has been changed. Please sign in again.';
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <DltLogo size={44} showText={false} />
          <div>
            <h1 className="text-2xl font-semibold text-ink">Sign in to DLT Portal</h1>
            <p className="mt-1 text-sm text-ink-3">Merchant payments dashboard</p>
          </div>
        </div>

        {bannerMessage && (
          <Callout variant="info" className="mb-5">
            {bannerMessage}
          </Callout>
        )}

        {actionData?.error && (
          <Callout variant="danger" role="alert" className="mb-5">
            {actionData.error}
          </Callout>
        )}

        <Form method="post" className="space-y-5">
          <input type="hidden" name="csrfToken" value={loaderData.csrfToken} />
          {loaderData.returnTo && <input type="hidden" name="returnTo" value={loaderData.returnTo} />}

          <FormField label="Email address" name="email" required>
            <Input type="email" autoComplete="username" required />
          </FormField>

          <div className="space-y-1.5">
            <FormField label="Password" name="password" required>
              <PasswordInput autoComplete="current-password" required />
            </FormField>
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:text-primary-hover hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
