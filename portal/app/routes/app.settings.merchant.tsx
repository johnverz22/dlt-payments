import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { data, useLoaderData, useFetcher } from 'react-router';
import { requireUser, getSession, commitSession } from '~/.server/session';
import {
  getMerchant,
  patchMerchant,
  getMerchantLogo,
  uploadMerchantLogo,
  deleteMerchantLogo,
} from '~/.server/dlt/merchant';
import { validateCsrfToken } from '~/.server/csrf';
import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  Loader2,
  ImageIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Wallet,
  QrCode,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { Card, CardHeader } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { FormField, ReadOnlyField } from '~/components/ui/form-field';
import { PhoneInput } from '~/components/ui/phone-input';
import { Callout } from '~/components/ui/callout';
import { Badge } from '~/components/ui/badge';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import { useToast } from '~/components/ui/toast';
import { useDirtyGuard } from '~/lib/use-dirty-guard';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => [{ title: 'Merchant Profile | DLT Portal' }];

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat, user, csrfSecret, csrfSetCookie } = await requireUser(request);
  const [merchantResult, logoResult] = await Promise.all([getMerchant(pat), getMerchantLogo(pat)]);

  const headers = new Headers();
  if (csrfSetCookie) headers.append('Set-Cookie', csrfSetCookie);
  if (merchantResult.ok && merchantResult.data.name !== user.merchantName) {
    const session = await getSession(request.headers.get('Cookie'));
    session.set('user', { ...user, merchantName: merchantResult.data.name });
    headers.append('Set-Cookie', await commitSession(session));
  }
  return data(
    {
      merchant: merchantResult.ok ? merchantResult.data : null,
      merchantError: merchantResult.ok ? null : merchantResult.error.message,
      logoUrl: logoResult.ok ? logoResult.data.url : null,
      csrfToken: csrfSecret,
      isAdmin: user.role === 'administrator',
    },
    { headers },
  );
}

// ─── Action ────────────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  const { pat, user, csrfSecret } = await requireUser(request);
  const session = await getSession(request.headers.get('Cookie'));
  const isAdmin = user.role === 'administrator';

  const form = await request.formData();
  const intent = form.get('intent') as string;
  const token = form.get('csrf_token') as string;

  if (!validateCsrfToken(token, csrfSecret)) {
    return { ok: false, error: 'Invalid request.', fieldErrors: null, intent };
  }

  if (intent === 'update_merchant') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', fieldErrors: null, intent };

    const currentResult = await getMerchant(pat);
    const current = currentResult.ok ? currentResult.data : null;

    const fields: Record<string, string | null> = {};
    const name = form.get('name') as string;
    const contactPerson = form.get('contact_person') as string;
    const email = form.get('email') as string;
    const dialCode = form.get('dial_code') as string;
    const phone = form.get('phone') as string;
    const address = form.get('address') as string;
    const website = form.get('website') as string;

    if (name && name !== current?.name) fields.name = name;
    if (contactPerson !== (current?.contact_person ?? '')) fields.contact_person = contactPerson;
    if (email !== (current?.email ?? '')) fields.email = email;
    const currentDial = current?.dial_code
      ? current.dial_code.startsWith('+')
        ? current.dial_code
        : `+${current.dial_code}`
      : '';
    if (dialCode !== currentDial) fields.dial_code = dialCode;
    if (phone !== (current?.phone ?? '')) fields.phone = phone;
    if (address !== (current?.address ?? '')) fields.address = address;
    if (website !== (current?.website ?? '')) fields.website = website || null;

    if (Object.keys(fields).length === 0) {
      if (current && current.name !== user.merchantName) {
        session.set('user', { ...user, merchantName: current.name });
        return data(
          { ok: true as const, message: 'No changes to save.', intent },
          { headers: { 'Set-Cookie': await commitSession(session) } },
        );
      }
      return { ok: true, message: 'No changes to save.', intent };
    }

    const result = await patchMerchant(pat, fields);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        intent,
      };
    }

    if (result.data.name !== user.merchantName) {
      session.set('user', { ...user, merchantName: result.data.name });
      return data(
        { ok: true as const, message: 'Merchant profile updated.', intent },
        { headers: { 'Set-Cookie': await commitSession(session) } },
      );
    }
    return { ok: true, message: 'Merchant profile updated.', intent };
  }

  if (intent === 'upload_logo') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', fieldErrors: null, intent };
    const file = form.get('file') as File | null;
    if (!file || file.size === 0) {
      return { ok: false, error: 'Please select a file.', fieldErrors: null, intent };
    }
    if (file.size > 2048 * 1024) {
      return { ok: false, error: 'File too large (max 2 MB).', fieldErrors: null, intent };
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return {
        ok: false,
        error: 'Only PNG, JPEG, or WebP images are accepted.',
        fieldErrors: null,
        intent,
      };
    }
    const result = await uploadMerchantLogo(pat, file);
    if (!result.ok) {
      return { ok: false, error: result.error.message, fieldErrors: null, intent };
    }
    return { ok: true, message: 'Logo uploaded.', intent };
  }

  if (intent === 'delete_logo') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', fieldErrors: null, intent };
    const result = await deleteMerchantLogo(pat);
    if (!result.ok) {
      return { ok: false, error: result.error.message, fieldErrors: null, intent };
    }
    return { ok: true, message: 'Logo removed.', intent };
  }

  return { ok: false, error: 'Unknown action.', fieldErrors: null, intent };
}

// ─── Logo drop zone ───────────────────────────────────────────────────────────

function LogoUploader({
  logoUrl,
  csrfToken,
  isAdmin,
}: {
  logoUrl: string | null;
  csrfToken: string;
  isAdmin: boolean;
}) {
  const fetcher = useFetcher<typeof action>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const isSubmitting = fetcher.state !== 'idle';
  const actionData = fetcher.data;

  useEffect(() => {
    if (fetcher.state === 'idle' && actionData?.ok && actionData.intent === 'upload_logo') {
      setPreview(null);
    }
  }, [fetcher.state, actionData]);

  function validateAndSubmit(file: File) {
    setClientError(null);
    if (file.size > 2048 * 1024) {
      setClientError('File too large (max 2 MB).');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setClientError('Only PNG, JPEG, or WebP images are accepted.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.set('csrf_token', csrfToken);
    fd.set('intent', 'upload_logo');
    fd.set('file', file);
    fetcher.submit(fd, { method: 'POST', encType: 'multipart/form-data' });
  }

  const shown = preview ?? logoUrl;
  const error =
    clientError ??
    (actionData &&
    !actionData.ok &&
    (actionData.intent === 'upload_logo' || actionData.intent === 'delete_logo')
      ? actionData.error
      : null);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Drop zone / preview */}
      <div
        onDragOver={(e) => {
          if (!isAdmin) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!isAdmin) return;
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSubmit(file);
        }}
        onClick={() => isAdmin && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (isAdmin && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role={isAdmin ? 'button' : undefined}
        tabIndex={isAdmin ? 0 : undefined}
        aria-label={isAdmin ? 'Upload merchant logo' : 'Merchant logo'}
        className={cn(
          'flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors',
          isAdmin && 'cursor-pointer',
          dragOver ? 'border-primary bg-primary-subtle' : 'border-line bg-surface-2/60',
        )}
      >
        {isSubmitting && preview ? (
          <Loader2 className="text-ink-3 size-6 animate-spin" aria-hidden />
        ) : shown ? (
          <img src={shown} alt="Merchant logo" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="text-ink-3 flex flex-col items-center gap-1.5">
            <ImageIcon className="size-6" aria-hidden />
            <span className="px-2 text-center text-[11px]">
              {isAdmin ? 'Drop a logo, or click to browse' : 'No logo'}
            </span>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) validateAndSubmit(file);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              loading={isSubmitting && !!preview}
            >
              <Upload aria-hidden /> Upload logo
            </Button>
            {logoUrl && (
              <fetcher.Form method="post" className="inline">
                <input type="hidden" name="csrf_token" value={csrfToken} />
                <input type="hidden" name="intent" value="delete_logo" />
                <Button
                  variant="danger-outline"
                  size="sm"
                  type="submit"
                  loading={isSubmitting && !preview}
                >
                  <Trash2 aria-hidden /> Remove
                </Button>
              </fetcher.Form>
            )}
          </div>
          <p className="text-ink-3 text-xs">PNG, JPEG, or WebP. Max 2 MB.</p>
          {error && (
            <p className="text-danger-ink text-xs" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Best-fit icon for a service assignment, keyed on its code/type. */
function serviceIcon(code: string, type: string): LucideIcon {
  const key = `${code} ${type}`.toLowerCase();
  if (key.includes('collect') || key.includes('checkout') || key.includes('payment')) {
    return ArrowDownToLine;
  }
  if (key.includes('payout') || key.includes('disburse') || key.includes('remit')) {
    return ArrowUpFromLine;
  }
  if (key.includes('card')) return CreditCard;
  if (key.includes('wallet')) return Wallet;
  if (key.includes('qr')) return QrCode;
  return Boxes;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MerchantPage() {
  const { merchant, merchantError, logoUrl, csrfToken, isAdmin } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, track, resetDirty, confirmOpen, confirmLeave, cancelLeave } = useDirtyGuard();
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  const actionData = fetcher.data;
  const isSubmitting = fetcher.state !== 'idle';

  useEffect(() => {
    track(formRef.current);
  }, [track]);

  // Toast feedback for the merchant form; errors also shown inline
  useEffect(() => {
    if (fetcher.state === 'idle' && actionData?.ok && actionData.intent === 'update_merchant') {
      toast.success(actionData.message ?? 'Saved.');
      resetDirty();
      if (formRef.current) {
        delete formRef.current.dataset.initial;
        track(formRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, actionData]);

  // Logo mutations feedback
  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      actionData?.ok &&
      (actionData.intent === 'upload_logo' || actionData.intent === 'delete_logo')
    ) {
      toast.success(actionData.message ?? 'Done.');
    }
  }, [fetcher.state, actionData, toast]);

  // Logo error feedback
  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      actionData &&
      !actionData.ok &&
      (actionData.intent === 'upload_logo' || actionData.intent === 'delete_logo')
    ) {
      toast.error(actionData.error ?? 'Something went wrong.');
    }
  }, [fetcher.state, actionData, toast]);

  function validateWebsite(value: string) {
    if (!value) {
      setWebsiteError(null);
      return;
    }
    if (!/^https:\/\/.+\..+/.test(value)) {
      setWebsiteError('Must be a full https:// URL (e.g. https://example.com).');
    } else {
      setWebsiteError(null);
    }
  }

  const updateError =
    actionData && !actionData.ok && actionData.intent === 'update_merchant' ? actionData : null;

  return (
    <div className="w-full max-w-[1200px] space-y-6">
      <PageHeader
        title="Merchant profile"
        description="Public business details shown on receipts and invoices."
      />

      {merchantError && (
        <Callout variant="danger" role="alert">
          {merchantError}
        </Callout>
      )}

      {merchant && (
        <>
          {/* ── Editable (admin) / read-only (non-admin) + services ──────────── */}
          <div
            className={cn(
              'grid grid-cols-1 items-start gap-6',
              merchant.services.length > 0 && 'lg:grid-cols-2',
            )}
          >
            {isAdmin ? (
              <div className="space-y-6">
                {updateError && (
                  <Callout variant="danger" role="alert">
                    {updateError.error}
                  </Callout>
                )}

                <Card>
                  <CardHeader
                    title="Business profile"
                    description="How your business appears in the portal and on customer-facing pages."
                  />
                  <div className="border-line border-b p-5">
                    <LogoUploader logoUrl={logoUrl} csrfToken={csrfToken} isAdmin={isAdmin} />
                  </div>
                  <fetcher.Form
                    id="merchant-profile-form"
                    method="post"
                    className="contents"
                    ref={formRef}
                    onChange={(e) => track(e.currentTarget)}
                  >
                    <input type="hidden" name="csrf_token" value={csrfToken} />
                    <input type="hidden" name="intent" value="update_merchant" />

                    {/* Business */}
                    <div className="space-y-4 p-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          label="Merchant name"
                          name="name"
                          required
                          error={updateError?.fieldErrors?.name?.[0]}
                        >
                          <Input defaultValue={merchant.name} required maxLength={150} />
                        </FormField>
                        <FormField label="Currency" name="currency_display">
                          <Input value={merchant.currency} disabled readOnly aria-readonly />
                        </FormField>
                      </div>
                      <FormField
                        label="Address"
                        name="address"
                        error={updateError?.fieldErrors?.address?.[0]}
                      >
                        <Input defaultValue={merchant.address ?? ''} maxLength={500} />
                      </FormField>
                      <FormField
                        label="Website"
                        name="website"
                        error={websiteError ?? updateError?.fieldErrors?.website?.[0]}
                        hint="Optional. Must start with https://"
                      >
                        <Input
                          type="url"
                          defaultValue={merchant.website ?? ''}
                          maxLength={2048}
                          placeholder="https://example.com"
                          onChange={(e) => validateWebsite(e.target.value)}
                        />
                      </FormField>
                    </div>
                    <div className="border-line space-y-4 border-t p-5">
                      <h3 className="text-ink text-sm font-semibold">Contact</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          label="Contact person"
                          name="contact_person"
                          error={updateError?.fieldErrors?.contact_person?.[0]}
                        >
                          <Input defaultValue={merchant.contact_person ?? ''} maxLength={100} />
                        </FormField>
                        <FormField
                          label="Business email"
                          name="email"
                          error={updateError?.fieldErrors?.email?.[0]}
                        >
                          <Input
                            type="email"
                            defaultValue={merchant.email ?? ''}
                            autoComplete="email"
                          />
                        </FormField>
                      </div>
                      <FormField
                        label="Phone"
                        name="phone"
                        error={updateError?.fieldErrors?.phone?.[0]}
                      >
                        <PhoneInput
                          defaultDial={merchant.dial_code}
                          defaultPhone={merchant.phone}
                        />
                      </FormField>
                    </div>
                  </fetcher.Form>
                </Card>

                {/* Sticky save bar while dirty */}
                <div
                  className={cn(
                    'border-line bg-surface shadow-card sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
                    dirty
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-2 opacity-0',
                  )}
                  aria-hidden={!dirty}
                >
                  <p className="text-ink-2 text-sm">You have unsaved changes</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        formRef.current?.reset();
                        setWebsiteError(null);
                        resetDirty();
                      }}
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      type="submit"
                      form="merchant-profile-form"
                      loading={isSubmitting}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader
                  title="Business profile"
                  description="How your business appears in the portal and on customer-facing pages."
                />
                <div className="border-line border-b p-5">
                  <LogoUploader logoUrl={logoUrl} csrfToken={csrfToken} isAdmin={isAdmin} />
                </div>
                <div className="p-5">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="Merchant name" value={merchant.name} />
                    <ReadOnlyField label="Contact person" value={merchant.contact_person} />
                    <ReadOnlyField label="Business email" value={merchant.email} />
                    <ReadOnlyField
                      label="Phone"
                      value={
                        merchant.phone ? `${merchant.dial_code ?? ''} ${merchant.phone}` : null
                      }
                    />
                    <ReadOnlyField label="Address" value={merchant.address} />
                    <ReadOnlyField label="Website" value={merchant.website} />
                    <ReadOnlyField label="Currency" value={merchant.currency} />
                    <ReadOnlyField label="Active" value={merchant.is_active ? 'Yes' : 'No'} />
                  </dl>
                </div>
              </Card>
            )}

            {/* ── Services (read-only for everyone) ────────────────────────────── */}
            {merchant.services.length > 0 && (
              <Card>
                <CardHeader
                  title="Services"
                  description="Payment services enabled on this merchant."
                />
                <div className="space-y-3 p-5">
                  {merchant.services.map((s) => {
                    const Icon = serviceIcon(s.code, s.type);
                    return (
                      <div
                        key={s.id}
                        className="border-line flex items-center gap-3 rounded-xl border p-3.5"
                      >
                        <span
                          className="bg-primary-subtle text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"
                          aria-hidden
                        >
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-ink truncate text-sm font-medium">{s.code}</p>
                          <p className="text-ink-3 text-xs capitalize">{s.type}</p>
                        </div>
                        <Badge variant={s.is_active ? 'success' : 'neutral'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </>
      )}

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
