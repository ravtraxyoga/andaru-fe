import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { parseBank, SUBJECTS, type BankItem, type ParseResult } from '../../importParse';

type Result = { total?: number; inserted: number; skipped?: number; status: string; errors: { id?: string; line?: number; error: string }[] };

export default function AdminImport() {
  const qc = useQueryClient();
  const [publish, setPublish] = useState(false);
  const [source, setSource] = useState('tka9');
  const [grade, setGrade] = useState(9);
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState<(ParseResult & { name: string; text: string }) | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-questions'] });
    qc.invalidateQueries({ queryKey: ['admin-stats'] });
    qc.invalidateQueries({ queryKey: ['subjects'] });
  };

  async function read(file: File) {
    setErr('');
    setRes(null);
    setPreview(null);
    const text = await file.text();
    if (file.name.toLowerCase().endsWith('.csv')) {
      setBusy(true);
      try {
        setRes(await api<Result>(`/admin/questions/import?publish=${publish}`, { raw: text, contentType: 'text/csv' }));
        refresh();
      } catch (x) {
        setErr((x as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    const p = parseBank(text, file.name, subject);
    if (p.items.length === 0) {
      setErr(`Tidak ada soal yang terbaca dari ${file.name}. ${p.problems.slice(0, 3).join('; ')}`);
      return;
    }
    setPreview({ ...p, name: file.name, text });
  }

  function reparse(s: string) {
    setSubject(s);
    if (preview) setPreview({ ...parseBank(preview.text, preview.name, s), name: preview.name, text: preview.text });
  }

  async function run(items: BankItem[]) {
    setBusy(true);
    setErr('');
    try {
      let total: Result = { inserted: 0, skipped: 0, status: publish ? 'published' : 'draft', errors: [] };
      // dikirim bertahap supaya file besar tidak melewati batas ukuran request
      for (let i = 0; i < items.length; i += 500) {
        const r = await api<Result>(`/admin/questions/import-json?publish=${publish}&source=${encodeURIComponent(source)}&grade=${grade}`, {
          raw: JSON.stringify(items.slice(i, i + 500)),
          contentType: 'application/json',
        });
        total = { ...total, inserted: total.inserted + r.inserted, skipped: (total.skipped ?? 0) + (r.skipped ?? 0), errors: [...total.errors, ...r.errors] };
      }
      setRes(total);
      setPreview(null);
      refresh();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const bySubject = preview ? Object.entries(preview.items.reduce<Record<string, number>>((a, it) => ({ ...a, [it.mapel]: (a[it.mapel] ?? 0) + 1 }), {})) : [];
  const unknown = preview ? [...new Set(preview.items.map((i) => i.mapel).filter((m) => !SUBJECTS.some((s) => s.toLowerCase() === m.toLowerCase())))] : [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Impor bank soal</h1>
      <div className="grid two">
        <div className="card stack">
          <h2>Unggah file</h2>
          <p className="small muted">
            Markdown (.md), JSON, HTML bank soal (berisi <code>const DATA = [...]</code>), atau CSV. File dibaca dulu dan ditampilkan
            pratinjaunya sebelum masuk. Impor ulang aman: soal yang sama dilewati.
          </p>
          <div className="grid three" style={{ gap: 10 }}>
            <label className="field">Id sumber
              <input className="input" value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <label className="field">Kelas bawaan
              <select className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                {[7, 8, 9].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="field">Mapel bawaan (.md)
              <select className="input" value={subject} onChange={(e) => reparse(e.target.value)}>
                <option value="">Dari judul file</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label className="switch">Langsung terbitkan
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          </label>
          <input type="file" accept=".md,.markdown,.txt,.json,.csv,.html,.htm" disabled={busy} onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
          {busy && <p className="muted small">Mengimpor…</p>}
          {err && <div className="error" role="alert">{err}</div>}

          {preview && (
            <div className="stack" style={{ gap: 10, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <h3>Pratinjau: {preview.items.length} soal terbaca ({preview.format})</h3>
              <div className="chips">{bySubject.map(([m, n]) => <span key={m} className="badge muted">{m}: {n}</span>)}</div>
              {unknown.length > 0 && <div className="error">Mapel tidak dikenal: {unknown.join(', ')}. Soal ini akan ditolak; ubah judul mapel di file atau pilih Mapel bawaan.</div>}
              {preview.problems.length > 0 && (
                <div className="notice">
                  {preview.problems.length} bagian dilewati:
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{preview.problems.slice(0, 8).map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
              )}
              {preview.items.slice(0, 3).map((it) => (
                <div key={it.id} className="item small" style={{ display: 'block' }}>
                  <div className="muted tiny">{it.mapel} · {it.topik}</div>
                  <div className="pre">{it.soal}</div>
                  <div className="tiny">{it.pilihan.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('   ')} · kunci {it.kunci}</div>
                </div>
              ))}
              <div className="row">
                <button className="btn" disabled={busy} onClick={() => run(preview.items)}>Impor {preview.items.length} soal</button>
                <button className="btn quiet" onClick={() => setPreview(null)}>Batal</button>
              </div>
            </div>
          )}

          {res && (
            <div className="success">
              {res.inserted} soal masuk ({res.status === 'published' ? 'terbit' : 'draf'}){res.skipped ? `, ${res.skipped} dilewati karena sudah ada` : ''}{res.errors.length ? `, ${res.errors.length} gagal` : ''}.
            </div>
          )}
          {res && res.errors.length > 0 && (
            <div className="list">
              {res.errors.slice(0, 50).map((e, i) => (
                <div className="item small" key={i}><span>{e.id ? `id ${e.id}` : `baris ${e.line}`}</span><span className="muted">{e.error}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="card stack">
          <h2>Format Markdown</h2>
          <pre className="small" style={{ background: 'var(--purple-tint)', padding: 12, borderRadius: 12, overflowX: 'auto', margin: 0 }}>{`## Matematika
### Persamaan Linear Satu Variabel

1. Nilai x yang memenuhi 9x - 3 = 15 adalah ...
A. 2
B. 4
C. 1
D. -1
Kunci: A
Pembahasan: 9x = 18, jadi x = 2

2. Soal berikutnya ...`}</pre>
          <p className="small muted">
            Judul berisi nama mapel = mapel; judul lain = topik. Bisa juga baris <code>Mapel:</code>, <code>Topik:</code>, <code>Kelas:</code>.
            Pilihan boleh ditulis <code>A.</code>, <code>A)</code>, <code>(A)</code>, atau berawalan <code>-</code>. Kunci: <code>Kunci:</code>,
            <code>Kunci Jawaban:</code>, atau <code>Jawaban:</code>. Soal tanpa kunci atau dengan kurang dari 2 pilihan dilewati dan dilaporkan.
          </p>
          <p className="small strong">JSON</p>
          <pre className="small" style={{ background: 'var(--purple-tint)', padding: 12, borderRadius: 12, overflowX: 'auto', margin: 0 }}>{`[{ "id": "0001", "mapel": "Matematika", "topik": "...",
   "soal": "...", "pilihan": ["2","4","1","-1"],
   "kunci": "A", "pembahasan": "..." }]`}</pre>
          <p className="small strong">CSV</p>
          <pre className="small" style={{ background: 'var(--purple-tint)', padding: 12, borderRadius: 12, overflowX: 'auto', margin: 0 }}>mata_uji,topik,kelas,kesulitan,soal,a,b,c,d,e,kunci,pembahasan</pre>
          <p className="small muted">Mapel: {SUBJECTS.join(', ')}. Topik baru dibuat otomatis.</p>
        </div>
      </div>
    </div>
  );
}
