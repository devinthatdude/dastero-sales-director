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
