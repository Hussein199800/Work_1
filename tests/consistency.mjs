/* فحص اتساق الأرقام بين كل التقارير ببيانات عشوائية تجريبية (لا بيانات حقيقية):
   ملغاة ومفقودة، وكالات بالشكل القديم، بدل انتقال، إيصالات، أسعار فترات وسعر محدد.
   كل إجمالي في كل جدول يجب أن يساوي مصدره. التشغيل: node tests/consistency.mjs */
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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
await ctx.addInitScript(function () {
    if (localStorage.getItem("cons_seeded")) return;
    localStorage.setItem("cons_seeded", "1");
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(1000);

const problems = await page.evaluate(function () {

    /* مولّد عشوائي ثابت حتى تتكرر النتيجة */
    let seed = 20261116;
    const rnd = function (n) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    const types = Object.keys(AGENCY_NAMES);
    const statuses = ["active", "active", "active", "active", "cancelled", "missing"];
    const days = ["2026-03-03", "2026-04-10", "2026-06-20", "2026-09-17", "2026-10-05"];

    const list = [];
    for (let r = 0; r < 12; r++) {
        const day = days[r % days.length];
        const external = r % 3 === 0;
        const agencies = [];
        for (let i = 1; i <= 30; i++) {
            const type = types[rnd(types.length)];
            const inputs = {
                number: String(i), type: type, status: statuses[rnd(statuses.length)], duplicate: false,
                pricePeriod: rnd(5) === 0 ? "base" : "",
                customPrice: rnd(9) === 0 ? 2000 + rnd(5) * 100 : 0,
                notes: rnd(4) === 0 ? "ملاحظة " + rnd(3) : "",
                additions: { save: rnd(3), signature: rnd(2), inheritance: rnd(2), children: rnd(2), agents: rnd(2), originality: rnd(2),
                    transport: external && isTransportEligible(type) ? 1 : 0 },
                missing: { pleading: rnd(3), ambulance: rnd(2), aid: rnd(2), receipt: rnd(2) }
            };
            agencies.push(buildAgency(inputs, pricingForAgency(type, inputs.pricePeriod)));
        }
        /* وكالة بالشكل القديم */
        agencies.push({ id: "old" + r, number: "99", type: "special", status: "active", basePrice: 1700, representativeBase: 300, representativeAmount: 400,
            missingStamps: { pleading: 1, ambulance: 0, aid: 0 }, missingStampsValue: 100 });
        list.push({ id: "c" + r, recordNumber: String(500 + r), officeName: "مكتب " + (r % 4), representativeName: "مندوب " + (r % 5) + (r % 2 ? " " : ""),
            representativeType: external ? "external" : "internal", recordDate: day, agencies: agencies, createdAt: day + "T08:00:00Z" });
    }
    records = list;

    const out = [];
    const near = function (a, b) { return Math.abs(number(a) - number(b)) < 0.5; };
    const expect = function (label, a, b) { if (!near(a, b)) out.push(label + ": " + a + " ≠ " + b); };

    let allRep = 0, allGrand = 0, allMissing = 0, allBase = 0;

    records.forEach(function (record) {
        const tag = "سجل " + record.recordNumber;
        const stats = getRecordFinalStats(record);
        const active = stats.active;

        /* سعر الوكالات */
        const base = active.reduce(function (s, a) { return s + number(a.basePrice); }, 0);
        const typeSum = Object.keys(stats.byType).reduce(function (s, t) { return s + stats.byType[t].total; }, 0);
        expect(tag + " جدول الأنواع = سعر الوكالات", typeSum, base);
        const typeCount = Object.keys(stats.byType).reduce(function (s, t) { return s + stats.byType[t].count; }, 0);
        expect(tag + " عدد الأنواع = غير الملغاة", typeCount, active.length);

        /* الطوابع الناقصة: صفوف الجدول = الإجمالي المحفوظ */
        const rows = MISSING_KEYS.reduce(function (s, k) { return s + missingStampTypeValue(stats.agencies, k); }, 0);
        expect(tag + " صفوف الطوابع الناقصة = قيمتها", rows, stats.missingValue);
        const g = recoveryGroups(stats);
        expect(tag + " بيان الاستدراك = قيمة النقص", g.central.value + g.branch.value, stats.missingValue);

        /* المطلوب من المندوب = حصة الفرع + الإضافات النقدية + النقص (وكالات جديدة) */
        active.forEach(function (a) {
            if (!a.stamps) return;
            expect(tag + " وكالة " + a.number + " المطلوب", a.representativeAmount, number(a.representativeBase) + number(a.additionsTotal) + number(a.missingStampsValue));
        });
        expect(tag + " المطلوب = مجموع الوكالات", stats.representativeTotal, active.reduce(function (s, a) { return s + number(a.representativeAmount); }, 0));

        /* الإجمالي: المختصر = المفصل = مجموع الوكالات */
        const grand = active.reduce(function (s, a) { return s + getAgencyGrandTotal(a); }, 0);
        expect(tag + " إجمالي السجل", stats.grandTotal, grand);
        const parts = base + stats.additionsTotal + stats.stampAdditionsValue + stats.transport.total;
        expect(tag + " الإجمالي = السعر + الإضافات النقدية + طوابع الإضافات + البدل", stats.grandTotal, parts);

        /* بدل الانتقال: الكاملة = الطابع + حصة المندوب + المطلوب */
        const t = stats.transport;
        expect(tag + " البدل = طابعه + حصة المندوب + المطلوب منه", t.total, t.stampsValue + t.share + t.cash);
        if (record.representativeType !== "external") expect(tag + " لا بدل لمندوب داخلي", t.count, 0);

        /* اللجان: مجموع الأنواع = الإجمالي */
        const c = stats.committees;
        const cAmb = Object.keys(c.byType).reduce(function (s, k) { return s + c.byType[k].ambulance; }, 0);
        expect(tag + " حصة الإسعاف حسب النوع", cAmb, c.ambulance);
        expect(tag + " عدد وكالات اللجان", c.count, active.length);

        /* التقرير المفصل: سطر الإجمالي */
        const html = buildFinalRecordReport(record, "detailed");
        const foot = html.slice(html.indexOf("<tfoot>", html.indexOf("detail-table")));
        if (foot.indexOf(money(grand)) === -1) out.push(tag + " المفصل لا يعرض الإجمالي " + money(grand));

        allRep += stats.representativeTotal; allGrand += stats.grandTotal; allMissing += stats.missingValue; allBase += base;
    });

    /* التقرير العام = مجموع السجلات */
    const all = [];
    records.forEach(function (r) { r.agencies.forEach(function (a) { all.push(Object.assign({}, a, { recordDay: getRecordDay(r) })); }); });
    const gs = getRecordFinalStats({ agencies: all });
    expect("العام: المطلوب", gs.representativeTotal, allRep);
    expect("العام: الإجمالي", gs.grandTotal, allGrand);
    expect("العام: النقص", gs.missingValue, allMissing);

    /* لوحة التحكم */
    updateDashboard();
    const dash = number(document.getElementById("totalRepresentativeAmount").textContent.replace(/[^\d.,]/g, ""));
    expect("لوحة التحكم: المطلوب من المندوبين", dash, allRep);

    /* وكالة ملغاة قديمة بقي عليها مبلغ: لا تدخل في أي إجمالي (مثل التقارير) */
    records[0].agencies.push({ id: "oldc", number: "98", type: "special", status: "cancelled", basePrice: 1700, representativeBase: 300, representativeAmount: 300 });
    updateDashboard();
    expect("لوحة التحكم تتجاهل الملغاة القديمة", number(document.getElementById("totalRepresentativeAmount").textContent.replace(/[^\d.,]/g, "")), allRep);
    expect("التقرير يتجاهل الملغاة القديمة", getRecordFinalStats(records[0]).representativeTotal + allRep - getRecordFinalStats(records[0]).representativeTotal, allRep);
    expect("جدول السجلات يتجاهل الملغاة القديمة", getRecordRepresentativeTotal(records[0]), getRecordFinalStats(records[0]).representativeTotal);
    expect("سعر السجل يتجاهل الملغاة القديمة", getRecordBaseTotal(records[0]), getRecordFinalStats(records[0]).active.reduce(function (s, a) { return s + number(a.basePrice); }, 0));
    records[0].agencies.pop();

    /* صفحة التقارير (بلا تصفية) */
    switchSection("reportsSection");
    const rep = document.getElementById("reportsContent").textContent;
    if (rep.indexOf(money(allRep)) === -1) out.push("صفحة التقارير لا تعرض المطلوب " + money(allRep));

    /* المطلوب من كل مندوب: الأسماء بلا مسافات زائدة ولا تكرار */
    const names = Array.from(document.querySelectorAll("#reportsContent .report-card")).filter(function (c) { return /المطلوب من كل مندوب/.test(c.textContent); })
        .map(function (c) { return Array.from(c.querySelectorAll("tbody tr td:first-child")).map(function (td) { return td.textContent.trim(); }); })[0] || [];
    if (new Set(names).size !== names.length) out.push("مندوب مكرر في «المطلوب من كل مندوب»: " + names.join("، "));

    return out;
});

let failed = 0;
if (problems.length) {
    problems.slice(0, 40).forEach(function (p) { console.log("FAIL " + p); });
    console.log("… " + problems.length + " اختلاف");
    failed++;
} else {
    console.log("PASS كل الأرقام متسقة بين التقارير (12 سجلاً عشوائياً، 372 وكالة)");
}
if (errors.length) { console.log("FAIL أخطاء JavaScript: " + errors.join(" | ")); failed++; }
await browser.close();
server.close();
console.log(failed ? "FAILED" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
