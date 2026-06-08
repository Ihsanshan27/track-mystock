do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspace_members_workspace_id_user_id_key'
      and conrelid = 'public.workspace_members'::regclass
  ) then
    alter table public.workspace_members
      add constraint workspace_members_workspace_id_user_id_key
      unique (workspace_id, user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shared_access_owner_id_grantee_id_key'
      and conrelid = 'public.shared_access'::regclass
  ) then
    alter table public.shared_access
      add constraint shared_access_owner_id_grantee_id_key
      unique (owner_id, grantee_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_reviews_owner_id_mentor_id_trade_id_key'
      and conrelid = 'public.trade_reviews'::regclass
  ) then
    alter table public.trade_reviews
      add constraint trade_reviews_owner_id_mentor_id_trade_id_key
      unique (owner_id, mentor_id, trade_id);
  end if;
end
$$;
