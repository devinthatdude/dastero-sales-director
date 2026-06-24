# Lead Owner-Filter + Own-Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any signed-in rep filter leads by owner in the Leads tab, and let reps delete leads they own (admins keep delete-any).

**Architecture:** The filter is pure client-side state over the already-loaded shared lead list; it needs `profiles` readable by all users so the dropdown can show names. Own-delete is a coordinated UI + RLS change (button shown to owner-or-admin; database policy authorizes owner-or-admin).

**Tech Stack:** React 18, Vite 5, Tailwind v3, `@supabase/supabase-js` v2.

## Global Constraints

- Tailwind **v3** only — no v4 syntax.
- Every source file starts with: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- **No service-role key** anywhere in the repo.
- No test framework exists in this project. Each task's automated gate is `npm run build` (must succeed), followed by explicit manual verification. Do **not** add a test runner.
- Reuse existing CSS classes (`input`, `panel`, `surface`, `soft`, `dim`) from `src/index.css`.
- Reuse the existing `repName(p)` helper from `src/lib/pipeline.js` for owner display names.
- Commit after each task (trunk-based; end messages with the `Co-Authored-By` trailer used in this repo).

---

### Task 1: Load profiles for all signed-in users

**Files:**
- Modify (full rewrite): `src/hooks/useProfiles.js`
- Modify: `src/components/AppShell.jsx` (the `useProfiles` call)

**Interfaces:**
- Produces: `useProfiles()` (no argument) → array of `{ id, full_name, email, role }` for every profile the caller's RLS permits. After the Task 4 migration, that's all profiles for any authenticated user.

- [ ] **Step 1: Rewrite `src/hooks/useProfiles.js`**

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useProfiles(){
  const [profiles,setProfiles]=useState([]);
  useEffect(()=>{
    supabase.from('profiles').select('id,full_name,email,role').then(({data})=>setProfiles(data||[]));
  },[]);
  return profiles;
}
```

- [ ] **Step 2: Update the call in `src/components/AppShell.jsx`**

Replace this line:
```jsx
  const profiles=useProfiles(isAdmin);
```
with:
```jsx
  const profiles=useProfiles();
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in. Behavior is unchanged on screen yet (no UI consumes the broader list until Task 2). The check here is only that the app loads with no console errors and the Stats leaderboard (if you're admin) still shows names.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProfiles.js src/components/AppShell.jsx
git commit -m "Load profiles for all signed-in users (not just admins)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Owner filter in the Leads tab

**Files:**
- Modify: `src/components/tabs/LeadsTab.jsx`

**Interfaces:**
- Consumes: `profiles` (from `useProfiles()`, passed via `shared` in `AppShell`); `repName` from `../../lib/pipeline`.

- [ ] **Step 1: Add the `repName` import**

Replace line 4:
```jsx
import { money } from '../../lib/pipeline';
```
with:
```jsx
import { money, repName } from '../../lib/pipeline';
```

- [ ] **Step 2: Add `profiles` to the props and the filter state/logic**

Replace the component signature line:
```jsx
export default function LeadsTab({ leads, tags, isAdmin, onOpen }){
  const [q,setQ]=useState('');
  const filtered=leads.filter(l=>(`${l.company} ${l.contact_name||''} ${l.industry||''}`).toLowerCase().includes(q.toLowerCase()));
```
with:
```jsx
export default function LeadsTab({ leads, tags, isAdmin, profiles=[], onOpen }){
  const [q,setQ]=useState('');
  const [ownerId,setOwnerId]=useState('');

  // Owners that actually own at least one lead, named via repName (falls back to "Rep <id>").
  const owners=[...new Set(leads.map(l=>l.user_id).filter(Boolean))]
    .map(id=>({ id, name: repName(profiles.find(p=>p.id===id) || { id }) }))
    .sort((a,b)=>a.name.localeCompare(b.name));

  const filtered=leads.filter(l=>{
    const matchesText=(`${l.company} ${l.contact_name||''} ${l.industry||''}`).toLowerCase().includes(q.toLowerCase());
    const matchesOwner=ownerId==='' || l.user_id===ownerId;
    return matchesText && matchesOwner;
  });
```

- [ ] **Step 3: Replace the search input with a search + owner-filter row**

Replace this line:
```jsx
      <input className="input mb-4" placeholder="Search company, contact, industry…" value={q} onChange={e=>setQ(e.target.value)} />
```
with:
```jsx
      <div className="flex gap-2 mb-4">
        <input className="input flex-1" placeholder="Search company, contact, industry…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="input" style={{maxWidth:'10rem'}} value={ownerId} onChange={e=>setOwnerId(e.target.value)}>
          <option value="">All owners</option>
          {owners.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, sign in, open the **Leads** tab:
- An "All owners" dropdown sits next to the search box, listing the reps who own leads (by name).
- Selecting a rep narrows the list to that rep's leads. "All owners" restores the full list.
- Typing in search + selecting an owner applies both filters together.

- [ ] **Step 6: Commit**

```bash
git add src/components/tabs/LeadsTab.jsx
git commit -m "Add owner filter to the Leads tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Show delete to the lead's owner (UI)

**Files:**
- Modify: `src/components/LeadDetail.jsx` (4 edits)

**Interfaces:**
- Consumes: `userId` (provided by `useLeads` and spread into `LeadDetail` via `{...data}` in `AppShell`).

- [ ] **Step 1: Destructure `userId` in the `LeadDetail` props**

Replace line 54:
```jsx
export default function LeadDetail({ leadId, leads, tags, profiles=[], isAdmin, addLead, updateLead, deleteLead, setLeadTags, onClose }){
```
with:
```jsx
export default function LeadDetail({ leadId, leads, tags, profiles=[], isAdmin, userId, addLead, updateLead, deleteLead, setLeadTags, onClose }){
```

- [ ] **Step 2: Pass `canDelete` instead of `isAdmin` to `Info`**

In the `sub==='info'` render line (line 100), replace `isAdmin={isAdmin}` with `canDelete={isAdmin || existing.user_id===userId}`. The full line becomes:
```jsx
          {sub==='info'   && existing && <Info lead={existing} tags={tags} profiles={profiles} u={u} setStage={setStage} canDelete={isAdmin || existing.user_id===userId} onDelete={()=>{deleteLead(existing.id);onClose();}} onPrint={()=>printDealSheet(existing,tags)} />}
```

- [ ] **Step 3: Update the `Info` subcomponent signature**

Replace line 116:
```jsx
function Info({lead,tags,profiles,u,setStage,isAdmin,onDelete,onPrint}){
```
with:
```jsx
function Info({lead,tags,profiles,u,setStage,canDelete,onDelete,onPrint}){
```

- [ ] **Step 4: Gate the delete button on `canDelete`**

Replace line 153:
```jsx
      {isAdmin && <button onClick={onDelete} className="w-full text-sm font-semibold py-2.5 rounded-xl" style={{color:'#F0584E',background:'rgba(240,88,78,.1)'}}>Delete lead</button>}
```
with:
```jsx
      {canDelete && <button onClick={onDelete} className="w-full text-sm font-semibold py-2.5 rounded-xl" style={{color:'#F0584E',background:'rgba(240,88,78,.1)'}}>Delete lead</button>}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built` with no errors.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, sign in, open a lead you **own** → the "Delete lead" button appears on the Info tab. Open a lead owned by **someone else** (and you are not admin) → the button is absent. As admin → the button shows on any lead. (Server-side enforcement is Task 4.)

- [ ] **Step 7: Commit**

```bash
git add src/components/LeadDetail.jsx
git commit -m "Show delete to a lead's owner, not only admins

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: RLS migrations (user-run)

**Files:**
- Create: `sql/2026-06-23_profiles_read_all.sql`
- Create: `sql/2026-06-23_leads_delete_own.sql`

- [ ] **Step 1: Write `sql/2026-06-23_profiles_read_all.sql`**

```sql
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
```

- [ ] **Step 2: Write `sql/2026-06-23_leads_delete_own.sql`**

```sql
-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- Allow a rep to delete leads they own; admins can still delete any. Replaces
-- the admin-only delete policy. Reuses public.is_admin() from the leads RLS
-- migration (sql/2026-06-21_leads_rls_edit_own.sql) — apply that first if you
-- haven't. Idempotent.
-- HOW TO APPLY: Supabase → SQL editor → Run.

drop policy if exists leads_delete_admin on public.leads;
drop policy if exists leads_delete_own_or_admin on public.leads;
create policy leads_delete_own_or_admin on public.leads
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
```

- [ ] **Step 3: Commit the SQL files**

```bash
git add sql/2026-06-23_profiles_read_all.sql sql/2026-06-23_leads_delete_own.sql
git commit -m "Add migrations: profiles read-all + leads delete own-or-admin

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Apply in Supabase (manual — record completion)**

1. Run `sql/2026-06-23_profiles_read_all.sql` in the SQL editor → "Success. No rows returned."
2. Run `sql/2026-06-23_leads_delete_own.sql` → "Success. No rows returned." (If it errors that `public.is_admin()` does not exist, run `sql/2026-06-21_leads_rls_edit_own.sql` first, then re-run.)

- [ ] **Step 5: End-to-end verification**

1. As a **non-admin** rep: the Leads-tab owner dropdown now lists teammate names (not "Rep <id>"). Deleting your **own** lead succeeds; attempting to delete a teammate's lead is blocked by RLS (the button isn't shown, and a direct API delete is denied).
2. As **admin**: can delete any lead.

---

### Task 5: Update docs

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: CHANGELOG — add under `## [Unreleased]` → `### Added`**

```markdown
- **Leads owner filter.** The Leads tab has an "owner" dropdown to view any
  teammate's leads, alongside the text search (`LeadsTab.jsx`).
- **Reps can delete their own leads.** The delete button now shows for a lead's
  owner (admins keep delete-any), enforced by RLS
  (`sql/2026-06-23_leads_delete_own.sql`).
```

And under `### Changed`:
```markdown
- **Profiles are readable by all signed-in users** (was self-or-admin) so the
  owner filter can show teammate names (`sql/2026-06-23_profiles_read_all.sql`).
```

- [ ] **Step 2: README — append to the "Database hardening" `sql/` list**

```markdown
- `sql/2026-06-23_profiles_read_all.sql` — profiles readable by all signed-in users (for the owner filter).
- `sql/2026-06-23_leads_delete_own.sql` — leads delete: owner-or-admin.
```

- [ ] **Step 3: Build (sanity) + commit**

Run: `npm run build` → `✓ built`.

```bash
git add CHANGELOG.md README.md
git commit -m "Document owner filter, own-delete, and the new migrations

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §4.1 profiles read-all → Task 4 (`profiles_read_all.sql`). ✅
- §4.2 leads delete own-or-admin → Task 4 (`leads_delete_own.sql`). ✅
- §5.1 useProfiles loads for all → Task 1. ✅
- §5.2 AppShell `useProfiles()` → Task 1. ✅
- §5.3 LeadsTab owner dropdown + combined filter → Task 2. ✅
- §5.4 LeadDetail delete for owner-or-admin → Task 3. ✅
- §6 data flow (client-side filter; delete via existing call + RLS) → Tasks 2/3/4. ✅
- §9 dependency on `2026-06-21_leads_rls_edit_own.sql` → noted in Task 4 Step 2 + Step 4.2. ✅

**Placeholder scan:** No TBD/TODO; all code shown in full; commands explicit. ✅

**Type/name consistency:** `canDelete` introduced in Task 3 Step 2 (render), consumed in Step 3 (signature) and Step 4 (gate). `owners`/`ownerId` defined and used within Task 2. `useProfiles()` (no arg) defined in Task 1, called in Task 1. `repName` imported in Task 2 Step 1, used in Step 2. `is_admin()` reused in Task 4 matches the existing helper. ✅
