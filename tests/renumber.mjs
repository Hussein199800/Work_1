/* فحوص 24/11/2026 ببيانات تجريبية معزولة: إعادة ترقيم الوكالات (تعبئة السلسلة)، رقم السجل ليس فريداً
   (التكرار = الرقم + المندوب + المكتب) في الحفظ والاستيراد والمطابقة، و«شرح النظام» داخل الإدارة.
   التشغيل: node tests/renumber.mjs */
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
    if (localStorage.getItem("rn_seeded")) return;
    localStorage.setItem("rn_seeded", "1");
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
    await page.waitForTimeout(300);
};

/* 1) سجل جديد فيه 8 وكالات 61..68 */
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
await ev(function () {
    pendingAgencies.length = 0;
    for (let n = 61; n <= 68; n++) pendingAgencies.push(buildAgency({ number: String(n), type: "special", status: "active", additions: {}, missing: {} }, getPricingForType("special", "2026-11-20")));
    renderPendingAgencies();
});
const nums = function () { return ev(function () { return pendingAgencies.map(function (a) { return a.number; }).join(","); }); };
const id66 = await ev(function () { return pendingAgencies[5].id; });

/* حذف 65 مع إعادة ترقيم ما بعدها */
await ev(function () { removePendingAgency(4); });
await dialogClick("حذف وإعادة ترقيم");
check("حذف 65 وإعادة الترقيم: 66 تصبح 65 وما قبلها لا يتغير", (await nums()) === "61,62,63,64,65,66,67", await nums());
check("الوكالة نفسها (نفس المعرّف والبيانات) أخذت الرقم الجديد", await ev(function (id) { return pendingAgencies.find(function (a) { return a.id === id; }).number === "65"; }, id66));
check("رقم الوكالة التالية صار 68", (await page.inputValue("#agencyNumber")) === "68", await page.inputValue("#agencyNumber"));
await ev(function () { undoRenumberAgencies(); });
check("تراجع عن الترقيم يعيد الأرقام (بدون 65)", (await nums()) === "61,62,63,64,66,67,68", await nums());

/* حذف فقط */
await ev(function () { removePendingAgency(0); });
await dialogClick("حذف فقط");
check("«حذف فقط» لا يغيّر الأرقام", (await nums()) === "62,63,64,66,67,68", await nums());

/* النافذة: تقترح أول فجوة (من 66 لتصبح 65) */
await page.click("#renumberAgenciesBtn");
await page.waitForSelector("dialog[open]");
const dlg = await ev(function () {
    const d = document.querySelector("dialog[open]");
    return { from: d.querySelector('[data-field="from"]').value, to: d.querySelector('[data-field="startAt"]').value, msg: d.querySelector(".app-dialog-message").textContent };
});
check("النافذة تقترح أول فجوة: من 66 لتصبح 65 مع معاينة", dlg.from === "66" && dlg.to === "65" && /3 وكالة/.test(dlg.msg), JSON.stringify(dlg));
await page.fill('dialog[open] [data-field="from"]', "62");
await page.fill('dialog[open] [data-field="startAt"]', "1");
await dialogClick("إعادة الترقيم");
check("تعبئة السلسلة من 62 لتبدأ من 1", (await nums()) === "1,2,3,4,5,6", await nums());
await ev(function () {
    pendingAgencies.push(buildAgency({ number: "12أ", type: "special", status: "active", additions: {}, missing: {} }, getPricingForType("special", "2026-11-20")));
    renderPendingAgencies();
    renumberPendingAgencies(3, 10);
});
check("الأرقام غير الصحيحة لا تتغير، والباقي متسلسل", (await nums()) === "1,2,10,11,12,13,12أ", await nums());

/* 2) رقم السجل ليس فريداً */
await ev(function () {
    pendingAgencies.length = 0; renderPendingAgencies();
    records = [{ id: "a1", recordNumber: "5", officeName: "الدانا", representativeName: "أحمد", recordDate: "2026-11-01", agencies: [] }];
    return persistRecords();
});
const keys = await ev(function () {
    return {
        diffRep: sameRecordIdentity({ recordNumber: "5", representativeName: "سامر", officeName: "الدانا" }, records[0]),
        diffOffice: sameRecordIdentity({ recordNumber: "5", representativeName: "أحمد", officeName: "سرمدا" }, records[0]),
        same: sameRecordIdentity({ recordNumber: "٥ ", representativeName: " أحمد", officeName: "الدانا" }, records[0])
    };
});
check("نفس الرقم لمندوب آخر أو مكتب آخر ليس تكراراً؛ نفس الثلاثة تكرار", !keys.diffRep && !keys.diffOffice && keys.same, JSON.stringify(keys));

const imp = await ev(function () {
    prepareRecoveredImport([["رقم السجل", "المندوب", "المكتب"], ["5", "سامر", "الدانا"], ["5", "أحمد", "الدانا"], ["5", "سامر", "الدانا"]], "t.csv");
    const st = recoveredImport.items.map(function (it) { return it.status; });
    closeRecordModal(true);
    return st.join(",");
});
check("الاستيراد: رقم 5 لمندوب آخر جديد، ولنفس المندوب مكرر", imp === "new,dup-own,dup-file", imp);

const match = await ev(function () {
    records = records.concat([
        { id: "a2", recordNumber: "8", officeName: "الدانا", representativeName: "أحمد", recordDate: "2026-11-02", agencies: [] },
        { id: "b1", recordNumber: "5", officeName: "الدانا", representativeName: "سامر", recordDate: "2026-11-02", agencies: [], source: { kind: "manual", name: "" } },
        { id: "b2", recordNumber: "6", officeName: "الدانا", representativeName: "سامر", recordDate: "2026-11-02", agencies: [], source: { kind: "manual", name: "" } }
    ]);
    const d = recordsMatchingData();
    return { dup: d.duplicates.length, missing: d.missing, seq: d.sequences.map(function (q) { return q.rep + ":" + q.gaps.map(function (g) { return g.join("-"); }).join("|"); }).join(" ") };
});
check("المطابقة: لا تكرار لنفس الرقم عند مندوبين، والناقص لكل مندوب (أحمد 6-7)", match.dup === 0 && match.missing === 2 && /أحمد:6-7/.test(match.seq) && /سامر:$/.test(match.seq), JSON.stringify(match));

/* حفظ سجل جديد بنفس الرقم لمندوب آخر: بلا سؤال */
await ev(function () { records = records.filter(function (r) { return r.id === "a1"; }); return persistRecords(); });
await ev(function () { switchSection("newRecordSection"); });
await page.waitForTimeout(300);
await page.fill("#recordNumber", "5");
await page.fill("#officeName", "الدانا");
await page.fill("#representativeName", "سامر");
await page.fill("#agencyNumber", "1");
await page.click("#addAgencyBtn");
await page.waitForTimeout(800);
await ev(function () { document.getElementById("recordForm").requestSubmit(); });
await page.waitForTimeout(800);
const askedTitle = await ev(function () { const d = document.querySelector("dialog[open] h3"); return d ? d.textContent : ""; });
check("حفظ السجل 5 لمندوب آخر لا يسأل عن التكرار", !/موجود مسبقاً/.test(askedTitle), askedTitle);
if (askedTitle) await confirmDialogs();
await page.waitForTimeout(800);
check("حُفظ السجلان برقم 5", await ev(function () { return records.filter(function (r) { return String(r.recordNumber) === "5"; }).length === 2; }));

/* 3) شرح النظام داخل الإدارة */
const guide = await ev(function () {
    switchSection("adminSection");
    const tab = document.querySelector('#calculatorSection .admin-tab[data-section="guideSection"]');
    tab.click();
    return { active: document.querySelector(".section.active-section").id, nav: document.querySelector(".tab-btn.active").dataset.section, oldBtn: !!document.querySelector('.tab-btn[data-section="guideSection"]') };
});
check("«شرح النظام» تبويب فرعي في الإدارة (وزره القديم أُزيل)", guide.active === "guideSection" && guide.nav === "adminSection" && !guide.oldBtn, JSON.stringify(guide));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));
await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
