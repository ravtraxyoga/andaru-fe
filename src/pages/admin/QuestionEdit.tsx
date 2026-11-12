import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../../api';
import { Icon } from '../../components/Icon';
import type { Subject } from '../../types';

type Q = {
  id?: number;
  subject_id: number;
  topic_id: number;
  grade: number;
  difficulty: number;
  stem: string;
  options: string[];
  correct: string;
  explanation: string;
  image_key: string | null;
  status?: string;
  twin_id?: number | null;
  replaced_by?: number | null;
  stats?: { answered: number; correct: number };
};

export default function QuestionEdit() {
  const { id } = useParams();
  const isNew = id === 'baru';
  const nav = useNavigate();
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: ({ signal }) => api<Subject[]>('/subjects', { signal }) });
  const existing = useQuery({ queryKey: ['question', id], queryFn: ({ signal }) => api<Q>(`/admin/questions/${id}`, { signal }), enabled: !isNew });
  const [q, setQ] = useState<Q | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew && subjects.data && !q) {
      const s = subjects.data[0];
      setQ({ subject_id: s.id, topic_id: s.topics[0]?.id ?? 0, grade: 9, difficulty: 2, stem: '', options: ['', '', '', ''], correct: 'A', explanation: '', image_key: null });
    }
    if (!isNew && existing.data) setQ({ ...existing.data, explanation: existing.data.explanation ?? '' });
  }, [isNew, subjects.data, existing.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!q || !subjects.data) return <p className="muted">Memuat…</p>;
  const topics = subjects.data.find((s) => s.id === q.subject_id)?.topics ?? [];
  const locked = q.status === 'retired';

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = { ...q, options: q!.options.filter((o) => o.trim() !== '') };
    try {
      const r = isNew
        ? await api<{ id: number }>('/admin/questions', { body })
        : await api<{ id: number; replaced?: number }>(`/admin/questions/${id}`, { method: 'PATCH', body });
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      if (isNew || r.id !== Number(id)) {
        nav(`/admin/soal/${r.id}`, { replace: true });
        setQ(null);
      } else {
        existing.refetch();
      }
      setMsg({ ok: true, text: 'replaced' in r && r.replaced ? `Soal terbit tidak diubah; versi baru #${r.id} dibuat dan #${r.replaced} di-retire.` : 'Tersimpan' });
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
      // Soal yang sama sudah ada: langsung buka soal itu untuk diperbarui.
      if (x instanceof ApiError && x.code === 'duplicate' && typeof x.data?.id === 'number') nav(`/admin/soal/${x.data.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(action: 'retire' | 'restore') {
    try {
      await api(`/admin/questions/${id}/${action}`, { method: 'POST' });
      setMsg(action === 'restore' ? { ok: true, text: 'Soal aktif lagi dan bisa keluar di sesi baru.' } : null);
      existing.refetch();
      qc.invalidateQueries({ queryKey: ['admin-dups'] });
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
    }
  }

  async function upload(file: File) {
    try {
      const r = await api<{ image_key: string }>('/admin/media', { raw: file, contentType: file.type });
      setQ({ ...q!, image_key: r.image_key });
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
    }
  }

  const letters = ['A', 'B', 'C', 'D', 'E'];
  return (
    <form className="stack" style={{ gap: 20 }} onSubmit={save}>
      <Link to="/admin" className="row small" style={{ gap: 4, textDecoration: 'none' }}><Icon name="back" size={16} /> Bank soal</Link>
      <div className="topbar">
        <h1>{isNew ? 'Soal baru' : `Soal #${id}`}</h1>
        {!isNew && (
          <div className="row">
            {q.status === 'retired' && !q.twin_id && <button type="button" className="btn" onClick={() => setStatus('restore')}>Aktifkan lagi</button>}
            {q.status !== 'retired' && <button type="button" className="btn danger" onClick={() => confirm('Retire soal ini? Soal tidak akan dipakai di sesi baru.') && setStatus('retire')}>Retire</button>}
          </div>
        )}
      </div>
      {msg && <div className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</div>}
      {q.status === 'retired' && (
        <div className="notice">
          Soal ini di-retire dan tidak dipakai di sesi baru.{' '}
          {q.twin_id ? <>Alasannya: isinya sama dengan soal aktif <Link to={`/admin/soal/${q.twin_id}`}>#{q.twin_id}</Link>, jadi tidak bisa diaktifkan lagi selama soal itu aktif.</>
            : q.replaced_by ? <>Alasannya: sudah diganti versi baru <Link to={`/admin/soal/${q.replaced_by}`}>#{q.replaced_by}</Link>. Mengaktifkan lagi membuat kedua versi sama-sama bisa keluar.</>
            : 'Klik Aktifkan lagi untuk memakainya kembali.'}
        </div>
      )}
      {q.stats && q.stats.answered > 0 && q.status !== 'retired' && (
        <div className="notice">Soal ini sudah pernah keluar di sesi anak. Menyimpan perubahan membuat versi baru dan me-retire versi ini, supaya riwayat nilai tetap utuh.</div>
      )}
      {q.stats && <p className="small muted">Dijawab {q.stats.answered}× · benar {q.stats.correct}× {q.stats.answered ? `(${Math.round((q.stats.correct / q.stats.answered) * 100)}%)` : ''}</p>}
      <fieldset disabled={locked} className="card stack" style={{ border: '1px solid var(--line)' }}>
        <div className="grid three" style={{ gap: 12 }}>
          <label className="field">Mata uji
            <select className="input" value={q.subject_id} onChange={(e) => {
              const sid = Number(e.target.value);
              setQ({ ...q, subject_id: sid, topic_id: subjects.data!.find((s) => s.id === sid)?.topics[0]?.id ?? 0 });
            }}>
              {subjects.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field">Topik
            <select className="input" value={q.topic_id} onChange={(e) => setQ({ ...q, topic_id: Number(e.target.value) })}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field">Kelas
            <select className="input" value={q.grade} onChange={(e) => setQ({ ...q, grade: Number(e.target.value) })}>
              {[7, 8, 9].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="field">Kesulitan
            <select className="input" value={q.difficulty} onChange={(e) => setQ({ ...q, difficulty: Number(e.target.value) })}>
              <option value={1}>Mudah</option><option value={2}>Sedang</option><option value={3}>Sulit</option>
            </select>
          </label>
        </div>
        <label className="field">Teks soal
          <textarea className="input" required value={q.stem} onChange={(e) => setQ({ ...q, stem: e.target.value })} rows={5} />
        </label>
        <div className="field">
          <span>Gambar (opsional, WebP/PNG/JPEG)</span>
          <div className="row">
            {q.image_key && <img src={`/v1/media/${q.image_key}`} alt="" style={{ maxHeight: 120, borderRadius: 12 }} />}
            <input type="file" accept="image/webp,image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {q.image_key && <button type="button" className="btn sm quiet" onClick={() => setQ({ ...q, image_key: null })}>Hapus gambar</button>}
          </div>
        </div>
        <div className="field">
          <span>Pilihan jawaban (pilih kunci)</span>
          {q.options.map((o, i) => (
            <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
              <button type="button" className="chip" aria-pressed={q.correct === letters[i]} aria-label={`Jadikan ${letters[i]} kunci`} onClick={() => setQ({ ...q, correct: letters[i] })}>{letters[i]}</button>
              <input className="input" value={o} onChange={(e) => setQ({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Pilihan ${letters[i]}`} />
            </div>
          ))}
          <div className="row">
            {q.options.length < 5 && <button type="button" className="btn sm quiet" onClick={() => setQ({ ...q, options: [...q.options, ''] })}>Tambah pilihan</button>}
            {q.options.length > 2 && <button type="button" className="btn sm quiet" onClick={() => setQ({ ...q, options: q.options.slice(0, -1), correct: letters.indexOf(q.correct) >= q.options.length - 1 ? 'A' : q.correct })}>Kurangi pilihan</button>}
          </div>
        </div>
        <label className="field">Pembahasan
          <textarea className="input" value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} rows={4} />
        </label>
        <div><button className="btn" disabled={busy}>Simpan</button></div>
      </fieldset>
    </form>
  );
}
