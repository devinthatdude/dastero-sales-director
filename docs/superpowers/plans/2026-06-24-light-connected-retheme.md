# "Light + Connected" Re-theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended here) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. **This is visual work** — after the foundation, a human must look at the running app; build-passing is necessary but NOT sufficient.

**Goal:** Convert the app from the dark dashboard to the approved "light + connected" direction (light mist ground, ink text, signal-blue accent, monospace figures, node-link constellation), applied across all screens.

**Architecture:** Flip the centralized tokens in `src/index.css` first — most components use `.panel`/`.surface`/`.input`/`.soft`/`.dim`/`.brandbtn` and inherit `body` color, so the foundation re-themes the shell in one move. Then sweep each component for the two things tokens *can't* reach: hardcoded `text-white` (invisible on light) and inline brand hexes (need the new values). A canvas `NetworkField` adds the signature.

**Tech Stack:** React 18, Vite 5, Tailwind v3, Supabase. Design source: `design/README.md` + `design/today-mockup.html`.

## Global Constraints

- Tailwind **v3** only. Every source file keeps its `// © 2026 Dastero Tech LLC…` header.
- No test framework — gate each task on `npm run build` **and** a human look at `localhost:5173`.
- **DO NOT touch the `printDealSheet` function in `LeadDetail.jsx`** — it's a light print document with its own (correct) colors. The sweep excludes it.
- Keep CSS custom-property **names** identical (`--bg`, `--panel`, `--card`, `--line`, `--brand`, `--brand2`, `--cyan`, `--amber`, `--rose`, `--green`, `--text`, `--soft`, `--dim`) so class-based usages auto-update.

## Canonical color mapping (old dark → new light) — used by every sweep task
Apply to **app-UI inline hexes only** (never inside `printDealSheet`):

| Old | New | Meaning |
|---|---|---|
| `#0A0E1A` | `#EEF2F9` | page ground |
| `#121A2C` / `#172033` | `#FFFFFF` | panel / card |
| `#1D2840` | `#F4F7FC` | hover field |
| `#26314B` | `#DCE4F1` | hairline |
| `#3B6FF0` | `#2F6BF0` | brand/signal |
| `#2E5BD6` | `#1E4FC8` | brand dark |
| `#2FB6C8` | `#2F6BF0` | accent → promote to signal blue |
| `#F0A93C` | `#D98A2B` | amber |
| `#F0584E` | `#DC4B43` | rose |
| `#35C28A` | `#1B9E6E` | green |
| `#E9EEF8` | `#0C1626` | primary text |
| `#9AA6C0` | `#5C6B85` | soft text |
| `#626E8B` | `#92A0B8` | dim text |
| `class="… text-white …"` | drop `text-white` (inherits ink) unless on a colored fill, then `text-white` stays | emphasis |

---

### Task 1: Token foundation (`index.css`)

**Files:** Modify (full rewrite): `src/index.css`

- [ ] **Step 1: Replace the file with the light token system**

```css
/* © 2026 Dastero Tech LLC — All rights reserved. See LICENSE. */
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{
  --bg:#EEF2F9; --panel:#FFFFFF; --card:#FFFFFF; --cardh:#F4F7FC; --line:#DCE4F1;
  --brand:#2F6BF0; --brand2:#1E4FC8; --cyan:#14B5C0; --amber:#D98A2B;
  --rose:#DC4B43; --green:#1B9E6E; --text:#0C1626; --soft:#5C6B85; --dim:#92A0B8;
}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(120% 80% at 80% -10%, #E5ECF8 0%, var(--bg) 55%);
  color:var(--text);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2{font-family:'Archivo',sans-serif;letter-spacing:-.01em}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace;font-feature-settings:"tnum" 1}
.panel{background:var(--panel);border:1px solid var(--line)}
.surface{background:var(--card);border:1px solid var(--line);box-shadow:0 10px 24px -20px rgba(12,22,38,.45)}
.soft{color:var(--soft)} .dim{color:var(--dim)}
.brandbtn{background:linear-gradient(160deg,var(--brand),var(--brand2));color:#fff;border:none;
  box-shadow:0 10px 20px -8px rgba(47,107,240,.6)}
.input{width:100%;font-family:'Inter',sans-serif;font-size:14px;padding:9px 11px;border:1px solid var(--line);
  border-radius:9px;background:#fff;color:var(--text)}
.input:focus{outline:2px solid var(--brand);border-color:var(--brand)}
@media (prefers-reduced-motion: reduce){*{transition:none !important}}
```

- [ ] **Step 2:** `npm run build` → expect `✓ built`.
- [ ] **Step 3: Commit** `git add src/index.css && git commit -m "Re-theme foundation: light token system + fonts"` (add the Co-Authored-By trailer).

---

### Task 2: Recolor stages + urgency tones (`pipeline.js`)

**Files:** Modify: `src/lib/pipeline.js` (the `STAGES` array colors and the `TONE` map only).

- [ ] **Step 1: Replace the `STAGES` color values and `TONE` map** with light-appropriate hues (keep ids/names/keys identical):

```js
export const STAGES = [
  { id:'prospect',           name:'Prospect',           color:'#7C8AA6' },
  { id:'qualified',          name:'Qualified',          color:'#2F6BF0' },
  { id:'discovery_done',     name:'Discovery Done',     color:'#6E5BE0' },
  { id:'solution_presented', name:'Solution Presented', color:'#C7891B' },
  { id:'negotiating',        name:'Negotiating',        color:'#D98A2B' },
  { id:'closed_won',         name:'Closed Won',         color:'#1B9E6E' },
  { id:'closed_lost',        name:'Closed Lost',        color:'#92A0B8' },
];
```
and
```js
export const TONE = {fresh:'#14B5C0',warm:'#D98A2B',cold:'#DC4B43',won:'#1B9E6E',lost:'#92A0B8',none:'#92A0B8'};
```
Leave `daysUntil`, `urgency`, `money`, `repName`, `SERVICES`, `SOURCES`, `OPEN_STAGES` unchanged.

- [ ] **Step 2:** `npm run build`. **Step 3: Commit** `Recolor stages and urgency tones for light theme`.

---

### Task 3: Constellation signature (`NetworkField` + Today header)

**Files:** Create `src/components/NetworkField.jsx`; Modify `src/components/tabs/TodayTab.jsx` (header only).

- [ ] **Step 1: Create `src/components/NetworkField.jsx`** (canvas component; static under reduced-motion):

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useRef } from 'react';

export default function NetworkField(){
  const ref = useRef(null);
  useEffect(()=>{
    const c = ref.current, ctx = c.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, nodes, raf;
    const seed=()=>{
      const r=c.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
      w=r.width; h=r.height; c.width=w*dpr; c.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      nodes=Array.from({length:16},(_,i)=>({x:((i*97)%100)/100*w,y:((i*53)%100)/100*h,
        vx:(((i*7)%5)-2)*0.05, vy:(((i*11)%5)-2)*0.05}));
    };
    const frame=()=>{
      ctx.clearRect(0,0,w,h);
      for(const n of nodes){ if(!reduce){ n.x+=n.vx; n.y+=n.vy;
        if(n.x<0||n.x>w)n.vx*=-1; if(n.y<0||n.y>h)n.vy*=-1; } }
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<88){ ctx.strokeStyle='rgba(47,107,240,'+(0.13*(1-d/88))+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } }
      for(const n of nodes){ ctx.fillStyle='rgba(47,107,240,0.22)';
        ctx.beginPath(); ctx.arc(n.x,n.y,1.7,0,Math.PI*2); ctx.fill(); }
      if(!reduce) raf=requestAnimationFrame(frame);
    };
    seed(); frame();
    const onR=()=>{ cancelAnimationFrame(raf); seed(); frame(); };
    addEventListener('resize',onR);
    return ()=>{ cancelAnimationFrame(raf); removeEventListener('resize',onR); };
  },[]);
  return <canvas ref={ref} aria-hidden="true"
    style={{position:'absolute',inset:0,width:'100%',height:'100%'}} />;
}
```

- [ ] **Step 2: In `TodayTab.jsx`**, import it (`import NetworkField from '../NetworkField';`), make the header wrapper `relative` + `overflow-hidden`, render `<NetworkField/>` as the first child of the header, and put the existing greeting block in a `position:relative; z-index:1` container so it sits above the canvas. (Read the file; the header is the top `<div className="flex justify-between items-start">` region.)
- [ ] **Step 3:** `npm run build`. **Step 4: Commit** `Add node-link constellation to the Today header`.

---

### Task 4: VISUAL CHECKPOINT (no code) — look before polishing

- [ ] **Step 1:** `npm run dev`, open `localhost:5173`, sign in.
- [ ] **Step 2:** Walk **every tab** (Today, Pipeline, Coach, Leads, Stats, Import) + open a lead (the detail drawer) + the Change-password modal + Login (sign out). For each, note: invisible text (leftover `text-white` on light), wrong-colored accents (old hexes), and anything unreadable.
- [ ] **Step 3:** Record the per-screen issue list. This list drives Tasks 5–7. **Do not proceed blind** — the build passing does not mean it looks right.

---

### Task 5: Sweep the lead surfaces (`LeadCard.jsx`, `LeadDetail.jsx`)

**Files:** Modify `src/components/LeadCard.jsx`, `src/components/LeadDetail.jsx`.

- [ ] **Step 1:** Apply the **canonical color mapping** to every inline hex and `text-white` in both files — **except** inside the `printDealSheet` function in `LeadDetail.jsx`, which stays exactly as-is.
- [ ] **Step 2:** Wrap money/figures in the `.mono` class where they render as values (e.g. `money(...)` outputs, the `Value` row).
- [ ] **Step 3:** `npm run build` + look at a lead card and the detail drawer on `localhost:5173`. **Step 4: Commit** `Re-theme lead card and detail drawer`.

---

### Task 6: Sweep the remaining tabs (`PipelineTab`, `StatsTab`, `CoachTab`, `ImportTab`, `LeadsTab`)

**Files:** Modify those five tab files.

- [ ] **Step 1:** Apply the **canonical color mapping** to inline hexes + `text-white` in each. For `StatsTab` bar charts, the bar `color` props come from `pipeline.js`/the mapping — verify bars are visible on white. For `PipelineTab` kanban columns, ensure column/card backgrounds use `.surface`/`.panel` not old dark hexes.
- [ ] **Step 2:** Wrap dollar figures + counts in `.mono` where they're displayed as metrics.
- [ ] **Step 3:** `npm run build` + look at each of the five tabs. **Step 4: Commit** `Re-theme Pipeline, Stats, Coach, Import, Leads tabs`.

---

### Task 7: Sweep the shell (`AppShell`, `ChangePassword`) + Login accent

**Files:** Modify `src/components/AppShell.jsx`, `src/components/ChangePassword.jsx`, `src/components/Login.jsx`.

- [ ] **Step 1:** `AppShell` — bottom nav active color + error banner: apply the mapping (active tab `#2F6BF0`; the nav bar reads on light via `.panel`). `ChangePassword` modal: apply mapping + `text-white`→ink (the overlay `rgba(8,12,24,.6)` backdrop stays). `Login` already uses light Tailwind classes — only swap its accent (`focus-visible:ring-teal-500` and the dark button) toward the signal blue if desired for consistency; otherwise leave.
- [ ] **Step 2:** `npm run build` + look at the nav, the modal, and the login screen. **Step 3: Commit** `Re-theme app shell, change-password, login accent`.

---

### Task 8: Docs + final visual pass

- [ ] **Step 1:** Update `CHANGELOG.md` under `[Unreleased] → Changed`: `- **Light "connected" redesign.** App moved from the dark dashboard to a light brand-aligned theme (tokens in index.css), monospace figures, and a node-link header motif.`
- [ ] **Step 2:** Final walk of all screens on `localhost:5173`; fix any stragglers found. **Step 3: Commit** `Document light redesign`.

---

## Self-Review
- **Spec coverage:** tokens → T1; stage/tone colors → T2; constellation → T3; per-screen application of palette+mono+ink → T5/T6/T7; print-sheet exclusion → Global Constraints + T5. ✅
- **Placeholder scan:** foundation/pipeline/NetworkField carry full code; sweep tasks carry the explicit canonical mapping table as their transformation spec (not vague — exact old→new values). The visual checkpoint (T4) is intentionally code-free. ✅
- **Risk noted:** this is visual; T4 is a hard gate so the per-screen sweeps are informed by real renders, not done blind.
