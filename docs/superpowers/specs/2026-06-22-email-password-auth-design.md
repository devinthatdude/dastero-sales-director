# Design — Email + Password Authentication

**Date:** 2026-06-22 (revised 2026-06-23)
**Status:** Approved (pending spec review)
**Scope:** Replace magic-link sign-in with email + password. Accounts created by an
admin in the Supabase dashboard (no in-app admin backend).

> **Later revision (2026-06-23):** magic-link sign-in was *re-added alongside*
> email + password rather than removed. The login screen now offers both; the
> magic-link request uses `shouldCreateUser:false` so it stays invite-only (only
> existing users get a link). This supersedes the "magic link removed entirely"
> decision in §2/§9 below.

---

## 1. Goal

Switch authentication from passwordless magic-link to **email + password**, with
accounts created by an admin (invite-only), not self-service. Keep the build small
and deploy-free: no Edge Function, no service-role key anywhere in the project.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Login method | Email + password (`signInWithPassword`). Magic link **removed entirely**. |
| Account creation | **Admin invite-only**, done in the **Supabase dashboard** (no in-app screen, no Edge Function). |
| First password | Admin sets it in the dashboard and shares it with the rep. |
| Change password | Logged-in reps can change their own password in-app (`updateUser`). |
| Forgot password (logged out) | **Admin-handled** — admin resets in the dashboard. No self-service page. |
| Role / name | Default `role = 'member'` via DB trigger; admin promotes or sets `full_name` via SQL (the existing first-admin pattern). `full_name` is optional — UI falls back to email local-part via `repName()`. |
| Session persistence | Unchanged — localStorage + auto-refresh. |

## 3. Why this shape

The lead board is shared, so account creation *is* access control — hence
invite-only with no public sign-up. Creating users needs the service-role key, which
must never reach the browser; rather than build a backend to hold it, we use the
Supabase dashboard, which already holds it securely. For an internal app that adds
reps rarely, dashboard provisioning is the right YAGNI tradeoff: identical end-user
experience, zero deploy, zero new backend surface.

## 4. Components (all in-app, no deploy)

### 4.1 `Login.jsx` (rewrite)
- Email + password fields → `supabase.auth.signInWithPassword({ email, password })`.
- Clear error on failure ("Invalid email or password").
- Remove `signInWithOtp`, the `sent` state, and the "check your email" copy.
- **No sign-up link** (invite-only).

### 4.2 Change-password (new, logged-in)
- A small control near the existing Sign Out button → modal/section with
  new-password (+ confirm) → `supabase.auth.updateUser({ password })`.
- Available to any logged-in user for their own account.

*(No admin screen, no Edge Function — provisioning/resets happen in the dashboard.)*

## 5. Data flow

**Login:** email + password → `signInWithPassword` → session persisted → `useAuth`
loads profile → app renders. (Downstream unchanged.)

**Add a rep (admin, dashboard):** Authentication → Users → Add user (email + initial
password, auto-confirm) → DB trigger creates the `profiles` row (role `member`) →
admin shares the password → rep logs in → rep optionally changes their password
in-app. To make someone an admin or set their name, admin runs the existing SQL
(`update public.profiles set role='admin'/full_name=… where email=…`).

**Reset a password (admin, dashboard):** Authentication → Users → pick user → set a
new password → share it.

## 6. Database requirements

- **`profiles` auto-creation (now critical).** Dashboard-created users only get a
  `profiles` row if a trigger creates one — there is no Edge Function fallback in
  this path.
  - **VERIFY:** does a `handle_new_user` trigger on `auth.users` exist? (Existing
    magic-link users have profiles, so likely yes.)
  - If missing, add it as a `sql/` migration: on new `auth.users` row, insert
    `profiles (id, email, role='member')`.
- **`profiles` RLS:** admins read all profiles (needed by `useProfiles` + StatsTab),
  members read their own. **VERIFY** current policies; add an admin-read policy via a
  `sql/` migration if missing.

## 7. Security considerations

- **Disable public sign-ups (critical).** With email auth, the public anon key in the
  browser can call `signUp()` directly — so even without a sign-up button, a stranger
  could self-register unless sign-ups are turned off. In Supabase: Authentication →
  Providers → Email → **disable "Allow new users to sign up."** This is what actually
  enforces invite-only.
- No service-role key in the project at all (the whole point of this path).
- Option-A passwords are shared out-of-band; the in-app change-password lets reps
  replace them. Document: set a unique temporary password per rep.
- Set a sensible **minimum password length** in Auth settings (e.g. 8+).

## 8. Prerequisites / operational steps (user-run, dashboard)

1. **Disable "Allow new users to sign up"** (Authentication → Providers → Email) —
   enforces invite-only. *Do this as part of the rollout.*
2. Set the owner's first password (Authentication → Users) so the owner can log in.
3. Confirm/create the `handle_new_user` trigger (migration if missing).
4. Confirm/add the `profiles` admin-read RLS policy (migration if missing).
5. Set a minimum password length in Auth settings.

## 9. Out of scope (YAGNI)

- In-app admin "Add rep" screen and the Edge Function (chosen against).
- Self-service logged-out "forgot password" page.
- Magic link / OTP, social login, MFA.

## 10. Open items to confirm during implementation

- Presence of the `handle_new_user` trigger and current `profiles` RLS policies
  (drives whether §6 migrations are needed).
- Exact placement of the in-app change-password control (near Sign Out — settle in
  the plan).
