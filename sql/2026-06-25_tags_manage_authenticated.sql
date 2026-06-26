-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- In-app tag management: let any authenticated user manage the shared tag
-- catalog, and make tag deletion cascade to lead_tags.
-- HOW TO APPLY: Supabase → SQL editor → run. Re-runnable.

-- 0) Diagnostic (informational): current tags policies + the lead_tags FK action.
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'tags' order by cmd;

select con.conname, con.confdeltype  -- confdeltype: 'c'=cascade, 'a'=no action, 'r'=restrict
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'lead_tags' and con.contype = 'f';

-- 1) Enable RLS and (re)create the full policy set by name (re-runnable).
alter table public.tags enable row level security;

drop policy if exists tags_select_authenticated on public.tags;
create policy tags_select_authenticated on public.tags
  for select to authenticated using (true);

drop policy if exists tags_insert_authenticated on public.tags;
create policy tags_insert_authenticated on public.tags
  for insert to authenticated with check (true);

drop policy if exists tags_update_authenticated on public.tags;
create policy tags_update_authenticated on public.tags
  for update to authenticated using (true) with check (true);

drop policy if exists tags_delete_authenticated on public.tags;
create policy tags_delete_authenticated on public.tags
  for delete to authenticated using (true);

-- 2) Ensure lead_tags.tag_id cascades on tag delete. Recreate the FK if it is
--    not already ON DELETE CASCADE. Adjust the FK/column name if yours differ
--    (check the diagnostic in step 0).
do $$
declare
  fk_name text;
  is_cascade boolean;
begin
  select con.conname, (con.confdeltype = 'c')
    into fk_name, is_cascade
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'lead_tags' and con.contype = 'f' and att.attname = 'tag_id'
  limit 1;

  if fk_name is null then
    -- No FK yet: create one with cascade.
    alter table public.lead_tags
      add constraint lead_tags_tag_id_fkey
      foreign key (tag_id) references public.tags(id) on delete cascade;
  elsif not is_cascade then
    execute format('alter table public.lead_tags drop constraint %I', fk_name);
    alter table public.lead_tags
      add constraint lead_tags_tag_id_fkey
      foreign key (tag_id) references public.tags(id) on delete cascade;
  end if;
end $$;
