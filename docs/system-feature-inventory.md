# System Feature Inventory

## Ringkasan
Dokumen ini merangkum seluruh fitur utama yang saat ini tersedia di dalam sistem `Jurnal Saham`, berdasarkan modul yang sudah terhubung di aplikasi.

## 1. Authentication & Access

### Autentikasi
- Login dengan email dan password
- Registrasi akun baru
- Verifikasi email via OTP
- Resend OTP verifikasi email
- Lupa password
- Reset password via email recovery
- Auto session handling untuk user login

### Kontrol akses
- Protected route untuk halaman internal
- Public route untuk login, register, verifikasi, dan reset password
- Permission-based access control (menggunakan context izin akses granular)
- Role-based restriction untuk seluruh halaman dan aksi di sistem
- Access denied state untuk user yang tidak memiliki otorisasi fitur tertentu
- **Matriks Peran (Role definitions)**:
  - **Admin**: Akses penuh manajemen pengguna, pengelolaan workspace, dan audit logs aktivitas sistem.
  - **Mentor**: Hak akses membaca jurnal yang dibagikan oleh Trader serta memberikan penilaian dan komentar (modul mentor saat ini dinonaktifkan).
  - **Trader**: Akses penuh ke pencatatan transaksi pribadi, analisis portfolio, dividen, rencana trading, watchlist, kalkulator, dan pembuatan shared report.
  - **Viewer**: Hak akses *read-only* ke dashboard, portofolio, analitik, dan laporan publik yang dibagikan.

## 2. Dashboard

### Dashboard utama
- Ringkasan performa trading & metrik portofolio aktif (ID / US market tab switcher)
- Statistik profit/loss realized, win rate, dan rata-rata PnL per periode
- Overview portofolio lengkap (Equity, Modal Aktif, Floating PnL, Total Invested, dan RDN Balance)
- Grafik visual interaktif: Equity curve (performa portofolio vs IHSG) dan histogram PnL Harian
- Insight aktivitas otomatis (Best Strategy, Emotional/Risk Guardrails, Worst Trading Day)
- Recent data / daftar aktivitas transaksi terbaru yang diurutkan dinamis
- **Integrasi Pasar**:
  - Penarikan data real-time indeks IHSG (`^JKSE`) via Yahoo Finance API (grafik tren historis 30 hari & return periodik)
  - Kalender performa bulanan dengan heat-map warna hijau/merah berdasarkan agregat PnL harian

## 3. Trading Journal

### Manajemen transaksi
- Tambah transaksi baru
- Edit transaksi
- Hapus transaksi
- Detail transaksi per entry
- Dukungan pasar ID dan US
- Dukungan tipe aset trading yang tersedia di sistem

### Analisis transaksi
- Preview kalkulasi saat input transaksi
- Analisis hasil trade
- Catatan trading per transaksi
- Strategi trading
- Tracking emosi saat trading

### Daftar transaksi
- List seluruh transaksi
- Filter dan pencarian data transaksi
- Export CSV transaksi

### BSJP Recap
- Rekapitulasi BSJP
- Tabel ringkasan BSJP

## 4. Analytics

### Analitik performa
- Win rate summary
- Analisis per strategi
- Profit/loss per hari
- Analisis emosi
- Analisis custom tags
- Top saham
- Profit/loss bulanan

## 5. Portfolio & History

### Portfolio
- Halaman portfolio utama
- Posisi terbuka
- Alokasi portfolio
- Total asset overview

### Multi-portfolio
- Buat portfolio baru
- Edit portfolio
- Hapus portfolio
- Reorder portfolio
- Pilih portfolio aktif

### History
- Timeline portfolio
- Trade summary historis
- Realized kumulatif
- Total equity historis
- Ringkasan bulanan
- Riwayat realized trades

## 6. Cashflow & Dividend

### Cashflow
- Pencatatan cash balance / RDN
- Riwayat transaksi kas
- Tambah / edit / hapus cashflow

### Dividend Tracker
- Catat penerimaan dividen
- Riwayat penerimaan dividen
- Ringkasan dividend tracker

## 7. Finance Tracker

### Rekening & dompet
- Finance tracker terpisah dari cashflow trading
- Buat rekening bank
- Buat akun e-wallet / dompet
- Aktivasi / nonaktifkan rekening
- Hapus rekening
- Reorder card rekening

### Ledger transaksi
- Ledger per rekening
- Ringkasan rekening
- Saldo berjalan derived
- Tambah income
- Tambah expense
- Adjustment
- Transfer internal antar rekening
- Transfer bank ke dompet
- Transfer dompet ke bank

### Relasi rekening-dompet
- Satu bank bisa terhubung ke beberapa dompet
- Satu dompet hanya terhubung ke satu bank
- Ringkasan saldo bank + dompet terhubung

### Ringkasan personal finance
- Total saldo seluruh rekening
- Total kas pribadi
- Integrasi pilihan rekening ke total asset profil

## 8. IPO Module

### IPO Journey
- Buat event IPO
- Edit event IPO
- Hapus event IPO
- Duplicate event IPO
- List seluruh IPO journey

### IPO Detail
- Detail per event IPO
- Input akun partisipan IPO
- Edit entry akun
- Hapus entry akun
- Harga beli otomatis mengikuti harga penawaran
- Ringkasan total modal dan profit/loss
- Copy tabel akun IPO

### IPO Summary
- Ringkasan performa seluruh IPO
- Statistik agregat IPO
- Analisis profitabilitas per emiten
- Tabel rincian performa saham IPO
- Tabel estimasi modal total per akun
- Sorting tabel modal per akun
- Filter status IPO
- Simulasi allotment 25% / 50% / 75% / 100%
- Grand total kebutuhan modal simulasi
- Highlight akun dengan modal terbesar
- Export CSV ringkasan IPO

### Manajemen akun IPO
- Registry akun IPO berbasis nama akun
- Reuse akun IPO yang pernah dipakai
- Normalisasi akun untuk menjaga grouping ringkasan tetap rapi

## 9. Watchlist, Notes, Plans

### Watchlist
- Tambah watchlist
- Edit watchlist
- Hapus watchlist

### Notes
- Catatan trading
- Buat catatan
- Edit catatan
- Hapus catatan

### Trading Plans
- Buat rencana trading
- Kelola daftar rencana trading

## 10. Calculator

### Kalkulator trading & keuangan
- Kalkulator PnL
- Kalkulator fee
- ARA / ARB calculator
- Average price calculator
- Average down calculator
- Risk-reward calculator
- Position sizing calculator
- Target price calculator
- Compound calculator
- Pension calculator

## 11. Profile

### Profil pengguna
- Informasi akun
- Edit profil
- Update display name / username
- Hak akses & kapabilitas user

### Asset integration
- Total asset profil
- Include rekening finance tertentu ke total asset

## 12. Reports

### Report sharing
- Buat report read-only
- Bagikan link report
- Daftar link report
- Shared report page publik

## 13. Settings

### Pengaturan aplikasi
- Pengaturan fee default
- Initial capital
- Monthly target
- USD to IDR rate
- Risk default
- Tema / theme preference
- Privacy mode
- Behavior rules / trading guardrails
- Registrasi publik enable/disable yang disimpan di backend dan dipatuhi oleh flow register

### Data management
- Export data
- Import data
- Clear data

## 14. Workspace & Collaboration

### Workspace
- Workspace provider
- Multi-workspace support
- Workspace management
- Buat workspace
- Invite member ke workspace
- Kelola member workspace

## 15. Admin

### User management
- Daftar user
- Management user

### Workspace management
- Daftar workspace
- Buat workspace
- Invite member
- Lihat member workspace

### Audit logs
- Audit log page
- Aktivitas sistem tercatat untuk aksi penting

## 16. Shared System Utilities

### UI & UX pendukung
- Layout global
- Dialog / confirm system
- Toast / feedback system
- Loading state
- Error state
- Database setup notice
- Privacy blur style

### Data layer
- **Backend-First Persistence**: Backend NestJS + PostgreSQL menjadi source of truth utama untuk runtime aplikasi aktif
- User-scoped persistence (pemisahan cache lokal per akun user untuk draft, import/export, dan bootstrap data)
- Kontrol akses berbasis user, role, dan workspace di backend
- Import/export data dalam format terstruktur (JSON/CSV)
- Auto cache local data untuk mempercepat waktu muat aplikasi

## 17. Fitur yang Terlihat Dinonaktifkan
- **Mentor Module**: Terintegrasi di codebase (`src/modules/mentor`) tetapi dinonaktifkan dari routing utama dan sidebar.
- **Screener Module**: Dinonaktifkan secara penuh dari menu navigasi dan routing utama.
- **Per Komoditas (Category Module)**: Terintegrasi di codebase (`src/modules/category`) untuk penarikan batch quotes emiten sektoral komoditas secara real-time via Yahoo Finance, tetapi dinonaktifkan dari routing utama dan menu sidebar.

## Catatan
- Dokumen ini berisi inventaris fitur yang sudah ada di sistem saat ini, bukan backlog fitur masa depan.
- Beberapa fitur memiliki integrasi lintas modul, misalnya profile dengan finance tracker, atau IPO summary dengan registry akun IPO.
