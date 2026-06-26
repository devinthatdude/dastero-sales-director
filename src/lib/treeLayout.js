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
