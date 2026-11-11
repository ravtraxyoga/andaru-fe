import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../api';
import { Icon } from '../../components/Icon';
import type { Subject } from '../../types';

type Row = { id: number; subject: string; topic: string; grade: number; difficulty: number; stem: string; status: string; has_image: boolean };
type DupGroup = { subject: string; stem: string; count: number; items: { id: number; status: string; source_ref: string | null; topic: string; correct: string; used: boolean }[] };
type Stats = { by_subject: { subject_id: number; subject: string; published: number; draft: number; retired: number }[]; parents: number; children: number; sessions_7d: number };

const STATUS_TONE: Record<string, string> = { published: 'good', draft: 'mid', retired: 'muted' };
const STATUS_ID: Record<string, string> = { published: 'Aktif', draft: 'Aktif', retired: 'Retired' };

export default function AdminQuestions() {
  const [f, setF] = useState({ subject_id: '', topic_id: '', status: '', q: '' });
  const [search, setSearch] = useState('');
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: ({ signal }) => api<Subject[]>('/subjects', { signal }) });
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: ({ signal }) => api<Stats>('/admin/stats', { signal }) });
  const params = new URLSearchParams(Object.entries({ ...f, q: search }).filter(([, v]) => v));
  const list = useInfiniteQuery({
    queryKey: ['admin-questions', params.toString()],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam, signal }) =>
      api<{ items: Row[]; next_before_id: number | null }>(`/admin/questions?${params}${pageParam ? `&before_id=${pageParam}` : ''}`, { signal }),
    getNextPageParam: (p) => p.next_before_id,
  });
  const qc = useQueryClient();
  const [checkDup, setCheckDup] = useState(false);
  const dups = useQuery({
    queryKey: ['admin-dups'],
    queryFn: ({ signal }) => api<{ groups: DupGroup[] }>('/admin/questions/duplicates', { signal }),
    enabled: checkDup,
  });
  const merge = useMutation({
    mutationFn: () => api<{ retired: number }>('/admin/questions/duplicates/merge', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dups'] });
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
  const topics = subjects.data?.find((s) => String(s.id) === f.subject_id)?.topics ?? [];
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <h1>Bank soal</h1>
          {stats.data && <p className="muted small">{stats.data.parents} orang tua · {stats.data.children} anak · {stats.data.sessions_7d} sesi 7 hari terakhir</p>}
        </div>
        <div className="row">
          <Link className="btn ghost" to="/admin/impor"><Icon name="upload" /> Impor</Link>
          <Link className="btn" to="/admin/soal/baru"><Icon name="plus" /> Soal baru</Link>
        </div>
      </div>
      <div className="stats">
        {stats.data?.by_subject.map((s) => (
          <div className="stat" key={s.subject_id}><b>{s.published + s.draft}</b><span>{s.subject}</span></div>
        ))}
      </div>
      <div className="card stack">
        <div className="row between">
          <div>
            <h2>Cek duplikat</h2>
            <p className="small muted">Soal dianggap sama bila mapel, teks soal, dan kumpulan pilihannya sama (spasi, huruf besar-kecil, dan urutan pilihan diabaikan).</p>
          </div>
          <button className="btn ghost" onClick={() => (checkDup ? dups.refetch() : setCheckDup(true))} disabled={dups.isFetching}>{dups.isFetching ? 'Memeriksa…' : 'Cek sekarang'}</button>
        </div>
        {dups.data && dups.data.groups.length === 0 && <div className="success">Tidak ada soal duplikat.</div>}
        {dups.data && dups.data.groups.length > 0 && (
          <>
            <div className="notice">
              {dups.data.groups.length} kelompok soal duplikat. Gabungkan = sisakan satu per kelompok (yang terbit didahulukan), sisanya di-retire.
            </div>
            <div className="list">
              {dups.data.groups.map((g, i) => (
                <div className="item small" key={i} style={{ display: 'block' }}>
                  <div className="muted tiny">{g.subject} · {g.count} soal</div>
                  <div>{g.stem}</div>
                  <div className="chips" style={{ marginTop: 6 }}>
                    {g.items.map((x) => (
                      <Link key={x.id} to={`/admin/soal/${x.id}`} className={`badge ${STATUS_TONE[x.status]}`}>
                        #{x.id} · kunci {x.correct}{x.used ? ' · dipakai' : ''}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div><button className="btn" onClick={() => merge.mutate()} disabled={merge.isPending}>Gabungkan semua duplikat</button></div>
          </>
        )}
        {merge.data && <div className="success">{merge.data.retired} soal duplikat di-retire.</div>}
      </div>
      <div className="card stack">
        <form className="grid three" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); setSearch(f.q); }}>
          <select className="input" aria-label="Mata uji" value={f.subject_id} onChange={(e) => setF({ ...f, subject_id: e.target.value, topic_id: '' })}>
            <option value="">Semua mata uji</option>
            {subjects.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" aria-label="Topik" value={f.topic_id} onChange={(e) => setF({ ...f, topic_id: e.target.value })} disabled={!topics.length}>
            <option value="">Semua topik</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input" aria-label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">Semua status</option>
            <option value="published">Aktif</option>
            <option value="retired">Retired</option>
          </select>
          <input className="input" type="search" placeholder="Cari teks soal, tekan Enter" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Cari" />
        </form>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Soal</th><th>Mata uji / topik</th><th>Kelas</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/admin/soal/${r.id}`}>{r.id}</Link></td>
                  <td style={{ maxWidth: 460 }}><Link to={`/admin/soal/${r.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{r.stem}</Link></td>
                  <td className="small">{r.subject}<br /><span className="muted">{r.topic}</span></td>
                  <td>{r.grade}</td>
                  <td><span className={`badge ${STATUS_TONE[r.status]}`}>{STATUS_ID[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !list.isLoading && <p className="empty">Tidak ada soal.</p>}
        {list.hasNextPage && <div><button className="btn ghost" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>Muat lagi</button></div>}
      </div>
    </div>
  );
}
