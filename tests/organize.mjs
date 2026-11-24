/* فحوص 24/11/2026 ببيانات تجريبية معزولة: تنظيم الصفحات — خيارات تُفعَّل عند الحاجة، فلاتر مطوية، ألوان الأزرار حسب وظيفتها.
   التشغيل: node tests/organize.mjs */
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
await ctx.addInitScript(function () {
    if (localStorage.getItem("org_seeded")) return;
    localStorage.setItem("org_seeded", "1");
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
const hidden = function (id) { return ev(function (id) { return document.getElementById(id).closest("[hidden]") !== null; }, id); };

await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
check("الملاحظة والحسم وسعر الفترة مخفية افتراضياً", (await hidden("recordNote")) && (await hidden("recordDeductionAmount")) && (await hidden("agencyPricePeriod")));

await page.click('label.reveal-toggle:has([data-reveal="recordNoteBox"])');
await page.waitForTimeout(200);
check("تفعيل «ملاحظة على السجل» يظهر الحقل ويضع المؤشر فيه", !(await hidden("recordNote")) && await ev(function () { return document.activeElement.id === "recordNote"; }));
await page.fill("#recordNote", "ملاحظة تجربة");
await page.click('label.reveal-toggle:has([data-reveal="recordNoteBox"])');
await dialogClick("إبقاء");
check("إطفاء خيار فيه نص يسأل، و«إبقاء» يبقيه", !(await hidden("recordNote")) && (await page.inputValue("#recordNote")) === "ملاحظة تجربة");
await page.click('label.reveal-toggle:has([data-reveal="recordNoteBox"])');
await dialogClick("إطفاء ومسح");
check("«إطفاء ومسح» يخفيه ويمسح النص", (await hidden("recordNote")) && (await page.inputValue("#recordNote")) === "");

/* فتح سجل فيه ملاحظة وحسم وسعر فترة: تُفتح تلقائياً */
await ev(function () {
    const a = buildAgency({ number: "1", type: "special", status: "active", additions: {}, missing: {} }, getPricingForType("special", "2026-11-20"));
    records = [{ id: "e1", recordNumber: "9", officeName: "الدانا", representativeName: "أحمد", recordDate: "2026-11-20", createdAt: "2026-11-20T08:00:00Z",
        recordNote: "ناقص توقيع", deduction: { amount: 500, reason: "مقاصة" }, agencies: [a] }];
    return persistRecords();
});
await ev(function () { editRecord("e1"); });
await page.waitForTimeout(800);
check("فتح سجل فيه ملاحظة وحسم يفتح خياريهما", !(await hidden("recordNote")) && !(await hidden("recordDeductionAmount")) && (await page.inputValue("#recordDeductionAmount")) === "500");
await ev(function () { setAgencyPricePeriod(priceSchedule.length ? (priceSchedule[0].from.length === 7 ? priceSchedule[0].from + "-01" : priceSchedule[0].from) : "base"); });
await page.waitForTimeout(200);
check("اختيار سعر فترة يفتح خيار «سعر من فترة أخرى»", !(await hidden("agencyPricePeriod")));
await ev(function () { setAgencyPricePeriod(""); });
check("العودة إلى «حسب تاريخ السجل» تطويه", await hidden("agencyPricePeriod"));
await ev(function () { resetRecordForm(); });
await page.waitForTimeout(300);
check("سجل جديد بعد التفريغ: الخيارات مطوية", (await hidden("recordNote")) && (await hidden("recordDeductionAmount")));

/* الفلاتر المطوية */
await ev(function () { recordsView.office = "الدانا"; saveRecordsView(); switchSection("recordsSection"); });
await page.waitForTimeout(300);
const more = await ev(function () { return { open: document.getElementById("rfMore").open, count: document.getElementById("rfMoreCount").textContent }; });
check("«المزيد من الفلاتر» يُفتح تلقائياً ويعرض عدد المفعّل", more.open && more.count === "1", JSON.stringify(more));
await ev(function () { recordsView = Object.assign({}, RECORDS_VIEW_DEFAULT); saveRecordsView(); renderRecords(); });
await ev(function () { switchSection("reportsSection"); });
await page.waitForTimeout(400);
check("التصفية المتقدمة في التقارير مطوية افتراضياً", await ev(function () { return !document.getElementById("reportFilterMore").open; }));

/* ألوان الأزرار */
await ev(function () { switchSection("recordsSection"); });
await page.waitForTimeout(300);
const colors = await ev(function () {
    const bg = function (el) { return el ? getComputedStyle(el).backgroundColor : ""; };
    const similar = document.getElementById("similarAgencyBtn");
    const edit = document.querySelector("#recordsTableBody .act-edit, .act-edit");
    return { similar: getComputedStyle(similar).backgroundImage.indexOf("gradient") !== -1, edit: bg(edit), plain: bg(document.querySelector(".act-btn.act-primary")) };
});
check("زر «وكالة مماثلة» ملوّن مختلف، و«تعديل» كهرماني لا أبيض", colors.similar && colors.edit && colors.edit !== colors.plain && colors.edit !== "rgb(255, 255, 255)", JSON.stringify(colors));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
