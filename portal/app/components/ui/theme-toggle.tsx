import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { isDarkNow, setThemePreference } from '~/lib/theme';

/** Resolved dark state, kept in sync with the `dark` class on <html>. */
function useIsDark() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const update = () => setDark(isDarkNow());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** Single-button light/dark theme toggle. */
export function ThemeToggle() {
  const dark = useIsDark();
  const Icon = dark ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={() => setThemePreference(dark ? 'light' : 'dark')}
      className="text-ink-2 hover:bg-surface-2 hover:text-ink inline-flex size-9 items-center justify-center rounded-lg transition-colors"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={dark}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
