# Backend Migration Progress

Dokumen ini jadi tracker utama untuk migrasi `Jurnal Saham` dari frontend + Supabase direct access menuju arsitektur:
- frontend sebagai pure client
- backend NestJS stateless
- PostgreSQL relasional penuh via Prisma

Catatan struktur repo terbaru:
- frontend sekarang berada di `apps/web`
- backend berada di `apps/api`

Tanggal pembaruan terakhir: `2026-06-29`

## Status Singkat

Progress keseluruhan saat ini: `Implementasi aplikasi aktif nyaris selesai; blocker tersisa ada pada validasi dataset legacy aktual`

## Ringkasan Eksekusi

### Sudah Dimigrasi / Direfactor

- Struktur repo baru sudah aktif:
  - frontend di `apps/web`
  - backend di `apps/api`
- Backend NestJS + Prisma + PostgreSQL relasional sudah tersedia dan buildable.
- Auth internal backend sudah aktif:
  - `register`
  - `login`
  - `refresh`
  - `logout`
  - `forgot-password`
  - `reset-password`
  - `verify-email`
  - `resend verify-email`
- Frontend auth sudah dipindahkan dari Supabase ke backend auth baru.
- Runtime Supabase frontend sudah dimatikan dan `supabaseDataService` sudah dihapus dari jalur aktif aplikasi.
- Domain inti sudah memakai backend:
  - `portfolios`
  - `trades`
  - `cashflows`
  - `dividends`
  - `watchlist`
  - `notes`
- Domain `finance` dan `IPO` sudah memakai backend CRUD granular final.
- Domain sharing dan review sudah memakai backend:
  - `shared_access`
  - `trade_reviews`
  - `report_shares`
  - mentor shared journal via `GET /users/:id/shared-journal`
- Admin backend dasar sudah tersedia:
  - list user
  - update role
  - create user admin
  - workspace management dasar
  - audit logs read API
  - toggle registrasi publik
- Halaman analytics sekarang sudah bisa membaca summary backend `GET /api/v1/analytics/summary` saat API aktif.
- Endpoint transisional `sync collection` untuk flow utama sudah ditutup.
- Script migrasi legacy `journal_data`, integrity check, dan lock read-only sudah tersedia.
- Summary analytics sudah mulai dibaca dari backend saat API aktif.
- Build frontend dan backend sama-sama hijau.

### Masih Perlu Direfactor

- `DataContext` masih terlalu besar dan masih memegang terlalu banyak tanggung jawab sekaligus:
  - orchestration API
  - cache lokal
  - optimistic state
  - import/export
  - sebagian logic domain
- Cache lokal user-scoped masih dipakai sebagai layer transisional untuk draft, bootstrap, dan import/export; belum sepenuhnya backend-only.
- Query `dashboard` dan terutama `analytics` masih perlu dipastikan full-relational, bukan turunan snapshot/cache lama.
- Dashboard page utama sekarang sudah membaca summary backend termasuk dataset chart relasional utama, tetapi benchmark IHSG dan fallback degradasi aman masih dirakit client-side.
- Quality gate engineering belum lengkap:
  - integration test backend untuk flow kritikal
  - regression check frontend untuk modul utama
  - smoke test manual end-to-end
- Script/package root dan sebagian dokumentasi arsitektur masih perlu dibersihkan dari asumsi era Supabase/transisional.

### Masih Perlu Migrasi dan Verifikasi

- Jalankan migrasi/validasi pada database target aktual yang benar-benar masih memiliki tabel `journal_data`.
- Dokumentasikan row count sebelum vs sesudah migrasi pada dataset legacy nyata.
- Dokumentasikan hasil integrity check pada dataset legacy nyata.
- Verifikasi data penting legacy tidak hilang:
  - timestamps
  - tags/categories
  - display order portfolio
  - snapshot report share
- Jalankan mode read-only sementara untuk `journal_data` pada database target aktual.
- Setelah validasi final:
  - hapus asumsi `journal_data` dari dokumentasi dan script
  - hapus dependensi akhir aplikasi terhadap `journal_data`
- Verifikasi di browser network tab bahwa tidak ada request tersisa ke Supabase/project lama.
- Loloskan smoke test utama tanpa error kritikal:
  - auth
  - trade CRUD
  - portfolio switch / reorder
  - cashflow / dividend
  - finance transfer internal
  - IPO CRUD
  - report sharing
  - mentor review
  - admin create user / update role

Yang sudah tersedia:
- Backend baru di `apps/api`
- Prisma schema relasional penuh
- Migration SQL awal
- Endpoint awal:
  - `GET /api/v1/me`
  - `GET /api/v1/portfolios`
  - `POST /api/v1/portfolios`
  - `PATCH /api/v1/portfolios/:id`
  - `DELETE /api/v1/portfolios/:id`
  - `PUT /api/v1/portfolios/reorder`
  - `GET /api/v1/trades`
  - `POST /api/v1/trades`
  - `PATCH /api/v1/trades/:id`
  - `DELETE /api/v1/trades/:id`
  - `GET /api/v1/cashflows`
  - `POST /api/v1/cashflows`
  - `PATCH /api/v1/cashflows/:id`
  - `DELETE /api/v1/cashflows/:id`
  - `GET /api/v1/dividends`
  - `POST /api/v1/dividends`
  - `PATCH /api/v1/dividends/:id`
  - `DELETE /api/v1/dividends/:id`
  - `GET /api/v1/watchlist`
  - `POST /api/v1/watchlist`
  - `PATCH /api/v1/watchlist/:id`
  - `DELETE /api/v1/watchlist/:id`
  - `GET /api/v1/notes`
  - `POST /api/v1/notes`
  - `PATCH /api/v1/notes/:id`
  - `DELETE /api/v1/notes/:id`
  - `GET /api/v1/finance-accounts`
  - `POST /api/v1/finance-accounts`
  - `PATCH /api/v1/finance-accounts/:id`
  - `DELETE /api/v1/finance-accounts/:id`
  - `GET /api/v1/finance-transactions`
  - `POST /api/v1/finance-transactions`
  - `PATCH /api/v1/finance-transactions/:id`
  - `DELETE /api/v1/finance-transactions/:id`
  - `POST /api/v1/finance-transactions/transfer`
  - `GET /api/v1/ipo-events`
  - `POST /api/v1/ipo-events`
  - `PATCH /api/v1/ipo-events/:id`
  - `DELETE /api/v1/ipo-events/:id`
  - `GET /api/v1/ipo-accounts`
  - `POST /api/v1/ipo-accounts`
  - `PATCH /api/v1/ipo-accounts/:id`
  - `DELETE /api/v1/ipo-accounts/:id`
  - `GET /api/v1/ipo-entries`
  - `POST /api/v1/ipo-entries`
  - `PATCH /api/v1/ipo-entries/:id`
  - `DELETE /api/v1/ipo-entries/:id`
  - `GET /api/v1/dashboard/summary`
  - `GET /api/v1/analytics/summary`
  - `GET /api/v1/shared-access`
  - `GET /api/v1/shared-access/received`
  - `POST /api/v1/shared-access`
  - `PATCH /api/v1/shared-access/:id`
  - `DELETE /api/v1/shared-access/:id`
  - `GET /api/v1/trade-reviews?tradeId=:tradeId`
  - `POST /api/v1/trade-reviews`
  - `PATCH /api/v1/trade-reviews/:id`
  - `DELETE /api/v1/trade-reviews/:id`
  - `GET /api/v1/report-shares`
  - `POST /api/v1/report-shares`
  - `PATCH /api/v1/report-shares/:id`
  - `DELETE /api/v1/report-shares/:id`
  - `GET /api/v1/report-shares/key/:shareKey`
  - `GET /api/v1/audit-logs`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/verify-email/resend`
- Frontend sudah punya `apiClient`
- `DataContext` sudah membaca domain Phase 1 dan Phase 2 dari backend saat `VITE_API_BASE_URL` aktif
- Dashboard page sekarang sudah membaca summary backend untuk cards utama, insights, achievements, dan recent trades saat API aktif
- Dashboard page sekarang juga sudah membaca dataset backend untuk:
  - calendar heatmap
  - range summary profit/loss
  - profit/loss chart
  - cumulative portfolio return series
- Write-path `portfolios` sudah mulai memakai endpoint backend
- Write-path granular `watchlist`, `notes`, `cashflows`, dan `dividends` sekarang sudah memakai endpoint item-level backend
- Write-path granular `finance` dan `IPO` sekarang sudah memakai endpoint item-level backend untuk flow CRUD utama
- Frontend helper transisional `syncApiJournalKey` sudah dihapus; flow aplikasi aktif tidak lagi memakai auto-sync collection
- Script migrasi awal `journal_data -> portfolios/trades/cashflows/dividends/watchlist/notes/finance/ipo`
- Setup lokal backend PostgreSQL sudah terdokumentasi
- Seed dev minimum sudah tersedia
- Frontend auth runtime sudah bisa berjalan lewat backend saat `VITE_API_BASE_URL` aktif
- Frontend service `shared_access`, `trade_reviews`, `report_shares`, dan `profile directory` sudah bisa memakai backend saat `VITE_API_BASE_URL` aktif
- Seed admin lokal disiapkan untuk `admin@admin.com`
- Login backend `admin@admin.com` sudah terverifikasi sukses pada endpoint `POST /api/v1/auth/login`
- Runtime Supabase frontend sudah dimatikan lewat stub `supabaseClient`; jalur aktif sekarang diarahkan ke API backend atau local cache
- `AuthContext` frontend sudah dibersihkan agar login/register/logout/refresh fokus ke backend auth baru dan tidak lagi memakai session cache Supabase lama
- Halaman mentor shared journal sudah pindah ke endpoint backend `GET /users/:id/shared-journal`
- `supabaseDataService` dan runtime frontend Supabase yang tersisa sudah dihapus dari `src/`
- Toggle registrasi publik admin sudah pindah ke backend endpoint `GET/PATCH /api/v1/app-settings/public-registration`
- `POST /api/v1/auth/register` sekarang menghormati setting registrasi publik backend

Yang belum selesai:
- Menjalankan verifikasi migrasi pada database target aktual yang benar-benar masih punya tabel/data `journal_data`
- Mendokumentasikan hasil row count + integrity check dari dataset legacy nyata
- Menjalankan lock read-only `journal_data` pada database target aktual sebelum sunset final

## Checklist Progress

### Phase 0 - Fondasi Backend dan Database

- [x] Buat `apps/api` dengan NestJS + TypeScript
- [x] Tambah Prisma dan PostgreSQL datasource
- [x] Definisikan schema relasional penuh
- [x] Tambah migration SQL awal
- [x] Tambah build script backend di root project
- [x] Tambah env contoh untuk frontend dan backend
- [x] Tambah seed user/profile/workspace awal
- [x] Tambah docker/dev setup PostgreSQL lokal
- [x] Tambah dokumentasi cara menjalankan backend lokal

### Phase 1 - Domain Inti Relasional

- [x] Implement `GET /me`
- [x] Implement `trades` CRUD
- [x] Implement `GET /portfolios`
- [x] Implement `GET /dashboard/summary`
- [x] Sempat tambah sync transisional `trades` dan `portfolios` untuk fase perpindahan
- [x] Frontend sudah melewati fase dual-write dan sekarang memakai endpoint final
- [x] Tambah migrator awal dari `journal_data`
- [x] Tambah CRUD relasional `portfolios`
- [x] Tambah endpoint `cashflows`
- [x] Tambah endpoint `dividends`
- [x] Tambah endpoint `watchlist`
- [x] Tambah endpoint `notes`
- [x] Ubah frontend agar read domain inti dari backend saat API aktif
- [x] Tambah migrator `cashflows/dividends/watchlist/notes`
- [x] Rapikan normalisasi ID legacy non-UUID untuk jalur sync dan migrasi

### Phase 2 - Finance dan IPO

- [x] Implement `finance_accounts`
- [x] Implement `finance_transactions`
- [x] Bungkus transfer internal dalam DB transaction
- [x] Implement `ipo_events`
- [x] Implement `ipo_accounts`
- [x] Implement `ipo_entries`
- [x] Tambah migrator `finance` dari `journal_data`
- [x] Tambah migrator `ipo` dari `journal_data`
- [x] Hubungkan frontend finance ke backend
- [x] Hubungkan frontend IPO ke backend

### Phase 3 - Sharing, Review, Admin

- [x] Implement `shared_access`
- [x] Implement `trade_reviews`
- [x] Implement `report_shares`
- [x] Implement `workspaces`
- [x] Implement `workspace_members`
- [x] Implement `audit_logs` read API
- [x] Ganti edge function admin lama dengan backend controller
- [x] Tambah authorization owner/workspace/share-access di backend

### Phase 4 - Auth Internal Stateless

- [x] Implement register
- [x] Implement login
- [x] Implement refresh token rotation
- [x] Implement logout
- [x] Implement forgot password
- [x] Implement reset password
- [x] Implement email verification
- [x] Ganti auth flow frontend dari Supabase ke backend
- [x] Hapus dependency runtime frontend ke `supabase.auth` saat `VITE_API_BASE_URL` aktif
- [x] Rapikan `AuthContext` agar session frontend memakai cache backend baru, bukan `supabase_session_cache`

### Phase 5 - Sunset `journal_data`

- [x] Tambah migrator untuk semua `data_key` aktif yang dipakai runtime aplikasi saat ini
- [ ] Verifikasi row count dan relasi hasil migrasi
- Status sekarang:
  - [x] script verifikasi row count + integrity check tersedia (`npm --prefix apps/api run verify:journal-data`)
- [ ] hasil verifikasi pada database target aktual belum didokumentasikan
  - [x] script sudah lolos di environment dev, tetapi status `skipped` karena tabel `journal_data` tidak ada di database saat ini
- [ ] Ubah `journal_data` jadi read-only sementara pada database target aktual
- Status sekarang:
  - [x] script lock read-only tersedia (`npm --prefix apps/api run lock:journal-data`)
- [ ] belum dijalankan pada database target yang berisi `journal_data`
  - [x] script sudah lolos di environment dev, tetapi status `skipped` karena tabel `journal_data` tidak ada di database saat ini
- [x] Hapus read/write aplikasi aktif yang masih bergantung pada `journal_data`
- [x] Final cleanup service frontend lama berbasis Supabase direct access
- [x] Pindahkan service frontend `shared_access`, `trade_reviews`, dan `report_shares` ke backend saat API aktif
- [x] Tambah directory endpoint backend untuk lookup profil/user di frontend sharing
- [x] Tambah seed akun admin lokal
- [x] Tambah endpoint backend untuk admin create user, list users, update role, dan update profile
- [x] Matikan runtime Supabase client di frontend
- [x] Migrasikan mentor shared journal dari service Supabase ke backend API
- [x] Hapus `supabaseDataService` dari frontend runtime

## Next Tasks

Urutan kerja yang direkomendasikan dari titik sekarang:

1. Hapus fallback `journal_data` di `DataContext` dan `supabaseDataService`
2. Migrasikan `sharedJournalService` dan halaman mentor yang masih membaca `journal_data`
3. Tambah verifikasi migrasi row count + integrity check per `data_key`
4. Rapikan quality gate akhir untuk modul yang baru dimigrasikan

## Checklist Menuju 100%

Bagian ini adalah daftar konkret yang harus selesai supaya migrasi bisa dianggap `100% complete`.

### A. Backend API harus full-relational

- [x] Auth internal stateless aktif penuh
- [x] Endpoint domain inti tersedia
- [x] Endpoint finance dan IPO tersedia
- [x] Endpoint sharing, review, audit, dan admin dasar tersedia
- [x] Tambah CRUD granular untuk modul yang sebelumnya masih `list + sync collection`
- Status sekarang:
  - [x] `watchlist`
  - [x] `notes`
  - [x] `cashflows`
  - [x] `dividends`
  - [x] `finance_accounts`
  - [x] `finance_transactions`
  - [x] `ipo_events`
  - [x] `ipo_accounts`
  - [x] `ipo_entries`
- [x] Hapus endpoint transisional `sync` setelah frontend tidak lagi bergantung padanya
- [ ] Pastikan semua query dashboard/analytics membaca tabel relasional, bukan snapshot JSON
- Status sekarang:
  - [x] analytics summary utama sudah punya endpoint backend `GET /analytics/summary`
  - [x] dashboard summary utama sudah mulai dibaca dari backend `GET /dashboard/summary`
  - [x] dashboard chart/range/calendar utama sudah punya payload relasional dari backend
  - [ ] benchmark IHSG masih digabung di frontend karena source market data eksternal belum dipindahkan ke backend
  - [ ] fallback lokal analytics masih dipertahankan untuk degradasi aman
- [x] Lengkapi endpoint admin pengganti edge function lama untuk flow registrasi publik

### B. Frontend harus 100% pakai backend baru

- [x] Login/register/logout/refresh pindah ke backend
- [x] Domain inti pindah ke backend saat `VITE_API_BASE_URL` aktif
- [x] Finance dan IPO pindah ke backend saat `VITE_API_BASE_URL` aktif
- [x] Sharing, report share, trade review, dan mentor shared journal pindah ke backend
- [x] Runtime Supabase di `src/` dihapus
- [ ] Hilangkan fallback local/transisional yang sudah tidak dibutuhkan jika target akhir memang backend-only
- Status sekarang:
  - [x] auto `sync collection` dari runtime utama sudah hilang
  - [ ] cache lokal user-scoped masih dipakai sebagai cache/import/export layer transisional
- [ ] Pastikan semua halaman CRUD memakai contract API final, bukan pola `sync collection`
- Status sekarang:
  - [x] `watchlist`
  - [x] `notes`
  - [x] `cashflows`
  - [x] `dividends`
  - [x] `finance`
  - [x] `ipo`
- [ ] Verifikasi tidak ada lagi request frontend ke Supabase/project lama di browser network tab

### C. Migrasi data `journal_data` harus tuntas

- [x] Migrator awal tersedia
- [x] Tambah cakupan migrator untuk semua `data_key` legacy yang masih relevan bagi runtime aktif
- [ ] Jalankan migrasi pada database target aktual
- [ ] Buat laporan row count sebelum vs sesudah migrasi
- [x] Buat script integrity check FK:
  - trade -> portfolio
  - cashflow -> portfolio
  - dividend -> portfolio
  - finance_transaction -> finance_account
  - ipo_entry -> ipo_event / ipo_account
  - trade_review -> trade / mentor / owner
- [ ] Verifikasi data penting tidak hilang:
  - timestamps legacy
  - tags/categories
  - display order portfolio
  - snapshot report share
- [ ] Dokumentasikan hasil migrasi per user/sample dataset

### D. `journal_data` harus benar-benar disunset

- [ ] Jadikan `journal_data` read-only sementara selama masa validasi pada database target aktual
- [x] Pastikan aplikasi tidak lagi read dari `journal_data`
- [x] Pastikan aplikasi tidak lagi write ke `journal_data`
- [ ] Hapus script dan label dokumentasi yang masih mengasumsikan `journal_data` sebagai source aktif setelah validasi legacy selesai
- [ ] Setelah validasi final, hapus dependensi aplikasi terhadap tabel `journal_data`

### E. Quality gate sebelum dianggap selesai

- [ ] Smoke test manual untuk:
  - auth flow
  - trade CRUD
  - portfolio switch / reorder
  - cashflow / dividend
  - finance transfer internal
  - IPO event/account/entry
  - report sharing
  - mentor review
  - admin create user / update role
- [ ] Integration test backend untuk flow kritikal
- [ ] Regression check frontend untuk modul utama
- [ ] Seed admin + setup lokal terdokumentasi dan terbukti jalan
- [x] Build frontend dan backend sama-sama hijau
- [ ] Tidak ada error 500 di boot normal dan login normal

### F. Optional tapi penting untuk benar-benar bersih

- [x] Putuskan bahwa `workspaces` tetap dipakai di v1 aktif
- [x] Aktifkan endpoint dan halaman admin workspace dasar
- [ ] Bersihkan script/package root yang hanya relevan untuk Supabase bila memang sudah tidak dipakai lagi
- [ ] Perbarui dokumentasi arsitektur final agar tim tidak lagi mengikuti alur lama

## Definisi 100%

Migrasi dianggap `100%` hanya jika semua poin berikut benar:

1. Frontend production path tidak memakai Supabase sama sekali.
2. Semua data bisnis aktif dibaca dan ditulis lewat backend NestJS + PostgreSQL relasional.
3. `journal_data` bukan lagi source aktif aplikasi.
4. Migrasi data legacy sudah diverifikasi dengan row count dan integrity check.
5. Flow utama user lolos smoke test tanpa error kritikal.

## Definition of Done per Modul

Sebuah modul dianggap selesai migrasinya kalau semua ini sudah terpenuhi:
- ada tabel relasional final di PostgreSQL
- ada endpoint backend untuk read/write modul tersebut
- frontend tidak lagi query Supabase langsung untuk modul itu
- ada migrator dari `journal_data` bila modul itu sebelumnya disimpan di JSON
- build frontend dan backend sama-sama lolos

## Perintah yang Sudah Berguna

Backend:

```bash
cd apps/api
npm install
npm run prisma:generate
npm run build
npm run seed:dev
npm run migrate:journal-data
```

Frontend/root:

```bash
npm run build
npm run api:dev
```

## Catatan Teknis

- Backend saat ini masih memakai guard transisional berbasis header `x-user-id`.
- Guard sekarang juga menerima `Authorization: Bearer <accessToken>` untuk jalur auth backend baru, sementara `x-user-id` dipertahankan sebagai fallback transisional.
- `VITE_API_BASE_URL` harus diisi agar frontend mulai sinkron ke backend.
- `journal_data` sekarang hanya diposisikan sebagai sumber migrasi legacy, bukan source aktif runtime aplikasi.
- `portfolios` sekarang sudah punya CRUD relasional dan urutan card persisten lewat `display_order`.
- ID legacy lama yang belum UUID sekarang dinormalisasi pada jalur migrasi/import agar tetap kompatibel dengan schema PostgreSQL relasional penuh.
- Frontend `apiClient` sekarang memprioritaskan `Authorization: Bearer <accessToken>` dan hanya fallback ke `x-user-id` saat token backend belum ada.
- Setup lokal backend dirangkum di [backend-local-setup.md](/E:/FullStuck-web-developer/jurnal-saham-Copy/docs/backend-local-setup.md).
- Fase transisional `list + sync collection` untuk modul finance dan IPO sudah ditutup; backend aktif sekarang expose contract CRUD granular.
- Referensi endpoint aktif dirangkum di [backend-api-reference.md](/E:/FullStuck-web-developer/jurnal-saham-Copy/docs/backend-api-reference.md).
- Phase 3 sekarang sudah mencakup modul `workspaces` dan `workspace_members` untuk list/create/invite/remove member dasar di admin.
- Authorization baru yang sudah aktif untuk Phase 3 berfokus ke `owner + shared_access`, khususnya level `read`, `review`, dan `admin`.
- Auth frontend saat ini memprioritaskan backend auth bila `VITE_API_BASE_URL` aktif, dan `AuthContext` sudah tidak lagi bergantung pada runtime `supabase.auth`.
- Report share backend sekarang menyimpan `snapshot` JSON agar frontend public-share tidak lagi bergantung ke format tabel lama Supabase.
- Seed lokal sekarang menyiapkan akun admin default `admin@admin.com` dengan password `admin123`.
- Sisa Phase 5 yang masih aktif sekarang terutama ada di validasi migrasi `journal_data` pada database target nyata, keputusan akhir soal cache/fallback lokal, dan quality gate akhir.
- Pengaturan registrasi publik sekarang disimpan di backend `app_settings`, bukan `localStorage` browser admin.
