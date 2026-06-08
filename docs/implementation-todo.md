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
- [x] Script setup Supabase otomatis:
  - [x] `npm run db:setup`
  - [x] `npm run db:deploy:functions`
  - [x] `npm run db:verify`
  - [x] `npm run db:bootstrap-admin`

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
- [x] Migration table `report_shares`.
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

- [ ] Jalankan `npm run db:setup` ke project Supabase.
- [ ] Pastikan table `journal_data`, `profiles`, `workspaces`, `workspace_members`, `shared_access`, `trade_reviews`, `audit_logs`, `app_settings`, dan `report_shares` muncul di Supabase.
- [ ] Buat atau update admin pertama dengan `npm run db:bootstrap-admin -- email@contoh.com`.
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

- [x] Workspace switcher di header/sidebar.
- [x] Context untuk active workspace.
- [x] Penyimpanan jurnal berdasarkan workspace.
- [x] Filter data jurnal per workspace.
- [x] UI manage workspace member.

### Sharing dan Mentor

- [x] Trader bisa share jurnal ke mentor.
- [x] Trader bisa revoke akses mentor.
- [x] Mentor bisa melihat daftar trader yang memberi akses.
- [x] Route `/mentor/traders`.
- [x] Route `/mentor/traders/:userId`.
- [x] Mentor bisa melihat transaksi trader yang di-share.
- [x] Mentor bisa memberi trade review.
- [x] Panel review di Trade Detail.
- [x] Tag kesalahan trading.
- [x] Rating disiplin, psikologi, dan risk management.

### Viewer dan Report

- [x] Role viewer read-only secara penuh.
- [x] Share report read-only.
- [x] Route `/reports`.
- [x] Route `/shared/:shareId`.
- [x] Portfolio summary report.
- [x] Monthly performance report.
- [x] Equity curve report.
- [x] Export PDF.

### Permission dan Security

- [x] Permission helper yang lebih granular per fitur.
- [x] Route guard admin.
- [x] Route guard per role untuk non-admin.
- [x] UI fallback ketika user tidak punya izin.
- [x] Audit log untuk update role dari admin panel.
- [x] Audit log untuk aksi penting lain dari frontend.
- [x] RLS lanjutan untuk akses mentor/viewer ke data jurnal.
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

1. Jalankan `npm run db:setup` dan pastikan migration + function masuk ke Supabase.
2. Buat admin pertama lewat `npm run db:bootstrap-admin -- email@contoh.com`.
3. Test Admin Users page dengan akun admin.
4. Test share access trader ke mentor dan viewer.
5. Test Mentor Review panel di Trade Detail.
6. Test workspace switcher dengan beberapa workspace.
7. Test RLS mentor/viewer dengan akun berbeda.
