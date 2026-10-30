import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Form, useActionData, useNavigation, redirect, data, useLoaderData } from 'react-router';
import { useEffect, useState } from 'react';
import { getSession, commitSession } from '~/.server/session';
import { generateCsrfToken, validateCsrfToken, isSameOrigin } from '~/.server/csrf';
import { env } from '~/.server/env';
import { DltLogo } from '~/components/dlt-logo';
import { Callout } from '~/components/ui/callout';
import { FormField } from '~/components/ui/form-field';
import { PasswordInput } from '~/components/ui/password-input';
import { PasswordRules, PasswordStrengthMeter, PasswordMatchHint } from '~/components/ui/password-rules';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ui/theme-toggle';

export const meta: MetaFunction = () => [{ title: 'Reset Password | DLT Portal' }];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  let csrfSecret = session.get('csrfSecret');
  let headers = new Headers();
  
  if (!csrfSecret) {
    csrfSecret = generateCsrfToken();
    session.set('csrfSecret', csrfSecret);
    headers.set('Set-Cookie', await commitSession(session));
  }

  return data({ csrfToken: csrfSecret }, { headers });
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
  const token = formData.get('token');
  const password = formData.get('password');
  const password_confirmation = formData.get('password_confirmation');

  if (typeof email !== 'string' || typeof token !== 'string' || typeof password !== 'string' || typeof password_confirmation !== 'string') {
    return data({ error: 'All fields are required.' }, { status: 400 });
  }

  if (password !== password_confirmation) {
    return data({ error: 'Passwords do not match.' }, { status: 400 });
  }

  const url = new URL('/api/v1/auth/reset-password/new-password', env.DLT_ORIGIN);
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, token, password, password_confirmation }),
    });

    if (!response.ok) {
      if (response.status === 400) {
         return data({ error: 'The reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
      }
      return data({ error: 'Failed to reset password. Please try again.' }, { status: 400 });
    }
  } catch (error) {
    return data({ error: 'Network error. Please try again later.' }, { status: 500 });
  }

  return redirect('/login?reason=password_changed');
}

export default function ResetPasswordPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramEmail = params.get('email');
    const paramToken = params.get('token');

    if (paramEmail && paramToken) {
      setEmail(paramEmail);
      setToken(paramToken);
      
      // Strip token & email from visible URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!email || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4">
        <div className="fixed right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 text-center shadow-card">
          <Callout variant="danger" role="alert">
            Reset link is missing or invalid.
          </Callout>
          <a
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-hover hover:underline"
          >
            Request a new link
          </a>
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-semibold text-ink">Reset password</h1>
            <p className="mt-1 text-sm text-ink-3">For {email}</p>
          </div>
        </div>

        {actionData?.error && (
          <Callout variant="danger" role="alert" className="mb-5">
            {actionData.error}
            {actionData.error.includes('expired') && (
              <div className="mt-1">
                <a href="/forgot-password" className="underline">
                  Request a new link
                </a>
              </div>
            )}
          </Callout>
        )}

        <Form method="post" className="space-y-5">
          <input type="hidden" name="csrfToken" value={loaderData.csrfToken} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="token" value={token} />

          <FormField label="New password" name="password" required>
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          <div className="rounded-lg bg-surface-2 p-3.5">
            <PasswordRules password={password} />
          </div>
          <PasswordStrengthMeter password={password} />

          <FormField label="Confirm new password" name="password_confirmation" required>
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </FormField>
          <PasswordMatchHint password={password} confirmation={confirmation} />

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Resetting…' : 'Reset password'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
