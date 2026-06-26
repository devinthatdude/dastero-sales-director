// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { AVATAR_PALETTE } from '../lib/pipeline';
import { createTag, updateTag, deleteTag, isHexColor, tagUsageCounts } from '../lib/tags';

const SWATCHES = [...AVATAR_PALETTE, '#7C8AA6'];

function friendly(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('row-level security') || m.includes('policy') || m.includes('permission'))
    return "Couldn't save — tag permissions may not be migrated yet.";
  return error?.message || 'Something went wrong.';
}

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
