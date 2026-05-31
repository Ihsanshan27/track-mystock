create table if not exists public.journal_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data_key text not null,
  data jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, data_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists journal_data_set_updated_at on public.journal_data;
create trigger journal_data_set_updated_at
before update on public.journal_data
for each row execute function public.set_updated_at();

alter table public.journal_data enable row level security;

drop policy if exists "Users can read their own journal data" on public.journal_data;
create policy "Users can read their own journal data"
on public.journal_data
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own journal data" on public.journal_data;
create policy "Users can insert their own journal data"
on public.journal_data
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own journal data" on public.journal_data;
create policy "Users can update their own journal data"
on public.journal_data
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own journal data" on public.journal_data;
create policy "Users can delete their own journal data"
on public.journal_data
for delete
to authenticated
using ((select auth.uid()) = user_id);

