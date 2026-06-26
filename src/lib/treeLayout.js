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
