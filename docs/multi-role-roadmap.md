# Jurnal Saham Multi-Role Roadmap

## Tujuan

Mengembangkan Jurnal Saham dari aplikasi jurnal pribadi menjadi platform yang bisa dipakai oleh trader, mentor, admin komunitas, dan viewer/investor dengan izin akses yang jelas.

## Role Awal

### Admin

Mengelola user, role, workspace, dan audit aktivitas.

Hak akses:
- Melihat daftar user.
- Mengubah role user.
- Membuat dan mengelola workspace.
- Melihat audit log.
- Tidak otomatis bisa membaca jurnal pribadi user kecuali diberi akses eksplisit.

### Mentor

Mereview jurnal trader yang memberi akses.

Hak akses:
- Melihat jurnal trader yang terhubung.
- Memberi komentar pada transaksi.
- Memberi rating disiplin, psikologi, dan risk management.
- Membuat template trading plan.

### Trader

User utama aplikasi.

Hak akses:
- Mengelola transaksi, watchlist, notes, cashflow, dividen, settings, dan market prices miliknya sendiri.
- Membagikan akses jurnal ke mentor atau viewer.
- Melihat review dari mentor.

### Viewer

Role read-only untuk investor, partner, atau teman diskusi.

Hak akses:
- Melihat report atau portfolio yang dibagikan.
- Tidak bisa mengubah data.

## Struktur Database Yang Disarankan

### `profiles`

Metadata user Supabase.

Kolom:
- `id uuid primary key references auth.users(id)`
- `email text`
- `display_name text`
- `default_role text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `workspaces`

Ruang kerja untuk komunitas, tim, atau grup mentoring.

Kolom:
- `id uuid primary key`
- `name text`
- `owner_id uuid references auth.users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

### `workspace_members`

Relasi user dengan workspace.

Kolom:
- `id uuid primary key`
- `workspace_id uuid references workspaces(id)`
- `user_id uuid references auth.users(id)`
- `role text`
- `created_at timestamptz`

Role dalam workspace:
- `admin`
- `mentor`
- `trader`
- `viewer`

### `journal_data`

Data jurnal yang sekarang sudah ada. Bisa dikembangkan dengan `workspace_id`.

Kolom tambahan yang disarankan:
- `workspace_id uuid null references workspaces(id)`

Catatan:
- Kalau `workspace_id` null, data dianggap jurnal pribadi.
- Kalau ada `workspace_id`, data masuk konteks komunitas/tim.

### `shared_access`

Izin akses eksplisit dari trader ke mentor/viewer.

Kolom:
- `id uuid primary key`
- `owner_id uuid references auth.users(id)`
- `grantee_id uuid references auth.users(id)`
- `access_level text`
- `expires_at timestamptz null`
- `created_at timestamptz`

Access level:
- `read`
- `review`
- `admin`

### `trade_reviews`

Komentar dan review mentor pada transaksi.

Kolom:
- `id uuid primary key`
- `trade_id text`
- `owner_id uuid references auth.users(id)`
- `mentor_id uuid references auth.users(id)`
- `comment text`
- `discipline_score int`
- `psychology_score int`
- `risk_score int`
- `tags text[]`
- `created_at timestamptz`
- `updated_at timestamptz`

### `audit_logs`

Catatan aktivitas penting.

Kolom:
- `id uuid primary key`
- `actor_id uuid references auth.users(id)`
- `action text`
- `target_type text`
- `target_id text`
- `metadata jsonb`
- `created_at timestamptz`

## Fitur Yang Ditambahkan

## Phase 1: Role Foundation

Status: fondasi awal sudah dibuat di migration dan frontend.

Target:
- Tambah table `profiles`, `workspaces`, `workspace_members`, `shared_access`. Selesai.
- Tambah RLS policy dasar. Selesai.
- Tambah helper permission di frontend. Selesai.
- Sidebar dinamis berdasarkan role. Selesai.

UI baru:
- Halaman Profile. Sebagian, role tampil di Settings.
- Halaman Workspace Switcher sederhana. Belum.
- Badge role di header. Selesai.

## Phase 2: Admin Panel

Target:
- Admin bisa melihat daftar user.
- Admin bisa assign role dalam workspace.
- Admin bisa invite member ke workspace.

UI baru:
- `/admin/users`
- `/admin/workspaces`
- `/admin/audit-logs`

## Phase 3: Mentor Review

Target:
- Trader bisa membagikan akses ke mentor.
- Mentor bisa melihat jurnal trader yang di-share.
- Mentor bisa memberi review di trade.

UI baru:
- `/mentor/traders`
- `/mentor/traders/:userId`
- Panel review di Trade Detail.

## Phase 4: Shareable Reports

Target:
- Trader bisa membuat report read-only.
- Viewer bisa melihat report tanpa bisa mengubah data.

UI baru:
- `/reports`
- `/shared/:shareId`

Report awal:
- Portfolio summary.
- Monthly performance.
- Win rate.
- Profit factor.
- Equity curve.

## Phase 5: Advanced Community Features

Target:
- Template trading plan dari mentor.
- Leaderboard berbasis disiplin dan risk management.
- Reminder review jurnal.
- Export PDF.

Fitur tambahan:
- Checklist sebelum entry.
- Tag kesalahan trading.
- Statistik psikologi.
- Goal mingguan/bulanan.

## Permission Matrix

| Fitur | Admin | Mentor | Trader | Viewer |
| --- | --- | --- | --- | --- |
| Kelola jurnal sendiri | Ya | Ya | Ya | Tidak |
| Lihat jurnal user lain | Jika diberi akses | Jika diberi akses | Tidak | Jika diberi akses |
| Review trade | Tidak | Ya | Tidak | Tidak |
| Kelola user workspace | Ya | Tidak | Tidak | Tidak |
| Kelola role | Ya | Tidak | Tidak | Tidak |
| Lihat report shared | Ya | Ya | Ya | Ya |
| Edit data user lain | Tidak | Tidak | Tidak | Tidak |

## RLS Prinsip Dasar

1. User selalu bisa membaca dan mengubah data miliknya sendiri.
2. Mentor hanya bisa membaca data trader yang memberi akses `review`.
3. Viewer hanya bisa membaca data yang diberi akses `read`.
4. Admin workspace bisa mengelola membership, tapi tidak otomatis membaca jurnal pribadi.
5. Semua akses lintas user harus lewat `shared_access`.

## Urutan Implementasi Teknis

1. Tambah migration database multi-role.
2. Tambah trigger pembuatan `profiles` saat user signup.
3. Tambah service `profileService`.
4. Tambah `PermissionContext`.
5. Update sidebar agar berbasis role.
6. Tambah halaman admin users.
7. Tambah fitur share access.
8. Tambah mentor review di trade detail.
9. Tambah audit log untuk aksi penting.
10. Tambah report read-only.

## MVP Yang Disarankan

Mulai dari MVP kecil:
- Role: `admin`, `mentor`, `trader`.
- Admin bisa assign role.
- Trader bisa share jurnal ke mentor.
- Mentor bisa review transaksi.

Yang ditunda:
- Viewer.
- Subscription.
- Leaderboard.
- Export PDF.
- Notification.

## Catatan Produk

Fokus utama platform ini sebaiknya bukan hanya profit, tapi kualitas proses trading:
- Kepatuhan terhadap trading plan.
- Risk reward.
- Ukuran posisi.
- Emosi saat entry/exit.
- Review pasca transaksi.

Dengan arah ini, Jurnal Saham bisa punya value yang berbeda dari sekadar portfolio tracker.
