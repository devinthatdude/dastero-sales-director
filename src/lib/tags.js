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
