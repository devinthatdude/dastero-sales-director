// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
// Pure helpers for Places Text Search lead discovery: result mapping + dedup.
// No Google/network here — the PlacesService call lives in MapsPanel.

const SKIP = new Set(['point_of_interest', 'establishment', 'premise', 'geocode']);

export function niceType(types = []) {
  const t = (types || []).find((x) => !SKIP.has(x));
  return t ? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

const coord = (v) => (typeof v === 'function' ? v() : v);

export function mapSearchResult(p) {
  return {
    placeId: p.place_id,
    name: p.name || 'Unnamed business',
    address: p.formatted_address || '',
    industry: niceType(p.types),
    rating: p.rating,
    reviews: p.user_ratings_total,
    lat: coord(p.geometry?.location?.lat),
    lng: coord(p.geometry?.location?.lng),
  };
}

const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function leadDedupeKey({ company, address }) {
  const firstLine = norm((address || '').split(',')[0]);
  return `${norm(company)}|${firstLine}`;
}

export function isAlreadyLead(result, leads) {
  const key = leadDedupeKey({ company: result.name, address: result.address });
  return (leads || []).some((l) => leadDedupeKey({ company: l.company, address: l.address }) === key);
}
