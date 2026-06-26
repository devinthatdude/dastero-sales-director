# Readable Packed-Grid Tree — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Pipeline Tree readable — pack each owner's leads into a wrapping grid block instead of one wide row, and drop owner→lead connector lines in favor of a grouping container.

**Architecture:** `layoutTree` reworked to grid-pack leads per owner (`cols = min(5, ceil(√n))`), emit only root→owner edges, and expose each owner's block bounds. `OrgChartTree` renders a faint container behind each grid + compact tiles, no lead edges. Pan/zoom/collapse unchanged.

**Tech Stack:** React 18, Vite 5, Vitest, SVG.

## Global Constraints

- Tree view only. Do NOT touch `groupByOwner`, By-Owner, By-Stage, or other views.
- Node `kind`s stay `root`/`owner`/`lead`; ids stay `root` / `owner:<id>` / `lead:<id>`; `ownerId` = `owner.id | '__unassigned__'`.
- Edges: **root→owner only**. No owner→lead edges.
- `cols = min(5, max(1, Math.ceil(Math.sqrt(n))))` per owner.
- Tap tile → `onOpen(leadId)`; tap owner → collapse/expand (drag-guarded).
- License header on every source file: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- Commit after each task. Do NOT push.

---

## Task 1: Rework `layoutTree` to grid-pack (TDD)

**Files:**
- Modify: `src/lib/treeLayout.js`
- Test: `src/lib/__tests__/treeLayout.test.js`

**Interfaces:**
- Produces: `layoutTree(groups, { collapsed }) → { nodes, edges, width, height }`.
  Owner nodes gain `blockX, blockY, blockW, blockH`. Edges are root→owner only.
  Lead nodes carry grid `x,y` (wrapped).

- [ ] **Step 1: Replace the test file with packed-grid assertions**

Replace `src/lib/__tests__/treeLayout.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { layoutTree } from '../treeLayout';

const groups = [
  { owner: { id: 'u1', full_name: 'Dane' }, isUnassigned: false, isYou: true,
    count: 3, value: 77000, openCount: 3, openValue: 77000,
    leads: [ { id: 1, company: 'Acme',    value: 25000, stage: 'qualified' },
             { id: 2, company: 'Globex',  value: 40000, stage: 'negotiating' },
             { id: 3, company: 'Initech', value: 12000, stage: 'prospect' } ] },
  { owner: null, isUnassigned: true, isYou: false,
    count: 1, value: 5000, openCount: 1, openValue: 5000,
    leads: [ { id: 5, company: 'NoOwner', value: 5000, stage: 'prospect' } ] },
];

describe('layoutTree (packed grid)', () => {
  it('produces root + owners + lead tiles', () => {
    const { nodes } = layoutTree(groups, {});
    expect(nodes.filter(n => n.kind === 'root')).toHaveLength(1);
    expect(nodes.filter(n => n.kind === 'owner')).toHaveLength(2);
    expect(nodes.filter(n => n.kind === 'lead')).toHaveLength(4);
  });

  it('emits root→owner edges only (no lead edges)', () => {
    const { edges } = layoutTree(groups, {});
    expect(edges).toHaveLength(2);                       // one per owner
    expect(edges.every(e => e.from === 'root')).toBe(true);
    expect(edges.some(e => String(e.to).startsWith('lead:'))).toBe(false);
  });

  it('wraps leads to a new row past the column count', () => {
    const { nodes } = layoutTree(groups, {});
    // Dane has 3 leads → cols = ceil(sqrt(3)) = 2, so index 2 (id 3) wraps to row 2.
    const first = nodes.find(n => n.id === 'lead:1'); // index 0
    const wrapped = nodes.find(n => n.id === 'lead:3'); // index 2
    expect(wrapped.y).toBeGreaterThan(first.y);
  });

  it('collapsed owner omits its tiles and has zero block height', () => {
    const { nodes, edges } = layoutTree(groups, { collapsed: new Set(['u1']) });
    expect(nodes.filter(n => n.kind === 'lead')).toHaveLength(1); // only unassigned's
    expect(edges).toHaveLength(2);                                // edges unchanged
    const dane = nodes.find(n => n.ownerId === 'u1');
    expect(dane.collapsed).toBe(true);
    expect(dane.blockH).toBe(0);
  });

  it('reports a positive bounding box', () => {
    const { width, height } = layoutTree(groups, {});
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- treeLayout`
Expected: FAIL (old layout emits owner→lead edges / no `blockH`).

- [ ] **Step 3: Rewrite `layoutTree`**

Replace `src/lib/treeLayout.js`:

```js
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Packed-grid layout for the Pipeline org chart: root → owners → a wrapping grid
// of lead tiles under each owner. Ownership is shown by a grouping container
// (drawn by the renderer from each owner's blockX/Y/W/H), not connector lines —
// so the only edges are root → owner.
import { STAGES, CLOSED_STAGES, money, repName } from './pipeline';

const ROOT = { w: 150, h: 46 };
const OWNER = { w: 138, h: 50 };
const TILE = { w: 84, h: 36 };
const TILE_GAP = 8;
const OWNER_GAP = 24;
const V_GAP = 64;
const PAD = 10;
const MAX_COLS = 5;

const stageColor = (id) => STAGES.find(s => s.id === id)?.color || '#92A0B8';
const ownerKey = (g, i) => (g.isUnassigned ? '__unassigned__' : (g.owner?.id || `owner-${i}`));

export function layoutTree(groups, { collapsed = new Set() } = {}) {
  const nodes = [];
  const edges = [];
  const yOwner = ROOT.h + V_GAP;
  const yBlock = yOwner + OWNER.h + V_GAP;

  let cursor = 0;       // left x of the current owner region
  let maxBlockH = 0;

  (groups || []).forEach((g, i) => {
    const oid = ownerKey(g, i);
    const isCollapsed = collapsed.has(oid);
    const leads = isCollapsed ? [] : g.leads;
    const n = leads.length;

    const cols = n ? Math.min(MAX_COLS, Math.max(1, Math.ceil(Math.sqrt(n)))) : 0;
    const rows = n ? Math.ceil(n / cols) : 0;
    const blockW = n ? Math.min(n, cols) * (TILE.w + TILE_GAP) - TILE_GAP : 0;
    const blockH = n ? rows * (TILE.h + TILE_GAP) - TILE_GAP : 0;

    const regionW = Math.max(blockW, OWNER.w);
    const centerX = cursor + regionW / 2;
    const blockX = centerX - blockW / 2;

    nodes.push({
      id: `owner:${oid}`, kind: 'owner', ownerId: oid,
      x: centerX - OWNER.w / 2, y: yOwner, w: OWNER.w, h: OWNER.h,
      label: g.isUnassigned ? 'Unassigned' : repName(g.owner),
      sublabel: `${g.count} · ${money(g.value)}`,
      isYou: g.isYou, collapsed: isCollapsed,
      blockX, blockY: yBlock, blockW, blockH,
    });
    edges.push({ from: 'root', to: `owner:${oid}` });

    leads.forEach((lead, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const closed = CLOSED_STAGES.includes(lead.stage);
      nodes.push({
        id: `lead:${lead.id}`, kind: 'lead', leadId: lead.id,
        x: blockX + col * (TILE.w + TILE_GAP),
        y: yBlock + row * (TILE.h + TILE_GAP),
        w: TILE.w, h: TILE.h,
        label: lead.company || '(no name)', value: lead.value,
        color: stageColor(lead.stage), closed,
      });
    });

    if (blockH > maxBlockH) maxBlockH = blockH;
    cursor += regionW + OWNER_GAP;
  });

  const contentW = Math.max(OWNER.w, cursor - OWNER_GAP);
  nodes.unshift({
    id: 'root', kind: 'root', x: contentW / 2 - ROOT.w / 2, y: 0,
    w: ROOT.w, h: ROOT.h, label: 'Dastero Tech',
  });

  for (const nd of nodes) {
    nd.x += PAD; nd.y += PAD;
    if (nd.kind === 'owner') { nd.blockX += PAD; nd.blockY += PAD; }
  }

  return { nodes, edges, width: contentW + PAD * 2, height: yBlock + maxBlockH + PAD * 2 };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- treeLayout`
Expected: PASS — 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/treeLayout.js src/lib/__tests__/treeLayout.test.js
git commit -m "feat(tree): grid-pack leads per owner, root-owner edges only"
```

---

## Task 2: Render containers + tiles in `OrgChartTree`

**Files:**
- Modify: `src/components/tabs/pipeline/OrgChartTree.jsx`

**Interfaces:**
- Consumes: the new `layoutTree` output (owner `blockX/Y/W/H`, no lead edges).
- Produces: grouping containers + compact tiles; no lead connector lines.

Verification: build + manual run.

- [ ] **Step 1: Replace the component**

Replace `src/components/tabs/pipeline/OrgChartTree.jsx`:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutTree } from '../../../lib/treeLayout';
import { money } from '../../../lib/pipeline';

const MIN_SCALE = 0.3, MAX_SCALE = 2.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Cubic connector from bottom-center of parent to top-center of child (root→owner only).
function edgePath(a, b) {
  const x1 = a.x + a.w / 2, y1 = a.y + a.h;
  const x2 = b.x + b.w / 2, y2 = b.y;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}

const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function OrgChartTree({ groups, onOpen }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const { nodes, edges, width, height } = useMemo(
    () => layoutTree(groups, { collapsed }), [groups, collapsed]);
  const byId = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);
  const owners = useMemo(() => nodes.filter(n => n.kind === 'owner'), [nodes]);

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
            {/* root→owner connectors */}
            {edges.map((e, i) => {
              const a = byId[e.from], b = byId[e.to];
              if (!a || !b) return null;
              return <path key={i} d={edgePath(a, b)} fill="none" stroke="#D5DEEC" strokeWidth="1.5" />;
            })}

            {/* grouping containers behind each owner's grid */}
            {owners.filter(o => !o.collapsed && o.blockH > 0).map(o => (
              <rect key={`box:${o.id}`} x={o.blockX - 6} y={o.blockY - 6}
                width={o.blockW + 12} height={o.blockH + 12} rx="12"
                fill="#F4F7FC" stroke="#E4EAF3" strokeWidth="1" />
            ))}

            {/* nodes */}
            {nodes.map(n => {
              if (n.kind === 'root') return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <rect width={n.w} height={n.h} rx="10" fill="#0C1626" />
                  <text x={n.w / 2} y={n.h / 2 + 4} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">{n.label}</text>
                </g>
              );
              if (n.kind === 'owner') return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerUp={() => tap(n)} style={{ cursor: 'pointer' }}>
                  <rect width={n.w} height={n.h} rx="10" fill="#fff"
                    stroke={n.isYou ? '#2F6BF0' : '#E4EAF3'} strokeWidth={n.isYou ? 2 : 1.25} />
                  <text x={n.w / 2} y={20} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#0C1626">{trunc(n.label, 16)}</text>
                  <text x={n.w / 2} y={37} textAnchor="middle" fontSize="10.5" fill="#7C8AA6">{n.collapsed ? '▸ ' : ''}{n.sublabel}</text>
                </g>
              );
              // lead tile
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerUp={() => tap(n)} style={{ cursor: 'pointer' }}>
                  <rect width={n.w} height={n.h} rx="8" fill="#fff" stroke="#E4EAF3" strokeWidth="1" opacity={n.closed ? 0.55 : 1} />
                  <rect width="4" height={n.h} rx="2" fill={n.color} opacity={n.closed ? 0.55 : 1} />
                  <text x="10" y="15" fontSize="10" fontWeight="700" fill="#0C1626">{trunc(n.label, 11)}</text>
                  <text x="10" y="29" fontSize="10" fontWeight="700" fill="#3F5170">{money(n.value)}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="dim text-[11px] text-center mt-2">Drag to pan · pinch / scroll to zoom · tap a name to fold</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/tabs/pipeline/OrgChartTree.jsx
git commit -m "feat(tree): render grouping containers + compact tiles, drop lead lines"
```

---

## Task 3: Manual verification pass

**Files:** none.

- [ ] **Step 1:** `npm run dev`; Pipeline → Tree.
- [ ] **Step 2:** Each owner shows a grid block of tiles inside a light container; no lines run from owners to individual leads (only root→owner).
- [ ] **Step 3:** An owner with several leads wraps into multiple rows (not one wide row); the chart fits the width far better than before.
- [ ] **Step 4:** Tap a tile → opens the lead; tap an owner → folds its block (container + tiles disappear); "Fit" reframes.
- [ ] **Step 5:** Toggle "Show closed" → closed tiles appear dimmed.
- [ ] **Step 6:** Commit any tweaks: `git add -A && git commit -m "chore(tree): verification tweaks"`.

---

## Self-Review

**Spec coverage:**
- Grid packing `cols=min(5,ceil(√n))` → Task 1 `layoutTree`. ✓
- Root→owner edges only, no lead edges → Task 1 + test. ✓
- Owner block bounds for container → Task 1 (`blockX/Y/W/H`) + Task 2 render. ✓
- Drop connector lines, add container → Task 2. ✓
- Compact tiles, tap-to-open, collapse, pan/zoom → Task 2. ✓
- Wrap + edge + collapsed tests → Task 1 Step 1. ✓
- Scope limited to Tree → only `treeLayout.js`, its test, `OrgChartTree.jsx`. ✓

**Placeholder scan:** none.

**Type consistency:** `layoutTree` returns the documented shape; owner nodes
expose `blockX/blockY/blockW/blockH` (set in Task 1, consumed in Task 2);
`kind`/`id`/`ownerId`/`leadId` names match across both files and the tests;
`money` import used in tiles.
