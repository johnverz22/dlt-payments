import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const COOKIE_NAME = 'dlt-theme';
const COOKIE_RE = /(?:^|;\s*)dlt-theme=(light|dark|system)/;

function readCookie(): ThemePreference | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(COOKIE_RE);
  return m ? (m[1] as ThemePreference) : null;
}

export function getThemePreference(): ThemePreference {
  return readCookie() ?? 'system';
}

function resolveDark(theme: ThemePreference): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyThemePreference(theme: ThemePreference) {
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export function setThemePreference(theme: ThemePreference) {
  document.cookie = `${COOKIE_NAME}=${theme};path=/;max-age=31536000;SameSite=Lax`;
  try {
    localStorage.removeItem('theme');
  } catch {}
  applyThemePreference(theme);
}

/** Whether the resolved theme is currently dark (reads the DOM, the source of truth). */
export function isDarkNow(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/**
 * React hook: current preference + setter. Components using this stay in
 * sync because every setter writes the cookie then applies to the DOM.
 */
export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreference(getThemePreference());
  }, []);

  const set = (next: ThemePreference) => {
    setThemePreference(next);
    setPreference(next);
  };

  return { preference, set };
}
