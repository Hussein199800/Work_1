# Work_1 — نظام تدقيق السجلات والوكالات

GitHub: https://github.com/Hussein199800/Work_1 (branch `main`)
Live site (GitHub Pages, deployed from `main`): https://hussein199800.github.io/Work_1/

## ⚠️ RULE #1 — NEVER LOSE THE USER'S DATA
The user's real production data exists in ONE place only: the browser `localStorage` of the live site above (origin `hussein199800.github.io`). There is no server or other copy. The user considers this the most important rule of the project.

Every change (add, edit, delete, refactor) must keep existing data loading correctly after deploy:
- Never rename, remove or repurpose existing storage keys: `audit_users`, `audit_prices`, `audit_addition_prices`, `audit_addition_stamp_status`, `audit_transport_settings`, `audit_stamp_prices`, `audit_records`, `audit_committee_shares`, `audit_committee_rates`, `audit_council_share`, `audit_council_saved`, `audit_record_draft`, `currentUser`, `activeSection`.
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
- Agency types and default prices live in `DEFAULT_PRICES` / `AGENCY_NAMES` at the top of `script.js` (general, special, legal, executive, certified_general_special, certified_legal). Default type when adding an agency: `special` (`DEFAULT_AGENCY_TYPE`).
- Additions (`ADDITION_NAMES`): حفظ، توقيع إضافي، إضافة إلى التركة، ولاية…
- بدل الانتقال: added automatically for المندوب الخارجي **only** to general/special/legal (`TRANSPORT_AGENCY_TYPES`); never to certified copies or executive; not charged on cancelled agencies.
- Committee shares (لجنة الإسعاف ولجنة التعاون) are a **percentage of the agency price stored in the record**, per agency type (`committeeRates`, key `audit_committee_rates`). First run derives them from the old fixed amounts ÷ current price (300 ÷ 1700 = 17.647%). `audit_committee_shares` (fixed amounts) is kept in sync for compatibility. Amounts round to the nearest pound.
- Agency/record grand total = agency price + additions value (cash + stamp-type additions × pleading stamp price) + full transport allowance (`getAgencyGrandTotal`, `getRecordGrandTotal`).
- Numbers and dates use Western digits (`NUMBER_LOCALE`). Numeric inputs are `type="text" data-num` (not `type="number"`, which the browser renders in Arabic-Indic digits); `number()` accepts Arabic-Indic digits and thousands separators.
- UI messages use `notify()` / `flashNotify()` / `appConfirm()` — never `alert()` / `confirm()`.

## Design system («السجلّ الرسمي»)
- Tokens at the top of `style.css`: ink (navy text/sidebar), seal (stamp-ink blue for actions and totals), paper surfaces, type scale `--fs-*`.
- Fonts: IBM Plex Sans Arabic for everything; Noto Kufi Arabic only for page titles and the brand.
- Three breakpoints only: 1280 / 1024 / 640 px.
- Agency type colors (`AGENCY_TYPE_COLORS`) and the colored row stripes are an established convention the user relies on — keep them.
- Agency type/status are picked with colored chips (`buildChoiceChips`); the original `<select>` stays (visually hidden) as the value source — set `.value` then call `syncChoiceChips()` (already done inside `syncTransportField()`).
- New-record page: sticky summary dock (`updateRecordDock`), Ctrl+Enter adds an agency, the add button ignores a second click within 700 ms. Plain Enter must NOT add (accidental duplicates are the user's main concern).
- Records table: «التقرير» + «تعديل» visible, the rest in the ⋮ menu (`openRecordMenu`).
- The only decorative motion is the seal "stamp" on the login page; everything respects `prefers-reduced-motion`.
- Roles: `manager`, `auditor`, `viewer`.
- Persistence: `localStorage` only; backup/restore via the users section. Excel export via `xlsx-js-style` (CDN).

## Conventions
- UI text is Arabic; keep RTL layout and existing banner-comment style in `script.js`.
- The user communicates in Arabic.
