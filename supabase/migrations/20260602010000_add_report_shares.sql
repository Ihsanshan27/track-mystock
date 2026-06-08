create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  market text not null default 'ID'
    check (market in ('ID', 'US')),
  report_data jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists report_shares_set_updated_at on public.report_shares;
create trigger report_shares_set_updated_at
before update on public.report_shares
for each row execute function public.set_updated_at();

alter table public.report_shares enable row level security;

drop policy if exists "Owners can read their report shares" on public.report_shares;
create policy "Owners can read their report shares"
on public.report_shares
for select
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Owners can create report shares" on public.report_shares;
create policy "Owners can create report shares"
on public.report_shares
for insert
to authenticated
with check (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Owners can update report shares" on public.report_shares;
create policy "Owners can update report shares"
on public.report_shares
for update
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin())
with check (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Owners can delete report shares" on public.report_shares;
create policy "Owners can delete report shares"
on public.report_shares
for delete
to authenticated
using (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Public can read active report shares" on public.report_shares;
create policy "Public can read active report shares"
on public.report_shares
for select
to anon, authenticated
using (is_active = true);
