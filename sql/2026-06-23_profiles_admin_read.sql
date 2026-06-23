-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- Profiles RLS: a user reads their own row; admins read all (needed by
-- useProfiles + StatsTab). The is_admin() helper is SECURITY DEFINER so it
-- bypasses RLS and cannot recurse.
-- HOW TO APPLY: Supabase → SQL editor. Run the diagnostic first (step 0),
-- review existing policies, then run the rest.

-- 0) Review existing profiles policies before changing them.
select policyname, cmd, roles, qual from pg_policies
where schemaname = 'public' and tablename = 'profiles' order by cmd;

-- 1) Ensure the admin helper exists (idempotent; same as the leads RLS migration).
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- 2) Enable RLS and (re)create only the SELECT policy we own.
alter table public.profiles enable row level security;
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
