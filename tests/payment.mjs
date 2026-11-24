/* فحوص 24/11/2026 ببيانات تجريبية معزولة: حالة القبض (مقبوض / غير مقبوض) وسجل التعديلات.
   التشغيل: node tests/payment.mjs */
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
    if (localStorage.getItem("pay_seeded")) return;
    localStorage.setItem("pay_seeded", "1");
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

/* 1) إنشاء سجل من النموذج: سطر «إنشاء» */
await ev(function () { records = [{ id: "old1", recordNumber: "1", officeName: "قديم", representativeName: "قديم", recordDate: "2026-10-01", createdAt: "2026-10-01T08:00:00Z", agencies: [] }]; return persistRecords(); });
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
await page.fill("#recordNumber", "40");
await page.fill("#officeName", "الدانا");
await page.fill("#representativeName", "أحمد");
await page.fill("#agencyNumber", "1");
await page.click("#addAgencyBtn");
await page.waitForTimeout(800);
await ev(function () { document.getElementById("recordForm").requestSubmit(); });
await page.waitForTimeout(1000);
if (await page.locator("dialog[open]").count()) await confirmDialogs();
await page.waitForTimeout(600);
const rid = await ev(function () { const r = records.find(function (x) { return x.recordNumber === "40"; }); return r && r.id; });
const created = await ev(function (id) { const r = records.find(function (x) { return x.id === id; }); return r.history; }, rid);
check("حفظ سجل جديد يكتب «إنشاء» باسم المستخدم", created && created.length === 1 && created[0].action === "create" && created[0].by === "admin", JSON.stringify(created));

/* 2) تعديل: المكتب ووكالة جديدة */
await ev(function (id) { editRecord(id); }, rid);
await page.waitForTimeout(800);
await page.fill("#officeName", "سرمدا");
await page.fill("#agencyNumber", "2");
await page.click("#addAgencyBtn");
await page.waitForTimeout(800);
await ev(function () { document.getElementById("recordForm").requestSubmit(); });
await page.waitForTimeout(1000);
if (await page.locator("dialog[open]").count()) await confirmDialogs();
await page.waitForTimeout(600);
const edited = await ev(function (id) { const r = records.find(function (x) { return x.id === id; }); return r.history; }, rid);
const last = edited[edited.length - 1];
check("التعديل يصف ما تغيّر (المكتب والوكالة المضافة)", edited.length === 2 && last.action === "edit" && /المكتب: الدانا ← سرمدا/.test(last.detail) && /أُضيفت وكالات: 2/.test(last.detail), JSON.stringify(last));

/* 3) حالة القبض من القائمة المنسدلة */
await ev(function () { switchSection("recordsSection"); });
await page.waitForTimeout(400);
const sel = 'select.pay-select[aria-label="حالة القبض للسجل 40"]';
check("القائمة المنسدلة تظهر «غير مقبوض» افتراضياً", (await page.inputValue(sel)) === "unpaid");
const dashBefore = await ev(function () { return document.getElementById("dashUnpaid").textContent; });
await page.selectOption(sel, "paid");
await page.waitForTimeout(800);
const paidState = await ev(function (id) { const r = records.find(function (x) { return x.id === id; }); return { p: r.payment, h: r.history[r.history.length - 1] }; }, rid);
check("«مقبوض» يُحفظ بالتاريخ ومن غيّره", paidState.p && paidState.p.status === "paid" && paidState.p.by === "admin" && !!paidState.p.at, JSON.stringify(paidState.p));
check("سجل التعديلات: «صار مقبوضاً بتاريخ …»", paidState.h.action === "paid" && /صار مقبوضاً بتاريخ \d\d\/\d\d\/\d{4}/.test(paidState.h.detail), JSON.stringify(paidState.h));
const dashAfter = await ev(function () { return document.getElementById("dashUnpaid").textContent; });
check("لوحة التحكم: عدد غير المقبوض نقص", /2/.test(dashBefore) && /1/.test(dashAfter), dashBefore + " → " + dashAfter);

/* الفلتر */
await page.selectOption("#rfPaid", "unpaid");
await page.waitForTimeout(400);
const unpaidRows = await ev(function () { return getVisibleRecords().map(function (r) { return r.recordNumber; }).join(","); });
check("فلتر «غير مقبوض» يخفي المقبوض", unpaidRows === "1", unpaidRows);
await page.selectOption("#rfPaid", "all");
await page.waitForTimeout(300);

/* يبقى بعد إعادة التحميل */
await page.reload();
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(1000);
check("حالة القبض محفوظة بعد إعادة فتح الصفحة", await ev(function (id) { return isRecordPaid(records.find(function (x) { return x.id === id; })); }, rid));

/* الإرجاع إلى غير مقبوض يسأل أولاً */
await ev(function () { switchSection("recordsSection"); });
await page.waitForTimeout(300);
await page.selectOption(sel, "unpaid");
await dialogClick("إلغاء");
check("إلغاء الإرجاع يبقيه مقبوضاً", await ev(function (id) { return isRecordPaid(records.find(function (x) { return x.id === id; })); }, rid) && (await page.inputValue(sel)) === "paid");
await page.selectOption(sel, "unpaid");
await dialogClick("إرجاع إلى غير مقبوض");
await page.waitForTimeout(500);
const unpaidH = await ev(function (id) { const r = records.find(function (x) { return x.id === id; }); return { paid: isRecordPaid(r), h: r.history[r.history.length - 1] }; }, rid);
check("الإرجاع يُحفظ ويُكتب في السجل", !unpaidH.paid && unpaidH.h.action === "unpaid", JSON.stringify(unpaidH));

/* 4) نافذة سجل التعديلات */
const view = await ev(function (id) {
    showRecordHistory(id);
    const items = Array.from(document.querySelectorAll("#modalContent .history-item")).map(function (li) { return li.className; });
    closeRecordModal(true);
    showRecordHistory("old1");
    const legacy = !!document.querySelector("#modalContent .history-item.is-legacy");
    closeRecordModal(true);
    return { items: items, legacy: legacy };
}, rid);
check("نافذة السجل: الأحدث أولاً (غير مقبوض ← مقبوض ← تعديل ← إنشاء)", view.items.length === 4 && /is-unpaid/.test(view.items[0]) && /is-create/.test(view.items[3]), JSON.stringify(view.items));
check("سجل قديم بلا تاريخ تعديلات يعرض سطر «قبل تفعيل سجل التعديلات»", view.legacy);

/* 5) إيصالات الاستدراك تُكتب في السجل، والتقرير المطبوع لا يعرض السجل */
const rc = await ev(function (id) {
    const r = records.find(function (x) { return x.id === id; });
    r.agencies[0].stamps = Object.assign({}, r.agencies[0].stamps, { pleading: 1 });
    r.agencies[0].missingStampsValue = 200;
    showFinalRecordReport(id, "summary");
    const el = document.getElementById("rcv_centralReceipt");
    if (el) el.value = "555";
    saveRecordRecovery(id, "summary");
    return new Promise(function (res) { setTimeout(function () {
        const h = r.history[r.history.length - 1];
        const doc = buildFinalRecordReport(r, "detailed", true);
        closeRecordModal(true);
        res({ has: !!el, h: h, inDoc: doc.indexOf("سجل التعديلات") !== -1 || doc.indexOf("صار مقبوض") !== -1 });
    }, 700); });
}, rid);
check("حفظ إيصال الاستدراك يُكتب في السجل", rc.has && rc.h.action === "recovery" && /555/.test(rc.h.detail), JSON.stringify(rc));
check("سجل التعديلات لا يظهر في التقرير المطبوع", !rc.inDoc);

/* 6) المشاهد: شارة بدون تغيير */
const viewer = await ev(function () {
    const saved = currentUser; currentUser = Object.assign({}, saved, { role: "viewer" });
    renderRecords();
    const res = { select: document.querySelectorAll("select.pay-select").length, badge: document.querySelectorAll(".pay-badge").length };
    currentUser = saved; renderRecords();
    return res;
});
check("المشاهد يرى شارة الحالة بلا قائمة منسدلة", viewer.select === 0 && viewer.badge >= 2, JSON.stringify(viewer));

/* 7) التقرير المخصّص: عمود حالة القبض */
check("التقرير المخصّص فيه عمود «حالة القبض»", await ev(function () { return CR_COLUMNS.record.some(function (c) { return c.key === "paid"; }); }));

/* 8) قائمة الإضافة لا تشارك قائمة سجل آخر */
check("addRecordHistory لا يغيّر قائمة سجل آخر يشاركها", await ev(function () {
    const a = { history: [] }; const b = { history: a.history };
    addRecordHistory(b, "edit", "x");
    return a.history.length === 0 && b.history.length === 1;
}));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
