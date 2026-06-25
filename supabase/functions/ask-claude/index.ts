// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
//
// Edge Function: ask-claude
// -------------------------------------------------------------------------
// Secure server-side proxy to the Anthropic Messages API. The Anthropic key
// lives ONLY here (as the ANTHROPIC_API_KEY secret) and never reaches the
// browser bundle — the browser talks to this function, this function talks to
// Anthropic. JWT verification is on by default for Supabase Edge Functions, so
// only signed-in users of this project can call it.
//
// Deploy:
//   supabase functions deploy ask-claude
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Request body:  { question: string, context?: string, responseSchema?: object }
// Response body: { answer: string }   (answer is JSON text when responseSchema is set)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Default to the most capable model per Anthropic guidance. For a high-volume,
// latency-sensitive assistant you can switch to 'claude-haiku-4-5' (1/5 the cost,
// faster) by changing this one line — quality is still strong for short Q&A.
const MODEL = 'claude-opus-4-8';
const ANTHROPIC_VERSION = '2023-06-01';

const SYSTEM_PROMPT =
  "You are the AI assistant inside Dastero Sales Director, a CRM for Dastero Tech — " +
  "an IT-services company selling Managed IT, Network & Security, Surveillance, " +
  "M365/Workspace, Website, and Branding. You help the sales rep prioritize and act " +
  "on their pipeline. Treat the pipeline data provided in the message as ground truth; " +
  "never invent deals, contacts, or figures that are not present. Be concise, specific, " +
  "and actionable — 2 to 4 sentences unless asked to draft a message, in which case keep " +
  "it short and professional. Respond with your final answer only — no preamble, no " +
  "exploratory reasoning.";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Defense in depth: confirm a real signed-in user, even though verify_jwt also gates this.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Assistant is not configured yet (missing ANTHROPIC_API_KEY).' }, 503);

  let payload: { question?: string; context?: string; responseSchema?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const question = (payload.question ?? '').trim();
  if (!question) return json({ error: 'Missing question' }, 400);

  const userContent = payload.context ? `${payload.context}\n\nRep asks: ${question}` : question;

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    output_config: { effort: 'low' },
  };
  // Structured output for tasks like Coach plays — guarantees parseable JSON.
  if (payload.responseSchema) {
    body.output_config = { effort: 'low', format: { type: 'json_schema', schema: payload.responseSchema } };
  }

  let resp: Response;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return json({ error: 'Could not reach Claude. ' + (e as Error).message }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text();
    return json({ error: `Claude API error (${resp.status})`, detail }, 502);
  }

  const data = await resp.json();
  const answer = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim();

  return json({ answer });
});
