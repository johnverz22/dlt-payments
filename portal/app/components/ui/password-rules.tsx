import { Check, Circle } from 'lucide-react';
import { cn } from '~/lib/utils';

export const PASSWORD_RULES = [
  {
    key: 'length',
    label: '12–128 characters',
    test: (p: string) => p.length >= 12 && p.length <= 128,
  },
  { key: 'upper', label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'symbol', label: 'Symbol (!@#$%^&*…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function passwordScore(password: string): number {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_LABEL = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'] as const;

/** Live rule checklist — hidden until typing begins; each rule turns green as it is met. */
export function PasswordRules({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="animate-in fade-in space-y-1 duration-200" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const passing = rule.test(password);
        return (
          <li
            key={rule.key}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              passing ? 'text-success-ink' : 'text-ink-2',
            )}
          >
            {passing ? (
              <Check className="text-success size-3.5" aria-hidden />
            ) : (
              <Circle className="text-ink-3 size-3.5" aria-hidden />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

/** 5-segment strength meter with a text label (not color alone). */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  const level = score; // 0–5
  const tone = level <= 2 ? 'bg-danger' : level === 3 ? 'bg-warning' : 'bg-success';
  return (
    <div aria-live="polite">
      <div
        className="flex gap-1"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={level}
        aria-label="Password strength"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn('h-1 flex-1 rounded-full', i < level ? tone : 'bg-surface-2')}
          />
        ))}
      </div>
      <p className="text-ink-3 mt-1 text-xs">{STRENGTH_LABEL[level]}</p>
    </div>
  );
}

/** Inline "passwords match / don't match" hint for the confirm field. */
export function PasswordMatchHint({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  if (!confirmation) return null;
  const match = password === confirmation;
  return (
    <p
      className={cn(
        'flex items-center gap-1 text-xs',
        match ? 'text-success-ink' : 'text-danger-ink',
      )}
      role={match ? undefined : 'alert'}
    >
      {match ? (
        <>
          <Check className="size-3.5" aria-hidden /> Passwords match
        </>
      ) : (
        'Passwords do not match'
      )}
    </p>
  );
}
