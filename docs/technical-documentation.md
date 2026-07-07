# Dokumentasi Teknis Sistem — Jurnal Saham

Dokumen ini menjelaskan arsitektur internal, aliran data (*data flow*), struktur context provider, serta panduan pengembangan bagi developer yang ingin menambahkan fitur atau modul baru ke dalam sistem `Jurnal Saham`.

---

## 1. Arsitektur Data Flow (Aliran Data)

Sistem Jurnal Saham sekarang memakai arsitektur **backend-first persistence**: backend NestJS + PostgreSQL menjadi source of truth utama, sementara frontend menyimpan cache lokal terbatas untuk UX responsif, draft form, dan import/export.

### Diagram Aliran Data

```mermaid
graph TD
    UI[Halaman/Komponen React] -->|Panggil Aksi/Ambil State| Context[DataContext / useData]
    Context -->|Ubah State Memori| ReactState[React State / Memory]
    Context -->|Tulis/Baca Cache Lokal| StorageUtils[dataContextStorageUtils]
    StorageUtils -->|Versioned JSON| LocalStorage[Browser LocalStorage]
    
    Context -->|Panggil API Backend| Backend[NestJS API]
    Backend -->|Persist Data| DB[(PostgreSQL + Prisma)]
    
    DataMigration[dataMigration] -->|Validasi & Upgrade Versi < 2.2 ke 2.2| Context
    ReactState -->|Re-render UI| UI
```

### Mekanisme Kerja Aliran Data
1.  **UI Component Action**: Komponen React memanggil fungsi aksi (misalnya `addTrade`, `updateIpoEntry`) yang disediakan oleh `useData()`.
2.  **State Update**: Aksi tersebut langsung memperbarui React state lokal agar perubahan instan terlihat oleh pengguna tanpa jeda jaringan (Optimistic UI).
3.  **Local Cache**: State yang diperbarui disimpan ke `LocalStorage` menggunakan helper dari [dataContextStorageUtils.ts](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/modules/shared/context/dataContextStorageUtils.ts) untuk draft, cache per user, dan import/export.
4.  **Backend Persistence**: Jika backend aktif dan pengguna sudah login, perubahan dikirim ke API backend untuk dipersist ke PostgreSQL sesuai konteks user dan workspace aktif.
5.  **Audit Trail Logging**: Setiap aksi mutasi data penting memicu pencatatan log audit agar aktivitas tetap bisa ditelusuri.

Catatan khusus:
- pengaturan registrasi publik tidak lagi disimpan di `localStorage` admin; frontend membaca dan menulisnya lewat endpoint backend `app-settings/public-registration`
- `POST /auth/register` juga memeriksa setting tersebut di backend agar perilakunya konsisten lintas browser/device

---

## 2. Struktur Context / Provider

Sistem ini didukung oleh tiga context provider utama yang menyelimuti aplikasi di [App.tsx](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/App.tsx):

### A. AuthContext (`useAuth`)
*   **Fungsi**: Mengelola sesi autentikasi pengguna (login, logout, registrasi, lupa password).
*   **Lokasi**: `apps/web/src/modules/auth/AuthContext.tsx`
*   **Fitur Keamanan**: Menyediakan objek `user` dan helper izin akses granular seperti pengecekan peran (`role`) pengguna (Admin, Trader, Viewer).

### B. DataContext (`useData`)
*   **Fungsi**: Hub utama pengolahan data transaksi trading, portofolio, dividen, rencana trading, watchlist, personal finance ledger, serta pengaturan aplikasi.
*   **Lokasi**: `apps/web/src/modules/shared/context/DataContext.tsx`
*   **Sub-Modul Pendukung**:
    *   [dataContextStorageUtils.ts](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/modules/shared/context/dataContextStorageUtils.ts): Menangani baca/tulis cache lokal per user.
    *   [dataContextIpoDomain.ts](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/modules/shared/context/dataContextIpoDomain.ts): Mengisolasi logika data modul IPO (event, entry partisipan, akun IPO) agar file `DataContext.tsx` tidak terlalu padat.
    *   [dataMigration.ts](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/modules/shared/utils/dataMigration.ts): Memvalidasi skema data serta meng-upgrade struktur ekspor data versi lama ke versi skema terbaru (`2.2`).

### C. DialogContext (`useDialog`)
*   **Fungsi**: Menyediakan layanan modal dialog global seperti dialog konfirmasi (`confirm`), pesan peringatan (`alert`), dan input modal tanpa perlu menduplikasi state modal di setiap halaman.
*   **Lokasi**: `apps/web/src/modules/shared/context/DialogContext.tsx`

---

## 3. Panduan Penambahan Modul Baru

Untuk menambahkan modul fungsional baru (misalnya modul `Dividen` atau `Analytics` baru), ikuti langkah-langkah terstandarisasi berikut:

### Langkah 1: Buat Folder Modul Baru
Buat struktur folder baru di bawah `apps/web/src/modules/`:
```text
apps/web/src/modules/nama-modul/
├── components/          # Komponen UI khusus modul (misal: Card, Form)
├── pages/               # Halaman utama modul yang akan di-routing
├── types/               # Type definitions / TypeScript interfaces
│   └── index.ts
├── utils/               # Fungsi utilitas & kalkulasi logika bisnis khusus
│   └── calculations.ts
└── nama-modul.css       # File style khusus jika diperlukan
```

### Langkah 2: Definisikan Tipe Data (Types)
Tulis tipe data modul Anda secara ketat di `apps/web/src/modules/nama-modul/types/index.ts`. Pastikan tidak menggunakan tipe data `any`.
```typescript
export interface MyModuleData {
  id: string;
  name: string;
  amount: number;
  date: string;
  createdAt: string;
}
```

### Langkah 3: Daftarkan State & Aksi di DataContext
1. Buka [DataContext.tsx](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/modules/shared/context/DataContext.tsx).
2. Tambahkan React state baru untuk data modul Anda:
   ```typescript
   const [myModuleData, setMyModuleData] = useState<MyModuleData[]>([]);
   ```
3. Buat fungsi aksi mutasi data (tambah, edit, hapus) lengkap dengan validasi data dan pencatatan audit log:
   ```typescript
   const addMyData = (payload: Omit<MyModuleData, 'id' | 'createdAt'>) => {
     if (!ensureWritable()) return;
     const newData: MyModuleData = {
       ...payload,
       id: crypto.randomUUID(),
       createdAt: new Date().toISOString(),
     };
     const updated = [...myModuleData, newData];
     setMyModuleData(updated);
     persistData('my_module_key', updated);
     logUserActivity('mymodule.added', 'mymodule_item', newData.id, { name: newData.name });
     showToast('Data berhasil ditambahkan');
   };
   ```
4. Ekspos state dan aksi tersebut di dalam nilai kembalian provider (`value` object).

### Langkah 4: Buat Halaman & Tambahkan Routing
1. Buat halaman utama di `src/modules/nama-modul/pages/MyModulePage.tsx` dan konsumsi data via `useData()`:
   ```typescript
   import { useData } from '@/modules/shared/context/DataContext';
   // ...
   const { myModuleData, addMyData } = useData();
   ```
2. Daftarkan rute halaman baru Anda ke dalam file [App.tsx](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/App.tsx) di bagian rute yang terproteksi (*protected routes*).

---

## 4. Panduan Naming & Typing (Standar Kode)

Untuk menjaga konsistensi kode di seluruh repository Jurnal Saham, ikuti aturan standar berikut:

### Standar Penamaan (Naming Conventions)
*   **Komponen & Halaman React**: Menggunakan **PascalCase** (contoh: `TradesPage.tsx`, `ReconciliationNotice.tsx`).
*   **File Fungsi Bisnis & Utilitas**: Menggunakan **camelCase** (contoh: `calculations.ts`, `dataMigration.ts`).
*   **CSS Stylesheet**: Menggunakan **kebab-case** (contoh: `finance-style.css`).
*   **Nama Fungsi & Variabel**: Menggunakan **camelCase** (contoh: `totalTradingAssets`, `handleDeleteAccount`).
*   **Variabel Konstanta**: Menggunakan **UPPER_SNAKE_CASE** (contoh: `STRATEGIES`, `EMOTIONS`).

### Standar Tipe Data (Typing Rules)
1.  **Dilarang Menggunakan `any`**: Semua parameter fungsi, state, dan properti komponen wajib didefinisikan tipenya secara ketat. Gunakan `unknown` jika tipe data benar-benar dinamis atau buat deklarasi generik `<T>`.
2.  **Gunakan Interface Eksplisit**: Semua data domain inti (seperti `Trade`, `Cashflow`, `IpoEvent`) wajib memiliki interface di [index.ts](/E:/FullStuck-web-developer/jurnal-saham-Copy/apps/web/src/modules/shared/types/index.ts).
3.  **Properti Opsional**: Gunakan tanda tanya (`?`) untuk menandakan properti opsional pada interface (contoh: `notes?: string`), bukan union dengan `null` or `undefined` secara manual jika tidak diperlukan.
