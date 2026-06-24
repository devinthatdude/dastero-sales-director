# Design — Lead Owner-Filter + Own-Delete

**Date:** 2026-06-23
**Status:** Approved (pending spec review)
**Scope:** Let any signed-in rep filter leads by owner, and let reps delete leads they own (admins can still delete any).

---

## 1. Goals

1. **Owner filter** — in the Leads tab, every signed-in rep can filter the board by owner ("go to each user's list"), combined with the existing text search.
2. **Own-delete** — a rep can delete leads they own; admins retain delete-any.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Filter UI | Inline owner dropdown beside the existing search box in the Leads tab (not a new tab). |
| Owner names | Sourced from `profiles`, now readable by all authenticated users; displayed via the existing `repName()` helper. |
| Delete rule | Owner **or** admin (`user_id = auth.uid() OR is_admin()`), in both UI and RLS. Reverses the prior admin-only-delete decision. |
| Lead visibility | Unchanged — shared board (all reps already see all leads). |

## 3. Why this shape

The leads are already fully loaded client-side (shared board), so the filter is pure client-side state — no new queries. The only backend change the filter needs is making `profiles` team-readable so the dropdown can show names. Own-delete is a deliberate reversal of the earlier admin-only rule, requiring a coordinated UI + RLS change so the button and the database agree.

## 4. Database migrations (user-run, committed to `sql/`)

### 4.1 `sql/2026-06-23_profiles_read_all.sql`
Replace the `profiles_select_self_or_admin` policy (from the prior migration) with read-all for authenticated users:
```sql
alter table public.profiles enable row level security;
drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);
```
This exposes name/email/role of all users to any signed-in rep — accepted (team CRM).

### 4.2 `sql/2026-06-23_leads_delete_own.sql`
Replace the admin-only delete policy with owner-or-admin. Reuses the existing `public.is_admin()` helper:
```sql
drop policy if exists leads_delete_admin on public.leads;
drop policy if exists leads_delete_own_or_admin on public.leads;
create policy leads_delete_own_or_admin on public.leads
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
```
Depends on `sql/2026-06-21_leads_rls_edit_own.sql` having been applied (it created `leads_delete_admin` and `is_admin()`). The `drop ... if exists` makes this safe regardless.

## 5. App components

### 5.1 `src/hooks/useProfiles.js`
Load profiles for **all** authenticated users (remove the `isAdmin` early-return gate). Signature becomes `useProfiles()` (no arg).

### 5.2 `src/components/AppShell.jsx`
Call `useProfiles()` instead of `useProfiles(isAdmin)`. `profiles` is already spread into `shared` and passed to tabs.

### 5.3 `src/components/tabs/LeadsTab.jsx`
- Receive `profiles` (already available via `shared`).
- Add local state `ownerId` (default `''` = all).
- Render a `<select>` beside the search input: first option "All owners" (`value=''`), then one option per teammate that owns at least one lead, sorted by name, value = `user_id`, label = `repName(profile)` (falling back to `Rep <id>` if no profile).
- Filtering: existing text filter **AND** `ownerId === '' || lead.user_id === ownerId`.

### 5.4 `src/components/LeadDetail.jsx`
- Receive `userId` (already provided by `useLeads` via the spread).
- Compute `canDelete = isAdmin || lead.user_id === userId`.
- Show the delete control when `canDelete` (currently `isAdmin` only). The `deleteLead` call is unchanged; RLS (4.2) authorizes it.

## 6. Data flow

- **Filter:** client-side only. `useProfiles()` provides names; LeadsTab derives the owner option list from leads + profiles; selecting an owner narrows the already-loaded list. No new network calls.
- **Delete:** owner taps delete → existing `deleteLead(id)` → RLS policy (4.2) permits it for owner/admin → realtime refresh removes the card.

## 7. Security considerations

- `profiles` read-all exposes emails/roles to all signed-in reps. Accepted; the board is already shared and these are colleagues. No external exposure (still `to authenticated`).
- Own-delete is enforced **server-side** by RLS (4.2), not just the hidden button — a rep cannot delete someone else's lead even via direct API calls.
- Lead *visibility* and *edit* rules are unchanged.

## 8. Out of scope (YAGNI)

- A separate "By Rep" tab/view (chose inline dropdown).
- Showing the owner name on each `LeadCard` (the filter + detail view suffice).
- Bulk delete, multi-owner selection, "unassigned" bucket beyond what falls out naturally.

## 9. Open items to confirm during implementation

- Confirm `sql/2026-06-21_leads_rls_edit_own.sql` has been applied (4.2 depends on it). If not, applying it is a prerequisite.
- Verify `LeadDetail` receives `userId` through the `{...data}` spread in `AppShell` (expected — `useLeads` returns it).
