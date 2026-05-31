# Implementation Todo

Status implementasi Jurnal Saham berdasarkan kondisi saat ini.

## Sudah Diimplementasikan

### Core App

- [x] React + Vite app.
- [x] Routing halaman utama.
- [x] Layout dashboard dengan sidebar dan header.
- [x] Login dan register page.
- [x] Settings page.
- [x] Data export/import JSON.
- [x] Clear user data.
- [x] Toast notification.
- [x] Dev terminal logger untuk event auth dan data.

### Database dan Supabase

- [x] Supabase client.
- [x] Supabase Auth untuk register, login, logout, dan update display name.
- [x] Fallback localStorage jika Supabase env kosong.
- [x] Migration `journal_data`.
- [x] RLS `journal_data` per user.
- [x] Data jurnal user disimpan ke Supabase ketika Supabase aktif.
- [x] Migrasi data localStorage lama ke Supabase saat remote data masih kosong.
- [x] Script migration:
  - [x] `npm run db:link`
  - [x] `npm run db:push`

### Data Jurnal

- [x] Trades.
- [x] Watchlist.
- [x] Notes.
- [x] Cashflow.
- [x] Dividends.
- [x] Settings.
- [x] Market prices.

### Multi-Role Foundation

- [x] Artifact roadmap multi-role: `docs/multi-role-roadmap.md`.
- [x] Migration table `profiles`.
- [x] Migration table `workspaces`.
- [x] Migration table `workspace_members`.
- [x] Migration table `shared_access`.
- [x] Migration table `trade_reviews`.
- [x] Migration table `audit_logs`.
- [x] Column `workspace_id` di `journal_data`.
- [x] Trigger auto-create profile saat user signup.
- [x] Default role `trader`.
- [x] RLS dasar untuk multi-role tables.
- [x] Proteksi agar user biasa tidak bisa self-promote role.
- [x] `profileService`.
- [x] `PermissionContext`.
- [x] Role badge di header.
- [x] Role tampil di Settings.
- [x] Sidebar siap filter menu berdasarkan role.

### Fitur Yang Dinonaktifkan

- [x] Screener dinonaktifkan dari route.
- [x] Per Komoditas dinonaktifkan dari route.
- [x] Menu Screener dihapus dari sidebar.
- [x] Menu Per Komoditas dihapus dari sidebar.

## Belum Diimplementasikan

### Supabase Setup Manual

- [ ] Jalankan migration ke project Supabase dengan `npm run db:push`.
- [ ] Deploy Edge Function `admin-create-user`.
- [ ] Pastikan table `journal_data`, `profiles`, `workspaces`, `workspace_members`, `shared_access`, `trade_reviews`, `audit_logs`, dan `app_settings` muncul di Supabase.
- [ ] Buat atau update admin pertama di Supabase SQL Editor.
- [ ] Verifikasi register/login dengan user yang sudah ada.
- [ ] Verifikasi simpan data jurnal masuk ke `journal_data`.

### Admin Panel

- [x] Route `/admin/users`.
- [x] Route `/admin/workspaces`.
- [x] Route `/admin/audit-logs`.
- [x] Halaman daftar user.
- [x] Fitur assign role user.
- [x] Fitur tambah user dari admin panel.
- [x] Tombol aktif/nonaktif form registrasi.
- [x] Fitur create workspace.
- [x] Fitur invite member ke workspace.
- [x] UI audit log.
- [x] Proteksi route admin berdasarkan role.

### Workspace

- [ ] Workspace switcher di header/sidebar.
- [ ] Context untuk active workspace.
- [ ] Penyimpanan jurnal berdasarkan workspace.
- [ ] Filter data jurnal per workspace.
- [ ] UI manage workspace member.

### Sharing dan Mentor

- [ ] Trader bisa share jurnal ke mentor.
- [ ] Trader bisa revoke akses mentor.
- [ ] Mentor bisa melihat daftar trader yang memberi akses.
- [ ] Route `/mentor/traders`.
- [ ] Route `/mentor/traders/:userId`.
- [ ] Mentor bisa melihat transaksi trader yang di-share.
- [ ] Mentor bisa memberi trade review.
- [ ] Panel review di Trade Detail.
- [ ] Tag kesalahan trading.
- [ ] Rating disiplin, psikologi, dan risk management.

### Viewer dan Report

- [ ] Role viewer read-only secara penuh.
- [ ] Share report read-only.
- [ ] Route `/reports`.
- [ ] Route `/shared/:shareId`.
- [ ] Portfolio summary report.
- [ ] Monthly performance report.
- [ ] Equity curve report.
- [ ] Export PDF.

### Permission dan Security

- [ ] Permission helper yang lebih granular per fitur.
- [x] Route guard admin.
- [ ] Route guard per role untuk non-admin.
- [ ] UI fallback ketika user tidak punya izin.
- [x] Audit log untuk update role dari admin panel.
- [ ] Audit log untuk aksi penting lain dari frontend.
- [ ] RLS lanjutan untuk akses mentor/viewer ke data jurnal.
- [ ] Test manual RLS dengan beberapa akun.

### UX dan Stabilitas

- [x] Loading/error state khusus untuk role/profile.
- [x] Halaman error database setup jika table belum dibuat.
- [x] Pesan khusus jika Supabase Auth rate limited.
- [x] Empty state untuk admin/mentor pages.
- [x] Dokumentasi setup admin pertama.
- [x] Dokumentasi troubleshooting Supabase Auth rate limit.

### Testing

- [ ] Test login Supabase.
- [ ] Test register dengan email confirmation off/on.
- [ ] Test CRUD trade tersimpan di Supabase.
- [ ] Test import/export data.
- [ ] Test clear data.
- [ ] Test role badge.
- [ ] Test admin role manual.
- [ ] Test RLS dengan akun trader berbeda.
- [ ] Test build production.

## Prioritas Berikutnya

1. Jalankan `npm run db:push` dan pastikan migration masuk ke Supabase.
2. Buat admin pertama manual lewat SQL Editor.
3. Test Admin Users page dengan akun admin.
4. Tambah share access trader ke mentor.
5. Tambah Mentor Review panel di Trade Detail.
6. Tambah workspace switcher.
7. Tambah filter data jurnal per workspace.
