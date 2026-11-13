import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { fmtDateTime, fmtDuration, fmtTime, scoreTone, STATUS_LABEL } from '../format';
import type { Report, ReviewItem } from '../types';

const EVENT_LABEL: Record<string, string> = {
  focus_break: 'Keluar dari Mode Fokus',
  resume: 'Aplikasi dibuka lagi, sesi dilanjutkan',
  lock_released: 'Kunci dibuka',
  time_sync: 'Sinkron waktu',
};

export default function SessionReport() {
  const { id } = useParams();
  const [showReview, setShowReview] = useState(false);
  const q = useQuery({ queryKey: ['report', id], queryFn: ({ signal }) => api<Report>(`/sessions/${id}/report`, { signal }) });
  const review = useQuery({
    queryKey: ['review', id],
    queryFn: ({ signal }) => api<{ items: ReviewItem[] }>(`/sessions/${id}/review`, { signal }),
    enabled: showReview,
  });
  if (q.isLoading) return <p className="muted">Memuat…</p>;
  if (q.error) return <div className="error">{(q.error as Error).message}</div>;
  const r = q.data!;
  const used = r.started_at && (r.submitted_at ?? r.ends_at) ? Math.max(0, (new Date(r.submitted_at ?? r.ends_at!).getTime() - new Date(r.started_at).getTime()) / 1000) : null;
  const done = ['submitted', 'expired', 'aborted'].includes(r.status);
  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link to="/laporan" className="row small" style={{ gap: 4, textDecoration: 'none' }}><Icon name="back" size={16} /> Laporan</Link>
      <div className="topbar">
        <div>
          <p className="muted small">{r.child.name} · {fmtDateTime(r.scheduled_for)}</p>
          <h1>{r.subject}</h1>
        </div>
        <span className="badge muted">{STATUS_LABEL[r.status]}</span>
      </div>
      <div className="grid two">
        <div className="card stack">
          <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)' }}>{r.score ?? '–'}</span>
            <span className="muted">{r.correct_count ?? 0} dari {r.question_count} benar · {r.answered} dijawab</span>
          </div>
          <p className="small">
            Waktu {used != null ? fmtDuration(Math.round(used)) : '–'} dari {fmtDuration(r.duration_sec)}
            {r.focus_mode ? (r.focus_breaks === 0 ? ' · tuntas tanpa keluar' : ` · keluar ${r.focus_breaks}×`) : ' · tanpa Mode Fokus'}
          </p>
          {r.xp_awarded > 0 && <span className="badge dark" style={{ alignSelf: 'flex-start' }}>+{r.xp_awarded} XP</span>}
          {r.topics.length > 0 && (
            <div className="list">
              {r.topics.map((t) => (
                <div className="item" key={t.topic}>
                  <span>{t.topic}</span>
                  <span className={`badge ${scoreTone((t.correct / t.total) * 100)}`}>{t.correct}/{t.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card stack">
          <h2>Catatan keamanan</h2>
          {r.events.length === 0 && <p className="muted small">Tidak ada kejadian selama sesi.</p>}
          <div className="list">
            {r.events.map((e, i) => (
              <div className="item" key={i}>
                <span>{EVENT_LABEL[e.type] ?? e.type}{e.meta && typeof e.meta.by === 'string' ? ` (${e.meta.by === 'parent_pin' ? 'PIN di HP anak' : 'dari HP orang tua'})` : ''}</span>
                <span className="small muted">{fmtTime(e.at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {done && (
        <div className="card stack">
          <div className="row between">
            <h2>Pembahasan</h2>
            {!showReview && <button className="btn sm ghost" onClick={() => setShowReview(true)}>Tampilkan</button>}
          </div>
          {review.isLoading && <p className="muted small">Memuat…</p>}
          {review.data?.items.map((it) => (
            <div key={it.position} className="stack" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div className="row between">
                <span className="strong">Soal {it.position} · {it.topic}</span>
                <span className={`badge ${it.is_correct ? 'good' : it.chosen ? 'low' : 'muted'}`}>{it.is_correct ? 'Benar' : it.chosen ? 'Salah' : 'Tidak dijawab'}</span>
              </div>
              <p className="pre">{it.stem}</p>
              {it.image_url && <img src={it.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 12 }} />}
              <div className="grid two" style={{ gap: 8 }}>
                {it.options.map((o, i) => {
                  const k = String.fromCharCode(65 + i);
                  const cls = k === it.correct ? 'correct' : k === it.chosen ? 'wrong' : '';
                  return <div key={k} className={`opt ${cls}`}><b>{k}.</b> {o}</div>;
                })}
              </div>
              {it.explanation && <p className="pre small muted">{it.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
