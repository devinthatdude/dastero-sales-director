# Per-user Google Maps API key

**Date:** 2026-06-25
**Branch:** feature/light-retheme
**Status:** Approved design, ready for implementation plan

## Goal

Let each user supply their own Google Maps browser key for the prospecting map,
stored device-locally, with the firm `VITE_GOOGLE_MAPS_API_KEY` kept as a
fallback. **Claude is out of scope** — its shared, server-side Edge Function key
stays exactly as it is.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Claude keys | Unchanged — shared `ask-claude` Edge Function secret. Not touched. |
| Maps key scope | Per-user, **optional**, with the firm env key as fallback. |
| Storage | **Device-local** via `settings.js` (`localStorage`). No DB / RLS. |
| Precedence | `getSettings().googleMapsKey?.trim() || VITE_GOOGLE_MAPS_API_KEY`. |
| Apply behavior | Key change requires a reload (Maps JS loads once per page). |

## Why device-local is safe here

A Google Maps **browser** key is meant to live client-side and is locked down by
HTTP-referrer restrictions in Google Cloud. It is NOT a secret like the Anthropic
key. Storing it in `localStorage` (same place as "Display name (this device)") is
appropriate and avoids any backend work. It explicitly must NOT go in `profiles`
(now team-readable).

## Key constraint: Maps JS loads once per page

`loadGoogleMaps()` injects a `<script>` whose URL embeds the key, and caches the
result (`window.google.maps` / a module-level promise). The key is therefore
fixed at first map load. **Changing the key only takes effect after a full page
reload** — the UI must surface this, not silently no-op.

## Architecture

### `src/lib/settings.js`
Add `googleMapsKey: ''` to `SETTINGS_DEFAULTS`. No other change — existing
`getSettings`/`setSettings`/`useSettings` handle it.

### `src/lib/googleMaps.js`
- Add a pure helper:
  ```
  pickMapsKey(userKey, fallbackKey) → string
  // trims userKey; returns it if non-empty, else fallbackKey (or '')
  ```
- `loadGoogleMaps()` resolves its key via
  `pickMapsKey(getSettings().googleMapsKey, import.meta.env.VITE_GOOGLE_MAPS_API_KEY)`.
- Everything else unchanged: load-once, `no-key` reject when empty, `load-failed`
  on script error.

### `src/components/SettingsModal.jsx`
New `<Section title="Google Maps">` placed right after "Today panel":
- Masked key input with a show/hide toggle (monospace).
- Help text: *"Your own Google Maps key (Maps JavaScript + Places enabled,
  referrer-restricted). Leave blank to use the company key."*
- When the field differs from the value at modal open, show a **"Reload to
  apply"** button → `window.location.reload()`.

### `src/components/MapsPanel.jsx`
Update the `no-key` fallback copy to point users to **Settings → Google Maps**
(primary), keeping a secondary admin note about `VITE_GOOGLE_MAPS_API_KEY`.

## Edge cases

- Blank/whitespace user key → firm fallback.
- Neither user nor firm key → `no-key` setup card (updated copy).
- Key entered/changed mid-session → "Reload to apply" (load-once constraint).
- Existing users with no setting → unchanged behavior (firm key via fallback).

## Testing

- **Vitest** for `pickMapsKey`: user key wins; trims surrounding whitespace;
  falls back when blank/whitespace/undefined; returns `''` when neither present.
- Script load, settings UI, and reload behavior: manual verification by running
  the app.

## Out of scope (YAGNI)

- Per-user **Claude** keys (explicitly kept shared).
- Syncing the Maps key across devices (device-local by choice).
- In-app validation against Google (rely on the existing `load-failed` surface).
- Removing the firm fallback key.

## Files touched

- `src/lib/settings.js` (add `googleMapsKey`).
- `src/lib/googleMaps.js` (`pickMapsKey` + precedence).
- `src/components/SettingsModal.jsx` (Google Maps section).
- `src/components/MapsPanel.jsx` (no-key copy).
- `src/lib/__tests__/googleMaps.test.js` (new).
