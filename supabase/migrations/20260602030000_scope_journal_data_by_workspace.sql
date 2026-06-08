alter table public.journal_data
add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.journal_data
drop constraint if exists journal_data_user_id_data_key_key;

drop index if exists public.journal_data_personal_scope_unique;
create unique index journal_data_personal_scope_unique
on public.journal_data (user_id, data_key)
where workspace_id is null;

drop index if exists public.journal_data_workspace_scope_unique;
create unique index journal_data_workspace_scope_unique
on public.journal_data (user_id, workspace_id, data_key)
where workspace_id is not null;

create or replace function public.can_use_workspace(target_workspace_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    target_workspace_id is null
    or public.is_workspace_owner(target_workspace_id, target_user_id)
    or public.is_workspace_admin(target_workspace_id, target_user_id)
    or public.is_workspace_member(target_workspace_id, target_user_id)
  );
$$;

drop policy if exists "Users can read their own journal data" on public.journal_data;
create policy "Users can read their own journal data"
on public.journal_data
for select
to authenticated
using (
  (
    (select auth.uid()) = user_id
    and public.can_use_workspace(workspace_id, (select auth.uid()))
  )
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
with check (
  (select auth.uid()) = user_id
  and public.can_use_workspace(workspace_id, (select auth.uid()))
);

drop policy if exists "Users can update their own journal data" on public.journal_data;
create policy "Users can update their own journal data"
on public.journal_data
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and public.can_use_workspace(workspace_id, (select auth.uid()))
)
with check (
  (select auth.uid()) = user_id
  and public.can_use_workspace(workspace_id, (select auth.uid()))
);

drop policy if exists "Users can delete their own journal data" on public.journal_data;
create policy "Users can delete their own journal data"
on public.journal_data
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and public.can_use_workspace(workspace_id, (select auth.uid()))
);
