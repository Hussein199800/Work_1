/* فحوص السجلات المستردة (23/11/2026) ببيانات تجريبية معزولة: النموذج السريع، العرض والفلتر،
   عدم دخولها في أرقام التدقيق، استيراد CSV مع المعاينة، المطابقة (المكرر والناقص)، والتقرير المخصّص.
   التشغيل: node tests/recovered.mjs */
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
    if (localStorage.getItem("rv_seeded")) return;
    localStorage.setItem("rv_seeded", "1");
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

/* سجلات مدقّقة هنا: 100، 102، 104 */
const baseline = await ev(function () {
    records = [100, 102, 104].map(function (n, i) {
        const ags = [1, 2, 3].map(function (k) { return buildAgency({ number: String(k), type: "special", status: "active", additions: {}, missing: {} }, getPricingForType("special", "2026-09-17")); });
        return { id: "own" + i, recordNumber: String(n), officeName: "الدانا", representativeName: i % 2 ? "سامر" : "أحمد", recordDate: "2026-09-1" + i, agencies: ags, createdAt: "2026-09-10T08:00:00Z" };
    });
    return persistRecords().then(function () {
        updateDashboard();
        return { records: document.getElementById("totalRecords").textContent, due: document.getElementById("totalRepresentativeAmount").textContent };
    });
});

/* 1) النموذج السريع */
await ev(function () { switchSection("recordsSection"); });
await page.waitForTimeout(200);
check("زر «إضافة سجل مسترد» ظاهر مباشرة في شريط السجلات", await page.locator("#recoveredAddBtn").isVisible());
await page.click("#recoveredAddBtn");
await page.waitForTimeout(300);
await page.click(".recovered-form .primary-btn");
await page.waitForTimeout(200);
check("النموذج يطلب رقم السجل والمندوب والمكتب", await ev(function () { return records.length === 3; }));
await page.locator('input[name="rvKind"][value="manual"]').check();
await page.fill("#rvSourceName", "أ. محمد (يدوي)");
await page.fill("#rvNumber", "101");
await page.fill("#rvRep", "أحمد");
await page.fill("#rvOffice", "الدانا");
await page.fill("#rvAgencies", "20");
await page.fill("#rvAmount", "6000");
await page.click(".recovered-form .primary-btn");
await page.waitForTimeout(600);
const r101 = await ev(function () { return records.find(function (r) { return r.recordNumber === "101"; }); });
check("حفظ سجل مسترد يدوي بملخصه", r101 && r101.source.kind === "manual" && r101.source.name === "أ. محمد (يدوي)" && r101.summary.agencyCount === 20 && r101.summary.amountDue === 6000 && r101.agencies.length === 0, JSON.stringify(r101 && { s: r101.source, m: r101.summary }));
/* رقم موجود: يسأل */
await ev(function () { openRecoveredForm(); });
await page.waitForTimeout(300);
await page.fill("#rvNumber", "102");
await page.fill("#rvRep", "سامر");
await page.fill("#rvOffice", "الدانا");
await page.click(".recovered-form .primary-btn");
await page.waitForTimeout(300);
check("رقم مدقّق هنا: سؤال قبل الحفظ", (await page.locator("dialog[open]").count()) === 1);
await page.locator("dialog[open] button", { hasText: "إلغاء" }).click();
await page.waitForTimeout(200);
await ev(function () { closeRecordModal(true); });

/* 2) العرض والفلتر وعدم الدخول في الأرقام */
await ev(function () { renderRecords(); });
const row = await ev(function () { const tr = Array.from(document.querySelectorAll("#recordsTableBody tr")).find(function (t) { return /101/.test(t.textContent); }); return tr ? { cls: tr.className, text: tr.textContent } : null; });
check("الجدول: شارة «مسترد» وصف مميز", row && /is-recovered/.test(row.cls) && /مسترد/.test(row.text) && /تدقيق يدوي/.test(row.text), JSON.stringify(row));
await ev(function () { document.getElementById("rfMore").open = true; });
await page.selectOption("#rfSource", "own");
await page.waitForTimeout(150);
const ownOnly = await ev(function () { return getVisibleRecords().map(function (r) { return r.recordNumber; }).join(","); });
await page.selectOption("#rfSource", "recovered");
await page.waitForTimeout(150);
const recOnly = await ev(function () { return getVisibleRecords().map(function (r) { return r.recordNumber; }).join(","); });
await page.selectOption("#rfSource", "all");
check("فلتر المصدر: تدقيقنا / المستردة", ownOnly.split(",").length === 3 && ownOnly.indexOf("101") === -1 && recOnly === "101", ownOnly + " | " + recOnly);
const after = await ev(function () { updateDashboard(); return { records: document.getElementById("totalRecords").textContent, due: document.getElementById("totalRepresentativeAmount").textContent, note: document.getElementById("dashDueNote").textContent }; });
check("لوحة التحكم لا تعدّ المستردة ولا مبلغها", after.records === baseline.records && after.due === baseline.due && /مسترد/.test(after.note), JSON.stringify(after));
const opened = await ev(function () { const r = records.find(function (x) { return x.recordNumber === "101"; }); showFinalRecordReport(r.id, "summary"); return document.getElementById("modalContent").textContent; });
check("فتح «التقرير» لسجل مسترد يعرض ملخصه", /سجل مسترد/.test(opened) && /أ. محمد/.test(opened));
await ev(function () { closeRecordModal(true); const r = records.find(function (x) { return x.recordNumber === "101"; }); editRecord(r.id); });
await page.waitForTimeout(300);
check("«تعديل» سجل مسترد يفتح نموذجه السريع", await ev(function () { return !!document.querySelector(".recovered-form") && document.getElementById("rvNumber").value === "101"; }));
await ev(function () { closeRecordModal(true); });

/* 3) الاستيراد */
const csv = "﻿رقم السجل,المندوب,المنطقة,التاريخ,عدد الوكالات,المبلغ,المصدر,اسم المصدر\n103,سامر,إدلب,17/09/2026,12,3000,,الموقع القديم\n104,أحمد,الدانا,2026-09-12,,,,\n106,سامر,إدلب,,,,تدقيق يدوي,\n106,سامر,إدلب,,,,,\n,بلا رقم,إدلب,,,,,\n";
await ev(function (t) { prepareRecoveredImport(parseCSVText(t), "t.csv"); }, csv);
await page.waitForTimeout(300);
const statuses = await ev(function () { return recoveredImport.items.map(function (it) { return it.status; }).join(","); });
check("المعاينة: جديد، مدقّق هنا، جديد، مكرر في الملف، ناقص", statuses === "new,dup-own,new,dup-file,invalid", statuses);
await page.click("#riImportBtn");
await page.waitForTimeout(700);
const imp = await ev(function () {
    const r103 = records.find(function (r) { return r.recordNumber === "103"; });
    const r106 = records.find(function (r) { return r.recordNumber === "106"; });
    return { n: records.filter(isRecoveredRecord).length, d103: r103 && getRecordDay(r103), s103: r103 && r103.source, k106: r106 && r106.source.kind, dupOwn: records.filter(function (r) { return r.recordNumber === "104"; }).length };
});
check("استيراد السطرين الجديدين فقط (التاريخ والمصدر صحيحان)", imp.n === 3 && imp.d103 === "2026-09-17" && imp.s103.kind === "site" && imp.s103.name === "الموقع القديم" && imp.k106 === "manual" && imp.dupOwn === 1, JSON.stringify(imp));
/* المكرر مع الموجود عند اختياره */
await ev(function (t) { prepareRecoveredImport(parseCSVText(t), "t2.csv"); recoveredImport.includeDup = true; return applyRecoveredImport(); }, "رقم السجل,المندوب,المكتب\n104,أحمد,الدانا\n");
await page.waitForTimeout(600);
check("«استيراد المكرر أيضاً» يضيفه للمطابقة", await ev(function () { return records.filter(function (r) { return r.recordNumber === "104"; }).length === 2; }));
/* ملف بلا الأعمدة المطلوبة */
await ev(function () { prepareRecoveredImport([["الاسم", "القيمة"], ["أ", "1"]], "bad.csv"); });
await page.waitForTimeout(200);
check("ملف بلا أعمدة مطلوبة: رسالة واضحة", /لم أجد الأعمدة المطلوبة/.test(await ev(function () { return document.getElementById("appToast").textContent; })));

/* 4) المطابقة */
const match = await ev(function () { const d = recordsMatchingData(); return { own: d.own.length, site: d.site.length, manual: d.manual.length, dups: d.duplicates.map(function (x) { return x.number; }).join(","), gaps: JSON.stringify(d.gaps), missing: d.missing }; });
check("المطابقة: الأعداد حسب المصدر", match.own === 3 && match.site === 2 && match.manual === 2, JSON.stringify(match));
check("المطابقة: المكرر 104 (نفس الرقم والمندوب والمكتب)", match.dups === "104", JSON.stringify(match));
/* 24/11/2026: الناقص يُحسب لكل مندوب ومكتب؛ كل رقم ناقص غائب فعلاً عن سجلات ذلك المندوب في ذلك المكتب، وكل رقم بين طرفيه إما موجود أو ناقص */
const seqOk = await ev(function () {
    const d = recordsMatchingData();
    return d.sequences.every(function (q) {
        const have = new Set(records.filter(function (r) { return identityPart(r.representativeName) === identityPart(q.rep) && identityPart(r.officeName) === identityPart(q.office); })
            .map(function (r) { return Number(identityPart(r.recordNumber)); }));
        const miss = new Set();
        q.gaps.forEach(function (g) { for (let n = g[0]; n <= g[1]; n++) miss.add(n); });
        for (let n = q.range[0]; n <= q.range[1]; n++) if (have.has(n) === miss.has(n)) return false;
        return miss.size === q.missing;
    }) && d.missing === d.sequences.reduce(function (s, q) { return s + q.missing; }, 0);
});
check("المطابقة: الأرقام الناقصة صحيحة لكل مندوب ومكتب", seqOk);
const doc = await ev(function () { return buildRecordsMatchingDoc(); });
check("مستند المطابقة قابل للطباعة", /مطابقة سجلات الفرع/.test(doc) && /105/.test(doc));

/* 5) التقرير المخصّص: عمود المصدر وملخص المسترد */
const cr = await ev(function () {
    selectedRecordIds.clear();
    crRecordIds = records.map(function (r) { return r.id; });
    const data = crBuildRows(crNormalize({ level: "record", columns: ["recordNumber", "source", "agencies", "net"], sort: "record" }));
    const row = data.rows.find(function (x) { return x.cells[0] === "101"; });
    return row ? row.cells : null;
});
check("التقرير المخصّص: المصدر وعدد الوكالات والمبلغ من الملخص", cr && /تدقيق يدوي/.test(cr[1]) && cr[2] === 20 && cr[3] === 6000, JSON.stringify(cr));

/* 6) النسخة الاحتياطية تقبل السجلات المستردة */
check("النسخة الاحتياطية بالسجلات المستردة صالحة للاستعادة", await ev(function () { return backupDataProblem(JSON.parse(buildBackupJSON())) === ""; }));

/* 24/11/2026: المستردة لا تدخل في قوائم وأعداد التدقيق */
const leak = await ev(function () {
    const recRep = records.filter(isRecoveredRecord).map(function (r) { return String(r.representativeName).trim(); })
        .find(function (n) { return !records.some(function (r) { return !isRecoveredRecord(r) && String(r.representativeName).trim() === n; }); });
    updateDashboard();
    switchSection("committeesSection");
    const committeeOpts = Array.from(document.querySelectorAll("#committeeRep option")).map(function (o) { return o.value; });
    const recordOpts = Array.from(document.querySelectorAll("#committeeRecord option")).map(function (o) { return o.value; });
    const general = buildGeneralReportDoc();
    return {
        recRep: recRep || "",
        dash: recRep ? document.getElementById("dashReps").textContent.indexOf(recRep) === -1 : true,
        latest: !records.filter(isRecoveredRecord).some(function (r) { return document.getElementById("latestRecords").innerHTML.indexOf(">" + r.recordNumber + "<") !== -1 && !records.some(function (o) { return !isRecoveredRecord(o) && o.recordNumber === r.recordNumber; }); }),
        committeeRep: recRep ? committeeOpts.indexOf(recRep) === -1 : true,
        committeeRecord: !records.filter(isRecoveredRecord).some(function (r) { return recordOpts.indexOf(r.id) !== -1; }),
        general: general.indexOf("— " + auditedRecords().length + " سجل") !== -1
    };
});
check("المستردة خارج «أعلى المندوبين» و«آخر السجلات» وفلاتر حصص اللجان وعدد التقرير العام",
    leak.dash && leak.latest && leak.committeeRep && leak.committeeRecord && leak.general, JSON.stringify(leak));

check("لا أخطاء JavaScript", errors.length === 0, errors.join(" | "));

await browser.close();
server.close();
console.log(failed ? failed + " فحص فشل" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
