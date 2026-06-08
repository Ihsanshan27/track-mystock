create or replace function public.bootstrap_admin_profile(target_email text)
returns table (
  id uuid,
  email text,
  display_name text,
  default_role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(target_email));
  target_user auth.users%rowtype;
  admin_count bigint;
begin
  if normalized_email is null or normalized_email = '' then
    raise exception 'Email admin wajib diisi.';
  end if;

  select count(*)
  into admin_count
  from public.profiles
  where default_role = 'admin';

  select *
  into target_user
  from auth.users au
  where lower(au.email) = normalized_email
  limit 1;

  if target_user.id is null then
    raise exception 'User % belum ada di Supabase Auth.', normalized_email;
  end if;

  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if public.is_admin() then
      null;
    elsif admin_count = 0 and auth.uid() = target_user.id then
      null;
    else
      raise exception 'Tidak punya izin untuk bootstrap admin.';
    end if;
  end if;

  insert into public.profiles (id, email, display_name, default_role)
  values (
    target_user.id,
    target_user.email,
    coalesce(target_user.raw_user_meta_data ->> 'display_name', split_part(target_user.email, '@', 1)),
    'admin'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        default_role = 'admin',
        updated_at = now();

  return query
  select p.id, p.email, p.display_name, p.default_role
  from public.profiles p
  where p.id = target_user.id;
end;
$$;
