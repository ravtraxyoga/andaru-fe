import type { SessionStatus } from './types';

const dtf = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
const df = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
const tf = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

export const fmtDateTime = (s: string) => dtf.format(new Date(s));
export const fmtDate = (s: string) => df.format(new Date(s));
export const fmtTime = (s: string) => tf.format(new Date(s));

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Terjadwal',
  in_progress: 'Sedang berjalan',
  submitted: 'Tuntas',
  expired: 'Waktu habis',
  missed: 'Terlewat',
  aborted: 'Dihentikan',
};

export const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function daysLabel(mask: number) {
  if (mask === 127) return 'Setiap hari';
  if (mask === 31) return 'Senin–Jumat';
  return DAYS.filter((_, i) => mask & (1 << i)).join(', ');
}

export function gapLabel(min: number) {
  if (min === 0) return 'tanpa jeda';
  if (min % 60 === 0) return `jeda ${min / 60} jam`;
  return `jeda ${min} menit`;
}

export const GAP_CHOICES = [0, 60, 120, 180, 240, 360, 480, 720];

export function scoreTone(score: number | null | undefined) {
  if (score == null) return 'muted';
  if (score >= 80) return 'good';
  if (score >= 60) return 'mid';
  return 'low';
}
