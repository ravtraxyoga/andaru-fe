import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { ChildSwitcher, NoChild } from '../components/ChildSwitcher';
import { LevelCard } from '../components/LevelCard';
import { ScoreBars } from '../components/ScoreBars';
import { useParent } from '../hooks/useAuth';
import { useSelectedChild } from '../hooks/useChildren';
import { fmtDateTime, scoreTone, STATUS_LABEL } from '../format';
import type { Summary } from '../types';

export default function Dashboard() {
  const parent = useParent()!;
  const { children, child, loading } = useSelectedChild();
  const q = useQuery({
    queryKey: ['summary', child?.id],
    queryFn: ({ signal }) => api<Summary>(`/children/${child!.id}/summary`, { signal }),
    enabled: !!child,
    refetchInterval: 60_000,
  });
  if (loading) return <p className="muted">Memuat…</p>;
  if (!children.length) return <NoChild />;
  const s = q.data;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <p className="muted small">Halo, {parent.name}</p>
          <h1>Pantau Anak</h1>
        </div>
        <ChildSwitcher />
      </div>
      {q.error && <div className="error">{(q.error as Error).message}</div>}
      {s && (
        <>
          {!s.child.paired && (
            <div className="notice">
              HP {s.child.name} belum dipasangkan. Buka menu <Link to="/anak">Anak</Link> untuk membuat kode pairing.
            </div>
          )}
          <div className="grid two">
            <div className="card accent stack">
              <div className="row">
                <span className="avatar lg">{s.child.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <h2>{s.child.name}</h2>
                  <p className="muted small">{s.level.label} · kelas {s.child.grade}</p>
                </div>
              </div>
              <div className="stats">
                <div className="stat"><b>{s.sessions_this_week}</b><span>Sesi minggu ini</span></div>
                <div className="stat"><b>{s.avg_score_30d ?? '–'}</b><span>Rata-rata skor 30 hari</span></div>
                <div className="stat"><b>{s.child.streak_days}</b><span>Hari beruntun</span></div>
                <div className="stat"><b>{s.missed_30d}</b><span>Terlewat 30 hari</span></div>
              </div>
            </div>
            <LevelCard level={s.level} streak={s.child.streak_days} promo={s.promo} />
          </div>

          <div className="grid two">
            <div className="card stack">
              <div className="row between">
                <h2>Sesi berikutnya</h2>
                <Link className="btn sm ghost" to="/jadwal">Atur jadwal</Link>
              </div>
              {s.next_sessions.length === 0 && <p className="muted small">Belum ada jadwal.</p>}
              <div className="list">
                {s.next_sessions.map((n) => (
                  <div className="item" key={n.id}>
                    <span className="strong">{n.subject} · {n.question_count} soal</span>
                    <span className="small muted">{n.status === 'in_progress' ? <span className="badge mid">Sedang berjalan</span> : fmtDateTime(n.scheduled_for)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card stack">
              <h2>Skor 6 sesi terakhir</h2>
              <ScoreBars sessions={s.recent.filter((r) => r.score != null)} />
            </div>
          </div>

          <div className="grid two">
            <div className="card stack">
              <div className="row between">
                <h2>Terakhir selesai</h2>
                <Link to="/laporan" className="small">Semua laporan</Link>
              </div>
              {s.recent.length === 0 && <p className="muted small">Belum ada sesi.</p>}
              <div className="list">
                {s.recent.map((r) => (
                  <Link className="item" key={r.id} to={`/sesi/${r.id}`}>
                    <span>
                      <span className="strong">{r.subject} · {r.question_count} soal</span>
                      <br />
                      <span className="tiny muted">{fmtDateTime(r.scheduled_for)}{r.focus_breaks ? ` · ${r.focus_breaks}× keluar` : ''}</span>
                    </span>
                    {r.score != null ? <span className={`badge ${scoreTone(r.score)}`}>Skor {r.score}</span> : <span className="badge muted">{STATUS_LABEL[r.status]}</span>}
                  </Link>
                ))}
              </div>
            </div>
            <div className="card stack">
              <h2>Topik yang perlu dilatih</h2>
              {s.weak_topics.length === 0 && <p className="muted small">Muncul setelah minimal 5 soal per topik dijawab.</p>}
              <div className="list">
                {s.weak_topics.map((t) => (
                  <div className="item" key={t.topic + t.subject}>
                    <span><span className="strong">{t.topic}</span><br /><span className="tiny muted">{t.subject} · {t.correct}/{t.answered} benar</span></span>
                    <span className={`badge ${scoreTone(Math.round(t.ratio * 100))}`}>{Math.round(t.ratio * 100)}% benar</span>
                  </div>
                ))}
              </div>
              {s.badges.length > 0 && (
                <>
                  <h3>Lencana</h3>
                  <div className="chips">{s.badges.map((b) => <span key={b} className="badge dark">{b}</span>)}</div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
