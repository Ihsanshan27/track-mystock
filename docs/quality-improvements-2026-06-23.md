# Quality Improvements - 2026-06-23

Dokumen ini merangkum pekerjaan peningkatan kualitas sistem yang telah diselesaikan pada sesi ini.

## Yang dikerjakan

### 1. Mengaktifkan lint untuk TypeScript / TSX
- Menambahkan dependency `typescript-eslint` ke project.
- Memperbarui konfigurasi ESLint di `eslint.config.js` agar file `*.ts` dan `*.tsx` ikut diperiksa.
- Menjaga transisi tetap realistis dengan tetap mengizinkan `any` untuk sementara, supaya quality gate bisa mulai aktif tanpa memblokir seluruh codebase.
- Mengecualikan `supabase/functions/**/*.ts` dari lint app utama agar fokus quality gate ada di frontend application code.

### 2. Membersihkan temuan lint yang sebelumnya tersembunyi
- Menghapus import, state, dan variabel yang tidak terpakai di beberapa file.
- Merapikan beberapa `let` yang seharusnya `const`.
- Membersihkan blok `catch` yang menyimpan variabel error tetapi tidak digunakan.

File yang ikut dirapikan:
- `src/modules/calculator/pages/CalculatorPage.tsx`
- `src/modules/dashboard/pages/DashboardPage.tsx`
- `src/modules/ipo/pages/IpoListPage.tsx`
- `src/modules/plans/pages/TradingPlansPage.tsx`
- `src/modules/shared/components/Header.tsx`
- `src/modules/trades/components/ImportCSVModal.tsx`
- `src/modules/trades/pages/BsjpRecapPage.tsx`
- `src/modules/trades/pages/TradesPage.tsx`

### 3. Memperbaiki persistence Supabase
- Menambahkan `ipoAccounts` ke daftar `DATA_KEYS` di `src/modules/shared/services/supabaseDataService.ts`.
- Ini penting agar data akun IPO ikut termuat, tersimpan, dan terhapus konsisten bersama data domain lain.
- Mengganti pola simpan dari `select -> update/insert` menjadi `upsert` dengan `onConflict: 'user_id,data_key'`.

Manfaat perubahan ini:
- Mengurangi round-trip query ke database.
- Mengurangi risiko race condition saat penyimpanan.
- Menyederhanakan logika persistence.

### 4. Menambahkan lazy loading per route
- Mengubah import halaman di `src/App.tsx` menjadi `React.lazy(...)`.
- Menambahkan wrapper `Suspense` untuk fallback loading per halaman.
- Sekarang halaman besar tidak lagi dimuat semuanya pada initial load.

Halaman yang sekarang di-lazy-load mencakup:
- Auth pages
- Dashboard
- Trades
- Analytics
- History
- Portfolio
- Finance
- IPO
- Settings
- Reports
- Admin pages

## Hasil verifikasi

Perintah yang sudah dijalankan dan berhasil:

```bash
npm run lint
npm run build
```

## Dampak yang terlihat

- Quality gate sekarang benar-benar mencakup code TypeScript dan TSX.
- Risiko bug persistence untuk `ipoAccounts` turun.
- Initial bundle utama turun signifikan karena route-level code splitting aktif.
- Build sekarang memecah banyak page chunk terpisah, sehingga beban load awal aplikasi lebih ringan.

## Catatan lanjutan

Masih ada peluang optimasi berikutnya:
- Chunk `icons` masih besar karena `lucide-react` masih banyak dipakai secara luas.
- Chunk `charts` masih besar karena `recharts` tetap menjadi dependency berat.
- Langkah lanjutan yang bagus: pecah `DashboardPage` dan `DataContext` menjadi hook/service yang lebih kecil.

## Update Tambahan - Prioritas 1 Fondasi

Pekerjaan tambahan yang diselesaikan setelah backlog dibuat:

### 5. Memecah helper dari file besar
- Memindahkan helper tanggal/range dashboard ke `src/modules/dashboard/utils/dashboardDate.ts`
- Memindahkan helper status IPO ke `src/modules/ipo/utils/ipoStatus.ts`
- Memindahkan helper normalisasi akun IPO ke `src/modules/shared/context/dataContextIpoUtils.ts`
- Memindahkan helper local storage/context data ke `src/modules/shared/context/dataContextStorageUtils.ts`

### 6. Menambah automated testing dasar
- Menambahkan `Vitest` sebagai test runner
- Menambahkan script:
  - `npm run test`
  - `npm run test:watch`
- Menambahkan test awal untuk:
  - `src/modules/trades/calculations.test.ts`
  - `src/modules/ipo/utils/ipoStatus.test.ts`
  - `src/modules/shared/context/dataContextIpoUtils.test.ts`

### 7. Hasil verifikasi tambahan

Perintah yang berhasil dijalankan:

```bash
npm run lint
npm run test
npm run build
```

### 8. Dampak fase ini
- Fondasi testing sekarang sudah ada dan bisa dipakai untuk ekspansi coverage berikutnya.
- Sebagian logic besar yang tadinya menempel di page/context sudah mulai dipindahkan ke util terpisah.
- Bug status IPO sekarang juga terlindungi oleh test, jadi risiko regresinya turun.

## Update Tambahan - Lanjutan Refactor

### 9. Dashboard mulai dipisah dari logic benchmark
- Menambahkan hook `src/modules/dashboard/hooks/useIhsgOverview.ts`
- Menambahkan komponen `src/modules/dashboard/components/PerformanceTooltip.tsx`
- `DashboardPage.tsx` sekarang tidak lagi memegang seluruh logic fetch dan derivasi IHSG secara inline

### 10. Helper domain makin dipindahkan dari page/context
- Status IPO sudah memakai helper terpusat `src/modules/ipo/utils/ipoStatus.ts`
- Normalisasi akun IPO sudah memakai helper terpisah `src/modules/shared/context/dataContextIpoUtils.ts`
- Local cache/helper context sekarang memakai `src/modules/shared/context/dataContextStorageUtils.ts`

### 11. Catatan implementasi
- Refactor domain IPO penuh di `DataContext` belum saya paksakan sekaligus karena blok file lama cukup sensitif dan berisiko bikin regresi besar.
- Jalur yang diambil sengaja bertahap: pecah helper stabil dulu, pasang test, lalu lanjut pecah domain yang lebih besar di iterasi berikutnya.

## Update Tambahan - Prioritas 1 Selesai

### 12. Domain IPO sudah keluar dari `DataContext`
- `DataContext` sekarang memakai `src/modules/shared/context/dataContextIpoDomain.ts`
- CRUD `IPO event` dan `IPO entry` tidak lagi menumpuk inline di `DataContext`
- Ini mengurangi coupling dan bikin logic IPO lebih mudah dites

### 13. `DashboardPage` dipisah lebih jauh
- Menambahkan komponen:
  - `DashboardAchievementsSection.tsx`
  - `DashboardPerformanceSection.tsx`
  - `DashboardCalendarSection.tsx`
  - `DashboardProfitLossSection.tsx`
  - `DashboardIhsgOverviewCard.tsx`
- `DashboardPage.tsx` turun signifikan karena chart/calendar/profit-loss/IHSG card tidak lagi ditulis inline semua

### 14. Typing fondasi diperketat
- Menambahkan type dashboard terpusat di `src/modules/dashboard/types/dashboard.ts`
- `useIhsgOverview.ts` sekarang memakai type candle/quote yang lebih jelas
- `DashboardRecentTradesTable.tsx` sekarang memakai generic sort config tanpa cast `any`
- Beberapa state domain penting di `DataContext` sekarang memakai type `Portfolio`, `AppSettings`, `IpoEvent`, `IpoEntry`, `IpoAccount`, `FinanceAccount`, dan `FinanceTransaction`

### 15. Coverage test ditambah lagi
- Menambahkan:
  - `src/modules/shared/context/dataContextIpoDomain.test.ts`
  - `src/modules/finance/utils/finance.test.ts`

### 16. Hasil verifikasi final

Perintah yang berhasil dijalankan:

```bash
npm run lint
npm run test
npm run build
```

### 17. Dampak akhir Prioritas 1
- Fondasi refactor sekarang jauh lebih aman dibanding kondisi awal
- Logic domain kritis yang paling rawan regresi sudah punya safety net test
- `DashboardPage` dan `DataContext` tidak lagi jadi bottleneck sebesar sebelumnya
- Backlog `Prioritas 1` sekarang bisa dianggap selesai, dan fokus bisa pindah ke performa + pengayaan modul IPO
