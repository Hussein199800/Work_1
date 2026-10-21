/* فحوص الأخطاء التي وجدتها المراجعة الشاملة (21/10/2026) — بيانات تجريبية فقط.
   التشغيل: node tests/review.mjs   (يحتاج Playwright؛ انظر docs/TESTING.md) */
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

const zero = { save: 0, signature: 0, inheritance: 0, children: 0, agents: 0, originality: 0, transport: 0 };
function ag(n, type, base, extra) {
    return Object.assign({ id: "a" + n, number: String(n), type: type, typeName: type, status: "active", basePrice: base, representativeBase: 300,
        additions: Object.assign({}, zero), additionValues: Object.assign({}, zero), additionsTotal: 0,
        stamps: { pleading: 0, ambulance: 0, aid: 0 }, missingStampsValue: 0, representativeAmount: 300, transportInAdditions: true }, extra || {});
}
const SEED = [
    { id: "r1", recordNumber: "101", officeName: "أ", representativeName: "س", recordDate: "2026-05-10", createdAt: "2026-05-10T08:00:00Z", updatedAt: "2026-05-10T08:00:00Z",
      agencies: [ag(1, "general", 1900), ag(2, "general", 2500, { customPrice: 2500, priceHistory: [{ batch: "bulk-1", at: "2026-10-21T00:00:00Z", basePrice: 1900 }] }), ag(3, "general", 1900)] },
    { id: "r2", recordNumber: "102", officeName: "ب", representativeName: "ع", recordDate: "2026-03-03", createdAt: "2026-03-03T08:00:00Z",
      agencies: [ag(4, "general", 1700), ag(5, "general", 1700, { status: "cancelled", basePrice: 0, representativeBase: 0, representativeAmount: 0, additions: Object.assign({}, zero, { save: 2 }), additionsTotal: 200 })] },
    /* وكالة بالشكل القديم: missingStamps بدل stamps، وبلا additions */
    { id: "r3", recordNumber: "103", officeName: "ج", representativeName: "ص ", recordDate: "2026-09-12", createdAt: "2026-09-12T08:00:00Z",
      agencies: [{ id: "a6", number: "1", type: "special", status: "active", basePrice: 1700, representativeBase: 300, representativeAmount: 400, missingStamps: { pleading: 1, ambulance: 0, aid: 0 }, missingStampsValue: 100 }] }
];

const browser = await chromium.launch();

async function openPage(ctx) {
    const page = await ctx.newPage();
    page.errors = [];
    page.on("pageerror", function (e) { page.errors.push(e.message); });
    page.on("download", function () {});
    await page.goto(BASE);
    await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
    await page.waitForTimeout(1200);
    return page;
}
async function newContext(seed, extraInit) {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
    await ctx.addInitScript(function (args) {
        if (localStorage.getItem("review_seeded")) return;
        localStorage.setItem("review_seeded", "1");
        if (args.raw !== undefined) localStorage.setItem("audit_records", args.raw);
        else localStorage.setItem("audit_records", JSON.stringify(args.seed));
        localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
    }, { seed: seed, raw: extraInit && extraInit.raw });
    return ctx;
}

const ctx = await newContext(SEED);
const page = await openPage(ctx);
const ev = function (fn, arg) { return page.evaluate(fn, arg); };
const open = page.locator("dialog[open] .app-dialog-ok");

/* 1) Enter لا يحفظ السجل */
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
await page.fill("#recordNumber", "900");
await page.fill("#officeName", "اختبار");
await page.fill("#representativeName", "مندوب");
await page.fill("#agencyNumber", "1");
await page.click("#addAgencyBtn");
await page.waitForTimeout(800);
await page.fill("#agencyNumber", "2");
await page.focus("#agencyNumber");
await page.keyboard.press("Enter");
await page.focus("#officeName");
await page.keyboard.press("Enter");
await page.waitForTimeout(600);
check("Enter في حقول السجل لا يحفظه", await ev(function () { return records.length === 3 && pendingAgencies.length === 1; }), await ev(function () { return records.length + "/" + pendingAgencies.length; }));

/* 2) فتح سجل آخر يسأل قبل ضياع السجل غير المحفوظ */
await ev(function () { editRecord("r1"); });
await page.waitForTimeout(300);
check("فتح سجل آخر يسأل عن الوكالات غير المحفوظة", (await page.locator("dialog[open]").count()) === 1);
await page.locator("dialog[open] .app-dialog-cancel").click();
check("«رجوع» يُبقي السجل الجديد", await ev(function () { return pendingAgencies.length === 1 && !document.getElementById("editingRecordId").value; }));

/* 3) فترة السعر لا تنتقل إلى سجل آخر */
await page.selectOption("#agencyPricePeriod", "2026-03-01");
await ev(function () { editRecord("r1"); });
await open.click();
await page.waitForTimeout(400);
check("فتح سجل للتعديل يعيد فترة السعر «حسب التاريخ»", (await page.inputValue("#agencyPricePeriod")) === "");

/* 4) لا مسودة لسجل فُتح دون تغيير */
await page.waitForTimeout(300);
check("فتح سجل دون تغيير لا يكتب مسودة", await ev(function () { return localStorage.getItem("audit_record_draft") === null; }));

/* 5) تعديل وكالة في مكانها: المعرّف والترتيب والسعر المحدد وسجل الأسعار */
await ev(function () { editPendingAgency(1); });
check("الوكالة المفتوحة للتعديل تبقى في القائمة", await ev(function () { return pendingAgencies.length === 3; }));
await page.click('button[type="submit"]');
await page.waitForTimeout(400);
check("حفظ السجل والوكالة مفتوحة يُمنع (لا تضيع)", await ev(function () { return records.find(function (r) { return r.id === "r1"; }).agencies.length === 3; }));
await page.click("#addAgencyBtn");
await page.waitForTimeout(800);
const edited = await ev(function () { const a = pendingAgencies[1]; return [pendingAgencies.map(function (x) { return x.number; }).join(","), a.id, a.basePrice, a.customPrice, (a.priceHistory || []).length].join("|"); });
check("الوكالة المعدّلة: المكان والمعرّف والسعر المحدد وسجل الأسعار", edited === "1,2,3|a2|2500|2500|1", edited);

/* 6) Ctrl+Z بعد «إدراج وإزاحة» يعيد الأرقام */
await ev(function () { resetRecordForm(); switchSection("newRecordSection"); });
await page.waitForTimeout(300);
for (const n of ["1", "3", "4", "5"]) {
    await page.fill("#agencyNumber", n);
    await page.click("#addAgencyBtn");
    await page.waitForTimeout(750);
}
await page.fill("#agencyNumber", "3");
await page.click("#addAgencyBtn");
await page.locator("dialog[open] .app-choose-actions button").first().click();
await page.waitForTimeout(500);
const shifted = await ev(function () { return pendingAgencies.map(function (a) { return a.number; }).join(","); });
await ev(function () { undoLastAgency(); });
const undone = await ev(function () { return pendingAgencies.map(function (a) { return a.number; }).join(","); });
check("Ctrl+Z بعد الإدراج يعيد التسلسل (1,3,4,5)", shifted === "1,3,4,5,6" && undone === "1,3,4,5", shifted + " → " + undone);
await ev(function () { restoreRemovedAgency(); });
check("«تراجع عن الإلغاء» يعيد الإدراج والإزاحة", (await ev(function () { return pendingAgencies.map(function (a) { return a.number; }).join(","); })) === "1,3,4,5,6");
await ev(function () { resetRecordForm(); });

/* 7) الوكالات بالشكل القديم لا توقف الصفحات */
const oldShape = await ev(function () {
    try {
        switchSection("reportsSection"); renderReports();
        viewRecord("r3");
        closeRecordModal();
        editRecordNow("r3"); editPendingAgency(0); clearAgencyForm(); resetRecordForm();
        return "ok";
    } catch (e) { return e.message; }
});
check("وكالة قديمة (missingStamps) لا توقف التقارير والعرض والتعديل", oldShape === "ok", oldShape);

/* 8) حصص اللجان في صفحة التقارير حسب تاريخ السجل (نسخ الوكالات) */
const reportShare = await ev(function () {
    const copy = Object.assign({}, records[1].agencies[0], { recordDay: getRecordDay(records[1]) });
    return sumCommittees([copy]).ambulance;
});
check("حصة نسخة وكالة في التقارير بسعر تاريخها (3 آذار: 1050 ← 185 لا 1700 ← 300)", reportShare === 185, String(reportShare));

/* 9) عرض التفاصيل لا يحسب الملغاة */
await ev(function () { viewRecord("r2"); });
const viewText = await page.locator("#modalContent, .modal-content").first().innerText();
check("«عرض التفاصيل»: الإضافات بلا الوكالة الملغاة", /الإضافات\s*0 ل\.س/.test(viewText), viewText.slice(0, 200));
await ev(function () { closeRecordModal(); });

/* 10) الملغاة لا قيمة لإضافاتها */
const cancelled = await ev(function () {
    const a = buildAgency({ number: "9", type: "general", status: "cancelled", additions: { save: 2, transport: 1 }, missing: { pleading: 0, ambulance: 0, aid: 0 } }, getPricingForType("general", "2026-05-10"));
    return a.additionsTotal + "/" + a.additions.save;
});
check("وكالة ملغاة: الأعداد محفوظة والقيمة صفر", cancelled === "0/2", cancelled);

/* 11) نسخة احتياطية مرفوضة إن لم تُقرأ السجلات */
const blocked = await ev(function () {
    let downloads = 0;
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { downloads++; };
    recordsLoadFailed = true;
    try { downloadBackupFile(false); downloadBackup(); } finally { recordsLoadFailed = false; HTMLAnchorElement.prototype.click = orig; }
    return downloads;
});
check("لا نسخة احتياطية فارغة حين تتعذر قراءة السجلات", blocked === 0, String(blocked));

/* 12) الاستعادة مع Firebase: مزامنة أولى من جديد (لا علامات حذف) */
const reset = await ev(function () {
    fbState.firstSyncDone = true; fbState.base = { r9: "x" }; fbState.settingsChangedAt = 123;
    fbResetAfterRestore();
    return fbState.firstSyncDone + "|" + Object.keys(fbState.base).length + "|" + fbState.settingsChangedAt;
});
check("بعد الاستعادة: base فارغة ومزامنة أولى", reset === "false|0|0", reset);

/* 13) نافذتان: الثانية تتوقف عن الحفظ بعد حفظ الأولى */
const page2 = await openPage(ctx);
await ev(function () { return persistRecords(); });
await page2.waitForTimeout(300);
const stale = await page2.evaluate(function () {
    return persistRecords().then(function () { return "saved"; }, function () { return "blocked:" + recordsStaleTab; });
});
check("النافذة الأخرى تتوقف عن الحفظ", stale === "blocked:true", stale);
await page2.close();

check("لا أخطاء JavaScript", page.errors.length === 0, page.errors.join(" | "));
await ctx.close();

/* 14) نص سجلات تالف: لا حفظ فوقه */
const ctx2 = await newContext(null, { raw: "{تالف" });
const p2 = await openPage(ctx2);
const corrupt = await p2.evaluate(function () {
    return persistRecords().then(function () { return "saved"; }, function () { return "blocked"; }).then(function (r) {
        return r + "|" + recordsLoadFailed + "|" + localStorage.getItem("audit_records");
    });
});
check("نص سجلات تالف لا يُكتب فوقه", corrupt === "blocked|true|{تالف", corrupt);
await ctx2.close();

/* 15) مسودة تعديل لسجل تغيّر بعدها: سؤال بدل استعادة صامتة */
const ctx3 = await newContext(SEED);
const p3 = await openPage(ctx3);
await p3.evaluate(function () {
    switchSection("newRecordSection");
    editRecordNow("r1");
    pendingAgencies[0].notes = "تعديل غير محفوظ";
    renderPendingAgencies();
    saveRecordDraft();
    records.find(function (r) { return r.id === "r1"; }).officeName = "تغيّر من جهاز آخر";
    return persistRecords();
});
await p3.reload();
await p3.waitForTimeout(2000);
await p3.evaluate(function () { switchSection("newRecordSection"); });
await p3.waitForTimeout(600);
const ask = await p3.locator("dialog[open]").innerText().catch(function () { return ""; });
check("مسودة تعديل قديمة: سؤال قبل الاستعادة", ask.indexOf("تغيّر بعد بدء تعديلك") !== -1, ask.slice(0, 120));
await ctx3.close();

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
