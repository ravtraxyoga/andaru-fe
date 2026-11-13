import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, uploadFile } from '../../api';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { fmtDateTime } from '../../format';

type AppId = 'anak' | 'ortu' | 'dini';
type Release = {
  id: number; app: AppId; version_name: string; version_code: number; notes: string; mandatory: boolean;
  status: 'draft' | 'published' | 'withdrawn'; apk_size: number | null; apk_sha256: string | null; url: string | null;
  pushed_to: number; created_at: string; published_at: string | null; created_by: string | null; installed: number;
};
type AppStat = { app: AppId; installs: number; active_30d: number; push_devices: number; by_version: { version_name: string; version_code: number; count: number }[] };
type Data = { releases: Release[]; apps: AppStat[] };

const APPS: { id: AppId; name: string; who: string }[] = [
  { id: 'anak', name: 'Dhanu', who: 'HP anak (TKA)' },
  { id: 'ortu', name: 'Bunda', who: 'HP orang tua' },
  { id: 'dini', name: 'Daru', who: 'Anak usia dini' },
];
const APP_NAME = Object.fromEntries(APPS.map((a) => [a.id, a.name])) as Record<AppId, string>;
const STATUS: Record<Release['status'], [string, string]> = { draft: ['Draf', 'mid'], published: ['Terbit', 'good'], withdrawn: ['Ditarik', 'muted'] };
const SHADES = ['var(--purple)', '#8C6FE6', '#BFB1EB', '#DCD3F5'];

const mb = (n: number | null) => (n == null ? '—' : `${(n / 1048576).toFixed(1)} MB`);
const msg = (e: unknown, fb: string) => (e instanceof ApiError ? e.message : fb);

function bump(v: string | undefined) {
  const p = (v ?? '0.1.0').split('.').map(Number);
  return p.length === 3 && p.every(Number.isFinite) ? `${p[0]}.${p[1]}.${p[2] + 1}` : '';
}

export default function AdminReleases() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-releases'], queryFn: ({ signal }) => api<Data>('/admin/releases', { signal }) });
  const [filter, setFilter] = useState<AppId | 'all'>('all');
  const [creating, setCreating] = useState<AppId | null>(null);
  const [uploadFor, setUploadFor] = useState<Release | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-releases'] });

  const act = useMutation({
    mutationFn: ({ r, kind }: { r: Release; kind: 'publish' | 'push' | 'withdraw' | 'delete' | 'mandatory' }) => {
      if (kind === 'delete') return api<{ pushed_to?: number }>(`/admin/releases/${r.id}`, { method: 'DELETE' });
      if (kind === 'mandatory') return api<{ pushed_to?: number }>(`/admin/releases/${r.id}`, { method: 'PATCH', body: { mandatory: !r.mandatory } });
      return api<{ pushed_to?: number }>(`/admin/releases/${r.id}/${kind}`, { method: 'POST', body: kind === 'publish' ? { push: true } : undefined });
    },
    onMutate: () => setFlash(null),
    onSuccess: (res, { r, kind }) => {
      const label = `${APP_NAME[r.app]} ${r.version_name}`;
      const text = {
        publish: `${label} terbit. Notifikasi dikirim ke ${res?.pushed_to ?? 0} perangkat; app lain mendapat tawaran saat dibuka.`,
        push: `Notifikasi ${label} dikirim ulang ke ${res?.pushed_to ?? 0} perangkat.`,
        withdraw: `${label} ditarik. App tidak lagi ditawari versi ini.`,
        delete: `Draf ${label} dihapus.`,
        mandatory: r.mandatory ? `${label} tidak lagi wajib.` : `${label} sekarang wajib: versi di bawahnya harus update dulu.`,
      }[kind];
      setFlash({ ok: true, text });
      refresh();
    },
    onError: (e) => setFlash({ ok: false, text: msg(e, 'Aksi gagal') }),
  });

  const latest = useMemo(() => {
    const m: Partial<Record<AppId, Release>> = {};
    for (const r of q.data?.releases ?? []) if (r.status === 'published' && (!m[r.app] || m[r.app]!.version_code < r.version_code)) m[r.app] = r;
    return m;
  }, [q.data]);
  const rows = (q.data?.releases ?? []).filter((r) => filter === 'all' || r.app === filter);

  const confirmRun = (r: Release, kind: 'publish' | 'push' | 'withdraw' | 'delete' | 'mandatory') => {
    const label = `${APP_NAME[r.app]} ${r.version_name}`;
    const ask = {
      publish: `Terbitkan ${label} dan kirim notifikasi update ke semua perangkat ${APP_NAME[r.app]}?`,
      push: `Kirim ulang notifikasi ${label} ke semua perangkat ${APP_NAME[r.app]}?`,
      withdraw: `Tarik ${label}? App yang belum update tidak akan ditawari versi ini lagi.`,
      delete: `Hapus draf ${label}?`,
      mandatory: r.mandatory ? `Jadikan ${label} tidak wajib?` : `Jadikan ${label} wajib? App versi lebih lama tidak bisa dipakai sebelum update.`,
    }[kind];
    if (window.confirm(ask)) act.mutate({ r, kind });
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="topbar">
        <div>
          <h1>Update aplikasi</h1>
          <p className="muted small">Unggah APK baru, terbitkan, dan kirim notifikasi update ke semua HP yang sudah memasang aplikasi.</p>
        </div>
        <button className="btn" onClick={() => setCreating(filter === 'all' ? 'anak' : filter)}><Icon name="plus" /> Rilis baru</button>
      </div>

      {flash && <div className={flash.ok ? 'success' : 'error'} role="status">{flash.text}</div>}
      {q.isError && <div className="error">Gagal memuat data rilis.</div>}

      <div className="app-cards">
        {APPS.map((a) => {
          const st = q.data?.apps.find((x) => x.app === a.id);
          const l = latest[a.id];
          const total = st?.installs ?? 0;
          const upToDate = l ? (st?.by_version.filter((v) => v.version_code >= l.version_code).reduce((s, v) => s + v.count, 0) ?? 0) : 0;
          return (
            <div key={a.id} className="card app-card">
              <div className="row between">
                <div>
                  <h3>{a.name}</h3>
                  <p className="muted tiny">{a.who}</p>
                </div>
                {l?.mandatory && <span className="badge low">Wajib</span>}
              </div>
              <div>
                <div className="ver">{l ? l.version_name : '—'}</div>
                <p className="muted tiny">{l ? `kode ${l.version_code} · terbit ${fmtDateTime(l.published_at!)}` : 'Belum ada rilis terbit'}</p>
              </div>
              {total > 0 && (
                <>
                  <div className="ver-bar" aria-hidden="true">
                    {st!.by_version.slice(0, 4).map((v, i) => (
                      <i key={v.version_code} style={{ width: `${(v.count / total) * 100}%`, background: SHADES[i] }} />
                    ))}
                  </div>
                  <div className="ver-legend">
                    {st!.by_version.slice(0, 4).map((v, i) => (
                      <span key={v.version_code}><i style={{ background: SHADES[i] }} />{v.version_name}: {v.count}</span>
                    ))}
                  </div>
                </>
              )}
              <p className="small">
                {total} terpasang{l && total > 0 && <> · <b>{upToDate}</b> sudah versi terbaru</>}
                <br />
                <span className="muted tiny">{st?.active_30d ?? 0} aktif 30 hari · {st?.push_devices ?? 0} bisa menerima push</span>
              </p>
              <div className="row" style={{ marginTop: 'auto' }}>
                <button className="btn sm ghost" onClick={() => setCreating(a.id)}><Icon name="plus" size={16} /> Rilis {a.name}</button>
                {l && <a className="btn sm quiet" href={`/v1/app/latest/${a.id}`} title="Tautan tetap APK terbaru"><Icon name="download" size={16} /> APK</a>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card stack">
        <div className="row between">
          <h2>Riwayat rilis</h2>
          <div className="seg" role="group" aria-label="Saring aplikasi">
            {(['all', ...APPS.map((a) => a.id)] as const).map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'Semua' : APP_NAME[f]}</button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="empty">Belum ada rilis. Buat rilis baru lalu unggah APK hasil build.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Aplikasi</th><th>Versi</th><th>Status</th><th>Catatan</th><th style={{ textAlign: 'right' }}>APK</th><th style={{ textAlign: 'right' }}>Terpasang</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="strong">{APP_NAME[r.app]}</td>
                    <td>
                      <div className="strong num">{r.version_name}</div>
                      <div className="muted tiny num">kode {r.version_code}</div>
                    </td>
                    <td>
                      <div className="status-cell" style={{ minWidth: 110 }}>
                        <span className={`badge ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                        {r.mandatory && <span className="badge low">Wajib</span>}
                        <span className="muted tiny">{r.published_at ? fmtDateTime(r.published_at) : `dibuat ${fmtDateTime(r.created_at)}`}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}><div className="notes">{r.notes || '—'}</div></td>
                    <td className="num small" style={{ textAlign: 'right' }}>
                      {r.url ? <a href={r.url}>{mb(r.apk_size)}</a> : <span className="muted">belum ada</span>}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {r.installed}
                      {r.pushed_to > 0 && <div className="muted tiny">push {r.pushed_to}</div>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {r.status === 'draft' && (
                          <>
                            <button className="btn sm ghost" onClick={() => setUploadFor(r)}><Icon name="upload" size={16} /> {r.url ? 'Ganti APK' : 'Unggah APK'}</button>
                            <button className="btn sm" disabled={!r.url || act.isPending} onClick={() => confirmRun(r, 'publish')}><Icon name="send" size={16} /> Terbitkan</button>
                            <button className="btn sm quiet" disabled={act.isPending} onClick={() => confirmRun(r, 'delete')} aria-label="Hapus draf"><Icon name="trash" size={16} /></button>
                          </>
                        )}
                        {r.status === 'published' && (
                          <>
                            <button className="btn sm ghost" disabled={act.isPending} onClick={() => confirmRun(r, 'push')}><Icon name="send" size={16} /> Kirim ulang</button>
                            <button className="btn sm quiet" disabled={act.isPending} onClick={() => confirmRun(r, 'withdraw')}><Icon name="undo" size={16} /> Tarik</button>
                          </>
                        )}
                        {r.status !== 'withdrawn' && (
                          <button className="btn sm quiet" disabled={act.isPending} onClick={() => confirmRun(r, 'mandatory')}>{r.mandatory ? 'Jadikan opsional' : 'Jadikan wajib'}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted tiny">
          Versi memakai format <b>mayor.minor.patch</b> (mis. 1.2.0) dan <b>kode versi</b> yang selalu naik. Saat build:
          <span className="mono"> flutter build apk --flavor ortu -t lib/main_ortu.dart --build-name=1.2.0 --build-number=12</span>.
          App mengecek update setiap dibuka; rilis <b>wajib</b> menutup app versi lama sampai diperbarui.
        </p>
      </div>

      {creating && (
        <NewRelease
          app={creating}
          releases={q.data?.releases ?? []}
          onClose={() => setCreating(null)}
          onDone={(text) => {
            setCreating(null);
            setFlash({ ok: true, text });
            refresh();
          }}
        />
      )}
      {uploadFor && (
        <UploadApk
          release={uploadFor}
          onClose={() => setUploadFor(null)}
          onDone={() => {
            setUploadFor(null);
            setFlash({ ok: true, text: `APK ${APP_NAME[uploadFor.app]} ${uploadFor.version_name} terunggah. Siap diterbitkan.` });
            refresh();
          }}
        />
      )}
    </div>
  );
}

function NewRelease({ app: initial, releases, onClose, onDone }: { app: AppId; releases: Release[]; onClose: () => void; onDone: (text: string) => void }) {
  const [app, setApp] = useState<AppId>(initial);
  const top = releases.filter((r) => r.app === app).sort((a, b) => b.version_code - a.version_code)[0];
  const [name, setName] = useState(() => bump(top?.version_name));
  const [code, setCode] = useState(() => String((top?.version_code ?? 1) + 1));
  const [notes, setNotes] = useState('');
  const [mandatory, setMandatory] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pickApp = (a: AppId) => {
    setApp(a);
    const t = releases.filter((r) => r.app === a).sort((x, y) => y.version_code - x.version_code)[0];
    setName(bump(t?.version_name));
    setCode(String((t?.version_code ?? 1) + 1));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!file) return setErr('Pilih file APK hasil build.');
    if (!file.name.toLowerCase().endsWith('.apk')) return setErr('File harus berekstensi .apk');
    setBusy(true);
    let id: number | null = null;
    try {
      ({ id } = await api<{ id: number }>('/admin/releases', { body: { app, version_name: name.trim(), version_code: Number(code), notes, mandatory } }));
      setProgress(0);
      await uploadFile(`/admin/releases/${id}/apk`, file, setProgress);
      let pushed = 0;
      if (publishNow) pushed = (await api<{ pushed_to: number }>(`/admin/releases/${id}/publish`, { body: { push: true } })).pushed_to;
      onDone(
        publishNow
          ? `${APP_NAME[app]} ${name} terbit. Notifikasi dikirim ke ${pushed} perangkat; app lain mendapat tawaran saat dibuka.`
          : `Draf ${APP_NAME[app]} ${name} tersimpan dengan APK. Terbitkan dari tabel saat siap.`,
      );
    } catch (e2) {
      setProgress(null);
      // Draf sudah dibuat: tutup dialog, APK bisa diunggah ulang dari tabel.
      if (id) onDone(`Draf ${APP_NAME[app]} ${name} tersimpan, tetapi langkah berikutnya gagal: ${msg(e2, 'unggah gagal')}. Lanjutkan dari tabel.`);
      else setErr(msg(e2, 'Gagal membuat rilis'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => undefined : onClose} title="Rilis baru">
      <form className="stack" onSubmit={submit}>
        <div className="seg" role="group" aria-label="Aplikasi">
          {APPS.map((a) => (
            <button type="button" key={a.id} aria-pressed={app === a.id} onClick={() => pickApp(a.id)} disabled={busy}>{a.name}</button>
          ))}
        </div>
        {top && <p className="muted tiny">Rilis terakhir: {top.version_name} (kode {top.version_code}, {STATUS[top.status][0].toLowerCase()})</p>}
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <label className="field" style={{ flex: 1 }}>
            Versi
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="1.2.0" pattern="\d+\.\d+\.\d+" required disabled={busy} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Kode versi (build number)
            <input className="input" type="number" min={1} value={code} onChange={(e) => setCode(e.target.value)} required disabled={busy} />
          </label>
        </div>
        <label className="field">
          Catatan rilis (tampil di HP)
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={'- Perbaikan tampilan laporan\n- Pengingat jadwal lebih tepat'} maxLength={4000} disabled={busy} />
        </label>
        <label className="field">
          File APK
          <input className="input" type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
          {file && <span className="muted tiny">{file.name} · {mb(file.size)}</span>}
        </label>
        <label className="switch">
          Wajib update (app versi lama ditutup sampai diperbarui)
          <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} disabled={busy} />
        </label>
        <label className="switch">
          Langsung terbitkan dan kirim notifikasi
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} disabled={busy} />
        </label>
        {progress != null && (
          <div className="stack" style={{ gap: 6 }}>
            <div className="upload-prog"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <span className="muted tiny">{progress < 1 ? `Mengunggah ${Math.round(progress * 100)}%` : 'Memproses…'}</span>
          </div>
        )}
        {err && <div className="error">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn quiet" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn" disabled={busy}>{busy ? 'Memproses…' : publishNow ? 'Unggah & terbitkan' : 'Simpan draf'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UploadApk({ release, onClose, onDone }: { release: Release; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const busy = progress != null;
  const go = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setErr('Pilih file APK.');
    setErr('');
    setProgress(0);
    try {
      await uploadFile(`/admin/releases/${release.id}/apk`, file, setProgress);
      onDone();
    } catch (e2) {
      setErr(msg(e2, 'Unggah gagal'));
      setProgress(null);
    }
  };
  return (
    <Modal open onClose={busy ? () => undefined : onClose} title={`APK ${APP_NAME[release.app]} ${release.version_name}`}>
      <form className="stack" onSubmit={go}>
        <p className="muted small">Pastikan APK dibuild dengan versi {release.version_name} dan kode {release.version_code}.</p>
        <input className="input" type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={busy} />
        {busy && <div className="upload-prog"><i style={{ width: `${Math.round(progress! * 100)}%` }} /></div>}
        {err && <div className="error">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn quiet" onClick={onClose} disabled={busy}>Batal</button>
          <button className="btn" disabled={busy}>{busy ? `Mengunggah ${Math.round(progress! * 100)}%` : 'Unggah'}</button>
        </div>
      </form>
    </Modal>
  );
}
