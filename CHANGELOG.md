# Changelog

All notable changes to **Dastero Sales Director** are recorded here, newest at top.

**How to keep this up:** when you change something, add a line under `[Unreleased]`
in the right group — **Added** (new), **Changed** (behavior/look), **Fixed** (bugs),
**Removed** (deleted). When you ship a batch, rename `[Unreleased]` to a version with
today's date and start a fresh `[Unreleased]` above it. Bump the **last** number for
small patches (0.1.0 → 0.1.1), the **middle** for new features (0.1.0 → 0.2.0).

---

## [Unreleased]
### Security
- **Deal-sheet XSS / HTML-injection fixed.** `printDealSheet` interpolated raw
  lead fields (company, contact, notes, tags, etc.) into the print window with no
  escaping. On a shared firm board with spreadsheet imports, a crafted value could
  run script when another rep printed the sheet. All user values now run through an
  `esc()` HTML-escaper (`src/components/LeadDetail.jsx`). Also fixes broken rendering
  for benign values containing `&`, `<`, `>`, or `"`.
- **Tag-color hex constraint (defense-in-depth).** New DB migration
  `sql/2026-06-21_tags_color_hex_check.sql` adds a `CHECK` constraint so
  `tags.color` must be valid hex (or NULL) at the write boundary. Run once in the
  Supabase SQL editor.
- **Leads RLS — "see all, edit own."** New migration
  `sql/2026-06-21_leads_rls_edit_own.sql` rebuilds the `leads` policies: any
  authenticated user reads (shared board preserved), members insert/update only
  their own rows, deletes are admin-only. Adds a `public.is_admin()` helper. This
  scopes editing server-side; it does not restrict visibility.
### Fixed
- **Lead owner no longer races auth.** `useLeads` stamped new leads with a
  `userId` set by a one-shot `getUser()` that could still be `null` at insert,
  silently creating unowned leads. Now synced via `onAuthStateChange` (with
  cleanup) and the insert refuses to write a lead with no owner.
- **Editing a lead can no longer touch its owner.** The save handler stripped a
  non-existent `owner_id` field while leaving the real `user_id` in the update
  payload (`LeadDetail.jsx`); it now strips `user_id`, so edits never resend or
  reassign ownership.
- **Blocked pop-ups no longer crash the print action.** `printDealSheet` called
  `w.document.write` without checking `window.open`'s result; when pop-ups were
  blocked it threw on `null`. It now detects the blocked pop-up and shows a clear
  message instead.
- **Rep leaderboard no longer crashes on a profile with no email.** `StatsTab`
  called `p.email.split('@')` unconditionally; a null email white-screened the
  whole tab. Now uses a shared `repName(p)` helper (`lib/pipeline.js`) that falls
  back to the email local-part, then `Rep <id>` — reused for the lead-owner label
  in `LeadDetail` so rep names render consistently everywhere.
### Added
- Full Vite project scaffolding (package.json, vite/tailwind/postcss config,
  index.html, src/main.jsx) — the project now runs with `npm install && npm run dev`.
### Changed
- Removed unused `owners` lookup + its profiles query; lighter load.
- **CSV export is now admin-only.** The "↓ CSV" button on the Leads tab is gated
  behind `isAdmin` (`LeadsTab.jsx`). Note: this is a UI policy gate, not data
  access control — see the security note below.
- **Auth switched to email + password.** Sign-in now uses email + password
  (`signInWithPassword`); accounts are created by an admin in the Supabase
  dashboard (invite-only), and logged-in reps can change their own password.
### Removed
- **Magic-link sign-in** (`signInWithOtp`) — replaced by email + password.
### Fixed
- Add (+) button no longer overlaps the Today tab's sign-out control.

---

## [0.1.0] — 2026-06-12

First working build — the old "Dastero Sales Director" app rebuilt on the
React + Tailwind + Supabase stack, in the navy/blue brand.

### Added
- **Database (schema v2):** `leads` (full contact model, 7 stages, services array),
  `profiles` with member/admin roles, `tags` catalog + `lead_tags` join, Row Level
  Security, and realtime sync.
- **App shell:** six tabs — Today, Pipeline (kanban), Coach, Leads, Stats, Import.
- **Lead detail card:** Info / Edit / Tags / Cadence / Notes, tap-to-change stage,
  Call & Email actions, service + colored tags, admin-only delete.
- **Import tab:** parses `.xlsx` / `.csv`; each contact gets tappable
  Call / Text / Outlook / Mail deep links pre-filled with first-touch templates,
  plus "Add as lead" to push it into the pipeline.
- **Auth & access:** passwordless magic-link sign-in; shared firm board;
  admin-only lead deletion and tag-catalog management; role-escalation locked at the DB.
- **Legal:** proprietary `LICENSE` (all rights reserved), `.gitignore` to keep
  secrets out of the repo, copyright headers on all source files.

### Changed
- Brand aligned to dasterotech.com — navy/blue palette with a connection-network
  header graphic. Colors centralized in `src/index.css` (`:root`).

### Fixed
- The add (+) button no longer overlaps the Today tab's sign-out control.

### Removed
- Unused `owners` lookup and its extra `profiles` query (faster load, smaller bundle).

### Known gaps (not built yet)
- Cadence follow-up sequences (`follow_ups` table) — phase 2.
- `.ics` calendar export and PDF/CSV export.
- Org-chart pipeline view (kanban was chosen instead).
- Clients / quotes CRM tables (where Pricing work will plug in).
