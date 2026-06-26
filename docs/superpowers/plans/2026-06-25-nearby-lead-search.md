# Nearby Business Lead Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyword business discovery to the Maps panel — Places Text Search over the current map area → a results list with per-row, dedup-aware import.

**Architecture:** A pure `placesSearch.js` (result mapping + dedup helpers, shared `niceType`). A presentational `LeadSearchResults` bottom sheet. `MapsPanel` gains a keyword search that runs `textSearch({ query, bounds })`, renders results, and imports a row by fetching Place Details then `addLead`. `TodayTab` passes `leads` for dedup.

**Tech Stack:** React 18, Vite 5, Vitest, Google Maps JS + Places (legacy `PlacesService`).

## Global Constraints

- Reuse the per-user key + Places API already set up; no new env/secret.
- One Text Search per query; Place Details fetched **only on import**.
- Dedup in-memory by company name + address (no DB change).
- Default first page (~20 results); "Load more" only if Google returns a next page.
- Keep the existing area-navigation Autocomplete and pin-click → detail → import flow working.
- License header on every new source file: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- Commit after each task. Do NOT push.

---

## Task 1: `placesSearch.js` pure helpers (TDD)

**Files:**
- Create: `src/lib/placesSearch.js`
- Test: `src/lib/__tests__/placesSearch.test.js`

**Interfaces:**
```
niceType(types[]) → string
mapSearchResult(place) → { placeId, name, address, industry, rating, reviews, lat, lng }
leadDedupeKey({company,address}) → string
isAlreadyLead(result, leads) → boolean
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/placesSearch.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- placesSearch`
Expected: FAIL — cannot find module `../placesSearch`.

- [ ] **Step 3: Implement `placesSearch.js`**

Create `src/lib/placesSearch.js`:

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- placesSearch`
Expected: PASS — all passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/placesSearch.js src/lib/__tests__/placesSearch.test.js
git commit -m "feat(maps): add placesSearch helpers (result mapping + dedup)"
```

---

## Task 2: `LeadSearchResults` component

**Files:**
- Create: `src/components/maps/LeadSearchResults.jsx`

**Interfaces:**
- Props: `results[]`, `leads[]`, `importedIds{}`, `importingId`, `onImport(result)`, `onSelect(result)`, `onClose()`, `onLoadMore()`, `hasMore`.

Verification: build + manual.

- [ ] **Step 1: Implement the component**

Create `src/components/maps/LeadSearchResults.jsx`:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { isAlreadyLead } from '../../lib/placesSearch';

export default function LeadSearchResults({ results, leads, importedIds, importingId, onImport, onSelect, onClose, onLoadMore, hasMore }) {
  return (
    <div className="absolute bottom-0 inset-x-0 bg-white z-20 flex flex-col" style={{ maxHeight: '72%', borderTop: '1px solid var(--line)', boxShadow: '0 -8px 20px -12px rgba(12,22,38,.35)' }}>
      <div className="flex items-center justify-between px-3.5 py-2.5 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="text-[12.5px] font-bold">{results.length} result{results.length !== 1 ? 's' : ''}</div>
        <button onClick={onClose} className="dim text-lg leading-none px-1" aria-label="Close results">×</button>
      </div>
      <div className="overflow-auto px-2.5 py-2 flex flex-col gap-1.5">
        {results.map((r) => {
          const already = isAlreadyLead(r, leads);
          const added = importedIds[r.placeId];
          const importing = importingId === r.placeId;
          return (
            <div key={r.placeId} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg" style={{ border: '1px solid var(--line)' }}>
              <button onClick={() => onSelect(r)} className="min-w-0 flex-1 text-left">
                <div className="font-bold text-[13px] truncate">{r.name}</div>
                <div className="text-[11.5px] soft truncate">{[r.industry, r.address].filter(Boolean).join(' · ')}</div>
                {r.rating ? <div className="text-[11px] soft mt-0.5">★ {r.rating} ({r.reviews || 0})</div> : null}
              </button>
              {already ? (
                <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex-none" style={{ background: 'rgba(124,138,166,.14)', color: '#5C6B85' }}>Already a lead</span>
              ) : added ? (
                <span className="text-[10.5px] font-bold px-2 py-1 rounded-lg flex-none" style={{ background: 'rgba(27,158,110,.12)', color: '#1B9E6E' }}>✓ Added</span>
              ) : (
                <button onClick={() => onImport(r)} disabled={importing}
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex-none brandbtn text-white disabled:opacity-60">
                  {importing ? 'Adding…' : 'Import'}
                </button>
              )}
            </div>
          );
        })}
        {hasMore && <button onClick={onLoadMore} className="text-[12px] font-bold py-2 rounded-lg panel mt-1">Load more</button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/maps/LeadSearchResults.jsx
git commit -m "feat(maps): add LeadSearchResults list component"
```

---

## Task 3: Wire search into `MapsPanel` + pass `leads`

**Files:**
- Modify: `src/components/MapsPanel.jsx`
- Modify: `src/components/tabs/TodayTab.jsx`

**Interfaces:**
- Consumes: `placesSearch` helpers, `LeadSearchResults`, `addLead`, `leads`.
- Produces: keyword search + results list + per-row import in the Maps panel.

Verification: build + manual run.

- [ ] **Step 1: Replace `src/components/MapsPanel.jsx`**

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
//
// Google Maps prospecting panel (Today tab). Navigate to an area, search a
// business keyword to list prospects, click a pin or a result to inspect, and
// import businesses straight onto the lead board.
// Degrades to a setup card when no Google Maps key is configured.
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps';
import { newLeadDefaults } from '../lib/settings';
import { mapSearchResult, niceType } from '../lib/placesSearch';
import LeadSearchResults from './maps/LeadSearchResults';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }; // US — search/geolocation overrides this
const FIELDS = ['name','formatted_address','formatted_phone_number','international_phone_number',
  'website','rating','user_ratings_total','types','geometry','business_status','place_id'];

function mapPlace(p){
  return {
    placeId: p.place_id,
    name: p.name || 'Unnamed business',
    address: p.formatted_address || '',
    phone: p.international_phone_number || p.formatted_phone_number || '',
    website: p.website || '',
    rating: p.rating, reviews: p.user_ratings_total,
    industry: niceType(p.types),
  };
}

export default function MapsPanel({ addLead, leads = [] }){
  const mapDivRef=useRef(null), inputRef=useRef(null), mapRef=useRef(null), placesRef=useRef(null);
  const paginationRef=useRef(null), appendRef=useRef(false);
  const [error,setError]=useState(null);     // 'no-key' | 'load-failed'
  const [selected,setSelected]=useState(null); // mapped place or {loading:true}
  const [importing,setImporting]=useState(false);
  const [importedIds,setImportedIds]=useState({});
  // Keyword business search
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const [searchMsg,setSearchMsg]=useState('');     // '' | 'none' | 'failed'
  const [importingId,setImportingId]=useState(null);
  const [hasMore,setHasMore]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    loadGoogleMaps().then((maps)=>{
      if(cancelled||!mapDivRef.current) return;
      const map=new maps.Map(mapDivRef.current,{
        center:DEFAULT_CENTER, zoom:11, clickableIcons:true,
        mapTypeControl:false, streetViewControl:false, fullscreenControl:false,
      });
      mapRef.current=map;
      placesRef.current=new maps.places.PlacesService(map);

      navigator.geolocation?.getCurrentPosition(
        (pos)=>map.setCenter({lat:pos.coords.latitude,lng:pos.coords.longitude}),
        ()=>{}, { timeout:5000 });

      const ac=new maps.places.Autocomplete(inputRef.current,{ types:['geocode'], fields:['geometry'] });
      ac.addListener('place_changed',()=>{
        const p=ac.getPlace();
        if(p?.geometry?.viewport) map.fitBounds(p.geometry.viewport);
        else if(p?.geometry?.location){ map.setCenter(p.geometry.location); map.setZoom(14); }
      });

      map.addListener('click',(e)=>{
        if(!e.placeId) return;
        e.stop(); // suppress the default Google info window
        setSelected({ loading:true });
        placesRef.current.getDetails({ placeId:e.placeId, fields:FIELDS },(place,status)=>{
          setSelected(status===maps.places.PlacesServiceStatus.OK ? mapPlace(place) : null);
        });
      });
    }).catch((err)=>{ if(!cancelled) setError(err.message); });
    return ()=>{ cancelled=true; };
  },[]);

  const okStatus=()=>window.google.maps.places.PlacesServiceStatus.OK;
  const zeroStatus=()=>window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS;

  const handleResults=(res,status,pagination)=>{
    setSearching(false);
    if(status===okStatus() && res?.length){
      const mapped=res.map(mapSearchResult);
      setResults(prev=> appendRef.current ? [...prev,...mapped] : mapped);
      paginationRef.current=pagination;
      setHasMore(!!pagination?.hasNextPage);
      setSearchMsg('');
    } else if(status===zeroStatus()){
      if(!appendRef.current) setResults([]);
      setHasMore(false); paginationRef.current=null; setSearchMsg('none');
    } else {
      setSearchMsg('failed');
    }
    appendRef.current=false;
  };

  const runSearch=()=>{
    const svc=placesRef.current, map=mapRef.current;
    if(!svc||!map||!query.trim()) return;
    setSelected(null); setSearching(true); setSearchMsg(''); appendRef.current=false;
    svc.textSearch({ query:query.trim(), bounds:map.getBounds() }, handleResults);
  };
  const loadMore=()=>{
    if(!paginationRef.current?.hasNextPage) return;
    setSearching(true); appendRef.current=true; paginationRef.current.nextPage();
  };
  const focusResult=(r)=>{
    if(r.lat&&r.lng&&mapRef.current){ mapRef.current.panTo({lat:r.lat,lng:r.lng}); mapRef.current.setZoom(16); }
  };

  // Import any place by id: fetch details (phone/website) then add to the board.
  const importPlace=(placeId, setBusy)=> new Promise((resolve)=>{
    setBusy(true);
    placesRef.current.getDetails({ placeId, fields:FIELDS }, async (place,status)=>{
      if(status===okStatus()){
        const m=mapPlace(place);
        const notes=[m.website&&`Website: ${m.website}`,
          m.rating&&`Google rating: ${m.rating} (${m.reviews||0} reviews)`].filter(Boolean).join('\n');
        const id=await addLead({ company:m.name, address:m.address||null, phone:m.phone||null,
          industry:m.industry||null, source:'Google Maps', notes:notes||null, ...newLeadDefaults() });
        if(id) setImportedIds(prev=>({ ...prev, [placeId]:true }));
      }
      setBusy(false); resolve();
    });
  });

  const importSelected=()=>{ if(selected&&!importing) importPlace(selected.placeId, setImporting); };
  const importResult=(r)=>{ importPlace(r.placeId, (b)=>setImportingId(b?r.placeId:null)); };

  // ----- Fallback when the key isn't configured -----
  if(error){
    return (
      <div className="surface rounded-2xl p-5 text-center flex flex-col items-center gap-2">
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center" style={{background:'rgba(47,107,240,.1)'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F6BF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div className="text-[14.5px] font-bold">{error==='no-key'?'Map needs a Google key':'Map failed to load'}</div>
        <div className="text-[12px] soft leading-snug" style={{maxWidth:'34ch'}}>
          {error==='no-key'
            ? 'Add your Google Maps key in Settings → Google Maps (Maps JavaScript + Places enabled, referrer-restricted), then reload. Admins can also set a company-wide VITE_GOOGLE_MAPS_API_KEY.'
            : 'Check the key restrictions and that billing is enabled in Google Cloud.'}
        </div>
      </div>
    );
  }

  const imported=selected && importedIds[selected.placeId];
  return (
    <div className="surface rounded-2xl overflow-hidden relative">
      <div className="absolute top-3 inset-x-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5" style={{border:'1px solid var(--line)',boxShadow:'0 6px 16px -10px rgba(12,22,38,.4)'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92A0B8" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input ref={inputRef} placeholder="Go to an area — city, ZIP, neighborhood…" className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px]" />
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2" style={{border:'1px solid var(--line)',boxShadow:'0 6px 16px -10px rgba(12,22,38,.4)'}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()}
            placeholder="Find businesses — e.g. dental office, law firm…" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
          <button onClick={runSearch} disabled={searching||!query.trim()}
            className="text-[12px] font-bold px-3 py-1.5 rounded-lg brandbtn text-white disabled:opacity-60">{searching?'…':'Search'}</button>
        </div>
      </div>

      <div ref={mapDivRef} style={{width:'100%',height:'280px'}} />

      {searchMsg==='none' && results.length===0 && (
        <div className="absolute bottom-0 inset-x-0 bg-white p-3.5 z-20 text-center dim text-[12.5px]" style={{borderTop:'1px solid var(--line)'}}>
          No businesses found here — try another area or term.
          <button onClick={()=>setSearchMsg('')} className="ml-2 font-bold" style={{color:'#2F6BF0'}}>OK</button>
        </div>
      )}
      {searchMsg==='failed' && (
        <div className="absolute bottom-0 inset-x-0 bg-white p-3.5 z-20 text-center text-[12.5px]" style={{borderTop:'1px solid var(--line)',color:'#DC4B43'}}>
          Search failed — check the key’s Places API and billing.
          <button onClick={()=>setSearchMsg('')} className="ml-2 font-bold">Dismiss</button>
        </div>
      )}

      {results.length>0 && (
        <LeadSearchResults results={results} leads={leads} importedIds={importedIds} importingId={importingId}
          onImport={importResult} onSelect={focusResult} onClose={()=>{setResults([]);setHasMore(false);}}
          onLoadMore={loadMore} hasMore={hasMore} />
      )}

      {selected && results.length===0 && (
        <div className="absolute bottom-0 inset-x-0 bg-white p-3.5 z-10" style={{borderTop:'1px solid var(--line)',boxShadow:'0 -8px 20px -12px rgba(12,22,38,.35)'}}>
          {selected.loading ? (
            <div className="dim text-sm py-1">Loading business…</div>
          ) : (
            <>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-[15px] truncate">{selected.name}</div>
                  <div className="text-[12px] soft truncate">{[selected.industry,selected.address].filter(Boolean).join(' · ')}</div>
                  <div className="text-[12px] soft mt-0.5 flex gap-3">
                    {selected.phone && <span>{selected.phone}</span>}
                    {selected.rating && <span>★ {selected.rating} ({selected.reviews||0})</span>}
                  </div>
                </div>
                <button onClick={()=>setSelected(null)} className="dim text-xl leading-none flex-none px-1" aria-label="Close">×</button>
              </div>
              <button onClick={importSelected} disabled={importing||imported}
                className="mt-3 w-full brandbtn text-white font-bold text-[12.5px] py-2.5 rounded-lg disabled:opacity-60"
                style={imported?{background:'rgba(27,158,110,.12)',color:'#1B9E6E',boxShadow:'none'}:undefined}>
                {imported?'✓ Added to leads':importing?'Adding…':'+ Import as lead'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Pass `leads` from TodayTab**

In `src/components/tabs/TodayTab.jsx`, change the MapsPanel render:

```jsx
          <MapsPanel addLead={addLead} leads={leads} />
```

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapsPanel.jsx src/components/tabs/TodayTab.jsx
git commit -m "feat(maps): keyword business search with dedup-aware per-row import"
```

---

## Task 4: Manual verification pass

**Files:** none.

- [ ] **Step 1:** `npm run dev` (needs a live Maps key); Today → Find leads nearby.
- [ ] **Step 2:** Navigate to an area; type "dental office" (or similar) → Search → a results list appears.
- [ ] **Step 3:** Tap a row → map recenters on it. Tap **Import** → it becomes "✓ Added" and the lead appears on the board with phone/website in notes.
- [ ] **Step 4:** A business already on your board shows **"Already a lead"** instead of Import.
- [ ] **Step 5:** "Load more" appears only when Google returned a next page; an empty search shows the "No businesses found" note.
- [ ] **Step 6:** Pin-click → detail card → import still works (regression check).
- [ ] **Step 7:** Commit any tweaks: `git add -A && git commit -m "chore(maps): verification tweaks"`.

---

## Self-Review

**Spec coverage:**
- Keyword Text Search over viewport → Task 3 `runSearch` (`bounds: map.getBounds()`). ✓
- Results list, per-row import, recenter → Task 2 + Task 3 wiring. ✓
- Details-on-import only → Task 3 `importPlace` (getDetails then addLead). ✓
- Dedup by name+address → Task 1 `isAlreadyLead`, used in Task 2. ✓
- First page + Load more → Task 3 `handleResults`/`loadMore` (pagination). ✓
- Shared `niceType` (DRY) → Task 1, imported by MapsPanel. ✓
- `leads` threaded for dedup → Task 3 Step 2. ✓
- Vitest for helpers → Task 1. ✓

**Placeholder scan:** none.

**Type consistency:** `mapSearchResult`/`niceType`/`isAlreadyLead` signatures match
across `placesSearch.js`, `LeadSearchResults`, and `MapsPanel`. `importedIds` map
and `importingId` used consistently. `LeadSearchResults` prop names match the
`MapsPanel` render. Existing pin-click flow reuses the same `mapPlace`/`importPlace`.
