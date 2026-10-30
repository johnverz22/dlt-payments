import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '~/lib/utils';
import { controlClass } from './input';

/** Small curated dial-code list — most common for this portal's market first. */
const COUNTRIES = [
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { iso: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { iso: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
  { iso: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
];

function normalizeDial(dial?: string | null): string {
  if (!dial) return '+63';
  return dial.startsWith('+') ? dial : `+${dial}`;
}

/**
 * Merged country-code + phone control. Keeps the existing form contract:
 * two hidden inputs named `dial_code` and `phone` carry the values.
 */
export function PhoneInput({
  name = 'phone',
  dialName = 'dial_code',
  defaultDial,
  defaultPhone,
  disabled,
  onChange,
}: {
  name?: string;
  dialName?: string;
  defaultDial?: string | null;
  defaultPhone?: string | null;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const initial = normalizeDial(defaultDial);
  const known = COUNTRIES.some((c) => c.dial === initial);
  const [dial, setDial] = React.useState(known ? initial : '+63');
  const [customDial, setCustomDial] = React.useState(known ? '' : initial);
  const [phone, setPhone] = React.useState(defaultPhone ?? '');

  const effectiveDial = customDial || dial;

  return (
    <div className="flex gap-2">
      {/* Country / dial code select */}
      <div className="relative w-[132px] shrink-0">
        <select
          aria-label="Country dial code"
          disabled={disabled}
          value={customDial ? 'custom' : dial}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setCustomDial('+');
            } else {
              setCustomDial('');
              setDial(e.target.value);
            }
            onChange?.();
          }}
          className={cn(controlClass, 'h-9 cursor-pointer appearance-none pl-8 pr-7')}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.dial}>
              {c.iso} {c.dial}
            </option>
          ))}
          <option value="custom">Other…</option>
        </select>
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" aria-hidden>
          {customDial ? '🌐' : (COUNTRIES.find((c) => c.dial === dial)?.flag ?? '🌐')}
        </span>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      </div>

      {customDial !== '' && (
        <input
          aria-label="Custom dial code"
          value={customDial}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d+]/g, '');
            setCustomDial(v.startsWith('+') ? v : `+${v}`);
            onChange?.();
          }}
          className={cn(controlClass, 'h-9 w-20 font-mono')}
          placeholder="+00"
          maxLength={8}
        />
      )}

      {/* National number */}
      <input
        aria-label="Phone number"
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        disabled={disabled}
        value={phone}
        maxLength={30}
        placeholder="917 123 4567"
        onChange={(e) => {
          setPhone(e.target.value);
          onChange?.();
        }}
        className={cn(controlClass, 'h-9 flex-1')}
      />

      {/* Form contract preserved — the action reads these names */}
      <input type="hidden" name={dialName} value={effectiveDial} />
      <input type="hidden" name={name} value={phone} />
    </div>
  );
}
