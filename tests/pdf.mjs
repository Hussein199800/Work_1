/* فحص ترقيم صفحات PDF المباشر (27/11/2026) ببيانات تجريبية معزولة، بلا إنترنت:
   لا صفحة فارغة، لا صفحة أطول من A4، كل صف جدول يظهر مرة واحدة كاملاً، رأس الجدول
   يتكرر عند تقسيمه، لا عنوان وحيد أسفل الصفحة، والبيان وحده في الصفحة الأولى.
   على شاشة موبايل وسطح مكتب، بنقص وبلا نقص، مختصر ومفصل، صغير وثقيل.
   التشغيل: node tests/pdf.mjs */
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
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
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
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const ctx = await browser.newContext({ viewport });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
    await ctx.addInitScript(function () {
        localStorage.setItem("audit_records", "[]");
        localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", function (e) { errors.push(e.message); });
    await page.goto(BASE);
    await page.waitForFunction(function () { return typeof paginateForPDF === "function" && Array.isArray(records); });
    await page.waitForTimeout(800);

    const results = await page.evaluate(async function () {
        let seed = 11;
        const rnd = function (n) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
        const NOTES = ["لا يوجد رقم إيصال حد أدنى أتعاب", "توقيع الموكل غير واضح", "نقص صورة الهوية"];
        const mk = function (id, n, missing, notes, ext) {
            const ags = [];
            for (let i = 1; i <= n; i++) {
                const type = ["general", "general", "special", "legal", "certified_general_special"][rnd(5)];
                ags.push(buildAgency({ number: String(i), type: type, status: rnd(15) === 0 ? "cancelled" : "active", duplicate: false, pricePeriod: "", customPrice: 0,
                    notes: notes && rnd(3) === 0 ? NOTES[rnd(3)] : "",
                    additions: { save: rnd(3), signature: rnd(2), inheritance: rnd(2), children: rnd(2), agents: rnd(2), originality: rnd(2), transport: ext && isTransportEligible(type) ? 1 : 0 },
                    missing: missing ? { pleading: rnd(3), ambulance: rnd(2), aid: rnd(2), receipt: rnd(2) } : { pleading: 0, ambulance: 0, aid: 0, receipt: 0 } },
                    pricingForAgency(type, "")));
            }
            return { id: id, recordNumber: String(100 + n), officeName: "مكتب تجريبي", representativeName: "مندوب تجريبي", representativeType: ext ? "external" : "internal",
                recordDate: "2026-11-20", createdAt: "2026-11-20T08:00:00Z", agencies: ags, recordNote: "ملاحظة عامة" };
        };
        records = [mk("heavyClean", 200, false, true, true), mk("heavyShort", 200, true, true, false), mk("mid", 60, true, true, true),
            mk("smallClean", 5, false, false, false), mk("smallShort", 6, true, false, false)];

        const frame = await makePdfFrame();
        const doc = frame.contentDocument;
        const st = doc.createElement("style");
        st.textContent = pdfCaptureCSS();
        doc.head.appendChild(st);
        await (doc.fonts ? doc.fonts.ready : null);

        const out = [];
        const run = function (name, html, landscape, statement) {
            const parts = preparePdfSources(doc, html, landscape);
            const srcRows = parts.reduce(function (n, part) { return n + part.src.querySelectorAll("tbody tr").length; }, 0);
            const items = paginatePdfSources(parts);
            const pages = items.map(function (it) { return it.page; });
            const problems = [];
            let rows = 0;
            pages.forEach(function (p, i) {
                const size = items[i].size;
                const pageH = Math.floor(size.mmH * size.w / size.mmW);
                const h = p.getBoundingClientRect().height;
                if (h > pageH + 1) problems.push("صفحة " + (i + 1) + " أطول من A4 (" + Math.round(h) + " > " + pageH + ")");
                if (!p.textContent.trim()) problems.push("صفحة " + (i + 1) + " فارغة");
                p.querySelectorAll("table").forEach(function (t) {
                    rows += t.querySelectorAll("tbody tr").length;
                    if (t.tBodies.length && !t.querySelector("tbody tr") && !t.tFoot) problems.push("صفحة " + (i + 1) + ": جدول بلا صفوف");
                });
                /* جدول مستمر من الصفحة السابقة يبدأ برأسه */
                p.querySelectorAll("table").forEach(function (t) {
                    if (t.querySelector("tbody tr") && !t.tHead && t.closest(".doc") && t.classList.contains("detail-table")) problems.push("صفحة " + (i + 1) + ": جدول بلا رأس");
                });
                /* آخر عنصر في الصفحة ليس عنواناً وحيداً */
                let last = p;
                while (last.lastElementChild) last = last.lastElementChild;
                const heading = last.closest("h3, h4");
                if (i < pages.length - 1 && heading && heading === p.querySelector("h3:last-of-type, h4:last-of-type") && !heading.nextElementSibling) {
                    problems.push("صفحة " + (i + 1) + " تنتهي بعنوان وحيد");
                }
            });
            if (rows !== srcRows) problems.push("صفوف الجداول " + rows + " بدل " + srcRows);
            if (statement) {
                const first = pages[0];
                if (!first.querySelector(".doc-statement") || first.querySelector(".doc-meta")) problems.push("البيان ليس وحده في الصفحة الأولى");
                if (pages[1] && pages[1].querySelector(".doc-statement")) problems.push("البيان ممتد إلى صفحة ثانية");
                if (items[0].landscape) problems.push("البيان ليس عمودياً");
                if (landscape && items[1] && !items[1].landscape) problems.push("التقرير المفصل ليس أفقياً بعد البيان");
            }
            out.push({ name: name, pages: pages.length, problems: problems });
            pages.forEach(function (p) { p.remove(); });
        };
        records.forEach(function (r) {
            run(r.id + " مختصر", buildFinalRecordReport(r, "summary", true), false, true);
            run(r.id + " مفصل", buildFinalRecordReport(r, "detailed", true), true, true);
        });
        try { run("التقرير العام", buildGeneralReportDoc(), false, false); } catch (e) { out.push({ name: "التقرير العام", pages: 0, problems: [String(e)] }); }
        frame.remove();
        return out;
    });

    const tag = viewport.width < 600 ? "موبايل" : "سطح مكتب";
    results.forEach(function (r) {
        check(tag + " — " + r.name + " (" + r.pages + " صفحات)", r.problems.length === 0, r.problems.join("؛ "));
    });
    /* سجل صغير بلا نقص: البيان + صفحتان على الأكثر */
    const small = results.find(function (r) { return r.name === "smallClean مختصر"; });
    check(tag + " — سجل صغير لا يزيد عن 3 صفحات", small && small.pages <= 3, small && small.pages);
    check(tag + " — بلا أخطاء صفحة", errors.length === 0, errors.join(" | "));
    await ctx.close();
}
await browser.close();
server.close();
console.log(failed ? failed + " فشل" : "كل فحوص PDF نجحت");
process.exit(failed ? 1 : 0);
