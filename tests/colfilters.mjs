/* فحوص 24/11/2026 ببيانات تجريبية معزولة: فلاتر الأعمدة مثل Excel، تاريخ التدقيق (الحفظ).
   التشغيل: node tests/colfilters.mjs */
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
    if (localStorage.getItem("cf_seeded")) return;
    localStorage.setItem("cf_seeded", "1");
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


await ev(function () {
    writeUiPref("audit_ui_audit_table", JSON.stringify({ daily: false }));
    records = [
        { id: "r1", recordNumber: "5", officeName: "سلقين", representativeName: "أسعد", recordDate: "2026-09-01", createdAt: "2026-09-20T10:00:00Z", agencies: [], payment: { status: "paid", at: "2026-10-01T09:00:00Z", by: "admin", day: "2026-10-01", receipt: "100" } },
        { id: "r2", recordNumber: "12", officeName: "سلقين", representativeName: "أسعد", recordDate: "2026-09-10", createdAt: "2026-10-05T10:00:00Z", agencies: [] },
        { id: "r3", recordNumber: "7", officeName: "سرمدا", representativeName: "حازم", recordDate: "2026-08-01", createdAt: "2026-08-02T10:00:00Z", agencies: [], auditors: ["باسل"], payment: { status: "paid", at: "2026-11-01T09:00:00Z", by: "admin" } },
        { id: "r4", recordNumber: "3", officeName: "الدانا", representativeName: "أحمد", agencies: [], source: { kind: "site", name: "x" }, summary: { agencyCount: 40, amountDue: 24000 }, createdAt: "2026-11-24T06:00:00Z" }
    ];
    return persistRecords().then(function () { switchSection("recordsSection"); });
});
await page.waitForTimeout(600);
const ids = function () { return ev(function () { return getVisibleRecords().map(function (r) { return r.id; }).join(","); }); };

/* 1) فلتر قيم: المندوب = أسعد */
await page.click('[data-col-filter="rep"]');
await page.waitForSelector("#colFilterPop");
check("النافذة فيها ترتيب وقائمة قيم بعدد كل قيمة", (await page.locator("#colFilterPop [data-cf-sort]").count()) === 2 && /أسعد\s*2/.test(await page.locator("#colFilterPop .cf-facet[data-facet=rep]").innerText()));
await page.locator('#colFilterPop .cf-facet[data-facet=rep] [data-cf-all]').uncheck();
await page.locator('#colFilterPop [data-cf-val="أسعد"]').check();
await page.click("#colFilterPop [data-cf-apply]");
await page.waitForTimeout(300);
check("فلتر المندوب «أسعد»", (await ids()).split(",").sort().join(",") === "r1,r2", await ids());
check("السهم مميّز وشريحة الفلتر ظاهرة", await ev(function () { return document.querySelector('[data-col-filter="rep"]').classList.contains("is-active") && !document.getElementById("colFilterChips").hidden && /المندوب: أسعد/.test(document.getElementById("colFilterChips").textContent); }));

/* 2) + حالة القبض = مقبوض (تتجمّع) */
await page.click('[data-col-filter="due"]');
await page.waitForSelector("#colFilterPop");
await page.locator('#colFilterPop [data-cf-val="غير مقبوض"]').uncheck();
await page.click("#colFilterPop [data-cf-apply]");
await page.waitForTimeout(300);
check("فلتران معاً: أسعد + مقبوض", (await ids()) === "r1", await ids());

/* 3) إزالة شريحة المندوب + تاريخ التدقيق من–إلى */
await page.click('[data-cf-remove="rep"]');
await page.waitForTimeout(200);
check("إزالة شريحة تُبقي الأخرى", (await ids()).split(",").sort().join(",") === "r1,r3", await ids());
await page.click('[data-cf-remove-all]');
await page.click('[data-col-filter="date"]');
await page.waitForSelector("#colFilterPop");
await page.fill('#colFilterPop .cf-facet[data-facet=saved] [data-cf-from]', "2026-09-01");
await page.fill('#colFilterPop .cf-facet[data-facet=saved] [data-cf-to]', "2026-10-31");
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
check("تاريخ التدقيق من 1/9 إلى 31/10 (Enter يطبّق)", (await ids()).split(",").sort().join(",") === "r1,r2", await ids());
await page.click('[data-cf-remove-all]');

/* 4) نطاق رقم السجل + ترتيب المطلوب */
await page.click('[data-col-filter="number"]');
await page.waitForSelector("#colFilterPop");
await page.fill('#colFilterPop .cf-facet[data-facet=numberRange] [data-cf-from]', "٤");
await page.fill('#colFilterPop .cf-facet[data-facet=numberRange] [data-cf-to]', "10");
await page.click("#colFilterPop [data-cf-apply]");
await page.waitForTimeout(300);
check("رقم السجل من 4 إلى 10 (أرقام عربية مقبولة)", (await ids()).split(",").sort().join(",") === "r1,r3", await ids());
await page.click('[data-cf-remove-all]');
await page.click('[data-col-filter="due"]');
await page.waitForSelector("#colFilterPop");
await page.click('#colFilterPop [data-cf-sort="desc"]');
await page.waitForTimeout(300);
check("ترتيب «المطلوب» تنازلياً: المسترد 24000 أولاً", (await ids()).split(",")[0] === "r4", await ids());

/* 5) تاريخ التدقيق في الجدول، والبقاء بعد إعادة الفتح، وإعادة الضبط */
check("تاريخ التدقيق تحت تاريخ السجل", await ev(function () { return /دُقّق 20\/09\/2026/.test(document.getElementById("recordsTableBody").textContent) && /أُدخل 24\/11\/2026/.test(document.getElementById("recordsTableBody").textContent); }));
await page.click('[data-col-filter="office"]');
await page.waitForSelector("#colFilterPop");
await page.locator('#colFilterPop .cf-facet[data-facet=auditor] [data-cf-val=""]').uncheck();
await page.click("#colFilterPop [data-cf-apply]");
await page.waitForTimeout(300);
check("فلتر «المدقق»: باسل فقط", (await ids()) === "r3", await ids());
await page.reload();
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(900);
await ev(function () { switchSection("recordsSection"); });
await page.waitForTimeout(300);
check("الفلاتر تبقى بعد إعادة فتح الصفحة", (await ids()) === "r3", await ids());
await page.click("#rfReset");
await page.waitForTimeout(300);
check("«إعادة الضبط» تمسح فلاتر الأعمدة", (await ids()).split(",").length === 4 && await ev(function () { return document.getElementById("colFilterChips").hidden; }));

/* 6) Escape يغلق والنقر خارجها يغلق */
await page.click('[data-col-filter="rep"]');
await page.waitForSelector("#colFilterPop");
await page.keyboard.press("Escape");
check("Escape يغلق النافذة", await page.locator("#colFilterPop").count() === 0);
await page.click('[data-col-filter="rep"]');
await page.waitForSelector("#colFilterPop");
await page.click("#recordsSection .page-title h2");
check("النقر خارجها يغلقها", await page.locator("#colFilterPop").count() === 0);

/* 7) عمود «تاريخ التدقيق» في التقرير المخصّص */
check("عمود «تاريخ التدقيق (الحفظ)» في التقرير المخصّص", await ev(function () { return CR_COLUMNS.record.some(function (c) { return c.key === "savedAt"; }); }).catch(function () { return false; }));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
