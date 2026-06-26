# In-app tag management

**Date:** 2026-06-25
**Branch:** feature/light-retheme
**Status:** Approved design, ready for implementation plan

## Goal

Let users create, rename, recolor, and delete catalog tags from inside the app
(a "Tags" section in Settings), instead of editing the `tags` table by hand in
the Supabase dashboard. Reps already apply existing tags to leads; this adds
management of the catalog itself.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Scope | In-app tag management (create / rename / recolor / delete). |
| Who can manage | **Everyone** (any authenticated user). |
| Home | A new **"Tags" section in Settings** (`SettingsModal`). |
| Fields | `label` (required), `color` (preset swatches + optional custom hex), `emoji` (optional, ≤2 chars). |
| Delete behavior | **Cascade with a usage-count warning** — FK `on delete cascade` on `lead_tags`. |

## Locked assumptions

- Color must satisfy the existing DB constraint `tags_color_hex_chk`
  (`#abc` or `#abcabc`, case-insensitive; null allowed).
- Empty label is blocked; duplicate labels are allowed (YAGNI).
- Catalog stays live across the app via a realtime subscription on `tags`.
- Mobile-first (~420px); Settings modal is the container.

---

## Step 0 — Prerequisite: tags-write RLS + cascade (USER-RUN)

The `tags` table currently has **no INSERT/UPDATE/DELETE policies** — it is
read-only by design (dashboard-only creation). In-app management requires write
policies, and a clean delete requires the `lead_tags` FK to cascade.

**The user runs this** (manual migration workflow; no DB creds in the build env).
A new file `sql/2026-06-25_tags_manage_authenticated.sql`:

1. Enable RLS on `public.tags` (no-op if already on).
2. Create policies: INSERT / UPDATE / DELETE for role `authenticated`
   (`with check (true)` / `using (true)`), plus a SELECT-all policy if one isn't
   already present. Drop-and-recreate by name so the set is exact and the
   migration is re-runnable.
3. Inspect the `lead_tags.tag_id` foreign key; if it is not `on delete cascade`,
   drop and recreate it as `references public.tags(id) on delete cascade`.
4. Keep `tags_color_hex_chk` intact.

Include a diagnostic at the top (list current `tags` policies + the `lead_tags`
FK action) so the user can see the before-state. Document the file in
`sql/README.md`.

Until applied, the manager renders but writes return an RLS error — surfaced
inline (not a silent failure).

---

## Architecture

### `useTags` (upgraded) — `src/hooks/useTags.js`
- Still returns the tag **array** (existing consumers unchanged:
  `const tags = useTags()`).
- Adds a **realtime subscription** on the `tags` table (mirrors the `useLeads`
  `leads-rt` pattern) so create/edit/delete reflect everywhere live.
- Adds the same **auth-race hardening** used in `useProfiles`: refetch on
  `onAuthStateChange` when a session arrives.

### `src/lib/tags.js` (new) — write API + pure helpers
```
isHexColor(str) → boolean          // pure; matches tags_color_hex_chk
tagUsageCounts(leads) → Map<tag_id, number>   // pure; from lead.tagIds
createTag({ label, color, emoji }) → Promise<{ error }>
updateTag(id, patch)              → Promise<{ error }>
deleteTag(id)                     → Promise<{ error }>
```
The three writers are thin Supabase wrappers. The two helpers are pure and unit
-tested. `createTag`/`updateTag` send `color: null` when the field is blank.

### `TagManager.jsx` (new) — Settings UI
- Props: `tags: Tag[]`, `leads: Lead[]`.
- Calls `createTag`/`updateTag`/`deleteTag` from `lib/tags.js` directly.
- Holds local form/edit state and an inline error string.

### `SettingsModal` + `AppShell`
- `SettingsModal` gains a `<Section title="Tags">` hosting `<TagManager>`, and
  accepts `tags` + `leads` props.
- `AppShell` passes `tags={tags}` and `leads={data.leads}` to `SettingsModal`.

---

## TagManager UX

- **Existing tags** render as editable rows:
  emoji box · label input · color (preset swatches + custom-hex field) · live
  chip preview · delete (🗑).
- **Edit** is inline; commit on blur/Enter via `updateTag(id, patch)`. Invalid
  hex disables commit and shows a hint; empty label disables commit.
- **Add**: a "+ Add tag" row with the same fields → `createTag`. Clears on success.
- **Delete**: confirm dialog using `tagUsageCounts` —
  *"'VIP' is on 7 leads — remove it from all of them?"* → `deleteTag`; DB cascade
  clears the `lead_tags` links. Realtime refreshes the catalog.
- **Errors**: any writer error renders inline, e.g. *"Couldn't save — tag
  permissions may not be migrated yet."*

## Preset color palette

Reuse the brand-aligned set already in `pipeline.js` `AVATAR_PALETTE`
(`#2F6BF0 #0B8C95 #6E5BD6 #1B9E6E #C77A1A #3F5FA6 #B0476B`) plus a neutral
`#7C8AA6`, shown as tappable swatches; a custom-hex field covers anything else.

## Edge cases

- Empty/whitespace label → commit disabled.
- Emoji optional; trimmed to ≤2 chars.
- Invalid hex → commit disabled + hint; blank hex → stored as null (neutral chip).
- Delete usage count falls back to 0 if `leads` not yet loaded (still cascades).
- Write before Step 0 applied → inline RLS error, no crash.

## Testing

- **Vitest** (already configured) for pure helpers:
  - `isHexColor`: `#abc`, `#35C28A`, uppercase, `null`/`''` → false, `#xyz`,
    missing `#`, wrong length.
  - `tagUsageCounts`: counts across leads' `tagIds`, empty input → empty map.
- `TagManager` interactions + realtime + RLS-error path: manual verification by
  running the app.

## Out of scope (YAGNI)

- Inline "+ New tag" from the lead Tags sub-tab (Settings-only for now).
- Tag merge / reorder / per-tag usage analytics.
- Admin-only restrictions (explicitly chose "everyone").
- Soft-delete / archive.

## Files touched

- `sql/2026-06-25_tags_manage_authenticated.sql` (new, user-run) + `sql/README.md`.
- `src/lib/tags.js` (new).
- `src/hooks/useTags.js` (realtime + auth-race hardening).
- `src/components/TagManager.jsx` (new).
- `src/components/SettingsModal.jsx` (Tags section + props).
- `src/components/AppShell.jsx` (pass `tags` + `leads` to SettingsModal).
- `src/lib/__tests__/tags.test.js` (new).
