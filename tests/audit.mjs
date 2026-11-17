/* فحوص مراجعة 17/11/2026 (D01–D05، C01–C03، R01–R02، U01–U03) ببيانات تجريبية معزولة فقط.
   كل فحص يصف السلوك الصحيح: فشل قبل الإصلاح ونجح بعده. لا Firebase ولا Telegram حقيقيين.
   التشغيل: node tests/audit.mjs */
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
function check(id, name, ok, detail) {
    console.log((ok ? "PASS " : "FAIL ") + id + " " + name + (ok || detail === undefined ? "" : " — " + detail));
    if (!ok) failed++;
}

const browser = await chromium.launch();
const ADMIN = JSON.stringify({ id: "admin-user", username: "admin", role: "manager" });

/* سياق جديد معزول؛ seed: مفاتيح تُزرع قبل أول تحميل فقط */
async function fresh(opts) {
    opts = opts || {};
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1400, height: 900 }, acceptDownloads: true });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
    await ctx.addInitScript(function (args) {
        if (localStorage.getItem("audit_seeded")) return;
        localStorage.setItem("audit_seeded", "1");
        localStorage.setItem("currentUser", args.admin);
        Object.keys(args.seed || {}).forEach(function (k) { localStorage.setItem(k, args.seed[k]); });
    }, { admin: ADMIN, seed: opts.seed || {} });
    return ctx;
}
async function open(ctx) {
    const page = await ctx.newPage();
    page.errors = [];
    page.on("pageerror", function (e) { page.errors.push(e.message); });
    page.on("download", function () {});
    await page.goto(BASE);
    await page.waitForFunction(function () { return typeof switchSection === "function" && typeof records !== "undefined" && Array.isArray(records); });
    await page.waitForTimeout(700);
    return page;
}
async function confirmDialogs(page) {
    for (let i = 0; i < 4 && await page.locator("dialog[open]").count(); i++) {
        await page.locator("dialog[open] .app-dialog-ok, dialog[open] button.primary-btn").first().click();
        await page.waitForTimeout(300);
    }
}
const rec = function (id, office, agencies) {
    return { id: id, recordNumber: id, officeName: office, representativeName: "س", recordDate: "2026-05-10", createdAt: "2026-05-10T08:00:00Z", updatedAt: "2026-05-10T08:00:00Z", agencies: agencies || [] };
};

/* ================= D01: تبويبان وIndexedDB ================= */
{
    const ctx = await fresh();
    const a = await open(ctx);
    await a.evaluate(function (r) { records = [r]; return persistRecords().then(function () { return moveRecordsToIDB(); }); }, rec("r1", "Office"));
    await a.reload(); await a.waitForFunction(function () { return typeof records !== "undefined" && Array.isArray(records) && records.length === 1; });
    const b = await open(ctx);
    const inIdb = await b.evaluate(function () { return recordsInIDB && records.length === 1; });
    /* حفظان متتاليان من نافذة واحدة لا يتعارضان */
    const seq = await b.evaluate(function () {
        return Promise.all([persistRecordsNow(), persistRecordsNow(), persistRecordsNow()]).then(function () { return "ok"; }, function (e) { return String(e && e.message || e); });
    });
    check("D01", "حفظات متتالية من النافذة نفسها تنجح", seq === "ok", seq);
    /* A يُعاد تحميله بعد حفظات B فيبدأ من آخر نسخة، ثم يبدأ السباق */
    await a.reload(); await a.waitForFunction(function () { return typeof records !== "undefined" && Array.isArray(records); });
    await b.reload(); await b.waitForFunction(function () { return typeof records !== "undefined" && Array.isArray(records); });
    /* A يحفظ أولاً؛ B لم يصله إشعار A بعد (نحاكي تأخر حدث storage) ثم يحفظ نسخته */
    const ra = await a.evaluate(function (r) { records.push(r); return persistRecordsNow().then(function () { return "ok"; }, function (e) { return "rejected"; }); }, rec("a", "A"));
    const rb = await b.evaluate(function (r) { recordsStaleTab = false; records.push(r); return persistRecordsNow().then(function () { return "ok"; }, function (e) { return "rejected"; }); }, rec("b", "B"));
    const durable = await a.evaluate(function () { return idbGet("audit_records").then(function (l) { return l.map(function (x) { return x.id; }).join(","); }); });
    check("D01", "نافذتان: لا ينجح حفظان ويضيع أحدهما", inIdb && !(ra === "ok" && rb === "ok" && durable.split(",").length < 3), "A=" + ra + " B=" + rb + " المخزن=" + durable);
    check("D01", "الحفظ الأول باقٍ والثاني يُرفض برسالة", ra === "ok" && rb === "rejected" && durable === "r1,a", "A=" + ra + " B=" + rb + " المخزن=" + durable);
    /* بعد إعادة تحميل B يعود الحفظ طبيعياً */
    await b.reload(); await b.waitForFunction(function () { return typeof records !== "undefined" && Array.isArray(records); });
    const rb2 = await b.evaluate(function (r) { records.push(r); return persistRecordsNow().then(function () { return idbGet("audit_records"); }).then(function (l) { return l.map(function (x) { return x.id; }).join(","); }, function (e) { return "rejected"; }); }, rec("b", "B"));
    check("D01", "بعد إعادة التحميل يحفظ B فوق آخر نسخة", rb2 === "r1,a,b", rb2);
    /* حفظان في اللحظة نفسها تماماً (بلا أي تدخل): لا يضيع حفظ أُعلن نجاحه */
    await a.reload(); await a.waitForFunction(function () { return typeof records !== "undefined" && Array.isArray(records); });
    const both = await Promise.all([
        a.evaluate(function (r) { records.push(r); return persistRecordsNow().then(function () { return "ok"; }, function () { return "rejected"; }); }, rec("x1", "X1")),
        b.evaluate(function (r) { records.push(r); return persistRecordsNow().then(function () { return "ok"; }, function () { return "rejected"; }); }, rec("x2", "X2"))
    ]);
    const final = await a.evaluate(function () { return idbGet("audit_records").then(function (l) { return l.map(function (x) { return x.id; }).join(","); }); });
    const lost = (both[0] === "ok" && final.indexOf("x1") === -1) || (both[1] === "ok" && final.indexOf("x2") === -1);
    check("D01", "حفظان متزامنان فعلاً: كل حفظ ناجح موجود في المخزن", !lost, both.join("/") + " المخزن=" + final);
    await ctx.close();
}
{
    /* وضع localStorage أيضاً */
    const ctx = await fresh({ seed: { audit_records: JSON.stringify([rec("r1", "Office")]) } });
    const a = await open(ctx);
    const b = await open(ctx);
    const ra = await a.evaluate(function (r) { records.push(r); return persistRecordsNow().then(function () { return "ok"; }, function () { return "rejected"; }); }, rec("a", "A"));
    const rb = await b.evaluate(function (r) { recordsStaleTab = false; records.push(r); return persistRecordsNow().then(function () { return "ok"; }, function () { return "rejected"; }); }, rec("b", "B"));
    const durable = await a.evaluate(function () { return JSON.parse(localStorage.getItem("audit_records")).map(function (x) { return x.id; }).join(","); });
    check("D01", "localStorage: الحفظ المتأخر من نسخة قديمة يُرفض", ra === "ok" && rb === "rejected" && durable === "r1,a", "A=" + ra + " B=" + rb + " المخزن=" + durable);
    await ctx.close();
}

/* ================= D02/D03: الاستعادة ================= */
const OLD_STATE = { audit_records: JSON.stringify([rec("r1", "Old office")]), audit_users: JSON.stringify([{ id: "admin-user", username: "admin", password: "x", role: "manager" }]) };
function backupFile(data) {
    return Object.assign({ appName: "نظام تدقيق السجلات والوكالات", version: 1, exportedAt: "2026-11-17T00:00:00Z" }, data);
}
async function restore(page, data) {
    await page.evaluate(function (d) {
        window.__reloads = 0;
        window.reloadApp = function () { window.__reloads++; };
        restoreBackupFromFile(new File([JSON.stringify(d)], "b.json", { type: "application/json" }));
    }, data);
    await page.waitForTimeout(500);
    await confirmDialogs(page);
    await page.waitForTimeout(800);
}
{
    const ctx = await fresh({ seed: OLD_STATE });
    const page = await open(ctx);
    /* فشل كتابة الأسعار (امتلاء المساحة) أثناء الاستعادة */
    await page.evaluate(function () {
        const orig = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            if (k === "audit_prices" && window.__failPrices) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
            return orig.call(this, k, v);
        };
        window.__failPrices = true;
    });
    await restore(page, backupFile({ records: [rec("r1", "RESTORED")], users: [{ id: "u2", username: "restored", password: "y", role: "manager" }], prices: { general: { agency: 1, representative: 1 } } }));
    const st = await page.evaluate(function () {
        return { disk: JSON.parse(localStorage.getItem("audit_records"))[0].officeName, users: JSON.parse(localStorage.getItem("audit_users")).map(function (u) { return u.username; }).join(","), mem: records[0] && records[0].officeName };
    });
    check("D02", "فشل كتابة إعداد أثناء الاستعادة لا يترك خليطاً", st.disk === "Old office" && st.users === "admin" && st.mem === "Old office", JSON.stringify(st));
    /* فشل حفظ السجلات بعد الإعدادات: الإعدادات تعود */
    await page.evaluate(function () { window.__failPrices = false; window.__origPersist = persistRecordsNow; });
    await page.evaluate(function () {
        /* فشل كتابة السجلات نفسها (لا مسار النقل إلى IndexedDB) */
        window.__origRaw = persistRecordsRaw;
        persistRecordsRaw = function () { return Promise.reject(new Error("records write failed")); };
    });
    await restore(page, backupFile({ records: [rec("r1", "RESTORED")], users: [{ id: "u2", username: "restored", password: "y", role: "manager" }] }));
    const st2 = await page.evaluate(function () {
        return { disk: JSON.parse(localStorage.getItem("audit_records"))[0].officeName, users: JSON.parse(localStorage.getItem("audit_users")).map(function (u) { return u.username; }).join(","), mem: records[0] && records[0].officeName };
    });
    await page.evaluate(function () { persistRecordsRaw = window.__origRaw; });
    check("D02", "فشل حفظ السجلات أثناء الاستعادة يعيد الإعدادات", st2.disk === "Old office" && st2.users === "admin" && st2.mem === "Old office", JSON.stringify(st2));
    await ctx.close();
}
{
    const ctx = await fresh({ seed: OLD_STATE });
    const page = await open(ctx);
    const bad = [
        ["records:[null]", backupFile({ records: [null] })],
        ["سجل بلا وكالات صحيحة", backupFile({ records: [{ id: "x", recordNumber: "1", agencies: "zz" }] })],
        ["معرّف مكرر", backupFile({ records: [rec("d", "A"), rec("d", "B")] })],
        ["وكالة null", backupFile({ records: [rec("x", "A", [null])] })],
        ["إصدار أحدث", Object.assign(backupFile({ records: [rec("x", "A")] }), { version: 2 })],
        ["مستخدمون فارغون", backupFile({ records: [rec("x", "A")], users: [] })]
    ];
    for (const [name, data] of bad) {
        await restore(page, data);
        const disk = await page.evaluate(function () { return localStorage.getItem("audit_records"); });
        check("D03", "رفض «" + name + "» قبل أي كتابة", disk === OLD_STATE.audit_records, disk.slice(0, 80));
    }
    /* نسخة قديمة صحيحة بلا الحقول الحديثة تُقبل */
    const oldAg = { id: "o1", number: "1", type: "special", status: "active", basePrice: 1700, representativeBase: 300, representativeAmount: 400, missingStamps: { pleading: 1, ambulance: 0, aid: 0 }, missingStampsValue: 100 };
    await restore(page, { version: 1, records: [rec("old", "Legacy", [oldAg])], users: [{ id: "admin-user", username: "admin", password: "x", role: "manager" }] });
    const ok = await page.evaluate(function () { return JSON.parse(localStorage.getItem("audit_records"))[0].officeName; });
    check("D03", "نسخة قديمة صحيحة (بلا receipt/recovery/additions) تُستعاد", ok === "Legacy", ok);
    await ctx.close();
}
{
    /* سجلات تالفة بنيوياً في التخزين: حماية بدل الانهيار */
    const ctx = await fresh({ seed: { audit_records: "[null]" } });
    const page = await open(ctx);
    const st = await page.evaluate(function () { return { failed: recordsLoadFailed, raw: localStorage.getItem("audit_records") }; });
    check("D03", "audit_records=[null] عند الفتح: حماية بلا انهيار ولا كتابة", st.failed === true && st.raw === "[null]" && page.errors.length === 0, JSON.stringify(st) + " " + page.errors.join("|"));
    await ctx.close();
}

/* ================= D04: إعداد تالف ================= */
{
    const bad = '{"special":invalidJSON}';
    const ctx = await fresh({ seed: { audit_prices: bad } });
    const page = await open(ctx);
    const st = await page.evaluate(function () { return { raw: localStorage.getItem("audit_prices"), toast: (document.getElementById("appToast") || {}).textContent || "" }; });
    check("D04", "إعداد أسعار تالف لا يُكتب فوقه عند الفتح", st.raw === bad, st.raw.slice(0, 60));
    check("D04", "رسالة واضحة عن الإعداد التالف", /تالف|تعذرت قراءة/.test(st.toast), st.toast.slice(0, 120));
    const save = await page.evaluate(function (r) { records.push(r); return persistRecords().then(function () { return "ok"; }, function (e) { return "blocked"; }); }, rec("n", "N"));
    check("D04", "حفظ سجلات بأسعار افتراضية غير مقصودة ممنوع", save === "blocked", save);
    await ctx.close();
    const ctx2 = await fresh();
    const p2 = await open(ctx2);
    const fresh2 = await p2.evaluate(function () { return !!localStorage.getItem("audit_prices") && JSON.parse(localStorage.getItem("audit_prices")).general.agency > 0; });
    check("D04", "التثبيت الجديد يهيئ المفاتيح الغائبة طبيعياً", fresh2);
    await ctx2.close();
}

/* ================= D05: فشل الحفظ بعد المزامنة ================= */
{
    const ctx = await fresh({ seed: { audit_records: JSON.stringify([rec("r1", "Old office")]) } });
    const page = await open(ctx);
    const st = await page.evaluate(function () {
        const remote = Object.assign({}, records[0], { officeName: "REMOTE", updatedAt: "2026-12-01T00:00:00Z" });
        const json = JSON.stringify(remote);
        fbBackend = {
            pullRecords: function () { return Promise.resolve([{ id: "r1", json: json, hash: fbRecordHash(remote), deleted: false, updatedAt: remote.updatedAt, syncedAt: 5 }]); },
            getSettings: function () { return Promise.resolve(null); },
            pushRecords: function () { return Promise.resolve(); },
            pushSettings: function () { return Promise.resolve(); }
        };
        fbUser = { email: "t@example.com" };
        fbState.firstSyncDone = true; fbState.uid = FB_WORKSPACE;
        fbState.base = { r1: fbRecordHash(records[0]) };
        const orig = persistRecordsRaw;
        persistRecordsRaw = function () { return Promise.reject(new Error("local save failed")); };
        return fbSync("test").then(function (ok) {
            persistRecordsRaw = orig;
            return { ok: ok, mem: records[0].officeName, disk: JSON.parse(localStorage.getItem("audit_records"))[0].officeName };
        });
    });
    check("D05", "فشل الحفظ بعد الجلب: الذاكرة تبقى كالتخزين", st.ok === false && st.mem === "Old office" && st.disk === "Old office", JSON.stringify(st));
    const st2 = await page.evaluate(function () {
        return fbSync("retry").then(function (ok) { return { ok: ok, mem: records[0].officeName, disk: JSON.parse(localStorage.getItem("audit_records"))[0].officeName }; });
    });
    check("D05", "إعادة المحاولة تطبّق النسخة الأحدث وتحفظها", st2.ok === true && st2.mem === "REMOTE" && st2.disk === "REMOTE", JSON.stringify(st2));
    await ctx.close();
}

/* ================= C01–C03: الحسابات ================= */
{
    const ctx = await fresh();
    const page = await open(ctx);
    const r = await page.evaluate(function () {
        stampPrices.pleading = 100;
        const ag = buildAgency({ number: "1", type: "general", status: "active", pricePeriod: "2026-04-01", notes: "",
            additions: { save: 1, signature: 0, inheritance: 0, children: 0, agents: 0, originality: 0, transport: 0 },
            missing: { pleading: 1, ambulance: 0, aid: 0, receipt: 0 } }, pricingForAgency("general", "2026-04-01"));
        const record = { id: "c1", recordNumber: "77", officeName: "o", representativeName: "r", recordDate: "2026-04-05", createdAt: "2026-04-05T08:00:00Z", agencies: [ag] };
        records = [record];
        return persistRecords().then(function () {
            stampPrices.pleading = 200;
            saveData("audit_stamp_prices", stampPrices);
            return { miss: ag.missingStampsValue, rep: ag.representativeAmount, grand: getAgencyGrandTotal(ag) };
        });
    });
    await page.evaluate(function () { switchSection("newRecordSection"); editRecord("c1"); });
    await page.waitForTimeout(400);
    await page.evaluate(function () { editPendingAgency(0); });
    await page.fill("#agencyNotes", "ملاحظة جديدة فقط");
    await page.click("#addAgencyBtn");
    await page.waitForTimeout(500);
    const after = await page.evaluate(function () { const a = pendingAgencies[0]; return { miss: a.missingStampsValue, rep: a.representativeAmount, grand: getAgencyGrandTotal(a), notes: a.notes, stamp: a.appliedPrices && a.appliedPrices.stamps && a.appliedPrices.stamps.pleading }; });
    check("C01", "تعديل الملاحظة لا يغيّر المبالغ ولا الأسعار المطبقة", after.miss === r.miss && after.rep === r.rep && after.grand === r.grand && after.stamp === 100 && after.notes === "ملاحظة جديدة فقط", JSON.stringify(r) + " → " + JSON.stringify(after));
    /* تغيير عدد بند: بأسعار الوكالة المعتمدة لا بسعر اليوم */
    await page.evaluate(function () { editPendingAgency(0); });
    await page.click('.plus-btn[data-target="missingPleading"]');
    await page.click("#addAgencyBtn");
    await page.waitForTimeout(500);
    const after2 = await page.evaluate(function () { return pendingAgencies[0].missingStampsValue; });
    check("C01", "زيادة نقص مرافعة تُحسب بسعر الوكالة المعتمد (100) لا الحالي (200)", after2 === 200, after2);
    await page.click('#recordForm button[type="submit"]');
    await page.waitForTimeout(400);
    await confirmDialogs(page);
    await page.waitForTimeout(600);
    await page.reload(); await page.waitForFunction(function () { return typeof records !== "undefined" && Array.isArray(records); });
    const disk = await page.evaluate(function () { const a = records[0].agencies[0]; return { miss: a.missingStampsValue, notes: a.notes }; });
    check("C01", "بعد الحفظ وإعادة التحميل تبقى المبالغ", disk.miss === 200 && disk.notes === "ملاحظة جديدة فقط", JSON.stringify(disk));

    const c2 = await page.evaluate(function () {
        stampPrices.pleading = 100;
        const base = { id: "z", number: "1", type: "general", status: "active", basePrice: 1700, additionsTotal: 0, pleadingAdditions: 1, additions: { save: 1 } };
        const zero = Object.assign({}, base, { appliedPrices: { stamps: { pleading: 0 } } });
        const pos = Object.assign({}, base, { appliedPrices: { stamps: { pleading: 80 } } });
        const none = Object.assign({}, base);
        const cancelled = Object.assign({}, zero, { status: "cancelled" });
        return [getAgencyStampAdditionsValue(zero), getAgencyGrandTotal(zero), getAgencyStampAdditionsValue(pos), getAgencyStampAdditionsValue(none), getAgencyGrandTotal(cancelled)].join(",");
    });
    check("C02", "سعر طابع محفوظ صفر يبقى صفراً (صفر، موجب، غائب، ملغاة)", c2 === "0,1700,80,100,0", c2);

    const c3 = await page.evaluate(function () {
        stampPrices.pleading = 100; stampPrices.ambulance = 50;
        const old = { id: "q", number: "1", type: "special", status: "active", basePrice: 1700, representativeBase: 300, representativeAmount: 410,
            missingStamps: { pleading: 1, ambulance: 1, aid: 0 }, missingStampsValue: 110 };
        const record = { id: "q1", recordNumber: "9", officeName: "o", representativeName: "r", recordDate: "2026-04-05", agencies: [old] };
        const stats = getRecordFinalStats(record);
        const rows = MISSING_KEYS.reduce(function (s, k) { return s + missingStampTypeValue(stats.agencies, k); }, 0);
        const g = recoveryGroups(stats);
        const html = buildFinalRecordReport(record, "summary");
        return { total: stats.missingValue, rows: rows, recovery: g.central.value + g.branch.value, warned: /غير معروف|يحتاج مراجعة|لا يُعرف توزيع/.test(html) };
    });
    check("C03", "نقص قديم متعدد الأنواع: الصفوف والبيان = الإجمالي التاريخي 110", c3.total === 110 && c3.rows === 110 && c3.recovery === 110, JSON.stringify(c3));
    check("C03", "التقرير ينبّه إلى أن توزيع المبلغ القديم غير معروف", c3.warned, JSON.stringify(c3));
    await ctx.close();
}

/* ================= R01–R02: نافذة التقرير ================= */
{
    const ag = { id: "g", number: "1", type: "special", status: "active", basePrice: 1700, representativeBase: 300, representativeAmount: 400, additionsTotal: 0,
        stamps: { pleading: 1, ambulance: 0, aid: 0, receipt: 0 }, missingStampsValue: 100, appliedPrices: { stamps: { pleading: 100 } } };
    const ctx = await fresh({ seed: { audit_records: JSON.stringify([rec("r1", "Office", [ag])]) } });
    const page = await open(ctx);
    await page.evaluate(function () { switchSection("recordsSection"); });
    await page.waitForTimeout(300);
    const opener = page.locator("#recordsTableBody button, #recordsTable button, .records-table button").filter({ hasText: "التقرير" }).first();
    const hasOpener = await opener.count();
    if (hasOpener) await opener.click(); else await page.evaluate(function () { showFinalRecordReport("r1", "summary"); });
    await page.waitForTimeout(400);
    await page.fill("#rcv_centralReceipt", "4521");
    await page.fill("#rcv_text", "نص لم يُحفظ");
    await page.click('.report-zoom button[title="تكبير الخط"]');
    await page.waitForTimeout(300);
    const r1 = await page.evaluate(function () { return [document.getElementById("rcv_centralReceipt").value, document.getElementById("rcv_text").value].join("|"); });
    check("R01", "A+ لا يمسح الإيصال غير المحفوظ", r1 === "4521|نص لم يُحفظ", r1);
    await page.fill("#rcv_centralReceipt", "9876");
    await page.click(".report-toggle input");
    await page.waitForTimeout(300);
    const r1b = await page.evaluate(function () { return document.getElementById("rcv_centralReceipt").value; });
    check("R01", "تبديل «مع بيان استدراك النقص» لا يمسح الإيصال", r1b === "9876", r1b);
    await page.click(".report-toggle input");
    const saved = await page.evaluate(function () { return JSON.stringify(records[0].recovery || null); });
    check("R01", "التنسيق لا يحفظ الإيصال تلقائياً", saved === "null", saved);

    const dlg = await page.evaluate(function () {
        const m = document.getElementById("recordModal");
        const inside = m.contains(document.activeElement);
        const box = m.querySelector('[role="dialog"]') || m;
        return { role: box.getAttribute("role"), modal: box.getAttribute("aria-modal"), label: !!(box.getAttribute("aria-label") || box.getAttribute("aria-labelledby")), inside: inside,
            closeName: (m.querySelector(".modal-close") || {}).getAttribute ? m.querySelector(".modal-close").getAttribute("aria-label") : "" };
    });
    check("R02", "النافذة dialog مسمّاة وaria-modal، والتركيز داخلها", dlg.role === "dialog" && dlg.modal === "true" && dlg.label && dlg.inside && !!dlg.closeName, JSON.stringify(dlg));
    let escaped = true;
    for (let i = 0; i < 40; i++) {
        await page.keyboard.press(i % 3 === 2 ? "Shift+Tab" : "Tab");
        const inside = await page.evaluate(function () { return document.getElementById("recordModal").contains(document.activeElement); });
        if (!inside) { escaped = false; break; }
    }
    check("R02", "Tab وShift+Tab يبقيان داخل التقرير", escaped);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const after = await page.evaluate(function () {
        const open = !document.getElementById("recordModal").classList.contains("hidden");
        return { open: open, dialog: !!document.querySelector("dialog[open]"), focus: document.activeElement && (document.activeElement.textContent || "").trim().slice(0, 20) };
    });
    /* إيصال غير محفوظ: Escape يسأل أولاً */
    check("R02", "Escape مع إيصال غير محفوظ يسأل قبل الإغلاق", after.dialog === true, JSON.stringify(after));
    await confirmDialogs(page);
    await page.waitForTimeout(300);
    const closed = await page.evaluate(function () { return { hidden: document.getElementById("recordModal").classList.contains("hidden"), focus: (document.activeElement && document.activeElement.textContent || "").trim().slice(0, 20) }; });
    check("R02", "بعد الإغلاق يعود التركيز إلى زر التقرير", closed.hidden && (!hasOpener || /التقرير/.test(closed.focus)), JSON.stringify(closed));
    await ctx.close();
}

/* ================= U01–U03: الأبعاد ================= */
for (const theme of ["light", "dark"]) {
    for (const w of [320, 360, 390]) {
        for (const scale of ["1", "1.3"]) {
            const ctx = await fresh({ viewport: { width: w, height: 800 }, seed: { audit_ui_theme: theme, audit_ui_font_scale: scale } });
            const page = await open(ctx);
            await page.evaluate(function () { switchSection("pricesSection"); });
            await page.waitForTimeout(400);
            const m = await page.evaluate(function () { return { sw: document.documentElement.scrollWidth, iw: innerWidth }; });
            check("U01", "الأسعار بلا تجاوز أفقي " + w + "px " + theme + " خط " + scale, m.sw <= m.iw + 1, JSON.stringify(m));
            await ctx.close();
        }
    }
}
for (const [w, h] of [[1366, 768], [1440, 900], [1280, 800], [1920, 1080]]) {
    const ctx = await fresh({ viewport: { width: w, height: h } });
    const page = await open(ctx);
    await page.evaluate(function () { switchSection("newRecordSection"); });
    await page.waitForTimeout(400);
    await page.focus("#agencyNumber");
    await page.waitForTimeout(900);
    const m = await page.evaluate(function () {
        const box = function (sel) { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; };
        const dock = box("#recordDock");
        const limit = Math.min(innerHeight, dock.top);
        const parts = { number: box("#agencyNumber"), add: box("#addAgencyBtn"), transport: box('[data-qi-item="transportCount"]'), status: box("#agencyStatus") && box(".agency-main"), items: box("#agencyItems") };
        return { limit: limit, parts: parts, visible: ["number", "add", "transport"].every(function (k) { return parts[k].top >= 0 && parts[k].bottom <= limit; }) && parts.items.bottom <= limit };
    });
    check("U02", "بطاقة الوكالة كاملة فوق شريط الحفظ " + w + "×" + h, m.visible, JSON.stringify({ limit: Math.round(m.limit), add: Math.round(m.parts.add.bottom), items: Math.round(m.parts.items.bottom) }));
    await ctx.close();
}
{
    const ctx = await fresh({ viewport: { width: 390, height: 844 } });
    const page = await open(ctx);
    await page.focus("body");
    let leaked = "";
    for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(function () { const s = document.getElementById("sidebar"); return s.contains(document.activeElement) ? (document.activeElement.textContent || "").trim().slice(0, 15) : ""; });
        if (info) { leaked = info; break; }
    }
    check("U03", "القائمة المغلقة على الجوال خارج ترتيب Tab", leaked === "", leaked);
    await page.click("#menuToggle");
    await page.waitForTimeout(300);
    const openFocus = await page.evaluate(function () { return document.getElementById("sidebar").contains(document.activeElement); });
    check("U03", "فتح القائمة ينقل التركيز إليها", openFocus);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const back = await page.evaluate(function () { return document.activeElement && document.activeElement.id; });
    check("U03", "Escape يغلقها ويعيد التركيز إلى زر القائمة", back === "menuToggle", back);
    await ctx.close();
    const ctx2 = await fresh({ viewport: { width: 1400, height: 900 } });
    const p2 = await open(ctx2);
    const desk = await p2.evaluate(function () { return !document.getElementById("sidebar").inert; });
    check("U03", "على الكمبيوتر القائمة الدائمة غير معطلة", desk);
    await ctx2.close();
}

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
