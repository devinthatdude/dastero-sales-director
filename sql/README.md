# SQL migrations

Applied manually in the Supabase SQL editor (no automated migration runner).

## profiles SELECT policy — IMPORTANT
The intended live policy is **`profiles_select_authenticated`** (read-all for
authenticated users), from `2026-06-23_profiles_read_all.sql`. It lets the app
resolve teammate owner names on the shared board.

`2026-06-23_profiles_admin_read.sql` is **SUPERSEDED** — it imposed a
self-or-admin read that hides teammate names. Do not run it.

### Verify which policy is live
```sql
select policyname, qual
from pg_policies
where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT';
```
Expect `profiles_select_authenticated` / `true`. If you see
`profiles_select_self_or_admin`, run `2026-06-23_profiles_read_all.sql`.

## tags write access
`2026-06-25_tags_manage_authenticated.sql` grants INSERT/UPDATE/DELETE on
`tags` to all authenticated users (in-app tag management) and makes
`lead_tags.tag_id` cascade on delete. Apply it before using the Settings → Tags
manager, or saves will fail with an RLS error.
