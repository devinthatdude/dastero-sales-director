-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- Allow a rep to delete leads they own; admins can still delete any. Replaces
-- the admin-only delete policy. Reuses public.is_admin() from the leads RLS
-- migration (sql/2026-06-21_leads_rls_edit_own.sql) — apply that first if you
-- haven't. Idempotent.
-- HOW TO APPLY: Supabase → SQL editor → Run.

drop policy if exists leads_delete_admin on public.leads;
drop policy if exists leads_delete_own_or_admin on public.leads;
create policy leads_delete_own_or_admin on public.leads
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
