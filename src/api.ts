// Klien API tipis. Token akses pendek (15 menit) diperbarui otomatis memakai
// refresh token; beberapa request yang gagal bersamaan hanya memicu satu refresh.

const BASE = import.meta.env.VITE_API_BASE ?? '';
const KEY = 'andaru.auth';

export type Tokens = { access_token: string; refresh_token: string; expires_in: number };
export type Parent = { id: number; name: string; email: string; is_admin: boolean };
type Stored = { tokens: Tokens; parent: Parent };

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

let current: Stored | null = load();

function save(v: Stored | null) {
  current = v;
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* mode privat: sesi hanya di memori */
  }
  window.dispatchEvent(new Event('auth-changed'));
}

export const getAuth = () => current;
export const getParent = () => current?.parent ?? null;

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    current = load();
    window.dispatchEvent(new Event('auth-changed'));
  }
});

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  if (!current) return false;
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${BASE}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current!.tokens.refresh_token }),
      });
      if (!r.ok) {
        save(null);
        return false;
      }
      save({ ...current!, tokens: (await r.json()) as Tokens });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

type Opts = { method?: string; body?: unknown; raw?: BodyInit; contentType?: string; signal?: AbortSignal; blob?: boolean };

export async function api<T>(path: string, opts: Opts = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.raw !== undefined) {
    body = opts.raw;
    if (opts.contentType) headers['Content-Type'] = opts.contentType;
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  if (current) headers.Authorization = `Bearer ${current.tokens.access_token}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  opts.signal?.addEventListener('abort', () => ctrl.abort());
  let r: Response;
  try {
    r = await fetch(`${BASE}/v1${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body, signal: ctrl.signal });
  } catch {
    throw new ApiError(0, 'Tidak bisa terhubung ke server');
  } finally {
    clearTimeout(timer);
  }
  if (r.status === 401 && current && !retried && !path.startsWith('/auth/')) {
    if (await refresh()) return api<T>(path, opts, true);
  }
  if (opts.blob && r.ok) return (await r.blob()) as T;
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    const d = (data ?? {}) as Record<string, unknown>;
    throw new ApiError(r.status, typeof d.error === 'string' ? d.error : `Gagal (${r.status})`, typeof d.code === 'string' ? d.code : undefined, d);
  }
  return data as T;
}

export async function login(email: string, password: string) {
  const r = await api<Stored>('/auth/login', { body: { email, password } });
  save(r);
}

export async function register(name: string, email: string, password: string, pin: string) {
  const r = await api<Stored>('/auth/register', { body: { name, email, password, pin } });
  save(r);
}

export async function logout() {
  const rt = current?.tokens.refresh_token;
  save(null);
  if (rt) await api('/auth/logout', { body: { refresh_token: rt } }).catch(() => undefined);
}

/** Unggah file besar (mis. APK) dengan progres. Token disegarkan dulu lewat request ringan. */
export async function uploadFile<T>(path: string, file: File, onProgress: (ratio: number) => void, method = 'PUT'): Promise<T> {
  await api('/me');
  return new Promise<T>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, `${BASE}/v1${path}`);
    if (current) x.setRequestHeader('Authorization', `Bearer ${current.tokens.access_token}`);
    x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onerror = () => reject(new ApiError(0, 'Unggahan terputus'));
    x.onload = () => {
      let data: Record<string, unknown> | null = null;
      try {
        data = JSON.parse(x.responseText);
      } catch {
        /* bukan JSON */
      }
      if (x.status >= 200 && x.status < 300) resolve(data as T);
      else reject(new ApiError(x.status, typeof data?.error === 'string' ? data.error : `Gagal (${x.status})`));
    };
    x.send(file);
  });
}
