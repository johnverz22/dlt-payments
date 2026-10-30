import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '~/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

const ToastContext = React.createContext<{
  toast: (variant: ToastVariant, title: string, description?: string) => void;
}>({ toast: () => {} });

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((variant: ToastVariant, title: string, description?: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-3), { id, variant, title, description }]);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((t) => {
          const Icon = t.variant === 'success' ? CheckCircle2 : t.variant === 'error' ? AlertCircle : Info;
          return (
            <ToastPrimitive.Root
              key={t.id}
              onOpenChange={(open) => !open && dismiss(t.id)}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-card',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-5',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
                t.variant === 'success' && 'border-line bg-surface text-success-ink',
                t.variant === 'error' && 'border-line bg-surface text-danger-ink',
                t.variant === 'info' && 'border-line bg-surface text-ink',
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <ToastPrimitive.Title className="text-sm font-semibold text-ink">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="mt-0.5 text-xs text-ink-2">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close
                className="rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const { toast } = React.useContext(ToastContext);
  return {
    toast,
    success: (title: string, description?: string) => toast('success', title, description),
    error: (title: string, description?: string) => toast('error', title, description),
    info: (title: string, description?: string) => toast('info', title, description),
  };
}
