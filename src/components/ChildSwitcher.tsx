import { Link } from 'react-router';
import { useSelectedChild } from '../hooks/useChildren';

/** Pemilih anak: satu ortu bisa memantau banyak anak. */
export function ChildSwitcher() {
  const { children, child, select } = useSelectedChild();
  if (children.length === 0) return null;
  return (
    <div className="child-tabs" role="group" aria-label="Pilih anak">
      {children.map((c) => (
        <button key={c.id} className="child-tab" aria-pressed={c.id === child?.id} onClick={() => select(c.id)}>
          <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}

/** Tampilan saat belum ada anak. */
export function NoChild() {
  return (
    <div className="card empty stack" style={{ alignItems: 'center' }}>
      <h2>Belum ada akun anak</h2>
      <p>Tambahkan anak, lalu pasangkan HP anak memakai kode 6 angka.</p>
      <Link className="btn" to="/anak">Tambah anak</Link>
    </div>
  );
}
