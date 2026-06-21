-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
--
-- Defense-in-depth: constrain tags.color to a valid hex value at the write
-- boundary (the Supabase dashboard / SQL editor — the only place tags are
-- created, since the app has no in-app tag-creation path).
--
-- This is a belt to the app-side suspenders: the deal-sheet print view already
-- HTML-escapes tag colors, and every other view feeds the color into a React
-- inline-style object (never raw HTML). This constraint stops a malformed or
-- malicious color from ever landing in the table in the first place.
--
-- HOW TO APPLY: paste this whole file into Supabase → SQL editor → Run.

-- 1) Pre-flight. Run this FIRST. If it returns any rows, fix those colors
--    before step 2 — otherwise the ALTER will fail on the existing data.
--    (NULL colors are allowed and intentionally excluded here.)
select id, label, color
from public.tags
where color is not null
  and color !~* '^#([0-9a-f]{3}|[0-9a-f]{6})$';

-- 2) Add the constraint. Accepts 3- or 6-digit hex (e.g. #abc or #35C28A),
--    case-insensitive. NULL is permitted (a tag with no color renders as a
--    neutral chip). Idempotent-safe via the guard below.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tags_color_hex_chk'
  ) then
    alter table public.tags
      add constraint tags_color_hex_chk
      check (color is null or color ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$');
  end if;
end $$;
