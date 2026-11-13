import { useSyncExternalStore } from 'react';
import { getAuth, getParent } from '../api';

function subscribe(onChange: () => void) {
  window.addEventListener('auth-changed', onChange);
  return () => window.removeEventListener('auth-changed', onChange);
}

/** Ortu yang sedang login; komponen render ulang saat login, logout, atau sesi habis. */
export function useParent() {
  return useSyncExternalStore(subscribe, getParent);
}

/** Admin yang sedang masuk sebagai akun ini (impersonate), atau null. */
export function useImpersonation() {
  const a = useSyncExternalStore(subscribe, getAuth);
  return a?.impersonator ? { by: a.impersonator, until: a.expires_at ?? null, parent: a.parent } : null;
}
