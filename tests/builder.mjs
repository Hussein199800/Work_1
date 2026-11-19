/* فحوص 19/11/2026 ببيانات تجريبية معزولة: الفرز والفلترة حسب اسم المندوب، المقاصة (حسم للمندوب)،
   والتقارير المخصّصة (التحديد، الأعمدة وترتيبها، التجميع، الإجمالي، القوالب، CSV وExcel والطباعة).
   التشغيل: node tests/builder.mjs */
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
/* محلي فقط، عدا مكتبة Excel (لفحص الملف إن توفّر الإنترنت) */
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.jsdelivr\.net)/, function (r) { r.abort(); });
await ctx.addInitScript(function () {
    if (localStorage.getItem("builder_seeded")) return;
    localStorage.setItem("builder_seeded", "1");
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && typeof records !== "undefined"; });
await page.waitForTimeout(900);
const ev = function (fn, arg) { return page.evaluate(fn, arg); };

await ev(function () {
    const reps = ["سامر العلي", "أحمد محروق", "محمد حسن"];
    const list = [];
    for (let r = 0; r < 6; r++) {
        const day = "2026-0" + (4 + r) + "-10";
        const ags = [];
        for (let i = 1; i <= 4; i++) ags.push(buildAgency({ number: String(i), type: "special", status: i === 4 && r === 0 ? "cancelled" : "active",
            additions: { save: 0, signature: i % 2 }, missing: { pleading: i === 1 ? 1 : 0 } }, getPricingForType("special", day)));
        list.push({ id: "b" + r, recordNumber: String(300 + r), officeName: "مكتب " + (r % 2), representativeName: reps[r % 3], representativeType: "internal",
            recordDate: day, agencies: ags, createdAt: day + "T08:00:00Z", auditors: ["مدقق سري"] });
    }
    records = list;
    return persistRecords();
});

/* 1) الفرز والفلترة حسب اسم المندوب */
await ev(function () { switchSection("recordsSection"); });
await page.selectOption("#rfSort", "rep-asc");
await page.waitForTimeout(200);
const order = await ev(function () { return getVisibleRecords().map(function (r) { return r.representativeName; }); });
const sorted = order.slice().sort(function (a, b) { return a.localeCompare(b, "ar"); });
check("فرز السجلات حسب اسم المندوب أبجدياً", JSON.stringify(order) === JSON.stringify(sorted), order.join("، "));
await page.selectOption("#rfRepName", "محمد حسن");
await page.waitForTimeout(200);
const onlyOne = await ev(function () { return getVisibleRecords().map(function (r) { return r.representativeName; }); });
check("فلترة حسب اسم مندوب واحد", onlyOne.length === 2 && onlyOne.every(function (n) { return n === "محمد حسن"; }), onlyOne.join("، "));
await page.selectOption("#rfRepName", "all");

/* 2) المقاصة */
const before = await ev(function () { const r = records.find(function (x) { return x.id === "b1"; }); return { due: getRecordRepresentativeTotal(r), grand: getRecordGrandTotal(r), amb: getRecordFinalStats(r).committees.ambulance, ag: JSON.stringify(r.agencies) }; });
await ev(function () { editRecord("b1"); });
await page.waitForTimeout(400);
await page.fill("#recordDeductionAmount", "700");
await page.click('#recordForm button[type="submit"]');
await page.waitForTimeout(400);
const blocked = await ev(function () { return !records.find(function (x) { return x.id === "b1"; }).deduction; });
check("حسم بلا سبب لا يُحفظ", blocked);
await page.fill("#recordDeductionReason", "مقاصة مع أتعاب دفعها المندوب عن الفرع");
await page.click('#recordForm button[type="submit"]');
await page.waitForTimeout(500);
for (let i = 0; i < 4 && await page.locator("dialog[open]").count(); i++) { await page.locator("dialog[open] .app-dialog-ok, dialog[open] button.primary-btn").first().click(); await page.waitForTimeout(300); }
await page.waitForTimeout(500);
const after = await ev(function () {
    const r = records.find(function (x) { return x.id === "b1"; });
    const st = getRecordFinalStats(r);
    return { d: r.deduction, due: st.representativeTotal, net: getRecordNetDue(r), grand: getRecordGrandTotal(r), amb: st.committees.ambulance, ag: JSON.stringify(r.agencies),
        report: buildFinalRecordReport(r, "summary", true), netText: money(getRecordNetDue(r)) };
});
check("الحسم وسببه محفوظان مع السجل", after.d && after.d.amount === 700 && /أتعاب دفعها/.test(after.d.reason), JSON.stringify(after.d));
check("الصافي = المطلوب − الحسم", after.net === before.due - 700 && after.due === before.due, before.due + " → " + after.net);
check("الحسم لا يغيّر الإجمالي ولا حصص اللجان ولا الوكالات", after.grand === before.grand && after.amb === before.amb && after.ag === before.ag);
check("التقرير يعرض الصافي والحسم وسببه", after.report.indexOf(after.netText) !== -1 && /حسم \(مقاصة\)/.test(after.report) && /أتعاب دفعها/.test(after.report));
const dash = await ev(function () {
    updateDashboard();
    const total = records.reduce(function (s, r) { return s + getRecordNetDue(r); }, 0);
    return { shown: document.getElementById("totalRepresentativeAmount").textContent, expected: money(total) };
});
check("لوحة التحكم تعرض الصافي بعد المقاصة", dash.shown === dash.expected, JSON.stringify(dash));
await ev(function () { switchSection("recordsSection"); });
const rowText = await ev(function () { return Array.from(document.querySelectorAll("#recordsTableBody tr")).map(function (tr) { return tr.textContent; }).join(" "); });
check("جدول السجلات يعرض «بعد حسم»", /بعد حسم/.test(rowText));
/* حسم أكبر من المطلوب يحتاج تأكيداً */
await ev(function () { editRecord("b2"); });
await page.waitForTimeout(400);
await page.fill("#recordDeductionAmount", "999999");
await page.fill("#recordDeductionReason", "اختبار");
await page.click('#recordForm button[type="submit"]');
await page.waitForTimeout(400);
const asked = await page.locator("dialog[open]").count();
check("حسم أكبر من المطلوب يسأل أولاً", asked === 1);
await page.locator("dialog[open] .app-dialog-cancel").click();
await ev(function () { resetRecordForm(); });

/* 3) التقرير المخصّص */
await ev(function () { switchSection("recordsSection"); selectedRecordIds.clear(); renderRecords(); });
await page.locator('input[data-sel="b0"]').check();
await page.locator('input[data-sel="b1"]').check();
await page.locator('input[data-sel="b3"]').check();
const btnText = await page.textContent("#customReportBtn");
check("زر التقرير المخصّص يعرض عدد المحدد", /للمحدد \(3\)/.test(btnText), btnText);
await page.click("#customReportBtn");
await page.waitForTimeout(400);
check("التقرير يشمل السجلات المحددة فقط", await ev(function () { return crRecordIds.length === 3 && crRecordIds.indexOf("b2") === -1; }));
/* قالب 4 أعمدة */
await page.selectOption("#crTemplate", "builtin-4");
await page.waitForTimeout(300);
const heads4 = await ev(function () { return Array.from(document.querySelectorAll("#crPreview thead th")).map(function (th) { return th.textContent; }); });
check("قالب 4 أعمدة: المندوب، رقم السجل، التاريخ، الصافي", JSON.stringify(heads4) === JSON.stringify(["المندوب", "رقم السجل", "التاريخ", "الصافي المطلوب"]), heads4.join("، "));
/* إضافة عمود وتحريكه للأعلى */
await page.locator('input[data-cr-col="office"]').check();
await page.waitForTimeout(150);
for (let i = 0; i < 4; i++) { await page.click('[data-cr-up="office"]'); await page.waitForTimeout(120); }
const heads5 = await ev(function () { return Array.from(document.querySelectorAll("#crPreview thead th")).map(function (th) { return th.textContent; }); });
check("إضافة عمود «المكتب» وتقديمه إلى الأول", heads5[0] === "المكتب" && heads5.length === 5, heads5.join("، "));
const noAuditor = await ev(function () { return CR_COLUMNS.record.concat(CR_COLUMNS.agency).every(function (c) { return !/مدقق/.test(c.label); }) && document.getElementById("crPreview").textContent.indexOf("مدقق سري") === -1; });
check("أسماء المدققين لا تظهر في أي تقرير", noAuditor);
/* التجميع حسب المندوب والإجمالي */
await page.locator("#crGroup").check();
await page.waitForTimeout(200);
const sums = await ev(function () {
    const total = crRecords().reduce(function (s, r) { return s + getRecordNetDue(r); }, 0);
    const foot = document.querySelector("#crPreview tfoot").textContent;
    const subs = document.querySelectorAll("#crPreview .cr-subtotal").length;
    return { ok: foot.indexOf(money(total)) !== -1, subs: subs, foot: foot };
});
/* المحدد: b0 وb3 (سامر العلي) وb1 (أحمد محروق) = مندوبان */
check("التجميع حسب المندوب: مجموع لكل مندوب، والإجمالي صحيح", sums.ok && sums.subs === 2, JSON.stringify(sums));
/* المستوى: سطر لكل وكالة */
await page.locator('input[name="crLevel"][value="agency"]').check();
await page.waitForTimeout(300);
const agencyRows = await ev(function () { return crBuildRows(crState).rows.length; });
check("سطر لكل وكالة: 12 وكالة من 3 سجلات", agencyRows === 12, agencyRows);
await page.locator('input[name="crLevel"][value="record"]').check();
await page.waitForTimeout(300);
/* حفظ قالب واستعادته وحذفه */
await page.fill("#crTitle", "قالبي للمراجعة");
await page.waitForTimeout(350);
await page.click('[data-cr="save-template"]');
await page.waitForTimeout(300);
const saved = await ev(function () { return crLoadPrefs().templates.map(function (t) { return t.name; }); });
check("حفظ قالب باسم العنوان", saved.indexOf("قالبي للمراجعة") !== -1, saved.join("، "));
await page.click('[data-cr="delete-template"]');
await page.waitForTimeout(300);
check("حذف القالب المحفوظ", await ev(function () { return crLoadPrefs().templates.length === 0; }));
/* CSV */
await page.selectOption("#crTemplate", "builtin-7");
await page.waitForTimeout(300);
const dl = page.waitForEvent("download");
await page.click('[data-cr="csv"]');
const csvFile = await dl;
const csv = fs.readFileSync(await csvFile.path(), "utf8");
const csvLines = csv.replace(/^﻿/, "").trim().split(/\r?\n/);
check("CSV: BOM وعناوين و3 أسطر وإجمالي", csv.charCodeAt(0) === 0xfeff && /رقم السجل/.test(csvLines[0]) && csvLines.length === 5, csvLines.length + " سطر");
/* Excel (يحتاج المكتبة من CDN) */
const hasXlsx = await ev(function () { return typeof XLSX !== "undefined"; });
if (hasXlsx) {
    const dl2 = page.waitForEvent("download");
    await page.click('[data-cr="excel"]');
    const xf = await dl2;
    /* اسم الملف العربي يظهر «download» في المتصفح بلا واجهة فقط؛ نفحص المحتوى (zip = xlsx) */
    const head = fs.readFileSync(await xf.path()).subarray(0, 2).toString();
    check("Excel: ملف xlsx", head === "PK" && fs.statSync(await xf.path()).size > 1000, head);
} else {
    console.log("SKIP Excel (لا اتصال بمكتبة الإكسل)");
}
/* الطباعة: المستند كامل، وأفقي عند أكثر من 7 أعمدة */
const printDoc = await ev(function () {
    const html = buildCustomReportDoc(crState);
    crState.columns = crState.order.slice(0, 9);
    return { rows: (html.match(/<tr>/g) || []).length, landscape: crIsLandscape(crState, crState.columns.length) };
});
check("مستند الطباعة فيه كل الأسطر، وأفقي لـ 9 أعمدة", printDoc.rows >= 4 && printDoc.landscape === true, JSON.stringify(printDoc));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
