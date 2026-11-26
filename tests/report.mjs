/* فحوص تخصيص التقرير (16/11/2026) ببيانات تجريبية فقط: «بيان استدراك النقص»
   وجهة رسوم كل بند، حفظ الإيصالات، خيار الطباعة، حجم خط التقرير والموقع،
   والنسخة الاحتياطية. تنزيل PDF المباشر يُفحص إن توفّر الإنترنت (مكتبات CDN).
   التشغيل: node tests/report.mjs */
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


const SEED = [{ id: "r1", recordNumber: "60", officeName: "مكتب", representativeName: "مندوب", recordDate: "2026-09-12", createdAt: "2026-09-12T08:00:00Z", agencies: [] }];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
/* محلي فقط، عدا مكتبات PDF (لفحص التنزيل المباشر إن توفّر الإنترنت) */
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/, function (r) { r.abort(); });
await ctx.addInitScript(function (seed) {
    if (localStorage.getItem("report_seeded")) return;
    localStorage.setItem("report_seeded", "1");
    localStorage.setItem("audit_records", JSON.stringify(seed));
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
}, SEED);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(1200);
const ev = function (fn, arg) { return page.evaluate(fn, arg); };

/* سجل فيه نقص من كل الأنواع (السعر الحالي: مرافعة 100، إسعاف 300، معونة 150، إيصال 150) */
await ev(function () {
    const r = records.find(function (x) { return x.id === "r1"; });
    for (let i = 1; i <= 4; i++) {
        r.agencies.push(buildAgency({ number: String(i), type: "special", status: "active",
            additions: { save: 0, signature: 0, inheritance: 0, children: 0, agents: 0, originality: 0, transport: 0 },
            missing: { pleading: 1, ambulance: i === 1 ? 1 : 0, aid: i === 2 ? 1 : 0, receipt: i <= 2 ? 1 : 0 } }, getPricingForType("special", "2026-09-12")));
    }
    return persistRecords();
});

/* 1) الجهات الافتراضية والبيان */
check("الجهات الافتراضية: الطوابع للمركزية والإيصال للفرع", await ev(function () {
    return feeDestinations.pleading === "central" && feeDestinations.ambulance === "central" && feeDestinations.aid === "central" && feeDestinations.receipt === "branch";
}));
await ev(function () { showFinalRecordReport("r1", "summary"); });
await page.waitForTimeout(300);
const body = await ev(function () { return document.querySelector(".doc-recovery .recovery-body").textContent; });
check("البيان: المركزية 850 (مرافعة 400 + إسعاف 300 + معونة 150) والفرع 300", /رسوم عائدة إلى النقابة المركزية/.test(body) && /850/.test(body) && /رسوم عائدة إلى الفرع/.test(body) && /300/.test(body), body.slice(0, 200));
check("الإجمالي في البيان 1,150", /1,150/.test(body));
check("الخانات الفارغة تُطبع نقاطاً", /\(\.{6,}\)/.test(body));

/* 2) حفظ الإيصالات مع السجل */
await page.fill("#rcv_centralReceipt", "٤٥٢١");
await page.fill("#rcv_centralDate", "2026-09-20");
await page.fill("#rcv_branchReceipt", "77");
await page.fill("#rcv_text", "سُدّد الفرق عند استلام السجل.");
await page.click(".recovery-editor .primary-btn");
await page.waitForTimeout(800);
const saved = await ev(function () { return records.find(function (x) { return x.id === "r1"; }); });
check("الإيصالات محفوظة مع السجل (الأرقام غربية)", saved.recovery && saved.recovery.centralReceipt === "4521" && saved.recovery.centralDate === "2026-09-20" &&
    saved.recovery.branchReceipt === "77" && saved.recovery.text === "سُدّد الفرق عند استلام السجل." && !!saved.updatedAt, JSON.stringify(saved.recovery));
check("البيان يعرض رقم الإيصال والفقرة الإضافية", await ev(function () {
    const t = document.querySelector(".doc-recovery").textContent;
    return /الإيصال رقم 4521/.test(t) && /سُدّد الفرق عند استلام السجل/.test(t);
}));

/* 3) خيار الطباعة (26/11/2026: من «الأقسام المطبوعة»): بلا البيان لا يدخل في الطباعة */
await page.click(".report-sections > summary");
await page.click('.report-sections input[data-report-section="statement"]');
await page.waitForTimeout(300);
check("إلغاء «مع بيان استدراك النقص»: لا يُطبع، ويبقى ظاهراً باهتاً للتعديل", await ev(function () {
    const r = records.find(function (x) { return x.id === "r1"; });
    return buildFinalRecordReport(r, "summary", true).indexOf("doc-recovery") === -1 && !!document.querySelector(".doc-recovery.is-excluded.no-print");
}));
await page.click(".report-sections > summary");
await page.click('.report-sections input[data-report-section="statement"]');
await page.waitForTimeout(300);
check("المفصل يحتوي البيان أيضاً", await ev(function () {
    return buildFinalRecordReport(records.find(function (x) { return x.id === "r1"; }), "detailed", true).indexOf("doc-recovery") !== -1;
}));

/* التوقيع مرة واحدة في آخر التقرير؛ والبيان صار الصفحة الأولى (26/11/2026) */
check("البيان أول التقرير والتوقيع مرة واحدة في آخره (مع البيان وبدونه)", await ev(function () {
    const r = records.find(function (x) { return x.id === "r1"; });
    const count = function (h) { return (h.match(/doc-committee-sign/g) || []).length; };
    const withRec = buildFinalRecordReport(r, "detailed", true);
    const okWith = count(withRec) === 1 && withRec.indexOf("doc-recovery") < withRec.indexOf("التقرير المفصل للسجل") && withRec.lastIndexOf("doc-committee-sign") > withRec.indexOf("doc-recovery");
    saveReportPrefs({ recovery: false });
    const without = buildFinalRecordReport(r, "summary", true);
    const screen = buildFinalRecordReport(r, "summary", false);
    saveReportPrefs({ recovery: true });
    return okWith && count(without) === 1 && count(screen) === 1;
}));

/* 4) جهة رسوم قابلة للتغيير */
await ev(function () { feeDestinations.ambulance = "branch"; saveData(FEE_DESTINATIONS_KEY, feeDestinations); showFinalRecordReport("r1", "summary"); });
const moved = await ev(function () { return document.querySelector(".doc-recovery .recovery-body").textContent; });
check("نقل الإسعاف للفرع: المركزية 550 والفرع 600", /550/.test(moved) && /600/.test(moved), moved.slice(0, 300));
check("الجهة محفوظة في الإعدادات وفي النسخة الاحتياطية", await ev(function () {
    return JSON.parse(localStorage.getItem("audit_fee_destinations")).ambulance === "branch" && JSON.parse(buildBackupJSON()).feeDestinations.ambulance === "branch" &&
        FB_SETTINGS_KEYS.indexOf("audit_fee_destinations") !== -1;
}));

/* 4ب) من صفحة الأسعار: اختيار الجهة وحفظ الأسعار */
await ev(function () { closeRecordModal(); switchSection("pricesSection"); });
await page.waitForTimeout(400);
check("صفحة الأسعار فيها جهة كل بند نقص (4)", (await page.locator("[data-fee-dest-key]").count()) === 4);
await page.selectOption('[data-fee-dest-key="aid"]', "branch");
await page.click("#savePricesBtn");
await page.waitForTimeout(400);
for (let i = 0; i < 3 && await page.locator("dialog[open]").count(); i++) {
    await page.locator("dialog[open] .app-dialog-ok, dialog[open] button.primary-btn").first().click();
    await page.waitForTimeout(400);
}
await page.waitForFunction(function () { return typeof switchSection === "function"; });
check("حفظ الأسعار يحفظ الجهة", await ev(function () { return JSON.parse(localStorage.getItem("audit_fee_destinations")).aid === "branch"; }));
await ev(function () { feeDestinations.aid = "central"; saveData(FEE_DESTINATIONS_KEY, feeDestinations); showFinalRecordReport("r1", "summary"); });
await page.waitForTimeout(300);

/* 5) حجم خط التقرير */
const fs1 = await ev(function () { return parseFloat(getComputedStyle(document.querySelector(".final-report .doc-table td")).fontSize); });
await page.click('.report-zoom button[title="تكبير الخط"]');
await page.click('.report-zoom button[title="تكبير الخط"]');
await page.waitForTimeout(300);
const fs2 = await ev(function () { return parseFloat(getComputedStyle(document.querySelector(".final-report .doc-table td")).fontSize); });
check("A+ مرتين يكبّر خط التقرير 20%", Math.abs(fs2 / fs1 - 1.2) < 0.02, fs1 + " → " + fs2);
check("الحجم محفوظ ويدخل في الطباعة", await ev(function () {
    return reportPrefs().scale === 1.2 && buildFinalRecordReport(records.find(function (x) { return x.id === "r1"; }), "summary", true).indexOf("--doc-scale:1.2") !== -1;
}));
await page.click(".report-zoom-value");
check("الضغط على النسبة يعيد 100%", await ev(function () { return reportPrefs().scale === 1; }));

/* 6) حجم خط الموقع لا يغيّر التقرير */
const before = await ev(function () { return parseFloat(getComputedStyle(document.body).fontSize); });
await ev(function () { changeUiFontScale(1); changeUiFontScale(1); });
const after = await ev(function () { return { body: parseFloat(getComputedStyle(document.body).fontSize), doc: parseFloat(getComputedStyle(document.querySelector(".final-report .doc-table td")).fontSize), label: document.getElementById("uiFontScaleValue").textContent, saved: localStorage.getItem("audit_ui_font_scale") }; });
check("تكبير خط الموقع 110% ومحفوظ", Math.abs(after.body / before - 1.1) < 0.02 && after.label === "110%" && after.saved === "1.1", JSON.stringify(after) + " من " + before);
check("خط الموقع لا يغيّر خط التقرير", Math.abs(after.doc - fs1) < 0.01, after.doc + " / " + fs1);
await page.reload();
await page.waitForFunction(function () { return typeof switchSection === "function"; });
check("حجم خط الموقع يبقى بعد إعادة التحميل", await ev(function () { return document.documentElement.style.getPropertyValue("--ui-scale") === "1.1"; }));
await ev(function () { changeUiFontScale(0); });

/* 6ب) تعديل السجل من النموذج وحفظه لا يُضيّع إيصالات البيان */
await ev(function () { closeRecordModal(); editRecord("r1"); });
await page.waitForTimeout(400);
await page.fill("#officeName", "مكتب معدّل");
await page.click('#recordForm button[type="submit"]');
await page.waitForTimeout(500);
for (let i = 0; i < 3 && await page.locator("dialog[open]").count(); i++) {
    await page.locator("dialog[open] .app-dialog-ok, dialog[open] button.primary-btn").first().click();
    await page.waitForTimeout(400);
}
await page.waitForTimeout(500);
check("تعديل السجل وحفظه يُبقي إيصالات البيان", await ev(function () {
    const r = records.find(function (x) { return x.id === "r1"; });
    return r.officeName === "مكتب معدّل" && r.recovery && r.recovery.centralReceipt === "4521" && r.recovery.text === "سُدّد الفرق عند استلام السجل.";
}), await ev(function () { return JSON.stringify(records.find(function (x) { return x.id === "r1"; }).recovery || null); }));

/* 7) سجل بلا نقص (26/11/2026): «بيان خلوّ السجل من النقص» في أوله بصيغة رسمية */
check("سجل بلا نقص: بيان خلوّ من النقص في الصفحة الأولى", await ev(function () {
    const r = { id: "z", recordNumber: "1", officeName: "o", representativeName: "r", recordDate: "2026-09-12",
        agencies: [buildAgency({ number: "1", type: "special", status: "active", additions: {}, missing: { pleading: 0, ambulance: 0, aid: 0 } }, getPricingForType("special", "2026-09-12"))] };
    const html = buildFinalRecordReport(r, "summary", true);
    return html.indexOf("بيان خلوّ السجل من النقص") !== -1 && html.indexOf("لم يُسجَّل عليها أي نقص") !== -1 &&
        html.indexOf("بيان خلوّ السجل من النقص") < html.indexOf("التقرير المختصر للسجل") && html.indexOf("بيان استدراك النقص") === -1 &&
        html.indexOf("السادة مجلس النقابة المركزية") !== -1;
}));

/* 7ب) الأقسام المطبوعة لتقرير السجل: طباعة بدل الانتقال فقط مثلاً */
check("الأقسام المطبوعة: غير المختار لا يُطبع، ويظهر باهتاً على الشاشة", await ev(function () {
    const r = records.find(function (x) { return x.id === "r1"; });
    ["statement", "summary", "types", "missing", "notes", "committees", "signatures"].forEach(function (k) { setReportSection("record", k, false); });
    const print = buildFinalRecordReport(r, "summary", true);
    const screen = buildFinalRecordReport(r, "summary", false);
    /* العناوين فقط (أسماء الأقسام موجودة أيضاً في لوحة الاختيار no-print داخل شريط الأزرار) */
    const ok = print.indexOf("</span>الإضافات") !== -1 && print.indexOf("</span>الوكالات حسب النوع") === -1 && print.indexOf("doc-recovery") === -1 &&
        print.indexOf("doc-committee-sign") === -1 && print.indexOf("</span>حصص لجنتي") === -1 && screen.indexOf("doc-excluded") !== -1 &&
        /sec-no">.<\/span>الإضافات/.test(print);
    REPORT_SECTIONS.record.forEach(function (s) { setReportSection("record", s.key, true); });
    return ok;
}));

/* 7ج) التقرير العام: بدل الانتقال والإضافات والنقص حسب السجل، وأقسامه المطبوعة */
check("التقرير العام: جداول حسب السجل، ويمكن طباعة الطوابع الناقصة وحدها", await ev(function () {
    const full = buildGeneralReportDoc();
    const ok1 = full.indexOf("بدل الانتقال حسب السجل") !== -1 && full.indexOf("الإضافات حسب السجل") !== -1 && full.indexOf("الطوابع الناقصة حسب السجل") !== -1;
    REPORT_SECTIONS.general.forEach(function (s) { setReportSection("general", s.key, s.key === "missing" || s.key === "missingByRecord"); });
    const only = buildGeneralReportDoc();
    const ok2 = only.indexOf("الطوابع الناقصة حسب السجل") !== -1 && only.indexOf("بدل الانتقال حسب السجل") === -1 && only.indexOf("المطلوب من كل مندوب") === -1 &&
        only.indexOf("doc-committee-sign") === -1;
    REPORT_SECTIONS.general.forEach(function (s) { setReportSection("general", s.key, true); });
    return ok1 && ok2;
}));

/* 8) تنزيل PDF مباشر (يحتاج الإنترنت لتحميل المكتبات) */
const online = await ev(function () { return fetch(PDF_LIBS[0], { method: "HEAD" }).then(function (r) { return r.ok; }, function () { return false; }); });
if (online) {
    await ev(function () { showFinalRecordReport("r1", "summary"); });
    const dl = page.waitForEvent("download", { timeout: 60000 });
    const ok = await ev(function () { return downloadRecordPDF("r1", "summary"); });
    const file = await dl;
    const head = fs.readFileSync(await file.path()).subarray(0, 5).toString();
    check("تنزيل PDF مباشر يعطي ملف PDF", ok === true && head === "%PDF-", head);
} else {
    console.log("SKIP تنزيل PDF مباشر (لا اتصال بمكتبات CDN)");
}

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
