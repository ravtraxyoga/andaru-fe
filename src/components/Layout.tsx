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
  { to: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
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
                <Icon name={n.icon} /> {n.label}
              </NavLink>
            ))}
            {parent.is_admin && (
              <>
                <div className="sep" />
                <NavLink to="/admin" end>
                  <Icon name="book" /> Bank Soal
                </NavLink>
                <NavLink to="/admin/impor">
                  <Icon name="upload" /> Impor Soal
                </NavLink>
              </>
            )}
          </nav>
          <div className="me">
            <div className="strong" style={{ color: '#fff' }}>{parent.name}</div>
            <div className="tiny">{parent.email}</div>
            <button className="btn sm quiet" style={{ marginTop: 10, color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={() => logout()}>
              <Icon name="logout" size={16} /> Keluar
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
