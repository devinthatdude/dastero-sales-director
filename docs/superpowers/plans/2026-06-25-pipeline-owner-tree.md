# Pipeline Owner Grouping + Org-Chart Tree — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new lenses to the Pipeline tab — leads grouped by owner, and an SVG org-chart tree (Dastero Tech → users → their leads) — via a `By Stage · By Owner · Tree` switcher, without disturbing the existing stage/forecast view.

**Architecture:** A pure `groupByOwner` helper is the single source of truth for both new views. A pure `layoutTree` helper computes node/edge coordinates for the tree. `PipelineTab` holds `view` + `showClosed` state and renders one of three lenses. `OwnerGroups` and `OrgChartTree` are presentational. The profiles read-access prerequisite is a user-run SQL step; a related client race in `useProfiles` is hardened in code.

**Tech Stack:** React 18, Vite 5, Tailwind v3, Supabase JS v2, Vitest (added in Task 1). Custom SVG + pointer-event pan/zoom — no new runtime dependency.

## Global Constraints

- Mobile-first; layout target ~420px wide. App container is `max-w-[420px]`.
- Shared board: all signed-in users see all owners (RLS `leads_select_authenticated using (true)`).
- Tap a lead (row or node) → `onOpen(leadId)` (existing detail flow).
- Closed stages are exactly `['closed_won','closed_lost']`; open stages are `OPEN_STAGES` from `src/lib/pipeline.js`.
- Owner display name always via `repName(profile)` (fallback `Rep ####`); never render a raw id.
- No new runtime dependency for the tree (custom pan/zoom). Vitest is devDependency only.
- License header line on every new source file: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- Commit after each task. Do NOT push (pushes are interactive by the user).

---

## Task 0: Repo hygiene — supersede the wrong profiles policy

**Files:**
- Modify: `sql/2026-06-23_profiles_admin_read.sql`
- Create: `sql/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing code-level. Documents that `profiles_select_authenticated` (read-all) is the intended live policy.

- [ ] **Step 1: Neutralize the superseded migration**

Replace the entire contents of `sql/2026-06-23_profiles_admin_read.sql` with a stop note (do NOT delete the file — keeps git history legible and prevents a stray re-apply):

```sql
-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- SUPERSEDED — DO NOT RUN.
-- This migration created `profiles_select_self_or_admin`, which restricts a
-- non-admin to reading only their own profile row. That breaks owner-name
-- resolution across the shared board (owner tags / Pipeline owner+tree views).
-- The intended current policy is `profiles_select_authenticated` (read-all for
-- authenticated users) in sql/2026-06-23_profiles_read_all.sql. Apply that one.
```

- [ ] **Step 2: Document the intended policy**

Create `sql/README.md`:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add sql/2026-06-23_profiles_admin_read.sql sql/README.md
git commit -m "chore(sql): supersede restrictive profiles policy; document read-all as intended"
```

---

## Task 1: Add Vitest test tooling

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/lib/__tests__/smoke.test.js`

**Interfaces:**
- Produces: `npm test` runs Vitest in run-once mode; `npm run test:watch` for watch.

- [ ] **Step 1: Add the failing test (no runner yet)**

Create `src/lib/__tests__/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('test tooling', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run it to confirm the runner is missing**

Run: `npm test`
Expected: FAIL — `vitest` not found / unknown script.

- [ ] **Step 3: Install Vitest and add scripts**

```bash
npm install -D vitest@^2.0.0
```

Add to `package.json` `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Add minimal config**

Create `vitest.config.js`:

```js
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/lib/__tests__/smoke.test.js
git commit -m "test: add Vitest runner with smoke test"
```

---

## Task 2: `groupByOwner` pure helper

**Files:**
- Modify: `src/lib/pipeline.js`
- Test: `src/lib/__tests__/groupByOwner.test.js`

**Interfaces:**
- Consumes: `STAGES`/stage ids from `pipeline.js` (closed = `closed_won`,`closed_lost`).
- Produces:
  ```
  groupByOwner(leads, profiles, { includeClosed=false, currentUserId=null }) → OwnerGroup[]
  OwnerGroup = { owner: profile|null, isUnassigned, isYou, count, value,
                 openCount, openValue, leads: Lead[] }
  ```
  Sorted: non-unassigned before unassigned; `isYou` first; then `value` desc.
  Groups with zero visible leads are dropped. `leads` sorted by `value` desc.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/groupByOwner.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { groupByOwner } from '../pipeline';

const profiles = [
  { id: 'u1', full_name: 'Dane Swallows' },
  { id: 'u2', full_name: 'Maria Lopez' },
];
const leads = [
  { id: 1, user_id: 'u1', stage: 'qualified',   value: 25000 },
  { id: 2, user_id: 'u1', stage: 'negotiating',  value: 40000 },
  { id: 3, user_id: 'u2', stage: 'prospect',     value: 12000 },
  { id: 4, user_id: 'u2', stage: 'closed_won',   value: 90000 },
  { id: 5, user_id: null,  stage: 'prospect',    value: 5000  },
];

describe('groupByOwner', () => {
  it('groups open leads by owner, drops closed by default', () => {
    const g = groupByOwner(leads, profiles, { currentUserId: 'u2' });
    // u1: 25k+40k=65k (2), u2 open: 12k (1, closed_won excluded), unassigned: 5k (1)
    const byName = Object.fromEntries(g.map(x => [x.isUnassigned ? 'UN' : x.owner.full_name, x]));
    expect(byName['Dane Swallows'].value).toBe(65000);
    expect(byName['Maria Lopez'].value).toBe(12000);   // closed excluded
    expect(byName['Maria Lopez'].leads).toHaveLength(1);
    expect(byName['UN'].isUnassigned).toBe(true);
  });

  it('pins the current user first and unassigned last', () => {
    const g = groupByOwner(leads, profiles, { currentUserId: 'u2' });
    expect(g[0].isYou).toBe(true);              // Maria pinned despite lower value
    expect(g[g.length - 1].isUnassigned).toBe(true);
  });

  it('includes closed leads and keeps openValue separate when includeClosed', () => {
    const g = groupByOwner(leads, profiles, { includeClosed: true, currentUserId: 'u1' });
    const maria = g.find(x => !x.isUnassigned && x.owner.id === 'u2');
    expect(maria.value).toBe(102000);   // 12k + 90k closed
    expect(maria.openValue).toBe(12000); // open-only badge value
    expect(maria.count).toBe(2);
  });

  it('returns [] for no leads', () => {
    expect(groupByOwner([], profiles, {})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- groupByOwner`
Expected: FAIL — `groupByOwner is not a function`.

- [ ] **Step 3: Implement `groupByOwner`**

Append to `src/lib/pipeline.js`:

```js
// Group leads by owning user for the Pipeline "By Owner" and "Tree" views.
// Single source of truth for both. openCount/openValue always reflect open
// deals (for the badge); count/value/leads honor includeClosed.
export const CLOSED_STAGES = ['closed_won', 'closed_lost'];

export function groupByOwner(leads, profiles, { includeClosed = false, currentUserId = null } = {}) {
  const profileById = new Map((profiles || []).map(p => [p.id, p]));
  const groups = new Map(); // key: user_id | '__unassigned__'

  for (const lead of leads || []) {
    const key = lead.user_id || '__unassigned__';
    if (!groups.has(key)) {
      groups.set(key, {
        owner: lead.user_id ? (profileById.get(lead.user_id) || null) : null,
        isUnassigned: !lead.user_id,
        isYou: !!currentUserId && lead.user_id === currentUserId,
        count: 0, value: 0, openCount: 0, openValue: 0, leads: [],
      });
    }
    const g = groups.get(key);
    const v = Number(lead.value) || 0;
    const isClosed = CLOSED_STAGES.includes(lead.stage);
    if (!isClosed) { g.openCount++; g.openValue += v; }
    if (includeClosed || !isClosed) { g.count++; g.value += v; g.leads.push(lead); }
  }

  const list = [...groups.values()].filter(g => g.leads.length > 0);
  list.sort((a, b) => {
    if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? 1 : -1;
    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
    return b.value - a.value;
  });
  for (const g of list) g.leads.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  return list;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- groupByOwner`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline.js src/lib/__tests__/groupByOwner.test.js
git commit -m "feat(pipeline): add groupByOwner helper for owner/tree views"
```

---

## Task 3: `layoutTree` pure helper

**Files:**
- Create: `src/lib/treeLayout.js`
- Test: `src/lib/__tests__/treeLayout.test.js`

**Interfaces:**
- Consumes: `OwnerGroup[]` from `groupByOwner`.
- Produces:
  ```
  layoutTree(groups, { collapsed=new Set() }) → {
    nodes: Node[], edges: {from,to}[], width, height
  }
  Node = { id, kind:'root'|'owner'|'lead', x, y, w, h, label, sublabel?, value?,
           color?, ownerId?, leadId?, closed?, collapsed? }
  ```
  `id`s: root `'root'`; owner `'owner:<ownerId>'`; lead `'lead:<leadId>'`.
  `ownerId` = `owner.id` or `'__unassigned__'`. Collapsed owners contribute no
  lead nodes/edges. `x,y` are top-left; `width/height` bound the whole canvas.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/treeLayout.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { layoutTree } from '../treeLayout';

const groups = [
  { owner: { id: 'u1', full_name: 'Dane' }, isUnassigned: false, isYou: true,
    count: 2, value: 65000, openCount: 2, openValue: 65000,
    leads: [ { id: 1, company: 'Acme', value: 25000, stage: 'qualified' },
             { id: 2, company: 'Globex', value: 40000, stage: 'negotiating' } ] },
  { owner: null, isUnassigned: true, isYou: false,
    count: 1, value: 5000, openCount: 1, openValue: 5000,
    leads: [ { id: 5, company: 'NoOwner', value: 5000, stage: 'prospect' } ] },
];

describe('layoutTree', () => {
  it('produces root + owners + leads with connecting edges', () => {
    const { nodes, edges } = layoutTree(groups, {});
    expect(nodes.filter(n => n.kind === 'root')).toHaveLength(1);
    expect(nodes.filter(n => n.kind === 'owner')).toHaveLength(2);
    expect(nodes.filter(n => n.kind === 'lead')).toHaveLength(3);
    // edges: root→2 owners + owners→3 leads = 5
    expect(edges).toHaveLength(5);
  });

  it('omits lead nodes for collapsed owners', () => {
    const { nodes, edges } = layoutTree(groups, { collapsed: new Set(['u1']) });
    expect(nodes.filter(n => n.kind === 'lead')).toHaveLength(1); // only unassigned's
    expect(edges).toHaveLength(3); // root→2 owners + 1 lead edge
    const dane = nodes.find(n => n.ownerId === 'u1');
    expect(dane.collapsed).toBe(true);
  });

  it('reports a positive bounding box', () => {
    const { width, height } = layoutTree(groups, {});
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- treeLayout`
Expected: FAIL — cannot find module `../treeLayout`.

- [ ] **Step 3: Implement `layoutTree`**

Create `src/lib/treeLayout.js`:

```js
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Pure tidy-tree layout for the Pipeline org chart: root → owners → leads.
// Leaves are laid out left-to-right; parents center over their children.
import { STAGES, CLOSED_STAGES, money, repName } from './pipeline';

const ROOT = { w: 150, h: 46 };
const OWNER = { w: 138, h: 50 };
const LEAF = { w: 124, h: 42 };
const H_GAP = 18;   // gap between adjacent leaf columns
const V_GAP = 70;   // vertical gap between levels
const PAD = 8;

const stageColor = (id) => STAGES.find(s => s.id === id)?.color || '#92A0B8';
const ownerKey = (g, i) => (g.isUnassigned ? '__unassigned__' : (g.owner?.id || `owner-${i}`));

export function layoutTree(groups, { collapsed = new Set() } = {}) {
  const col = LEAF.w + H_GAP;
  let cursor = 0; // next free leaf column index
  const nodes = [];
  const edges = [];

  const yOwner = ROOT.h + V_GAP;
  const yLeaf = yOwner + OWNER.h + V_GAP;

  (groups || []).forEach((g, i) => {
    const oid = ownerKey(g, i);
    const isCollapsed = collapsed.has(oid);
    const leaves = isCollapsed ? [] : g.leads;

    const leafXs = leaves.map((lead) => {
      const x = cursor * col;
      cursor++;
      return { lead, x };
    });

    const ownerCenterX = leafXs.length
      ? (leafXs[0].x + leafXs[leafXs.length - 1].x + LEAF.w) / 2
      : (cursor++ * col) + LEAF.w / 2;

    const ownerX = ownerCenterX - OWNER.w / 2;
    nodes.push({
      id: `owner:${oid}`, kind: 'owner', ownerId: oid,
      x: ownerX, y: yOwner, w: OWNER.w, h: OWNER.h,
      label: g.isUnassigned ? 'Unassigned' : repName(g.owner),
      sublabel: `${g.count} · ${money(g.value)}`,
      isYou: g.isYou, collapsed: isCollapsed,
    });
    edges.push({ from: 'root', to: `owner:${oid}` });

    leafXs.forEach(({ lead, x }) => {
      const closed = CLOSED_STAGES.includes(lead.stage);
      nodes.push({
        id: `lead:${lead.id}`, kind: 'lead', leadId: lead.id,
        x, y: yLeaf, w: LEAF.w, h: LEAF.h,
        label: lead.company || '(no name)', value: lead.value,
        color: stageColor(lead.stage), closed,
      });
      edges.push({ from: `owner:${oid}`, to: `lead:${lead.id}` });
    });
  });

  const contentW = Math.max(col, cursor * col - H_GAP);
  const rootX = contentW / 2 - ROOT.w / 2;
  nodes.unshift({
    id: 'root', kind: 'root', x: rootX, y: 0, w: ROOT.w, h: ROOT.h,
    label: 'Dastero Tech',
  });

  // shift everything by PAD so nothing touches the edge
  for (const n of nodes) { n.x += PAD; n.y += PAD; }

  return { nodes, edges, width: contentW + PAD * 2, height: yLeaf + LEAF.h + PAD * 2 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- treeLayout`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/treeLayout.js src/lib/__tests__/treeLayout.test.js
git commit -m "feat(pipeline): add pure layoutTree helper for org chart"
```

---

## Task 4: Harden `useProfiles` against the auth-hydration race

**Files:**
- Modify: `src/hooks/useProfiles.js`

**Interfaces:**
- Consumes: `supabase` client.
- Produces: same return (`profile[]`), but refetches when an auth session arrives.

Verification is manual (no React test lib installed); the change is small and the
behavior is observable in the app (owner names resolve without a hard reload).

- [ ] **Step 1: Rewrite the hook to refetch on auth-state change**

Replace the body of `src/hooks/useProfiles.js`:

```js
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Profiles power owner-name resolution across the shared board. The initial
// fetch can lose the race against session hydration on a cold load, so we also
// refetch whenever the auth state settles — names then resolve without a reload.
export function useProfiles() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      supabase.from('profiles').select('id,full_name,email,role')
        .then(({ data }) => { if (active) setProfiles(data || []); });

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) load();
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return profiles;
}
```

- [ ] **Step 2: Verify build is clean**

Run: `npm run build`
Expected: build succeeds, no new warnings about `useProfiles`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProfiles.js
git commit -m "fix(profiles): refetch on auth-state change so owner names self-heal"
```

---

## Task 5: `OwnerGroups` — the "By Owner" view

**Files:**
- Create: `src/components/tabs/pipeline/OwnerGroups.jsx`

**Interfaces:**
- Consumes: `groups: OwnerGroup[]` (from `groupByOwner`), `onOpen(leadId)`.
- Produces: `<OwnerGroups groups onOpen />` default export.

Verification: build + manual run (visual component).

- [ ] **Step 1: Implement the component**

Create `src/components/tabs/pipeline/OwnerGroups.jsx`:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { STAGES, money, repName, initials, avatarColor, urgency, TONE } from '../../../lib/pipeline';

const stageColor = (id) => STAGES.find(s => s.id === id)?.color || '#92A0B8';

function LeadRow({ lead, onOpen }) {
  const u = urgency(lead);
  return (
    <button onClick={() => onOpen(lead.id)}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#F4F7FC]">
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: stageColor(lead.stage) }} />
      <span className="font-semibold text-[13px] truncate flex-1">{lead.company || '(no name)'}</span>
      <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: TONE[u.tone] }}>{u.label}</span>
      <span className="mono text-[12.5px] font-bold whitespace-nowrap">{money(lead.value)}</span>
    </button>
  );
}

function OwnerPanel({ group, defaultOpen, onOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const name = group.isUnassigned ? 'Unassigned' : repName(group.owner);
  const seed = group.isUnassigned ? '—' : (group.owner?.id || name);
  return (
    <div className="surface rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-3.5 py-3">
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-none"
          style={{ background: avatarColor(seed) }}>{initials(name)}</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="font-bold text-[14px] truncate flex items-center gap-1.5">
            {name}
            {group.isYou && <span className="text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(47,107,240,.12)', color: '#2F6BF0' }}>You</span>}
          </span>
          <span className="text-[11px] soft block">{group.count} deal{group.count !== 1 ? 's' : ''} · {money(group.value)}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="dim flex-none transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open && <div className="px-1.5 pb-1.5 flex flex-col gap-0.5">
        {group.leads.map(l => <LeadRow key={l.id} lead={l} onOpen={onOpen} />)}
      </div>}
    </div>
  );
}

export default function OwnerGroups({ groups, onOpen }) {
  if (!groups.length) return <div className="dim text-sm text-center py-10">No deals to group yet — add one with +.</div>;
  return (
    <div className="flex flex-col gap-3 pt-1">
      {groups.map((g, i) => (
        <OwnerPanel key={g.isUnassigned ? '__unassigned__' : (g.owner?.id || i)}
          group={g} defaultOpen={g.isYou} onOpen={onOpen} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/tabs/pipeline/OwnerGroups.jsx
git commit -m "feat(pipeline): add By Owner grouped view"
```

---

## Task 6: `OrgChartTree` — the SVG tree view

**Files:**
- Create: `src/components/tabs/pipeline/OrgChartTree.jsx`

**Interfaces:**
- Consumes: `groups: OwnerGroup[]`, `onOpen(leadId)`. Uses `layoutTree`.
- Produces: `<OrgChartTree groups onOpen />` default export.

Verification: build + manual run (pan/zoom/tap on device + desktop).

- [ ] **Step 1: Implement the component**

Create `src/components/tabs/pipeline/OrgChartTree.jsx`:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutTree } from '../../../lib/treeLayout';
import { money } from '../../../lib/pipeline';

const MIN_SCALE = 0.3, MAX_SCALE = 2.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Cubic connector from bottom-center of parent to top-center of child.
function edgePath(a, b) {
  const x1 = a.x + a.w / 2, y1 = a.y + a.h;
  const x2 = b.x + b.w / 2, y2 = b.y;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}

export default function OrgChartTree({ groups, onOpen }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const { nodes, edges, width, height } = useMemo(
    () => layoutTree(groups, { collapsed }), [groups, collapsed]);
  const byId = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const wrapRef = useRef(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const drag = useRef(null);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !width) return;
    const scale = clamp((el.clientWidth - 16) / width, MIN_SCALE, 1);
    setView({ scale, tx: (el.clientWidth - width * scale) / 2, ty: 8 });
  }, [width]);

  useEffect(() => { fit(); }, [fit]);

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    setView(v => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setView(v => ({ ...v, scale: clamp(v.scale * f, MIN_SCALE, MAX_SCALE) }));
  };

  const tap = (node) => {
    if (drag.current?.moved) return;
    if (node.kind === 'lead') onOpen(node.leadId);
    else if (node.kind === 'owner') {
      setCollapsed(prev => {
        const n = new Set(prev);
        n.has(node.ownerId) ? n.delete(node.ownerId) : n.add(node.ownerId);
        return n;
      });
    }
  };

  if (!groups.length) return <div className="dim text-sm text-center py-10">No deals to chart yet — add one with +.</div>;

  return (
    <div className="relative pt-1">
      <button onClick={fit}
        className="absolute right-1 top-1 z-10 text-[11px] font-bold px-2.5 py-1 rounded-full surface dim">
        Fit
      </button>
      <div ref={wrapRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel}
        className="surface rounded-2xl overflow-hidden touch-none select-none"
        style={{ height: 'min(70vh, 560px)', cursor: drag.current ? 'grabbing' : 'grab' }}>
        <svg width="100%" height="100%">
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
            {edges.map((e, i) => {
              const a = byId[e.from], b = byId[e.to];
              if (!a || !b) return null;
              return <path key={i} d={edgePath(a, b)} fill="none" stroke="#D5DEEC" strokeWidth="1.5" />;
            })}
            {nodes.map(n => (
              <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerUp={() => tap(n)}
                style={{ cursor: 'pointer' }}>
                <rect width={n.w} height={n.h} rx="10"
                  fill={n.kind === 'root' ? '#0C1626' : '#fff'}
                  stroke={n.kind === 'lead' ? n.color : (n.isYou ? '#2F6BF0' : '#E4EAF3')}
                  strokeWidth={n.kind === 'lead' ? 1.5 : (n.isYou ? 2 : 1.25)}
                  opacity={n.closed ? 0.55 : 1} />
                {n.kind === 'lead' && <rect width="4" height={n.h} rx="2" fill={n.color} opacity={n.closed ? 0.55 : 1} />}
                <text x={n.w / 2} y={n.kind === 'root' ? n.h / 2 + 4 : 18} textAnchor="middle"
                  fontSize="12.5" fontWeight="700"
                  fill={n.kind === 'root' ? '#fff' : '#0C1626'}>
                  {n.label.length > 16 ? n.label.slice(0, 15) + '…' : n.label}
                </text>
                {n.kind === 'owner' && <text x={n.w / 2} y={36} textAnchor="middle" fontSize="10.5" fill="#7C8AA6">
                  {n.collapsed ? '▸ ' : ''}{n.sublabel}
                </text>}
                {n.kind === 'lead' && <text x={n.w / 2} y={34} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3F5170">
                  {money(n.value)}
                </text>}
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="dim text-[11px] text-center mt-2">Drag to pan · pinch / scroll to zoom · tap a name to fold</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/tabs/pipeline/OrgChartTree.jsx
git commit -m "feat(pipeline): add SVG org-chart tree view with pan/zoom"
```

---

## Task 7: Wire the view switcher into `PipelineTab`

**Files:**
- Modify: `src/components/tabs/PipelineTab.jsx`
- Verify: `src/components/AppShell.jsx` already passes `profiles`, `userId`, `onOpen` via `shared` (it spreads `...data` which includes `userId`, plus `profiles` and `onOpen`).

**Interfaces:**
- Consumes: `leads`, `profiles`, `userId`, `onOpen` (from `shared`); `groupByOwner`, `OwnerGroups`, `OrgChartTree`.
- Produces: the three-lens Pipeline tab.

Verification: build + manual run of all three lenses + Show closed.

- [ ] **Step 1: Rewrite `PipelineTab` to add the switcher and views**

Replace `src/components/tabs/PipelineTab.jsx`. Keep the existing stage markup exactly; wrap it in a `StageView` and add the switcher:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useMemo, useState } from 'react';
import { STAGES, OPEN_STAGES, money, forecast, groupByOwner } from '../../lib/pipeline';
import { useSettings } from '../../lib/settings';
import OwnerGroups from './pipeline/OwnerGroups';
import OrgChartTree from './pipeline/OrgChartTree';

const VIEWS = [
  { id: 'stage', label: 'By Stage' },
  { id: 'owner', label: 'By Owner' },
  { id: 'tree',  label: 'Tree' },
];

function StageView({ leads }) {
  const settings = useSettings();
  const fc = forecast(leads, settings.stageProbability);
  const stages = STAGES.filter(s => OPEN_STAGES.includes(s.id)).map(s => {
    const items = leads.filter(l => l.stage === s.id);
    return { ...s, count: items.length, value: items.reduce((a, l) => a + +l.value, 0) };
  });
  const maxVal = Math.max(1, ...stages.map(s => s.value));

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="surface rounded-2xl px-[18px] py-4 flex justify-between items-center">
        <div>
          <div className="text-[10.5px] tracking-[0.18em] uppercase font-bold dim">Weighted forecast</div>
          <div className="mono text-[30px] font-bold mt-1.5 leading-none" style={{ letterSpacing: '-0.02em' }}>
            <span style={{ color: '#2F6BF0' }}>$</span>{fc.weighted.toLocaleString('en-US')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] soft">of {money(fc.openVal)} open</div>
          <div className="text-[11.5px] font-bold mt-1" style={{ color: '#1B9E6E' }}>{fc.pct}% likely</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-0.5 px-0.5">
        <div className="text-[15px] font-extrabold" style={{ letterSpacing: '-0.01em' }}>By stage</div>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <div className="text-[11px] dim font-bold">{fc.count} deal{fc.count !== 1 ? 's' : ''}</div>
      </div>
      {stages.map(s => (
        <div key={s.id} className="panel rounded-xl px-3.5 py-3">
          <div className="flex justify-between items-baseline">
            <div className="text-[13.5px] font-bold">{s.name}</div>
            <div className="mono text-[13.5px] font-bold">{money(s.value)}</div>
          </div>
          <div className="flex items-center gap-2.5 mt-2.5">
            <div className="flex-1 h-1.5 rounded-md overflow-hidden" style={{ background: '#EEF2F9' }}>
              <div className="h-full rounded-md" style={{ width: Math.round(s.value / maxVal * 100) + '%', background: 'linear-gradient(90deg,#2F6BF0,#7AA0F4)' }} />
            </div>
            <div className="text-[11px] soft font-bold whitespace-nowrap">{s.count} deal{s.count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      ))}
      {fc.count === 0 && <div className="dim text-sm text-center py-10">No open deals yet — add one with +.</div>}
    </div>
  );
}

export default function PipelineTab({ leads, profiles = [], userId = null, onOpen }) {
  const [view, setView] = useState('stage');
  const [showClosed, setShowClosed] = useState(false);
  const groups = useMemo(
    () => groupByOwner(leads, profiles, { includeClosed: showClosed, currentUserId: userId }),
    [leads, profiles, showClosed, userId]);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-3 p-1 rounded-xl" style={{ background: '#EEF2F9' }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className="text-[12px] font-bold py-1.5 rounded-lg transition-colors"
              style={view === v.id
                ? { background: '#fff', color: '#0C1626', boxShadow: '0 1px 3px rgba(12,22,38,.12)' }
                : { color: '#7C8AA6' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view !== 'stage' && (
        <label className="flex items-center gap-2 text-[12px] font-semibold soft px-0.5 self-start cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      )}

      {view === 'stage' && <StageView leads={leads} />}
      {view === 'owner' && <OwnerGroups groups={groups} onOpen={onOpen} />}
      {view === 'tree'  && <OrgChartTree groups={groups} onOpen={onOpen} />}
    </div>
  );
}
```

- [ ] **Step 2: Confirm props reach the tab**

Read `src/components/AppShell.jsx` around line 59 + 104. `shared = { ...data, tags, isAdmin, profile, profiles, onSignOut, onOpen }` and `data` (from `useLeads`) includes `userId`. `<PipelineTab {...shared} />` therefore already passes `leads`, `profiles`, `userId`, `onOpen`. No change needed; if `userId` is missing from `data`, add it to the `useLeads` return (it is already returned).

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/tabs/PipelineTab.jsx
git commit -m "feat(pipeline): add By Stage / By Owner / Tree view switcher"
```

---

## Task 8: Manual verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the app**

Run: `npm run dev`, open the Pipeline tab.

- [ ] **Step 2: Check each lens**
  - `By Stage` looks identical to before.
  - `By Owner` lists owners (you pinned first with "You"), correct counts/values, tapping a lead opens detail.
  - `Tree` fits to width, Dastero Tech at root, a branch per owner, leads beneath; drag pans, scroll/pinch zooms, tap owner folds, tap lead opens detail; "Fit" resets.
  - `Show closed` toggles closed deals in/out of Owner + Tree only.
  - With no leads, each lens shows its empty state.

- [ ] **Step 3: Confirm owner names resolve**

If owner names show as `Rep ####`, run the Step 0 diagnostic in Supabase and apply
`sql/2026-06-23_profiles_read_all.sql` (user task). Reload — names should resolve.

- [ ] **Step 4: Final commit if any tweaks were needed**

```bash
git add -A && git commit -m "chore(pipeline): verification tweaks"
```

---

## Self-Review

**Spec coverage:**
- View switcher (A) → Task 7. ✓
- SVG org-chart, fit/pan/zoom, collapsible → Task 6. ✓
- Open default + Show closed (C) → `groupByOwner` includeClosed (Task 2) + toggle (Task 7). ✓
- Owner identification prerequisite → Task 0 (repo hygiene + docs) + Step 0 / Task 8 Step 3 (user-run SQL). ✓
- Shared board, tap→detail, node contents, Unassigned bucket → Tasks 2/3/5/6. ✓
- `useProfiles` race hardening (§6) → Task 4. ✓
- Testing: Vitest + pure-logic unit tests → Tasks 1/2/3; components verified by build + Task 8. ✓
- Repo hygiene (supersede admin_read.sql) → Task 0. ✓

**Placeholder scan:** none — all steps carry concrete code/commands.

**Type consistency:** `groupByOwner` shape (Task 2) matches `layoutTree` input fixtures (Task 3) and `OwnerGroups`/`OrgChartTree`/`PipelineTab` consumption (Tasks 5–7). `ownerId` = `owner.id | '__unassigned__'` used consistently. `CLOSED_STAGES` exported once (Task 2), imported by `treeLayout` (Task 3). `onOpen(leadId)` signature consistent across views.
