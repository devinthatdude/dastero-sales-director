import { describe, it, expect } from 'vitest';
import { isHexColor, tagUsageCounts } from '../tags';

describe('isHexColor', () => {
  it('accepts 3- and 6-digit hex, case-insensitive', () => {
    expect(isHexColor('#abc')).toBe(true);
    expect(isHexColor('#35C28A')).toBe(true);
    expect(isHexColor('#FFFFFF')).toBe(true);
  });
  it('rejects malformed / empty / null', () => {
    expect(isHexColor('')).toBe(false);
    expect(isHexColor(null)).toBe(false);
    expect(isHexColor('35C28A')).toBe(false); // missing #
    expect(isHexColor('#ab')).toBe(false);    // wrong length
    expect(isHexColor('#xyz')).toBe(false);   // non-hex
  });
});

describe('tagUsageCounts', () => {
  it('counts tag ids across leads', () => {
    const leads = [
      { id: 1, tagIds: ['t1', 't2'] },
      { id: 2, tagIds: ['t1'] },
      { id: 3, tagIds: [] },
      { id: 4 }, // no tagIds
    ];
    const m = tagUsageCounts(leads);
    expect(m.get('t1')).toBe(2);
    expect(m.get('t2')).toBe(1);
    expect(m.get('t3')).toBeUndefined();
  });
  it('returns empty map for no leads', () => {
    expect(tagUsageCounts([]).size).toBe(0);
  });
});
