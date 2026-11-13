import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { api } from '../../api';
import { Icon } from '../../components/Icon';
import { fmtDateTime, scoreTone, STATUS_LABEL } from '../../format';
import type { SessionStatus } from '../../types';

type Recent = { id: number; scheduled_for: string; status: SessionStatus; score: number | null; question_count: number; xp_awarded: number; focus_breaks: number; subject: string | null };
type Child = {
  id: number; name: string; grade: number; xp: number; tier: number; streak_days: number; last_done_on: string | null;
  paired_at: string | null; created_at: string; schedules: number; sessions_done: number; sessions_missed_30d: number;
  avg_score_30d: number | null; badges: number; recent: Recent[];
};
type Kid = {
  id: number; nickname: string; age_group: number; session_minutes: number; created_at: string; stars: number; stickers: number;
  levels_played: number; minutes_7d: number; last_played: string | null; worlds: { name: string; stars: number; tier: number }[];
};
type Detail = {
  parent: { id: number; name: string; email: string; is_admin: boolean; created_at: string };
  devices: { app: string | null; app_version: string | null; last_seen_at: string | null; child: string | null; is_device_owner: boolean }[];
  children: Child[];
  kids: Kid[];
};

const APP_NAME: Record<string, string> = { anak: 'Dhanu', ortu: 'Bunda', dini: 'Daru' };
const AGE: Record<number, string> = { 1: '2–3 tahun', 2: '4–5 tahun' };
const when = (s: string | null) => (s ? fmtDateTime(s) : '—');

export default function AdminUserDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['admin-parent', id], queryFn: ({ signal }) => api<Detail>(`/admin/parents/${id}`, { signal }) });
  if (q.isLoading) return <p className="muted">Memuat…</p>;
  if (q.isError || !q.data) return <div className="error">Akun tidak ditemukan.</div>;
  const { parent, children, kids, devices } = q.data;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div className="row">
          <Link to="/admin/pengguna" className="icon-btn" aria-label="Kembali ke daftar pengguna"><Icon name="back" /></Link>
          <div>
            <h1>{parent.name} {parent.is_admin && <span className="badge dark" style={{ verticalAlign: 'middle' }}>Admin</span>}</h1>
            <p className="muted small">{parent.email} · terdaftar {fmtDateTime(parent.created_at)}</p>
          </div>
        </div>
      </div>

      <section className="stack">
        <h2 className="section-title">Anak TKA (Dhanu) <span className="badge muted">{children.length}</span></h2>
        {children.length === 0 && <div className="card empty">Belum menambahkan anak TKA.</div>}
        {children.map((c) => (
          <div key={c.id} className="card stack">
            <div className="row between">
              <div className="row">
                <span className="avatar">{c.name.charAt(0).toUpperCase()}</span>
                <div>
                  <h3>{c.name}</h3>
                  <p className="muted small">Kelas {c.grade} · ditambahkan {fmtDateTime(c.created_at)}</p>
                </div>
              </div>
              <span className={`badge ${c.paired_at ? 'good' : 'muted'}`}>{c.paired_at ? 'HP terpasang' : 'Belum dipasangkan'}</span>
            </div>
            <div className="kv">
              <div><span>XP</span><b>{c.xp.toLocaleString('id-ID')}</b></div>
              <div><span>Tingkat</span><b>{c.tier}</b></div>
              <div><span>Streak</span><b>{c.streak_days} hari</b></div>
              <div><span>Sesi tuntas</span><b>{c.sessions_done}</b></div>
              <div><span>Rata-rata 30 hari</span><b>{c.avg_score_30d ?? '—'}</b></div>
              <div><span>Terlewat 30 hari</span><b>{c.sessions_missed_30d}</b></div>
              <div><span>Jadwal aktif</span><b>{c.schedules}</b></div>
              <div><span>Lencana</span><b>{c.badges}</b></div>
            </div>
            {c.recent.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Waktu</th><th>Mata uji</th><th>Status</th><th style={{ textAlign: 'right' }}>Skor</th><th style={{ textAlign: 'right' }}>XP</th><th style={{ textAlign: 'right' }}>Keluar app</th></tr>
                  </thead>
                  <tbody>
                    {c.recent.map((r) => (
                      <tr key={r.id}>
                        <td className="small">{fmtDateTime(r.scheduled_for)}</td>
                        <td className="small">{r.subject ?? '—'} · {r.question_count} soal</td>
                        <td><span className="badge muted">{STATUS_LABEL[r.status] ?? r.status}</span></td>
                        <td style={{ textAlign: 'right' }}>{r.score != null ? <span className={`badge ${scoreTone(r.score)}`}>{r.score}</span> : '—'}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{r.xp_awarded}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{r.focus_breaks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="stack">
        <h2 className="section-title">Anak usia dini (Daru) <span className="badge muted">{kids.length}</span></h2>
        {kids.length === 0 && <div className="card empty">Belum menambahkan profil Daru.</div>}
        {kids.map((k) => (
          <div key={k.id} className="card stack">
            <div className="row between">
              <div className="row">
                <span className="avatar" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>{k.nickname.charAt(0).toUpperCase()}</span>
                <div>
                  <h3>{k.nickname}</h3>
                  <p className="muted small">{AGE[k.age_group] ?? '—'} · sesi {k.session_minutes} menit · ditambahkan {fmtDateTime(k.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="kv">
              <div><span>Bintang</span><b>{k.stars}</b></div>
              <div><span>Stiker</span><b>{k.stickers}</b></div>
              <div><span>Level dimainkan</span><b>{k.levels_played}</b></div>
              <div><span>Main 7 hari</span><b>{k.minutes_7d} menit</b></div>
              <div><span>Terakhir main</span><b style={{ fontSize: 13 }}>{when(k.last_played)}</b></div>
            </div>
            {k.worlds.length > 0 && (
              <div className="chips">
                {k.worlds.map((w) => (
                  <span key={w.name} className="badge muted">{w.name}: {w.stars} bintang · tingkat {w.tier}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="stack">
        <h2>Perangkat</h2>
        {devices.length === 0 ? (
          <div className="card empty">Belum ada perangkat terdaftar untuk notifikasi.</div>
        ) : (
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Aplikasi</th><th>Versi</th><th>Milik</th><th>Terakhir terlihat</th></tr></thead>
              <tbody>
                {devices.map((d, i) => (
                  <tr key={i}>
                    <td>{d.app ? APP_NAME[d.app] : '—'}</td>
                    <td className="num">{d.app_version ?? '—'}</td>
                    <td className="small">{d.child ?? 'Orang tua'}{d.is_device_owner && ' · mode fokus penuh'}</td>
                    <td className="small">{when(d.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
