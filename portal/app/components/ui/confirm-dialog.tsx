import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from './button';

/**
 * Confirmation dialog (Radix AlertDialog — focus-trapped, Esc closes).
 * Controlled: `open`/`onOpenChange`; `onConfirm` fires on the action button.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  const Icon = danger ? ShieldAlert : AlertTriangle;
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface p-5 shadow-card focus:outline-none">
          <div className="flex items-start gap-3">
            <span
              className={
                danger
                  ? 'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-subtle text-danger-ink'
                  : 'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning-ink'
              }
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <AlertDialog.Title className="text-base font-semibold text-ink">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-ink-2">
                {message}
              </AlertDialog.Description>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="sm" className="h-9 px-4 text-sm">
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={danger ? 'danger' : 'primary'}
                size="sm"
                className="h-9 px-4 text-sm"
                loading={loading}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
