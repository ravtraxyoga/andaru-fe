// Pilihan tampilan: ikuti sistem, terang, atau gelap. Diterapkan lewat <html data-theme>;
// index.html menerapkan pilihan tersimpan sebelum React jalan supaya tidak berkedip.
import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'andaru.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let pref = read();

const isDark = () => pref === 'dark' || (pref === 'system' && media.matches);

function apply() {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark() ? '#170F33' : '#5A2FD6');
  window.dispatchEvent(new Event('theme-changed'));
}

export function setThemePref(v: ThemePref) {
  pref = v;
  try {
    if (v === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } catch { /* abaikan */ }
  apply();
}

/** Ganti cepat terang <-> gelap dari tampilan yang sedang terlihat. */
export const toggleTheme = () => setThemePref(isDark() ? 'light' : 'dark');

media.addEventListener('change', apply);
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    pref = read();
    apply();
  }
});
apply();

const sub = (cb: () => void) => {
  window.addEventListener('theme-changed', cb);
  return () => window.removeEventListener('theme-changed', cb);
};
export const useThemePref = () => useSyncExternalStore(sub, () => pref);
export const useIsDark = () => useSyncExternalStore(sub, isDark);
