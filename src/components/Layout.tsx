import { NavLink, Outlet } from 'react-router';
import { logout } from '../api';
import { useParent } from '../hooks/useAuth';
import { ChildContext, useSelectedChildState } from '../hooks/useChildren';
import { Icon } from './Icon';

const NAV = [
  { to: '/', label: 'Ringkasan', icon: 'home', end: true },
  { to: '/jadwal', label: 'Jadwal', icon: 'calendar' },
  { to: '/laporan', label: 'Laporan', icon: 'chart' },
  { to: '/anak', label: 'Anak', icon: 'kids' },
  { to: '/daru', label: 'Daru', icon: 'star' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Bank Soal', icon: 'book', end: true },
  { to: '/admin/impor', label: 'Impor Soal', icon: 'upload' },
  { to: '/admin/pengguna', label: 'Pengguna', icon: 'users' },
  { to: '/admin/update', label: 'Update Aplikasi', icon: 'phone' },
];

export function Layout() {
  const parent = useParent()!;
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
            <span className="avatar sm" aria-hidden="true">{parent.name.trim().charAt(0).toUpperCase() || '?'}</span>
            <div className="me-text">
              <div className="me-name">{parent.name}</div>
              <div className="me-mail">{parent.email}</div>
            </div>
            <button className="me-out" onClick={() => logout()} title="Keluar" aria-label="Keluar">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>
        <main className="main">
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Menu utama">
          {NAV.map((n) => (
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
