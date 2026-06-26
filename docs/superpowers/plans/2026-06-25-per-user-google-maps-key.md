# Per-User Google Maps Key — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each user supply their own Google Maps browser key (device-local), falling back to the firm `VITE_GOOGLE_MAPS_API_KEY`. Claude stays untouched.

**Architecture:** A new `googleMapsKey` field in the device-local settings store; a pure `pickMapsKey` helper picks user-key-then-firm-fallback; `loadGoogleMaps` consumes it; a Settings section lets users enter/clear the key with a reload prompt (Maps JS loads once per page).

**Tech Stack:** React 18, Vite 5, Tailwind v3, Vitest.

## Global Constraints

- Device-local only (`localStorage` via `settings.js`); no DB, no RLS, no migration.
- Key precedence: `getSettings().googleMapsKey?.trim() || VITE_GOOGLE_MAPS_API_KEY`.
- Maps JS loads once per page → a key change applies only after `location.reload()`; the UI must say so.
- Google Maps browser key is low-sensitivity (referrer-restricted) — masking is UX nicety, not a secret-storage requirement. It must NOT be stored in `profiles`.
- Claude / `ask-claude` Edge Function: DO NOT modify.
- License header line on every new source file: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- Commit after each task. Do NOT push.

---

## Task 1: `pickMapsKey` helper + settings field (TDD)

**Files:**
- Modify: `src/lib/googleMaps.js`
- Modify: `src/lib/settings.js`
- Test: `src/lib/__tests__/googleMaps.test.js`

**Interfaces:**
- Produces: `pickMapsKey(userKey, fallbackKey) → string` (exported from `googleMaps.js`).
- Adds `googleMapsKey: ''` to `SETTINGS_DEFAULTS`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/googleMaps.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- googleMaps`
Expected: FAIL — `pickMapsKey is not a function`.

- [ ] **Step 3: Implement `pickMapsKey` and wire `loadGoogleMaps`**

Replace `src/lib/googleMaps.js` with:

```js
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
```

- [ ] **Step 4: Add the settings field**

In `src/lib/settings.js`, add to `SETTINGS_DEFAULTS` (after `displayName`):

```js
  displayName: '',                          // optional local override for the greeting/avatar
  googleMapsKey: '',                        // optional per-user Google Maps browser key (device-local)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- googleMaps`
Expected: PASS — 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/googleMaps.js src/lib/settings.js src/lib/__tests__/googleMaps.test.js
git commit -m "feat(maps): per-user Google Maps key with firm fallback (pickMapsKey)"
```

---

## Task 2: Settings "Google Maps" section

**Files:**
- Modify: `src/components/SettingsModal.jsx`

**Interfaces:**
- Consumes: `useSettings`, `setSettings`.
- Produces: a key input + show/hide + "Reload to apply" affordance.

Verification: build + manual run.

- [ ] **Step 1: Add local imports/state and the section**

In `src/components/SettingsModal.jsx`, add `useState` to the React import at the
top of the file:

```jsx
import { useState } from 'react';
```

Inside the component body, right after `const s = useSettings();`, capture the
key value present when the modal opened (to detect changes needing a reload):

```jsx
  const [showKey, setShowKey] = useState(false);
  const [keyAtOpen] = useState(() => s.googleMapsKey || '');
  const keyChanged = (s.googleMapsKey || '') !== keyAtOpen;
```

Insert this `<Section>` immediately after the "Today panel" `<Section>` and
before "Forecast odds":

```jsx
          {/* Google Maps key */}
          <Section title="Google Maps" desc="Your own Google Maps key for the prospecting map. Leave blank to use the company key.">
            <label className="block">
              <Lbl>Your Maps API key</Lbl>
              <div className="flex gap-2">
                <input type={showKey ? 'text' : 'password'} className="input flex-1 mono text-[12px]"
                  value={s.googleMapsKey} placeholder="AIza… (Maps JavaScript + Places, referrer-restricted)"
                  onChange={e=>setSettings({googleMapsKey:e.target.value})} />
                <button type="button" onClick={()=>setShowKey(v=>!v)}
                  className="font-bold text-[12px] px-3 rounded-lg panel flex-none">{showKey?'Hide':'Show'}</button>
              </div>
            </label>
            {keyChanged && (
              <div className="mt-2 flex items-center gap-2 text-[11.5px]">
                <span className="soft">Reload for the new key to take effect.</span>
                <button onClick={()=>window.location.reload()} className="font-bold px-2.5 py-1 rounded-lg"
                  style={{background:'rgba(47,107,240,.12)',color:'#2F6BF0'}}>Reload now</button>
              </div>
            )}
          </Section>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsModal.jsx
git commit -m "feat(maps): add Google Maps key field to Settings"
```

---

## Task 3: Update MapsPanel no-key copy

**Files:**
- Modify: `src/components/MapsPanel.jsx`

**Interfaces:** none changed; copy only.

- [ ] **Step 1: Update the fallback message**

In `src/components/MapsPanel.jsx`, replace the `no-key` description text. Change:

```jsx
          {error==='no-key'
            ? 'Add VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript + Places enabled, referrer-restricted) to .env, then reload.'
            : 'Check the key restrictions and that billing is enabled in Google Cloud.'}
```

to:

```jsx
          {error==='no-key'
            ? 'Add your Google Maps key in Settings → Google Maps (Maps JavaScript + Places enabled, referrer-restricted), then reload. Admins can also set a company-wide VITE_GOOGLE_MAPS_API_KEY.'
            : 'Check the key restrictions and that billing is enabled in Google Cloud.'}
```

- [ ] **Step 2: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/MapsPanel.jsx
git commit -m "feat(maps): point no-key setup card to Settings"
```

---

## Task 4: Manual verification pass

**Files:** none.

- [ ] **Step 1:** `npm run dev`; open Settings → Google Maps.
- [ ] **Step 2:** Enter a key → "Reload to apply" appears; Show/Hide toggles visibility.
- [ ] **Step 3:** Reload; open the Today → Maps panel → map loads with the user key (verify in devtools Network that the `maps/api/js` request uses the entered key).
- [ ] **Step 4:** Clear the key + reload → map falls back to the firm key (or shows the updated no-key card if no firm key is set).
- [ ] **Step 5:** Commit any tweaks: `git add -A && git commit -m "chore(maps): verification tweaks"`.

---

## Self-Review

**Spec coverage:**
- `googleMapsKey` setting → Task 1 Step 4. ✓
- `pickMapsKey` precedence + `loadGoogleMaps` wiring → Task 1. ✓
- Settings section with mask + reload prompt → Task 2. ✓
- MapsPanel no-key copy → Task 3. ✓
- Reload-to-apply constraint surfaced → Task 2 (`keyChanged` block). ✓
- Vitest for `pickMapsKey` → Task 1. ✓
- Claude untouched → no task modifies the Edge Function. ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `pickMapsKey(userKey, fallbackKey)` defined in Task 1 and
consumed by `loadGoogleMaps` with the same signature; `googleMapsKey` setting key
spelled identically in `settings.js`, `googleMaps.js`, and `SettingsModal.jsx`.
