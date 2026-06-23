# Design — Email + Password Authentication

**Date:** 2026-06-22
**Status:** Approved (pending spec review)
**Scope:** Replace magic-link sign-in with email + password, admin-provisioned accounts.

---

## 1. Goal

Switch the app's authentication from passwordless magic-link to **email + password**,
with accounts created by an admin (invite-only), not self-service.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Login method | Email + password (`signInWithPassword`). Magic link **removed entirely**. |
| Account creation | **Admin invite-only** — no public sign-up page. |
| Where admin provisions | **In-app admin screen**, backed by a Supabase **Edge Function**. |
| First password | **Admin sets an initial password** (option A) and shares it with the rep. |
| Change password | Logged-in reps can change their own password (`updateUser`). |
| Forgot password (logged out) | **Admin-handled only** — no self-service reset page. |
| Session persistence | Unchanged — localStorage + auto-refresh (already "stay signed in on device"). |

## 3. Why this shape

The lead board is shared: any authenticated user sees every lead, so account
creation *is* access control. Invite-only prevents self-enrollment. User creation
requires the service-role key, which must never reach the browser — hence the Edge
Function as the only privileged surface. Option A (admin-set password) avoids
building a logged-out token-handling page, matching the "no self-service" choice;
the logged-in change-password gives reps a way to own their secret afterward.

## 4. Components

### 4.1 `Login.jsx` (rewrite)
- Email + password fields → `supabase.auth.signInWithPassword({ email, password })`.
- Clear error on invalid credentials ("Invalid email or password").
- Remove `signInWithOtp`, the `sent` state, and the "check your email" copy.
- No sign-up link (invite-only).

### 4.2 Admin "Add rep" screen (new, in-app, admin-only)
- Gated by `isAdmin`; reachable from an admin area (e.g., a new tab or a section
  surfaced only to admins).
- **Create form:** email, full name, role (member/admin), initial password.
- **Reset action:** for an existing rep, set a new password.
- Both call the Edge Function via `supabase.functions.invoke('provision-user', …)`
  (the caller's JWT is attached automatically).

### 4.3 Edge Function `provision-user` (new)
- Runtime: Supabase Edge Function (Deno/TypeScript).
- Secrets: `SUPABASE_SERVICE_ROLE_KEY` (function secret). `SUPABASE_URL` is provided
  by the platform.
- **Authorization:** read the caller's JWT from the `Authorization` header →
  `getUser()` to identify them → with a service-role client, read their
  `profiles.role`. Reject with **403** unless `role = 'admin'`.
- **Actions:**
  - `create`: `auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { full_name } })`, then upsert the `profiles` row with
    `{ id, email, full_name, role }`.
  - `reset`: `auth.admin.updateUserById(id, { password })`.
- Returns a minimal JSON result; never returns the service-role key or tokens.

### 4.4 Change-password (logged-in)
- A small control (near the existing Sign Out button) → modal/section →
  `supabase.auth.updateUser({ password })`.

## 5. Data flow

**Login:** user enters email+password → `signInWithPassword` → session persisted →
`useAuth` loads profile → app renders. (Unchanged downstream.)

**Provision:** admin submits form → `functions.invoke('provision-user', {action:'create', …})`
→ function verifies admin → creates auth user + profiles row → returns success →
admin tells rep their initial password → rep logs in → optionally changes password.

**Reset:** admin picks a rep + new password → `provision-user {action:'reset'}` →
function sets password → admin tells rep.

## 6. Database requirements

- **`profiles` auto-creation:** new auth users must get a `profiles` row.
  - **VERIFY:** does a `handle_new_user` trigger on `auth.users` already exist?
    (Existing magic-link users have profiles, so probably yes.)
  - The Edge Function upserts the profiles row regardless, so creation is correct
    whether or not the trigger fires. If no trigger exists, the function is the sole
    creator — acceptable, since all users now come through the function.
- **`profiles` RLS:** admins must read all profiles (the admin screen + `useProfiles`
  + StatsTab need this); members read their own. The Edge Function uses the
  service-role client and bypasses RLS. **VERIFY** current profiles policies; add an
  admin-read policy if missing (a migration in `sql/`).

## 7. Security considerations

- Service-role key lives **only** in the Edge Function secret — never in client code
  or `.env` shipped to the browser.
- The function **must** verify the caller is an admin before any privileged call;
  this is the entire access boundary for user creation.
- Option A shares a password out-of-band (weaker than rep-chosen). Mitigated by the
  logged-in change-password. Document that admins should set a unique temporary
  password per rep and have them change it.
- Password policy: enforce Supabase's minimum (set a reasonable minimum length in
  Auth settings, e.g. 8+).

## 8. Prerequisites / operational steps (user-run, outside app code)

1. Deploy the Edge Function (Supabase CLI `supabase functions deploy provision-user`,
   or dashboard) and set the `SUPABASE_SERVICE_ROLE_KEY` secret.
2. Set the owner's first password from the dashboard (Authentication → Users) so the
   owner can log in under the new system.
3. Run any `profiles` RLS / trigger migration produced by this work.
4. Confirm a sensible minimum password length in Auth settings.

## 9. Out of scope (YAGNI)

- Self-service logged-out "forgot password" page.
- Magic link / OTP, social login, MFA.
- Bulk user import, org/team hierarchy.

## 10. Open items to confirm during implementation

- Presence of the `handle_new_user` trigger and current `profiles` RLS policies.
- Where the admin screen lives (new bottom-nav tab vs. a section in an existing
  admin-only view) — a UI placement decision to settle in the plan.
