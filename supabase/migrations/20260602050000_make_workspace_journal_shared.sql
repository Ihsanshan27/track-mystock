with ranked_rows as (
  select
    id,
    workspace_id,
    data_key,
    row_number() over (
      partition by workspace_id, data_key
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_num
  from public.journal_data
  where workspace_id is not null
)
delete from public.journal_data jd
using ranked_rows rr
where jd.id = rr.id
  and rr.row_num > 1;

drop index if exists public.journal_data_workspace_scope_unique;
create unique index journal_data_workspace_scope_unique
on public.journal_data (workspace_id, data_key)
where workspace_id is not null;

drop policy if exists "Users can read their own journal data" on public.journal_data;
create policy "Users can read their own journal data"
on public.journal_data
for select
to authenticated
using (
  (
    workspace_id is null
    and (
      (select auth.uid()) = user_id
      or exists (
        select 1
        from public.shared_access sa
        where sa.owner_id = journal_data.user_id
          and sa.grantee_id = (select auth.uid())
          and sa.access_level in ('read', 'review', 'admin')
          and (sa.expires_at is null or sa.expires_at > now())
      )
    )
  )
  or (
    workspace_id is not null
    and public.can_use_workspace(workspace_id, (select auth.uid()))
  )
);

drop policy if exists "Users can insert their own journal data" on public.journal_data;
create policy "Users can insert their own journal data"
on public.journal_data
for insert
to authenticated
with check (
  (
    workspace_id is null
    and (select auth.uid()) = user_id
  )
  or (
    workspace_id is not null
    and (select auth.uid()) = user_id
    and public.can_use_workspace(workspace_id, (select auth.uid()))
  )
);

drop policy if exists "Users can update their own journal data" on public.journal_data;
create policy "Users can update their own journal data"
on public.journal_data
for update
to authenticated
using (
  (
    workspace_id is null
    and (select auth.uid()) = user_id
  )
  or (
    workspace_id is not null
    and public.can_use_workspace(workspace_id, (select auth.uid()))
  )
)
with check (
  (
    workspace_id is null
    and (select auth.uid()) = user_id
  )
  or (
    workspace_id is not null
    and (select auth.uid()) = user_id
    and public.can_use_workspace(workspace_id, (select auth.uid()))
  )
);

drop policy if exists "Users can delete their own journal data" on public.journal_data;
create policy "Users can delete their own journal data"
on public.journal_data
for delete
to authenticated
using (
  (
    workspace_id is null
    and (select auth.uid()) = user_id
  )
  or (
    workspace_id is not null
    and public.can_use_workspace(workspace_id, (select auth.uid()))
  )
);
