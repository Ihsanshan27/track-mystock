# Jurnal Saham

Aplikasi jurnal trading saham berbasis React, Vite, dan Supabase.

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

3. Isi kredensial Supabase:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

4. Buka Supabase SQL Editor, lalu jalankan isi file `supabase/schema.sql`.

   Untuk menjalankan semua migration, termasuk fondasi multi-role, pakai Supabase CLI:

```bash
npm run db:link
npm run db:push
```

5. Jalankan aplikasi:

```bash
npm run dev
```

Lalu buka `http://127.0.0.1:5174`.

Jika `.env` Supabase belum diisi, aplikasi tetap berjalan memakai localStorage sebagai fallback.
Untuk project Supabase lama yang masih memakai anon key, aplikasi juga masih membaca `VITE_SUPABASE_ANON_KEY`.

## Supabase

Integrasi menggunakan:

- Supabase Auth untuk register, login, logout, dan profil.
- Tabel `public.journal_data` untuk menyimpan data jurnal per user dalam format JSON.
- Row Level Security dengan `auth.uid()` agar user hanya dapat mengakses datanya sendiri.

Di Supabase Dashboard, pastikan email/password provider aktif di Authentication settings. Jika email confirmation aktif, user perlu konfirmasi email sebelum login.

Operasional Supabase seperti membuat admin pertama dan troubleshooting rate limit ada di `docs/supabase-operations.md`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```
