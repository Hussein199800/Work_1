# Work_1 — نظام تدقيق السجلات والوكالات

GitHub: https://github.com/Hussein199800/Work_1 (branch `main`)
Live site (GitHub Pages, deployed from `main`): https://hussein199800.github.io/Work_1/

## ⚠️ RULE #1 — NEVER LOSE THE USER'S DATA
The user's real production data exists in ONE place only: the browser `localStorage` of the live site above (origin `hussein199800.github.io`). There is no server or other copy. The user considers this the most important rule of the project.

Every change (add, edit, delete, refactor) must keep existing data loading correctly after deploy:
- Never rename, remove or repurpose existing storage keys: `audit_users`, `audit_prices`, `audit_addition_prices`, `audit_addition_stamp_status`, `audit_transport_settings`, `audit_stamp_prices`, `audit_records`, `audit_records_store`, `audit_price_schedule`, `audit_committee_shares`, `audit_committee_rates`, `audit_council_share`, `audit_council_saved`, `audit_record_draft`, `currentUser`, `activeSection`.
- **Records may live in IndexedDB** (db `audit_db`, store `kv`, key `audit_records`) — the user's real data hit the ~5M-char localStorage quota (≈9.3 MB, ~4000 agencies) on 2026-10-15. When `localStorage.audit_records_store === "idb"` the records are ONLY in IndexedDB. `index.html` reads them before injecting `script.js` (`window.__AUDIT_IDB_RECORDS`). All record writes go through `persistRecords()` (Promise) — never `saveData("audit_records", …)` directly. `moveRecordsToIDB()` writes, reads back and compares before setting the marker and only then removes the localStorage copy; it runs automatically when records exceed `RECORDS_MOVE_THRESHOLD` (after downloading a backup) or on a quota error. If IndexedDB can't be read, `recordsLoadFailed` blocks every save. Never delete the IndexedDB database. Use `onReady()` instead of `DOMContentLoaded` (script.js is injected after the page loads).
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
- UI messages use `notify()` / `flashNotify()` / `appConfirm()` / `appChoose()` (multi-choice) — never `alert()` / `confirm()`. Dialogs resolve on button click, not on the `close` event (it can be delayed).
- Period prices (`priceSchedule`, key `audit_price_schedule`: `[{from:"YYYY-MM-DD" (old entries may be "YYYY-MM" = 1st of month), prices:{type:{agency, representative}}}]`): `priceTableForDay(day)` picks the latest entry with `scheduleStart(from) <=` the record date, else base `prices`. `getPricingForType(type, day)` uses it. Saved agencies keep `appliedPrices` (also `priceMonth` = the entry start date). Changing the record date offers to reprice pending agencies. `DEFAULT_PRICE_SCHEDULE` (the 2026 branch table: 1–4 Mar, 5 Mar, 1 Apr, 1 May, 14 Jun, 3 Aug, 1 Sep) is seeded ONLY when the key is absent — never overwrite a saved schedule. Only the main-office (المكاتب الرئيسية) columns are stored: external = same price + automatic transport. البدائية = general + special; المصدقة البدائية = certified_general_special; حصة الفرع = representative.
- Agency calculation is pure: `readAgencyInputs()` / `agencyInputsOf(agency)` → `buildAgency(inputs, pricing, keepId)`. Reuse it for repricing / type changes; don't duplicate the math.
- Adding an agency whose number already exists → `appChoose`: insert and shift every pending agency with number ≥ N by +1 (data untouched), or add as duplicate.
- «وكالة مماثلة» (`addSimilarAgency`) copies the last added agency's inputs with the next number; the row «النوع» select (`changePendingType`) rebuilds an agency with the new type; Ctrl+S (and Ctrl+Enter) adds an agency on the new-record page only.
- Saving a new record whose number already exists asks first (save as separate / open existing).
- Not built yet (user deferred): Firebase sync and Telegram backups.

## Design system («الجواهر», 2026-10-16)
- The user asked to move away from white/blue: emerald (actions, `--accent`), royal plum (structure), burgundy (`--danger`, money gradient), muted gold (totals). Tokens at the top of `style.css` are semantic (`--heading`, `--text*`, `--surface*`, `--field`, `--accent*`, `--panel`, `--grad-money`…); legacy `--seal-*`/`--ink-*` are aliases. Use semantic tokens in new CSS.
- Light + dark themes: `[data-theme="dark"]` on `<html>`, set before render by an inline script in `index.html`, toggled by `toggleTheme()`, persisted in `audit_ui_theme` (UI pref). `.doc` / `#printRoot` re-declare light tokens so reports stay paper-white in dark mode and print.
- Fonts: IBM Plex Sans Arabic for everything; Noto Kufi Arabic only for page titles and the brand.
- Three breakpoints only: 1280 / 1024 / 640 px.
- Agency type colors (`AGENCY_TYPE_COLORS`) and the colored row stripes are an established convention the user relies on — keep them.
- Agency type/status are picked with colored chips (`buildChoiceChips`); the original `<select>` stays (visually hidden) as the value source — set `.value` then call `syncChoiceChips()` (already done inside `syncTransportField()`).
- New-record page: sticky summary dock (`updateRecordDock`), Ctrl+Enter adds an agency, the add button ignores a second click within 700 ms. Plain Enter must NOT add (accidental duplicates are the user's main concern).
- Records table: «التقرير» + «تعديل» visible, the rest in the ⋮ menu (`openRecordMenu`).
- The only decorative motion is the seal "stamp" on the login page; everything respects `prefers-reduced-motion`.
- Brand mark (the user rejected the old circular seal): an open ledger with an "audited" ✓ badge on a rounded ink tile, built only by `sealSVG()`; colors via `--bm-tile/--bm-ink/--bm-badge/--bm-check` (sidebar uses a seal-blue tile); `mark-outline`/`seal-stamp` = no tile (watermark). In `index.html` marks are `<svg class="seal …" data-seal>` placeholders filled by `anchorSeals()`. The favicon is the same mark as an inline SVG data URI.
- Dashboard «نشاط الفترة» (`renderActivity`): period presets (this month / last month / 3 months / year / all, by record date), 5 stat tiles with % change vs the previous equal period, a single-series column chart (pure SVG, y-axis on the right for RTL, hover/focus tooltip, table toggle). UI pref key `audit_ui_activity_period` (not data).
- Global search (`openGlobalSearch`, Ctrl+K, sidebar/mobile button): records by number/office/rep and agencies by number (Arabic-Indic digits accepted); Enter opens the report / type view, «تعديل» opens the agency for editing.
- Quick audit (التدقيق السريع): in the record summary report every item — transport, missing stamps, each addition — opens `showAgencyAudit(recordId, filter)` listing only the agencies that contain it (any type), with their numbers in a strip for matching against the paper register and an edit button per agency. Filters: `transport`, `missing:<pleading|ambulance|aid>`, `add:<key>`.
- Roles: `manager`, `auditor`, `viewer`.
- Persistence: `localStorage` only; backup/restore via the users section. Excel export via `xlsx-js-style` (CDN).

## Conventions
- UI text is Arabic; keep RTL layout and existing banner-comment style in `script.js`.
- The user communicates in Arabic.
