/* فحوص 24/11/2026 ببيانات تجريبية معزولة: ملف «جدول التدقيق»، إيصال القبض وتاريخه، توحيد الهمزات، قائمة «استيراد ومطابقة».
   التشغيل: node tests/audittable.mjs */
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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
/* مكتبة الإكسل محلياً إن وُجدت (npm i --no-save xlsx-js-style@1.2.0، أو XLSX_BUNDLE=/مسار/xlsx.bundle.js) */
let xlsxBundle = process.env.XLSX_BUNDLE || "";
if (!xlsxBundle) { try { xlsxBundle = require.resolve("xlsx-js-style/dist/xlsx.bundle.js"); } catch (e) { xlsxBundle = ""; } }
if (xlsxBundle && fs.existsSync(xlsxBundle)) {
    await ctx.route(/xlsx-js-style.*xlsx\.bundle\.js/, function (r) { r.fulfill({ status: 200, contentType: "text/javascript", body: fs.readFileSync(xlsxBundle, "utf8") }); });
}
await ctx.addInitScript(function () {
    if (localStorage.getItem("at_seeded")) return;
    localStorage.setItem("at_seeded", "1");
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && typeof records !== "undefined"; });
await page.waitForTimeout(900);
const ev = function (fn, arg) { return page.evaluate(fn, arg); };
const confirmDialogs = async function () {
    for (let i = 0; i < 4 && await page.locator("dialog[open]").count(); i++) { await page.locator("dialog[open] .app-dialog-ok, dialog[open] button.primary-btn").first().click(); await page.waitForTimeout(300); }
};



const dialogClick = async function (text) {
    await page.waitForSelector("dialog[open]");
    await page.locator("dialog[open] button", { hasText: text }).first().click();
    await page.waitForTimeout(400);
};

/* بيانات تجريبية: سجل لنا بلا مدقق، سجل مسترد من موقع، يدوي مقبوض بلا إيصال، مكرر بكتابة همزة مختلفة */
await ev(function () {
    writeUiPref("audit_ui_audit_table", JSON.stringify({ daily: false }));
    records = [
        { id: "a1", recordNumber: "10", officeName: "سلقين", representativeName: "أسعد إبراهيم", recordDate: "2026-09-01", createdAt: "2026-09-01T08:00:00Z", agencies: [] },
        { id: "a2", recordNumber: "10", officeName: "سلقين", representativeName: "أسعد ابراهيم", recordDate: "", agencies: [], source: { kind: "site", name: "موقع قديم" }, summary: { agencyCount: 5, amountDue: 1000 } },
        { id: "a3", recordNumber: "7", officeName: "اريحا", representativeName: "عبدو", agencies: [], source: { kind: "manual", name: "جدول" }, summary: { amountDue: 5000 }, payment: { status: "paid", at: "2026-10-01T09:00:00Z", by: "admin" } },
        { id: "a4", recordNumber: "3", officeName: "سراقب", representativeName: "أحمد باكير", recordDate: "2026-09-02", agencies: [], auditors: ["باسل"] }
    ];
    return persistRecords().then(function () { switchSection("recordsSection"); });
});
await page.waitForTimeout(600);

/* 1) قائمة «استيراد ومطابقة» تبقى مفتوحة بعد النقر */
await page.click("#recoveredMenuBtn");
await page.waitForTimeout(300);
check("قائمة «استيراد ومطابقة» تبقى مفتوحة بعد النقر", await page.locator("#recordMenu").count() === 1);
check("في القائمة «تنزيل جدول التدقيق»", (await page.locator("#recordMenu").innerText()).includes("تنزيل جدول التدقيق"));
await page.click("#recoveredMenuBtn");
await page.waitForTimeout(200);
check("النقر ثانية على الزر يغلقها", await page.locator("#recordMenu").count() === 0);

/* 2) توحيد الهمزات في البحث والتكرار */
await page.fill("#recordSearch", "احمد باكير");
await page.waitForTimeout(400);
check("البحث «احمد» يجد «أحمد»", await ev(function () { return getVisibleRecords().map(function (r) { return r.id; }).join(","); }) === "a4");
await page.fill("#recordSearch", "");
await page.waitForTimeout(300);
check("«أسعد إبراهيم» و«أسعد ابراهيم» نفس الهوية", await ev(function () { return sameRecordIdentity(records[0], records[1]); }));

/* 3) «مقبوض» يسأل عن الإيصال والتاريخ */
const sel = 'select.pay-select[aria-label="حالة القبض للسجل 3"]';
await page.selectOption(sel, "paid");
await page.waitForSelector("dialog[open] [data-field=receipt]");
await dialogClick("إلغاء");
check("إلغاء نافذة الإيصال يبقيه غير مقبوض", !(await ev(function () { return isRecordPaid(records.find(function (r) { return r.id === "a4"; })); })) && (await page.inputValue(sel)) === "unpaid");
await page.selectOption(sel, "paid");
await page.waitForSelector("dialog[open] [data-field=receipt]");
await page.fill("dialog[open] [data-field=receipt]", "١٢١٥٢");
await page.fill("dialog[open] [data-field=day]", "31/02/2026");
await dialogClick("حفظ");
check("تاريخ غير صحيح يعيد السؤال", await page.locator("dialog[open] [data-field=day]").count() === 1);
await page.fill("dialog[open] [data-field=day]", "22/09/2026");
await dialogClick("حفظ");
await page.waitForTimeout(700);
const pay = await ev(function () { const r = records.find(function (x) { return x.id === "a4"; }); return { p: r.payment, h: r.history[r.history.length - 1].detail }; });
check("الإيصال (بأرقام عربية) والتاريخ يُحفظان", pay.p && pay.p.receipt === "12152" && pay.p.day === "2026-09-22", JSON.stringify(pay.p));
check("سجل التعديلات فيه التاريخ والإيصال", /22\/09\/2026/.test(pay.h) && /إيصال 12152/.test(pay.h), pay.h);
check("الإيصال يظهر تحت الحالة في الجدول", (await page.locator("tr:has(" + sel + ") .pay-receipt").innerText()).includes("12152"));
await page.fill("#recordSearch", "12152");
await page.waitForTimeout(400);
check("البحث برقم إيصال القبض", await ev(function () { return getVisibleRecords().map(function (r) { return r.id; }).join(","); }) === "a4");
await page.fill("#recordSearch", "");

/* 4) تعديل بيانات القبض لسجل قديم بلا تاريخ قبض (يوم payment.at) */
check("سجل قديم: تاريخ القبض = يوم payment.at", await ev(function () { return paymentDay(records.find(function (r) { return r.id === "a3"; })); }) === "2026-10-01");
await ev(function () { editRecordPayment("a3"); });
await page.waitForSelector("dialog[open] [data-field=receipt]");
check("النافذة تعرض التاريخ الحالي", (await page.inputValue("dialog[open] [data-field=day]")) === "01/10/2026");
await page.fill("dialog[open] [data-field=receipt]", "999");
await dialogClick("حفظ");
await page.waitForTimeout(600);
check("تعديل بيانات القبض يحفظ الإيصال ويبقيه مقبوضاً", await ev(function () { const r = records.find(function (x) { return x.id === "a3"; }); return isRecordPaid(r) && r.payment.receipt === "999" && /تعديل بيانات القبض/.test(r.history[r.history.length - 1].detail); }));

/* 5) جدول التدقيق: الصفوف وبنود «انتبه» */
const t = await ev(function () {
    const d = collectAuditTable();
    return { n: d.rows.length, att: d.attention.map(function (a) { return a.level + "|" + a.issue; }) };
});
check("كل السجلات في الجدول (مع المستردة)", t.n === 4, t.n);
check("«انتبه»: المكرر بكتابتين مختلفتين", t.att.some(function (a) { return /^عالية\|سجل مكرر/.test(a); }), t.att.join(" / "));
check("«انتبه»: اسم المندوب بأكثر من كتابة", t.att.some(function (a) { return /اسم المندوب بأكثر من كتابة: .*أسعد إبراهيم.*أسعد ابراهيم|اسم المندوب بأكثر من كتابة: .*أسعد ابراهيم.*أسعد إبراهيم/.test(a); }), t.att.join(" / "));
check("«انتبه»: سجل بلا مدقق", t.att.some(function (a) { return /سجل بلا مدقق/.test(a); }));
check("«انتبه»: لا بند «بلا إيصال» بعد إضافة الإيصالات", !t.att.some(function (a) { return /بلا رقم إيصال/.test(a); }), t.att.join(" / "));

/* 6) تنزيل الملف بالزر */
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }).catch(function () { return null; }), page.click("#auditTableBtn")]);
const hasXlsx = await ev(function () { return typeof XLSX !== "undefined"; });
if (hasXlsx) {
    /* اسم الملف في Chromium الآلي قد يظهر «download» (تنزيل blob)؛ المحتوى يُفحص أدناه */
    check("زر «جدول التدقيق» ينزّل ملف Excel", !!dl);
    if (dl) {
        const buf = fs.readFileSync(await dl.path()).toString("base64");
        const sheets = await ev(function (b64) {
            const wb = XLSX.read(b64, { type: "base64" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets["السجلات"], { header: 1 });
            return { names: wb.SheetNames.join(","), header: (rows[3] || []).join("|"), body: rows.slice(4).map(function (r) { return r.join("|"); }) };
        }, buf);
        check("أوراق الملف: الملخص، السجلات، غير المقبوض، انتبه", sheets.names === "الملخص,السجلات,غير المقبوض,انتبه", sheets.names);
        check("أعمدة ورقة السجلات", /رقم السجل\|المندوب\|المكتب\|تاريخ السجل\|المصدر\|عدد الوكالات\|المطلوب من المندوب\|المدقق\|حالة القبض\|تاريخ القبض\|رقم الإيصال/.test(sheets.header), sheets.header);
        check("صف السجل المقبوض فيه الإيصال وتاريخ القبض", sheets.body.some(function (r) { return /أحمد باكير/.test(r) && /مقبوض/.test(r) && /12152/.test(r); }), sheets.body.join(" // "));
        check("السجل المسترد بمصدره", sheets.body.some(function (r) { return /مستورد من موقع تدقيق آخر \(موقع قديم\)/.test(r); }));
    }
} else {
    console.log("SKIP تنزيل الملف (مكتبة الإكسل من CDN غير متاحة في الاختبار)");
}

/* 7) الإعدادات: إخفاء الزر، والتنزيل اليومي مرة واحدة */
await ev(function () { switchSection("personalizeSection"); });
await page.waitForTimeout(400);
await page.locator("label:has(#prefAuditTableButton)").click();
await page.waitForTimeout(300);
check("إيقاف الزر يخفيه من صفحة السجلات", await ev(function () { return document.getElementById("auditTableBtn").hidden && auditTablePrefs().button === false; }));
await page.locator("label:has(#prefAuditTableButton)").click();
await page.waitForTimeout(200);
if (hasXlsx) {
    await ev(function () { saveAuditTablePrefs({ daily: true, lastDay: "" }); });
    const [d1] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(function () { return null; }), ev(function () { return persistRecords(); })]);
    check("التنزيل اليومي عند أول حفظ في اليوم", !!d1);
    const [d2] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(function () { return null; }), ev(function () { return persistRecords(); })]);
    check("لا تنزيل ثانٍ في نفس اليوم", !d2);
    await ev(function () { saveAuditTablePrefs({ daily: false, lastDay: "" }); });
    const [d3] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(function () { return null; }), ev(function () { return persistRecords(); })]);
    check("إيقاف التنزيل اليومي يوقفه", !d3);
}

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
