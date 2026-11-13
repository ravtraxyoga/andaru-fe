import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, logout } from '../api';
import { useParent } from '../hooks/useAuth';
import { useSelectedChild } from '../hooks/useChildren';

export default function Settings() {
  const parent = useParent()!;
  const { children } = useSelectedChild();
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Pengaturan</h1>
      <div className="grid two">
        <PinForm />
        <UnlockForm children={children.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
      <div className="card row between">
        <div>
          <h2>Unduh aplikasi</h2>
          <p className="muted small">APK terbaru aplikasi Bunda, Anak, dan Balita.</p>
        </div>
        <Link to="/unduh" className="btn sm ghost">Buka</Link>
      </div>
      <div className="card stack">
        <h2>Akun</h2>
        <p className="small">{parent.name} · {parent.email}{parent.is_admin ? ' · admin bank soal' : ''}</p>
        <div><button className="btn danger" onClick={() => logout()}>Keluar</button></div>
      </div>
      <div className="notice">
        Privasi: data anak di bawah umur disimpan seminimal mungkin (nama panggilan dan kelas). Mode Fokus penuh di Android
        membutuhkan HP anak disiapkan sebagai perangkat khusus (Device Owner) dengan persetujuan orang tua.
      </div>
    </div>
  );
}

function PinForm() {
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/me/pin', { method: 'PATCH', body: { password, new_pin: pin } });
      setMsg({ ok: true, text: 'PIN diperbarui' });
      setPassword('');
      setPin('');
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Ganti PIN orang tua</h2>
      {msg && <div className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</div>}
      <label className="field">Password akun
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="field">PIN baru (4–6 angka)
        <input className="input" inputMode="numeric" pattern="\d{4,6}" required value={pin} onChange={(e) => setPin(e.target.value)} />
      </label>
      <div><button className="btn">Simpan PIN</button></div>
    </form>
  );
}

function UnlockForm({ children }: { children: { id: number; name: string }[] }) {
  const [childId, setChildId] = useState<number | ''>(children[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!childId) return;
    setMsg(null);
    try {
      const r = await api<{ session_id: number | null }>('/parent/unlock', { body: { child_id: childId, pin } });
      setMsg({ ok: true, text: r.session_id ? 'Sesi dihentikan dan perintah buka kunci dikirim ke HP anak.' : 'Tidak ada sesi berjalan; perintah buka kunci tetap dikirim.' });
      setPin('');
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Buka kunci darurat</h2>
      <p className="small muted">Menghentikan sesi yang sedang berjalan dan melepas Mode Fokus di HP anak. Tercatat di laporan sesi.</p>
      {msg && <div className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</div>}
      <label className="field">Anak
        <select className="input" value={childId} onChange={(e) => setChildId(Number(e.target.value))}>
          {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="field">PIN orang tua
        <input className="input" type="password" inputMode="numeric" required value={pin} onChange={(e) => setPin(e.target.value)} />
      </label>
      <div><button className="btn danger" disabled={!childId}>Buka kunci</button></div>
    </form>
  );
}
