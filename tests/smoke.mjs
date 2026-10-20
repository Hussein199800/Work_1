/* اختبار آلي ببيانات تجريبية فقط — لا يلمس بيانات حقيقية.
   التشغيل: node tests/smoke.mjs   (يحتاج Playwright؛ انظر docs/TESTING.md) */
import http from "http";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function loadPlaywright() {
    for (const id of ["playwright", "/opt/node22/lib/node_modules/playwright"]) {
        try { return require(id); } catch (e) { /* التالي */ }
    }
    console.error("Playwright غير مثبت: npm install --no-save playwright");
    process.exit(2);
}
const { chromium } = loadPlaywright();

/* خادم محلي صغير للمستودع */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };
const server = http.createServer(function (req, res) {
    const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html");
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
});
await new Promise(function (r) { server.listen(0, "127.0.0.1", r); });
const BASE = "http://127.0.0.1:" + server.address().port + "/index.html";

let failed = 0;
function check(name, ok, detail) {
    console.log((ok ? "PASS " : "FAIL ") + name + (ok || detail === undefined ? "" : " — " + detail));
    if (!ok) failed++;
}

/* وكالة محفوظة بالشكل القديم (قبل أسعار الفترات): سعر واحد 1700 */
function oldAgency(n, type, base, rep) {
    const zero = { save: 0, signature: 0, inheritance: 0, children: 0, agents: 0, originality: 0, transport: 0 };
    return { id: "a" + n, number: String(n), type: type, typeName: type, status: "active", basePrice: base, representativeBase: rep,
        additions: Object.assign({}, zero), additionValues: Object.assign({}, zero), additionsTotal: 0,
        stamps: { pleading: 0, ambulance: 0, aid: 0 }, missingStampsValue: 0, representativeAmount: rep, transportInAdditions: true };
}
const SEED = [
    { id: "r1", recordNumber: "101", officeName: "مكتب أ", representativeName: "س", recordDate: "2026-05-10", createdAt: "2026-05-10T08:00:00Z",
      agencies: [oldAgency(1, "general", 1700, 300), oldAgency(2, "special", 1700, 300)] },
    { id: "r2", recordNumber: "102", officeName: "مكتب ب", representativeName: "ع", recordDate: "2026-03-03", createdAt: "2026-03-03T08:00:00Z",
      agencies: [oldAgency(3, "general", 1700, 300)] }
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
/* لا اتصال بالخارج (خطوط، مكتبات) — الاختبار محلي بالكامل */
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
await ctx.addInitScript(function (seed) {
    if (sessionStorage.getItem("smoke_seeded")) return;
    /* سياق اختبار جديد وفارغ دائماً: هذا ليس الموقع الحي */
    localStorage.setItem("audit_records", JSON.stringify(seed));
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
    sessionStorage.setItem("smoke_seeded", "1");
}, SEED);

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
page.on("download", function () {});
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(1500);
const ev = function (fn, arg) { return page.evaluate(fn, arg); };

/* 1) حصص اللجنتين من سعر كل وكالة */
const shares = await ev(function () {
    return [1700, 1900, 1050].map(function (p) {
        const c = getAgencyCommittee({ type: "general", status: "active", basePrice: p });
        return p + ":" + c.ambulance + "/" + c.cooperation;
    }).join(" ");
});
check("الحصص تتبع سعر الوكالة", shares === "1700:300/250 1900:335/279 1050:185/154", shares);

/* 2) أداة تسعير السجلات المحفوظة: استثناء سجل، تنفيذ، تراجع */
await ev(function () { switchSection("pricesSection"); });
await page.waitForTimeout(300);
const original = await ev(function () { return JSON.stringify(records); });
await page.locator("#recordRepriceCard summary").click();
await page.locator('[data-reprice-record="r2"]').uncheck();
await page.click('[data-reprice="apply"]');
await page.locator("dialog[open] .app-dialog-ok").click();
await page.waitForTimeout(600);
const afterBulk = await ev(function () { return records.map(function (r) { return r.agencies.map(function (a) { return a.basePrice; }).join(","); }).join("|"); });
check("إعادة التسعير حسب التاريخ مع استثناء سجل", afterBulk === "1900,1900|1700", afterBulk);
const stored = await ev(function () { return localStorage.getItem("audit_records_store") === "idb" ? "idb" : JSON.parse(localStorage.getItem("audit_records"))[0].agencies[0].basePrice; });
check("إعادة التسعير محفوظة", stored === 1900 || stored === "idb", String(stored));
await page.click('[data-reprice="undo"]');
await page.locator("dialog[open] .app-dialog-ok").click();
await page.waitForTimeout(600);
check("التراجع يعيد السجلات كما كانت حرفياً", (await ev(function () { return JSON.stringify(records); })) === original);

/* 3) سجل جديد بثلاثة أسعار */
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
await page.fill("#recordNumber", "900");
await page.fill("#officeName", "مكتب اختبار");
await page.fill("#representativeName", "مندوب");
await ev(function () { const d = document.getElementById("recordDate"); d.value = "2026-03-06"; d.dispatchEvent(new Event("change", { bubbles: true })); });
await ev(function () { const s = document.getElementById("agencyType"); s.value = "general"; s.dispatchEvent(new Event("change", { bubbles: true })); syncChoiceChips(); });
async function addAgency(n, period) {
    await page.selectOption("#agencyPricePeriod", period);
    await ev(function () { const s = document.getElementById("agencyType"); s.value = "general"; s.dispatchEvent(new Event("change", { bubbles: true })); syncChoiceChips(); });
    await page.fill("#agencyNumber", String(n));
    await page.click("#addAgencyBtn");
    await page.waitForTimeout(800);
}
await addAgency(1, "");
await addAgency(2, "2026-03-01");
await addAgency(3, "2026-05-01");
const mixed = await ev(function () { return pendingAgencies.map(function (a) { return a.basePrice; }).join(","); });
check("سجل واحد بثلاثة أسعار (تلقائي 1070، 1050، 1900)", mixed === "1070,1050,1900", mixed);
await ev(function () { const d = document.getElementById("recordDate"); d.value = "2026-04-02"; d.dispatchEvent(new Event("change", { bubbles: true })); });
await page.waitForTimeout(300);
if (await page.locator("dialog[open] .app-dialog-ok").count()) await page.locator("dialog[open] .app-dialog-ok").click();
await page.waitForTimeout(300);
const afterDate = await ev(function () { return pendingAgencies.map(function (a) { return a.basePrice; }).join(","); });
check("تغيير التاريخ يعيد تسعير التلقائية فقط", afterDate === "1700,1050,1900", afterDate);

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
