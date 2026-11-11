import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { login } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit}>
        <div className="row" style={{ gap: 10 }}>
          <img src="/favicon.svg" width={40} height={40} alt="" />
          <div>
            <h1>Andaru</h1>
            <p className="muted small">Dasbor orang tua · latihan TKA SMP</p>
          </div>
        </div>
        {err && <div className="error" role="alert">{err}</div>}
        <label className="field">Email
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">Password
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
        <p className="small muted">Belum punya akun? <Link to="/daftar">Daftar</Link></p>
      </form>
    </div>
  );
}
