// Membaca bank soal dari teks: JSON, HTML artifact (const DATA = [...]), blok ```json di Markdown,
// atau format Markdown biasa:
//
//   ## Matematika                       <- judul berisi nama mapel = mapel
//   ### Persamaan Linear Satu Variabel  <- judul lain = topik
//   1. Nilai x yang memenuhi 9x - 3 = 15 adalah ...
//   A. 2
//   B. 4
//   C. 1
//   D. -1
//   Kunci: A
//   Pembahasan: 9x = 18, jadi x = 2
//
// Baris "Mapel: ...", "Topik: ...", "Kelas: ..." juga dikenali. Id soal dibuat dari isi soal
// (hash), jadi impor ulang file yang sama tidak membuat duplikat.

export type BankItem = {
  id: string;
  mapel: string;
  topik: string;
  soal: string;
  pilihan: string[];
  kunci: string;
  pembahasan?: string;
  kelas?: number;
};

export type ParseResult = { items: BankItem[]; problems: string[]; format: string };

export const SUBJECTS = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS', 'Sejarah', 'Pengetahuan Umum'];

function hashId(s: string) {
  // FNV-1a 32 bit, dua putaran supaya tabrakan sangat kecil
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return 'md-' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

const clean = (s: string) => s.replace(/\*\*|__/g, '').replace(/^>\s?/, '').replace(/\\([.)\-*_#])/g, '$1').trim();

function tryJsonArray(text: string): unknown[] | null {
  const t = text.trim();
  if (t.startsWith('[')) {
    try {
      const v = JSON.parse(t);
      if (Array.isArray(v)) return v;
    } catch { /* bukan JSON murni */ }
  }
  const m = text.match(/const\s+DATA\s*=\s*(\[[\s\S]*?\]);?\s*\n/);
  if (m) {
    try { return JSON.parse(m[1]); } catch { /* lanjut */ }
  }
  for (const b of text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)) {
    try {
      const v = JSON.parse(b[1]);
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
    } catch { /* bukan JSON */ }
  }
  return null;
}

function matchSubject(s: string) {
  const l = s.toLowerCase().replace(/^mata (uji|pelajaran)\s*[:\-]?\s*/, '').trim();
  return SUBJECTS.find((x) => l === x.toLowerCase() || l.startsWith(x.toLowerCase() + ' ') || l.startsWith(x.toLowerCase() + ':'));
}

export function parseMarkdown(text: string, defaultSubject = '', defaultTopic = 'Umum'): ParseResult {
  const items: BankItem[] = [];
  const problems: string[] = [];
  let mapel = defaultSubject;
  let topik = defaultTopic;
  let kelas: number | undefined;
  type Cur = { line: number; soal: string[]; pilihan: string[]; kunci?: string; pembahasan: string[]; mapel: string; topik: string; kelas?: number; inExpl: boolean };
  let cur: Cur | null = null;

  const flush = () => {
    if (!cur) return;
    const c = cur;
    cur = null;
    const soal = c.soal.join('\n').trim();
    const where = `baris ${c.line}`;
    if (!soal) return problems.push(`${where}: teks soal kosong`);
    if (c.pilihan.length < 2) return problems.push(`${where}: pilihan jawaban kurang dari 2`);
    if (!c.kunci) return problems.push(`${where}: kunci jawaban tidak ditemukan`);
    if (!c.mapel) return problems.push(`${where}: mapel tidak diketahui (tambahkan judul "## Matematika" atau "Mapel: ...")`);
    items.push({
      id: hashId(`${c.mapel}|${c.topik}|${soal}`),
      mapel: c.mapel,
      topik: c.topik || 'Umum',
      soal,
      pilihan: c.pilihan,
      kunci: c.kunci,
      pembahasan: c.pembahasan.join('\n').trim() || undefined,
      kelas: c.kelas,
    });
  };

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  // Di dalam pembahasan, baris bernomor ("2. bagi kedua ruas") baru dianggap soal baru
  // bila beberapa baris sesudahnya ada pilihan "A." sebelum kunci/pembahasan berikutnya.
  const looksLikeQuestion = (from: number) => {
    for (let j = from + 1; j < Math.min(lines.length, from + 15); j++) {
      const t = clean(lines[j]);
      if (/^(?:[-*+]\s*)?\(?[Aa][.)]\s+/.test(t)) return true;
      if (/^(kunci|jawaban|pembahasan)\b/i.test(t) || /^#{1,6}\s/.test(lines[j])) return false;
      if (/^(?:soal\s*)?\d{1,4}\s*[.):]\s/i.test(t)) return false;
    }
    return false;
  };
  lines.forEach((raw, i) => {
    const line = clean(raw);
    if (!line) {
      return;
    }
    let m: RegExpMatchArray | null;
    if ((m = raw.match(/^\s*#{1,6}\s+(.*)$/))) {
      flush();
      const h = clean(m[1]);
      const s = matchSubject(h);
      if (s) {
        mapel = s;
        topik = defaultTopic;
        const rest = h.slice(s.length).replace(/^\s*[:\-–·|]\s*/, '').trim();
        if (rest && !/^\d+$/.test(rest)) topik = rest;
      } else if (!/^(soal|bank soal|daftar soal|nomor)\b/i.test(h)) {
        topik = h.replace(/^topik\s*[:\-]?\s*/i, '');
      }
      return;
    }
    if ((m = line.match(/^(mapel|mata (?:uji|pelajaran))\s*[:：]\s*(.+)$/i))) {
      const s = matchSubject(m[2]);
      if (cur) cur.mapel = s ?? m[2].trim();
      else mapel = s ?? m[2].trim();
      return;
    }
    if ((m = line.match(/^topik\s*[:：]\s*(.+)$/i))) {
      if (cur) cur.topik = m[1].trim();
      else topik = m[1].trim();
      return;
    }
    if ((m = line.match(/^kelas\s*[:：]\s*(\d)/i))) {
      if (cur) cur.kelas = Number(m[1]);
      else kelas = Number(m[1]);
      return;
    }
    if ((m = line.match(/^(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?)\s*[:：]\s*\(?([A-Ea-e])\b/i))) {
      if (cur) {
        cur.kunci = m[1].toUpperCase();
        cur.inExpl = false;
      }
      return;
    }
    if ((m = line.match(/^pembahasan\s*[:：]\s*(.*)$/i))) {
      if (cur) {
        cur.inExpl = true;
        if (m[1]) cur.pembahasan.push(m[1]);
      }
      return;
    }
    if ((m = line.match(/^(?:[-*+]\s*)?\(?([A-Ea-e])[.)]\s+(.+)$/)) && cur && !cur.inExpl) {
      const idx = m[1].toUpperCase().charCodeAt(0) - 65;
      if (idx === cur.pilihan.length) {
        cur.pilihan.push(m[2].trim());
        return;
      }
    }
    if ((m = line.match(/^(?:soal\s*)?(\d{1,4})\s*[.):]\s*(.*)$/i)) && (!cur?.inExpl || /^soal/i.test(line) || looksLikeQuestion(i))) {
      flush();
      cur = { line: i + 1, soal: m[2] ? [m[2]] : [], pilihan: [], pembahasan: [], mapel, topik, kelas, inExpl: false };
      return;
    }
    if (cur) {
      if (cur.inExpl) cur.pembahasan.push(line);
      else if (cur.pilihan.length === 0) cur.soal.push(line);
      else if (cur.kunci === undefined) cur.pilihan[cur.pilihan.length - 1] += ' ' + line;
      else cur.pembahasan.push(line);
    }
  });
  flush();
  return { items, problems, format: 'Markdown' };
}

/** Baca teks file apa pun yang didukung. */
export function parseBank(text: string, fileName: string, defaultSubject = ''): ParseResult {
  const arr = tryJsonArray(text);
  if (arr) {
    const problems: string[] = [];
    const items = arr.filter((x): x is BankItem => {
      const ok = !!x && typeof x === 'object' && 'soal' in x && 'pilihan' in x;
      if (!ok) problems.push('ada entri tanpa soal/pilihan, dilewati');
      return ok;
    });
    return { items, problems, format: fileName.toLowerCase().endsWith('.md') ? 'Markdown (berisi JSON)' : 'JSON' };
  }
  return parseMarkdown(text, defaultSubject);
}
