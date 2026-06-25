# Pipeline tab — owner grouping + org-chart tree

**Date:** 2026-06-25
**Branch:** feature/light-retheme
**Status:** Approved design, ready for implementation plan

## Goal

Add two new ways to read the existing Pipeline tab, without losing the current
weighted-forecast / by-stage view:

1. **By Owner** — leads grouped by the user that owns them.
2. **Tree** — an SVG org-chart that starts at "Dastero Tech" and branches to each
   user, then to each lead that user owns.

A segmented control switches between the three lenses on a single tab.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Relationship to existing view | **Additive** — view switcher: `By Stage` · `By Owner` · `Tree`. Stage view untouched. |
| Tree rendering | **SVG org-chart** (node-link), fit-to-width default, drag-pan + pinch/scroll-zoom, collapsible owner nodes. |
| Lead scope | **Open deals by default + a "Show closed" toggle** (option C). |
| Owner identification | Requires the profiles read-access fix (Step 0) — prerequisite. |
| Tree implementation | **Custom + light** — hand-rolled layout + pan/zoom, no new heavy dependency. |
| Tests | **Add Vitest**; unit-test pure logic. |

## Locked assumptions

- **Shared board:** every signed-in user sees all owners' branches (matches the
  existing `leads_select_authenticated using (true)` RLS model).
- Tap a **lead node / row** → opens that lead's detail via the existing `onOpen`.
- Node contents: owner node = name + deal count + total value; lead node = company
  + value, tinted by stage color (closed nodes dimmed when shown).
- **Unassigned bucket:** leads with a null or unresolvable `user_id` group under an
  "Unassigned" branch rather than disappearing.
- Mobile-first: layout target ~420px wide.

---

## Step 0 — Prerequisite: profiles read-access (USER-RUN)

Owner *names* come from `repName(profile)`, fed by `useProfiles()`, which relies on
RLS. If production still has the old `profiles_select_self_or_admin` policy, a
non-admin reads only their own row → every teammate branch is labeled `Rep ####`
and the feature's core value is lost. This also is the root cause of the reported
"owner tags not working" bug.

**The user runs this (manual migration workflow, no DB creds in the build env):**

1. Supabase → SQL editor, diagnostic:
   ```sql
   select policyname, qual
   from pg_policies
   where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT';
   ```
2. If it shows `profiles_select_self_or_admin` / `(id = auth.uid()) OR is_admin()`,
   apply `sql/2026-06-23_profiles_read_all.sql` (idempotent).
3. If it already shows `profiles_select_authenticated` / `true`, RLS is fine —
   the cause is the client race (hardened in this work, see §6).

**Repo hygiene (Claude-run):** delete or clearly supersede
`sql/2026-06-23_profiles_admin_read.sql` so a future manual apply can't silently
re-impose the restrictive policy. Add a note in the SQL file or a short README in
`sql/` documenting that `profiles_read_all` is the current intended policy.

---

## Architecture

One tab, three lenses. `PipelineTab` owns two pieces of local UI state:

- `view`: `'stage' | 'owner' | 'tree'` — default `'stage'`.
- `showClosed`: boolean — default `false`. Rendered only for `owner`/`tree`
  (stage view is already open-only).

Props widen from `{ leads }` to also consume `{ profiles, userId, onOpen }` — all
already present in the `shared` object passed by `AppShell`.

```
PipelineTab
├─ <SegmentedControl> view + [Show closed]
├─ view==='stage'  → existing forecast + by-stage markup (unchanged)
├─ view==='owner'  → <OwnerGroups groups=… onOpen=… />
└─ view==='tree'   → <OrgChartTree groups=… onOpen=… />
```

### Pure helper — single source of truth (`lib/pipeline.js`)

```
groupByOwner(leads, profiles, { includeClosed }) → OwnerGroup[]

OwnerGroup = {
  owner: profile | null,
  isUnassigned: boolean,
  isYou: boolean,
  count, value,          // filtered by includeClosed
  openCount, openValue,  // always open-only, for the badge
  leads: Lead[],         // filtered, sorted by urgency/value
}
```

- Sorted by total `value` desc.
- **Your own group pinned first** with an `isYou` flag → "You" badge.
- **Unassigned** group always last.
- When `includeClosed` is false, closed leads are excluded and any owner left with
  zero leads is dropped.

This helper is consumed by **both** new views, so grouping logic lives in exactly
one tested place.

### Tree layout — pure function (`lib/treeLayout.js`)

```
layoutTree(groups, opts) → {
  nodes: [{ id, kind:'root'|'owner'|'lead', x, y, w, h, label, value, color, …}],
  edges: [{ from, to }],
  width, height,
}
```

A small tidy-tree layout: depth → y, leaf order → x. Pure and unit-testable; no
external dependency. Collapsed owners contribute no lead nodes.

---

## Components

### `OwnerGroups` (By Owner view)
Collapsible panel per group:
- Header: avatar initials + `repName` (+ "You" badge) + `N deals · $value` +
  thin stage-mix bar.
- Expanded: compact lead rows (company · stage pill · value · urgency), tap →
  `onOpen(lead.id)`. Reuses existing pill/card styling from `LeadCard`/`LeadsTab`.
- Default expanded for "You", collapsed for others (keeps it short on mobile).

### `OrgChartTree` (Tree view)
- SVG canvas sized to `layoutTree` output, wrapped in a pan/zoom container.
- **Interaction:** fit-to-width on mount; drag to pan; pinch / wheel to zoom
  (clamped min/max scale); tap **owner node** → collapse/expand its leads; tap
  **lead node** → `onOpen(lead.id)`. A "Reset view" / fit button.
- **Nodes:** root "Dastero Tech"; owner = name + count + value; lead = company +
  value tinted by stage color, dimmed if closed.
- Implemented with pointer events + an SVG `transform={translate scale}`; layout
  memoized on `(groups, collapsedSet)`.

---

## Edge cases

- **No leads** → friendly empty state (mirror the stage view's empty copy).
- **Owner with only closed deals** while "Show closed" off → group hidden.
- **Solo user** → root + one branch; valid.
- **profiles not yet loaded / race** → names fall back to `Rep ####` and recover
  on reload; hardened in §6 so it self-heals.
- **Large book per rep** → collapse owner nodes (the pressure valve); layout
  memoized to avoid recompute on pan/zoom.

## §6 — Hardening: `useProfiles` race (related latent bug)

`useProfiles` (and `useTags`) fetch on mount with `[]` deps and never refetch on
auth-state change, unlike `useAuth`/`useLeads`. If the fetch loses the
session-hydration race on a cold load, profiles stays empty until a full reload.
Fix: subscribe to `supabase.auth.onAuthStateChange` and refetch when a session
arrives (and on `SIGNED_IN`), so owner names self-heal without a manual reload.

## Testing

- **Add Vitest** (`vitest` + `@testing-library/react` optional) and a `test`
  script. Vite-native, minimal config.
- Unit tests for the pure logic:
  - `groupByOwner`: sorting, "You" pinning, Unassigned bucketing, open vs.
    include-closed filtering, empty input.
  - `layoutTree`: node/edge counts, collapsed owners omit leads, deterministic
    coordinates for a small fixture.
- SVG interactions (pan/zoom/tap) and visual polish: verified by running the app
  (the `run` / `verify` skills), not automated.

## Out of scope (YAGNI)

- Drag-to-reassign ownership in the tree.
- Persisting the selected view across sessions (default `stage` each load; can be
  added later if wanted).
- Server-side aggregation — grouping is cheap on the client at current data sizes.

## Files touched

- `sql/` — supersede `2026-06-23_profiles_admin_read.sql`; doc the intended policy.
- `src/lib/pipeline.js` — add `groupByOwner`.
- `src/lib/treeLayout.js` — new, `layoutTree`.
- `src/components/tabs/PipelineTab.jsx` — segmented control, view state, wire views.
- `src/components/tabs/pipeline/OwnerGroups.jsx` — new.
- `src/components/tabs/pipeline/OrgChartTree.jsx` — new.
- `src/components/AppShell.jsx` — (already passes profiles/userId/onOpen via shared;
  confirm PipelineTab receives them).
- `src/hooks/useProfiles.js` — refetch on auth-state change.
- `package.json` — add Vitest + `test` script.
- tests under `src/lib/__tests__/` (or co-located `*.test.js`).
