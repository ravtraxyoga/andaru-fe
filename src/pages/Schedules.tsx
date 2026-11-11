import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, ApiError } from '../api';
import { ChildSwitcher, NoChild } from '../components/ChildSwitcher';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useSelectedChild } from '../hooks/useChildren';
import { DAYS, daysLabel, fmtDateTime, gapLabel, STATUS_LABEL } from '../format';
import type { Schedule, SessionRow, Subject } from '../types';

type Draft = { subject_ids: number[]; days_mask: number; start_time: string; question_count: number; duration_min: number; focus_mode: boolean };

export default function Schedules() {
  const qc = useQueryClient();
  const { children, child } = useSelectedChild();
  const [form, setForm] = useState<{ id?: number; draft: Draft } | null>(null);
  const [now, setNow] = useState(false);
  const [err, setErr] = useState('');
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: ({ signal }) => api<Subject[]>('/subjects', { signal }), staleTime: 3600_000 });
  const list = useQuery({
    queryKey: ['schedules', child?.id],
    queryFn: ({ signal }) => api<Schedule[]>(`/children/${child!.id}/schedules`, { signal }),
    enabled: !!child,
  });
  const upcoming = useQuery({
    queryKey: ['upcoming', child?.id],
    queryFn: ({ signal }) => api<{ items: SessionRow[] }>(`/children/${child!.id}/sessions?upcoming=true&limit=10`, { signal }),
    enabled: !!child,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['schedules', child?.id] });
    qc.invalidateQueries({ queryKey: ['upcoming', child?.id] });
    qc.invalidateQueries({ queryKey: ['summary', child?.id] });
  };
  const toggle = useMutation({
    mutationFn: (s: Schedule) => api(`/schedules/${s.id}`, { method: 'PATCH', body: { active: !s.active } }),
    onSuccess: refresh,
    onError: (e) => setErr((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: (s: Schedule) => api(`/schedules/${s.id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e) => setErr((e as Error).message),
  });

  if (!children.length) return <NoChild />;
  const blank: Draft = { subject_ids: [subjects.data?.[0]?.id ?? 1], days_mask: 21, start_time: '16:00', question_count: 30, duration_min: 20, focus_mode: true };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <h1>Jadwal sesi</h1>
          <p className="muted small">Pengingat dikirim ke HP anak tepat di jam sesi.</p>
        </div>
        <ChildSwitcher />
      </div>
      {err && <div className="error" role="alert">{err}</div>}
      <div className="row">
        <button className="btn" onClick={() => setForm({ draft: blank })}><Icon name="plus" /> Buat jadwal</button>
        <button className="btn ghost" onClick={() => setNow(true)}><Icon name="bolt" /> Sesi sekarang</button>
      </div>
      <div className="grid two">
        <div className="card stack">
          <h2>Jadwal rutin {child?.name}</h2>
          {child && (
            <p className="small muted">
              Maks {child.max_sessions_per_day} sesi/hari · {gapLabel(child.min_gap_minutes)} ·{' '}
              <Link to={`/anak?atur=${child.id}`}>ubah</Link>
            </p>
          )}
          {list.data?.length === 0 && <p className="muted small">Belum ada jadwal rutin.</p>}
          <div className="list">
            {list.data?.map((s) => (
              <div className="item" key={s.id} style={{ opacity: s.active ? 1 : 0.6 }}>
                <span>
                  <span className="strong">{s.subject} · {s.start_time}</span>
                  <br />
                  <span className="tiny muted">{daysLabel(s.days_mask)} · {s.question_count} soal · {s.duration_min} menit{s.focus_mode ? ' · Mode Fokus' : ''}</span>
                </span>
                <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <button className="btn sm quiet" onClick={() => toggle.mutate(s)}>{s.active ? 'Jeda' : 'Aktifkan'}</button>
                  <button className="icon-btn" aria-label="Ubah jadwal" onClick={() => setForm({ id: s.id, draft: { subject_ids: s.subject_ids, days_mask: s.days_mask, start_time: s.start_time, question_count: s.question_count, duration_min: s.duration_min, focus_mode: s.focus_mode } })}><Icon name="edit" /></button>
                  <button className="icon-btn" aria-label="Hapus jadwal" onClick={() => confirm('Hapus jadwal ini? Sesi mendatang yang belum dimulai ikut dihapus.') && remove.mutate(s)}><Icon name="trash" /></button>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card stack">
          <h2>7 hari ke depan</h2>
          {upcoming.data?.items.length === 0 && <p className="muted small">Tidak ada sesi terjadwal.</p>}
          <div className="list">
            {upcoming.data?.items.map((s) => (
              <div className="item" key={s.id}>
                <span className="strong">{s.subject} · {s.question_count} soal</span>
                <span className="small muted">{s.status === 'scheduled' ? fmtDateTime(s.scheduled_for) : STATUS_LABEL[s.status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah jadwal' : 'Buat jadwal sesi'}>
        {form && subjects.data && (
          <ScheduleForm
            subjects={subjects.data}
            initial={form.draft}
            childId={child?.id}
            onCancel={() => setForm(null)}
            onSave={async (d) => {
              if (form.id) await api(`/schedules/${form.id}`, { method: 'PATCH', body: d });
              else await api('/schedules', { body: { ...d, child_id: child!.id } });
              refresh();
              setForm(null);
            }}
          />
        )}
      </Modal>
      <Modal open={now} onClose={() => setNow(false)} title={`Sesi sekarang untuk ${child?.name ?? ''}`}>
        {now && subjects.data && (
          <ScheduleForm
            subjects={subjects.data}
            initial={blank}
            oneOff
            childId={child?.id}
            onCancel={() => setNow(false)}
            onSave={async (d) => {
              await api(`/children/${child!.id}/sessions`, { body: { subject_ids: d.subject_ids, question_count: d.question_count, duration_min: d.duration_min, focus_mode: d.focus_mode } });
              refresh();
              setNow(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ScheduleForm({ subjects, initial, oneOff, childId, onSave, onCancel }: { subjects: Subject[]; initial: Draft; oneOff?: boolean; childId?: number; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState('');
  const [rule, setRule] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!oneOff && d.days_mask === 0) return setErr('Pilih minimal satu hari');
    if (d.subject_ids.length === 0) return setErr('Pilih minimal satu mata uji');
    setBusy(true);
    setErr('');
    setRule(undefined);
    try {
      await onSave(d);
    } catch (x) {
      setErr((x as Error).message);
      if (x instanceof ApiError) setRule(x.code);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      {err && (
        <div className="error stack" role="alert" style={{ gap: 10 }}>
          <span>{err}</span>
          {(rule === 'daily_limit_exceeded' || rule === 'gap_too_short' || rule === 'too_soon') && (
            <div className="row">
              {childId && <Link className="btn sm ghost" to={`/anak?atur=${childId}`}>Ubah batas dan jeda</Link>}
              {!oneOff && <button type="button" className="btn sm quiet" onClick={() => setErr('')}>Kurangi slot</button>}
            </div>
          )}
        </div>
      )}
      <div className="field">
        <span>Mata uji (boleh lebih dari satu)</span>
        <div className="chips" role="group" aria-label="Mata uji">
          {subjects.map((s) => {
            const on = d.subject_ids.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                className="chip"
                aria-pressed={on}
                onClick={() => setD({ ...d, subject_ids: on ? d.subject_ids.filter((x) => x !== s.id) : [...d.subject_ids, s.id] })}
              >{s.name}</button>
            );
          })}
        </div>
        {d.subject_ids.length > 1 && (
          <span className="tiny muted" style={{ fontWeight: 400 }}>
            Sesi campuran: {d.question_count} soal dibagi rata ke {d.subject_ids.length} mapel (± {Math.floor(d.question_count / d.subject_ids.length)} soal per mapel), urut sesuai pilihan.
          </span>
        )}
      </div>
      {!oneOff && (
        <>
          <div className="field">
            <span>Hari</span>
            <div className="chips" role="group" aria-label="Hari">
              {DAYS.map((label, i) => (
                <button type="button" key={label} className="chip" aria-pressed={!!(d.days_mask & (1 << i))} onClick={() => setD({ ...d, days_mask: d.days_mask ^ (1 << i) })}>{label}</button>
              ))}
            </div>
          </div>
          <label className="field">Jam mulai (WIB)
            <input className="input" type="time" required value={d.start_time} onChange={(e) => setD({ ...d, start_time: e.target.value })} />
          </label>
        </>
      )}
      <label className="field">
        <span className="row between"><span>Jumlah soal</span><span style={{ color: 'var(--purple)' }}>{d.question_count}</span></span>
        <input type="range" min={20} max={50} step={5} value={d.question_count} onChange={(e) => setD({ ...d, question_count: Number(e.target.value) })} style={{ accentColor: 'var(--purple)' }} />
        <span className="row between tiny muted"><span>20</span><span>50</span></span>
      </label>
      <div className="field">
        <span>Durasi</span>
        <div className="chips" role="group" aria-label="Durasi">
          {[15, 20].map((m) => <button type="button" key={m} className="chip" aria-pressed={d.duration_min === m} onClick={() => setD({ ...d, duration_min: m })}>{m} menit</button>)}
        </div>
      </div>
      <label className="switch">Aktifkan Mode Fokus
        <input type="checkbox" checked={d.focus_mode} onChange={(e) => setD({ ...d, focus_mode: e.target.checked })} />
      </label>
      <div className="row">
        <button className="btn" disabled={busy}>{oneOff ? 'Kirim ke HP anak' : 'Simpan jadwal'}</button>
        <button type="button" className="btn quiet" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}
