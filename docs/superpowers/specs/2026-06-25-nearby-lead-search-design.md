# Nearby business lead search (Places Text Search)

**Date:** 2026-06-25
**Branch:** feature/light-retheme (main in sync + deployed)
**Status:** Approved design, ready for implementation plan

## Goal

Turn the Maps panel from "look one business up" into "find a list of prospects."
A rep types a business keyword (e.g. "dental office"), we run a Places **Text
Search** over the current map area, and show a scrollable results list where each
row can be imported as a lead (dedup-aware).

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Search input | Free-text **keyword** → Places Text Search. |
| Search area | Biased to the **current map viewport** (`map.getBounds()`). |
| Results UX | A results **list, per-row Import** (or "Already a lead"); tap a row recenters the map. |
| Cost model | One Text Search per query; **Place Details fetched only on import** (scales with imports, not browsing). Default to first page (~20); "Load more" if Google returns a next page. |
| Dedup | In-memory by **company name + address** (no DB change). A `place_id` column for exact dedup is a deferred option. |
| Key | Reuses the per-user Google Maps key + Places API already in place. |

## Architecture

### `src/lib/placesSearch.js` (new, pure + testable)
```
niceType(types[])              → readable industry (lifted from MapsPanel, shared)
mapSearchResult(place)         → { placeId, name, address, industry, rating, reviews, lat, lng }
leadDedupeKey({company,address}) → normalized "name|firstAddressLine"
isAlreadyLead(result, leads)   → boolean
```
`mapSearchResult` reads `geometry.location.lat/lng` whether they're functions
(live JS API) or numbers (tests). `niceType` is lifted here so the pin-click path
and the search path share one implementation (DRY).

### `src/components/maps/LeadSearchResults.jsx` (new)
Presentational bottom-sheet list. Props: `results`, `leads`, `importedIds`,
`importingId`, `onImport(result)`, `onSelect(result)`, `onClose`, `onLoadMore`,
`hasMore`. Each row: name · industry · address · ★rating, and a right-side
**Import** button / "Adding…" / "✓ Added" / "Already a lead" badge (via
`isAlreadyLead`). Row body tap → `onSelect` (recenter map).

### `src/components/MapsPanel.jsx` (updated)
- Accept a new `leads = []` prop (for dedup).
- Add a **"Find businesses"** keyword input + Search button to the overlay,
  separate from the existing area-navigation Autocomplete.
- `runSearch`: `placesRef.current.textSearch({ query, bounds: mapRef.current.getBounds() }, cb)`;
  on `OK`, map results through `mapSearchResult`, store the `pagination` object for
  "Load more"; on `ZERO_RESULTS`, show an empty message.
- Render `<LeadSearchResults>` when there are results.
- `importResult(result)`: `getDetails({ placeId, fields: FIELDS })` → existing
  `mapPlace` → `addLead({...})` (same enrichment/shape as today's pin import),
  then mark imported.
- Replace the local `niceType` with the shared one from `placesSearch`.

### `src/components/tabs/TodayTab.jsx`
Pass `leads` to `MapsPanel`: `<MapsPanel addLead={addLead} leads={leads} />`.

## Edge cases

- No key / load failure → existing setup card (unchanged).
- Empty results → "No businesses found here — try another area or term."
- Map not ready when searching → guard on `mapRef.current`.
- Importing a row already a lead → button shows "Already a lead", disabled.
- Re-import within a session → "✓ Added" state (existing `importedIds` pattern).
- Cost: first page only by default; "Load more" is an explicit extra call.

## Testing

Vitest for the pure helpers in `placesSearch.js`:
- `mapSearchResult`: maps fields; handles `lat/lng` as functions and numbers; missing fields default sanely.
- `leadDedupeKey`: case/punctuation-insensitive; uses only the first address line.
- `isAlreadyLead`: hit and miss against a small `leads` fixture.

Text Search call, list rendering, recenter, and import: manual verification in the
running app (needs a live key + map).

## Out of scope (YAGNI)

- Category-chip search (keyword only for now).
- `place_id` column / exact dedup (deferred).
- Bulk multi-select import (per-row only).
- Saved searches / radius slider (viewport bias is enough).

## Files touched

- `src/lib/placesSearch.js` (new).
- `src/components/maps/LeadSearchResults.jsx` (new).
- `src/components/MapsPanel.jsx` (keyword search + results + import + dedup; shared `niceType`).
- `src/components/tabs/TodayTab.jsx` (pass `leads`).
- `src/lib/__tests__/placesSearch.test.js` (new).
