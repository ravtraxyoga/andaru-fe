import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useSelectedChild } from '../hooks/useChildren';
import { GAP_CHOICES, gapLabel } from '../format';
import type { ChildCard } from '../types';

type Code = { name: string; pairing_code: string; expires_at: string };

export default function Children() {
  const qc = useQueryClient();
  const { children, select } = useSelectedChild();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ChildCard | null>(null);
  const [code, setCode] = useState<Code | null>(null);
  const [err, setErr] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['children'] });
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const id = Number(params.get('atur'));
    const c = children.find((x) => x.id === id);
    if (c) {
      setEditing(c);
      setParams({}, { replace: true });
    }
  }, [params, children, setParams]);

  const newCode = useMutation({
    mutationFn: (c: ChildCard) => api<{ pairing_code: string; expires_at: string }>(`/children/${c.id}/pairing-code`, { method: 'POST' }).then((r) => ({ ...r, name: c.name })),
    onSuccess: setCode,
    onError: (e) => setErr((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: (c: ChildCard) => api(`/children/${c.id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e) => setErr((e as Error).message),
  });

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <h1>Akun anak</h1>
          <p className="muted small">Satu akun orang tua bisa mengelola beberapa anak. Tiap anak dipasangkan ke HP-nya sendiri.</p>
        </div>
        <button className="btn" onClick={() => setAdding(true)}><Icon name="plus" /> Tambah anak</button>
      </div>
      {err && <div className="error" role="alert">{err}</div>}
      {children.length === 0 && <div className="card empty">Belum ada anak. Tekan Tambah anak.</div>}
      <div className="grid three">
        {children.map((c) => (
          <div className="card stack" key={c.id}>
            <div className="row">
              <span className="avatar lg">{c.name.slice(0, 1).toUpperCase()}</span>
              <div style={{ flex: 1 }}>
                <h2>{c.name}</h2>
                <p className="small muted">Kelas {c.grade} · {c.level.label}</p>
              </div>
            </div>
            <p className="small muted">Maks {c.max_sessions_per_day} sesi/hari · {gapLabel(c.min_gap_minutes)}</p>
            <div className="chips">
              {c.paired ? <span className="badge good">HP terpasang</span> : <span className="badge mid">Belum dipasangkan</span>}
              {c.device_owner && <span className="badge dark">Mode kiosk</span>}
              {c.last_score != null && <span className="badge muted">Skor terakhir {c.last_score}</span>}
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => newCode.mutate(c)} disabled={newCode.isPending}>
                {c.paired ? 'Pasangkan HP baru' : 'Buat kode pairing'}
              </button>
              <button className="icon-btn" aria-label={`Ubah ${c.name}`} onClick={() => setEditing(c)}><Icon name="edit" /></button>
              <button
                className="icon-btn"
                aria-label={`Hapus ${c.name}`}
                onClick={() => confirm(`Hapus akun ${c.name}? Semua riwayat sesinya ikut terhapus.`) && remove.mutate(c)}
              ><Icon name="trash" /></button>
            </div>
          </div>
        ))}
      </div>

      <ChildForm
        open={adding}
        title="Tambah akun anak"
        onClose={() => setAdding(false)}
        onSave={async ({ name, grade }) => {
          const r = await api<{ id: number; name: string; pairing_code: string; expires_at: string }>('/children', { body: { name, grade } });
          await refresh();
          select(r.id);
          setAdding(false);
          setCode(r);
        }}
      />
      <ChildForm
        open={!!editing}
        title="Ubah data anak"
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (v) => {
          const r = await api<{ trimmed_sessions: number }>(`/children/${editing!.id}`, { method: 'PATCH', body: v });
          await refresh();
          qc.invalidateQueries({ queryKey: ['upcoming'] });
          setEditing(null);
          if (r.trimmed_sessions > 0) setErr(`${r.trimmed_sessions} slot sesi mendatang dihapus karena melebihi batas baru.`);
        }}
      />
      <Modal open={!!code} onClose={() => setCode(null)} title={`Kode pairing ${code?.name ?? ''}`}>
        {code && (
          <>
            <div style={{ background: 'var(--purple-tint)', borderRadius: 16, padding: 18, textAlign: 'center' }}>
              <div className="small muted">Berlaku sampai {new Date(code.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} (10 menit), sekali pakai</div>
              <div className="code">{code.pairing_code.slice(0, 3)} {code.pairing_code.slice(3)}</div>
            </div>
            <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Pasang aplikasi Dhanu di HP anak.</li>
              <li>Buka aplikasi, masukkan kode di atas.</li>
              <li>Izinkan notifikasi supaya pengingat jadwal masuk.</li>
            </ol>
            <p className="tiny muted">Memasangkan HP baru akan mengeluarkan HP lama anak ini.</p>
            <button className="btn" onClick={() => setCode(null)}>Selesai</button>
          </>
        )}
      </Modal>
    </div>
  );
}

type ChildValues = { name: string; grade: number; max_sessions_per_day?: number; min_gap_minutes?: number };

function ChildForm({ open, title, initial, onClose, onSave }: {
  open: boolean;
  title: string;
  initial?: ChildCard;
  onClose: () => void;
  onSave: (v: ChildValues) => Promise<void>;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && <ChildFormBody initial={initial} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function ChildFormBody({ initial, onClose, onSave }: { initial?: ChildCard; onClose: () => void; onSave: (v: ChildValues) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [grade, setGrade] = useState(initial?.grade ?? 9);
  const [maxDay, setMaxDay] = useState(initial?.max_sessions_per_day ?? 2);
  const [gap, setGap] = useState(initial?.min_gap_minutes ?? 180);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await onSave(initial ? { name: name.trim(), grade, max_sessions_per_day: maxDay, min_gap_minutes: gap } : { name: name.trim(), grade });
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      {err && <div className="error" role="alert">{err}</div>}
      <label className="field">Nama panggilan
        <input className="input" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="field">
        <span>Kelas</span>
        <div className="chips" role="group" aria-label="Kelas">
          {[7, 8, 9].map((g) => (
            <button type="button" key={g} className="chip" aria-pressed={grade === g} onClick={() => setGrade(g)}>{g} SMP</button>
          ))}
        </div>
      </div>
      {initial && (
        <>
          <div className="field">
            <span>Batas sesi per hari</span>
            <div className="chips" role="group" aria-label="Batas sesi per hari">
              {[1, 2].map((n) => (
                <button type="button" key={n} className="chip" aria-pressed={maxDay === n} onClick={() => setMaxDay(n)}>{n} sesi</button>
              ))}
            </div>
            {maxDay < (initial.max_sessions_per_day ?? 2) && <span className="tiny muted" style={{ fontWeight: 400 }}>Slot mendatang yang melebihi batas akan dihapus.</span>}
          </div>
          <label className="field">Jeda minimal antar sesi
            <select className="input" value={gap} onChange={(e) => setGap(Number(e.target.value))}>
              {GAP_CHOICES.map((g) => <option key={g} value={g}>{gapLabel(g)}</option>)}
            </select>
          </label>
        </>
      )}
      <p className="tiny muted">Simpan data seminimal mungkin: nama panggilan dan kelas saja. Batas dan jeda hanya bisa diubah orang tua.</p>
      <div className="row">
        <button className="btn" disabled={busy}>Simpan</button>
        <button type="button" className="btn quiet" onClick={onClose}>Batal</button>
      </div>
    </form>
  );
}
