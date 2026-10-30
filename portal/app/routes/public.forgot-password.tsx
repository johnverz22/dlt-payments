import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Form, useActionData, useNavigation, Link, useLoaderData } from 'react-router';
import { data } from 'react-router';
import { getSession, commitSession } from '~/.server/session';
import { generateCsrfToken, validateCsrfToken, isSameOrigin } from '~/.server/csrf';
import { env } from '~/.server/env';
import { DltLogo } from '~/components/dlt-logo';
import { Callout } from '~/components/ui/callout';
import { FormField } from '~/components/ui/form-field';
import { Input } from '~/components/ui/input';
import { Button, buttonVariants } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { ThemeToggle } from '~/components/ui/theme-toggle';

export const meta: MetaFunction = () => [{ title: 'Forgot Password | DLT Portal' }];

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
    return data({ error: 'Invalid origin.', success: false, message: '' }, { status: 403 });
  }

  const formData = await request.formData();
  const csrf = formData.get('csrfToken');
  
  if (typeof csrf !== 'string' || typeof csrfSecret !== 'string' || !validateCsrfToken(csrf, csrfSecret)) {
    return data({ error: 'Invalid CSRF token.', success: false, message: '' }, { status: 403 });
  }

  const email = formData.get('email');
  if (typeof email !== 'string') {
    return data({ error: 'Email is required.', success: false, message: '' }, { status: 400 });
  }

  const reset_url = `${env.APP_ORIGIN}/reset-password`;

  const url = new URL('/api/v1/auth/reset-password/reset-link', env.DLT_ORIGIN);
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, reset_url }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
        return data({ error: `Too many attempts. Try again in ${seconds} seconds.`, success: false, message: '' }, { status: 429 });
      }
      // Return success anyway to avoid account existence leak
    }
  } catch (error) {
    // Return success to avoid network leakage
  }

  return data({ success: true, message: 'If the account exists, a password reset link has been sent.', error: null });
}

export default function ForgotPasswordPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <DltLogo size={44} showText={false} />
          <div>
            <h1 className="text-2xl font-semibold text-ink">Forgot password</h1>
            <p className="mt-1 text-sm text-ink-3">
              Enter your email and we'll send you a reset link.
            </p>
          </div>
        </div>

        {actionData?.error && (
          <Callout variant="danger" role="alert" className="mb-5">
            {actionData.error}
          </Callout>
        )}

        {actionData?.success ? (
          <div className="space-y-5">
            <Callout variant="success">{actionData.message}</Callout>
            <Link to="/login" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <Form method="post" className="space-y-5">
            <input type="hidden" name="csrfToken" value={loaderData.csrfToken} />

            <FormField label="Email address" name="email" required>
              <Input type="email" autoComplete="email" required />
            </FormField>

            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>

            <p className="text-center text-sm">
              <Link to="/login" className="font-medium text-primary hover:text-primary-hover hover:underline">
                Back to sign in
              </Link>
            </p>
          </Form>
        )}
      </div>
    </div>
  );
}
