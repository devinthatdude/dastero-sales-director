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
