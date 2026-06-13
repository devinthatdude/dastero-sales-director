# Dastero Sales Director

Sales app (Today · Pipeline · Coach · Leads · Stats · Import) on
React + Vite + Tailwind + Supabase. This is a complete, ready-to-run project.

## Run it locally
1. Unzip this folder and open a terminal inside it.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your env file and paste in your two Supabase values:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. Start it:
   ```bash
   npm run dev
   ```
   Open the URL it prints (usually http://localhost:5173) and sign in with your email.

## First admin
After your first sign-in, run this once in the Supabase SQL editor:
```sql
update public.profiles set role = 'admin' where email = 'you@dasterotech.com';
```

## Deploy (Vercel)
Push to GitHub → import in Vercel → add the two env vars → deploy →
add your Vercel domain to Supabase Auth → URL Configuration.

See **Dastero_Owner_Guide.md** for the full checklist and owner reference.

## Notes
- Tailwind is pinned to v3 on purpose (matches this project's config). Don't jump
  to Tailwind v4 without updating the config + CSS.
- Where things live: brand colors → `src/index.css`; stages/services → `src/lib/pipeline.js`;
  Coach scripts → `src/components/tabs/CoachTab.jsx`; outreach templates → `src/components/tabs/ImportTab.jsx`.
