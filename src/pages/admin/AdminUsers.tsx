import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { api } from '../../api';
import { fmtDateTime } from '../../format';

type Row = { id: number; name: string; email: string; is_admin: boolean; created_at: string; children: number; kids: number; last_active: string | null };
type Page = { items: Row[]; total: number; page: number; per_page: number; totals: { parents: number; children: number; kids: number; new_7d: number } };

const PER = 25;
const df = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [search]);
  const list = useQuery({
    queryKey: ['admin-parents', search, page],
    queryFn: ({ signal }) => api<Page>(`/admin/parents?page=${page}&per_page=${PER}${search ? `&q=${encodeURIComponent(search)}` : ''}`, { signal }),
    placeholderData: keepPreviousData,
  });
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / PER)) : 1;
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
          <div className="stat"><b>{d.totals.children}</b><span>Anak TKA (Dhanu)</span></div>
          <div className="stat"><b>{d.totals.kids}</b><span>Anak dini (Daru)</span></div>
          <div className="stat"><b>{d.totals.new_7d}</b><span>Daftar 7 hari</span></div>
        </div>
      )}
      <div className="card stack">
        <div className="search-row">
          <input className="input" type="search" placeholder="Cari nama atau email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pengguna" />
          {d && <span className="muted small">{d.total} akun</span>}
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
                </tr>
              ))}
              {d && d.items.length === 0 && (
                <tr><td colSpan={6} className="empty">Tidak ada akun yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pager" aria-busy={list.isFetching}>
            <span className="pager-info muted small">Halaman {page} dari {pages}</span>
            <div className="pager-nav">
              <button className="btn sm quiet" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button>
              <button className="btn sm quiet" disabled={page >= pages} onClick={() => setPage(page + 1)}>Berikutnya</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
