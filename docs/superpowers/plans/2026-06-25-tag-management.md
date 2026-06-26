# In-App Tag Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any signed-in user create, rename, recolor, and delete catalog tags from a new "Tags" section in Settings.

**Architecture:** A new `src/lib/tags.js` holds two pure helpers (`isHexColor`, `tagUsageCounts`) and three thin Supabase writers (`createTag`/`updateTag`/`deleteTag`). `useTags` is upgraded with realtime + auth-race hardening so the catalog stays live. `TagManager.jsx` is the Settings UI; `SettingsModal`/`AppShell` host it. A user-run SQL migration grants tag-write RLS and makes `lead_tags` cascade on delete.

**Tech Stack:** React 18, Vite 5, Tailwind v3, Supabase JS v2, Vitest.

## Global Constraints

- Mobile-first; Settings modal is `max-h-[92vh] overflow-auto`, container ~420–512px.
- "Everyone" manages tags: RLS grants INSERT/UPDATE/DELETE to `authenticated`.
- Color must satisfy `tags_color_hex_chk` (`#abc` or `#abcabc`, case-insensitive; null allowed). Blank color is stored as `null`.
- Empty/whitespace label blocks commit; emoji optional, trimmed to ≤2 chars.
- Delete cascades `lead_tags` (DB FK), gated by a usage-count confirm dialog.
- `useTags()` MUST keep returning the tag array (existing consumers rely on it).
- License header line on every new source file: `// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.`
- Commit after each task. Do NOT push (pushes are interactive by the user).

---

## Task 0: Tags-write RLS + cascade migration (USER-RUN authoring)

**Files:**
- Create: `sql/2026-06-25_tags_manage_authenticated.sql`
- Modify: `sql/README.md`

**Interfaces:**
- Consumes: nothing code-level.
- Produces: a migration the user applies in Supabase; documents tag-write access.

- [ ] **Step 1: Write the migration**

Create `sql/2026-06-25_tags_manage_authenticated.sql`:

```sql
-- © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
-- In-app tag management: let any authenticated user manage the shared tag
-- catalog, and make tag deletion cascade to lead_tags.
-- HOW TO APPLY: Supabase → SQL editor → run. Re-runnable.

-- 0) Diagnostic (informational): current tags policies + the lead_tags FK action.
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'tags' order by cmd;

select con.conname, con.confdeltype  -- confdeltype: 'c'=cascade, 'a'=no action, 'r'=restrict
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'lead_tags' and con.contype = 'f';

-- 1) Enable RLS and (re)create the full policy set by name (re-runnable).
alter table public.tags enable row level security;

drop policy if exists tags_select_authenticated on public.tags;
create policy tags_select_authenticated on public.tags
  for select to authenticated using (true);

drop policy if exists tags_insert_authenticated on public.tags;
create policy tags_insert_authenticated on public.tags
  for insert to authenticated with check (true);

drop policy if exists tags_update_authenticated on public.tags;
create policy tags_update_authenticated on public.tags
  for update to authenticated using (true) with check (true);

drop policy if exists tags_delete_authenticated on public.tags;
create policy tags_delete_authenticated on public.tags
  for delete to authenticated using (true);

-- 2) Ensure lead_tags.tag_id cascades on tag delete. Recreate the FK if it is
--    not already ON DELETE CASCADE. Adjust the FK/column name if yours differ
--    (check the diagnostic in step 0).
do $$
declare
  fk_name text;
  is_cascade boolean;
begin
  select con.conname, (con.confdeltype = 'c')
    into fk_name, is_cascade
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
  where rel.relname = 'lead_tags' and con.contype = 'f' and att.attname = 'tag_id'
  limit 1;

  if fk_name is null then
    -- No FK yet: create one with cascade.
    alter table public.lead_tags
      add constraint lead_tags_tag_id_fkey
      foreign key (tag_id) references public.tags(id) on delete cascade;
  elsif not is_cascade then
    execute format('alter table public.lead_tags drop constraint %I', fk_name);
    alter table public.lead_tags
      add constraint lead_tags_tag_id_fkey
      foreign key (tag_id) references public.tags(id) on delete cascade;
  end if;
end $$;
```

- [ ] **Step 2: Document it in `sql/README.md`**

Append this section to `sql/README.md`:

```markdown

## tags write access
`2026-06-25_tags_manage_authenticated.sql` grants INSERT/UPDATE/DELETE on
`tags` to all authenticated users (in-app tag management) and makes
`lead_tags.tag_id` cascade on delete. Apply it before using the Settings → Tags
manager, or saves will fail with an RLS error.
```

- [ ] **Step 3: Commit**

```bash
git add sql/2026-06-25_tags_manage_authenticated.sql sql/README.md
git commit -m "chore(sql): add tag-write RLS + lead_tags cascade migration"
```

---

## Task 1: Pure helpers `isHexColor` + `tagUsageCounts` (TDD)

**Files:**
- Create: `src/lib/tags.js`
- Test: `src/lib/__tests__/tags.test.js`

**Interfaces:**
- Produces:
  ```
  isHexColor(str) → boolean      // true for '#abc' / '#abcabc' (case-insensitive)
  tagUsageCounts(leads) → Map<tagId, number>   // from each lead.tagIds[]
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/tags.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { isHexColor, tagUsageCounts } from '../tags';

describe('isHexColor', () => {
  it('accepts 3- and 6-digit hex, case-insensitive', () => {
    expect(isHexColor('#abc')).toBe(true);
    expect(isHexColor('#35C28A')).toBe(true);
    expect(isHexColor('#FFFFFF')).toBe(true);
  });
  it('rejects malformed / empty / null', () => {
    expect(isHexColor('')).toBe(false);
    expect(isHexColor(null)).toBe(false);
    expect(isHexColor('35C28A')).toBe(false); // missing #
    expect(isHexColor('#ab')).toBe(false);    // wrong length
    expect(isHexColor('#xyz')).toBe(false);   // non-hex
  });
});

describe('tagUsageCounts', () => {
  it('counts tag ids across leads', () => {
    const leads = [
      { id: 1, tagIds: ['t1', 't2'] },
      { id: 2, tagIds: ['t1'] },
      { id: 3, tagIds: [] },
      { id: 4 }, // no tagIds
    ];
    const m = tagUsageCounts(leads);
    expect(m.get('t1')).toBe(2);
    expect(m.get('t2')).toBe(1);
    expect(m.get('t3')).toBeUndefined();
  });
  it('returns empty map for no leads', () => {
    expect(tagUsageCounts([]).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tags`
Expected: FAIL — cannot find module `../tags`.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/tags.js`:

```js
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { supabase } from './supabaseClient';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Mirror the DB constraint tags_color_hex_chk. Null/empty are NOT hex (the
// caller decides whether blank is allowed and stores null in that case).
export function isHexColor(str) {
  return typeof str === 'string' && HEX_RE.test(str);
}

// Map<tagId, count> across every lead's tagIds[] — powers the delete warning.
export function tagUsageCounts(leads) {
  const counts = new Map();
  for (const lead of leads || []) {
    for (const id of lead.tagIds || []) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tags`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tags.js src/lib/__tests__/tags.test.js
git commit -m "feat(tags): add isHexColor + tagUsageCounts pure helpers"
```

---

## Task 2: Tag write API (`createTag`/`updateTag`/`deleteTag`)

**Files:**
- Modify: `src/lib/tags.js`

**Interfaces:**
- Consumes: `supabase`.
- Produces:
  ```
  createTag({ label, color, emoji }) → Promise<{ error }>
  updateTag(id, patch)              → Promise<{ error }>
  deleteTag(id)                     → Promise<{ error }>
  ```
  Blank `color`/`emoji` are normalized to `null`. `label` is trimmed.

Thin Supabase wrappers; verified by build + the manual run in Task 6 (no network
mock in the test setup).

- [ ] **Step 1: Add the writers to `src/lib/tags.js`**

Append to `src/lib/tags.js`:

```js
// Normalize optional text fields: trimmed, or null when blank.
const orNull = (v) => {
  const t = (v ?? '').toString().trim();
  return t.length ? t : null;
};

export function createTag({ label, color, emoji }) {
  return supabase.from('tags').insert({
    label: (label ?? '').trim(),
    color: orNull(color),
    emoji: orNull(emoji),
  });
}

export function updateTag(id, patch) {
  const next = { ...patch };
  if ('label' in next) next.label = (next.label ?? '').trim();
  if ('color' in next) next.color = orNull(next.color);
  if ('emoji' in next) next.emoji = orNull(next.emoji);
  return supabase.from('tags').update(next).eq('id', id);
}

export function deleteTag(id) {
  return supabase.from('tags').delete().eq('id', id);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tags.js
git commit -m "feat(tags): add create/update/delete tag write API"
```

---

## Task 3: Upgrade `useTags` (realtime + auth-race hardening)

**Files:**
- Modify: `src/hooks/useTags.js`

**Interfaces:**
- Consumes: `supabase`.
- Produces: same return (`tags[]`), now kept live via realtime + auth refetch.

Verification: build + manual (catalog updates without reload).

- [ ] **Step 1: Rewrite the hook**

Replace `src/hooks/useTags.js`:

```js
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// The shared tag catalog. Kept live so in-app create/edit/delete (Settings →
// Tags) reflects everywhere, and refetched when auth settles so a cold-load
// race doesn't leave it empty.
export function useTags() {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      supabase.from('tags').select('*').order('label')
        .then(({ data }) => { if (active) setTags(data || []); });

    load();
    const ch = supabase.channel('tags-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, load)
      .subscribe();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) load();
    });
    return () => { active = false; supabase.removeChannel(ch); sub.subscription.unsubscribe(); };
  }, []);

  return tags;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTags.js
git commit -m "feat(tags): keep tag catalog live (realtime + auth-race refetch)"
```

---

## Task 4: `TagManager` component

**Files:**
- Create: `src/components/TagManager.jsx`

**Interfaces:**
- Consumes: `tags: Tag[]`, `leads: Lead[]`; `createTag`/`updateTag`/`deleteTag`/`isHexColor`/`tagUsageCounts` from `../lib/tags`.
- Produces: `<TagManager tags leads />` default export.

Verification: build + manual run.

- [ ] **Step 1: Implement the component**

Create `src/components/TagManager.jsx`:

```jsx
// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { AVATAR_PALETTE } from '../lib/pipeline';
import { createTag, updateTag, deleteTag, isHexColor, tagUsageCounts } from '../lib/tags';

const SWATCHES = [...AVATAR_PALETTE, '#7C8AA6'];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SWATCHES.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Color ${c}`}
          className="w-5 h-5 rounded-full flex-none"
          style={{ background: c, outline: value === c ? '2px solid #0C1626' : 'none', outlineOffset: 1 }} />
      ))}
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#hex"
        className="input !w-20 !py-1 text-[11px] mono" />
    </div>
  );
}

function Chip({ label, color, emoji }) {
  const c = isHexColor(color) ? color : '#7C8AA6';
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: c + '22', color: c }}>{emoji} {label || 'Preview'}</span>
  );
}

function Row({ tag, usage, onError }) {
  const [label, setLabel] = useState(tag.label || '');
  const [color, setColor] = useState(tag.color || '');
  const [emoji, setEmoji] = useState(tag.emoji || '');
  const colorOk = !color || isHexColor(color);
  const dirty = label !== (tag.label || '') || color !== (tag.color || '') || emoji !== (tag.emoji || '');
  const canSave = label.trim() && colorOk && dirty;

  const commit = async () => {
    if (!canSave) return;
    const { error } = await updateTag(tag.id, { label, color, emoji });
    onError(error ? friendly(error) : '');
  };
  const remove = async () => {
    const n = usage || 0;
    const msg = n ? `"${tag.label}" is on ${n} lead${n !== 1 ? 's' : ''} — remove it from all of them?`
                  : `Delete "${tag.label}"?`;
    if (!window.confirm(msg)) return;
    const { error } = await deleteTag(tag.id);
    onError(error ? friendly(error) : '');
  };

  return (
    <div className="panel rounded-xl p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))} onBlur={commit}
          placeholder="🙂" className="input !w-12 text-center !py-1" />
        <input value={label} onChange={e => setLabel(e.target.value)} onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()} placeholder="Label"
          className="input flex-1 !py-1" />
        <button onClick={remove} aria-label="Delete tag" className="px-2 text-[15px]"
          style={{ color: '#DC4B43' }}>🗑</button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <ColorPicker value={color} onChange={setColor} />
        <Chip label={label} color={color} emoji={emoji} />
      </div>
      {color && !colorOk && <div className="text-[11px]" style={{ color: '#DC4B43' }}>Use #abc or #aabbcc.</div>}
      {canSave && <button onClick={commit} className="self-start text-[11px] font-bold px-2 py-1 rounded-lg"
        style={{ background: 'rgba(47,107,240,.12)', color: '#2F6BF0' }}>Save changes</button>}
    </div>
  );
}

function AddRow({ onError }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [emoji, setEmoji] = useState('');
  const colorOk = !color || isHexColor(color);
  const canAdd = label.trim() && colorOk;

  const add = async () => {
    if (!canAdd) return;
    const { error } = await createTag({ label, color, emoji });
    if (error) { onError(friendly(error)); return; }
    setLabel(''); setEmoji(''); setColor(SWATCHES[0]); onError('');
  };

  return (
    <div className="panel rounded-xl p-2.5 flex flex-col gap-2" style={{ borderStyle: 'dashed' }}>
      <div className="flex items-center gap-2">
        <input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))} placeholder="🙂"
          className="input !w-12 text-center !py-1" />
        <input value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} placeholder="New tag label"
          className="input flex-1 !py-1" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <ColorPicker value={color} onChange={setColor} />
        <Chip label={label} color={color} emoji={emoji} />
      </div>
      {color && !colorOk && <div className="text-[11px]" style={{ color: '#DC4B43' }}>Use #abc or #aabbcc.</div>}
      <button onClick={add} disabled={!canAdd} className="self-start text-[12px] font-bold px-3 py-1.5 rounded-lg"
        style={canAdd ? { background: '#2F6BF0', color: '#fff' } : { background: '#EEF2F9', color: '#92A0B8' }}>
        + Add tag
      </button>
    </div>
  );
}

function friendly(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('row-level security') || m.includes('policy') || m.includes('permission'))
    return "Couldn't save — tag permissions may not be migrated yet.";
  return error?.message || 'Something went wrong.';
}

export default function TagManager({ tags = [], leads = [] }) {
  const [err, setErr] = useState('');
  const usage = tagUsageCounts(leads);
  return (
    <div className="flex flex-col gap-2.5">
      {err && <div className="text-[12px] rounded-lg px-3 py-2"
        style={{ background: 'rgba(220,75,67,.1)', color: '#DC4B43' }}>{err}</div>}
      {tags.map(t => <Row key={t.id} tag={t} usage={usage.get(t.id)} onError={setErr} />)}
      <AddRow onError={setErr} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/TagManager.jsx
git commit -m "feat(tags): add TagManager UI (create/edit/recolor/delete)"
```

---

## Task 5: Mount TagManager in Settings

**Files:**
- Modify: `src/components/SettingsModal.jsx`
- Modify: `src/components/AppShell.jsx`

**Interfaces:**
- Consumes: `TagManager`; `tags` + `leads` passed from `AppShell`.
- Produces: a "Tags" section in the Settings modal.

- [ ] **Step 1: Add the Tags section to SettingsModal**

In `src/components/SettingsModal.jsx`, add the import near the top (after the existing imports):

```jsx
import TagManager from './TagManager';
```

Change the component signature to accept `tags` + `leads`:

```jsx
export default function SettingsModal({ onClose, profile, isAdmin, onSignOut, onChangePassword, tags = [], leads = [] }){
```

Insert this `<Section>` immediately after the "New-lead defaults" section and
before the "Outreach identity" section:

```jsx
          {/* Tags */}
          <Section title="Tags" desc="Shared labels you can attach to leads. Everyone on the team uses the same set.">
            <TagManager tags={tags} leads={leads} />
          </Section>
```

- [ ] **Step 2: Pass props from AppShell**

In `src/components/AppShell.jsx`, find the `SettingsModal` render (around line 137-139) and add `tags` + `leads`:

```jsx
      {settingsOpen && (
        <SettingsModal onClose={()=>setSettingsOpen(false)} profile={profile} isAdmin={isAdmin}
          tags={tags} leads={data.leads}
          onSignOut={onSignOut} onChangePassword={()=>{setSettingsOpen(false);setPwOpen(true);}} />
      )}
```

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsModal.jsx src/components/AppShell.jsx
git commit -m "feat(tags): mount TagManager in Settings"
```

---

## Task 6: Manual verification pass

**Files:** none.

- [ ] **Step 1:** Run `npm run dev`, open Settings → Tags.
- [ ] **Step 2:** Add a tag (label + swatch + emoji) → appears in the list and on a lead's Tags sub-tab.
- [ ] **Step 3:** Rename + recolor an existing tag → chip preview updates; "Save changes" persists; chip updates on leads.
- [ ] **Step 4:** Custom hex: invalid (`#zz`) disables save with a hint; valid persists; blank stores a neutral chip.
- [ ] **Step 5:** Delete a tag that's on a lead → confirm dialog shows the count; on confirm it disappears from the catalog AND from the lead (cascade).
- [ ] **Step 6:** If saves error with the RLS message, run `sql/2026-06-25_tags_manage_authenticated.sql` in Supabase (user task), then retry.
- [ ] **Step 7:** Commit any tweaks: `git add -A && git commit -m "chore(tags): verification tweaks"`.

---

## Self-Review

**Spec coverage:**
- Everyone-manages RLS + cascade → Task 0. ✓
- Pure helpers (isHexColor, tagUsageCounts) + tests → Task 1. ✓
- Write API (create/update/delete, blank→null) → Task 2. ✓
- Live catalog (realtime + auth race) → Task 3. ✓
- TagManager UX (rows, add, swatches+hex, chip preview, delete-with-count, RLS error) → Task 4. ✓
- Settings home + AppShell wiring (tags + leads) → Task 5. ✓
- Testing: Vitest helpers (Task 1) + manual (Task 6). ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `createTag({label,color,emoji})`, `updateTag(id, patch)`,
`deleteTag(id)`, `isHexColor`, `tagUsageCounts` defined in Tasks 1-2 and consumed
with identical signatures in Task 4. `useTags()` still returns an array (Task 3),
matching `const tags = useTags()` in AppShell. `SettingsModal` new props
`tags`/`leads` match what AppShell passes (Task 5).
