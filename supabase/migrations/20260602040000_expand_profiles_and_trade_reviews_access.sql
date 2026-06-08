drop policy if exists "Profiles are visible to self and admins" on public.profiles;
create policy "Profiles are visible to authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop index if exists public.trade_reviews_owner_mentor_trade_unique;
create unique index trade_reviews_owner_mentor_trade_unique
on public.trade_reviews (owner_id, mentor_id, trade_id);
