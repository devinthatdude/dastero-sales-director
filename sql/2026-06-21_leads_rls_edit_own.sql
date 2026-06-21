-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
--
-- Leads RLS — "see all, edit own" model:
--   SELECT  any authenticated user        (shared firm board preserved)
--   INSERT  only as yourself              (user_id must equal auth.uid())
--   UPDATE  your own rows, or any if admin
--   DELETE  admins only
--
-- NOTE: this scopes EDITING, not visibility. Every member can still read (and
-- therefore CSV-export) all leads — the admin-only CSV button is a UI nicety,
-- not a confidentiality control. That is the intended model.
--
-- HOW TO APPLY: paste this whole file into Supabase → SQL editor → Run.
-- Re-runnable: it rebuilds the policies from a clean slate each time.

-- 0) Review what's there now (informational — the migration replaces all of it).
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'leads'
order by cmd, policyname;

-- 1) Admin check. SECURITY DEFINER so the policy can read the caller's role
--    without depending on profiles' own RLS, and STABLE so the planner can
--    cache it per statement. search_path is locked to prevent hijacking.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- 2) Ensure RLS is on (no-op if already enabled).
alter table public.leads enable row level security;

-- 3) Drop EVERY existing policy on public.leads so the final set is exactly the
--    four below. (Permissive policies OR together — a stray one would leak access.)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'leads'
  loop
    execute format('drop policy %I on public.leads', p.policyname);
  end loop;
end $$;

-- 4) The four policies.
create policy leads_select_authenticated
  on public.leads for select
  to authenticated
  using (true);

create policy leads_insert_own
  on public.leads for insert
  to authenticated
  with check (user_id = auth.uid());

create policy leads_update_own_or_admin
  on public.leads for update
  to authenticated
  using      (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy leads_delete_admin
  on public.leads for delete
  to authenticated
  using (public.is_admin());
