import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { logout, stopImpersonation } from '../api';
import { useImpersonation, useParent } from '../hooks/useAuth';
import { ChildContext, useSelectedChildState } from '../hooks/useChildren';
import { Icon } from './Icon';
import { toggleTheme, useIsDark } from '../theme';

const NAV = [
  { to: '/', label: 'Ringkasan', icon: 'home', end: true },
  { to: '/jadwal', label: 'Jadwal', icon: 'calendar' },
  { to: '/laporan', label: 'Laporan', icon: 'chart' },
  { to: '/anak', label: 'Anak', icon: 'kids' },
  { to: '/daru', label: 'Balita', icon: 'star' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
  // Hanya di sidebar; di layar kecil dibuka dari Pengaturan supaya menu bawah tidak sesak.
  { to: '/unduh', label: 'Unduh Aplikasi', icon: 'download', sideOnly: true },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Bank Soal', icon: 'book', end: true },
  { to: '/admin/impor', label: 'Impor Soal', icon: 'upload' },
  { to: '/admin/pengguna', label: 'Pengguna', icon: 'users' },
  { to: '/admin/update', label: 'Update Aplikasi', icon: 'phone' },
];

export function Layout() {
  const parent = useParent()!;
  const dark = useIsDark();
  const sel = useSelectedChildState();
  return (
    <ChildContext.Provider value={sel}>
      <div className="shell">
        <aside className="side">
          <div className="brand">
            <img src="/favicon.svg" alt="" />
            Andaru
          </div>
          <nav className="nav" aria-label="Menu utama">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                <Icon name={n.icon} size={18} /> {n.label}
              </NavLink>
            ))}
            {parent.is_admin && (
              <>
                <div className="nav-group">Admin</div>
                {ADMIN_NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end}>
                    <Icon name={n.icon} size={18} /> {n.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
          <div className="me">
            <div className="me-row">
              <span className="avatar sm" aria-hidden="true">{parent.name.trim().charAt(0).toUpperCase() || '?'}</span>
              <div className="me-text">
                <div className="me-name">{parent.name}</div>
                <div className="me-mail">{parent.email}</div>
              </div>
            </div>
            <div className="me-actions">
              <button className="me-btn" onClick={toggleTheme} aria-label={dark ? 'Pakai mode terang' : 'Pakai mode gelap'}>
                <Icon name={dark ? 'sun' : 'moon'} size={16} /> {dark ? 'Terang' : 'Gelap'}
              </button>
              <button className="me-btn" onClick={() => logout()}>
                <Icon name="logout" size={16} /> Keluar
              </button>
            </div>
          </div>
        </aside>
        <main className="main">
          <ImpersonationBar />
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Menu utama">
          {NAV.filter((n) => !n.sideOnly).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon name={n.icon} size={22} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </ChildContext.Provider>
  );
}

const tf = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

/** Pita peringatan selama admin masuk sebagai akun Bunda. */
function ImpersonationBar() {
  const imp = useImpersonation();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!imp) return null;
  async function back() {
    setBusy(true);
    const id = imp!.parent.id;
    await stopImpersonation();
    nav(`/admin/pengguna/${id}`, { replace: true });
  }
  return (
    <div className="impersonate-bar" role="status">
      <span>
        Anda masuk sebagai <b>{imp.parent.name}</b> ({imp.parent.email}). Semua perubahan tersimpan di akun ini.
        {imp.until && <> Sesi berakhir pukul {tf.format(new Date(imp.until))}.</>}
      </span>
      <button className="btn sm" onClick={back} disabled={busy}>Kembali ke admin {imp.by.name}</button>
    </div>
  );
}
