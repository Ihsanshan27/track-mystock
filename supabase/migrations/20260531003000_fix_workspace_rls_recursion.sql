create or replace function public.is_workspace_member(target_workspace_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = target_user_id
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = target_user_id
      and wm.role = 'admin'
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = target_user_id
  );
$$;

drop policy if exists "Workspace members can read workspaces" on public.workspaces;
create policy "Workspace members can read workspaces"
on public.workspaces
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_admin()
  or public.is_workspace_member(id, (select auth.uid()))
);

drop policy if exists "Members can read workspace membership" on public.workspace_members;
create policy "Members can read workspace membership"
on public.workspace_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
  or public.is_workspace_owner(workspace_id, (select auth.uid()))
  or public.is_workspace_admin(workspace_id, (select auth.uid()))
);

drop policy if exists "Workspace owners and admins can manage membership" on public.workspace_members;
create policy "Workspace owners and admins can manage membership"
on public.workspace_members
for all
to authenticated
using (
  public.is_admin()
  or public.is_workspace_owner(workspace_id, (select auth.uid()))
  or public.is_workspace_admin(workspace_id, (select auth.uid()))
)
with check (
  public.is_admin()
  or public.is_workspace_owner(workspace_id, (select auth.uid()))
  or public.is_workspace_admin(workspace_id, (select auth.uid()))
);
