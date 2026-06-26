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
