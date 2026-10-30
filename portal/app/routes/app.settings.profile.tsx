import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import {
  data,
  redirect,
  useLoaderData,
  useFetcher,
  useSearchParams,
  useRevalidator,
} from 'react-router';
import { requireUser, getSession, destroySession } from '~/.server/session';
import {
  getProfile,
  patchProfile,
  verifyEmailOtp,
  resendEmailOtp,
  changePassword,
} from '~/.server/dlt/profile';
import { validateCsrfToken } from '~/.server/csrf';
import { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { FormField, ReadOnlyField } from '~/components/ui/form-field';
import { PasswordInput } from '~/components/ui/password-input';
import {
  PasswordRules,
  PasswordStrengthMeter,
  PasswordMatchHint,
} from '~/components/ui/password-rules';
import { Callout } from '~/components/ui/callout';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import { useToast } from '~/components/ui/toast';
import { useDirtyGuard } from '~/lib/use-dirty-guard';

export const meta: MetaFunction = () => [{ title: 'Profile | DLT Portal' }];

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat, user, csrfSecret, csrfSetCookie } = await requireUser(request);
  const profileResult = await getProfile(pat);

  const headers: HeadersInit = csrfSetCookie ? { 'Set-Cookie': csrfSetCookie } : {};
  return data(
    {
      profile: profileResult.ok ? profileResult.data : null,
      profileError: profileResult.ok ? null : profileResult.error.message,
      csrfToken: csrfSecret,
      user,
    },
    { headers },
  );
}

// ─── Action ────────────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const { pat, csrfSecret } = await requireUser(request);
  const form = await request.formData();
  const intent = form.get('intent') as string;
  const token = form.get('csrf_token') as string;

  if (!validateCsrfToken(token, csrfSecret)) {
    return { ok: false, error: 'Invalid request. Please try again.', fieldErrors: null, intent };
  }

  // ── Personal info ────────────────────────────────────────────────────────────
  if (intent === 'update_profile') {
    const current = await getProfile(pat);
    const currentProfile = current.ok ? current.data : null;

    const fields: Record<string, string> = {};
    const firstName = form.get('first_name') as string;
    const lastName = form.get('last_name') as string;
    const email = form.get('email') as string;

    if (firstName && firstName !== currentProfile?.first_name) fields.first_name = firstName;
    if (lastName && lastName !== currentProfile?.last_name) fields.last_name = lastName;
    if (email && email !== currentProfile?.email) fields.email = email;

    if (Object.keys(fields).length === 0) {
      return {
        ok: true,
        message: 'No changes to save.',
        profile: currentProfile,
        fieldErrors: null,
        intent,
      };
    }

    const result = await patchProfile(pat, fields);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        profile: null,
        intent,
      };
    }
    return {
      ok: true,
      message: 'Profile updated.',
      profile: result.data,
      fieldErrors: null,
      intent,
    };
  }

  // ── Email OTP verification ───────────────────────────────────────────────────
  if (intent === 'verify_otp') {
    const otp = form.get('otp') as string;
    const result = await verifyEmailOtp(pat, otp);
    if (!result.ok) {
      return { ok: false, error: result.error.message, fieldErrors: null, intent };
    }
    return { ok: true, message: 'Email verified successfully.', fieldErrors: null, intent };
  }

  // ── OTP resend ───────────────────────────────────────────────────────────────
  if (intent === 'resend_otp') {
    const result = await resendEmailOtp(pat);
    if (!result.ok) {
      return { ok: false, error: result.error.message, fieldErrors: null, intent };
    }
    return { ok: true, message: 'Verification code resent.', fieldErrors: null, intent };
  }

  // ── Change password ──────────────────────────────────────────────────────────
  if (intent === 'change_password') {
    const current_password = form.get('current_password') as string;
    const password = form.get('password') as string;
    const password_confirmation = form.get('password_confirmation') as string;

    if (password !== password_confirmation) {
      return {
        ok: false,
        error: null,
        fieldErrors: { password_confirmation: ['Passwords do not match'] } as Record<
          string,
          string[]
        >,
        intent,
      };
    }

    const result = await changePassword(pat, { current_password, password, password_confirmation });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        intent,
      };
    }

    // Password changed — destroy session and redirect to login
    return redirect('/login?reason=password_changed', {
      headers: { 'Set-Cookie': await destroySession(session) },
    });
  }

  return { ok: false, error: 'Unknown action.', fieldErrors: null, intent };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, profileError, csrfToken } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const toast = useToast();
  const profileFormRef = useRef<HTMLFormElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const { dirty, track, resetDirty, confirmOpen, confirmLeave, cancelLeave } = useDirtyGuard();

  const actionData = fetcher.data;
  const isSubmitting = fetcher.state === 'submitting';
  const activeIntent = fetcher.formData?.get('intent') as string | undefined;

  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  // ── email_verification redirect banner ──────────────────────────────────────
  const [emailVerificationBanner, setEmailVerificationBanner] = useState<string | null>(null);

  useEffect(() => {
    track(profileFormRef.current);
  }, [track]);

  useEffect(() => {
    const emailVerification = searchParams.get('email_verification');
    if (emailVerification) {
      setEmailVerificationBanner(emailVerification);
      setSearchParams(
        (prev) => {
          prev.delete('email_verification');
          return prev;
        },
        { replace: true },
      );
      if (emailVerification === 'verified') {
        revalidator.revalidate();
      }
    }
  }, [searchParams, setSearchParams, revalidator]);

  // ── Revalidate after OTP actions ────────────────────────────────────────────
  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.ok === true &&
      (fetcher.data.intent === 'verify_otp' || fetcher.data.intent === 'resend_otp')
    ) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  // ── Toast + dirty reset after profile save ──────────────────────────────────
  useEffect(() => {
    if (fetcher.state === 'idle' && actionData?.ok && actionData.intent === 'update_profile') {
      toast.success(actionData.message ?? 'Profile updated.');
      resetDirty();
      if (profileFormRef.current) {
        delete profileFormRef.current.dataset.initial;
        track(profileFormRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, actionData]);

  // ── Clear password fields after every password attempt ──────────────────────
  useEffect(() => {
    if (fetcher.state === 'idle' && actionData?.intent === 'change_password') {
      passwordFormRef.current?.reset();
      setNewPassword('');
      setConfirmation('');
    }
  }, [fetcher.state, actionData]);

  return (
    <div className="w-full max-w-[1200px] space-y-6">
      <PageHeader title="Profile" description="Your personal details and account security." />

      {/* ── Email verification redirect banner ─────────────────────────────── */}
      {emailVerificationBanner && (
        <Callout
          variant={emailVerificationBanner === 'verified' ? 'success' : 'danger'}
          role={emailVerificationBanner === 'verified' ? undefined : 'alert'}
        >
          {emailVerificationBanner === 'verified'
            ? 'Email verified successfully.'
            : 'Email verification link is invalid or expired.'}
        </Callout>
      )}

      {profileError && (
        <Callout variant="danger" role="alert">
          Could not load profile: {profileError}
        </Callout>
      )}

      {/* ── Profile error feedback (non-password intents) ──────────────────── */}
      {actionData && !actionData.ok && actionData.intent !== 'change_password' && (
        <Callout variant="danger" role="alert">
          {actionData.error}
        </Callout>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* ── Personal information ────────────────────────────────────────── */}
          <Card className="p-6">
            <h2 className="text-ink mb-5 text-base font-semibold">Personal information</h2>
            <fetcher.Form
              method="post"
              className="space-y-4"
              ref={profileFormRef}
              onChange={(e) => track(e.currentTarget)}
            >
              <input type="hidden" name="csrf_token" value={csrfToken} />
              <input type="hidden" name="intent" value="update_profile" />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="First name"
                  name="first_name"
                  required
                  error={
                    actionData?.intent === 'update_profile'
                      ? actionData?.fieldErrors?.first_name?.[0]
                      : undefined
                  }
                >
                  <Input defaultValue={profile?.first_name} required autoComplete="given-name" />
                </FormField>
                <FormField
                  label="Last name"
                  name="last_name"
                  required
                  error={
                    actionData?.intent === 'update_profile'
                      ? actionData?.fieldErrors?.last_name?.[0]
                      : undefined
                  }
                >
                  <Input defaultValue={profile?.last_name} required autoComplete="family-name" />
                </FormField>
              </div>

              <FormField
                label="Email address"
                name="email"
                required
                error={
                  actionData?.intent === 'update_profile'
                    ? actionData?.fieldErrors?.email?.[0]
                    : undefined
                }
                hint="Changing your email triggers a verification step."
              >
                <Input type="email" defaultValue={profile?.email} required autoComplete="email" />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Username" value={profile?.username} />
                <ReadOnlyField label="Role" value={profile?.role} />
                <ReadOnlyField label="Merchant" value={profile?.merchant.name} />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  loading={isSubmitting && activeIntent === 'update_profile'}
                  disabled={!dirty}
                >
                  Save changes
                </Button>
              </div>
            </fetcher.Form>
          </Card>

          {/* ── Pending email verification ──────────────────────────────────────── */}
          {profile?.pending_email && (
            <Callout variant="warning" className="items-start">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-medium">Email change pending verification</p>
                  <p className="mt-1 text-xs">
                    We sent a verification code to <strong>{profile.pending_email}</strong>.
                    {profile.pending_email_expires_at && (
                      <>
                        {' '}
                        Expires at{' '}
                        {new Date(profile.pending_email_expires_at).toLocaleTimeString('en-PH')}.
                      </>
                    )}
                  </p>

                  <fetcher.Form method="post" className="mt-3 flex items-end gap-2">
                    <input type="hidden" name="csrf_token" value={csrfToken} />
                    <input type="hidden" name="intent" value="verify_otp" />
                    <FormField
                      label="6-digit code"
                      name="otp"
                      error={
                        actionData?.intent === 'verify_otp' && !actionData.ok
                          ? (actionData.error ?? undefined)
                          : undefined
                      }
                    >
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="000000"
                        className="w-28 font-mono"
                      />
                    </FormField>
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={isSubmitting && activeIntent === 'verify_otp'}
                    >
                      Verify
                    </Button>
                  </fetcher.Form>

                  <fetcher.Form method="post" className="mt-2">
                    <input type="hidden" name="csrf_token" value={csrfToken} />
                    <input type="hidden" name="intent" value="resend_otp" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="text-xs font-medium underline disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            </Callout>
          )}
        </div>

        {/* ── Change password ───────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="text-ink text-base font-semibold">Change password</h2>
          <p className="text-ink-3 mt-1 mb-5 text-xs">
            12–128 characters with uppercase, lowercase, number, and symbol.
          </p>

          {actionData && !actionData.ok && actionData.intent === 'change_password' && (
            <Callout variant="danger" role="alert" className="mb-4">
              {actionData.error ?? 'An error occurred. Please try again.'}
            </Callout>
          )}

          <fetcher.Form method="post" ref={passwordFormRef} className="space-y-4">
            <input type="hidden" name="csrf_token" value={csrfToken} />
            <input type="hidden" name="intent" value="change_password" />

            <FormField
              label="Current password"
              name="current_password"
              required
              error={
                actionData?.intent === 'change_password'
                  ? actionData?.fieldErrors?.current_password?.[0]
                  : undefined
              }
            >
              <PasswordInput autoComplete="current-password" required />
            </FormField>

            <div className="space-y-2">
              <FormField
                label="New password"
                name="password"
                required
                error={
                  actionData?.intent === 'change_password'
                    ? actionData?.fieldErrors?.password?.[0]
                    : undefined
                }
              >
                <PasswordInput
                  autoComplete="new-password"
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </FormField>
              <PasswordStrengthMeter password={newPassword} />
              <PasswordRules password={newPassword} />
            </div>

            <div className="space-y-2">
              <FormField
                label="Confirm new password"
                name="password_confirmation"
                required
                error={
                  actionData?.intent === 'change_password'
                    ? actionData?.fieldErrors?.password_confirmation?.[0]
                    : undefined
                }
              >
                <PasswordInput
                  autoComplete="new-password"
                  required
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </FormField>
              <PasswordMatchHint password={newPassword} confirmation={confirmation} />
            </div>

            <Callout variant="info">
              After a successful password change you will be signed out and asked to sign in with
              your new password.
            </Callout>

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={isSubmitting && activeIntent === 'change_password'}>
                Change password
              </Button>
            </div>
          </fetcher.Form>
        </Card>
      </div>

      {/* ── Unsaved-changes guard ───────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) cancelLeave();
        }}
        title="Discard unsaved changes?"
        message="You have unsaved changes on this page. Leaving now will discard them."
        confirmLabel="Discard changes"
        danger
        onConfirm={confirmLeave}
      />
    </div>
  );
}
