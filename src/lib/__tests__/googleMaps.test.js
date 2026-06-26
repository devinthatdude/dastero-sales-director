import { describe, it, expect } from 'vitest';
import { pickMapsKey } from '../googleMaps';

describe('pickMapsKey', () => {
  it('prefers a non-empty user key', () => {
    expect(pickMapsKey('AIzaUSER', 'AIzaFIRM')).toBe('AIzaUSER');
  });
  it('trims the user key', () => {
    expect(pickMapsKey('  AIzaUSER  ', 'AIzaFIRM')).toBe('AIzaUSER');
  });
  it('falls back when user key is blank/whitespace/undefined', () => {
    expect(pickMapsKey('', 'AIzaFIRM')).toBe('AIzaFIRM');
    expect(pickMapsKey('   ', 'AIzaFIRM')).toBe('AIzaFIRM');
    expect(pickMapsKey(undefined, 'AIzaFIRM')).toBe('AIzaFIRM');
  });
  it('returns empty string when neither is present', () => {
    expect(pickMapsKey('', '')).toBe('');
    expect(pickMapsKey(undefined, undefined)).toBe('');
  });
});
