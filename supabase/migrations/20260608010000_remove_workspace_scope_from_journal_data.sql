drop index if exists public.journal_data_personal_scope_unique;
drop index if exists public.journal_data_workspace_scope_unique;

update public.journal_data
set workspace_id = null
where workspace_id is not null;

with ranked_rows as (
  select
    id,
    row_number() over (
      partition by user_id, data_key
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_num
  from public.journal_data
)
delete from public.journal_data jd
using ranked_rows rr
where jd.id = rr.id
  and rr.row_num > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_data_user_id_data_key_key'
      and conrelid = 'public.journal_data'::regclass
  ) then
    alter table public.journal_data
      add constraint journal_data_user_id_data_key_key
      unique (user_id, data_key);
  end if;
end
$$;

drop policy if exists "Users can read their own journal data" on public.journal_data;
create policy "Users can read their own journal data"
on public.journal_data
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.shared_access sa
    where sa.owner_id = journal_data.user_id
      and sa.grantee_id = (select auth.uid())
      and sa.access_level in ('read', 'review', 'admin')
      and (sa.expires_at is null or sa.expires_at > now())
  )
);

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
