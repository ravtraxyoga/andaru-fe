import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { api } from '../../api';
import { Pager, usePerPage } from '../../components/Pager';
import { fmtDateTime } from '../../format';
import { ImpersonateButton } from './AdminUserDetail';

type Row = { id: number; name: string; email: string; is_admin: boolean; created_at: string; children: number; kids: number; last_active: string | null };
type Page = { items: Row[]; total: number; page: number; per_page: number; totals: { parents: number; children: number; kids: number; new_7d: number } };

const df = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [per, setPer] = usePerPage('andaru.admin.users.perPage');
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [search, per]);
  const list = useQuery({
    queryKey: ['admin-parents', search, page, per],
    queryFn: ({ signal }) => api<Page>(`/admin/parents?page=${page}&per_page=${per}${search ? `&q=${encodeURIComponent(search)}` : ''}`, { signal }),
    placeholderData: keepPreviousData,
  });
  const d = list.data;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <h1>Pengguna</h1>
          <p className="muted small">Akun orang tua (aplikasi Bunda) beserta anak yang mereka tambahkan.</p>
        </div>
      </div>
      {d && (
        <div className="stats">
          <div className="stat"><b>{d.totals.parents}</b><span>Akun Bunda</span></div>
          <div className="stat"><b>{d.totals.children}</b><span>Anak TKA (app Anak)</span></div>
          <div className="stat"><b>{d.totals.kids}</b><span>Anak dini (app Balita)</span></div>
          <div className="stat"><b>{d.totals.new_7d}</b><span>Daftar 7 hari</span></div>
        </div>
      )}
      <div className="card stack">
        <div className="search-row">
          <input className="input" type="search" placeholder="Cari nama atau email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pengguna" />
        </div>
        {list.isError && <div className="error">Gagal memuat daftar pengguna.</div>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th style={{ textAlign: 'right' }}>Anak TKA</th>
                <th style={{ textAlign: 'right' }}>Anak dini</th>
                <th>Terdaftar</th>
                <th>Aktif terakhir</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {d?.items.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/admin/pengguna/${r.id}`)}>
                  <td>
                    <Link to={`/admin/pengguna/${r.id}`} className="strong" style={{ color: 'inherit', textDecoration: 'none' }}>{r.name}</Link>
                    {r.is_admin && <span className="badge dark" style={{ marginLeft: 8 }}>Admin</span>}
                  </td>
                  <td className="small">{r.email}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.children}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.kids}</td>
                  <td className="small">{df.format(new Date(r.created_at))}</td>
                  <td className="small">{r.last_active ? fmtDateTime(r.last_active) : <span className="muted">Belum ada</span>}</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                    {!r.is_admin && <ImpersonateButton id={r.id} name={r.name} compact />}
                  </td>
                </tr>
              ))}
              {d && d.items.length === 0 && (
                <tr><td colSpan={7} className="empty">Tidak ada akun yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {d && (
          <Pager page={d.page} perPage={d.per_page} total={d.total} unit="akun" loading={list.isFetching} onPage={setPage} onPerPage={setPer} />
        )}
      </div>
    </div>
  );
}
