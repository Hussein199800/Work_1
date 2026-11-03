/* فحوص ميزات 3/11/2026 ببيانات تجريبية فقط: إيصال حد أدنى أتعاب، ملاحظة السجل،
   Ctrl+D (وكالة مماثلة)، تنبيه الرقم الناقص، إشعار بلون النوع، حقل رقم الوكالة،
   ألوان التدقيق السريع، وجدول التقارير المختصر.
   التشغيل: node tests/features.mjs */
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
    console.error("Playwright غير مثبت"); process.exit(2);
}
const { chromium } = loadPlaywright();
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
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

/* وكالة قديمة بلا إيصال (لا مفتاح receipt) */
const OLD = { id: "o1", number: "1", type: "special", status: "active", basePrice: 1700, representativeBase: 300, representativeAmount: 400,
    missingStamps: { pleading: 1, ambulance: 0, aid: 0 }, missingStampsValue: 100 };
const SEED = [{ id: "r1", recordNumber: "50", officeName: "أ", representativeName: "س", recordDate: "2026-09-12", createdAt: "2026-09-12T08:00:00Z", agencies: [OLD] }];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
await ctx.addInitScript(function (seed) {
    if (localStorage.getItem("features_seeded")) return;
    localStorage.setItem("features_seeded", "1");
    localStorage.setItem("audit_records", JSON.stringify(seed));
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
}, SEED);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
page.on("download", function () {});
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(1200);
const ev = function (fn, arg) { return page.evaluate(fn, arg); };

/* 1) سعر الإيصال الافتراضي 150، وحقل رقم الوكالة أرقام فقط */
check("سعر إيصال حد أدنى أتعاب الافتراضي 150", await ev(function () { return stampPrices.receipt === 150; }));
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
await page.fill("#recordNumber", "77");
await page.fill("#officeName", "مكتب");
await page.fill("#representativeName", "مندوب");
await page.fill("#agencyNumber", "");
await page.focus("#agencyNumber");
await page.keyboard.type("1a٢");
check("رقم الوكالة يقبل الأرقام فقط (والعربية تتحول)", (await page.inputValue("#agencyNumber")) === "12", await page.inputValue("#agencyNumber"));
await page.fill("#agencyNumber", "1");

/* 2) الإيصال: يُحمَّل على المندوب ولا يغيّر قيمة الوكالة */
const before = await ev(function () { return getAgencyFromForm(); });
await page.click('.plus-btn[data-target="missingReceipt"]');
await page.click('.plus-btn[data-target="missingReceipt"]');
const after = await ev(function () { return getAgencyFromForm(); });
check("الإيصال × 2 = 300 على المندوب", after.representativeAmount - before.representativeAmount === 300 && after.missingStampsValue - before.missingStampsValue === 300,
    before.representativeAmount + " → " + after.representativeAmount);
check("الإيصال لا يغيّر سعر الوكالة", after.basePrice === before.basePrice);
const grands = await ev(function (a) { return [getAgencyGrandTotal(a[0]), getAgencyGrandTotal(a[1])]; }, [before, after]);
check("إجمالي الوكالة نفسه مع الإيصال", grands[0] === grands[1], grands.join(" / "));

await page.click("#addAgencyBtn");
await page.waitForTimeout(800);

/* 3) إشعار الإضافة بلون النوع */
const toast = await ev(function () {
    const t = document.getElementById("appToast");
    return { cls: t.className, color: t.style.getPropertyValue("--agency-color"), num: (t.querySelector(".toast-agency-no") || {}).textContent };
});
check("إشعار الإضافة بلون نوع الوكالة ورقمها", /toast-agency/.test(toast.cls) && toast.color === "#6c4f9e" && toast.num === "1", JSON.stringify(toast));

/* 4) Ctrl+D: وكالة مماثلة (بنفس الإيصال) */
await page.waitForTimeout(800);
await page.keyboard.press("Control+d");
await page.waitForTimeout(800);
check("Ctrl+D يضيف وكالة مماثلة بالرقم التالي", await ev(function () {
    const a = pendingAgencies[1];
    return pendingAgencies.length === 2 && a.number === "2" && a.stamps.receipt === 2;
}), await ev(function () { return JSON.stringify(pendingAgencies.map(function (a) { return a.number; })); }));

/* 5) تنبيه الرقم الناقص: 2 ثم 4 */
await page.waitForTimeout(800);
await page.fill("#agencyNumber", "4");
await page.click("#addAgencyBtn");
await page.waitForTimeout(500);
const gapText = await ev(function () { return (document.querySelector("#appToast .toast-gap") || {}).textContent || ""; });
check("تنبيه عند قفز الرقم (2 ثم 4: الرقم 3 ناقص)", /3 ناقص/.test(gapText), gapText);
check("الإضافة مع التنبيه لم تُمنع", await ev(function () { return pendingAgencies.length === 3; }));

/* 6) ملاحظة السجل: تُحفظ وتظهر في التقرير */
await page.fill("#recordNote", "سُلّم السجل على دفعتين");
await page.click('#recordForm button[type="submit"]');
await page.waitForTimeout(400);
for (let i = 0; i < 3 && await page.locator("dialog[open]").count(); i++) {
    const ok = page.locator("dialog[open] button.primary-btn, dialog[open] .app-dialog-ok").first();
    await ok.click();
    await page.waitForTimeout(400);
}
await page.waitForTimeout(600);
const saved = await ev(function () { return records.find(function (r) { return r.recordNumber === "77"; }) || null; });
check("ملاحظة السجل محفوظة", saved && saved.recordNote === "سُلّم السجل على دفعتين", saved ? saved.recordNote : "لم يُحفظ");
const report = await ev(function (id) { return buildFinalRecordReport(records.find(function (r) { return r.id === id; }), "summary"); }, saved && saved.id);
check("ملاحظة السجل في مربع بالتقرير", /doc-record-note[\s\S]*سُلّم السجل على دفعتين/.test(report));
check("صف الإيصال في جدول الطوابع الناقصة", /إيصال حد أدنى أتعاب/.test(report));
check("بنود التدقيق السريع ملونة حسب المجموعة", /audit-chip grp-missing/.test(report));

/* 7) السجل القديم بلا ملاحظة ولا إيصال: يُقرأ كما هو */
const old = await ev(function () {
    const r = records.find(function (x) { return x.id === "r1"; });
    const html = buildFinalRecordReport(r, "summary") + buildFinalRecordReport(r, "detailed");
    return { note: html.indexOf("doc-record-note") === -1, count: missingCountOf(r.agencies[0].missingStamps), hasNote: "recordNote" in r };
});
check("سجل قديم: بلا مربع ملاحظة، والنقص يُعدّ كما كان", old.note && old.count === 1 && !old.hasNote, JSON.stringify(old));

/* 8) فتح سجل للتعديل يعيد ملاحظته، وسجل جديد يبدأ بلا ملاحظة */
await ev(function (id) { editRecord(id); }, saved && saved.id);
await page.waitForTimeout(400);
check("فتح السجل يعيد ملاحظته", (await page.inputValue("#recordNote")) === "سُلّم السجل على دفعتين");
await ev(function () { resetRecordForm(); });
check("سجل جديد بلا ملاحظة", (await page.inputValue("#recordNote")) === "");

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
