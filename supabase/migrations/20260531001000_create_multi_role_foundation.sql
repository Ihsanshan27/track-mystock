create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  default_role text not null default 'trader'
    check (default_role in ('admin', 'mentor', 'trader', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'trader'
    check (role in ('admin', 'mentor', 'trader', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.shared_access (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  grantee_id uuid not null references auth.users(id) on delete cascade,
  access_level text not null default 'read'
    check (access_level in ('read', 'review', 'admin')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, grantee_id)
);

create table if not exists public.trade_reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  mentor_id uuid not null references auth.users(id) on delete cascade,
  comment text,
  discipline_score int check (discipline_score between 1 and 5),
  psychology_score int check (psychology_score between 1 and 5),
  risk_score int check (risk_score between 1 and 5),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('registration_enabled', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.journal_data
add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists trade_reviews_set_updated_at on public.trade_reviews;
create trigger trade_reviews_set_updated_at
before update on public.trade_reviews
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, default_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'trader'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.current_profile_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select default_role from public.profiles where id = auth.uid()),
    'trader'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_profile_role() = 'admin';
$$;

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

drop trigger if exists profiles_prevent_non_admin_role_change on public.profiles;
create trigger profiles_prevent_non_admin_role_change
before insert or update on public.profiles
for each row execute function public.prevent_non_admin_role_change();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.shared_access enable row level security;
alter table public.trade_reviews enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Profiles are visible to self and admins" on public.profiles;
create policy "Profiles are visible to self and admins"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id or public.is_admin())
with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Workspace members can read workspaces" on public.workspaces;
create policy "Workspace members can read workspaces"
on public.workspaces
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = id and wm.user_id = (select auth.uid())
  )
);

drop policy if exists "Authenticated users can create owned workspaces" on public.workspaces;
create policy "Authenticated users can create owned workspaces"
on public.workspaces
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Workspace owners and admins can update workspaces" on public.workspaces;
create policy "Workspace owners and admins can update workspaces"
on public.workspaces
for update
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin())
with check (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Members can read workspace membership" on public.workspace_members;
create policy "Members can read workspace membership"
on public.workspace_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "Workspace owners and admins can manage membership" on public.workspace_members;
create policy "Workspace owners and admins can manage membership"
on public.workspace_members
for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "Shared access visible to owner and grantee" on public.shared_access;
create policy "Shared access visible to owner and grantee"
on public.shared_access
for select
to authenticated
using (owner_id = (select auth.uid()) or grantee_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Owners can create shared access" on public.shared_access;
create policy "Owners can create shared access"
on public.shared_access
for insert
to authenticated
with check (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Owners can update shared access" on public.shared_access;
create policy "Owners can update shared access"
on public.shared_access
for update
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin())
with check (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Owners can delete shared access" on public.shared_access;
create policy "Owners can delete shared access"
on public.shared_access
for delete
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Trade reviews visible by owner or mentor" on public.trade_reviews;
create policy "Trade reviews visible by owner or mentor"
on public.trade_reviews
for select
to authenticated
using (owner_id = (select auth.uid()) or mentor_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Mentors can create shared trade reviews" on public.trade_reviews;
create policy "Mentors can create shared trade reviews"
on public.trade_reviews
for insert
to authenticated
with check (
  mentor_id = (select auth.uid())
  and exists (
    select 1 from public.shared_access sa
    where sa.owner_id = trade_reviews.owner_id
      and sa.grantee_id = (select auth.uid())
      and sa.access_level in ('review', 'admin')
      and (sa.expires_at is null or sa.expires_at > now())
  )
);

drop policy if exists "Mentors can update their own trade reviews" on public.trade_reviews;
create policy "Mentors can update their own trade reviews"
on public.trade_reviews
for update
to authenticated
using (mentor_id = (select auth.uid()) or public.is_admin())
with check (mentor_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Users can create audit logs" on public.audit_logs;
create policy "Users can create audit logs"
on public.audit_logs
for insert
to authenticated
with check (actor_id = (select auth.uid()));

drop policy if exists "Anyone can read app settings" on public.app_settings;
create policy "Anyone can read app settings"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can update app settings" on public.app_settings;
create policy "Admins can update app settings"
on public.app_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can insert app settings" on public.app_settings;
create policy "Admins can insert app settings"
on public.app_settings
for insert
to authenticated
with check (public.is_admin());
