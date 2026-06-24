-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- Make profiles readable by all authenticated users (needed for the Leads-tab
-- owner filter to show teammate names). Replaces the earlier self-or-admin read.
-- HOW TO APPLY: Supabase → SQL editor → Run. Idempotent.

alter table public.profiles enable row level security;
drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);
