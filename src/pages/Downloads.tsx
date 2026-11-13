import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Icon } from '../components/Icon';

type AppInfo = {
  app: 'anak' | 'ortu' | 'dini';
  name: string;
  available: boolean;
  version_name?: string;
  version_code?: number;
  notes?: string;
  size?: number | null;
  published_at?: string | null;
  url?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const FOR: Record<AppInfo['app'], string> = {
  ortu: 'Untuk HP Bunda/orang tua. Atur jadwal, lihat laporan, dan buka kunci darurat.',
  anak: 'Untuk HP anak yang berlatih TKA. Pasangkan dengan kode dari menu Anak.',
  dini: 'Untuk HP atau tablet anak usia 2–5 tahun. Masuk dengan akun Bunda.',
};
const ORDER: AppInfo['app'][] = ['ortu', 'anak', 'dini'];
const df = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

function absolute(path: string) {
  return new URL(`${API_BASE}${path}`, window.location.origin).toString();
}

export default function Downloads() {
  const q = useQuery({ queryKey: ['app-latest'], queryFn: ({ signal }) => api<{ apps: AppInfo[] }>('/app/latest', { signal }) });
  const apps = q.data ? ORDER.map((id) => q.data.apps.find((a) => a.app === id)).filter((a): a is AppInfo => !!a) : [];
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h1>Unduh Aplikasi</h1>
        <p className="muted small">Versi terbaru ketiga aplikasi Andaru untuk Android. Tautan unduhan selalu mengarah ke versi terbaru.</p>
      </div>
      {q.isLoading && <p className="muted">Memuat…</p>}
      {q.isError && <div className="error">Gagal memuat daftar aplikasi.</div>}
      <div className="app-cards">
        {apps.map((a) => <AppCard key={a.app} a={a} />)}
      </div>
      <div className="card stack">
        <h2>Cara memasang</h2>
        <ol className="steps">
          <li>Buka halaman ini di HP tujuan, atau salin tautan lalu kirim ke HP tersebut (misalnya lewat WhatsApp).</li>
          <li>Ketuk <b>Unduh APK</b>. Setelah unduhan selesai, buka file-nya.</li>
          <li>Jika Android meminta, izinkan <b>Instal aplikasi tidak dikenal</b> untuk browser atau aplikasi pengelola file.</li>
          <li>Pilih <b>Pasang</b>. Versi berikutnya akan ditawarkan otomatis dari dalam aplikasi.</li>
        </ol>
      </div>
    </div>
  );
}

function AppCard({ a }: { a: AppInfo }) {
  const [copied, setCopied] = useState(false);
  const link = a.url ? absolute(a.url) : '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Salin tautan ini:', link);
    }
  }
  return (
    <div className="card app-card">
      <div className="row">
        <img src={`/apps/${a.app}.svg`} alt="" width={48} height={48} style={{ borderRadius: 12 }} />
        <div>
          <h3>{a.name}</h3>
          {a.available ? (
            <p className="muted small num">
              Versi {a.version_name} ({a.version_code}){a.size ? ` · ${(a.size / 1048576).toFixed(1)} MB` : ''}
            </p>
          ) : (
            <p className="muted small">Belum tersedia</p>
          )}
        </div>
      </div>
      <p className="small">{FOR[a.app]}</p>
      {a.available && a.published_at && <p className="muted small">Terbit {df.format(new Date(a.published_at))}</p>}
      {a.available && a.notes && <div className="notes">{a.notes}</div>}
      {a.available ? (
        <div className="row" style={{ marginTop: 'auto', flexWrap: 'wrap' }}>
          <a className="btn sm" href={link} download>
            <Icon name="download" size={18} /> Unduh APK
          </a>
          <button className="btn sm quiet" onClick={copy}>
            <Icon name="copy" size={18} /> {copied ? 'Tersalin' : 'Salin tautan'}
          </button>
        </div>
      ) : (
        <p className="muted small" style={{ marginTop: 'auto' }}>Admin belum menerbitkan APK untuk aplikasi ini.</p>
      )}
    </div>
  );
}
