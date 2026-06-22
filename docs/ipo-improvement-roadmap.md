# IPO Improvement Roadmap

## Ringkasan
Daftar ini merangkum ide penyempurnaan paling bernilai untuk modul IPO, khususnya pada halaman ringkasan dan analisis kebutuhan modal per akun.

## Prioritas Rekomendasi
1. Filter status IPO aktif
2. Grand total kebutuhan modal
3. Simulasi jatah allotment

## Daftar Penyempurnaan

### 1. Filter status IPO
Tujuan:
Memisahkan data `masih penawaran`, `sudah IPO`, dan `semua` agar ringkasan modal lebih realistis.

Manfaat:
- User bisa fokus ke IPO yang benar-benar masih butuh dana.
- Ringkasan tidak tercampur dengan IPO lama yang sudah selesai.
- Tabel kebutuhan modal jadi lebih relevan untuk planning harian.

Implementasi yang disarankan:
- Tambahkan filter status di halaman `IPO Summary`.
- Status dihitung dari `offeringDate`, `ipoDate`, dan tanggal hari ini.
- Default filter yang disarankan: `aktif / masih berjalan`.

### 2. Grand total kebutuhan modal
Tujuan:
Menampilkan total gabungan kebutuhan dana dari seluruh akun yang ikut IPO.

Manfaat:
- User langsung tahu total uang yang harus disiapkan.
- Mudah dipakai sebagai checkpoint sebelum submit semua order IPO.
- Bisa jadi angka acuan untuk membandingkan dengan saldo cash atau finance tracker.

Implementasi yang disarankan:
- Tambahkan summary card di atas tabel modal per akun.
- Tambahkan footer total pada tabel untuk tampilan yang lebih eksplisit.

### 3. Simulasi jatah allotment
Tujuan:
Membantu user menghitung kebutuhan modal jika lot yang didapat tidak penuh.

Manfaat:
- Lebih realistis dengan kondisi IPO yang sering oversubscribed.
- User bisa melihat skenario `25%`, `50%`, `75%`, atau `100%`.
- Membantu perencanaan cash dan pemindahan dana antar akun.

Implementasi yang disarankan:
- Tambahkan dropdown atau segmented control untuk persen allotment.
- Semua kebutuhan modal pada tabel mengikuti faktor allotment terpilih.
- Default tetap `100%` agar baseline tetap jelas.

### 4. Grouping akun yang lebih rapi
Tujuan:
Menghindari akun dobel karena beda penulisan nama atau email.

Manfaat:
- Tabel modal per akun menjadi lebih akurat.
- User tidak perlu merapikan data manual jika ada typo kecil.
- Fondasi lebih baik jika nanti ingin ada master akun IPO.

Implementasi yang disarankan:
- Buat identitas akun IPO yang lebih stabil.
- Jangka pendek: normalisasi nama + email.
- Jangka menengah: buat entity khusus `IPO Account`.

### 5. Export ringkasan
Tujuan:
Memudahkan rekap kebutuhan modal dan performa IPO ke luar aplikasi.

Manfaat:
- Bisa dibagikan ke pasangan, tim, atau arsip pribadi.
- Cocok untuk evaluasi bulanan dan dokumentasi eksternal.
- Mempermudah analisis di Excel atau Google Sheets.

Implementasi yang disarankan:
- Tambahkan tombol export CSV di `IPO Summary`.
- Jika perlu tahap berikutnya, tambahkan export Excel dengan beberapa sheet.

### 6. Highlight kebutuhan dana terbesar
Tujuan:
Menyorot akun dengan kebutuhan modal paling besar.

Manfaat:
- User cepat tahu akun mana yang paling butuh perhatian.
- Membantu prioritas top up saldo sebelum masa penjatahan.
- Membuat tabel summary lebih informatif secara visual.

Implementasi yang disarankan:
- Tambahkan badge `terbesar` untuk akun dengan modal tertinggi.
- Bisa juga diberi warna aksen atau ranking `#1`, `#2`, `#3`.

## Rekomendasi Eksekusi Bertahap

### Fase 1
- Filter status IPO aktif
- Grand total kebutuhan modal
- Highlight kebutuhan dana terbesar

### Fase 2
- Simulasi jatah allotment
- Export ringkasan

### Fase 3
- Master akun IPO / grouping akun yang lebih stabil

## Catatan
- Fase 1 adalah kombinasi dengan effort kecil sampai menengah tetapi impact user paling terasa.
- Jika ingin integrasi lintas modul, grand total kebutuhan modal bisa dihubungkan ke `finance tracker` pada fase berikutnya.
