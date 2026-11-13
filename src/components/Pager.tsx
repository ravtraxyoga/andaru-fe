import { useState, type FormEvent } from 'react';

export const PER_PAGE = [10, 25, 50, 100];
const num = (n: number) => n.toLocaleString('id-ID');

/** Jumlah baris per halaman yang diingat per tabel (localStorage; gagal = bawaan). */
export function usePerPage(key: string, fallback = 25) {
  const [v, setV] = useState(() => {
    try {
      const n = Number(localStorage.getItem(key));
      return PER_PAGE.includes(n) ? n : fallback;
    } catch {
      return fallback;
    }
  });
  const set = (n: number) => {
    setV(n);
    try { localStorage.setItem(key, String(n)); } catch { /* abaikan */ }
  };
  return [v, set] as const;
}

/** Navigasi halaman di bawah tabel: jumlah data, baris per halaman, nomor halaman, lompat ke halaman. */
export function Pager({ page, perPage, total, unit, loading, onPage, onPerPage }: {
  page: number; perPage: number; total: number; unit: string; loading?: boolean;
  onPage: (p: number) => void; onPerPage?: (n: number) => void;
}) {
  const [jump, setJump] = useState('');
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
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
        {total === 0 ? `Tidak ada ${unit}` : <>Menampilkan <b>{num(from)}–{num(to)}</b> dari <b>{num(total)}</b> {unit}</>}
      </span>
      {onPerPage && (
        <label className="small pager-size">Baris per halaman
          <select className="input sm" value={perPage} onChange={(e) => onPerPage(Number(e.target.value))}>
            {PER_PAGE.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
      {pages > 1 && (
        <nav className="pager-nav" aria-label="Halaman">
          <button type="button" className="btn quiet sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">‹</button>
          {nums.map((p, i) => p === '…'
            ? <span key={`g${i}`} className="muted pager-gap">…</span>
            : <button type="button" key={p} className={`btn sm ${p === page ? '' : 'quiet'}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{num(p)}</button>)}
          <button type="button" className="btn quiet sm" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Halaman berikutnya">›</button>
        </nav>
      )}
      {pages > 5 && (
        <form className="pager-jump small" onSubmit={go}>
          <label>Ke halaman
            <input className="input sm" type="number" min={1} max={pages} value={jump} onChange={(e) => setJump(e.target.value)} placeholder={`1–${pages}`} />
          </label>
          <button className="btn ghost sm" disabled={!jump}>Buka</button>
        </form>
      )}
    </div>
  );
}
