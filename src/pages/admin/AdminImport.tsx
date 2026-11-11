import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';

type Result = { total?: number; inserted: number; skipped?: number; status: string; errors: { id?: string; line?: number; error: string }[] };

export default function AdminImport() {
  const qc = useQueryClient();
  const [publish, setPublish] = useState(false);
  const [source, setSource] = useState('tka9');
  const [grade, setGrade] = useState(9);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(file: File) {
    setErr('');
    setRes(null);
    setBusy(true);
    try {
      const text = await file.text();
      let r: Result;
      if (file.name.toLowerCase().endsWith('.csv')) {
        r = await api<Result>(`/admin/questions/import?publish=${publish}`, { raw: text, contentType: 'text/csv' });
      } else {
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          // HTML bank soal: ambil array `const DATA = [...]`
          const m = text.match(/const\s+DATA\s*=\s*(\[[\s\S]*?\]);\s*\n/);
          if (!m) throw new Error('File bukan JSON, CSV, atau HTML bank soal');
          data = JSON.parse(m[1]);
        }
        if (!Array.isArray(data)) throw new Error('JSON harus berupa array soal');
        r = await api<Result>(`/admin/questions/import-json?publish=${publish}&source=${encodeURIComponent(source)}&grade=${grade}`, { raw: JSON.stringify(data), contentType: 'application/json' });
      }
      setRes(r);
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['subjects'] });
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Impor bank soal</h1>
      <div className="grid two">
        <div className="card stack">
          <h2>Unggah file</h2>
          <p className="small muted">JSON (format bank soal TKA), HTML bank soal yang berisi <code>const DATA = [...]</code>, atau CSV. Impor ulang file yang sama aman: soal dengan id sumber yang sama dilewati.</p>
          <div className="grid three" style={{ gap: 10 }}>
            <label className="field">Id sumber
              <input className="input" value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <label className="field">Kelas bawaan
              <select className="input" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                {[7, 8, 9].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
          <label className="switch">Langsung terbitkan
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          </label>
          <input type="file" accept=".json,.csv,.html,application/json,text/csv,text/html" disabled={busy} onChange={(e) => e.target.files?.[0] && run(e.target.files[0])} />
          {busy && <p className="muted small">Mengimpor…</p>}
          {err && <div className="error" role="alert">{err}</div>}
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
          <h2>Format</h2>
          <p className="small strong">JSON</p>
          <pre className="small" style={{ background: 'var(--purple-tint)', padding: 12, borderRadius: 12, overflowX: 'auto', margin: 0 }}>{`[{
  "id": "0001",
  "mapel": "Matematika",
  "topik": "Persamaan Linear Satu Variabel",
  "soal": "Nilai x yang memenuhi ...",
  "pilihan": ["2", "4", "1", "-1"],
  "kunci": "A",
  "pembahasan": "9x - 3 = 15 ...",
  "kelas": 9,        // opsional
  "kesulitan": 2     // opsional, 1-3
}]`}</pre>
          <p className="small strong">CSV</p>
          <pre className="small" style={{ background: 'var(--purple-tint)', padding: 12, borderRadius: 12, overflowX: 'auto', margin: 0 }}>mata_uji,topik,kelas,kesulitan,soal,a,b,c,d,e,kunci,pembahasan</pre>
          <p className="small muted">Mata uji: Matematika, Bahasa Indonesia, Bahasa Inggris, IPA, IPS, Sejarah, Pengetahuan Umum. Topik baru dibuat otomatis.</p>
        </div>
      </div>
    </div>
  );
}
