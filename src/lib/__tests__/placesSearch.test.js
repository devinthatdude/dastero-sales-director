import { describe, it, expect } from 'vitest';
import { niceType, mapSearchResult, leadDedupeKey, isAlreadyLead } from '../placesSearch';

describe('niceType', () => {
  it('picks the first meaningful type, title-cased', () => {
    expect(niceType(['establishment', 'dentist', 'point_of_interest'])).toBe('Dentist');
    expect(niceType(['real_estate_agency'])).toBe('Real Estate Agency');
  });
  it('returns empty string when only generic types', () => {
    expect(niceType(['point_of_interest', 'establishment'])).toBe('');
    expect(niceType([])).toBe('');
  });
});

describe('mapSearchResult', () => {
  const place = {
    place_id: 'p1', name: 'Bright Smiles', formatted_address: '12 Main St, Town, ST',
    types: ['dentist', 'establishment'], rating: 4.6, user_ratings_total: 88,
    geometry: { location: { lat: () => 40.1, lng: () => -74.2 } },
  };
  it('maps fields and resolves lat/lng functions', () => {
    expect(mapSearchResult(place)).toEqual({
      placeId: 'p1', name: 'Bright Smiles', address: '12 Main St, Town, ST',
      industry: 'Dentist', rating: 4.6, reviews: 88, lat: 40.1, lng: -74.2,
    });
  });
  it('handles numeric lat/lng and missing fields', () => {
    const r = mapSearchResult({ place_id: 'p2', geometry: { location: { lat: 1, lng: 2 } } });
    expect(r.name).toBe('Unnamed business');
    expect(r.address).toBe('');
    expect(r.lat).toBe(1);
    expect(r.lng).toBe(2);
  });
});

describe('leadDedupeKey / isAlreadyLead', () => {
  it('normalizes case and punctuation, uses first address line', () => {
    expect(leadDedupeKey({ company: 'Bright Smiles, LLC', address: '12 Main St, Town' }))
      .toBe(leadDedupeKey({ company: 'bright   smiles llc', address: '12 main st' }));
  });
  it('detects an existing lead and a miss', () => {
    const leads = [{ company: 'Bright Smiles', address: '12 Main St, Town, ST' }];
    expect(isAlreadyLead({ name: 'Bright Smiles', address: '12 Main St, elsewhere' }, leads)).toBe(true);
    expect(isAlreadyLead({ name: 'Other Co', address: '99 Other Rd' }, leads)).toBe(false);
  });
});
