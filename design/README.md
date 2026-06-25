# Dastero Sales Director — Design Direction

A proposed visual direction: **light + "connected."** Pulls the app into the
dasterotech.com brand world (light, professional, network motif) and away from
the current standalone dark dashboard.

## Files
- `today-mockup.html` — self-contained, interactive mockup of the **Today** screen.
  Open it in any browser, or upload it to claude.ai to iterate on the design in depth.
  (No build step, no dependencies — everything is inline.)

## Design tokens (the system)

| Role | Hex | Use |
|---|---|---|
| Ground | `#EEF2F9` | App field — cool light "mist" (deliberately not cream) |
| Surface | `#FFFFFF` | Cards |
| Ink | `#0C1626` | Primary text |
| Muted | `#5C6B85` | Secondary text |
| Faint | `#92A0B8` | Eyebrows / tertiary |
| Hairline | `#DCE4F1` | Borders / rules |
| Signal (accent) | `#2F6BF0` | Primary action, active nav, the constellation |
| Cyan | `#14B5C0` | Secondary signal, used sparingly |
| Won (green) | `#1B9E6E` | Pipeline status |
| Due (amber) | `#D98A2B` | Pipeline status |
| Overdue (rose) | `#DC4B43` | Pipeline status |

## Type
- **Display / headings:** heavy weight, tight tracking. Build target: **Archivo**.
- **Body:** clean sans. Build target: **Inter** (already in the app).
- **Data / figures:** **monospace** for every dollar value, count, metric. Build
  target: **IBM Plex Mono**. (The mockup uses system fonts because the preview
  sandbox blocks web fonts; the real app loads the named faces via Vite.)

## Signature
A faint **node-link constellation** behind the header (canvas-drawn, ~12% opacity,
gently drifting; static under `prefers-reduced-motion`). It's the brand's
"Your Connection to the World" tagline made literal — atmosphere, not ornament.

## Principles applied
- Color only where it carries meaning (action vs. pipeline-health).
- Hairline/ink structure instead of rounded-everything.
- One bold move (the constellation); everything else quiet.

## Status
Mockup only — **not yet applied** to the app. Rolling it across all six tabs +
the lead detail drawer means consolidating the currently-inline hex colors into
these tokens in `src/index.css`, then applying. Estimated: a focused day.
