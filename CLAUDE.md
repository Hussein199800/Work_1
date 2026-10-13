# Work_1 — نظام تدقيق السجلات والوكالات

GitHub: https://github.com/Hussein199800/Work_1 (branch `main`)

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
