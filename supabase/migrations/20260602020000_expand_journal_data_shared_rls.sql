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
