import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { ChildSwitcher, NoChild } from '../components/ChildSwitcher';
import { useSelectedChild } from '../hooks/useChildren';
import { fmtDateTime, scoreTone, STATUS_LABEL } from '../format';
import type { SessionRow } from '../types';

type Page = { items: SessionRow[]; next_before: string | null };

export default function Reports() {
  const { children, child } = useSelectedChild();
  const q = useInfiniteQuery({
    queryKey: ['history', child?.id],
    enabled: !!child,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      api<Page>(`/children/${child!.id}/sessions?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`, { signal }),
    getNextPageParam: (p) => p.next_before,
  });
  if (!children.length) return <NoChild />;
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <h1>Laporan sesi</h1>
        <ChildSwitcher />
      </div>
      <div className="card">
        {rows.length === 0 && !q.isLoading && <p className="empty">Belum ada sesi selesai untuk {child?.name}.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Waktu</th><th>Mata uji</th><th>Status</th><th>Benar</th><th>Skor</th><th>Keluar</th><th>XP</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/sesi/${r.id}`}>{fmtDateTime(r.scheduled_for)}</Link></td>
                  <td>{r.subject}</td>
                  <td>{STATUS_LABEL[r.status]}</td>
                  <td>{r.correct_count != null ? `${r.correct_count}/${r.question_count}` : '–'}</td>
                  <td>{r.score != null ? <span className={`badge ${scoreTone(r.score)}`}>{r.score}</span> : '–'}</td>
                  <td>{r.focus_breaks ? <span className="badge low">{r.focus_breaks}×</span> : '–'}</td>
                  <td>{r.xp_awarded ? `+${r.xp_awarded}` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {q.hasNextPage && (
          <div style={{ marginTop: 14 }}>
            <button className="btn ghost" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>Muat lagi</button>
          </div>
        )}
      </div>
    </div>
  );
}
