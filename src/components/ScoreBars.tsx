import type { SessionRow } from '../types';
import { fmtDateTime } from '../format';

/** Skor beberapa sesi terakhir, lama ke baru; sesi terbaru diberi warna penuh. */
export function ScoreBars({ sessions }: { sessions: SessionRow[] }) {
  const rows = [...sessions].reverse();
  if (rows.length === 0) return <p className="muted small">Belum ada sesi selesai.</p>;
  return (
    <div className="bars" role="img" aria-label={`Skor ${rows.length} sesi terakhir: ${rows.map((r) => r.score ?? 0).join(', ')}`}>
      {rows.map((r, i) => (
        <div key={r.id} className={`bar${i === rows.length - 1 ? ' last' : ''}`} title={`${r.subject} · ${fmtDateTime(r.scheduled_for)}`}>
          <b>{r.score ?? '–'}</b>
          <i style={{ height: `${Math.max(4, r.score ?? 0)}%` }} />
          <small>{r.subject.slice(0, 6)}</small>
        </div>
      ))}
    </div>
  );
}
