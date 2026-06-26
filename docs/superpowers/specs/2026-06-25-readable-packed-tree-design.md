# Readable packed-grid Pipeline Tree

**Date:** 2026-06-25
**Branch:** feature/light-retheme (deployed; main in sync)
**Status:** Approved design, ready for implementation plan

## Goal

Make the Pipeline **Tree** view readable on a phone. Today every lead is its own
node in a single horizontal row, so a rep with many deals produces a wide sprawl
that needs heavy panning. Replace that with a **packed-grid**: each owner's leads
wrap into a compact grid block under the owner, and the owner→lead connector
lines are dropped in favor of a grouping container.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Format | Packed-grid org chart (root → owners → gridded lead tiles). |
| Connector lines | **Root→owner edges kept; owner→lead lines DROPPED.** Ownership shown by a faint rounded container behind each owner's grid. |
| Grid columns | `cols = min(5, ceil(√n))` per owner (square-ish blocks). |
| Tap behavior | Tap a tile → open the lead; tap owner → collapse/expand (unchanged). |
| Scope | Tree view only. `groupByOwner`, By-Owner, By-Stage, all else unchanged. |

## Architecture

### `src/lib/treeLayout.js` (reworked)
- Keep returning `{ nodes, edges, width, height }` with the same node `kind`s
  (`root` / `owner` / `lead`) and id scheme (`root`, `owner:<id>`, `lead:<id>`).
- **Edges:** only `root → owner:<id>`. No owner→lead edges.
- **Per-owner grid packing:** for an owner with `n` visible leads,
  `cols = min(5, max(1, ceil(Math.sqrt(n))))`. Tile `i` sits at grid cell
  `(col = i % cols, row = floor(i / cols))`, offset within the owner's block.
- **Block bounds:** `blockW = min(n, cols) * (TILE_W + GAP) - GAP`;
  `blockH = ceil(n / cols) * (TILE_H + GAP) - GAP`.
- **Owner placement:** owner node centered horizontally over its block; owner
  blocks laid left-to-right by `max(blockW, OWNER_W)` + a between-owner gap; root
  centered over all owners.
- **New node field:** each `owner` node carries `blockX, blockY, blockW, blockH`
  so the renderer can draw the grouping container. Collapsed owner → no tiles,
  `blockH = 0`, container not drawn.
- `width`/`height` bound the full canvas including the tallest owner block.

### `src/components/tabs/pipeline/OrgChartTree.jsx` (updated)
- Render order inside the zoom `<g>`: root→owner edges (as now) → **per-owner
  grouping containers** (a faint rounded rect using each owner node's
  `blockX/Y/W/H`) → owner nodes → lead tiles.
- **No owner→lead path elements.**
- **Tiles:** ~84×36, white with a left stage-color bar, company (truncated) +
  value; dimmed when closed. Tap → `onOpen(leadId)` (drag-guarded, unchanged).
- Pan/zoom, fit-to-width, collapse, and the empty state are all unchanged.

## Constants (tunable)

`TILE_W=84, TILE_H=36, GAP=8` for tiles; `OWNER_W` stays ~138; vertical gap
between the owner row and the grid stays ~`V_GAP`; between-owner gap ~24.

## Edge cases

- Owner with 1 lead → 1×1 grid (cols=1).
- Collapsed owner → container + tiles omitted; root→owner edge remains.
- Single owner → root + one block; valid.
- Many leads → block grows downward in rows, not endlessly right; pan/zoom still
  available as the safety valve, but most cases fit width.
- Unassigned bucket behaves like any owner block.

## Testing

Update `src/lib/__tests__/treeLayout.test.js`:
- **Wrapping:** for an owner with `n` leads, a tile at index ≥ `cols` has a
  greater `y` than the index-0 tile (it's on a lower row).
- **Edges:** total edges == number of (visible) owners (root→owner only); no
  edge `to` starts with `lead:`.
- **Counts:** root + owners + visible leads as before.
- **Collapsed:** collapsed owner contributes no `lead` nodes and `blockH === 0`.

Tile rendering / container / pan-zoom: manual verification by running the app.

## Out of scope (YAGNI)

- Treemap or stage-grouped variants (considered, not chosen).
- Sizing tiles by value (kept uniform for grid regularity).
- Changing By-Owner or By-Stage views.

## Files touched

- `src/lib/treeLayout.js` (grid packing, drop lead edges, block bounds).
- `src/lib/__tests__/treeLayout.test.js` (wrap + edge assertions).
- `src/components/tabs/pipeline/OrgChartTree.jsx` (containers + tiles, no lead edges).
