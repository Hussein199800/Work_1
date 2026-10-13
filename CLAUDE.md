# Work_1 — نظام تدقيق السجلات والوكالات

GitHub: https://github.com/Hussein199800/Work_1 (branch `main`)
Live site (GitHub Pages, deployed from `main`): https://hussein199800.github.io/Work_1/

## ⚠️ RULE #1 — NEVER LOSE THE USER'S DATA
The user's real production data exists in ONE place only: the browser `localStorage` of the live site above (origin `hussein199800.github.io`). There is no server or other copy. The user considers this the most important rule of the project.

Every change (add, edit, delete, refactor) must keep existing data loading correctly after deploy:
- Never rename, remove or repurpose existing storage keys: `audit_users`, `audit_prices`, `audit_addition_prices`, `audit_addition_stamp_status`, `audit_transport_settings`, `audit_stamp_prices`, `audit_records`, `audit_committee_shares`, `audit_council_share`, `audit_council_saved`, `audit_record_draft`, `currentUser`, `activeSection`.
- Never call `localStorage.clear()` or remove data keys; never overwrite saved data with defaults.
- Data shape changes must be additive and backward compatible: read old records as they are (default missing fields at read time), migrate in place without dropping fields.
- Keep the backup/restore format (`downloadBackup` / `restoreBackupFromFile`, `version: 1`) able to read older backup files.
- Do not rename the repo, change the Pages URL/domain, or move hosting — a new origin means an empty `localStorage` (data looks lost).
- Before pushing anything that touches loading/saving/records, tell the user to download a backup (النسخ الاحتياطي) from the live site first, and confirm before pushing to `main` (pushing deploys to the live site).

## Overview
Arabic (RTL) single-page web app for auditing records and agencies. Plain HTML/CSS/JS — no build step, no backend, no package manager. Open `index.html` directly in a browser.

- `index.html` — all pages/sections (login, dashboard, records, new record, reports, committees, calculator, guide, prices, users, modal, print root).
- `style.css` — all styling (IBM Plex Sans Arabic, Tabler icons webfont).
- `script.js` — all logic (~10k lines, `"use strict"`). Sections are separated by `/* ===== ... ===== */` banner comments with Arabic titles.

## Domain
- Agency types and default prices live in `DEFAULT_PRICES` / `AGENCY_NAMES` at the top of `script.js` (general, special, legal, executive, certified_general_special, certified_legal).
- Additions (`ADDITION_NAMES`): حفظ، توقيع إضافي، إضافة إلى التركة، ولاية…
- بدل الانتقال: enabled by default for المندوب الخارجي; not charged on cancelled agencies.
- Committee shares: لجنة الإسعاف ولجنة التعاون.
- Roles: `manager`, `auditor`, `viewer`.
- Persistence: `localStorage` only; backup/restore via the users section. Excel export via `xlsx-js-style` (CDN).

## Conventions
- UI text is Arabic; keep RTL layout and existing banner-comment style in `script.js`.
- The user communicates in Arabic.
