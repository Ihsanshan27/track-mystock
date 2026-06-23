# Changelog Internal — Jurnal Saham

Semua riwayat perubahan, penambahan fitur, perbaikan bug, breaking changes, dan sistem migrasi data pada proyek `Jurnal Saham` dicatat di dokumen ini.

---

## [Versi 2.2.0] — 2026-06-23

### Penambahan Fitur (Features)
*   **Modul IPO Terintegrasi (Prioritas 5)**:
    *   Menambahkan **9 field baru** ke model IPO (registrar, sektor, papan pencatatan, bookbuilding start/end date, allotment date, refund date, distribution date, lot pooling amount).
    *   Membuat formulir input IPO baru yang dipisah dalam **3 sub-seksi UI** (Informasi Utama, Detail Finansial, dan Timeline Penting).
    *   Membuat **Bento Grid** emiten info dan **Chronological IPO Timeline** 6 tahapan interaktif dengan visualisasi status (Upcoming, Active, Completed).
    *   Menambahkan **Multi-filter & Search Bar** interaktif di halaman list IPO (pencarian kode emiten, status IPO, underwriter dinamis, dan tahun listing).
    *   Membuat tab **Statistik Underwriter** dengan tabel sortable yang menampilkan total kawalan, rata-rata return, win rate underwriter %, dan alokasi modal maksimal.
*   **Log Audit Aktivitas Pengguna (Prioritas 4)**:
    *   Implementasi pencatatan log audit otomatis (`logUserActivity`) saat memutasi watchlist (`watchlist.updated`), catatan umum (`note.updated`), serta operasi CRUD pada modul IPO.
*   **Rekonsiliasi Posisi Otomatis (Prioritas 6)**:
    *   Membuat mesin deteksi anomali di [reconciliation.ts](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/trades/utils/reconciliation.ts) untuk mendeteksi *over-sell*, inkonsistensi tanggal beli vs tanggal jual, lot/harga beli tidak valid, biaya transaksi (>5%) abnormal, dan *orphan cashflow* (transaksi kas yatim).
    *   Membuat komponen [ReconciliationNotice.tsx](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/trades/components/ReconciliationNotice.tsx) berupa panel alert collapsable dinamis dengan daftar rekomendasi perbaikan aksi untuk pengguna.
*   **Histori Audit Perubahan Transaksi (Prioritas 6)**:
    *   Setiap pembaruan transaksi di `updateTrade` otomatis merekam objek perubahan berupa snapshot `before` (data lama) dan `after` (data baru) beserta alamat email editor dan timestamp langsung di field `history` objek transaksi.
    *   Menambahkan tabel kronologis perubahan data (*audit trail timeline*) di bagian bawah halaman [TradeDetailPage.tsx](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/trades/pages/TradeDetailPage.tsx).
*   **Tindakan Massal (Bulk Actions) (Prioritas 6)**:
    *   Menambahkan checkbox seleksi pada baris tabel transaksi di [TradesPage.tsx](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/trades/pages/TradesPage.tsx) dan alokasi IPO di [IpoDetailPage.tsx](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/ipo/pages/IpoDetailPage.tsx).
    *   Menampilkan **Floating Glassmorphism Action Bar** animasi ketika satu atau lebih entri dipilih.
    *   Aksi massal perdagangan: Hapus massal, ubah strategi massal, tambahkan tag massal tanpa menimpa tag lama, dan perbarui harga pasar massal.
    *   Aksi massal IPO: Hapus massal, ubah aksi (KEEP/SELL) massal, ubah SL/TL massal, dan **Bulk Sync ke Jurnal** (otomatis membuat transaksi penjualan saham baru di jurnal untuk entri berstatus SELL).

### Perbaikan Bug (Bug Fixes)
*   Memperbaiki bug status `Upcoming` IPO yang salah terhitung.
*   Memperbaiki key penyimpanan lokal `ipoAccounts` yang sebelumnya tidak ter-persist dengan benar.
*   Memperbaiki error kompilasi scoping variabel `entries` pada [IpoDetailPage.tsx](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/ipo/pages/IpoDetailPage.tsx) (used-before-declaration).
*   Menghilangkan error missing `Icons` pada [TradeDetailPage.tsx](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/trades/pages/TradeDetailPage.tsx).
*   Menghilangkan peringatan desinkronisasi kas palsu (mismatch currency USD vs IDR bank balance) di halaman portofolio/trades dengan membatasi pemeriksaan hanya pada pasar domestik (`market === 'ID'`).
*   Menghapus desinkronisasi total saldo bank vs saldo portofolio karena secara konsep fisis keduanya merupakan akun terpisah yang saldonya wajar berbeda (hubungan antar akun murni bersifat informasional/referensi).

### Breaking Changes
*   Mengubah skema tipe `Trade` untuk menampung properti opsional `history: TradeAuditLog[]`.
*   Mengubah skema tipe `Portfolio` untuk menampung properti opsional `financeAccountId?: string`.
*   Mengubah skema tipe `Cashflow` untuk menampung properti opsional `linkedFinanceTransactionId?: string`.
*   Mengubah tipe `IpoEvent` untuk menyertakan 9 field data baru.

### Migrasi Data (Data Migration)
*   Membuat mesin migrasi data otomatis [dataMigration.ts](file:///e:/FullStuck-web-developer/jurnal-saham/src/modules/shared/utils/dataMigration.ts) untuk meng-upgrade format file data pengguna (eksposisi versi < 2.2) ke versi 2.2 secara otomatis saat proses impor dilakukan, didukung oleh validasi bentuk struktur JSON agar proses impor aman dari kerusakan skema.
