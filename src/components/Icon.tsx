// Ikon garis sederhana (inline SVG, mengikuti warna teks).
const PATHS: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  kids: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 2a3 3 0 1 0 0-6M2 21v-1a6 6 0 0 1 12 0v1m3-6a5 5 0 0 1 5 5v1',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4m6-4v4',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z',
  book: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zm16 0h-4a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h5z',
  upload: 'M12 16V4m-5 5l5-5 5 5M4 20h16',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  back: 'M15 18l-6-6 6-6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
};

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
