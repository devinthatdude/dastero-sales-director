// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
//
// Google Maps prospecting panel (Today tab). Search an area, click a business
// POI to see its details, and import it straight onto the lead board.
// Degrades to a setup card when VITE_GOOGLE_MAPS_API_KEY is missing.
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps';
import { newLeadDefaults } from '../lib/settings';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }; // US — search/geolocation overrides this
const FIELDS = ['name','formatted_address','formatted_phone_number','international_phone_number',
  'website','rating','user_ratings_total','types','geometry','business_status','place_id'];

const niceType = (types=[]) => {
  const skip=new Set(['point_of_interest','establishment','premise','geocode']);
  const t=types.find(x=>!skip.has(x));
  return t ? t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '';
};

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

export default function MapsPanel({ addLead }){
  const mapDivRef=useRef(null), inputRef=useRef(null), mapRef=useRef(null), placesRef=useRef(null);
  const [error,setError]=useState(null);     // 'no-key' | 'load-failed'
  const [selected,setSelected]=useState(null); // mapped place or {loading:true}
  const [importing,setImporting]=useState(false);
  const [importedIds,setImportedIds]=useState({});

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

  const importLead=async()=>{
    if(!selected||importing) return;
    setImporting(true);
    const notes=[selected.website&&`Website: ${selected.website}`,
      selected.rating&&`Google rating: ${selected.rating} (${selected.reviews||0} reviews)`]
      .filter(Boolean).join('\n');
    const id=await addLead({
      company:selected.name, address:selected.address||null, phone:selected.phone||null,
      industry:selected.industry||null, source:'Google Maps', notes:notes||null,
      ...newLeadDefaults(),
    });
    setImporting(false);
    if(id) setImportedIds(m=>({ ...m, [selected.placeId]:true }));
  };

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
      <div className="absolute top-3 inset-x-3 z-10">
        <div className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5" style={{border:'1px solid var(--line)',boxShadow:'0 6px 16px -10px rgba(12,22,38,.4)'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92A0B8" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input ref={inputRef} placeholder="Search an area — city, ZIP, neighborhood…" className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px]" />
        </div>
      </div>

      <div ref={mapDivRef} style={{width:'100%',height:'280px'}} />

      {selected && (
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
              <button onClick={importLead} disabled={importing||imported}
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
