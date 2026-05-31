# Supabase Operations

Panduan operasional Supabase untuk development Jurnal Saham.

## Jalankan Migration

Login dan link project:

```bash
npx supabase login
npm run db:link
```

Push migration:

```bash
npm run db:push
```

Deploy function untuk Admin Panel:

```bash
npx supabase functions deploy admin-create-user
```

Table yang perlu muncul:
- `journal_data`
- `profiles`
- `workspaces`
- `workspace_members`
- `shared_access`
- `trade_reviews`
- `audit_logs`
- `app_settings`

## Buat Admin Pertama

Pastikan user sudah ada di Supabase Authentication.

Jalankan di SQL Editor:

```sql
insert into public.profiles (id, email, display_name, default_role)
select id, email, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)), 'admin'
from auth.users
where email = 'email-kamu@example.com'
on conflict (id) do update
set default_role = 'admin'
returning id, email, display_name, default_role;
```

Logout dan login ulang di aplikasi. Badge role harus berubah menjadi `Admin`.

## Jika Role Tetap Trader

Pastikan trigger role sudah versi terbaru:

```sql
create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.default_role = 'trader';
    return new;
  end if;

  new.default_role = old.default_role;
  return new;
end;
$$;
```

Lalu ulangi SQL pembuatan admin pertama.

## Troubleshooting Auth Rate Limit

Jika register gagal dengan:

```text
email rate limit exceeded
```

Artinya Supabase menolak request signup/email karena rate limit project.

Solusi development:
- Jangan ulang register terus menerus.
- Buat user manual di Supabase Dashboard.
- Buka Authentication > Users.
- Klik Add user.
- Isi email dan password.
- Aktifkan Auto Confirm User jika tersedia.
- Login dari aplikasi.

Jika registrasi publik dinonaktifkan dari Admin Panel, user baru harus dibuat lewat menu Admin > Users.

Untuk production:
- Pasang custom SMTP di Supabase.
- Gunakan domain email sendiri.
- Aktifkan email confirmation setelah SMTP siap.

## Troubleshooting Database Belum Siap

Jika aplikasi menampilkan `Database belum siap`, berarti tabel belum dibuat atau migration belum dipush.

Jalankan:

```bash
npm run db:push
```

Jika CLI belum link project:

```bash
npm run db:link
npm run db:push
```

Pastikan project yang dipilih sama dengan `VITE_SUPABASE_URL` di `.env`.
