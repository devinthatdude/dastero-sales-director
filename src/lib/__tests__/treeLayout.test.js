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
