import type { ActionFunctionArgs, MetaFunction } from 'react-router';
import { useFetcher } from 'react-router';
import { acceptInvitation } from '~/.server/dlt/team';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, KeyRound } from 'lucide-react';
import { DltLogo } from '~/components/dlt-logo';
import { Callout } from '~/components/ui/callout';
import { FormField } from '~/components/ui/form-field';
import { Input } from '~/components/ui/input';
import { PasswordInput } from '~/components/ui/password-input';
import { PasswordRules } from '~/components/ui/password-rules';
import { Button, buttonVariants } from '~/components/ui/button';
import { SegmentedControl } from '~/components/ui/segmented-control';
import { cn } from '~/lib/utils';
import { ThemeToggle } from '~/components/ui/theme-toggle';

export const meta: MetaFunction = () => [{ title: 'Accept Invitation | DLT Portal' }];

// ─── Action ────────────────────────────────────────────────────────────────────
// Uses Basic portal credentials (via dltLoginCall) — no user PAT needed.

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const flow = form.get('flow') as 'new_account' | 'existing_account';
  const token = (form.get('token') as string | null)?.trim() ?? '';

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return {
      ok: false,
      error: 'Invalid or missing invitation token. Please use the link from your invitation email.',
    };
  }

  if (flow === 'new_account') {
    const firstName = (form.get('first_name') as string).trim();
    const lastName = (form.get('last_name') as string).trim();
    const password = form.get('password') as string;
    const passwordConfirmation = form.get('password_confirmation') as string;

    if (!firstName || !lastName) {
      return { ok: false, error: 'First name and last name are required.' };
    }
    if (password !== passwordConfirmation) {
      return { ok: false, error: 'Passwords do not match.' };
    }

    const result = await acceptInvitation({
      token,
      first_name: firstName,
      last_name: lastName,
      password,
      password_confirmation: passwordConfirmation,
    });

    if (!result.ok) {
      return mapAcceptError(result.error);
    }
    return { ok: true, message: 'Invitation accepted. Log in to continue.' };
  }

  if (flow === 'existing_account') {
    const currentPassword = form.get('current_password') as string;

    if (!currentPassword) {
      return { ok: false, error: 'Current password is required.' };
    }

    const result = await acceptInvitation({ token, current_password: currentPassword });

    if (!result.ok) {
      return mapAcceptError(result.error);
    }
    return { ok: true, message: 'Invitation accepted. Log in to continue.' };
  }

  return { ok: false, error: 'Invalid form submission.' };
}

function mapAcceptError(error: { status: number; errorCode?: string; message: string; fieldErrors?: Record<string, string[]> }) {
  if (error.status === 410) {
    return {
      ok: false,
      terminal: true,
      error:
        'This invitation has expired, been revoked, or already been used. Please ask an administrator to send a new invitation.',
    };
  }
  if (error.status === 404) {
    return {
      ok: false,
      error: 'Invitation not found. Please use the link from your latest invitation email.',
    };
  }
  if (error.status === 409) {
    if (error.errorCode === 'MEMBER_ALREADY_EXISTS') {
      return { ok: false, error: 'This account is already a member of the merchant.' };
    }
    return { ok: false, error: error.message };
  }
  if (error.status === 429) {
    return {
      ok: false,
      error: 'Too many attempts. Please wait before trying again.',
    };
  }
  // 422 field errors
  if (error.fieldErrors) {
    const firstField = Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, error: firstField ?? error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AcceptInvitationPage() {
  const fetcher = useFetcher<typeof action>();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [flow, setFlow] = useState<'new_account' | 'existing_account'>('new_account');
  const [password, setPassword] = useState('');
  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Read token from URL fragment client-side — never reaches server logs
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[#&]token=([a-f0-9]{64})(?:&|$)/);
    if (match && match[1]) {
      setToken(match[1]);
      // Strip fragment from address bar without a navigation
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);
    } else {
      setTokenError(
        'No valid invitation token found in this link. Please use the button from your invitation email.',
      );
    }
  }, []);

  const actionData = fetcher.data;
  const isSubmitting = fetcher.state === 'submitting';
  const succeeded = actionData?.ok === true;
  const isTerminal = !actionData?.ok && 'terminal' in (actionData ?? {}) && (actionData as { terminal?: boolean }).terminal;

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-subtle/60 px-4 py-10">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-surface p-8 shadow-card">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <DltLogo size={44} showText={false} />
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary">
              <KeyRound className="size-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-ink">Accept invitation</h1>
              <p className="mt-1 text-sm text-ink-3">Join your merchant team on DLT Portal</p>
            </div>
          </div>
        </div>

        {/* Token error (invalid/missing link) */}
        {tokenError && (
          <Callout variant="danger" role="alert">
            {tokenError}
          </Callout>
        )}

        {/* Success state — do not re-submit */}
        {succeeded && (
          <div className="space-y-5">
            <Callout variant="success">{(actionData as { message: string }).message}</Callout>
            <a href="/login" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
              Go to sign in
            </a>
          </div>
        )}

        {/* Terminal error (410) — do not re-submit */}
        {isTerminal && (
          <Callout variant="warning" role="alert">
            {(actionData as { error: string }).error}
          </Callout>
        )}

        {/* Form — only shown when token is available, not succeeded, not terminal */}
        {!tokenError && !succeeded && !isTerminal && token && (
          <div className="space-y-5">
            {/* Flow selector */}
            <SegmentedControl
              ariaLabel="Join as a new or existing account"
              value={flow}
              onChange={setFlow}
              options={[
                { value: 'new_account', label: 'New account' },
                { value: 'existing_account', label: 'Existing account' },
              ]}
              className="w-full [&>button]:flex-1"
            />

            {/* Non-terminal error feedback */}
            {actionData && !actionData.ok && (
              <Callout variant="danger" role="alert">
                {(actionData as { error: string }).error}
              </Callout>
            )}

            <fetcher.Form method="POST" className="space-y-4" noValidate>
              {/* Hidden fields */}
              <input type="hidden" name="flow" value={flow} />
              <input type="hidden" name="token" value={token} ref={tokenInputRef} />

              {flow === 'new_account' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="First name" name="first_name" required>
                      <Input required maxLength={50} autoComplete="given-name" />
                    </FormField>
                    <FormField label="Last name" name="last_name" required>
                      <Input required maxLength={50} autoComplete="family-name" />
                    </FormField>
                  </div>
                  <div className="space-y-2">
                    <FormField label="Password" name="password" required>
                      <PasswordInput
                        required
                        maxLength={128}
                        autoComplete="new-password"
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </FormField>
                    <PasswordRules password={password} />
                  </div>
                  <FormField label="Confirm password" name="password_confirmation" required>
                    <PasswordInput required maxLength={128} autoComplete="new-password" />
                  </FormField>
                </>
              ) : (
                <>
                  <p className="text-sm text-ink-2">
                    You already have a DLT account (detached). Enter your current password to join
                    this merchant.
                  </p>
                  <FormField label="Current password" name="current_password" required>
                    <PasswordInput required maxLength={128} autoComplete="current-password" />
                  </FormField>
                </>
              )}

              <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
                {flow === 'new_account' ? 'Create account & join' : 'Confirm & join'}
              </Button>
            </fetcher.Form>
          </div>
        )}

        {/* Loading state while token hasn't resolved yet */}
        {!tokenError && !token && (
          <div className="flex items-center justify-center py-8 text-ink-3">
            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="ml-2 text-sm">Loading invitation…</span>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink-3">
          Already a member?{' '}
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
