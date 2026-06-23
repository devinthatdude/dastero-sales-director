# Email + Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace magic-link sign-in with email + password, with admin-provisioned (dashboard-created) accounts and an in-app change-password.

**Architecture:** Login calls `supabase.auth.signInWithPassword`. Accounts are created by an admin in the Supabase dashboard (no Edge Function, no service-role key in the project). A DB trigger gives each new user a `profiles` row; logged-in users change their own password via `supabase.auth.updateUser`. Invite-only is enforced by disabling public sign-ups in Supabase Auth settings.

**Tech Stack:** React 18, Vite 5, Tailwind v3, `@supabase/supabase-js` v2.

## Global Constraints

- Tailwind pinned to **v3** — do not introduce v4 syntax/config.
- Every source file starts with the header: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- **No service-role key** anywhere in the repo or `.env` (browser-shipped).
- Invite-only: **no sign-up UI**, and public sign-ups disabled in Supabase.
- No test framework exists in this project. Each task's automated gate is `npm run build` (must succeed), followed by explicit manual verification. Do **not** add a test runner.
- Reuse existing CSS classes: `input`, `panel`, `brandbtn`, `surface`, `soft`, `dim` (defined in `src/index.css`).
- Commit after each task (trunk-based on `main`, matching repo history). End commit messages with the `Co-Authored-By` trailer used in this repo.

---

### Task 1: Rewrite `Login.jsx` for email + password

**Files:**
- Modify (full rewrite): `src/components/Login.jsx`

**Interfaces:**
- Consumes: `supabase` from `../lib/supabaseClient`.
- Produces: nothing imported elsewhere (default-exported `Login`, already wired in `App.jsx`). On successful sign-in, the `onAuthStateChange` listener in `useAuth.js` swaps `<Login/>` for `<AppShell/>` automatically — no callback needed here.

- [ ] **Step 1: Replace the file contents**

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const signIn = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    // Generic message on purpose — don't reveal whether the email exists.
    if (e) setError('Invalid email or password.');
    // On success, useAuth's onAuthStateChange listener renders the app.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-7 w-full max-w-sm shadow-sm">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Dastero Tech · Sales</div>
        <h1 className="text-2xl font-bold text-slate-800 mt-1 mb-5">Pipeline</h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@dasterotech.com"
          className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && signIn()}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <button
          onClick={signIn}
          disabled={busy}
          className="w-full text-sm font-semibold bg-slate-800 text-white rounded-lg py-2.5 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `✓ built` with no errors (≈90 modules transformed).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open the printed URL.
Expected:
- Login shows **email + password** fields and a "Sign in" button — no "Email me a link", no sign-up link.
- Wrong password → "Invalid email or password."
- Correct credentials (use an account whose password you set in the dashboard — see Task 3) → app loads.

- [ ] **Step 4: Commit**

```bash
git add src/components/Login.jsx
git commit -m "Replace magic-link login with email + password

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: In-app change-password

**Files:**
- Create: `src/components/ChangePassword.jsx`
- Modify: `src/components/tabs/TodayTab.jsx` (add import + state + control + render)

**Interfaces:**
- `ChangePassword` is a default export taking one prop: `onClose: () => void`. It calls `supabase.auth.updateUser({ password })` and shows a success state; the parent unmounts it on close.
- `TodayTab` already receives `onSignOut`; it gains local `pwOpen` state to toggle the modal. No new props.

- [ ] **Step 1: Create `ChangePassword.jsx`**

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChangePassword({ onClose }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (e) { setError(e.message); return; }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(8,12,24,.6)' }} onClick={onClose}>
      <div className="panel rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Change password</h2>
          <button onClick={onClose} className="dim text-sm font-semibold">Close</button>
        </div>
        {done ? (
          <p className="soft text-sm">Password updated.</p>
        ) : (
          <>
            <input type="password" autoComplete="new-password" placeholder="New password"
              value={pw} onChange={(e) => setPw(e.target.value)} className="input mb-3" />
            <input type="password" autoComplete="new-password" placeholder="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()} className="input mb-3" />
            <button onClick={submit} disabled={busy}
              className="w-full brandbtn rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {busy ? 'Saving…' : 'Update password'}
            </button>
            {error && <p className="text-xs mt-2" style={{ color: '#F0584E' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `TodayTab.jsx`**

Change the imports at the top (lines 1-3) to add `useState` and the component:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { daysUntil, money, OPEN_STAGES } from '../../lib/pipeline';
import LeadCard from '../LeadCard';
import ChangePassword from '../ChangePassword';
```

Add state as the first line inside the component body (immediately after `export default function TodayTab({ leads, tags, onOpen, onSignOut }){`):

```jsx
  const [pwOpen, setPwOpen] = useState(false);
```

Replace the single sign-out button (line 25, `<button onClick={onSignOut} …>Sign out</button>`) with a stacked pair:

```jsx
        <div className="flex flex-col items-end gap-1 mt-1">
          <button onClick={onSignOut} className="dim text-xs font-semibold">Sign out</button>
          <button onClick={() => setPwOpen(true)} className="dim text-xs font-semibold">Change password</button>
        </div>
```

Add the modal render just before the component's final `</div>` (after the `{leads.length===0 && …}` line, line 49):

```jsx
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Sign in. On the Today tab:
- "Change password" appears under "Sign out".
- Clicking it opens the modal. Mismatched passwords → "Passwords do not match." A <8-char password → length error.
- A valid new password → "Password updated." Sign out, sign back in with the **new** password → works.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChangePassword.jsx src/components/tabs/TodayTab.jsx
git commit -m "Add in-app change-password for logged-in users

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Supabase configuration + DB migrations (user-run)

These steps run in the Supabase dashboard / SQL editor — they cannot be done from app code. The two `sql/` files are committed for the record and run conditionally based on the diagnostic.

**Files:**
- Create: `sql/2026-06-23_profiles_autocreate.sql`
- Create: `sql/2026-06-23_profiles_admin_read.sql`

- [ ] **Step 1: Write `sql/2026-06-23_profiles_autocreate.sql`**

```sql
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
```

- [ ] **Step 2: Write `sql/2026-06-23_profiles_admin_read.sql`**

```sql
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
```

- [ ] **Step 3: Commit the SQL files**

```bash
git add sql/2026-06-23_profiles_autocreate.sql sql/2026-06-23_profiles_admin_read.sql
git commit -m "Add profiles auto-create trigger + admin-read RLS migrations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Apply config in the Supabase dashboard** (manual — record completion here)

1. **Disable public sign-ups:** Authentication → Providers → Email → turn **off** "Allow new users to sign up". *(This is what enforces invite-only.)*
2. **Set the owner's password:** Authentication → Users → your user → set a password (so you can log in under the new system).
3. **Minimum password length:** Authentication → set a minimum (8+) to match the in-app check.
4. **Run `sql/2026-06-23_profiles_autocreate.sql`** in the SQL editor. If the diagnostic shows `on_auth_user_created` already exists, running it again is harmless (idempotent).
5. **Run `sql/2026-06-23_profiles_admin_read.sql`.** Run the step-0 diagnostic first; if an existing profiles SELECT policy already grants what you need, you may skip — otherwise run the rest.

- [ ] **Step 5: End-to-end verification**

1. In the dashboard, create a test user (Add user, email + password, auto-confirm).
2. SQL editor: `select id, email, role from public.profiles where email = '<test email>';` → a row exists with `role = 'member'` (confirms the trigger).
3. Sign in to the app as that test user → app loads, Stats tab shows no admin-only sections.
4. Try to self-register via the app/API → blocked (sign-ups disabled).
5. Delete the test user when done.

---

### Task 4: Update docs (CHANGELOG + README)

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: CHANGELOG — add under `## [Unreleased]`**

Add a `### Changed` line and a `### Removed` line:

```markdown
- **Auth switched to email + password.** Sign-in now uses email + password
  (`signInWithPassword`); accounts are created by an admin in the Supabase
  dashboard (invite-only), and logged-in reps can change their own password.
```
under Changed, and under Removed:
```markdown
- **Magic-link sign-in** (`signInWithOtp`) — replaced by email + password.
```

- [ ] **Step 2: README — replace the magic-link sign-in instructions**

Replace the line in the run/sign-in instructions that says to "sign in with your email" (magic link) with email + password, and add an admin note:

```markdown
   Open the URL it prints (usually http://localhost:5173) and sign in with your
   email and password. Accounts are created by an admin in the Supabase dashboard
   (Authentication → Users → Add user); there is no public sign-up.
```

Add to the README "Database hardening" / setup notes:

```markdown
## Auth (email + password)
- Sign-in is email + password. There is **no public sign-up** — disable it at
  Authentication → Providers → Email → "Allow new users to sign up".
- Add a rep: Authentication → Users → Add user (set email + a temporary password),
  then share it; the rep changes it in-app (Today → Change password).
- Make someone admin / set their name: `update public.profiles set role='admin',
  full_name='…' where email='…';`
- Reset a forgotten password: Authentication → Users → set a new password.
```

- [ ] **Step 3: Build (sanity) + commit**

Run: `npm run build`
Expected: `✓ built` (docs-only change; confirms nothing broke).

```bash
git add CHANGELOG.md README.md
git commit -m "Document email + password auth and dashboard provisioning

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §4.1 Login rewrite → Task 1. ✅
- §4.2 in-app change-password → Task 2. ✅
- §6 profiles trigger → Task 3 (`profiles_autocreate.sql`). ✅
- §6 profiles admin-read RLS → Task 3 (`profiles_admin_read.sql`). ✅
- §7 disable public sign-ups → Task 3 Step 4.1. ✅
- §7 min password length → Task 3 Step 4.3 + the 8-char check in Task 2. ✅
- §8 set owner password → Task 3 Step 4.2. ✅
- §5 add-a-rep / role+name via SQL → documented in Task 4 README. ✅
- Magic link removed → Task 1 (code) + Task 4 (docs). ✅

**Placeholder scan:** No TBD/TODO; all code shown in full; all commands explicit. ✅

**Type/name consistency:** `ChangePassword({ onClose })` defined in Task 2 Step 1 and consumed in Task 2 Step 2 render. `is_admin()` reused with the same signature as the existing leads RLS migration. `handle_new_user`/`on_auth_user_created` names consistent within Task 3. ✅
