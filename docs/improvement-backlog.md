# Improvement Backlog

Dokumen ini merangkum backlog peningkatan sistem `Jurnal Saham` setelah penyelesaian `Prioritas 2`.

## Status Legend

| Label | Arti |
|---|---|
| `[Done]` | sudah dikerjakan |
| `[In Progress]` | sudah mulai dikerjakan tapi belum tuntas |
| `[Next]` | kandidat langkah berikutnya yang paling masuk akal |
| `[Todo]` | belum mulai |

## Executive Snapshot

| Ringkasan | Nilai |
|---|---|
| Prioritas yang sudah tuntas | `Prioritas 1 - Fondasi`, `Prioritas 2 - Performa`, `Prioritas 3 - UX / UI`, `Prioritas 4 - Data & Keamanan`, `Prioritas 5 - IPO Module`, `Prioritas 6 - Trading & Portfolio` |
| Fokus berikutnya | `Prioritas 7 - Reporting & Insight` |
| Quick win terbaik | laporan performa periodik |
| Risiko teknis terbesar yang tersisa | audit persistence key lanjutan |
| Risiko produk terbesar yang tersisa | insight lintas modul |

## Progress Radar

| Area | Status | Visual | Catatan Singkat |
|---|---|---|---|
| Prioritas 1 - Fondasi | `[Done]` | `██████████` | Refactor inti, typing penting, dan test dasar sudah selesai |
| Prioritas 2 - Performa | `[Done]` | `██████████` | Optimasi bundle ikon, lazy loading tab analitik & dashboard charts selesai |
| Prioritas 3 - UX / UI | `[Done]` | `██████████` | Visual consistency, validasi form inline, badge status & countdown IPO selesai |
| Prioritas 4 - Data & Keamanan | `[Done]` | `██████████` | Validator skema data, migrasi ke 2.2, dan audit log lengkap selesai |
| Prioritas 5 - IPO Module | `[Done]` | `██████████` | Field tambahan, chronological timeline, filter bar, dan stats underwriter selesai |
| Prioritas 6 - Trading & Portfolio | `[Done]` | `██████████` | Selesai (rekonsiliasi posisi, audit logs detail, bulk actions) |
| Prioritas 7 - Reporting & Insight | `[Todo]` | `█░░░░░░░░░` | Masih kandidat setelah fitur inti |
| Prioritas 8 - Dokumentasi | `[Done]` | `██████████` | Selesai (dokumentasi teknis lengkap dan changelog internal) |

## Current Board

| Done | In Progress | Next | Todo |
|---|---|---|---|
| lint TypeScript / TSX aktif | audit persistence key lanjutan | | laporan performa periodik |
| test runner `Vitest` aktif | visual consistency IPO | | insight lintas modul |
| test trade calculations | | | |
| test util IPO status | | | |
| test util finance | | | |
| helper dashboard date/range dipisah | | | |
| hook IHSG dipisah | | | |
| section besar `DashboardPage` dipisah | | | |
| domain `IPO` dipisah dari `DataContext` | | | |
| persistence `ipoAccounts` dibetulkan | | | |
| field `Underwriter (UW)` ditambahkan | | | |
| bug status `Upcoming` IPO dibetulkan | | | |
| optimasi bundle ikon (named imports) | | | |
| lazy load chart-heavy page (Analytics) | | | |
| lazy load dashboard charts | | | |
| search/filter list IPO | | | |
| statistik per underwriter | | | |
| validasi import/export data | | | |
| validasi form yang lebih tegas | | | |
| rekonsiliasi posisi & over-sell | | | |
| histori perubahan transaksi (audit logs) | | | |
| bulk action trade & IPO entries | | | |
| dokumentasi arsitektur data flow | | | |
| dokumentasi teknis & changelog | | | |

## Mini Kanban

| Now | Next Up | Later |
|---|---|---|
| Laporan performa periodik | Insight lintas modul | Provider split finance/trade |
| | | |

## Checklist Cepat

### Fondasi
- [x] Lint TypeScript aktif
- [x] Test runner aktif
- [x] Test dasar trade / IPO / finance ada
- [x] Domain context besar sudah mulai terpisah
- [x] Typing area fondasi lebih ketat

### Performa
- [x] Optimasi bundle ikon (named imports di Analytics & Dashboard)
- [x] Lazy load chart-heavy tab di Analytics (split 3 tab terpisah)
- [x] Lazy load chart-heavy section di Dashboard (Performance & Profit/Loss)

### Dashboard
- [x] Helper date/range dipisah
- [x] Hook IHSG dipisah
- [x] Chart section dipisah
- [x] Calendar section dipisah
- [x] Profit/loss section dipisah

### Data Layer
- [x] Persistence key penting diaudit
- [x] Helper storage dipisah
- [x] Domain `IPO` dipisah dari `DataContext`
- [x] Migration/versioning data lebih kuat

### IPO
- [x] Status IPO dibetulkan
- [x] Field `Underwriter` ditambahkan
- [x] Filter IPO diperluas
- [x] Statistik underwriter ditambahkan
- [x] Timeline IPO dibuat

### Trading & Portfolio
- [x] Rekonsiliasi posisi (over-sell, desync RDN, dsb.)
- [x] Histori perubahan transaksi (audit logs, timeline detail)
- [x] Bulk actions (edit tags/strategy, delete, sync IPO ke journal)

## Prioritas 1 - Kualitas Fondasi

### 1. Pecah file besar yang terlalu padat `[Done]`

Target inti yang diselesaikan:
- `src/modules/dashboard/pages/DashboardPage.tsx`
- `src/modules/shared/context/DataContext.tsx`

Hasil:
- business logic penting dipisah ke hooks/util
- section UI besar dipisah ke subcomponent
- file inti yang paling sering disentuh sekarang lebih aman diubah

Catatan:
- file besar lain seperti `CalculatorPage`, `AnalyticsPage`, dan `SettingsPage` masih punya ruang refactor lanjutan, tapi tidak lagi menjadi blocker untuk fondasi tahap ini

### 2. Kurangi penggunaan `any` `[Done]`

Hasil:
- typing domain IPO dan finance dipakai di area refactor utama
- generic typing dipakai di sorting dashboard
- state penting di `DataContext` tidak lagi bergantung penuh pada `any`

### 3. Tambah automated testing `[Done]`

Coverage yang sudah ditambahkan:
- `trades/calculations`
- `ipo/utils/ipoStatus`
- `shared/context/dataContextIpoUtils`
- `shared/context/dataContextIpoDomain`
- `finance/utils/finance`

Catatan:
- integration/UI-level test masih bisa ditambah nanti, tapi safety net fondasi untuk logic kritis sudah ada

### 4. Pisahkan state global yang terlalu gemuk `[Done]`

Hasil:
- helper storage dipisah
- helper normalisasi IPO dipisah
- domain `IPO` dipisah dari `DataContext`

Langkah lanjutan yang mungkin:
- `TradeDataProvider` `[Next]`
- `FinanceDataProvider` `[Next]`
- store yang lebih modular `[Next]`

## Prioritas 2 - Performa

### 5. Optimasi bundle ikon `[Done]`
- audit import `lucide-react` di AnalyticsPage, DashboardPage, dan komponen chart dashboard
- diganti menggunakan named imports agar Vite/Rolldown bisa melakukan treeshaking/named chunk loading dengan optimal

### 6. Optimasi halaman chart-heavy `[Done]`
- memisahkan tab Analytics menjadi `AnalyticsOverviewTab.tsx`, `AnalyticsChartsTab.tsx`, dan `AnalyticsCategoriesTab.tsx`
- memuat ChartsTab dan CategoriesTab secara lazy-loaded dengan `React.lazy` + `Suspense` sehingga Recharts hanya diunduh saat tab bersangkutan aktif

### 7. Optimasi load data dashboard `[Done]`
- benchmark IHSG sudah dipisah ke hook khusus
- lazy load komponen `DashboardPerformanceSection` dan `DashboardProfitLossSection` sehingga Recharts tidak membebani render awal dashboard utama

## Prioritas 3 - UX / UI

### 8. Audit visual consistency `[Done]`
- lebar kolom tabel IPO `[Done]`
- spacing modal dan form `[Done]`
- empty state `[Done]`
- status badge — migrasi dari inline style ke class CSS `[Done]`
- alignment tombol action desktop/mobile `[Done]`

### 9. Tambah validasi form yang lebih tegas `[Done]`
- validasi harga tidak negatif `[Done]`
- validasi tanggal penawaran vs tanggal IPO `[Done]`
- validasi lot dan quantity > 0 `[Done]`
- validasi email akun IPO `[Done]` (via type="email")
- pesan error inline yang lebih jelas `[Done]`

### 10. Buat UX status yang lebih jelas untuk IPO `[Done]`
- badge status dasar sudah benar `[Done]`
- highlight kalau IPO hari ini `[Done]`
- countdown menuju penawaran / listing `[Done]`

## Prioritas 4 - Data dan Keamanan

### 11. Audit seluruh persistence key `[Done]`
- import/export data `[Done]`
- key yang dipersist `[Done]`
- migrasi schema domain baru `[Done]`
- fallback saat offline `[Done]`

### 12. Tambah data migration versioning yang lebih jelas `[Done]`
- version marker per export/import `[Done]`
- migrator struktur data lama `[Done]`
- validasi shape data sebelum import `[Done]`

### 13. Audit audit-log coverage `[Done]`
- update/delete domain penting `[Done]` (watchlist, catatan, IPO events/entries)
- admin action `[Todo]`
- share/report action `[Todo]`
- workspace action `[Todo]`

## Prioritas 5 - IPO Module

### 14. Tambah field IPO yang lebih lengkap `[Done]`
- sektor `[Done]`
- registrar `[Done]`
- underwriter multiple value `[Done]`
- rentang bookbuilding `[Done]`
- target listing board `[Done]`
- lot pooling / target allotment `[Done]`

### 15. Tambah timeline IPO `[Done]`
- tanggal penawaran `[Done]`
- penjatahan `[Done]`
- refund `[Done]`
- distribusi saham `[Done]`
- listing date `[Done]`

### 16. Tambah filter dan pencarian IPO `[Done]`
- search by stock code `[Done]`
- filter by underwriter `[Done]`
- filter by year `[Done]`
- filter by status `[Done]`

### 17. Tambah statistik per underwriter `[Done]`
- total IPO per underwriter `[Done]`
- rata-rata return per underwriter `[Done]`
- success rate IPO per underwriter `[Done]`
- modal terbesar per underwriter `[Done]`

## Prioritas 6 - Trading dan Portfolio

### 18. Tambah rekonsiliasi posisi `[Done]`
- [x] deteksi over-sell
- [x] deteksi data buy/sell tidak seimbang
- [x] warning kalau cashflow dan portfolio tidak sinkron

### 19. Tambah histori perubahan transaksi `[Done]`
- [x] last edited by
- [x] edited at
- [x] before/after snapshot

### 20. Tambah bulk action `[Done]`
- [x] bulk delete trade
- [x] bulk edit tags/strategy
- [x] bulk update market price
- [x] bulk action untuk IPO entries

## Prioritas 7 - Reporting dan Insight

### 21. Tambah laporan performa periodik `[Todo]`
- weekly review
- monthly review
- quarterly review
- best/worst setup report

### 22. Tambah insight lintas modul `[Todo]`
- kontribusi IPO ke total asset
- kontribusi dividen ke return total
- pengaruh cashflow ke equity curve
- strategi paling efektif per market

## Prioritas 8 - Dokumentasi dan Operasional

### 23. Rapikan dokumentasi teknis `[Done]`
- [x] arsitektur data flow
- [x] struktur context/provider
- [x] panduan penambahan modul baru
- [x] panduan naming dan typing

### 24. Tambah changelog internal `[Done]`
- [x] perubahan fitur
- [x] perbaikan bug
- [x] breaking changes
- [x] migrasi data

## Suggested Next Move

Setelah `Prioritas 6` dan `Prioritas 8` selesai, langkah berikutnya adalah:

1. Lanjut ke `Prioritas 7 - Reporting dan Insight` (Laporan performa periodik bulanan/mingguan, insight lintas modul).
