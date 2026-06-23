-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- Give every new auth user a profiles row (role 'member'). Required now that
-- users are created in the dashboard with no Edge Function to create the row.
-- HOW TO APPLY: Supabase → SQL editor → Run. Idempotent.

-- Diagnostic: does the trigger already exist? (informational)
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
