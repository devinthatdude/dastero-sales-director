# ask-claude — deploy & configure

Secure proxy to the Anthropic API. The Anthropic key lives only as a Supabase
secret and never reaches the browser bundle. Browser → this function → Anthropic.

## One-time deploy (run locally, like a migration)

```sh
# 1. Link the project (once), if not already linked
supabase link --project-ref ltfqyzqlippxhdagcjpp

# 2. Set the secret — get a key at https://console.anthropic.com → API Keys
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 3. Deploy the function
supabase functions deploy ask-claude
```

`verify_jwt` is **on** by default — only signed-in users of this project can call
the function. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically;
you do **not** set those.

## Verify

In the app: open **Today → Ask Claude**, type "Which deals should I chase today?"
You should get a 2–4 sentence answer grounded in your real pipeline. Until the
function is deployed, the UI shows a graceful "couldn't reach Claude" fallback
and Coach falls back to deterministic rule-based ranking.

## Cost / model

Defaults to `claude-opus-4-8`. For a higher-volume, lower-cost assistant, change
`MODEL` in `index.ts` to `claude-haiku-4-5` (~1/5 the cost, faster) and redeploy.
