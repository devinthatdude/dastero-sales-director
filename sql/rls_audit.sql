-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- RLS audit — paste into the Supabase SQL editor and run.
-- Your publishable key is public by design; RLS is what actually guards the data.
-- This is a read-only check (no schema changes). Any table listed by query #1 is
-- exposed to anyone holding the public key — enable RLS on it.

-- 1) Tables in `public` with Row Level Security DISABLED (should return ZERO rows):
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
ORDER BY tablename;

-- 2) Full picture: every public table and whether RLS is on, with policy count.
SELECT t.tablename,
       t.rowsecurity                         AS rls_enabled,
       count(p.policyname)                    AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity, t.tablename;
-- A row with rls_enabled = true but policy_count = 0 means RLS is on but nothing
-- is allowed through — usually a misconfiguration worth checking.
