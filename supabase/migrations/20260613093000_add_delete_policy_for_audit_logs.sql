drop policy if exists "Admins can delete audit logs" on public.audit_logs;
create policy "Admins can delete audit logs"
on public.audit_logs
for delete
to authenticated
using (public.is_admin());
