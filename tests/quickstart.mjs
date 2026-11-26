/* فحوص 27/11/2026 ببيانات تجريبية معزولة: الشاشة السريعة للسجل الجديد، وضبط التاريخ.
   التشغيل: node tests/quickstart.mjs */
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
    if (localStorage.getItem("qs_seeded")) return;
    localStorage.setItem("qs_seeded", "1");
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





/* سجل سابق لمندوب معروف (للملء التلقائي) */
await ev(function () {
    records = [{ id: "p1", recordNumber: "7", officeName: "سراقب", representativeName: "أحمد باكير", representativeType: "external", defaultAgencyType: "general",
        recordDate: "2026-11-01", createdAt: "2026-11-01T08:00:00Z", agencies: [] }];
    return persistRecords();
});
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(400);
check("لا تُفتح تلقائياً تحت الاختبار الآلي", await ev(function () { return document.getElementById("recordModal").classList.contains("hidden"); }));

/* ضبط التاريخ */
await page.click('.input-group .date-chip[data-date-shift="-1"]');
await page.waitForTimeout(200);
const dateHint = await ev(function () { return { v: document.getElementById("recordDate").value, y: shiftDay(todayDay(), -1), hint: document.getElementById("recordDateHint").textContent, on: !!document.querySelector('.input-group .date-chip.is-on[data-date-shift="-1"]') }; });
check("زر «أمس» يضبط التاريخ، والتاريخ يظهر مكتوباً مع فترة الأسعار", dateHint.v === dateHint.y && /أسعار/.test(dateHint.hint) && dateHint.on, JSON.stringify(dateHint));
const future = await ev(function () { const i = document.getElementById("recordDate"); i.value = shiftDay(todayDay(), 5); i.dispatchEvent(new Event("change")); return document.getElementById("recordDateHint").textContent; });
check("تاريخ في المستقبل: تنبيه بلا منع", /في المستقبل/.test(future), future);
await ev(function () { const i = document.getElementById("recordDate"); i.value = todayDay(); i.dispatchEvent(new Event("change")); });

/* الشاشة السريعة */
await ev(function () { openRecordQuickStart(); });
await page.waitForTimeout(300);
check("الشاشة السريعة تعرض أسعار التاريخ وتذكير التقرير", await ev(function () {
    const q = document.querySelector("[data-quickstart]");
    return !!q && /الأسعار لهذا التاريخ/.test(q.textContent) && !!q.querySelector(".qs-prices tbody tr") && /التوقيعات|لجنة التدقيق/.test(q.textContent);
}));
await page.fill("#qsNumber", "٤٠");
await page.fill("#qsRep", "أحمد باكير");
await page.dispatchEvent("#qsRep", "input");
await page.waitForTimeout(200);
const auto = await ev(function () { return { office: document.getElementById("qsOffice").value, type: document.getElementById("qsRepType").value, def: document.getElementById("qsDefType").value, note: !document.getElementById("qsAutofill").hidden }; });
check("اختيار مندوب معروف يملأ مكتبه ونوعه ونوع سجله الغالب", auto.office === "سراقب" && auto.type === "external" && auto.def === "general" && auto.note, JSON.stringify(auto));
await page.click('[data-quickstart] .date-chip[data-date-shift="-2"]');
await page.waitForTimeout(150);
await page.click('[data-qs="start"]');
await page.waitForTimeout(500);
const applied = await ev(function () {
    return { closed: document.getElementById("recordModal").classList.contains("hidden"), num: document.getElementById("recordNumber").value, rep: document.getElementById("representativeName").value,
        office: document.getElementById("officeName").value, type: document.getElementById("representativeType").value, def: document.getElementById("recordDefaultType").value,
        agencyType: document.getElementById("agencyType").value, date: document.getElementById("recordDate").value, want: shiftDay(todayDay(), -2), focus: document.activeElement && document.activeElement.id };
});
check("«ابدأ إدخال الوكالات» يملأ النموذج ويضع المؤشر على رقم الوكالة", applied.closed && applied.num === "40" && applied.rep === "أحمد باكير" && applied.office === "سراقب" &&
    applied.type === "external" && applied.def === "general" && applied.agencyType === "general" && applied.date === applied.want && applied.focus === "agencyNumber", JSON.stringify(applied));

/* تخطي + لا تعرض مرة أخرى */
await ev(function () { resetRecordForm(); openRecordQuickStart(); });
await page.waitForTimeout(300);
await page.check("#qsDontShow");
await page.click('[data-qs="skip"]');
await page.waitForTimeout(400);
const skipped = await ev(function () { return { closed: document.getElementById("recordModal").classList.contains("hidden"), num: document.getElementById("recordNumber").value, pref: localStorage.getItem("audit_ui_quickstart"), focus: document.activeElement && document.activeElement.id }; });
check("«تخطي» لا يغيّر النموذج، و«لا تعرض» يطفئها (ويُشغَّل من تخصيص الواجهة)", skipped.closed && skipped.num === "" && skipped.pref === "off" && skipped.focus === "recordNumber", JSON.stringify(skipped));
await ev(function () { switchSection("personalizeSection"); });
await page.waitForTimeout(200);
check("مفتاح الشاشة السريعة في تخصيص الواجهة يعكس الحالة", await ev(function () { return document.getElementById("prefQuickStart").checked === false; }));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
