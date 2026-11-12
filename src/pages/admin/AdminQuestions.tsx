import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, ApiError } from '../../api';
import { Icon } from '../../components/Icon';
import type { Subject } from '../../types';

type Row = { id: number; subject: string; topic: string; grade: number; difficulty: number; stem: string; status: string; has_image: boolean; twin_id: number | null; replaced_by: number | null };
type Page = { items: Row[]; total: number; page: number; per_page: number; pages: number };
const PER_PAGE = [10, 25, 50, 100];
const PER_KEY = 'andaru.admin.perPage';
const num = (n: number) => n.toLocaleString('id-ID');
type DupGroup = { subject: string; stem: string; count: number; items: { id: number; status: string; source_ref: string | null; topic: string; correct: string; used: boolean }[] };
type Stats = { by_subject: { subject_id: number; subject: string; published: number; draft: number; retired: number }[]; parents: number; children: number; sessions_7d: number };

const STATUS_TONE: Record<string, string> = { published: 'good', draft: 'mid', retired: 'muted' };
const STATUS_ID: Record<string, string> = { published: 'Aktif', draft: 'Aktif', retired: 'Retired' };

export default function AdminQuestions() {
  const [f, setF] = useState({ subject_id: '', topic_id: '', status: '', q: '' });
  const [search, setSearch] = useState('');
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: ({ signal }) => api<Subject[]>('/subjects', { signal }) });
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: ({ signal }) => api<Stats>('/admin/stats', { signal }) });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => {
    try {
      const v = Number(localStorage.getItem(PER_KEY));
      return PER_PAGE.includes(v) ? v : 25;
    } catch {
      return 25;
    }
  });
  const filterKey = new URLSearchParams(Object.entries({ ...f, q: search }).filter(([, v]) => v)).toString();
  useEffect(() => setPage(1), [filterKey, perPage]);
  const list = useQuery({
    queryKey: ['admin-questions', filterKey, page, perPage],
    queryFn: ({ signal }) => api<Page>(`/admin/questions?${filterKey}${filterKey ? '&' : ''}page=${page}&per_page=${perPage}`, { signal }),
    placeholderData: keepPreviousData,
  });
  const [rowErr, setRowErr] = useState<{ id: number; text: string } | null>(null);
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
  const rows = list.data?.items ?? [];
  const restore = useMutation({
    mutationFn: (id: number) => api(`/admin/questions/${id}/restore`, { method: 'POST' }),
    onMutate: () => setRowErr(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-dups'] });
    },
    onError: (e, id) => setRowErr({ id, text: e instanceof ApiError ? e.message : 'Gagal mengaktifkan' }),
  });
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
            <div className="notice row between" style={{ gap: 12, flexWrap: 'wrap' }}>
              <span>{dups.data.groups.length} kelompok soal duplikat. Gabungkan = sisakan satu per kelompok (yang terbit didahulukan), sisanya di-retire.</span>
              <button className="btn" onClick={() => merge.mutate()} disabled={merge.isPending}>{merge.isPending ? 'Menggabungkan…' : 'Gabungkan semua duplikat'}</button>
            </div>
            {merge.isError && <div className="error">{(merge.error as Error).message}</div>}
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
        <Pager data={list.data} perPage={perPage} loading={list.isFetching} onPage={setPage} onPerPage={(n) => {
          setPerPage(n);
          try { localStorage.setItem(PER_KEY, String(n)); } catch { /* abaikan */ }
        }} />
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
                  <td><div className="status-cell">
                    <span className={`badge ${STATUS_TONE[r.status]}`}>{STATUS_ID[r.status]}</span>
                    {r.status === 'retired' && (
                      <>
                        <span className="tiny muted">
                          {r.twin_id ? <>Duplikat dari <Link to={`/admin/soal/${r.twin_id}`}>#{r.twin_id}</Link></>
                            : r.replaced_by ? <>Diganti versi <Link to={`/admin/soal/${r.replaced_by}`}>#{r.replaced_by}</Link></>
                            : 'Di-retire manual'}
                        </span>
                        {!r.twin_id && (
                          <button type="button" className="btn ghost sm" onClick={() => restore.mutate(r.id)} disabled={restore.isPending}>Aktifkan lagi</button>
                        )}
                        {rowErr?.id === r.id && <span className="tiny" style={{ color: 'var(--low)' }}>{rowErr.text}</span>}
                      </>
                    )}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !list.isLoading && <p className="empty">Tidak ada soal.</p>}
        {rows.length > 0 && <Pager data={list.data} perPage={perPage} loading={list.isFetching} onPage={setPage} compact />}
      </div>
    </div>
  );
}

/** Navigasi halaman: info jumlah data, jumlah baris per halaman, nomor halaman, dan lompat ke halaman. */
function Pager({ data, perPage, loading, onPage, onPerPage, compact }: {
  data?: Page; perPage: number; loading: boolean; onPage: (p: number) => void; onPerPage?: (n: number) => void; compact?: boolean;
}) {
  const [jump, setJump] = useState('');
  if (!data) return null;
  const { page, pages, total } = data;
  const from = total === 0 ? 0 : (page - 1) * data.per_page + 1;
  const to = Math.min(total, page * data.per_page);
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  function go(e: FormEvent) {
    e.preventDefault();
    const n = Math.round(Number(jump));
    if (n >= 1 && n <= pages) onPage(n);
    setJump('');
  }
  return (
    <div className="pager" aria-busy={loading}>
      <span className="small muted pager-info">
        {total === 0 ? 'Tidak ada data' : <>Menampilkan <b>{num(from)}–{num(to)}</b> dari <b>{num(total)}</b> soal</>}
      </span>
      {!compact && onPerPage && (
        <label className="small pager-size">Baris per halaman
          <select className="input sm" value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>
            {PER_PAGE.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
      <nav className="pager-nav" aria-label="Halaman">
        <button type="button" className="btn quiet sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">‹</button>
        {nums.map((p, i) => p === '…'
          ? <span key={`g${i}`} className="muted pager-gap">…</span>
          : <button type="button" key={p} className={`btn sm ${p === page ? '' : 'quiet'}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{num(p)}</button>)}
        <button type="button" className="btn quiet sm" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Halaman berikutnya">›</button>
      </nav>
      {!compact && pages > 1 && (
        <form className="pager-jump small" onSubmit={go}>
          <label htmlFor="pager-jump">Ke halaman</label>
          <input id="pager-jump" className="input sm" type="number" min={1} max={pages} value={jump} onChange={(e) => setJump(e.target.value)} placeholder={`1–${pages}`} />
          <button className="btn ghost sm" disabled={!jump}>Buka</button>
        </form>
      )}
    </div>
  );
}
