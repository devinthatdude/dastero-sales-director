# Changelog

All notable changes to **Dastero Sales Director** are recorded here, newest at top.

**How to keep this up:** when you change something, add a line under `[Unreleased]`
in the right group — **Added** (new), **Changed** (behavior/look), **Fixed** (bugs),
**Removed** (deleted). When you ship a batch, rename `[Unreleased]` to a version with
today's date and start a fresh `[Unreleased]` above it. Bump the **last** number for
small patches (0.1.0 → 0.1.1), the **middle** for new features (0.1.0 → 0.2.0).

---

## [Unreleased]
### Added
- Full Vite project scaffolding (package.json, vite/tailwind/postcss config,
  index.html, src/main.jsx) — the project now runs with `npm install && npm run dev`.
### Changed
- Removed unused `owners` lookup + its profiles query; lighter load.
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
