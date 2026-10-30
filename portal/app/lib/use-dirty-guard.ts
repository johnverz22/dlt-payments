import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';

/**
 * Dirty-form guard: tracks whether the form differs from its initial values,
 * warns on SPA navigation (useBlocker) and on tab close/reload (beforeunload).
 */
export function useDirtyGuard() {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const blocker = useBlocker(dirty);

  // Beforeunload covers hard reload / tab close (SPA blocker can't).
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Translate blocker state into a dialog open flag
  useEffect(() => {
    setConfirmOpen(blocker.state === 'blocked');
  }, [blocker.state]);

  /** Call from the form's onChange — compares all fields to initial values. */
  const track = useCallback((form: HTMLFormElement | null) => {
    if (!form) return;
    const fd = new FormData(form);
    const initial = form.dataset.initial;
    const current = JSON.stringify(
      [...fd.entries()].filter(([k]) => !k.startsWith('csrf') && k !== 'intent').sort(([a], [b]) => a.localeCompare(b)),
    );
    if (initial === undefined) {
      form.dataset.initial = current;
      setDirty(false);
      return;
    }
    setDirty(current !== initial);
  }, []);

  const resetDirty = useCallback(() => setDirty(false), []);

  const confirmLeave = useCallback(() => {
    blocker.proceed?.();
  }, [blocker]);

  const cancelLeave = useCallback(() => {
    blocker.reset?.();
    setConfirmOpen(false);
  }, [blocker]);

  return { dirty, track, resetDirty, confirmOpen, confirmLeave, cancelLeave, setConfirmOpen };
}
