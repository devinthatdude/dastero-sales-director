// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
//
// Loads the Google Maps JS API (with Places) exactly once. The key is a browser
// key by design — each user may set their own in Settings (device-local), and
// the firm VITE_GOOGLE_MAPS_API_KEY is the fallback. RESTRICT the key by HTTP
// referrer in Google Cloud so it can't be abused off your domains.
// Rejects with 'no-key' when none is set so the UI can show a setup message.
import { getSettings } from './settings';

// User key wins (trimmed); otherwise the firm fallback; otherwise ''.
export function pickMapsKey(userKey, fallbackKey) {
  const u = (userKey ?? '').trim();
  return u || (fallbackKey ?? '') || '';
}

let promise;

export function loadGoogleMaps(){
  const key = pickMapsKey(getSettings().googleMapsKey, import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  if(!key) return Promise.reject(new Error('no-key'));
  if(window.google?.maps) return Promise.resolve(window.google.maps);
  if(promise) return promise;
  promise = new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    s.async=true;
    s.onload=()=>resolve(window.google.maps);
    s.onerror=()=>reject(new Error('load-failed'));
    document.head.appendChild(s);
  });
  return promise;
}
