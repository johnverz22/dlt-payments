import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { data, useLoaderData, useFetcher, useSearchParams, redirect, useRevalidator } from 'react-router';
import { requireUser, getSession, destroySession } from '~/.server/session';
import {
  getMembers,
  getInvitations,
  updateMemberRole,
  removeMember,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  type TeamMember,
  type TeamInvitation,
} from '~/.server/dlt/team';
import { validateCsrfToken } from '~/.server/csrf';
import { useEffect, useState } from 'react';
import { Users, Mail, UserMinus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { DateTime } from 'luxon';
import { PageHeader } from '~/components/ui/page-header';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input, Select } from '~/components/ui/input';
import { FormField } from '~/components/ui/form-field';
import { Badge, InvitationStatusPill } from '~/components/ui/badge';
import { Callout } from '~/components/ui/callout';
import { EmptyState } from '~/components/ui/empty-state';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import { Pagination } from '~/components/ui/pagination';
import { Tooltip } from '~/components/ui/tooltip';
import { useToast } from '~/components/ui/toast';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => [{ title: 'Team | DLT Portal' }];

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat, user, csrfSecret, csrfSetCookie } = await requireUser(request);
  const url = new URL(request.url);

  const page = Number(url.searchParams.get('page') ?? '1');
  const perPage = Number(url.searchParams.get('per_page') ?? '25');
  const invPage = Number(url.searchParams.get('inv_page') ?? '1');
  const invStatus = (url.searchParams.get('inv_status') ?? '') as
    | ''
    | 'pending'
    | 'accepted'
    | 'expired'
    | 'revoked';

  const isAdmin = user.role === 'administrator';

  const [membersResult, invitationsResult] = await Promise.all([
    getMembers(pat, { page, per_page: perPage }),
    isAdmin
      ? getInvitations(pat, {
          page: invPage,
          per_page: 25,
          status: invStatus || undefined,
        })
      : Promise.resolve({ ok: true as const, data: { data: [], meta: { current_page: 1, per_page: 25, total: 0, last_page: 1 } } }),
  ]);

  const headers: HeadersInit = csrfSetCookie ? { 'Set-Cookie': csrfSetCookie } : {};
  return data(
    {
      members: membersResult.ok ? membersResult.data.data : [],
      membersMeta: membersResult.ok ? membersResult.data.meta : null,
      membersError: membersResult.ok ? null : membersResult.error.message,
      invitations: invitationsResult.ok ? invitationsResult.data.data : [],
      invitationsMeta: invitationsResult.ok ? invitationsResult.data.meta : null,
      invitationsError: invitationsResult.ok ? null : invitationsResult.error.message,
      csrfToken: csrfSecret,
      isAdmin,
      currentUserId: user.id,
    },
    { headers },
  );
}

// ─── Action ────────────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  const { pat, user, csrfSecret } = await requireUser(request);
  const isAdmin = user.role === 'administrator';

  const form = await request.formData();
  const intent = form.get('intent') as string;
  const csrfToken = form.get('csrf_token') as string;

  if (!validateCsrfToken(csrfToken, csrfSecret)) {
    return { ok: false, error: 'Invalid request. Please try again.', intent };
  }

  // ── Change role ──
  if (intent === 'change_role') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', intent };
    const memberId = Number(form.get('member_id'));
    const newRole = form.get('role') as 'administrator' | 'developer';

    const result = await updateMemberRole(pat, memberId, newRole);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      if (errorCode === 'LAST_ADMINISTRATOR') {
        return {
          ok: false,
          error: 'Cannot change role: this is the only active administrator. Add another administrator first.',
          intent,
        };
      }
      if (errorCode === 'RATE_LIMITED') {
        return {
          ok: false,
          error: 'Too many team changes. Please wait a moment and try again.',
          intent,
        };
      }
      return { ok: false, error: result.error.message, intent };
    }

    // Self-demotion: destroy session so they re-authenticate with new role
    if (memberId === user.id && newRole === 'developer') {
      const session = await getSession(request.headers.get('Cookie'));
      throw redirect('/login?reason=role_changed', {
        headers: { 'Set-Cookie': await destroySession(session) },
      });
    }

    return { ok: true, message: 'Member role updated.', intent };
  }

  // ── Remove member ──
  if (intent === 'remove_member') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', intent };
    const memberId = Number(form.get('member_id'));

    const result = await removeMember(pat, memberId);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      if (errorCode === 'LAST_ADMINISTRATOR') {
        return {
          ok: false,
          error: 'Cannot remove: this is the only active administrator. Add another administrator first.',
          intent,
        };
      }
      if (errorCode === 'RATE_LIMITED') {
        return {
          ok: false,
          error: 'Too many team changes. Please wait a moment and try again.',
          intent,
        };
      }
      return { ok: false, error: result.error.message, intent };
    }

    // Self-removal: destroy session
    if (memberId === user.id) {
      const session = await getSession(request.headers.get('Cookie'));
      throw redirect('/login', {
        headers: { 'Set-Cookie': await destroySession(session) },
      });
    }

    return { ok: true, message: 'Member removed.', intent };
  }

  // ── Invite member ──
  if (intent === 'invite') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', intent };
    const email = (form.get('email') as string).trim().toLowerCase();
    const role = form.get('role') as 'administrator' | 'developer';

    if (!email) return { ok: false, error: 'Email is required.', intent };
    if (!role) return { ok: false, error: 'Role is required.', intent };

    const result = await createInvitation(pat, email, role);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      const map: Record<string, string> = {
        MEMBER_ALREADY_EXISTS: 'This person is already a member of your team.',
        INVITATION_ALREADY_PENDING: 'A pending invitation already exists for this email.',
        USER_BELONGS_TO_ANOTHER_MERCHANT: 'This user belongs to another merchant and cannot be invited.',
        USER_NOT_ELIGIBLE: 'This user is not eligible for membership (internal DLT accounts cannot join).',
        USER_IDENTITY_CONFLICT: 'This email conflicts with an existing identity. Contact support.',
        RATE_LIMITED: 'Too many invitations sent. Please wait a moment and try again.',
      };
      return {
        ok: false,
        error: map[errorCode ?? ''] ?? result.error.message,
        fieldErrors: result.error.fieldErrors ?? null,
        intent,
      };
    }

    // sent: false — invitation saved but email not delivered
    if (result.data.sent === false) {
      return {
        ok: true,
        message: 'Invitation saved, but the email could not be sent. Use Resend to try again.',
        invitationId: result.data.id,
        sent: false,
        intent,
      };
    }

    return { ok: true, message: 'Invitation sent.', intent };
  }

  // ── Resend invitation ──
  if (intent === 'resend_invitation') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', intent };
    const invitationId = form.get('invitation_id') as string;

    const result = await resendInvitation(pat, invitationId);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      const map: Record<string, string> = {
        RATE_LIMITED: 'Too many invitations sent. Please wait a moment and try again.',
        INVITATION_ALREADY_PENDING: 'A newer pending invitation already exists for this email.',
      };
      if (result.error.status === 410) {
        return { ok: false, error: 'This invitation has already been accepted or revoked and cannot be resent.', intent };
      }
      return { ok: false, error: map[errorCode ?? ''] ?? result.error.message, intent };
    }

    const sent = result.data.sent;
    return {
      ok: true,
      message: sent ? 'Invitation resent.' : 'Invitation updated, but email could not be delivered.',
      intent,
    };
  }

  // ── Revoke invitation ──
  if (intent === 'revoke_invitation') {
    if (!isAdmin) return { ok: false, error: 'Forbidden', intent };
    const invitationId = form.get('invitation_id') as string;

    const result = await revokeInvitation(pat, invitationId);
    if (!result.ok) {
      const errorCode = result.error.errorCode;
      if (result.error.status === 410) {
        return { ok: false, error: 'This invitation cannot be revoked (already accepted).', intent };
      }
      if (errorCode === 'RATE_LIMITED') {
        return { ok: false, error: 'Too many team changes. Please wait a moment and try again.', intent };
      }
      return { ok: false, error: result.error.message, intent };
    }

    return { ok: true, message: 'Invitation revoked.', intent };
  }

  return { ok: false, error: 'Unknown action.', intent };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts: string | null): string {
  if (!ts) return '—';
  const dt = DateTime.fromISO(ts, { zone: 'Asia/Manila' });
  return dt.isValid ? dt.toFormat('dd MMM yyyy') : '—';
}

function RoleBadge({ role }: { role: 'administrator' | 'developer' }) {
  return (
    <Badge variant={role === 'administrator' ? 'primary' : 'neutral'}>
      {role === 'administrator' ? 'Administrator' : 'Developer'}
    </Badge>
  );
}

function StatusText({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
      <span
        className={cn('size-2 rounded-full', active ? 'bg-success' : 'bg-ink-3/40')}
        aria-hidden
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Invite form ────────────────────────────────────────────────────────────────

function InviteForm({ csrfToken, onDone }: { csrfToken: string; onDone: () => void }) {
  const fetcher = useFetcher<typeof action>();
  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data;
  const toast = useToast();

  const inviteError = actionData?.intent === 'invite' && !actionData.ok ? actionData.error : null;
  const fieldErrors = actionData?.intent === 'invite' && 'fieldErrors' in actionData
    ? actionData.fieldErrors
    : null;

  useEffect(() => {
    if (fetcher.state === 'idle' && actionData?.ok && actionData.intent === 'invite') {
      toast.success(actionData.message ?? 'Invitation sent.');
      onDone();
    } else if (fetcher.state === 'idle' && actionData && !actionData.ok && actionData.intent === 'invite') {
      toast.error(actionData.error ?? 'Something went wrong.');
    }
  }, [fetcher.state, actionData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-ink">Send invitation</h3>
      <fetcher.Form method="POST" className="space-y-4">
        <input type="hidden" name="intent" value="invite" />
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Email"
            name="email"
            required
            error={fieldErrors?.email?.[0]}
          >
            <Input type="email" required maxLength={255} placeholder="colleague@example.com" />
          </FormField>
          <FormField label="Role" name="role" required error={fieldErrors?.role?.[0]}>
            <Select name="role" required>
              <option value="developer">Developer</option>
              <option value="administrator">Administrator</option>
            </Select>
          </FormField>
        </div>
        {inviteError && !fieldErrors && (
          <Callout variant="danger" role="alert">
            {inviteError}
          </Callout>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send invitation
          </Button>
        </div>
      </fetcher.Form>
    </Card>
  );
}

// ─── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({
  members,
  membersMeta,
  isAdmin,
  currentUserId,
  csrfToken,
}: {
  members: TeamMember[];
  membersMeta: { current_page: number; last_page: number; total: number; per_page: number } | null;
  isAdmin: boolean;
  currentUserId: number;
  csrfToken: string;
}) {
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const [, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{
    type: 'change_role' | 'remove';
    memberId: number;
    newRole?: 'administrator' | 'developer';
    memberName: string;
    isSelf: boolean;
  } | null>(null);

  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data;

  // Toast feedback for member mutations
  useEffect(() => {
    if (fetcher.state === 'idle' && actionData) {
      if (actionData.ok && (actionData.intent === 'change_role' || actionData.intent === 'remove_member')) {
        toast.success(actionData.message ?? 'Done.');
        revalidator.revalidate();
      } else if (!actionData.ok && (actionData.intent === 'change_role' || actionData.intent === 'remove_member')) {
        toast.error(actionData.error ?? 'Something went wrong.');
      }
    }
  }, [fetcher.state, actionData]) // eslint-disable-line react-hooks/exhaustive-deps

  function submitConfirmed() {
    if (!confirm) return;
    const fd = new FormData();
    fd.set('csrf_token', csrfToken);
    fd.set('member_id', String(confirm.memberId));
    if (confirm.type === 'change_role' && confirm.newRole) {
      fd.set('intent', 'change_role');
      fd.set('role', confirm.newRole);
    } else {
      fd.set('intent', 'remove_member');
    }
    fetcher.submit(fd, { method: 'POST' });
    setConfirm(null);
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface sm:block">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wider text-ink-3">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((member) => {
              const isSelf = member.id === currentUserId;
              return (
                <tr key={member.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3 font-medium text-ink">
                    {member.first_name} {member.last_name}
                    {isSelf && <span className="ml-1.5 text-xs text-ink-3">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{member.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin && !isSelf ? (
                      <Select
                        aria-label={`Change role for ${member.first_name} ${member.last_name}`}
                        defaultValue={member.role}
                        disabled={isSubmitting}
                        className="w-36"
                        onChange={(e) => {
                          const newRole = e.target.value as 'administrator' | 'developer';
                          if (newRole !== member.role) {
                            setConfirm({
                              type: 'change_role',
                              memberId: member.id,
                              newRole,
                              memberName: `${member.first_name} ${member.last_name}`,
                              isSelf,
                            });
                            e.target.value = member.role;
                          }
                        }}
                      >
                        <option value="administrator">Administrator</option>
                        <option value="developer">Developer</option>
                      </Select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusText active={member.is_active} />
                  </td>
                  <td className="px-4 py-3 text-ink-3">{fmtDate(member.joined_at)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <Tooltip content="You can't change your own membership">
                          <span className="inline-flex cursor-not-allowed rounded-md p-1.5 text-ink-3/50">
                            <UserMinus className="size-4" aria-hidden />
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip content={`Remove ${member.first_name} ${member.last_name}`}>
                          <button
                            type="button"
                            aria-label={`Remove ${member.first_name} ${member.last_name}`}
                            disabled={isSubmitting}
                            onClick={() =>
                              setConfirm({
                                type: 'remove',
                                memberId: member.id,
                                memberName: `${member.first_name} ${member.last_name}`,
                                isSelf,
                              })
                            }
                            className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-subtle hover:text-danger-ink disabled:opacity-50"
                          >
                            <UserMinus className="size-4" aria-hidden />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (<640px) */}
      <ul className="space-y-3 sm:hidden">
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          return (
            <li key={member.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {member.first_name} {member.last_name}
                    {isSelf && <span className="ml-1 text-xs text-ink-3">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-ink-3">{member.email}</p>
                </div>
                <RoleBadge role={member.role} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
                <StatusText active={member.is_active} />
                <span>Joined {fmtDate(member.joined_at)}</span>
              </div>
              {isAdmin && !isSelf && (
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  <Select
                    aria-label={`Change role for ${member.first_name} ${member.last_name}`}
                    defaultValue={member.role}
                    disabled={isSubmitting}
                    className="flex-1"
                    onChange={(e) => {
                      const newRole = e.target.value as 'administrator' | 'developer';
                      if (newRole !== member.role) {
                        setConfirm({
                          type: 'change_role',
                          memberId: member.id,
                          newRole,
                          memberName: `${member.first_name} ${member.last_name}`,
                          isSelf,
                        });
                        e.target.value = member.role;
                      }
                    }}
                  >
                    <option value="administrator">Administrator</option>
                    <option value="developer">Developer</option>
                  </Select>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    aria-label={`Remove ${member.first_name} ${member.last_name}`}
                    disabled={isSubmitting}
                    onClick={() =>
                      setConfirm({
                        type: 'remove',
                        memberId: member.id,
                        memberName: `${member.first_name} ${member.last_name}`,
                        isSelf,
                      })
                    }
                  >
                    <UserMinus aria-hidden />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {membersMeta && (
        <Pagination
          currentPage={membersMeta.current_page}
          lastPage={membersMeta.last_page}
          total={membersMeta.total}
          noun="members"
          onPage={(p) =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('page', String(p));
              return next;
            })
          }
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.type === 'change_role' ? 'Change role?' : 'Remove member?'}
        message={
          confirm?.type === 'change_role'
            ? `This will change ${confirm.memberName}'s role to ${confirm.newRole}. Their current session tokens will be revoked and they'll need to log in again.${
                confirm.isSelf ? ' You will be logged out.' : ''
              }`
            : `This will remove ${confirm?.memberName ?? ''} from the team. Their session tokens will be revoked.${
                confirm?.isSelf ? ' You will be logged out.' : ''
              }`
        }
        confirmLabel={confirm?.type === 'change_role' ? 'Change role' : 'Remove'}
        danger={confirm?.type === 'remove'}
        loading={isSubmitting}
        onConfirm={submitConfirmed}
      />
    </div>
  );
}

// ─── Invitations tab ────────────────────────────────────────────────────────────

function InvitationsTab({
  invitations,
  invitationsMeta,
  csrfToken,
}: {
  invitations: TeamInvitation[];
  invitationsMeta: { current_page: number; last_page: number; total: number; per_page: number } | null;
  csrfToken: string;
}) {
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; email: string } | null>(null);

  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data;
  const invStatus = searchParams.get('inv_status') ?? '';

  // Toast feedback for resend/revoke
  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      actionData &&
      (actionData.intent === 'resend_invitation' || actionData.intent === 'revoke_invitation')
    ) {
      if (actionData.ok) {
        toast.success(actionData.message ?? 'Done.');
        revalidator.revalidate();
      } else {
        toast.error(actionData.error ?? 'Something went wrong.');
      }
    }
  }, [fetcher.state, actionData]) // eslint-disable-line react-hooks/exhaustive-deps

  function submitRevoke() {
    if (!confirmRevoke) return;
    const fd = new FormData();
    fd.set('intent', 'revoke_invitation');
    fd.set('csrf_token', csrfToken);
    fd.set('invitation_id', confirmRevoke.id);
    fetcher.submit(fd, { method: 'POST' });
    setConfirmRevoke(null);
  }

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'expired', label: 'Expired' },
    { value: 'revoked', label: 'Revoked' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="inv-status" className="text-sm font-medium text-ink-2">
          Status
        </label>
        <Select
          id="inv-status"
          value={invStatus}
          onChange={(e) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (e.target.value) next.set('inv_status', e.target.value);
              else next.delete('inv_status');
              next.delete('inv_page');
              next.set('tab', 'invitations');
              return next;
            });
          }}
          className="w-40"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Table / empty state */}
      {invitations.length === 0 ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="No invitations"
            description="Invite teammates to give them access to this merchant account."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wider text-ink-3">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invited by</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invitations.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3 text-ink">{inv.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={inv.role} />
                  </td>
                  <td className="px-4 py-3">
                    <InvitationStatusPill status={inv.status} />
                    {inv.sent === false && (
                      <span className="ml-1.5 text-xs text-warning-ink">(email not sent)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-3">{inv.invited_by ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-3">{fmtDate(inv.created_at)}</td>
                  <td className="px-4 py-3 text-ink-3">{fmtDate(inv.expires_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {(inv.status === 'pending' || inv.status === 'expired') && (
                        <fetcher.Form method="POST">
                          <input type="hidden" name="intent" value="resend_invitation" />
                          <input type="hidden" name="csrf_token" value={csrfToken} />
                          <input type="hidden" name="invitation_id" value={inv.id} />
                          <Tooltip content="Resend invitation">
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              aria-label={`Resend invitation to ${inv.email}`}
                              className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-50"
                            >
                              <RefreshCw className="size-4" aria-hidden />
                            </button>
                          </Tooltip>
                        </fetcher.Form>
                      )}
                      {inv.status === 'pending' && (
                        <Tooltip content="Revoke invitation">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            aria-label={`Revoke invitation for ${inv.email}`}
                            onClick={() => setConfirmRevoke({ id: inv.id, email: inv.email })}
                            className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-subtle hover:text-danger-ink disabled:opacity-50"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invitationsMeta && (
        <Pagination
          currentPage={invitationsMeta.current_page}
          lastPage={invitationsMeta.last_page}
          total={invitationsMeta.total}
          noun="invitations"
          onPage={(p) =>
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('inv_page', String(p));
              next.set('tab', 'invitations');
              return next;
            })
          }
        />
      )}

      <ConfirmDialog
        open={!!confirmRevoke}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title="Revoke invitation?"
        message={`The invitation for ${confirmRevoke?.email} will be revoked. They will not be able to use the invitation link.`}
        confirmLabel="Revoke"
        danger
        loading={isSubmitting}
        onConfirm={submitRevoke}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const {
    members,
    membersMeta,
    membersError,
    invitations,
    invitationsMeta,
    invitationsError,
    csrfToken,
    isAdmin,
    currentUserId,
  } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const activeTab = searchParams.get('tab') === 'invitations' ? 'invitations' : 'members';

  return (
    <div className="w-full max-w-[1200px] space-y-6">
      <PageHeader
        title="Team"
        description="Manage team members and invitations for your merchant account."
        actions={
          isAdmin && !showInviteForm ? (
            <Button onClick={() => setShowInviteForm(true)}>
              <UserPlus aria-hidden /> Invite member
            </Button>
          ) : undefined
        }
      />

      {showInviteForm && isAdmin && (
        <InviteForm csrfToken={csrfToken} onDone={() => setShowInviteForm(false)} />
      )}

      {/* Tabs */}
      <div className="border-b border-line">
        <nav className="-mb-px flex gap-6" aria-label="Team tabs">
          {(
            [
              { key: 'members', label: 'Members', icon: Users },
              ...(isAdmin ? [{ key: 'invitations', label: 'Invitations', icon: Mail }] : []),
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (key === 'members') next.delete('tab');
                  else next.set('tab', key);
                  return next;
                })
              }
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2',
              )}
              aria-current={activeTab === key ? 'page' : undefined}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Members tab */}
      {activeTab === 'members' &&
        (membersError ? (
          <Callout variant="danger" role="alert">
            {membersError}
          </Callout>
        ) : (
          <MembersTab
            members={members}
            membersMeta={membersMeta}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            csrfToken={csrfToken}
          />
        ))}

      {/* Invitations tab */}
      {activeTab === 'invitations' &&
        isAdmin &&
        (invitationsError ? (
          <Callout variant="danger" role="alert">
            {invitationsError}
          </Callout>
        ) : (
          <InvitationsTab
            invitations={invitations}
            invitationsMeta={invitationsMeta}
            csrfToken={csrfToken}
          />
        ))}
    </div>
  );
}
