/* قياس الأداء ببيانات تجريبية كبيرة (~4000 وكالة) — لا يلمس بيانات حقيقية.
   التشغيل: node tests/perf.mjs */
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
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, function (r) { r.abort(); });
await ctx.addInitScript(function () {
    if (sessionStorage.getItem("perf_seeded")) return;
    localStorage.setItem("currentUser", JSON.stringify({ id: "admin-user", username: "admin", role: "manager" }));
    sessionStorage.setItem("perf_seeded", "1");
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", function (e) { errors.push(e.message); });
page.on("download", function () {});
await page.goto(BASE);
await page.waitForFunction(function () { return typeof switchSection === "function" && Array.isArray(records); });
await page.waitForTimeout(800);

/* 40 سجلاً × 100 وكالة بالحساب الحقيقي (buildAgency) */
await page.evaluate(function () {
    const types = ["general", "special", "special", "special", "legal"];
    const list = [];
    for (let r = 0; r < 40; r++) {
        const day = "2026-0" + (3 + (r % 7)) + "-1" + (r % 9);
        const agencies = [];
        for (let i = 1; i <= 100; i++) {
            const type = types[i % types.length];
            const inputs = { number: String(i), type: type, status: i % 50 === 0 ? "cancelled" : "active", duplicate: false, pricePeriod: "",
                notes: i % 7 === 0 ? "لا يوجد رقم إيصال حد أدنى أتعاب" : "",
                additions: { save: i % 9 === 0 ? 1 : 0, signature: i % 2, inheritance: 0, children: i % 13 === 0 ? 1 : 0, agents: 0, originality: i % 5 === 0 ? 1 : 0, transport: i % 6 === 0 ? 1 : 0 },
                missing: { pleading: 2, ambulance: i % 40 === 0 ? 1 : 0, aid: 0, receipt: 0 } };
            agencies.push(buildAgency(inputs, getPricingForType(type, day)));
        }
        list.push({ id: "perf" + r, recordNumber: String(100 + r), officeName: "مكتب " + (r % 6), representativeName: "مندوب " + (r % 9),
            representativeType: r % 3 ? "internal" : "external", recordDate: day, agencies: agencies, createdAt: day + "T08:00:00Z", updatedAt: day + "T08:00:00Z" });
    }
    records = list;
    return persistRecords();
});
console.log("records size (chars):", await page.evaluate(function () { return JSON.stringify(records).length; }));

async function time(name, fn, runs) {
    const ms = await page.evaluate(function (args) {
        const f = new Function("return (" + args.fn + ")")()();
        const out = [];
        for (let i = 0; i < args.runs; i++) {
            const t = performance.now();
            f();
            out.push(Math.round(performance.now() - t));
        }
        return out;
    }, { fn: fn.toString(), runs: runs || 3 });
    console.log(name.padEnd(36), ms.join(" / "), "ms");
}

await time("renderReports (hidden: skipped)", function () { return function () { renderReports(); }; });
await time("open reports page", function () { return function () { switchSection("reportsSection"); }; });
const t0 = Date.now();
await page.evaluate(function () { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); }); });
const paint = Date.now() - t0;
console.log("first paint after open".padEnd(36), paint, "ms");
const rows = await page.evaluate(function () { return document.querySelectorAll("#filteredAgenciesCard tbody tr").length; });
console.log("rows in agencies table".padEnd(36), rows);

/* مزامنة بخادم وهمي: أول مزامنة ثم فحوص دورية بلا تغيير */
const syncTimes = await page.evaluate(function () {
    window.__FB_TEST_BACKEND = {
        onUser: function (cb) { cb({ email: "t@example.com" }); },
        pullRecords: function () { return Promise.resolve([]); },
        getSettings: function () { return Promise.resolve(null); },
        pushRecords: function () { return Promise.resolve(); },
        pushSettings: function () { return Promise.resolve(); }
    };
    fbBackend = window.__FB_TEST_BACKEND;
    fbUser = { email: "t@example.com" };
    fbState.firstSyncDone = true; fbState.uid = FB_WORKSPACE; fbState.base = {};
    const out = [];
    let p = Promise.resolve();
    for (let i = 0; i < 3; i++) {
        p = p.then(function () {
            const t = performance.now();
            return fbSync("poll").then(function () { out.push(Math.round(performance.now() - t)); });
        });
    }
    return p.then(function () { return out; });
});
console.log("fbSync (first, then idle polls)".padEnd(36), syncTimes.join(" / "), "ms");

let failed = 0;
if (rows > 200) { console.log("FAIL agencies table shows more than 200 rows"); failed++; }
if (paint > 3000) { console.log("FAIL reports page too slow"); failed++; }
if (syncTimes[2] > syncTimes[0]) { console.log("FAIL idle sync not cheaper than first sync"); failed++; }
console.log(errors.length ? "JS errors: " + errors.join(" | ") : "no JS errors");
await browser.close();
server.close();
if (errors.length) failed++;
console.log(failed ? "FAILED" : "كل الفحوص نجحت");
process.exit(failed ? 1 : 0);
