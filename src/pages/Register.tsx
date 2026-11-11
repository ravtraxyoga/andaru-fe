import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { register } from '../api';

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', pin: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!/^\d{4,6}$/.test(f.pin)) return setErr('PIN harus 4 sampai 6 angka');
    setBusy(true);
    try {
      await register(f.name, f.email, f.password, f.pin);
      nav('/anak');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit}>
        <h1>Daftar orang tua</h1>
        <p className="muted small">Satu akun bisa mengelola beberapa anak.</p>
        {err && <div className="error" role="alert">{err}</div>}
        <label className="field">Nama panggilan
          <input className="input" required maxLength={80} value={f.name} onChange={set('name')} placeholder="mis. Bunda" />
        </label>
        <label className="field">Email
          <input className="input" type="email" autoComplete="email" required value={f.email} onChange={set('email')} />
        </label>
        <label className="field">Password (min. 8 karakter)
          <input className="input" type="password" autoComplete="new-password" minLength={8} required value={f.password} onChange={set('password')} />
        </label>
        <label className="field">PIN orang tua (4–6 angka)
          <input className="input" inputMode="numeric" autoComplete="off" required value={f.pin} onChange={set('pin')} />
          <span className="tiny muted" style={{ fontWeight: 400 }}>Dipakai untuk membuka Mode Fokus di HP anak dalam keadaan darurat.</span>
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Mendaftar…' : 'Daftar'}</button>
        <p className="small muted">Sudah punya akun? <Link to="/">Masuk</Link></p>
      </form>
    </div>
  );
}
