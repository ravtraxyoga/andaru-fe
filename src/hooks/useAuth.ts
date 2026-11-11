import { useSyncExternalStore } from 'react';
import { getParent } from '../api';

function subscribe(onChange: () => void) {
  window.addEventListener('auth-changed', onChange);
  return () => window.removeEventListener('auth-changed', onChange);
}

/** Ortu yang sedang login; komponen render ulang saat login, logout, atau sesi habis. */
export function useParent() {
  return useSyncExternalStore(subscribe, getParent);
}
