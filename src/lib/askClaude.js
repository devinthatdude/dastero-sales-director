// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
//
// Thin client for the `ask-claude` Edge Function. Builds a compact, real-data
// pipeline context from the rep's leads and asks Claude. Never throws — on any
// failure (function not deployed, key missing, network) it returns a friendly
// fallback string so the UI degrades gracefully instead of breaking.

import { supabase } from './supabaseClient';
import { OPEN_STAGES, STAGES, money, daysUntil, urgency } from './pipeline';

const stageName = (id) => STAGES.find((s) => s.id === id)?.name || id;

// A short, factual snapshot of the open pipeline — the model's ground truth.
export function buildContext(leads) {
  const open = leads.filter((l) => OPEN_STAGES.includes(l.stage));
  const openVal = open.reduce((s, l) => s + +l.value, 0);
  const lines = open
    .slice()
    .sort((a, b) => (daysUntil(a.action_date) ?? 1e9) - (daysUntil(b.action_date) ?? 1e9))
    .map((l) => {
      const u = urgency(l);
      const svc = (l.services || [])[0] || '—';
      return `- ${l.company} · ${money(l.value)} · ${stageName(l.stage)} · ${svc} · ${u.label}`;
    });
  return (
    `Active pipeline: ${money(openVal)} across ${open.length} open deal${open.length !== 1 ? 's' : ''}.\n` +
    `Open deals (most time-sensitive first):\n${lines.join('\n') || '- (none)'}`
  );
}

async function invoke(question, leads, responseSchema) {
  const { data, error } = await supabase.functions.invoke('ask-claude', {
    body: { question, context: buildContext(leads), responseSchema },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.answer ?? '';
}

// Free-form question (Today tab). Returns plain text, or a graceful fallback.
export async function askClaude(question, leads) {
  try {
    return await invoke(question, leads);
  } catch {
    return "I couldn't reach Claude just now. The assistant may not be deployed yet — " +
      'once the ask-claude function is live, this will answer from your real pipeline.';
  }
}

// JSON schema for Coach plays — keeps the model's output strictly parseable.
const PLAYS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    plays: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          company: { type: 'string' },
          tag: { type: 'string', description: 'short risk/urgency label, e.g. "2d overdue"' },
          action: { type: 'string', description: 'the single next best action, imperative' },
          reason: { type: 'string', description: 'one sentence on why now' },
          cta: { type: 'string', description: 'short button label, e.g. "Draft email"' },
        },
        required: ['company', 'tag', 'action', 'reason', 'cta'],
      },
    },
  },
  required: ['plays'],
};

// Coach plays: AI-ranked next-best actions for the most at-risk deals.
// Falls back to a deterministic, rule-based set if the assistant is unavailable.
export async function coachPlays(leads) {
  const question =
    'From the open pipeline above, choose the 3 deals most at risk of slipping (overdue or ' +
    'long-quiet, weighted by value) and return the single next best action for each. ' +
    'Keep actions imperative and specific; keep reasons to one sentence.';
  try {
    const text = await invoke(question, leads, PLAYS_SCHEMA);
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.plays) && parsed.plays.length) return { plays: parsed.plays, ai: true };
  } catch {
    /* fall through to rule-based */
  }
  return { plays: rulePlays(leads), ai: false };
}

// Deterministic fallback — ranks by overdue-ness then value, no AI required.
function rulePlays(leads) {
  return leads
    .filter((l) => OPEN_STAGES.includes(l.stage))
    .map((l) => ({ l, d: daysUntil(l.action_date) ?? 9999 }))
    .sort((a, b) => a.d - b.d || +b.l.value - +a.l.value)
    .slice(0, 3)
    .map(({ l }) => {
      const u = urgency(l);
      return {
        company: l.company,
        tag: u.label,
        action: `Follow up on ${stageName(l.stage).toLowerCase()} — ${l.next_action || 'reconnect and confirm next step'}.`,
        reason: `${money(l.value)} open at ${stageName(l.stage)}; ${u.label.toLowerCase()}.`,
        cta: l.email ? 'Draft email' : 'Open deal',
      };
    });
}
