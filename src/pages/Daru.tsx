import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';

type Kid = { id: number; nickname: string; age_group: number; session_minutes: number; stars: number; stickers: number };
type World = { id: string; name: string; focus: string; color: string; stars: number; max_stars: number; tier: number; games: number; played: boolean };
type Progress = {
  kid: Kid;
  title: { tier: number; name: string };
  total_stars: number;
  worlds: World[];
  stickers: { id: string; name: string }[];
  sticker_total: number;
  seconds_today: number;
  seconds_7d: number;
  results_7d: number;
  remaining_seconds: number;
};

const AGE: Record<number, string> = { 1: '2–3 tahun', 2: '4–5 tahun' };

/** Profil anak usia dini untuk aplikasi Daru (akun orang tua yang sama). */
export default function Daru() {
  const qc = useQueryClient();
  const kids = useQuery({ queryKey: ['daru-kids'], queryFn: ({ signal }) => api<Kid[]>('/kids/children', { signal }) });
  const [sel, setSel] = useState<number | null>(null);
  const [form, setForm] = useState<Kid | 'new' | null>(null);
  const current = sel ?? kids.data?.[0]?.id ?? null;
  const prog = useQuery({
    queryKey: ['daru-progress', current],
    queryFn: ({ signal }) => api<Progress>(`/kids/children/${current}/progress`, { signal }),
    enabled: current != null,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/kids/children/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setSel(null);
      qc.invalidateQueries({ queryKey: ['daru-kids'] });
    },
  });
  const p = prog.data;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <h1>Daru · anak usia dini</h1>
          <p className="muted small">Permainan stimulasi untuk anak di bawah 5 tahun. Login di aplikasi Daru memakai akun ini.</p>
        </div>
        <button className="btn" onClick={() => setForm('new')}><Icon name="plus" /> Tambah profil</button>
      </div>
      {kids.data?.length === 0 && <div className="card empty">Belum ada profil Daru.</div>}
      {!!kids.data?.length && (
        <div className="child-tabs" role="group" aria-label="Pilih profil">
          {kids.data.map((k) => (
            <button key={k.id} className="child-tab" aria-pressed={k.id === current} onClick={() => setSel(k.id)}>
              <span className="avatar" style={{ background: '#F2C94C', color: '#2B2118' }}>{k.nickname.slice(0, 1).toUpperCase()}</span>
              {k.nickname}
            </button>
          ))}
        </div>
      )}
      {p && (
        <>
          <div className="grid two">
            <div className="card accent stack">
              <div className="row between">
                <div>
                  <h2>{p.kid.nickname}</h2>
                  <p className="small muted">{AGE[p.kid.age_group]} · {p.title.name} · jatah {p.kid.session_minutes} menit/hari</p>
                </div>
                <div className="row">
                  <button className="icon-btn" aria-label="Ubah profil" onClick={() => setForm(p.kid)}><Icon name="edit" /></button>
                  <button className="icon-btn" aria-label="Hapus profil" onClick={() => confirm(`Hapus profil ${p.kid.nickname} beserta semua datanya?`) && remove.mutate(p.kid.id)}><Icon name="trash" /></button>
                </div>
              </div>
              <div className="stats">
                <div className="stat"><b>{p.total_stars}</b><span>Bintang</span></div>
                <div className="stat"><b>{p.stickers.length}/{p.sticker_total}</b><span>Stiker</span></div>
                <div className="stat"><b>{Math.round(p.seconds_today / 60)}</b><span>Menit main hari ini</span></div>
                <div className="stat"><b>{Math.round(p.seconds_7d / 60)}</b><span>Menit 7 hari</span></div>
              </div>
            </div>
            <div className="card stack">
              <h2>Perkembangan per dunia</h2>
              <div className="list">
                {p.worlds.filter((w) => w.games > 0).map((w) => (
                  <div key={w.id} className="stack" style={{ gap: 6 }}>
                    <div className="row between small">
                      <span><b>{w.name}</b> · {w.focus}</span>
                      <span className="muted">Tingkat {w.tier} · {w.stars}/{w.max_stars} bintang</span>
                    </div>
                    <div className="progress" role="progressbar" aria-valuenow={w.stars} aria-valuemax={w.max_stars} aria-label={w.name}>
                      <i style={{ width: `${w.max_stars ? (w.stars / w.max_stars) * 100 : 0}%`, background: w.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="tiny muted">Dunia lain menyusul. Daru adalah aplikasi stimulasi bermain, bukan alat pemeriksaan penglihatan atau pendengaran.</p>
            </div>
          </div>
        </>
      )}
      <Modal open={form !== null} onClose={() => setForm(null)} title={form === 'new' ? 'Profil Daru baru' : 'Ubah profil'}>
        {form !== null && (
          <KidForm
            initial={form === 'new' ? undefined : form}
            onClose={() => setForm(null)}
            onSaved={(id) => {
              setForm(null);
              if (id) setSel(id);
              qc.invalidateQueries({ queryKey: ['daru-kids'] });
              qc.invalidateQueries({ queryKey: ['daru-progress'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function KidForm({ initial, onClose, onSaved }: { initial?: Kid; onClose: () => void; onSaved: (id?: number) => void }) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [age, setAge] = useState(initial?.age_group ?? 1);
  const [minutes, setMinutes] = useState(initial?.session_minutes ?? 10);
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const body = { nickname: nickname.trim(), age_group: age, session_minutes: minutes };
    try {
      if (initial) {
        await api(`/kids/children/${initial.id}`, { method: 'PATCH', body });
        onSaved();
      } else {
        const r = await api<{ id: number }>('/kids/children', { body });
        onSaved(r.id);
      }
    } catch (x) {
      setErr((x as Error).message);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      {err && <div className="error" role="alert">{err}</div>}
      <label className="field">Nama panggilan
        <input className="input" required maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} autoFocus />
      </label>
      <div className="field">
        <span>Kelompok usia</span>
        <div className="chips" role="group" aria-label="Kelompok usia">
          {[1, 2].map((a) => <button type="button" key={a} className="chip" aria-pressed={age === a} onClick={() => setAge(a)}>{AGE[a]}</button>)}
        </div>
      </div>
      <div className="field">
        <span>Waktu main per hari</span>
        <div className="chips" role="group" aria-label="Waktu main per hari">
          {[5, 10, 15].map((m) => <button type="button" key={m} className="chip" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} menit</button>)}
        </div>
      </div>
      <p className="tiny muted">Data minimal: nama panggilan, kelompok usia, dan hasil main. Tanpa foto atau lokasi.</p>
      <div className="row">
        <button className="btn">Simpan</button>
        <button type="button" className="btn quiet" onClick={onClose}>Batal</button>
      </div>
    </form>
  );
}
