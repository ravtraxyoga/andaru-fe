# Andaru Web

Dasbor orang tua (versi web dari aplikasi Bunda) dan admin bank soal. React 19, Vite, TypeScript, TanStack Query.
Anak tidak mengerjakan soal di web (pengerjaan hanya di aplikasi karena butuh Mode Fokus).

- Ringkasan per anak (satu ortu bisa punya banyak anak), level dan syarat promosi, skor 6 sesi terakhir, topik lemah
- Kelola anak: tambah, kode pairing, batas sesi per hari (1/2) dan jeda minimal antar sesi
- Jadwal rutin dan sesi sekarang; pesan bila melanggar batas/jeda dengan tombol ubah batas atau kurangi slot
- Laporan sesi, catatan keamanan (keluar Mode Fokus), pembahasan
- Pengaturan: ganti PIN, buka kunci darurat
- Daru: profil anak usia dini, waktu main per hari, progres per dunia, hapus data
- Admin: bank soal (cari, ubah, retire, gambar; soal langsung terbit tanpa draf), impor Markdown (.md)/JSON/HTML/CSV dengan pratinjau sebelum masuk (`src/importParse.ts`)

```bash
pnpm install
pnpm dev        # :9126, /v1 diproksikan ke API :9125
pnpm build && pm2 restart andaru-web   # vite preview :9126
```

Backend: repo `andaru-be`.
