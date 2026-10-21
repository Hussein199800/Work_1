"use strict";

/* =========================================================
إعدادات النظام
========================================================= */

const DEFAULT_PRICES = {

general: {
    agency: 1700,
    representative: 300
},

special: {
    agency: 1700,
    representative: 300
},

legal: {
    agency: 1350,
    representative: 300
},

executive: {
    agency: 900,
    representative: 300
},

certified_general_special: {
    agency: 1550,
    representative: 300
},

certified_legal: {
    agency: 1200,
    representative: 300
}

};

/* =========================================================
أسماء الوكالات
========================================================= */

const AGENCY_NAMES = {

general:
    "وكالة عامة",

special:
    "وكالة خاصة",

legal:
    "وكالة شرعية",

executive:
    "وكالة تنفيذية",

certified_general_special:
    "صورة مصدقة عامة/خاصة",

certified_legal:
    "صورة مصدقة شرعية"

};

/* نوع الوكالة الافتراضي عند إضافة وكالة جديدة */
const DEFAULT_AGENCY_TYPE = "special";

/*
    أنواع الوكالات التي يُضاف إليها بدل الانتقال (المندوب الخارجي).
    لا يُضاف إلى الصور المصدقة (طبق الأصل) ولا إلى الوكالة التنفيذية.
*/
const TRANSPORT_AGENCY_TYPES = ["general", "special", "legal"];

function isTransportEligible(type) {
    return TRANSPORT_AGENCY_TYPES.indexOf(type) !== -1;
}

/* كل الأرقام والتواريخ بالأرقام الغربية (0-9) */
const NUMBER_LOCALE = "ar-SY-u-nu-latn";

/* =========================================================
الإضافات
========================================================= */

const ADDITION_NAMES = {

save:
    "حفظ",

signature:
    "توقيع إضافي",

inheritance:
    "إضافة إلى التركة",

children:
    "ولاية عن الأولاد",

agents:
    "وكيل عن",

originality:
    "أصالة وبأي صفة كانت",

transport:
    "بدل انتقال"

};

/* =========================================================
أسعار الإضافات الافتراضية
========================================================= */

const DEFAULT_ADDITION_PRICES = {

save: 100,

signature: 100,

inheritance: 100,

children: 100,

agents: 100,

originality: 100

};

/*
الإضافات التي كانت سابقاً بسعر 100
اعتبرت طابع مرافعة للمحافظة على
طريقة الحساب السابقة.
*/

const DEFAULT_ADDITION_STAMP_STATUS = {

save: true,

signature: true,

inheritance: true,

children: true,

agents: true,

originality: true

};

/* =========================================================
إعدادات بدل الانتقال
========================================================= */

/*
    قيمة بدل الانتقال الكاملة (total) تضاف إلى قيمة الوكالة
    (مثال: وكالة عامة 1700 + 200 = 1900 ل.س) وتتوزع كالتالي:
    - طابع مرافعة (إن كان مفعلاً) بسعر طابع المرافعة
    - حصة المندوب: لا تدخل في المطلوب منه
    - الباقي (cashRemainder) حصة الفرع: تدخل في المطلوب من المندوب
    cashRemainder يُحسب تلقائياً = total - حصة المندوب - قيمة الطابع.
*/

const DEFAULT_TRANSPORT_SETTINGS = {

total:
    200,

pleadingStamp:
    true,

representativeShare:
    50,

cashRemainder:
    50

};

/* =========================================================
حصص لجنتي الإسعاف والتعاون لكل نوع وكالة
========================================================= */

const DEFAULT_COMMITTEE_SHARES = {

general:                   { ambulance: 300, cooperation: 250 },
special:                   { ambulance: 300, cooperation: 250 },
certified_general_special: { ambulance: 300, cooperation: 250 },
legal:                     { ambulance: 300, cooperation: 75 },
certified_legal:           { ambulance: 300, cooperation: 75 },
executive:                 { ambulance: 300, cooperation: 0 }

};

/* =========================================================
أسعار الطوابع
========================================================= */

const DEFAULT_STAMP_PRICES = {

pleading:
    100,

ambulance:
    300,

aid:
    150

};

/* =========================================================
المستخدمون الافتراضيون
========================================================= */

const DEFAULT_USERS = [

{
    id: "admin-user",
    username: "admin",
    password: "1234",
    role: "manager"
},

{
    id: "auditor-user",
    username: "auditor",
    password: "1234",
    role: "auditor"
},

{
    id: "viewer-user",
    username: "viewer",
    password: "1234",
    role: "viewer"
}

];

/* =========================================================
عبارات الملاحظات السريعة (لا تؤثر على أي حساب مالي)
========================================================= */

const NOTE_NO_RECEIPT =
    "لا يوجد رقم إيصال حد أدنى أتعاب";

const NOTE_NO_BOND =
    "لا يوجد رقم سند أمني موحد (رقم ليزرية)";

/* =========================================================
التخزين
========================================================= */

function loadData(key, defaultValue) {

try {

    const data =
        localStorage.getItem(key);

    if (data === null) {

        return JSON.parse(
            JSON.stringify(defaultValue)
        );

    }

    return JSON.parse(data);

} catch (error) {

    console.error(
        "Storage Error:",
        error
    );

    return JSON.parse(
        JSON.stringify(defaultValue)
    );

}

}

function saveData(key, value) {

localStorage.setItem(
    key,
    JSON.stringify(value)
);

/* بيانات تدخل في النسخة الاحتياطية: تُعلَّم كتغيير لم يُنسخ بعد */
if ([
    "audit_users", "audit_prices", "audit_addition_prices", "audit_addition_stamp_status",
    "audit_transport_settings", "audit_stamp_prices", "audit_records", "audit_price_schedule",
    "audit_committee_shares", "audit_committee_rates", "audit_council_share", "audit_council_saved"
].indexOf(key) !== -1) {
    try { markDataChanged(); } catch (e) {}
    /* قبل تحميل قسم Firebase يرمي (منطقة TDZ) ويُتجاهل: حفظ الإعدادات عند فتح الصفحة ليس تعديلاً */
    try { fbNoteSettingsChange(key); } catch (e) {}
}

}

/* =========================================================
تحميل البيانات
========================================================= */

let users =
loadData(
"audit_users",
DEFAULT_USERS
);

let prices =
loadData(
"audit_prices",
DEFAULT_PRICES
);

let additionPrices =
loadData(
"audit_addition_prices",
DEFAULT_ADDITION_PRICES
);

let additionStampStatus =
loadData(
"audit_addition_stamp_status",
DEFAULT_ADDITION_STAMP_STATUS
);

let transportSettings =
loadData(
"audit_transport_settings",
DEFAULT_TRANSPORT_SETTINGS
);

let stampPrices =
loadData(
"audit_stamp_prices",
DEFAULT_STAMP_PRICES
);

/* =========================================================
مكان حفظ السجلات
مساحة localStorage في المتصفح محدودة (~5 ملايين حرف). عندما تكبر
السجلات تُنقل إلى IndexedDB (مخزن أكبر بكثير في نفس المتصفح).
- audit_records_store = "idb" يعني أن السجلات في IndexedDB.
- index.html يقرأها قبل تشغيل هذا الملف ويضعها في __AUDIT_IDB_RECORDS.
- إن تعذرت قراءتها لا نبدأ بسجلات فارغة ونحفظ فوقها: الحفظ يتوقف
  وتظهر رسالة، حمايةً للبيانات.
========================================================= */

const RECORDS_STORE_KEY = "audit_records_store";
const IDB_NAME = "audit_db";
const IDB_STORE = "kv";

/* الانتقال تلقائياً عندما تتجاوز السجلات هذا الحجم (نصف المساحة تقريباً) */
const RECORDS_MOVE_THRESHOLD = 2500000;

/* تشغيل بعد جاهزية الصفحة وبعد انتهاء تنفيذ هذا الملف كاملاً */
function onReady(fn) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn);
    } else {
        setTimeout(fn, 0);
    }
}

let recordsInIDB = false;

try {
    recordsInIDB = localStorage.getItem(RECORDS_STORE_KEY) === "idb";
} catch (e) {}

let recordsLoadFailed = false;

let records;

if (recordsInIDB) {
    if (window.__AUDIT_IDB_ERROR || !Array.isArray(window.__AUDIT_IDB_RECORDS)) {
        console.error("Records could not be read from IndexedDB:", window.__AUDIT_IDB_ERROR);
        records = [];
        recordsLoadFailed = true;
    } else {
        records = window.__AUDIT_IDB_RECORDS;
    }
} else {
    records = loadData(
        "audit_records",
        []
    );
}

function idbOpen() {
    return new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB غير متاح في هذا المتصفح"));
            return;
        }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(IDB_STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
    });
}

function idbPut(key, value) {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(IDB_STORE, "readwrite");
            tx.objectStore(IDB_STORE).put(value, key);
            tx.oncomplete = function () { db.close(); resolve(); };
            tx.onerror = function () { db.close(); reject(tx.error); };
            tx.onabort = function () { db.close(); reject(tx.error || new Error("IndexedDB abort")); };
        });
    });
}

function idbGet(key) {
    return idbOpen().then(function (db) {
        return new Promise(function (resolve, reject) {
            const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
            req.onsuccess = function () { db.close(); resolve(req.result); };
            req.onerror = function () { db.close(); reject(req.error); };
        });
    });
}

function isQuotaError(error) {
    return !!error && (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014);
}

/*
    نقل السجلات إلى IndexedDB مع التحقق:
    ١) كتابة السجلات ٢) قراءتها ومطابقتها حرفاً بحرف
    ٣) وضع علامة المكان ٤) عندها فقط تُحذف النسخة من localStorage.
*/
/* نقل واحد فقط في نفس الوقت؛ الحفظ ينتظر انتهاءه (لا تداخل بين عمليتين) */
let recordsMoving = null;

function moveRecordsToIDB() {

    if (recordsMoving) {
        return recordsMoving;
    }

    recordsMoving = moveRecordsToIDBNow().then(function (result) {
        recordsMoving = null;
        return result;
    }, function (error) {
        recordsMoving = null;
        throw error;
    });

    return recordsMoving;
}

function moveRecordsToIDBNow() {

    const snapshot = JSON.stringify(records);

    return idbPut("audit_records", JSON.parse(snapshot))
        .then(function () { return idbGet("audit_records"); })
        .then(function (saved) {

            if (!Array.isArray(saved) || JSON.stringify(saved) !== snapshot) {
                throw new Error("فشل التحقق من نسخ السجلات إلى المخزن الكبير، لم يُحذف شيء.");
            }

            try {
                localStorage.setItem(RECORDS_STORE_KEY, "idb");
            } catch (error) {
                /* لا مكان حتى لعلامة صغيرة: المسودة نسخة مؤقتة من بيانات موجودة في الصفحة */
                localStorage.removeItem("audit_record_draft");
                localStorage.setItem(RECORDS_STORE_KEY, "idb");
            }

            recordsInIDB = true;

            try {
                localStorage.removeItem("audit_records");
            } catch (e) {}
        });
}

/* حفظ السجلات أينما كانت. يُرجع Promise، والفشل يُعرض للمستخدم عند الاستدعاء */
/* كل حفظ ناجح للسجلات يُعلَّم «تغيّر بعد آخر نسخة احتياطية» */
function persistRecords() {
    return persistRecordsNow().then(function (value) {
        try { markDataChanged(); } catch (e) {}
        /* رفع التغيير إلى Firebase (إن كانت المزامنة مفعّلة على هذا الجهاز) */
        try { fbScheduleSync(); } catch (e) {}
        return value;
    });
}

function persistRecordsNow() {

    /* نقل جارٍ: ننتظره ثم نحفظ آخر نسخة من السجلات في مكانها الجديد */
    if (recordsMoving) {
        return recordsMoving.catch(function () {}).then(persistRecordsNow);
    }

    if (recordsLoadFailed) {
        return Promise.reject(new Error("تعذر قراءة السجلات من المخزن عند فتح الصفحة، لذلك أُوقف الحفظ حمايةً للبيانات. حدّث الصفحة (Ctrl + F5)."));
    }

    if (recordsInIDB) {
        return idbPut("audit_records", records);
    }

    try {
        saveData("audit_records", records);
        return Promise.resolve();
    } catch (error) {
        if (!isQuotaError(error) || !window.indexedDB) {
            return Promise.reject(error);
        }
        /* المساحة ممتلئة: ننقل السجلات إلى المخزن الكبير ونحفظ هناك */
        return moveRecordsToIDB().then(function () {
            /* إن كان نقلٌ استباقي قد بدأ قبل هذا الحفظ فلقطته لا تحوي السجل الجديد */
            return idbPut("audit_records", records);
        }).then(function () {
            notify("<strong>نُقلت السجلات إلى مخزن أكبر</strong><span>امتلأت مساحة المتصفح، فنُقلت كل السجلات إلى مخزن أكبر في نفس المتصفح وحُفظ السجل.</span>", "info", 8000, true);
        });
    }
}

/*
    نقل استباقي: إذا كبرت السجلات في localStorage تُنقل قبل أن تمتلئ
    المساحة، بعد تنزيل نسخة احتياطية تلقائياً.
*/
let recordsMoveChecked = false;

function maybeMoveRecordsStore() {

    if (recordsMoveChecked || recordsInIDB || recordsLoadFailed || !window.indexedDB || !currentUser) {
        return;
    }

    recordsMoveChecked = true;

    let size = 0;
    try {
        size = (localStorage.getItem("audit_records") || "").length;
    } catch (e) {}

    if (size < RECORDS_MOVE_THRESHOLD) {
        return;
    }

    try {
        downloadBackup();
    } catch (e) {
        console.error("Backup before move failed:", e);
    }

    moveRecordsToIDB().then(function () {
        notify("<strong>نُقلت السجلات إلى مخزن أكبر</strong><span>كانت مساحة المتصفح تقارب الامتلاء، فنُقلت كل السجلات (" + records.length + " سجل) إلى مخزن أكبر بعد التحقق منها، ونُزّلت نسخة احتياطية احتياطاً.</span>", "success", 9000, true);
    }).catch(function (error) {
        console.error("Move records to IndexedDB failed:", error);
        notify("<strong>تعذر نقل السجلات إلى المخزن الأكبر</strong><span>" + escapeHTML(error && error.message || error) + " — السجلات لم تتغير.</span>", "warning", 10000, true);
    });
}

let committeeShares =
loadData(
"audit_committee_shares",
DEFAULT_COMMITTEE_SHARES
);

/* =========================================================
ترحيل السجلات القديمة:
إدخال المبلغ النقدي المتبقي من بدل الانتقال ضمن الإضافات النقدية
(كان يُضاف للمطلوب من المندوب لكنه لا يظهر في الإضافات).
المبلغ المطلوب من المندوب لا يتغير.
========================================================= */

(function migrateTransportCash() {

    let changed = false;

    records.forEach(function (record) {

        (record.agencies || []).forEach(function (agency) {

            if (agency.transportInAdditions) {
                return;
            }

            const count =
                number(agency.additions && agency.additions.transport);

            const cashPerUnit =
                number(
                    (agency.transportSettings && agency.transportSettings.cashRemainder) ||
                    (agency.appliedPrices && agency.appliedPrices.transport && agency.appliedPrices.transport.cashRemainder)
                );

            const cash = count * cashPerUnit;

            if (!agency.additionValues) {
                agency.additionValues = {};
            }

            agency.additionValues.transport = cash;

            agency.additionsTotal =
                number(agency.additionsTotal) + cash;

            agency.transportInAdditions = true;

            changed = true;

        });

    });

    if (changed) {
        persistRecords().catch(function (error) {
            console.error("Saving migrated records failed:", error);
        });
    }

})();

/* =========================================================
تحويل الأسعار القديمة إلى النظام الجديد
========================================================= */

Object.keys(
DEFAULT_PRICES
).forEach(
function (key) {

    /*
        إذا كانت الأسعار القديمة عبارة
        عن رقم فقط يتم تحويلها إلى الشكل الجديد.
    */

    if (
        typeof prices[key] === "number"
    ) {

        prices[key] = {

            agency:
                prices[key],

            representative:
                300

        };

    }


    if (
        !prices[key] ||
        typeof prices[key] !== "object"
    ) {

        prices[key] =
            JSON.parse(
                JSON.stringify(
                    DEFAULT_PRICES[key]
                )
            );

    }


    if (
        typeof prices[key].agency !==
        "number"
    ) {

        prices[key].agency =
            DEFAULT_PRICES[key].agency;

    }


    if (
        typeof prices[key].representative !==
        "number"
    ) {

        prices[key].representative =
            DEFAULT_PRICES[key].representative;

    }

}

);

/* =========================================================
ضمان وجود أسعار الإضافات
========================================================= */

Object.keys(
DEFAULT_ADDITION_PRICES
).forEach(
function (key) {

    if (
        typeof additionPrices[key] !==
        "number"
    ) {

        additionPrices[key] =
            DEFAULT_ADDITION_PRICES[key];

    }

}

);

/* =========================================================
ضمان حالة الإضافات
========================================================= */

Object.keys(
DEFAULT_ADDITION_STAMP_STATUS
).forEach(
function (key) {

    if (
        typeof additionStampStatus[key] !==
        "boolean"
    ) {

        /*
            إذا كان لدينا بيانات قديمة
            وسعر الإضافة 100 نعتبرها طابع مرافعة.
        */

        additionStampStatus[key] =
            number(
                additionPrices[key]
            ) === 100;

    }

}

);

/* =========================================================
ضمان إعدادات بدل الانتقال
========================================================= */

/*
    الإعدادات القديمة لا تحتوي على القيمة الكاملة لبدل الانتقال،
    نستنتجها من مكوناتها حتى لا يتغير أي مبلغ عما كان عليه.
*/

if (
    transportSettings &&
    typeof transportSettings.total !== "number" &&
    typeof transportSettings.cashRemainder === "number"
) {

    transportSettings.total =
        number(transportSettings.cashRemainder) +
        number(transportSettings.representativeShare) +
        (
            transportSettings.pleadingStamp
                ? number(stampPrices.pleading || DEFAULT_STAMP_PRICES.pleading)
                : 0
        );

}

Object.keys(
DEFAULT_TRANSPORT_SETTINGS
).forEach(
function (key) {

    if (
        typeof transportSettings[key] !==
        typeof DEFAULT_TRANSPORT_SETTINGS[key]
    ) {

        transportSettings[key] =
            DEFAULT_TRANSPORT_SETTINGS[key];

    }

}

);

/* =========================================================
ضمان أسعار الطوابع
========================================================= */

Object.keys(
DEFAULT_STAMP_PRICES
).forEach(
function (key) {

    if (
        typeof stampPrices[key] !==
        "number"
    ) {

        stampPrices[key] =
            DEFAULT_STAMP_PRICES[key];

    }

}

);

/* =========================================================
ضمان حصص اللجان
========================================================= */

Object.keys(
DEFAULT_COMMITTEE_SHARES
).forEach(
function (key) {

    if (
        !committeeShares[key] ||
        typeof committeeShares[key] !== "object"
    ) {
        committeeShares[key] =
            JSON.parse(JSON.stringify(DEFAULT_COMMITTEE_SHARES[key]));
    }

    ["ambulance", "cooperation"].forEach(function (field) {
        if (typeof committeeShares[key][field] !== "number") {
            committeeShares[key][field] =
                DEFAULT_COMMITTEE_SHARES[key][field];
        }
    });

}

);

/* =========================================================
نسب لجنتي الإسعاف والتعاون
حصة كل لجنة = نسبة مئوية من سعر الوكالة، لكل نوع وكالة نسبته.
أول مرة تُشتق النسب من المبالغ الثابتة السابقة مقسومة على سعر
الوكالة الحالي (مثال: 300 ÷ 1700 = 17.647%)، فلا يتغير أي مبلغ.
المبالغ الثابتة (audit_committee_shares) تبقى محفوظة ومحدّثة
للتوافق مع النسخ الاحتياطية والإصدارات السابقة.
========================================================= */

const COMMITTEE_RATES_KEY = "audit_committee_rates";

function deriveCommitteeRates(shares, priceTable) {
    const rates = {};
    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const share = (shares && shares[type]) || DEFAULT_COMMITTEE_SHARES[type] || { ambulance: 0, cooperation: 0 };
        const price = number(priceTable && priceTable[type] && priceTable[type].agency);
        rates[type] = {
            ambulance: price > 0 ? (number(share.ambulance) / price) * 100 : 0,
            cooperation: price > 0 ? (number(share.cooperation) / price) * 100 : 0
        };
    });
    return rates;
}

let committeeRates = loadData(COMMITTEE_RATES_KEY, null);

if (!committeeRates || typeof committeeRates !== "object") {
    committeeRates = deriveCommitteeRates(committeeShares, prices);
}

(function ensureCommitteeRates() {
    const derived = deriveCommitteeRates(committeeShares, prices);
    Object.keys(AGENCY_NAMES).forEach(function (type) {
        if (!committeeRates[type] || typeof committeeRates[type] !== "object") {
            committeeRates[type] = derived[type];
        }
        ["ambulance", "cooperation"].forEach(function (field) {
            if (typeof committeeRates[type][field] !== "number" || !Number.isFinite(committeeRates[type][field])) {
                committeeRates[type][field] = derived[type][field];
            }
        });
    });
})();

/* مبلغ الحصة = سعر الوكالة × النسبة، مقرّباً لأقرب ليرة */
function committeeAmount(price, rate) {
    return Math.round(number(price) * number(rate) / 100);
}

function formatRate(rate) {
    return new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 3 }).format(number(rate)) + "%";
}

/* المبالغ الثابتة المقابلة للنسب بالأسعار الحالية (للتوافق فقط) */
function syncCommitteeSharesFromRates() {
    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const price = number(prices[type] && prices[type].agency);
        const rate = committeeRates[type] || { ambulance: 0, cooperation: 0 };
        committeeShares[type] = {
            ambulance: committeeAmount(price, rate.ambulance),
            cooperation: committeeAmount(price, rate.cooperation)
        };
    });
}

/* =========================================================
حفظ الإعدادات
========================================================= */

saveData(
COMMITTEE_RATES_KEY,
committeeRates
);

saveData(
"audit_committee_shares",
committeeShares
);

saveData(
"audit_prices",
prices
);

saveData(
"audit_addition_prices",
additionPrices
);

saveData(
"audit_addition_stamp_status",
additionStampStatus
);

saveData(
"audit_transport_settings",
transportSettings
);

saveData(
"audit_stamp_prices",
stampPrices
);

/* =========================================================
المتغيرات
========================================================= */

let currentUser = null;

let pendingAgencies = [];

/* آخر وكالة أُضيفت (تُميَّز في القائمة) */
let lastAddedAgencyId = null;

/* =========================================================
DOM
========================================================= */

const loginPage =
document.getElementById(
"loginPage"
);

const appPage =
document.getElementById(
"appPage"
);

const loginUsername =
document.getElementById(
"loginUsername"
);

const loginPassword =
document.getElementById(
"loginPassword"
);

const loginBtn =
document.getElementById(
"loginBtn"
);

const loginError =
document.getElementById(
"loginError"
);

const currentUserElement =
document.getElementById(
"currentUser"
);

const logoutBtn =
document.getElementById(
"logoutBtn"
);

/* =========================================================
الأدوات
========================================================= */

function generateId() {

return (
    Date.now().toString(36) +
    Math.random()
        .toString(36)
        .substring(2, 10)
);

}

/* =========================================================
تاريخ السجل
recordDate: التاريخ الذي يدخله المستخدم (YYYY-MM-DD).
السجلات القديمة لا تحتوي عليه فيُعتمد تاريخ إدخالها.
========================================================= */

function toDayString(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
        return "";
    }
    return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
}

function todayDay() {
    return toDayString(new Date());
}

function getRecordDay(record) {
    if (record && /^\d{4}-\d{2}-\d{2}$/.test(record.recordDate || "")) {
        return record.recordDate;
    }
    return record && record.createdAt ? toDayString(record.createdAt) : "";
}

function formatDay(day) {
    if (!day) {
        return "-";
    }
    const parts = day.split("-").map(Number);
    try {
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(NUMBER_LOCALE);
    } catch (e) {
        return day;
    }
}

/* تحويل الأرقام العربية الهندية (٠-٩ و ۰-۹) والفاصلة العشرية العربية إلى أرقام غربية */
function normalizeDigits(text) {
    return String(text)
        .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
        .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
        .replace(/٫/g, ".");
}

function number(value) {

/* نص من حقل إدخال: أرقام عربية أو فواصل آلاف لا تتحول إلى صفر */
if (typeof value === "string") {
    value = normalizeDigits(value).replace(/[,\s٬]/g, "");
}

const n =
    Number(value);

if (
    !Number.isFinite(n) ||
    n < 0
) {

    return 0;

}

return n;

}

function money(value) {

return (
    new Intl.NumberFormat(
        NUMBER_LOCALE,
        { maximumFractionDigits: 2 }
    ).format(
        Number(value) || 0
    ) +
    " ل.س"
);

}

function escapeHTML(value) {

if (
    value === null ||
    value === undefined
) {

    return "";

}

return String(value)

    .replace(
        /&/g,
        "&amp;"
    )

    .replace(
        /</g,
        "&lt;"
    )

    .replace(
        />/g,
        "&gt;"
    )

    .replace(
        /"/g,
        "&quot;"
    )

    .replace(
        /'/g,
        "&#039;"
    );

}

function getRoleName(role) {

if (role === "manager") {
    return "مدير";
}

if (role === "auditor") {
    return "مدقق";
}

if (role === "viewer") {
    return "مشاهد";
}

return role;

}

function getAgencyStatusName(status) {

if (status === "cancelled") {
    return "ملغاة";
}

if (status === "missing") {
    return "مفقودة";
}

return "فعالة";

}

/* =========================================================
الحصول على الرقم التالي للوكالة
يبدأ من 1 ويزداد تصاعدياً
========================================================= */

function getNextAgencyNumber() {

/*
    ترقيم الوكالات مستقل لكل سجل.
    - أثناء إنشاء سجل جديد: يعتمد فقط على الوكالات المضافة مؤقتاً لهذا السجل.
    - أثناء تعديل سجل موجود: يعتمد فقط على وكالات السجل الجاري تعديله.
    لا يتم النظر إلى وكالات أي سجل آخر.
*/

let agencyCollection = pendingAgencies;

const editingRecordId =
    document.getElementById(
        "editingRecordId"
    )?.value;

if (editingRecordId) {

    const currentRecord =
        records.find(
            function (record) {
                return record.id === editingRecordId;
            }
        );

    if (currentRecord) {
        /*
            عند تعديل السجل، pendingAgencies تحتوي عادةً على
            وكالات السجل نفسه، وهي المصدر الوحيد للترقيم.
        */
        agencyCollection = pendingAgencies;
    }
}

let maxNumber = 0;

(
    Array.isArray(agencyCollection)
        ? agencyCollection
        : []
).forEach(
    function (agency) {

        const value =
            parseInt(
                agency.number,
                10
            );

        if (
            Number.isFinite(value) &&
            value > maxNumber
        ) {

            maxNumber = value;

        }

    }
);

return maxNumber + 1;

}

/* =========================================================
تسجيل الدخول
========================================================= */

function login() {

const username =
    loginUsername.value.trim();

const password =
    loginPassword.value.trim();


if (
    !username ||
    !password
) {

    loginError.textContent =
        "يرجى إدخال اسم المستخدم وكلمة المرور.";

    return;

}


const user =
    users.find(
        function (item) {

            return (
                item.username ===
                username &&
                item.password ===
                password
            );

        }
    );


if (!user) {

    loginError.textContent =
        "اسم المستخدم أو كلمة المرور غير صحيحة.";

    return;

}


currentUser = {

    id:
        user.id,

    username:
        user.username,

    role:
        user.role

};


const currentUserJSON = JSON.stringify(currentUser);

localStorage.setItem(
    "currentUser",
    currentUserJSON
);

sessionStorage.setItem(
    "currentUser",
    currentUserJSON
);


loginError.textContent =
    "";


loginPage.classList.add(
    "hidden"
);


appPage.classList.remove(
    "hidden"
);


updateProfileCard();


applyPermissions();

updateAll();

}

/* =========================================================
بطاقة المستخدم والقائمة الجانبية
========================================================= */

function updateProfileCard() {

    if (!currentUser) {
        return;
    }

    currentUserElement.textContent = currentUser.username;

    const role = document.getElementById("profileRole");
    const date = document.getElementById("profileDate");

    if (role) {
        role.textContent = getRoleName(currentUser.role);
    }

    if (date) {
        try {
            date.textContent = new Date().toLocaleDateString(NUMBER_LOCALE, { year: "numeric", month: "long", day: "numeric" });
        } catch (e) {
            date.textContent = todayDay();
        }
    }
}

function setNavOpen(open) {
    document.body.classList.toggle("nav-open", !!open);
}

document.getElementById("menuToggle")?.addEventListener("click", function () {
    setNavOpen(true);
});

document.getElementById("menuClose")?.addEventListener("click", function () {
    setNavOpen(false);
});

document.getElementById("navOverlay")?.addEventListener("click", function () {
    setNavOpen(false);
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        setNavOpen(false);
    }
});

/* =========================================================
الدخول بواسطة Enter
========================================================= */

if (loginBtn) {

loginBtn.addEventListener(
    "click",
    login
);

}

if (loginPassword) {

loginPassword.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            login();

        }

    }
);

}

/* =========================================================
تسجيل الخروج
========================================================= */

if (logoutBtn) {

logoutBtn.addEventListener(
    "click",
    function () {

        currentUser = null;

        localStorage.removeItem(
            "currentUser"
        );

        sessionStorage.removeItem(
            "currentUser"
        );

        appPage.classList.add(
            "hidden"
        );

        loginPage.classList.remove(
            "hidden"
        );

        loginUsername.value = "";

        loginPassword.value = "";

    }
);

}

/* =========================================================
الصلاحيات
========================================================= */

function applyPermissions() {

if (!currentUser) {
    return;
}


document
    .querySelectorAll(
        ".manager-only"
    )
    .forEach(
        function (element) {

            if (
                currentUser.role ===
                "manager"
            ) {

                element.classList.remove(
                    "hidden"
                );

            } else {

                element.classList.add(
                    "hidden"
                );

            }

        }
    );


document
    .querySelectorAll(
        ".auditor-manager"
    )
    .forEach(
        function (element) {

            if (
                currentUser.role ===
                "manager" ||
                currentUser.role ===
                "auditor"
            ) {

                element.classList.remove(
                    "hidden"
                );

            } else {

                element.classList.add(
                    "hidden"
                );

            }

        }
    );

}

/* =========================================================
التنقل
========================================================= */

document
.querySelectorAll(
".tab-btn"
)
.forEach(
function (button) {

        button.addEventListener(
            "click",
            function () {

                switchSection(
                    button.dataset.section
                );

            }
        );

    }
);

function switchSection(id) {

/* لا فتح لقسم زرّه مخفي عن صلاحية المستخدم (مثل السجلات للمشاهد) */
const allowedButton =
    document.querySelector(
        '.tab-btn[data-section="' + id + '"]'
    );

if (allowedButton && allowedButton.classList.contains("hidden")) {
    id = "dashboardSection";
}

try {
    localStorage.setItem("activeSection", id);
    sessionStorage.setItem("activeSection", id);
} catch (error) {
    console.warn("تعذر حفظ الصفحة الحالية", error);
}

document
    .querySelectorAll(
        ".tab-btn"
    )
    .forEach(
        function (button) {

            button.classList.remove(
                "active"
            );

        }
    );


document
    .querySelectorAll(
        ".section"
    )
    .forEach(
        function (section) {

            section.classList.remove(
                "active-section"
            );

        }
    );


const button =
    document.querySelector(
        `.tab-btn[data-section="${id}"]`
    );


const section =
    document.getElementById(id);


if (button) {

    button.classList.add(
        "active"
    );

    const mobileName = document.getElementById("mobileSectionName");
    const title = button.querySelector(".nav-text b");

    if (mobileName && title) {
        mobileName.textContent = title.textContent;
    }

}

setNavOpen(false);


if (section) {

    section.classList.add(
        "active-section"
    );

}


if (
    id === "recordsSection"
) {

    renderRecords();

}


if (
    id === "reportsSection"
) {

    renderReports();

}


if (
    id === "pricesSection"
) {

    renderPrices();

    if (typeof renderRecordReprice === "function") renderRecordReprice();
    if (typeof renderBulkPrice === "function") renderBulkPrice();

}


if (
    id === "committeesSection"
) {

    renderCommittees();

}


if (
    id === "guideSection"
) {

    renderGuide();

}


if (
    id === "calculatorSection"
) {

    renderCalculator();

}


if (
    id === "usersSection"
) {

    renderUsers();

}


if (
    id === "newRecordSection"
) {

    prepareNewAgency();

    updateRepresentativeTypeHint();

}

}

window.switchSection =
switchSection;

/* =========================================================
حقول الأرقام
حقول نصية بلوحة أرقام (data-num) بدل type="number" حتى تظهر
الأرقام غربية دائماً مهما كانت لغة المتصفح. تُنظَّف أثناء الكتابة:
الأرقام العربية تتحول لغربية، وكل ما ليس رقماً يُحذف.
========================================================= */

document.addEventListener(
    "input",
    function (event) {

        const input = event.target;

        if (!input || !input.matches || !input.matches("input[data-num]")) {
            return;
        }

        const decimal = input.dataset.num === "dec";
        let clean = normalizeDigits(input.value).replace(decimal ? /[^\d.]/g : /[^\d]/g, "");

        if (decimal) {
            const dot = clean.indexOf(".");
            if (dot !== -1) {
                clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, "");
            }
        }

        if (clean !== input.value) {
            const caret = input.selectionStart;
            const diff = input.value.length - clean.length;
            input.value = clean;
            try {
                input.setSelectionRange(Math.max(0, caret - diff), Math.max(0, caret - diff));
            } catch (e) {}
        }
    },
    true
);

/* الصفوف القابلة للضغط تعمل بلوحة المفاتيح أيضاً (Enter أو مسافة) */
document.addEventListener("keydown", function (event) {
    const row = event.target && event.target.closest && event.target.closest(".clickable-row");
    if (row && event.target === row && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        row.click();
    }
});

/* سهم أعلى/أسفل يزيد وينقص العدد كما في حقول الأرقام العادية */
document.addEventListener("keydown", function (event) {

    const input = event.target;

    if (
        !input || !input.matches || !input.matches('input[data-num="int"]') ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")
    ) {
        return;
    }

    event.preventDefault();
    input.value = Math.max(0, number(input.value) + (event.key === "ArrowUp" ? 1 : -1));
    input.dispatchEvent(new Event("input", { bubbles: true }));
});

/* =========================================================
أزرار + و -
========================================================= */

document.addEventListener(
"click",
function (event) {

    const button =
        event.target.closest(
            ".number-btn"
        );


    if (!button) {
        return;
    }


    const targetId =
        button.dataset.target;


    const input =
        document.getElementById(
            targetId
        );


    if (!input) {
        return;
    }


    let value =
        number(
            input.value
        );


    if (
        button.classList.contains(
            "plus-btn"
        )
    ) {

        value += 1;

    }


    if (
        button.classList.contains(
            "minus-btn"
        )
    ) {

        value =
            Math.max(
                0,
                value - 1
            );

    }


    input.value =
        value;


    input.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true
            }
        )
    );

}

);

/* =========================================================
إنشاء عناصر الأسعار داخل تبويب إنشاء السجل
========================================================= */

function ensureAgencyPriceControls() {
    // لا توجد حقول لتعديل الأسعار داخل إنشاء الوكالة.
    // تعديل الأسعار يتم حصراً من تبويب "الأسعار".
    return;
}

/* =========================================================
تحميل الأسعار الحالية للوكالة
========================================================= */

function loadCurrentAgencyPrices() {
    return getCurrentAgencyPricing();
}

/* =========================================================
قراءة أسعار الوكالة من النموذج
========================================================= */

function getCurrentAgencyPricing() {
    return getPricingForType(
        document.getElementById(
            "agencyType"
        )?.value || DEFAULT_AGENCY_TYPE,
        pricePeriodDay(document.getElementById("agencyPricePeriod")?.value)
    );
}

/* =========================================================
الأسعار حسب الأشهر
جدول أسعار يبدأ من شهر معيّن (مثلاً من 2026-11: الخاصة 1900).
كل وكالة جديدة تأخذ أسعار شهر «تاريخ السجل»؛ الشهر الذي ليس له
جدول يأخذ أحدث جدول قبله، وإلا الأسعار الأساسية.
الوكالات المحفوظة تحتفظ بأسعارها (appliedPrices) ولا تتغير.
========================================================= */

const PRICE_SCHEDULE_KEY = "audit_price_schedule";

/*
    جدول الأسعار الذي زوّدنا به المكتب لسنة 2026 (أسعار المكاتب الرئيسية).
    «البدائية» = العامة والخاصة، و«المصدقة البدائية» = صورة مصدقة عامة/خاصة،
    و«حصة الفرع» = المبلغ المطلوب من المندوب.
    أسعار المندوبين الخارجيين = هذه الأسعار + بدل الانتقال (يُضاف تلقائياً
    للعامة والخاصة والشرعية فقط)، لذلك لا تُدخل كجدول منفصل.
    يُضاف مرة واحدة فقط إذا لم يكن للمستخدم جدول محفوظ.
*/
function priceRow(primary, primaryRep, legal, legalRep, certPrimary, certPrimaryRep, certLegal, certLegalRep, exec, execRep) {
    return {
        general: { agency: primary, representative: primaryRep },
        special: { agency: primary, representative: primaryRep },
        legal: { agency: legal, representative: legalRep },
        certified_general_special: { agency: certPrimary, representative: certPrimaryRep },
        certified_legal: { agency: certLegal, representative: certLegalRep },
        executive: { agency: exec, representative: execRep }
    };
}

const DEFAULT_PRICE_SCHEDULE = [
    { from: "2026-03-01", prices: priceRow(1050, 580, 1050, 580, 1050, 580, 1050, 580, 520, 350) },
    { from: "2026-03-05", prices: priceRow(1070, 600, 720, 250, 990, 550, 640, 200, 520, 350) },
    { from: "2026-04-01", prices: priceRow(1700, 300, 1350, 125, 1550, 300, 1200, 125, 900, 50) },
    { from: "2026-05-01", prices: priceRow(1900, 350, 1550, 175, 1550, 300, 1200, 125, 900, 50) },
    { from: "2026-06-14", prices: priceRow(1900, 350, 1550, 175, 1650, 400, 1300, 225, 900, 50) },
    { from: "2026-08-03", prices: priceRow(1700, 300, 1350, 125, 1650, 400, 1300, 225, 900, 50) },
    { from: "2026-09-01", prices: priceRow(1700, 300, 1350, 125, 1550, 300, 1200, 125, 900, 50) }
];

let priceSchedule = loadData(PRICE_SCHEDULE_KEY, null);

if (!Array.isArray(priceSchedule)) {
    let stored = null;
    try { stored = localStorage.getItem(PRICE_SCHEDULE_KEY); } catch (e) {}
    priceSchedule = JSON.parse(JSON.stringify(DEFAULT_PRICE_SCHEDULE)).map(function (e) {
        e.id = "default-" + e.from;
        return e;
    });
    /* لا نكتب فوق جدول موجود (حتى لو كان تالفاً) */
    if (stored === null) {
        try { saveData(PRICE_SCHEDULE_KEY, priceSchedule); } catch (e) {}
    }
}

/* بداية الجدول: يوم كامل YYYY-MM-DD (الجداول القديمة بالشهر تُعامل كأول يوم فيه) */
function scheduleStart(from) {
    return /^\d{4}-\d{2}$/.test(from || "") ? from + "-01" : String(from || "");
}

function getFormRecordDay() {
    return document.getElementById("recordDate")?.value || todayDay();
}

/* جدول الأسعار الساري ليوم معيّن: أحدث جدول بدأ في هذا اليوم أو قبله */
function priceTableForDay(day) {
    const d = String(day || todayDay()).slice(0, 10);
    const entry = priceSchedule
        .filter(function (e) { return e && /^\d{4}-\d{2}(-\d{2})?$/.test(e.from) && scheduleStart(e.from) <= d; })
        .sort(function (a, b) { return scheduleStart(a.from).localeCompare(scheduleStart(b.from)); })
        .pop();
    return entry ? { prices: entry.prices || {}, month: scheduleStart(entry.from) } : { prices: prices, month: null };
}

/*
    تغيّر تاريخ السجل إلى شهر بأسعار مختلفة: نعرض إعادة تسعير
    الوكالات المضافة بأسعار الشهر الجديد (بموافقة المستخدم فقط).
*/
function pendingAgenciesNeedingReprice(day) {
    return pendingAgencies.filter(function (agency) {
        if (agency.status === "cancelled" || agency.pricePeriod || number(agency.customPrice) > 0) return false;
        const p = getPricingForType(agency.type, day);
        const applied = agency.appliedPrices || {};
        return number(applied.agency !== undefined ? applied.agency : agency.basePrice) !== number(p.agency) ||
            number(applied.representative !== undefined ? applied.representative : agency.representativeBase) !== number(p.representative);
    });
}

function repricePendingAgencies(day) {
    pendingAgencies = pendingAgencies.map(function (agency) {
        /* وكالة لها فترة سعر مختارة أو سعر محدد تبقى على سعرها */
        if (agency.pricePeriod || number(agency.customPrice) > 0) return agency;
        return buildAgency(agencyInputsOf(agency), getPricingForType(agency.type, day), agency.id);
    });
    renderPendingAgencies();
    updatePreview();
}

document.getElementById("recordDate")?.addEventListener("change", function () {

    const day = this.value;

    if (!day || !pendingAgencies.length) {
        updatePreview();
        return;
    }

    const changed = pendingAgenciesNeedingReprice(day);

    if (!changed.length) {
        updatePreview();
        return;
    }

    const table = priceTableForDay(day);

    appConfirm({
        title: "أسعار شهر مختلفة",
        message: "تاريخ السجل الجديد يقع في فترة لها أسعار " + (table.month ? "خاصة (من " + formatDay(table.month) + ")" : "أساسية") +
            " مختلفة عن أسعار " + changed.length + " وكالة مضافة. هل تريد إعادة تسعير الوكالات المضافة حسب أسعار هذا الشهر؟",
        confirmText: "إعادة التسعير",
        cancelText: "إبقاء الأسعار كما هي"
    }).then(function (ok) {
        if (ok) {
            repricePendingAgencies(day);
            notify("أُعيد تسعير " + pendingAgencies.length + " وكالة حسب أسعار الشهر.", "success");
        }
        updatePreview();
    });
});

/*
    فترة سعر الوكالة (agency.pricePeriod، اختيارية): السجل الواحد قد يضم وكالات
    بسعرين أو ثلاثة. فارغة = حسب تاريخ السجل؛ "base" = الأسعار الأساسية؛
    أو تاريخ بداية جدول من «أسعار حسب الفترات».
*/
function pricePeriodDay(period) {
    if (period === "base") return "0000-01-01";
    if (/^\d{4}-\d{2}-\d{2}$/.test(period || "")) return period;
    return getFormRecordDay();
}

function pricingForAgency(type, period) {
    return getPricingForType(type, pricePeriodDay(period));
}

function pricePeriodChoices() {
    const list = priceSchedule
        .filter(function (e) { return e && /^\d{4}-\d{2}(-\d{2})?$/.test(e.from); })
        .map(function (e) { return scheduleStart(e.from); })
        .filter(function (v, i, a) { return a.indexOf(v) === i; })
        .sort();
    return list.map(function (day) { return { value: day, label: "من " + monthLabel(day) }; })
        .concat([{ value: "base", label: "الأسعار الأساسية" }]);
}

function pricePeriodLabel(period) {
    if (!period) return "";
    if (period === "base") return "الأسعار الأساسية";
    return "من " + monthLabel(period);
}

function pricePeriodOptionsHTML(selected, type) {
    const auto = priceTableForDay(getFormRecordDay());
    const autoText = "حسب تاريخ السجل" + (auto.month ? " (" + monthLabel(auto.month) + ")" : "");
    return '<option value="">' + escapeHTML(autoText) + "</option>" +
        pricePeriodChoices().map(function (c) {
            const price = type ? " — " + money(pricingForAgency(type, c.value).agency) : "";
            return '<option value="' + c.value + '"' + (c.value === selected ? " selected" : "") + ">" + escapeHTML(c.label + price) + "</option>";
        }).join("");
}

/* قائمة «فترة السعر» في نموذج الوكالة */
function renderAgencyPricePeriod() {
    const select = document.getElementById("agencyPricePeriod");
    if (!select) return;
    const value = select.value;
    const type = document.getElementById("agencyType")?.value || DEFAULT_AGENCY_TYPE;
    select.innerHTML = pricePeriodOptionsHTML(value, type);
    select.value = pricePeriodChoices().some(function (c) { return c.value === value; }) ? value : "";
    select.closest(".price-period-group")?.classList.toggle("is-override", !!select.value);
}

function setAgencyPricePeriod(value) {
    const select = document.getElementById("agencyPricePeriod");
    if (!select) return;
    if (value && !Array.prototype.some.call(select.options, function (o) { return o.value === value; })) {
        select.innerHTML = pricePeriodOptionsHTML(value, null);
    }
    select.value = value || "";
    renderAgencyPricePeriod();
}

/* تغيير فترة سعر وكالة مضافة من سطرها */
function changePendingPeriod(index, period) {
    const agency = pendingAgencies[index];
    if (!agency || (period !== "__custom" && (agency.pricePeriod || "") === (period || "") && !(number(agency.customPrice) > 0))) return;
    if (period === "__custom") return;
    const inputs = agencyInputsOf(agency);
    inputs.pricePeriod = period || "";
    inputs.customPrice = 0;
    inputs.customRepresentative = null;
    const updated = buildAgency(inputs, pricingForAgency(inputs.type, inputs.pricePeriod), agency.id);
    pendingAgencies[index] = updated;
    lastAddedAgencyId = updated.id;
    renderPendingAgencies();
    updatePreview();
    notify("<strong>تغيّر سعر الوكالة رقم " + escapeHTML(updated.number) + "</strong><span>" +
        escapeHTML(pricePeriodLabel(updated.pricePeriod) || "حسب تاريخ السجل") + " — " + money(updated.basePrice) + "</span>", "success", 3500, true);
}

window.changePendingPeriod = changePendingPeriod;

document.getElementById("agencyPricePeriod")?.addEventListener("change", function () {
    this.closest(".price-period-group")?.classList.toggle("is-override", !!this.value);
    updatePreview();
});
document.getElementById("agencyType")?.addEventListener("change", renderAgencyPricePeriod);
document.getElementById("recordDate")?.addEventListener("change", renderAgencyPricePeriod);
onReady(renderAgencyPricePeriod);

/* أسعار نوع وكالة معيّن في يوم معيّن (تستخدمها الحاسبة أيضاً) */
function getPricingForType(type, day) {

    const table = priceTableForDay(day);

    const globalPrice =
        (table.prices && table.prices[type]) ||
        prices[type] ||
        DEFAULT_PRICES[type] ||
        {
            agency: 0,
            representative: 300
        };

    const additions = {};

    Object.keys(ADDITION_NAMES).forEach(
        function (key) {
            if (key === "transport") {
                return;
            }

            additions[key] = {
                price:
                    number(
                        additionPrices[key]
                    ),
                isPleading:
                    !!additionStampStatus[key]
            };
        }
    );

    return {
        agency:
            number(globalPrice.agency),
        representative:
            number(globalPrice.representative),
        priceMonth: table.month,
        additions: additions,
        transport: getTransportPricing()
    };
}

/* =========================================================
بدل الانتقال: التسعير الحالي وتفاصيل وكالة محفوظة
========================================================= */

function computeTransportCash(total, share, pleadingStamp, stampPrice) {
    return Math.max(
        0,
        number(total) - number(share) - (pleadingStamp ? number(stampPrice) : 0)
    );
}

function getTransportPricing() {

    const pleadingStamp = !!transportSettings.pleadingStamp;
    const total = number(transportSettings.total);
    const share = number(transportSettings.representativeShare);
    const stampPrice = number(stampPrices.pleading);

    return {
        total: total,
        pleadingStamp: pleadingStamp,
        representativeShare: share,
        stampPrice: stampPrice,
        cashRemainder: computeTransportCash(total, share, pleadingStamp, stampPrice)
    };
}

/*
    تفاصيل بدل الانتقال لوكالة محفوظة، حسب الأسعار التي طُبقت عليها.
    السجلات القديمة لا تحتوي القيمة الكاملة، فتُستنتج من مكوناتها.
*/
function getAgencyTransport(agency) {

    const count =
        agency && agency.status !== "cancelled"
            ? number(agency.additions && agency.additions.transport)
            : 0;

    const settings =
        (agency && agency.transportSettings) ||
        (agency && agency.appliedPrices && agency.appliedPrices.transport) ||
        getTransportPricing();

    const pleadingStamp = !!settings.pleadingStamp;

    const stampPrice =
        typeof settings.stampPrice === "number"
            ? settings.stampPrice
            : number(
                (agency && agency.appliedPrices && agency.appliedPrices.stamps && agency.appliedPrices.stamps.pleading) ||
                stampPrices.pleading
            );

    const share = number(settings.representativeShare);
    const cash = number(settings.cashRemainder);
    const stampValue = pleadingStamp ? stampPrice : 0;

    const unitTotal =
        typeof settings.total === "number"
            ? settings.total
            : cash + share + stampValue;

    return {
        count: count,
        unitTotal: unitTotal,
        total: count * unitTotal,
        share: count * share,
        stamps: pleadingStamp ? count : 0,
        stampsValue: count * stampValue,
        cash: count * cash
    };
}

/* =========================================================
حساب الإضافات
========================================================= */

function calculateAdditions(
additions,
pricing
) {

const values = {};

let total = 0;

let pleadingStamps = 0;


Object.keys(
    ADDITION_NAMES
).forEach(
    function (key) {

        const count =
            number(
                additions[key]
            );


        if (
            count <= 0
        ) {

            values[key] = 0;

            return;

        }


        let price = 0;

        let isPleading = false;


        if (
            pricing &&
            pricing.additions &&
            pricing.additions[key]
        ) {

            price =
                number(
                    pricing
                        .additions[key]
                        .price
                );

            isPleading =
                !!pricing
                    .additions[key]
                    .isPleading;

        } else if (
            key === "transport"
        ) {

            /*
                بدل الانتقال:
                المبلغ النقدي المتبقي يُحسب دائماً ضمن الإضافات النقدية،
                ويضاف طابع مرافعة أيضاً إذا كان مفعلاً من قسم الأسعار.
            */

            const transportPricing =
                pricing && pricing.transport
                    ? pricing.transport
                    : transportSettings;

            const cash =
                count *
                number(
                    transportPricing
                        .cashRemainder
                );

            if (transportPricing.pleadingStamp) {
                pleadingStamps += count;
            }

            values[key] = cash;

            total += cash;

            return;

        } else {

            price =
                number(
                    additionPrices[key]
                );

            isPleading =
                !!additionStampStatus[key];

        }


        /*
            إذا كانت الإضافة طابع مرافعة:
            لا تضيف مبلغاً نقدياً.
            وإنما تضيف طابع مرافعة مطلوب.
        */

        if (isPleading) {

            pleadingStamps +=
                count;

            values[key] = 0;

        } else {

            values[key] =
                count *
                price;

            total +=
                values[key];

        }

    }
);


return {

    values:
        values,

    total:
        total,

    pleadingStamps:
        pleadingStamps

};

}

/* =========================================================
حساب الطوابع
========================================================= */

function calculateStamps(
additionsResult,
missing,
cancelled
) {

if (cancelled) {

    return {

        requiredPleading:
            0,

        missingValue:
            0

    };

}


/*
    عدد طوابع المرافعة الأساسية
    لكل وكالة = 2
*/

const basicPleading =
    2;


const requiredPleading =
    basicPleading +
    number(
        additionsResult.pleadingStamps
    );


const missingValue =

    (
        number(
            missing.pleading
        ) *
        number(
            stampPrices.pleading
        )
    )

    +

    (
        number(
            missing.ambulance
        ) *
        number(
            stampPrices.ambulance
        )
    )

    +

    (
        number(
            missing.aid
        ) *
        number(
            stampPrices.aid
        )
    );


return {

    requiredPleading:
        requiredPleading,

    missingValue:
        missingValue

};

}

/* =========================================================
حساب المبلغ المطلوب من المندوب
========================================================= */

function calculateRepresentativeAmount(
representativeBase,
additionsTotal,
missingValue,
transportCashRemainder,
cancelled
) {

if (cancelled) {
    return 0;
}


/*
    المبلغ الأساسي للمندوب
    يتم تحديده مع سعر الوكالة.
*/

let total =
    number(
        representativeBase
    );


/*
    الإضافات النقدية
*/

total +=
    number(
        additionsTotal
    );


/*
    الطوابع الناقصة
*/

total +=
    number(
        missingValue
    );


/*
    المبلغ النقدي المتبقي من بدل الانتقال
    يضاف إلى المبلغ المطلوب من المندوب.

    أما حصة المندوب فلا تضاف.
*/

total +=
    number(
        transportCashRemainder
    );


return total;

}

/* =========================================================
قراءة بيانات الوكالة
========================================================= */

/*
    مدخلات الوكالة كما هي في النموذج (بدون أي حساب).
*/
function readAgencyInputs() {

    const val = function (id) {
        return document.getElementById(id)?.value;
    };

    return {
        number: (val("agencyNumber") || "").trim(),
        type: val("agencyType") || DEFAULT_AGENCY_TYPE,
        status: val("agencyStatus") || "active",
        duplicate: !!document.getElementById("agencyDuplicate")?.checked,
        pricePeriod: val("agencyPricePeriod") || "",
        notes: (val("agencyNotes") || "").trim(),
        additions: {
            save: number(val("saveCount")),
            signature: number(val("signatureCount")),
            inheritance: number(val("inheritanceCount")),
            children: number(val("childrenCount")),
            agents: number(val("agentsCount")),
            originality: number(val("originalityCount")),
            transport: number(val("transportCount"))
        },
        missing: {
            pleading: number(val("missingPleading")),
            ambulance: number(val("missingAmbulance")),
            aid: number(val("missingAid"))
        }
    };
}

/* مدخلات وكالة محفوظة (لإعادة تسعيرها) */
function agencyInputsOf(agency) {
    const ms = agency.stamps || agency.missingStamps || {};
    const ad = agency.additions || {};
    return {
        number: String(agency.number),
        type: agency.type || DEFAULT_AGENCY_TYPE,
        status: agency.status || "active",
        duplicate: !!agency.duplicate,
        pricePeriod: agency.pricePeriod || "",
        customPrice: number(agency.customPrice),
        customRepresentative: agency.customRepresentative === undefined ? null : agency.customRepresentative,
        notes: agency.notes || "",
        additions: {
            save: number(ad.save), signature: number(ad.signature), inheritance: number(ad.inheritance),
            children: number(ad.children), agents: number(ad.agents), originality: number(ad.originality),
            transport: number(ad.transport)
        },
        missing: { pleading: number(ms.pleading), ambulance: number(ms.ambulance), aid: number(ms.aid) }
    };
}

/*
    حساب الوكالة كاملة من مدخلاتها وأسعار معيّنة (نفس قواعد الحساب
    السابقة تماماً). تُستخدم للنموذج ولإعادة التسعير حسب الشهر.
*/
function buildAgency(inputs, pricing, keepId) {

    /* سعر محدد للوكالة (من «تغيير سعر وكالات محفوظة») يبقى عند تغيير نوعها أو بنودها */
    if (number(inputs.customPrice) > 0) {
        pricing = Object.assign({}, pricing, {
            agency: number(inputs.customPrice),
            representative: inputs.customRepresentative !== null && inputs.customRepresentative !== undefined ? number(inputs.customRepresentative) : pricing.representative
        });
    }

    const status = inputs.status || "active";
    const cancelled = status === "cancelled";
    const type = inputs.type || DEFAULT_AGENCY_TYPE;

    const additions = Object.assign({}, inputs.additions);

    /* الوكالة الملغاة، والأنواع التي لا يُضاف لها البدل، لا يُحسب عليها بدل انتقال */
    additions.transport = cancelled || !isTransportEligible(type) ? 0 : number(additions.transport);

    const missing = inputs.missing;

    const additionResult = calculateAdditions(additions, pricing);
    const stampResult = calculateStamps(additionResult, missing, cancelled);

    const representativeAmount = calculateRepresentativeAmount(
        pricing.representative,
        additionResult.total,
        stampResult.missingValue,
        0,
        cancelled
    );

    const basePrice = cancelled ? 0 : number(pricing.agency);

    return {
        id: keepId || generateId(),
        number: inputs.number || String(getNextAgencyNumber()),
        type: type,
        typeName: AGENCY_NAMES[type],
        status: status,
        duplicate: !!inputs.duplicate,
        pricePeriod: inputs.pricePeriod || undefined,
        customPrice: number(inputs.customPrice) > 0 ? number(inputs.customPrice) : undefined,
        customRepresentative: number(inputs.customPrice) > 0 && inputs.customRepresentative !== null && inputs.customRepresentative !== undefined ? number(inputs.customRepresentative) : undefined,
        transportInAdditions: true,
        basePrice: basePrice,
        representativeBase: cancelled ? 0 : number(pricing.representative),
        additions: additions,
        additionValues: additionResult.values,
        additionsTotal: additionResult.total,
        pleadingAdditions: additionResult.pleadingStamps,
        stamps: missing,
        missingStampsValue: stampResult.missingValue,
        pleadingRequired: stampResult.requiredPleading,
        representativeAmount: representativeAmount,
        notes: inputs.notes || "",
        transportSettings: JSON.parse(JSON.stringify(pricing.transport)),
        appliedPrices: {
            agency: basePrice,
            representative: pricing.representative,
            priceMonth: pricing.priceMonth || null,
            additions: JSON.parse(JSON.stringify(pricing.additions)),
            transport: JSON.parse(JSON.stringify(pricing.transport)),
            stamps: JSON.parse(JSON.stringify(stampPrices))
        }
    };
}

function getAgencyFromForm() {
    const inputs = readAgencyInputs();
    return buildAgency(inputs, pricingForAgency(inputs.type, inputs.pricePeriod));
}

/* =========================================================
نوع المندوب (داخلي / خارجي) وبدل الانتقال على الوكالات
========================================================= */

function isExternalRepresentative() {
    return document.getElementById("representativeType")?.value === "external";
}

/*
    تغيير عدد بدل الانتقال لوكالة مضافة دون إعادة حساب بقية بنودها،
    باستخدام أسعار بدل الانتقال المطبقة على الوكالة نفسها.
*/
function setAgencyTransportCount(agency, newCount) {

    if (!agency || agency.status === "cancelled") {
        return;
    }

    newCount = Math.max(0, Math.floor(number(newCount)));

    if (!agency.additions) {
        agency.additions = {};
    }

    if (!agency.additionValues) {
        agency.additionValues = {};
    }

    if (!agency.transportSettings || typeof agency.transportSettings.total !== "number") {
        const old = getAgencyTransport(Object.assign({}, agency, { additions: { transport: 1 }, status: "active" }));
        agency.transportSettings = {
            total: old.unitTotal,
            pleadingStamp: old.stamps > 0,
            representativeShare: old.share,
            stampPrice: old.stamps > 0 ? old.stampsValue : number(stampPrices.pleading),
            cashRemainder: old.cash
        };
        if (!agency.transportSettings.total && !agency.transportSettings.cashRemainder) {
            agency.transportSettings = getTransportPricing();
        }
    }

    const settings = agency.transportSettings;
    const oldCount = number(agency.additions.transport);
    const diff = newCount - oldCount;

    if (diff === 0) {
        return;
    }

    const cashDiff = diff * number(settings.cashRemainder);
    const stampDiff = settings.pleadingStamp ? diff : 0;

    agency.additions.transport = newCount;
    agency.additionValues.transport = newCount * number(settings.cashRemainder);
    agency.additionsTotal = number(agency.additionsTotal) + cashDiff;
    agency.pleadingAdditions = number(agency.pleadingAdditions) + stampDiff;
    agency.pleadingRequired = number(agency.pleadingRequired) + stampDiff;
    agency.representativeAmount = number(agency.representativeAmount) + cashDiff;
    agency.transportInAdditions = true;
}

/*
    تغيير نوع وكالة مضافة من سطرها: تُعاد حسابها بأسعار النوع الجديد
    (حسب شهر تاريخ السجل) مع بقاء رقمها وإضافاتها وطوابعها وملاحظاتها.
*/
function changePendingType(index, type) {

    const agency = pendingAgencies[index];

    if (!agency || !AGENCY_NAMES[type] || agency.type === type) {
        return;
    }

    const inputs = agencyInputsOf(agency);
    const wasEligible = isTransportEligible(agency.type);

    inputs.type = type;

    /* صار النوع مشمولاً ببدل الانتقال والمندوب خارجي: بدل واحد كبقية الوكالات */
    if (!wasEligible && isTransportEligible(type) && isExternalRepresentative() && inputs.status !== "cancelled") {
        inputs.additions.transport = 1;
    }

    const updated = buildAgency(inputs, pricingForAgency(type, inputs.pricePeriod), agency.id);

    pendingAgencies[index] = updated;
    lastAddedAgencyId = updated.id;
    renderPendingAgencies();

    notify("<strong>تغيّر نوع الوكالة رقم " + escapeHTML(updated.number) + "</strong><span>" + AGENCY_NAMES[type] +
        " — السعر " + money(updated.basePrice) + "</span>", "success", 3500, true);
}

window.changePendingType = changePendingType;

function changePendingTransport(index, value) {
    const agency = pendingAgencies[index];
    if (!agency) {
        return;
    }
    if (number(value) > 0 && !isTransportEligible(agency.type)) {
        notify("بدل الانتقال لا يُضاف إلى " + (AGENCY_NAMES[agency.type] || "هذا النوع") + ".", "warning");
        renderPendingAgencies();
        return;
    }
    setAgencyTransportCount(agency, value);
    renderPendingAgencies();
}

/*
    حقل بدل الانتقال في نموذج الوكالة يتبع نوع الوكالة:
    الأنواع غير المشمولة يُصفَّر حقلها ويُقفل،
    والمشمولة تأخذ بدلاً واحداً تلقائياً إذا كان المندوب خارجياً.
*/
function syncTransportField() {

    const type = document.getElementById("agencyType")?.value || DEFAULT_AGENCY_TYPE;
    const input = document.getElementById("transportCount");

    if (!input) {
        return;
    }

    syncChoiceChips();

    const group = input.closest(".input-group");
    const eligible = isTransportEligible(type);

    if (!eligible) {
        input.value = 0;
    } else if (isExternalRepresentative() && number(input.value) === 0 && !input.dataset.userZero) {
        input.value = 1;
    }

    input.disabled = !eligible;
    group?.querySelectorAll(".number-btn").forEach(function (button) {
        button.disabled = !eligible;
    });
    group?.classList.toggle("is-disabled", !eligible);

    let hint = group?.querySelector(".transport-hint");
    if (group && !hint) {
        hint = document.createElement("small");
        hint.className = "field-hint transport-hint";
        group.appendChild(hint);
    }
    if (hint) {
        hint.textContent = eligible ? "" : "لا يُضاف لهذا النوع";
    }
}

document.getElementById("agencyType")?.addEventListener("change", function () {
    syncTransportField();
    updatePreview();
});

/* =========================================================
أزرار الاختيار الملونة (نوع الوكالة وحالتها)
تعرض خيارات القائمة المخفية كأزرار بضغطة واحدة، كل نوع بلونه
المعروف في التقارير. القائمة الأصلية تبقى مصدر القيمة لبقية الكود.
========================================================= */

const AGENCY_STATUS_COLORS = {
    active: "#23704f",
    missing: "#8f5f12",
    cancelled: "#a8352c"
};

/*
    مفاتيح أنواع الوكالة (حرف واحد بلا Alt، صفحة إنشاء السجل): متجاورة على لوحة المفاتيح —
    F G H للعامة والخاصة والشرعية، و V B N تحتها للأقل استخداماً.
    تُقرأ بموقع المفتاح (event.code) فتعمل واللوحة عربية أيضاً.
*/
const AGENCY_TYPE_KEYS = {
    general: "F",
    special: "G",
    legal: "H",
    executive: "V",
    certified_general_special: "B",
    certified_legal: "N"
};

function buildChoiceChips(selectId, containerId, colors, minor, keys) {

    const select = document.getElementById(selectId);
    const box = document.getElementById(containerId);

    if (!select || !box) {
        return;
    }

    const chipHTML = function (option) {
        const color = colors[option.value] || "#45577c";
        const key = keys && keys[option.value];
        return '<button type="button" role="radio" class="choice-chip" data-value="' + option.value + '" style="--chip-color:' + color + '"' +
            (key ? ' aria-keyshortcuts="' + key + '" title="اختصار: ' + key + '"' : "") + ">" +
            '<span class="chip-dot" aria-hidden="true"></span>' + escapeHTML(option.textContent.trim()) +
            (key ? '<kbd class="chip-key" aria-hidden="true">' + key + "</kbd>" : "") + "</button>";
    };

    const options = Array.from(select.options);

    /* minor: الخيارات الأقل استخداماً في سطر ثانٍ أصغر وأهدأ */
    if (minor && minor.length) {
        const main = options.filter(function (o) { return minor.indexOf(o.value) === -1; });
        const rest = options.filter(function (o) { return minor.indexOf(o.value) !== -1; });
        box.innerHTML = '<div class="chip-row">' + main.map(chipHTML).join("") + "</div>" +
            '<div class="chip-row chip-row-minor"><span class="chip-row-label">أقل استخداماً</span>' + rest.map(chipHTML).join("") + "</div>";
    } else {
        box.innerHTML = options.map(chipHTML).join("");
    }

    box.addEventListener("click", function (event) {
        const chip = event.target.closest(".choice-chip");
        if (!chip || select.value === chip.dataset.value) {
            return;
        }
        select.value = chip.dataset.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        syncChoiceChips();
        chip.focus();
    });

    /* الأسهم تنقل بين الخيارات (اليسار = التالي في الواجهة العربية) */
    box.addEventListener("keydown", function (event) {
        const keys = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
        if (!(event.key in keys)) {
            return;
        }
        event.preventDefault();
        const chips = Array.from(box.querySelectorAll(".choice-chip"));
        const current = chips.findIndex(function (c) { return c.dataset.value === select.value; });
        const next = chips[(current + keys[event.key] + chips.length) % chips.length];
        next.click();
    });

    syncChoiceChips();
}

function syncChoiceChips() {

    [["agencyType", "agencyTypeChips"], ["agencyStatus", "agencyStatusChips"]].forEach(function (pair) {

        const select = document.getElementById(pair[0]);
        const box = document.getElementById(pair[1]);

        if (!select || !box) {
            return;
        }

        box.querySelectorAll(".choice-chip").forEach(function (chip) {
            const on = chip.dataset.value === select.value;
            chip.classList.toggle("is-on", on);
            chip.setAttribute("aria-checked", on ? "true" : "false");
            chip.tabIndex = on ? 0 : -1;
        });
    });
}

document.getElementById("agencyStatus")?.addEventListener("change", syncChoiceChips);

onReady(function () {
    buildChoiceChips("agencyType", "agencyTypeChips", AGENCY_TYPE_COLORS, ["executive", "certified_general_special", "certified_legal"], AGENCY_TYPE_KEYS);
    buildChoiceChips("agencyStatus", "agencyStatusChips", AGENCY_STATUS_COLORS);
});

/* =========================================================
شريط ملخص السجل الثابت أسفل صفحة الإنشاء
========================================================= */

function updateRecordDock() {

    const count = document.getElementById("dockCount");

    if (!count) {
        return;
    }

    let grand = 0;
    let rep = 0;

    pendingAgencies.forEach(function (agency) {
        grand += getAgencyGrandTotal(agency);
        rep += agency.status === "cancelled" ? 0 : number(agency.representativeAmount);
    });

    count.textContent = pendingAgencies.length;
    document.getElementById("dockGrand").textContent = money(grand);
    document.getElementById("dockRep").textContent = money(rep);

    /* آخر وكالة أُضيفت: رقمها ونوعها بلونه */
    const lastBox = document.getElementById("dockLast");

    if (lastBox) {
        const last =
            pendingAgencies.find(function (a) { return a.id === lastAddedAgencyId; }) ||
            pendingAgencies[pendingAgencies.length - 1];

        lastBox.classList.toggle("is-empty", !last);
        lastBox.innerHTML = last
            ? '<dt>آخر وكالة</dt><dd><span class="dock-last-no" style="--c:' + (AGENCY_TYPE_COLORS[last.type] || "#888") + '">' + escapeHTML(last.number) + "</span>" +
              escapeHTML(AGENCY_NAMES[last.type] || "") + (last.status !== "active" ? " · " + getAgencyStatusName(last.status) : "") + "</dd>"
            : "<dt>آخر وكالة</dt><dd>—</dd>";
    }
}

/*
    «وكالة مماثلة»: نفس نوع وحالة وإضافات وطوابع آخر وكالة أُضيفت،
    بالرقم التالي، بضغطة واحدة. الحساب يتم بنفس طريقة الإضافة العادية.
*/
function addSimilarAgency() {

    const last =
        pendingAgencies.find(function (a) { return a.id === lastAddedAgencyId; }) ||
        pendingAgencies[pendingAgencies.length - 1];

    if (!last) {
        notify("أضف وكالة أولاً، ثم استخدم «وكالة مماثلة» لتكرارها برقم جديد.", "warning");
        return;
    }

    const set = function (id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    const ad = last.additions || {};
    const ms = last.stamps || last.missingStamps || {};

    set("agencyNumber", getNextAgencyNumber());
    set("agencyType", last.type);
    set("agencyStatus", last.status || "active");
    set("saveCount", number(ad.save));
    set("signatureCount", number(ad.signature));
    set("inheritanceCount", number(ad.inheritance));
    set("childrenCount", number(ad.children));
    set("agentsCount", number(ad.agents));
    set("originalityCount", number(ad.originality));
    set("missingPleading", number(ms.pleading));
    set("missingAmbulance", number(ms.ambulance));
    set("missingAid", number(ms.aid));
    set("agencyNotes", "");

    const dup = document.getElementById("agencyDuplicate");
    if (dup) dup.checked = false;

    const transport = document.getElementById("transportCount");
    if (transport) {
        transport.value = number(ad.transport);
        if (number(ad.transport) === 0) transport.dataset.userZero = "1"; else delete transport.dataset.userZero;
    }

    syncTransportField();
    updatePreview();

    document.getElementById("addAgencyBtn")?.click();
}

window.addSimilarAgency = addSimilarAgency;

/*
    Ctrl + S (أو Ctrl + Enter) يضيف الوكالة من أي حقل في صفحة الإنشاء.
    في هذه الصفحة يُمنع حفظ المتصفح للصفحة (Ctrl + S) حتى لا يتعارض،
    وفي بقية الصفحات يبقى سلوك المتصفح كما هو.
    لا نستخدم Enter وحده حتى لا تُضاف وكالة إضافية بضغطة غير مقصودة.
*/
document.addEventListener("keydown", function (event) {

    const isAddShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey && !event.altKey &&
        (event.key === "Enter" || event.code === "KeyS" || event.key === "s" || event.key === "S" || event.key === "س");

    if (
        !isAddShortcut ||
        document.querySelector("dialog[open]") ||
        !document.getElementById("newRecordSection")?.classList.contains("active-section")
    ) {
        return;
    }

    event.preventDefault();
    document.getElementById("addAgencyBtn")?.click();
});

/* إذا صفّر المستخدم البدل يدوياً لا نعيده تلقائياً حتى الوكالة التالية */
document.getElementById("transportCount")?.addEventListener("input", function () {
    if (number(this.value) === 0) {
        this.dataset.userZero = "1";
    } else {
        delete this.dataset.userZero;
    }
});

window.changePendingTransport = changePendingTransport;

function updateRepresentativeTypeHint() {

    const hint = document.getElementById("representativeTypeHint");

    if (!hint) {
        return;
    }

    if (!isExternalRepresentative()) {
        hint.textContent = "";
        return;
    }

    const t = getTransportPricing();

    hint.textContent =
        "بدل انتقال " + money(t.total) + " لكل وكالة: " +
        (t.pleadingStamp ? "طابع مرافعة " + money(t.stampPrice) + " + " : "") +
        "حصة المندوب " + money(t.representativeShare) +
        " + حصة الفرع " + money(t.cashRemainder);
}

function applyRepresentativeType() {

    const external = isExternalRepresentative();
    const formTransport = document.getElementById("transportCount");

    const finish = function () {
        updateRepresentativeTypeHint();
        syncTransportField();
        renderPendingAgencies();
        updatePreview();

        if (typeof saveRecordDraft === "function") {
            saveRecordDraft();
        }
    };

    if (external) {

        /* البدل يُضاف فقط للعامة والخاصة والشرعية */
        pendingAgencies.forEach(function (agency) {
            if (
                isTransportEligible(agency.type) &&
                number(agency.additions && agency.additions.transport) === 0
            ) {
                setAgencyTransportCount(agency, 1);
            }
        });

        if (formTransport) {
            delete formTransport.dataset.userZero;
            if (number(formTransport.value) === 0) {
                formTransport.value = 1;
            }
        }

        finish();

    } else {

        const withTransport = pendingAgencies.filter(function (agency) {
            return number(agency.additions && agency.additions.transport) > 0;
        });

        if (formTransport) {
            formTransport.value = 0;
        }

        if (withTransport.length === 0) {
            finish();
            return;
        }

        appConfirm({
            title: "إزالة بدل الانتقال",
            message: "المندوب أصبح داخلياً. هل تريد إزالة بدل الانتقال من " + withTransport.length + " وكالة مضافة؟",
            confirmText: "إزالة البدل",
            cancelText: "إبقاء البدل"
        }).then(function (ok) {
            if (ok) {
                withTransport.forEach(function (agency) {
                    setAgencyTransportCount(agency, 0);
                });
            }
            finish();
        });
    }
}

document.getElementById("representativeType")?.addEventListener("change", applyRepresentativeType);

/* =========================================================
إضافة وكالة
========================================================= */

const addAgencyBtn =
document.getElementById(
"addAgencyBtn"
);

if (addAgencyBtn) {

addAgencyBtn.addEventListener(
    "click",
    function () {

        if (
            !currentUser ||
            currentUser.role ===
            "viewer"
        ) {

            notify("ليس لديك صلاحية.", "error");

            return;

        }

        /* ضغطتان سريعتان (نقر مزدوج) لا تضيفان وكالتين */
        if (addAgencyBtn.dataset.busy) {
            return;
        }

        addAgencyBtn.dataset.busy = "1";
        setTimeout(function () {
            delete addAgencyBtn.dataset.busy;
        }, 700);


        const agency =
            getAgencyFromForm();


        /*
            الرقم يُقرأ من حقل "رقم الوكالة" كما هو
            (getAgencyFromForm تتكفل بهذا، وتضع رقماً
            تلقائياً فقط إذا كان الحقل فارغاً).
            هذا يحافظ على رقم الوكالة الأصلي عند التعديل
            بدل استبداله برقم جديد.
        */

        const commit = function () {

            pendingAgencies.push(
                agency
            );

            lastAddedAgencyId = agency.id;

            renderPendingAgencies();

            clearAgencyForm();

            announceAgencyAdded(agency);
        };

        /*
            حماية من الإضافة المكررة دون انتباه:
            إذا كان رقم الوكالة موجوداً في هذا السجل ولم تُعلَّم «مكررة»
            نطلب التأكيد قبل الإضافة.
        */
        const sameNumber = pendingAgencies.some(function (item) {
            return String(item.number).trim() === String(agency.number).trim();
        });

        if (sameNumber && !agency.duplicate) {

            const n = parseInt(agency.number, 10);
            const numeric = String(n) === String(agency.number).trim();
            const following = numeric ? pendingAgencies.filter(function (item) {
                const v = parseInt(item.number, 10);
                return Number.isFinite(v) && v >= n;
            }).length : 0;

            const choices = [];

            /*
                وكالة منسية: تُدرج بهذا الرقم، وكل وكالة رقمها مساوٍ له أو
                أكبر يزداد رقمها 1 (بياناتها كما هي)، فيصبح التسلسل مطابقاً للدفتر.
            */
            if (numeric) {
                choices.push({ value: "insert", label: "إدراجها وإزاحة " + following + " وكالة +1", kind: "primary" });
            }
            choices.push({ value: "duplicate", label: "إضافتها كمكررة", kind: "secondary" });

            appChoose({
                title: "رقم الوكالة " + agency.number + " مستخدم في هذا السجل",
                message: numeric
                    ? "إن كانت هذه وكالة منسية: «إدراجها» يضعها بالرقم " + agency.number + " ويزيد أرقام الوكالات من " + agency.number + " فما بعد بواحد (" + following + " وكالة)، مع بقاء بيانات كل وكالة كما هي. أو أضفها كمكررة بنفس الرقم."
                    : "الوكالة رقم " + agency.number + " موجودة في هذا السجل. هل تريد إضافتها كمكررة؟",
                choices: choices
            }).then(function (choice) {

                if (choice === "insert") {

                    pendingAgencies.forEach(function (item) {
                        const v = parseInt(item.number, 10);
                        if (Number.isFinite(v) && String(v) === String(item.number).trim() && v >= n) {
                            item.number = String(v + 1);
                        }
                    });

                    /* إدراجها في مكانها حسب الترتيب */
                    const at = pendingAgencies.findIndex(function (item) {
                        const v = parseInt(item.number, 10);
                        return Number.isFinite(v) && v > n;
                    });

                    if (at === -1) {
                        pendingAgencies.push(agency);
                    } else {
                        pendingAgencies.splice(at, 0, agency);
                    }

                    lastAddedAgencyId = agency.id;
                    renderPendingAgencies();
                    clearAgencyForm();
                    announceAgencyAdded(agency);
                    notify("<strong>أُدرجت الوكالة رقم " + escapeHTML(agency.number) + "</strong><span>وزادت أرقام " + following +
                        " وكالة بعدها بواحد. راجع التسلسل ثم احفظ السجل.</span>", "success", 6000, true);

                } else if (choice === "duplicate") {
                    agency.duplicate = true;
                    commit();
                }
            });
            return;
        }

        commit();

    }
);

/* رسالة واضحة بعد كل إضافة، مع وميض عدّاد الوكالات */
function announceAgencyAdded(agency) {

    focusNextAgencyNumber();

    notify(
        "<strong>تمت إضافة الوكالة رقم " + escapeHTML(agency.number) + "</strong>" +
        "<span>" + escapeHTML(AGENCY_NAMES[agency.type] || agency.typeName || "") +
        " — " + getAgencyStatusName(agency.status) +
        " — عدد الوكالات الآن: " + pendingAgencies.length + "</span>",
        "success",
        3500,
        true
    );

    const counter = document.getElementById("agencyCounter");

    if (counter) {
        counter.classList.remove("bump");
        void counter.offsetWidth;
        counter.classList.add("bump");
    }
}

}

/* =========================================================
بنود الوكالة (نقص الطوابع، الإضافات، بدل الانتقال)
عمود طولي واحد بجانب النموذج، كل مجموعة بلون ثابت في كل مكان:
النقص عنابي، الإضافات ذهبي، البدل أزرق. Alt + المفتاح يزيد البند
واحداً ومع Shift يُنقصه، عبر نفس الحقول (لا حساب جديد).
========================================================= */

const QUICK_ITEMS = [
    { id: "missingPleading", group: "missing", label: "نقص مرافعة", key: "1", code: "Digit1" },
    { id: "missingAmbulance", group: "missing", label: "نقص إسعاف", key: "2", code: "Digit2" },
    { id: "missingAid", group: "missing", label: "نقص معونة", key: "3", code: "Digit3" },
    { id: "signatureCount", group: "add", label: "توقيع إضافي", key: "G", code: "KeyG" },
    { id: "saveCount", group: "add", label: "حفظ", key: "H", code: "KeyH" },
    { id: "originalityCount", group: "add", label: "أصالة", key: "A", code: "KeyA" },
    { id: "inheritanceCount", group: "add", label: "إضافة إلى التركة", key: "R", code: "KeyR" },
    { id: "childrenCount", group: "add", label: "ولاية عن الأولاد", key: "W", code: "KeyW" },
    { id: "agentsCount", group: "add", label: "وكيل عن", key: "K", code: "KeyK" },
    { id: "transportCount", group: "transport", label: "بدل انتقال", key: "T", code: "KeyT" }
];

/* تغيير بند بمقدار +1 أو −1 عبر حقله الأصلي (نفس مسار أزرار + و −) */
function stepQuickItem(id, delta) {

    const input = document.getElementById(id);

    if (!input) {
        return;
    }

    if (input.disabled) {
        notify(id === "transportCount" ? "بدل الانتقال لا يُضاف لهذا النوع من الوكالات." : "هذا البند غير متاح الآن.", "warning", 2500);
        return;
    }

    const value = Math.max(0, number(input.value) + delta);

    if (value === number(input.value)) {
        return;
    }

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

/* تلوين الحقول غير الصفرية + أرقام الأزرار + سطر «هذه الوكالة» */
function syncQuickItems() {

    QUICK_ITEMS.forEach(function (item) {
        const input = document.getElementById(item.id);
        if (!input) return;
        const row = input.closest(".input-group");
        row?.classList.toggle("has-value", number(input.value) > 0);
        row?.classList.toggle("is-disabled", !!input.disabled);
    });

    renderAgencyRecap();
}

function renderAgencyRecap() {

    const box = document.getElementById("agencyRecap");

    if (!box) {
        return;
    }

    const type = document.getElementById("agencyType")?.value || DEFAULT_AGENCY_TYPE;
    const status = document.getElementById("agencyStatus")?.value || "active";
    const num = (document.getElementById("agencyNumber")?.value || "").trim();

    let html = '<span class="recap-title">هذه الوكالة' + (num ? " <b>" + escapeHTML(num) + "</b>" : "") + ":</span>" +
        '<span class="recap-pill recap-type">' + agencyTypeDot(type) + escapeHTML(AGENCY_NAMES[type] || "") + "</span>";

    if (status !== "active") {
        html += '<span class="recap-pill recap-status">' + getAgencyStatusName(status) + "</span>";
    }

    const items = QUICK_ITEMS.filter(function (item) {
        return number(document.getElementById(item.id)?.value) > 0;
    });

    html += items.length
        ? items.map(function (item) {
            const n = number(document.getElementById(item.id).value);
            return '<span class="recap-pill grp-' + item.group + '">' + item.label + (n > 1 ? " × " + n : "") + "</span>";
        }).join("")
        : '<span class="recap-empty">بدون إضافات أو نقص</span>';

    box.innerHTML = html;
}

/* شارات بنود وكالة محفوظة/مضافة بنفس ألوان المجموعات */
function agencyItemPillsHTML(agency) {

    const ad = agency.additions || {};
    const ms = agency.stamps || agency.missingStamps || {};
    const values = {
        missingPleading: ms.pleading, missingAmbulance: ms.ambulance, missingAid: ms.aid,
        signatureCount: ad.signature, saveCount: ad.save, originalityCount: ad.originality,
        inheritanceCount: ad.inheritance, childrenCount: ad.children, agentsCount: ad.agents,
        transportCount: ad.transport
    };

    const pills = QUICK_ITEMS.filter(function (item) { return number(values[item.id]) > 0; }).map(function (item) {
        const n = number(values[item.id]);
        return '<span class="recap-pill grp-' + item.group + '">' + item.label + (n > 1 ? " × " + n : "") + "</span>";
    });

    return pills.length ? '<span class="item-pills">' + pills.join("") + "</span>" : "";
}

/* Alt + مفتاح البند (يعمل بأي لغة لوحة مفاتيح لأنه يعتمد على موضع المفتاح) */
document.addEventListener("keydown", function (event) {

    if (!event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    if (
        document.querySelector("dialog[open]") ||
        !document.getElementById("newRecordSection")?.classList.contains("active-section")
    ) {
        return;
    }

    const item = QUICK_ITEMS.find(function (i) { return i.code === event.code; });

    if (!item) {
        return;
    }

    event.preventDefault();
    stepQuickItem(item.id, event.shiftKey ? -1 : 1);

    const wrap = document.querySelector('[data-qi-item="' + item.id + '"]');
    if (wrap) {
        wrap.classList.remove("flash");
        void wrap.offsetWidth;
        wrap.classList.add("flash");
    }
});

/*
    نوع الوكالة بحرف واحد (F G H / V B N). يعمل حين يكون التركيز على رقم الوكالة أو خانات البنود
    الرقمية أو خارج أي حقل كتابة — لا داخل الملاحظات أو اسم المكتب والمندوب.
    التركيز يبقى مكانه حتى يتابع المستخدم الإدخال.
*/
document.addEventListener("keydown", function (event) {

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) {
        return;
    }

    if (
        document.querySelector("dialog[open]") ||
        !document.getElementById("newRecordSection")?.classList.contains("active-section")
    ) {
        return;
    }

    const letter = /^Key([A-Z])$/.exec(event.code || "");
    if (!letter) return;
    const type = Object.keys(AGENCY_TYPE_KEYS).find(function (t) { return AGENCY_TYPE_KEYS[t] === letter[1]; });
    if (!type) return;

    const target = event.target;
    const editable = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    const numericAgencyField = target && (target.id === "agencyNumber" || (target.matches && target.matches("#agencyItems input[data-num]")));
    if (editable && !numericAgencyField) return;

    const select = document.getElementById("agencyType");
    if (!select) return;

    event.preventDefault();

    if (select.value !== type) {
        select.value = type;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        syncChoiceChips();
    }

    const chip = document.querySelector('#agencyTypeChips .choice-chip[data-value="' + type + '"]');
    if (chip) {
        chip.classList.remove("flash");
        void chip.offsetWidth;
        chip.classList.add("flash");
    }
});

/* التركيز على رقم الوكالة: بطاقة الإضافة كاملة تظهر في الشاشة (بدون تمرير يدوي) */
document.getElementById("agencyNumber")?.addEventListener("focus", function () {
    const card = this.closest(".content-card");
    if (!card) return;
    /* بعد تمرير المتصفح الخاص بالتركيز: نحاذي البطاقة لأعلى الشاشة إن لم تكن ظاهرة كلها */
    setTimeout(function () {
        const box = card.getBoundingClientRect();
        const dock = document.getElementById("recordDock");
        const bottomLimit = dock && dock.offsetParent ? dock.getBoundingClientRect().top : window.innerHeight;
        if (box.top < 0 || box.bottom > bottomLimit) {
            window.scrollTo({ top: window.scrollY + box.top - 12 });
        }
    }, 0);
});

/* بعد إضافة وكالة: المؤشر يعود لرقم الوكالة التالية جاهزاً للكتابة */
function focusNextAgencyNumber() {
    const input = document.getElementById("agencyNumber");
    if (!input || !document.getElementById("newRecordSection")?.classList.contains("active-section")) return;
    try { input.focus({ preventScroll: true }); input.select(); } catch (e) {}
}

onReady(function () {
    try { syncQuickItems(); } catch (e) {}
});


/* =========================================================
فحص تسلسل أرقام الوكالات عند حفظ السجل (اختياري)
ينبّه للأرقام الناقصة داخل المدى وللأرقام المكررة دون قصد.
السجلات الناقصة فعلاً تُحفظ عادي بخيار «حفظ على أي حال».
الإيقاف/التشغيل تفضيل واجهة (audit_ui_seq_check) وليس بيانات.
========================================================= */

const SEQ_CHECK_KEY = "audit_ui_seq_check";

function isSeqCheckOn() {
    try { return localStorage.getItem(SEQ_CHECK_KEY) !== "off"; } catch (e) { return true; }
}

function setSeqCheck(on) {
    try { localStorage.setItem(SEQ_CHECK_KEY, on ? "on" : "off"); } catch (e) {}
    const box = document.getElementById("seqCheckToggle");
    if (box) box.checked = !!on;
}

function agencySequenceIssues(agencies) {

    const seen = {};
    const duplicates = [];
    const nums = [];

    (agencies || []).forEach(function (agency) {
        const raw = normalizeDigits(String(agency.number || "")).trim();
        if (!/^\d+$/.test(raw)) return;
        const n = Number(raw);
        if (seen[n] && !agency.duplicate && duplicates.indexOf(n) === -1) duplicates.push(n);
        seen[n] = true;
        nums.push(n);
    });

    if (!nums.length) return { missing: [], duplicates: duplicates };

    const min = Math.min.apply(null, nums);
    const max = Math.max.apply(null, nums);
    const missing = [];

    /* مدى كبير جداً (أرقام غير متسلسلة أصلاً) لا يُفحص */
    if (max - min <= 5000) {
        for (let n = min; n <= max; n++) {
            if (!seen[n]) missing.push(n);
        }
    }

    return { missing: missing, duplicates: duplicates.sort(function (a, b) { return a - b; }) };
}

/* أرقام متتالية تُكتب كمدى: 117–119 */
function formatNumberList(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
        let j = i;
        while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
        out.push(j > i + 1 ? list[i] + "–" + list[j] : (j === i + 1 ? list[i] + "، " + list[j] : String(list[i])));
        i = j;
    }
    return out.join("، ");
}

function checkAgencySequenceThen(agencies, next) {

    if (!isSeqCheckOn()) {
        next();
        return;
    }

    const issues = agencySequenceIssues(agencies);

    if (!issues.missing.length && !issues.duplicates.length) {
        next();
        return;
    }

    const parts = [];
    if (issues.missing.length) {
        parts.push("أرقام ناقصة (" + issues.missing.length + "): " + formatNumberList(issues.missing.slice(0, 60)) + (issues.missing.length > 60 ? "…" : ""));
    }
    if (issues.duplicates.length) {
        parts.push("أرقام مكررة: " + formatNumberList(issues.duplicates.slice(0, 60)));
    }

    appChoose({
        title: "تسلسل أرقام الوكالات",
        message: parts.join(" — ") + ". إذا كان السجل ناقصاً فعلاً احفظه عادي.",
        choices: [
            { value: "save", label: "حفظ على أي حال", kind: "primary" },
            { value: "review", label: "مراجعة الوكالات", kind: "secondary" },
            { value: "off", label: "حفظ وإيقاف هذا الفحص", kind: "secondary" }
        ]
    }).then(function (choice) {
        if (choice === "save") next();
        if (choice === "off") {
            setSeqCheck(false);
            notify("أُوقف فحص التسلسل. يمكن تشغيله من «النسخ الاحتياطي» في قسم المستخدمين.", "info", 6000);
            next();
        }
        if (choice === "review") {
            document.getElementById("pendingAgencies")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
}

document.getElementById("seqCheckToggle")?.addEventListener("change", function () {
    setSeqCheck(this.checked);
});

onReady(function () {
    const box = document.getElementById("seqCheckToggle");
    if (box) box.checked = isSeqCheckOn();
});

/* =========================================================
Ctrl + Z: إلغاء آخر وكالة مضافة (صفحة إنشاء السجل فقط)
لا يعمل أثناء الكتابة في حقل نصي حتى يبقى «تراجع» الكتابة العادي،
إلا في حقل رقم الوكالة وهو على الرقم التالي التلقائي (بعد الإضافة مباشرة).
========================================================= */

let removedAgencyUndo = null;

function undoLastAgency() {

    if (!pendingAgencies.length) {
        notify("لا توجد وكالة مضافة لإلغائها.", "info", 2500);
        return;
    }

    let index = pendingAgencies.findIndex(function (a) { return a.id && a.id === lastAddedAgencyId; });
    if (index === -1) index = pendingAgencies.length - 1;

    const agency = pendingAgencies.splice(index, 1)[0];
    removedAgencyUndo = { agency: agency, index: index };
    lastAddedAgencyId = pendingAgencies.length ? pendingAgencies[pendingAgencies.length - 1].id : null;

    renderPendingAgencies();
    const numberInput = document.getElementById("agencyNumber");
    if (numberInput) numberInput.value = getNextAgencyNumber();
    updatePreview();
    if (typeof saveRecordDraft === "function") saveRecordDraft();

    notify("<strong>أُلغيت الوكالة رقم " + escapeHTML(agency.number) + "</strong><span>" + escapeHTML(AGENCY_NAMES[agency.type] || "") +
        " — عدد الوكالات الآن: " + pendingAgencies.length + "</span>" +
        '<span class="toast-actions"><button type="button" class="act-btn" onclick="restoreRemovedAgency()">تراجع عن الإلغاء</button></span>',
        "warning", 7000, true);
}

function restoreRemovedAgency() {
    if (!removedAgencyUndo) return;
    const item = removedAgencyUndo;
    removedAgencyUndo = null;
    pendingAgencies.splice(Math.min(item.index, pendingAgencies.length), 0, item.agency);
    lastAddedAgencyId = item.agency.id;
    renderPendingAgencies();
    const numberInput = document.getElementById("agencyNumber");
    if (numberInput) numberInput.value = getNextAgencyNumber();
    updatePreview();
    if (typeof saveRecordDraft === "function") saveRecordDraft();
    notify("أُعيدت الوكالة رقم " + escapeHTML(item.agency.number) + ".", "success", 3000);
}

window.undoLastAgency = undoLastAgency;
window.restoreRemovedAgency = restoreRemovedAgency;

document.addEventListener("keydown", function (event) {

    const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey &&
        (event.code === "KeyZ" || event.key === "z" || event.key === "Z");

    if (
        !isUndo ||
        document.querySelector("dialog[open]") ||
        !document.getElementById("newRecordSection")?.classList.contains("active-section")
    ) {
        return;
    }

    const el = document.activeElement;
    const editable = el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type !== "checkbox") || el.isContentEditable);
    const numberUntouched = el && el.id === "agencyNumber" && String(el.value).trim() === String(getNextAgencyNumber());

    if (editable && !numberUntouched) {
        return;
    }

    event.preventDefault();
    undoLastAgency();
});


/* =========================================================
مسح بيانات الوكالة
========================================================= */

const clearAgencyBtn =
document.getElementById(
"clearAgencyBtn"
);

if (clearAgencyBtn) {

clearAgencyBtn.addEventListener(
    "click",
    clearAgencyForm
);

}

/* =========================================================
عرض الوكالات المضافة
========================================================= */

function renderPendingAgencies() {

const container =
    document.getElementById(
        "pendingAgencies"
    );


const counter =
    document.getElementById(
        "agencyCounter"
    );


if (!container) {
    return;
}


if (counter) {

    counter.textContent =
        "عدد الوكالات: " +
        pendingAgencies.length;

}

updateRecordDock();


if (
    pendingAgencies.length ===
    0
) {

    container.innerHTML =
        '<p class="empty-hint">لا توجد وكالات مضافة بعد. أدخل بيانات الوكالة ثم اضغط «إضافة الوكالة».</p>';

    return;

}


const external = isExternalRepresentative();

container.innerHTML =
    pendingAgencies
        .map(
            function (agency, index) {

                const transportCount =
                    number(agency.additions && agency.additions.transport);

                const transport =
                    getAgencyTransport(agency);

                let transportControl = "";

                if (
                    agency.status !== "cancelled" &&
                    ((external && isTransportEligible(agency.type)) || transportCount > 0)
                ) {

                    const options = [0, 1, 2, 3];

                    if (options.indexOf(transportCount) === -1) {
                        options.push(transportCount);
                    }

                    transportControl = `
                        <label class="transport-select">
                            بدل الانتقال
                            <select onchange="changePendingTransport(${index}, this.value)">
                                ${options.map(function (n) {
                                    return '<option value="' + n + '"' + (n === transportCount ? " selected" : "") + ">" +
                                        (n === 0 ? "بدون بدل انتقال" : (n === 1 ? "بدل انتقال" : "بدل انتقال × " + n)) +
                                        "</option>";
                                }).join("")}
                            </select>
                        </label>
                    `;
                }

                return `

                    <div
                        class="agency-item cls-card cls-${agency.status || "active"}${agency.id && agency.id === lastAddedAgencyId ? " is-new" : ""}"
                        style="--cls-color:${getAgencyClass(agency).color};--cls-tint:${hexToRgba(getAgencyClass(agency).color, getAgencyClass(agency).tint)}"
                    >

                        <div class="agency-item-info">

                            <strong>
                                رقم الوكالة:
                                ${escapeHTML(
                                    agency.number
                                )}
                            </strong>

                            ${agencyMarksHTML(agency)}

                            ${agencyItemPillsHTML(agency)}

                            <span>
                                ${escapeHTML(
                                    agency.typeName
                                )}
                            </span>

                            <span>
                                ${
                                    getAgencyStatusName(
                                        agency.status
                                    )
                                }
                            </span>

                            ${
                                agency.duplicate
                                    ? `<span class="badge badge-warning">مكررة</span>`
                                    : ""
                            }

                            <span>
                                سعر الوكالة:
                                ${money(
                                    agency.basePrice
                                )}
                            </span>

                            ${
                                transport.count > 0
                                    ? `<span class="transport-chip">
                                        مع بدل الانتقال:
                                        ${money(getAgencyPriceWithTransport(agency))}
                                        <small>(حصة المندوب ${money(transport.share)})</small>
                                      </span>`
                                    : ""
                            }

                            <span>
                                المبلغ الأساسي للمندوب:
                                ${money(
                                    agency.representativeBase
                                )}
                            </span>

                            <span>
                                الإضافات:
                                ${money(
                                    agency.additionsTotal
                                )}
                            </span>

                            <span>
                                الطوابع الناقصة:
                                ${money(
                                    agency.missingStampsValue
                                )}
                            </span>

                            <span>
                                المطلوب من المندوب:
                                ${money(
                                    agency.representativeAmount
                                )}
                            </span>

                        </div>


                        <div class="button-row">

                            <label class="type-select" title="تغيير نوع الوكالة من سطرها">
                                النوع
                                <select onchange="changePendingType(${index}, this.value)" aria-label="نوع الوكالة رقم ${escapeHTML(agency.number)}">
                                    ${Object.keys(AGENCY_NAMES).map(function (t) {
                                        return '<option value="' + t + '"' + (t === agency.type ? " selected" : "") + ">" + AGENCY_NAMES[t] + "</option>";
                                    }).join("")}
                                </select>
                            </label>

                            ${agency.status === "cancelled" ? "" : `<label class="type-select period-select${agency.pricePeriod || number(agency.customPrice) > 0 ? " is-override" : ""}" title="سعر هذه الوكالة: حسب تاريخ السجل أو فترة أخرى">
                                السعر
                                <select onchange="changePendingPeriod(${index}, this.value)" aria-label="فترة سعر الوكالة رقم ${escapeHTML(agency.number)}">
                                    ${number(agency.customPrice) > 0 ? '<option value="__custom" selected>سعر محدد — ' + money(agency.customPrice) + "</option>" : ""}
                                    ${pricePeriodOptionsHTML(number(agency.customPrice) > 0 ? "__none" : (agency.pricePeriod || ""), agency.type)}
                                </select>
                            </label>`}

                            ${transportControl}

                            <button
                                type="button"
                                class="secondary-btn"
                                onclick="
                                    editPendingAgency(
                                        ${index}
                                    )
                                "
                            >
                                تعديل
                            </button>


                            <button
                                type="button"
                                class="danger-btn"
                                onclick="
                                    removePendingAgency(
                                        ${index}
                                    )
                                "
                            >
                                حذف
                            </button>

                        </div>

                    </div>

                `;

            }
        )
        .join("");

}

/* =========================================================
تعديل وكالة مؤقتة
========================================================= */

function editPendingAgency(index) {

const agency =
    pendingAgencies[index];


if (!agency) {
    return;
}


document.getElementById(
    "agencyNumber"
).value =
    agency.number;


const duplicateCheckbox =
    document.getElementById(
        "agencyDuplicate"
    );

if (duplicateCheckbox) {

    duplicateCheckbox.checked =
        !!agency.duplicate;

}


document.getElementById(
    "agencyType"
).value =
    agency.type;


document.getElementById(
    "agencyStatus"
).value =
    agency.status;

setAgencyPricePeriod(agency.pricePeriod || "");


ensureAgencyPriceControls();

document.getElementById(
    "saveCount"
).value =
    agency.additions.save;


document.getElementById(
    "signatureCount"
).value =
    agency.additions.signature;


document.getElementById(
    "inheritanceCount"
).value =
    agency.additions.inheritance;


document.getElementById(
    "childrenCount"
).value =
    agency.additions.children;


document.getElementById(
    "agentsCount"
).value =
    agency.additions.agents;


document.getElementById(
    "originalityCount"
).value =
    agency.additions.originality || 0;


const editTransportInput =
    document.getElementById(
        "transportCount"
    );

editTransportInput.value =
    number(agency.additions.transport);

/* الحفاظ على اختيار «بدون بدل» المحفوظ للوكالة */
if (number(agency.additions.transport) === 0) {
    editTransportInput.dataset.userZero = "1";
} else {
    delete editTransportInput.dataset.userZero;
}

syncTransportField();


document.getElementById(
    "missingPleading"
).value =
    agency.stamps.pleading;


document.getElementById(
    "missingAmbulance"
).value =
    agency.stamps.ambulance;


document.getElementById(
    "missingAid"
).value =
    agency.stamps.aid;


document.getElementById(
    "agencyNotes"
).value =
    agency.notes || "";


const notesLines =
    (agency.notes || "")
        .split("\n")
        .map(function (line) {
            return line.trim();
        });


const noteNoReceiptCheckbox =
    document.getElementById(
        "noteNoReceipt"
    );

if (noteNoReceiptCheckbox) {

    noteNoReceiptCheckbox.checked =
        notesLines.indexOf(NOTE_NO_RECEIPT) !== -1;

}


const noteNoBondCheckbox =
    document.getElementById(
        "noteNoBond"
    );

if (noteNoBondCheckbox) {

    noteNoBondCheckbox.checked =
        notesLines.indexOf(NOTE_NO_BOND) !== -1;

}


pendingAgencies.splice(
    index,
    1
);


renderPendingAgencies();

updatePreview();

}

window.editPendingAgency =
editPendingAgency;

/* =========================================================
حذف وكالة مؤقتة
========================================================= */

function removePendingAgency(index) {

const agency = pendingAgencies[index];

if (!agency) {
    return;
}

appConfirm({
    title: "حذف الوكالة",
    message: "هل تريد حذف الوكالة رقم " + agency.number + " من هذا السجل؟",
    confirmText: "حذف الوكالة",
    cancelText: "إلغاء",
    danger: true
}).then(function (ok) {

    if (!ok) {
        return;
    }

    const position = pendingAgencies.indexOf(agency);

    if (position !== -1) {
        pendingAgencies.splice(position, 1);
    }

    renderPendingAgencies();

    notify("تم حذف الوكالة رقم " + escapeHTML(agency.number) + ".", "info", 2500);
});

}

window.removePendingAgency =
removePendingAgency;

/* =========================================================
تنظيف نموذج الوكالة
========================================================= */

function clearAgencyForm() {

const numberInput =
    document.getElementById(
        "agencyNumber"
    );


if (numberInput) {

    numberInput.value =
        getNextAgencyNumber();

}


const typeInput =
    document.getElementById(
        "agencyType"
    );


if (typeInput) {

    typeInput.value =
        DEFAULT_AGENCY_TYPE;

}


const statusInput =
    document.getElementById(
        "agencyStatus"
    );


if (statusInput) {

    statusInput.value =
        "active";

}


[
    "saveCount",
    "signatureCount",
    "inheritanceCount",
    "childrenCount",
    "agentsCount",
    "originalityCount",
    "transportCount",
    "missingPleading",
    "missingAmbulance",
    "missingAid"
].forEach(
    function (id) {

        const element =
            document.getElementById(id);


        if (element) {

            element.value = 0;

        }

    }
);


/*
    المندوب الخارجي: بدل الانتقال مفعّل افتراضياً لكل وكالة جديدة
    من الأنواع المشمولة فقط (عامة، خاصة، شرعية).
*/

const transportInput =
    document.getElementById(
        "transportCount"
    );

if (transportInput) {

    delete transportInput.dataset.userZero;

}

syncTransportField();


const notes =
    document.getElementById(
        "agencyNotes"
    );


if (notes) {

    notes.value = "";

}


[
    "agencyDuplicate",
    "noteNoReceipt",
    "noteNoBond"
].forEach(
    function (id) {

        const checkbox =
            document.getElementById(id);


        if (checkbox) {

            checkbox.checked = false;

        }

    }
);


ensureAgencyPriceControls();

loadCurrentAgencyPrices();

updatePreview();

}

/* =========================================================
المعاينة الفورية
========================================================= */

function updatePreview() {

/* ألوان البنود وسطر «هذه الوكالة» (قد تُستدعى قبل تعريفها أثناء التحميل) */
try { syncQuickItems(); } catch (e) {}


const status =
    document.getElementById(
        "agencyStatus"
    )?.value ||
    "active";


const cancelled =
    status ===
    "cancelled";


const additions = {

    save:
        number(
            document.getElementById(
                "saveCount"
            )?.value
        ),

    signature:
        number(
            document.getElementById(
                "signatureCount"
            )?.value
        ),

    inheritance:
        number(
            document.getElementById(
                "inheritanceCount"
            )?.value
        ),

    children:
        number(
            document.getElementById(
                "childrenCount"
            )?.value
        ),

    agents:
        number(
            document.getElementById(
                "agentsCount"
            )?.value
        ),

    originality:
        number(
            document.getElementById(
                "originalityCount"
            )?.value
        ),

    transport:
        isTransportEligible(
            document.getElementById("agencyType")?.value || DEFAULT_AGENCY_TYPE
        )
            ? number(
                document.getElementById(
                    "transportCount"
                )?.value
            )
            : 0

};


const missing = {

    pleading:
        number(
            document.getElementById(
                "missingPleading"
            )?.value
        ),

    ambulance:
        number(
            document.getElementById(
                "missingAmbulance"
            )?.value
        ),

    aid:
        number(
            document.getElementById(
                "missingAid"
            )?.value
        )

};


const pricing =
    getCurrentAgencyPricing();


const additionsResult =
    calculateAdditions(
        additions,
        pricing
    );


const stamps =
    calculateStamps(
        additionsResult,
        missing,
        cancelled
    );


const transportCash =
    additions.transport *
    number(
        pricing
            .transport
            .cashRemainder
    );


const representative =
    calculateRepresentativeAmount(
        pricing.representative,
        additionsResult.total,
        stamps.missingValue,
        0,
        cancelled
    );


const base =
    cancelled
        ? 0
        : number(
            pricing.agency
        );


const baseElement =
    document.getElementById(
        "previewBasePrice"
    );


const additionsElement =
    document.getElementById(
        "previewAdditions"
    );


const stampsElement =
    document.getElementById(
        "previewStamps"
    );


const pleadingElement =
    document.getElementById(
        "previewPleadingRequired"
    );


const transportElement =
    document.getElementById(
        "previewTransportRepresentative"
    );


const representativeElement =
    document.getElementById(
        "previewRepresentativeAmount"
    );


if (baseElement) {

    baseElement.textContent =
        money(base);

}


if (additionsElement) {

    additionsElement.textContent =
        money(
            additionsResult.total
        );

}


if (stampsElement) {

    stampsElement.textContent =
        money(
            stamps.missingValue
        );

}


if (pleadingElement) {

    pleadingElement.textContent =
        stamps.requiredPleading;

}


const priceWithTransportElement =
    document.getElementById(
        "previewPriceWithTransport"
    );

if (priceWithTransportElement) {

    priceWithTransportElement.textContent =
        money(
            cancelled
                ? 0
                : base + additions.transport * number(pricing.transport.total)
        );

}


/*
    حصة المندوب من بدل الانتقال
    لا تدخل ضمن المبلغ المطلوب.
    نعرضها فقط للمعلومات.
*/

const transportRepresentative =
    additions.transport *
    number(
        pricing
            .transport
            .representativeShare
    );


if (transportElement) {

    transportElement.textContent =
        money(
            transportRepresentative
        );

}


if (representativeElement) {

    representativeElement.textContent =
        money(
            representative
        );

}

}

/* =========================================================
تحديث الحساب عند التغيير
========================================================= */

[
"agencyType",
"agencyStatus"
]
.forEach(
function (id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.addEventListener(
            "input",
            updatePreview
        );

        element.addEventListener(
            "change",
            updatePreview
        );

    }

}

);

[
"saveCount",
"signatureCount",
"inheritanceCount",
"childrenCount",
"agentsCount",
"originalityCount",
"transportCount",
"missingPleading",
"missingAmbulance",
"missingAid"
]
.forEach(
function (id) {

    const element =
        document.getElementById(id);


    if (element) {

        element.addEventListener(
            "input",
            updatePreview
        );

    }

}

);

/* =========================================================
حفظ السجل
========================================================= */

const recordForm =
document.getElementById(
"recordForm"
);

if (recordForm) {

recordForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        if (
            !currentUser ||
            currentUser.role ===
            "viewer"
        ) {

            notify("ليس لديك صلاحية.", "error");

            return;

        }


        if (
            pendingAgencies.length ===
            0
        ) {

            notify("يجب إضافة وكالة واحدة على الأقل.", "error");

            return;

        }


        const recordNumber =
            document.getElementById(
                "recordNumber"
            ).value.trim();


        const officeName =
            document.getElementById(
                "officeName"
            ).value.trim();


        const representativeName =
            document.getElementById(
                "representativeName"
            ).value.trim();


        if (
            !recordNumber ||
            !officeName ||
            !representativeName
        ) {

            const missingField = !recordNumber ? "recordNumber" : !officeName ? "officeName" : "representativeName";
            const missingName = { recordNumber: "رقم السجل", officeName: "اسم المكتب", representativeName: "اسم المندوب" }[missingField];

            notify("يرجى تعبئة «" + missingName + "» في بيانات السجل أعلى الصفحة.", "error");

            const field = document.getElementById(missingField);
            field?.scrollIntoView({ behavior: "smooth", block: "center" });
            field?.focus({ preventScroll: true });

            return;

        }


        const editingId =
            document.getElementById(
                "editingRecordId"
            ).value;


        const oldRecord =
            records.find(
                function (record) {

                    return (
                        record.id ===
                        editingId
                    );

                }
            );


        const record = {

            id:
                editingId ||
                generateId(),

            recordNumber:
                recordNumber,

            officeName:
                officeName,

            representativeName:
                representativeName,

            representativeType:
                isExternalRepresentative()
                    ? "external"
                    : "internal",

            recordDate:
                document.getElementById(
                    "recordDate"
                )?.value ||
                (oldRecord ? getRecordDay(oldRecord) : todayDay()),

            agencies:
                JSON.parse(
                    JSON.stringify(
                        pendingAgencies
                    )
                ),

            /* مدقق السجل: داخل البرنامج فقط، لا يظهر في التقارير */
            auditors:
                getFormAuditors(),

            createdAt:
                oldRecord
                    ? oldRecord.createdAt
                    : new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        };


        /*
            منع تكرار السجلات: رقم سجل موجود مسبقاً (لسجل آخر) يحتاج تأكيداً،
            حتى لا يُحفظ نفس السجل مرتين دون انتباه.
        */
        const sameRecord = records.find(function (r) {
            return r.id !== record.id && String(r.recordNumber).trim() === recordNumber;
        });

        const proceed = function () {

            /* نسخة من السجلات قبل التغيير: إن فشل الحفظ نرجع إليها */
            const recordsBefore = records.slice();

            const index =
                editingId
                    ? records.findIndex(
                        function (item) {

                            return (
                                item.id ===
                                editingId
                            );

                        }
                    )
                    : -1;

            /*
                سجل قيد التعديل لم يعد موجوداً (مسودة قديمة، أو استعادة نسخة
                احتياطية): يُحفظ كسجل جديد بدل أن يضيع بصمت.
            */
            if (index !== -1) {

                records[index] =
                    record;

            } else {

                records.push(
                    record
                );

            }

            /* زر الحفظ يتوقف حتى ينتهي الحفظ (لا حفظ مزدوج) */
            const submitButtons = recordForm.querySelectorAll('button[type="submit"]');
            submitButtons.forEach(function (b) { b.disabled = true; });

            persistRecords().then(function () {

                rememberAuditors(record.auditors);

                /* الحفظ تمّ: أي خطأ في تحديث العرض بعده لا يُلغي الحفظ */
                [resetRecordForm, renderRecords, updateDashboard, renderReports].forEach(function (step) {
                    try {
                        step();
                    } catch (error) {
                        console.error("After-save step failed:", step.name, error);
                    }
                });

                notify(
                    "<strong>" + (index !== -1 ? "تم تعديل السجل بنجاح" : "تم حفظ السجل بنجاح") + "</strong>" +
                    "<span>سجل " + escapeHTML(record.recordNumber) + " — " + record.agencies.length + " وكالة</span>",
                    "success",
                    4000,
                    true
                );

                /* نسخة احتياطية تلقائية بعد كل سجل (أو تذكير إن تعذّرت) */
                try {
                    autoBackupAfterSave().catch(function (error) { console.error("Auto backup:", error); });
                } catch (error) {
                    console.error("Auto backup:", error);
                }

                switchSection(
                    "recordsSection"
                );

            }).catch(function (error) {

                records = recordsBefore;

                console.error("Save record failed:", error);

                notify(
                    "<strong>لم يُحفظ السجل</strong><span>" +
                    (isQuotaError(error)
                        ? "مساحة التخزين في المتصفح ممتلئة. حمّل نسخة احتياطية من قسم المستخدمين ثم أخبر المسؤول."
                        : "حدث خطأ أثناء الحفظ: " + escapeHTML(error && error.message || error)) +
                    " بيانات السجل ما زالت في النموذج ولم تُمسح.</span>",
                    "error",
                    12000,
                    true
                );

            }).then(function () {
                submitButtons.forEach(function (b) { b.disabled = false; });
            });
        };

        /* بعد فحص تسلسل الأرقام (اختياري): التحقق من رقم السجل ثم الحفظ */
        const afterSequence = function () {

        if (sameRecord) {
            appChoose({
                title: "رقم السجل " + recordNumber + " موجود مسبقاً",
                message: "يوجد سجل محفوظ بنفس الرقم (" + (sameRecord.officeName || "") + " — " + (sameRecord.representativeName || "") + " — " +
                    formatDay(getRecordDay(sameRecord)) + " — " + (sameRecord.agencies || []).length + " وكالة). هل هذا سجل مختلف فعلاً؟",
                choices: [
                    { value: "save", label: "نعم، احفظه كسجل منفصل", kind: "primary" },
                    { value: "open", label: "افتح السجل الموجود", kind: "secondary" }
                ]
            }).then(function (choice) {
                if (choice === "save") proceed();
                if (choice === "open") showFinalRecordReport(sameRecord.id, "summary");
            });
            return;
        }

        proceed();

        };

        checkAgencySequenceThen(record.agencies, afterSequence);


    }
);

}

/* =========================================================
إعادة نموذج السجل
========================================================= */

function resetRecordForm() {

const form =
    document.getElementById(
        "recordForm"
    );


if (form) {

    form.reset();

}


const editing =
    document.getElementById(
        "editingRecordId"
    );


if (editing) {

    editing.value = "";

}


pendingAgencies = [];


const title =
    document.getElementById(
        "recordFormTitle"
    );


if (title) {

    title.textContent =
        "إنشاء سجل جديد";

}


updateRepresentativeTypeHint();

const recordDateField =
    document.getElementById(
        "recordDate"
    );

if (recordDateField) {

    recordDateField.value =
        todayDay();

}

setFormAuditors(lastAuditors());

setAgencyPricePeriod("");

renderPendingAgencies();

ensureAgencyPriceControls();

clearAgencyForm();

updatePreview();

}

/* =========================================================
مدققو السجل (اسم أو اسمان) — داخل البرنامج فقط
لا يدخلون في أي تقرير أو حساب. آخر أسماء مستخدمة تُحفظ كتفضيل
واجهة (audit_ui_last_auditors) لتعبئة السجل التالي تلقائياً.
========================================================= */

const LAST_AUDITORS_KEY = "audit_ui_last_auditors";

function getRecordAuditors(record) {
    return Array.isArray(record && record.auditors)
        ? record.auditors.map(function (n) { return String(n || "").trim(); }).filter(Boolean)
        : [];
}

function getFormAuditors() {
    const out = [];
    ["recordAuditor1", "recordAuditor2"].forEach(function (id) {
        const v = (document.getElementById(id)?.value || "").trim().replace(/\s+/g, " ");
        if (v && out.indexOf(v) === -1) out.push(v);
    });
    return out;
}

function setFormAuditors(list) {
    const names = Array.isArray(list) ? list : [];
    const a = document.getElementById("recordAuditor1");
    const b = document.getElementById("recordAuditor2");
    if (a) a.value = names[0] || "";
    if (b) b.value = names[1] || "";
}

function lastAuditors() {
    try {
        const list = JSON.parse(localStorage.getItem(LAST_AUDITORS_KEY) || "[]");
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function rememberAuditors(list) {
    try { localStorage.setItem(LAST_AUDITORS_KEY, JSON.stringify(list || [])); } catch (e) {}
}

/* كل أسماء المدققين المستخدمة سابقاً (للاقتراح وللفلترة) */
function allAuditorNames() {
    const set = {};
    records.forEach(function (r) {
        getRecordAuditors(r).forEach(function (n) { set[n] = true; });
    });
    lastAuditors().forEach(function (n) { if (n) set[n] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, "ar"); });
}

function refreshAuditorSuggestions() {
    const list = document.getElementById("auditorNames");
    if (!list) return;
    list.innerHTML = allAuditorNames().map(function (n) {
        return '<option value="' + escapeHTML(n) + '"></option>';
    }).join("");
}

["recordAuditor1", "recordAuditor2"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("input", function () {
        if (typeof saveRecordDraft === "function") saveRecordDraft();
    });
});

onReady(function () {
    refreshAuditorSuggestions();
    const a = document.getElementById("recordAuditor1");
    if (a && !a.value && !document.getElementById("editingRecordId")?.value) {
        setFormAuditors(lastAuditors());
    }
});

/* =========================================================
عرض السجلات
========================================================= */

/* =========================================================
فلترة وترتيب السجلات
للعرض فقط: نرتّب نسخة من القائمة، وترتيب السجلات المحفوظة لا يتغير.
آخر اختيار يُحفظ كتفضيل واجهة (audit_ui_records_view) وليس بيانات.
========================================================= */

const RECORDS_VIEW_KEY = "audit_ui_records_view";
const RECORDS_VIEW_DEFAULT = { period: "all", from: "", to: "", rep: "all", office: "all", auditor: "all", sort: "date-desc" };

function loadRecordsView() {
    try {
        return Object.assign({}, RECORDS_VIEW_DEFAULT, JSON.parse(localStorage.getItem(RECORDS_VIEW_KEY) || "{}"));
    } catch (e) {
        return Object.assign({}, RECORDS_VIEW_DEFAULT);
    }
}

let recordsView = loadRecordsView();

function saveRecordsView() {
    try { localStorage.setItem(RECORDS_VIEW_KEY, JSON.stringify(recordsView)); } catch (e) {}
}

/* حدود الفترة [من، إلى] بصيغة YYYY-MM-DD (فارغ = بلا حد) */
function recordsPeriodRange(view) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (view.period) {
        case "this-month": return [toDayString(new Date(y, m, 1)), toDayString(new Date(y, m + 1, 0))];
        case "last-month": return [toDayString(new Date(y, m - 1, 1)), toDayString(new Date(y, m, 0))];
        case "3-months": return [toDayString(new Date(y, m - 2, 1)), toDayString(new Date(y, m + 1, 0))];
        case "this-year": return [y + "-01-01", y + "-12-31"];
        case "custom": return [view.from || "", view.to || ""];
        default: return ["", ""];
    }
}

function compareRecordNumbers(a, b) {
    return String(a.recordNumber || "").localeCompare(String(b.recordNumber || ""), "en", { numeric: true });
}

function getVisibleRecords() {

    const view = recordsView;
    const q = normalizeDigits(document.getElementById("recordSearch")?.value || "").trim().toLowerCase();
    const range = recordsPeriodRange(view);

    const list = records.filter(function (record) {
        const day = getRecordDay(record);
        if (range[0] && (!day || day < range[0])) return false;
        if (range[1] && (!day || day > range[1])) return false;
        if (view.rep !== "all" && (record.representativeType === "external" ? "external" : "internal") !== view.rep) return false;
        if (view.office !== "all" && String(record.officeName || "").trim() !== view.office) return false;
        if (view.auditor !== "all" && getRecordAuditors(record).indexOf(view.auditor) === -1) return false;
        if (q) {
            const hay = normalizeDigits([record.recordNumber, record.officeName, record.representativeName, getRecordAuditors(record).join(" "), formatDay(getRecordDay(record))].join(" ")).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
        }
        return true;
    });

    const byDay = function (a, b) { return getRecordDay(a).localeCompare(getRecordDay(b)) || compareRecordNumbers(a, b); };
    const sorters = {
        "date-desc": function (a, b) { return byDay(b, a); },
        "date-asc": byDay,
        "number-desc": function (a, b) { return compareRecordNumbers(b, a); },
        "number-asc": compareRecordNumbers,
        "total-desc": function (a, b) { return getRecordGrandTotal(b) - getRecordGrandTotal(a); },
        "total-asc": function (a, b) { return getRecordGrandTotal(a) - getRecordGrandTotal(b); },
        "agencies-desc": function (a, b) { return (b.agencies || []).length - (a.agencies || []).length; },
        "office-asc": function (a, b) { return String(a.officeName || "").localeCompare(String(b.officeName || ""), "ar") || byDay(b, a); }
    };

    if (sorters[view.sort]) {
        list.sort(sorters[view.sort]);
    }

    return list;
}

/* تعبئة أدوات الفلترة من الاختيار المحفوظ وأسماء المكاتب الحالية */
function syncRecordsFilters() {

    const office = document.getElementById("rfOffice");
    if (office) {
        const names = Array.from(new Set(records.map(function (r) { return String(r.officeName || "").trim(); }).filter(Boolean)))
            .sort(function (a, b) { return a.localeCompare(b, "ar"); });
        if (recordsView.office !== "all" && names.indexOf(recordsView.office) === -1) {
            names.unshift(recordsView.office);
        }
        office.innerHTML = '<option value="all">كل المكاتب</option>' + names.map(function (n) {
            return '<option value="' + escapeHTML(n) + '">' + escapeHTML(n) + "</option>";
        }).join("");
    }

    const auditor = document.getElementById("rfAuditor");
    if (auditor) {
        const names = allAuditorNames();
        if (recordsView.auditor !== "all" && names.indexOf(recordsView.auditor) === -1) {
            names.unshift(recordsView.auditor);
        }
        auditor.innerHTML = '<option value="all">كل المدققين</option>' + names.map(function (n) {
            return '<option value="' + escapeHTML(n) + '">' + escapeHTML(n) + "</option>";
        }).join("");
    }
    refreshAuditorSuggestions();

    const set = function (id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    set("rfAuditor", recordsView.auditor);
    set("rfPeriod", recordsView.period);
    set("rfFrom", recordsView.from);
    set("rfTo", recordsView.to);
    set("rfRep", recordsView.rep);
    set("rfOffice", recordsView.office);
    set("rfSort", recordsView.sort);

    document.querySelectorAll("#recordsFilters .rf-custom").forEach(function (el) {
        el.hidden = recordsView.period !== "custom";
    });
}

document.getElementById("recordsFilters")?.addEventListener("change", function (event) {
    const map = { rfPeriod: "period", rfFrom: "from", rfTo: "to", rfRep: "rep", rfOffice: "office", rfAuditor: "auditor", rfSort: "sort" };
    const key = map[event.target.id];
    if (!key) return;
    recordsView[key] = event.target.value;
    saveRecordsView();
    renderRecords();
});

function resetRecordsView() {
    recordsView = Object.assign({}, RECORDS_VIEW_DEFAULT);
    saveRecordsView();
    const search = document.getElementById("recordSearch");
    if (search) search.value = "";
    renderRecords();
}

document.getElementById("rfReset")?.addEventListener("click", resetRecordsView);
document.getElementById("recordsTableBody")?.addEventListener("click", function (event) {
    if (event.target.closest("[data-rf-reset]")) resetRecordsView();
});

function renderRecords() {

    const tbody = document.getElementById("recordsTableBody");

    if (!tbody) {
        return;
    }

    syncRecordsFilters();

    const countEl = document.getElementById("rfCount");
    const visible = getVisibleRecords();
    const filtered = visible.length !== records.length;

    if (countEl) {
        countEl.innerHTML = records.length
            ? (filtered ? "عرض <b>" + visible.length + "</b> من " + records.length + " سجل" : "<b>" + records.length + "</b> سجل") +
              (visible.length ? " — الإجمالي " + money(visible.reduce(function (s, r) { return s + getRecordGrandTotal(r); }, 0)) : "")
            : "";
    }
    document.getElementById("rfReset")?.toggleAttribute("hidden", !filtered && recordsView.sort === RECORDS_VIEW_DEFAULT.sort);

    if (records.length && !visible.length) {
        tbody.innerHTML =
            '<tr><td colspan="9"><div class="empty-state"><p>لا توجد سجلات تطابق البحث أو الفلترة الحالية.</p>' +
            '<button type="button" class="secondary-btn" data-rf-reset>عرض كل السجلات</button></div></td></tr>';
        return;
    }

    if (records.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="9"><div class="empty-state"><p>لا توجد سجلات محفوظة بعد.</p>' +
            '<button type="button" class="primary-btn" onclick="switchSection(\'newRecordSection\')">إنشاء سجل جديد</button></div></td></tr>';
        return;
    }

    const canEdit = currentUser && currentUser.role !== "viewer";
    const canDelete = currentUser && currentUser.role === "manager";

    tbody.innerHTML = visible.map(function (record) {

        const stats = getRecordFinalStats(record);
        const total = (record.agencies || []).length || 1;
        const activeOnly = stats.active.length - stats.missingAgenciesCount;

        const bar =
            '<span class="mini-bar" title="فعالة ' + activeOnly + " — مفقودة " + stats.missingAgenciesCount + " — ملغاة " + stats.cancelled + '">' +
            '<span class="seg-active" style="width:' + (activeOnly / total) * 100 + '%"></span>' +
            '<span class="seg-missing" style="width:' + (stats.missingAgenciesCount / total) * 100 + '%"></span>' +
            '<span class="seg-cancelled" style="width:' + (stats.cancelled / total) * 100 + '%"></span>' +
            "</span>";

        const date = formatDay(getRecordDay(record));

        return "<tr>" +
            '<td><span class="record-tag">' + escapeHTML(record.recordNumber) + "</span></td>" +
            "<td><strong>" + escapeHTML(record.officeName) + "</strong>" +
                (getRecordAuditors(record).length ? '<small class="auditor-note"><i class="ti ti-user-check" aria-hidden="true"></i> ' + escapeHTML(getRecordAuditors(record).join(" و")) + "</small>" : "") +
            "</td>" +
            "<td>" + escapeHTML(record.representativeName) + "</td>" +
            '<td class="num"><span class="agency-count">' + (record.agencies || []).length + "</span>" + bar + "</td>" +
            '<td class="num">' + money(getRecordBaseTotal(record)) + "</td>" +
            '<td class="num">' + money(getRecordGrandTotal(record)) + "</td>" +
            '<td class="num money-cell">' + money(getRecordRepresentativeTotal(record)) + "</td>" +
            '<td class="date-cell">' + date + "</td>" +
            /* الإجراءات الأكثر استخداماً ظاهرة، والباقي في قائمة ⋮ */
            '<td><div class="action-group">' +
                '<button type="button" class="act-btn act-primary" onclick="showFinalRecordReport(\'' + record.id + '\', \'summary\')"><i class="ti ti-file-text" aria-hidden="true"></i> التقرير</button>' +
                (canEdit ? '<button type="button" class="act-btn" onclick="editRecord(\'' + record.id + '\')"><i class="ti ti-edit" aria-hidden="true"></i> تعديل</button>' : "") +
                '<button type="button" class="act-btn act-more" aria-haspopup="menu" aria-label="إجراءات أخرى للسجل ' + escapeHTML(record.recordNumber) + '" onclick="openRecordMenu(this, \'' + record.id + '\')"><i class="ti ti-dots-vertical" aria-hidden="true"></i></button>' +
            "</div></td>" +
            "</tr>";

    }).join("");

}

/* =========================================================
البحث السريع في كل النظام (Ctrl + K)
ابحث برقم السجل أو المكتب أو المندوب، أو برقم وكالة لتعرف
في أي سجل هي. Enter يفتح النتيجة، والأسهم تتنقل بين النتائج.
========================================================= */

function globalSearchResults(query) {

    const q = normalizeDigits(String(query || "")).trim().toLowerCase();

    if (!q) {
        return [];
    }

    const out = [];

    records.forEach(function (record) {
        const hay = [record.recordNumber, record.officeName, record.representativeName].join(" ").toLowerCase();
        if (hay.indexOf(q) !== -1) {
            out.push({ kind: "record", record: record, score: String(record.recordNumber).toLowerCase() === q ? 0 : 2 });
        }
    });

    /* أرقام الوكالات: المطابقة التامة أولاً */
    if (/^\d+$/.test(q)) {
        records.forEach(function (record) {
            (record.agencies || []).forEach(function (agency, index) {
                const n = String(agency.number).trim();
                if (n === q || n.indexOf(q) === 0) {
                    out.push({ kind: "agency", record: record, agency: agency, index: index, score: n === q ? 1 : 3 });
                }
            });
        });
    }

    return out
        .sort(function (a, b) { return a.score - b.score; })
        .slice(0, 14);
}

function openGlobalSearch() {

    /* نافذة بحث قديمة مغلقة لم تُحذف: تُحذف ثم تُفتح من جديد */
    const stale = document.getElementById("globalSearch");
    if (stale && !stale.open) {
        stale.remove();
    }

    if (!currentUser || document.getElementById("globalSearch")) {
        return;
    }

    setNavOpen(false);

    const dialog = document.createElement("dialog");
    dialog.id = "globalSearch";
    dialog.className = "search-dialog no-print";
    dialog.setAttribute("aria-label", "بحث سريع");
    dialog.innerHTML =
        '<div class="search-card">' +
            '<label class="search-box"><i class="ti ti-search" aria-hidden="true"></i>' +
                '<input type="text" id="globalSearchInput" placeholder="رقم سجل، اسم مكتب أو مندوب، أو رقم وكالة…" autocomplete="off" aria-controls="globalSearchList">' +
                '<kbd>Esc</kbd></label>' +
            '<div class="search-list" id="globalSearchList" role="listbox"></div>' +
            '<p class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> للتنقل</span><span><kbd>Enter</kbd> للفتح</span></p>' +
        "</div>";

    document.body.appendChild(dialog);

    /* الإغلاق والحذف مباشرة دون الاعتماد على حدث «close» */
    const closeSearch = function () {
        try { if (dialog.open) dialog.close(); } catch (e) {}
        dialog.remove();
    };

    dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        closeSearch();
    });

    const input = dialog.querySelector("input");
    const list = dialog.querySelector(".search-list");
    let results = [];
    let active = 0;

    const open = function (item, edit) {
        closeSearch();
        if (item.kind === "record") {
            showFinalRecordReport(item.record.id, "summary");
        } else if (edit) {
            openAgencyForEdit(item.record.id, item.index);
        } else {
            showTypeAgencies(item.record.id, item.agency.type, "summary");
        }
    };

    const render = function () {

        results = globalSearchResults(input.value);
        active = Math.min(active, Math.max(0, results.length - 1));

        if (!input.value.trim()) {
            list.innerHTML = '<p class="search-empty">اكتب رقم سجل أو رقم وكالة أو اسماً. مثال: 21 يعرض الوكالة رقم 21 والسجل الذي فيه.</p>';
            return;
        }

        if (!results.length) {
            list.innerHTML = '<p class="search-empty">لا توجد نتائج مطابقة. جرّب رقماً أو اسماً آخر.</p>';
            return;
        }

        const canEdit = currentUser && currentUser.role !== "viewer";

        list.innerHTML = results.map(function (item, i) {
            const r = item.record;
            if (item.kind === "record") {
                return '<div class="search-item' + (i === active ? " is-active" : "") + '" role="option" data-i="' + i + '" aria-selected="' + (i === active) + '">' +
                    '<span class="search-icon"><i class="ti ti-books" aria-hidden="true"></i></span>' +
                    "<span class=\"search-text\"><b>سجل " + escapeHTML(r.recordNumber) + "</b><small>" + escapeHTML(r.officeName) + " — " + escapeHTML(r.representativeName) +
                    " — " + formatDay(getRecordDay(r)) + " — " + (r.agencies || []).length + " وكالة</small></span>" +
                    '<span class="search-go">التقرير</span></div>';
            }
            const a = item.agency;
            return '<div class="search-item' + (i === active ? " is-active" : "") + '" role="option" data-i="' + i + '" aria-selected="' + (i === active) + '">' +
                '<span class="search-icon search-icon-agency" style="--c:' + (AGENCY_TYPE_COLORS[a.type] || "#45577c") + '">' + escapeHTML(a.number) + "</span>" +
                '<span class="search-text"><b>وكالة ' + escapeHTML(a.number) + " — " + escapeHTML(AGENCY_NAMES[a.type] || "") + "</b><small>سجل " + escapeHTML(r.recordNumber) + " — " +
                escapeHTML(r.officeName) + " — " + getAgencyStatusName(a.status) + "</small></span>" +
                (canEdit ? '<button type="button" class="act-btn search-edit" data-edit="' + i + '"><i class="ti ti-edit" aria-hidden="true"></i> تعديل</button>' : "") +
                "</div>";
        }).join("");
    };

    input.addEventListener("input", function () {
        active = 0;
        render();
    });

    input.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!results.length) return;
            active = (active + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
            render();
            list.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
        } else if (event.key === "Enter" && results[active]) {
            event.preventDefault();
            open(results[active], false);
        }
    });

    list.addEventListener("click", function (event) {
        const edit = event.target.closest("[data-edit]");
        if (edit) {
            open(results[number(edit.dataset.edit)], true);
            return;
        }
        const row = event.target.closest(".search-item");
        if (row) {
            open(results[number(row.dataset.i)], false);
        }
    });

    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) closeSearch();
    });

    dialog.addEventListener("close", function () {
        dialog.remove();
    });

    dialog.showModal();
    render();
    input.focus();
}

window.openGlobalSearch = openGlobalSearch;

/* =========================================================
الوضع النهاري / الليلي
الاختيار يُحفظ في audit_ui_theme (تفضيل عرض، ليس بيانات) ويُطبَّق
قبل رسم الصفحة من index.html حتى لا يومض.
========================================================= */

function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyThemeChrome() {
    const dark = currentTheme() === "dark";
    document.querySelectorAll(".theme-label").forEach(function (el) {
        el.textContent = dark ? "الوضع النهاري" : "الوضع الليلي";
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#16121f" : "#efebe3");
}

function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("audit_ui_theme", next); } catch (e) {}
    applyThemeChrome();
    setTimeout(function () { root.classList.remove("theme-switching"); }, 400);
}

window.toggleTheme = toggleTheme;

onReady(applyThemeChrome);

/* Ctrl + K (أو ⌘ + K) يفتح البحث من أي مكان */
document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K" || event.code === "KeyK")) {
        event.preventDefault();
        openGlobalSearch();
    }
});

/* =========================================================
قائمة ⋮ لإجراءات السجل
قائمة عائمة واحدة تُفتح بجانب الزر (خارج الجدول حتى لا تُقص).
========================================================= */

function closeRecordMenu() {
    const menu = document.getElementById("recordMenu");
    if (menu) {
        if (menu._opener) menu._opener.setAttribute("aria-expanded", "false");
        menu.remove();
    }
}

function openRecordMenu(button, id) {

    const wasOpenForThis = document.getElementById("recordMenu")?._opener === button;
    closeRecordMenu();
    if (wasOpenForThis) return;

    const canEdit = currentUser && currentUser.role !== "viewer";
    const canDelete = currentUser && currentUser.role === "manager";

    const items = [
        { icon: "ti-eye", text: "عرض التفاصيل", run: function () { viewRecord(id); } },
        { icon: "ti-file-description", text: "التقرير المفصل", run: function () { showFinalRecordReport(id, "detailed"); } },
        { icon: "ti-file-spreadsheet", text: "تصدير Excel", run: function () { exportRecordToExcel(id); } }
    ];

    if (canEdit) {
        items.push({ icon: "ti-edit", text: "تعديل السجل", run: function () { editRecord(id); } });
    }

    if (canDelete) {
        items.push({ icon: "ti-trash", text: "حذف السجل", danger: true, run: function () { deleteRecord(id); } });
    }

    const menu = document.createElement("div");
    menu.id = "recordMenu";
    menu.className = "row-menu no-print";
    menu.setAttribute("role", "menu");
    menu._opener = button;

    items.forEach(function (item) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "menuitem");
        b.className = "row-menu-item" + (item.danger ? " is-danger" : "");
        b.innerHTML = '<i class="ti ' + item.icon + '" aria-hidden="true"></i>';
        b.appendChild(document.createTextNode(item.text));
        b.addEventListener("click", function () {
            closeRecordMenu();
            item.run();
        });
        menu.appendChild(b);
    });

    document.body.appendChild(menu);
    button.setAttribute("aria-expanded", "true");

    /* موضع القائمة: تحت الزر، وتبقى داخل الشاشة */
    const r = button.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) {
        top = Math.max(8, r.top - mh - 6);
    }
    menu.style.left = left + "px";
    menu.style.top = top + "px";

    menu.querySelector(".row-menu-item")?.focus();
}

document.addEventListener("click", function (event) {
    const menu = document.getElementById("recordMenu");
    if (menu && !menu.contains(event.target) && !event.target.closest(".act-more")) {
        closeRecordMenu();
    }
});

document.addEventListener("keydown", function (event) {
    const menu = document.getElementById("recordMenu");
    if (!menu) return;
    if (event.key === "Escape") {
        const opener = menu._opener;
        closeRecordMenu();
        opener?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const items = Array.from(menu.querySelectorAll(".row-menu-item"));
        const i = items.indexOf(document.activeElement);
        items[(i + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
    }
});

window.addEventListener("scroll", closeRecordMenu, true);
window.addEventListener("resize", closeRecordMenu);

window.openRecordMenu = openRecordMenu;

/* =========================================================
إجمالي السعر الأساسي
========================================================= */

function getRecordBaseTotal(
record
) {

return record.agencies.reduce(
    function (sum, agency) {

        return (
            sum +
            number(
                agency.basePrice
            )
        );

    },
    0
);

}

/* =========================================================
إجمالي المندوب
========================================================= */

function getRecordRepresentativeTotal(
record
) {

return record.agencies.reduce(
    function (sum, agency) {

        return (
            sum +
            number(
                agency.representativeAmount
            )
        );

    },
    0
);

}

/* =========================================================
تعديل سجل
========================================================= */

function editRecord(id) {

const record =
    records.find(
        function (item) {

            return (
                item.id === id
            );

        }
    );


if (!record) {

    notify("السجل غير موجود.", "error");

    return;

}


document.getElementById(
    "editingRecordId"
).value =
    record.id;


document.getElementById(
    "recordNumber"
).value =
    record.recordNumber;


document.getElementById(
    "officeName"
).value =
    record.officeName;


document.getElementById(
    "representativeName"
).value =
    record.representativeName;


const representativeTypeSelect =
    document.getElementById(
        "representativeType"
    );

if (representativeTypeSelect) {

    representativeTypeSelect.value =
        record.representativeType === "external"
            ? "external"
            : "internal";

}

updateRepresentativeTypeHint();


const recordDateInput =
    document.getElementById(
        "recordDate"
    );

if (recordDateInput) {

    recordDateInput.value =
        getRecordDay(record);

}

setFormAuditors(getRecordAuditors(record));


pendingAgencies =
    JSON.parse(
        JSON.stringify(
            record.agencies
        )
    );


document.getElementById(
    "recordFormTitle"
).textContent =
    "تعديل السجل رقم " +
    record.recordNumber;


ensureAgencyPriceControls();

renderPendingAgencies();

/* تهيئة نموذج الوكالة حسب السجل (بدل الانتقال للمندوب الخارجي) */
clearAgencyForm();


switchSection(
    "newRecordSection"
);

}

window.editRecord =
editRecord;

/* =========================================================
حذف سجل
========================================================= */

function deleteRecord(id) {

if (
    !currentUser ||
    currentUser.role !==
    "manager"
) {

    notify("الحذف متاح للمدير فقط.", "error");

    return;

}


const target =
    records.find(
        function (record) {
            return record.id === id;
        }
    );

if (!target) {
    return;
}

appConfirm({
    title: "حذف السجل نهائياً",
    message: "سيُحذف السجل رقم " + target.recordNumber + " (" + target.officeName + ") مع " +
        (target.agencies || []).length + " وكالة. لا يمكن التراجع عن هذا الحذف.",
    confirmText: "حذف السجل",
    cancelText: "إلغاء",
    danger: true
}).then(function (ok) {

    if (!ok) {
        return;
    }

    const recordsBefore = records;

    records =
        records.filter(
            function (record) {

                return (
                    record.id !==
                    id
                );

            }
        );


    persistRecords().then(function () {

        renderRecords();

        updateDashboard();

        renderReports();

        notify("تم حذف السجل رقم " + escapeHTML(target.recordNumber) + ".", "info");

    }).catch(function (error) {

        records = recordsBefore;
        console.error("Delete record failed:", error);
        notify("<strong>لم يُحذف السجل</strong><span>" + escapeHTML(error && error.message || error) + "</span>", "error", 10000, true);
    });
});

}

window.deleteRecord =
deleteRecord;

/* =========================================================
عرض سجل كامل
========================================================= */

/*
    قيمة الإضافات المحسوبة كطوابع مرافعة (حفظ، توقيع إضافي...) بالليرة:
    عددها × سعر طابع المرافعة المطبّق على الوكالة.
    طوابع بدل الانتقال لا تدخل هنا (لها بند مستقل).
*/
function getAgencyStampAdditionsValue(agency) {

    if (!agency || agency.status === "cancelled") {
        return 0;
    }

    let count;

    if (typeof agency.pleadingAdditions === "number") {
        count = number(agency.pleadingAdditions) - getAgencyTransport(agency).stamps;
    } else {
        /* سجلات قديمة جداً لا تحتوي عدد طوابع الإضافات */
        count = 0;
        Object.keys(ADDITION_NAMES).forEach(function (key) {
            if (key === "transport") return;
            const applied = agency.appliedPrices && agency.appliedPrices.additions && agency.appliedPrices.additions[key];
            const isPleading = applied ? !!applied.isPleading : !!additionStampStatus[key];
            if (isPleading) count += number(agency.additions && agency.additions[key]);
        });
    }

    const stampPrice =
        number(agency.appliedPrices && agency.appliedPrices.stamps && agency.appliedPrices.stamps.pleading) ||
        number(stampPrices.pleading);

    return Math.max(0, count) * stampPrice;
}

/*
    إجمالي الوكالة = سعر الوكالة
    + القيمة المالية للإضافات (الطوابع والنقدية)
    + القيمة الكاملة لبدل الانتقال (طابعه + حصة الفرع + حصة المندوب).
    حصة الفرع من بدل الانتقال موجودة ضمن additionsTotal
    فتُطرح منه حتى لا تُحسب مرتين.
*/
function getAgencyGrandTotal(agency) {
    if (!agency || agency.status === "cancelled") {
        return 0;
    }
    const transport = getAgencyTransport(agency);
    return number(agency.basePrice) +
        Math.max(0, number(agency.additionsTotal) - transport.cash) +
        getAgencyStampAdditionsValue(agency) +
        transport.total;
}

/* إجمالي مبلغ السجل = مجموع إجماليات وكالاته غير الملغاة */
function getRecordGrandTotal(record) {
    return (record.agencies || []).reduce(function (sum, agency) {
        return sum + getAgencyGrandTotal(agency);
    }, 0);
}

/* سعر الوكالة مع بدل الانتقال (مثال: 1700 + 200 = 1900) */
function getAgencyPriceWithTransport(agency) {
    if (!agency || agency.status === "cancelled") {
        return 0;
    }
    return number(agency.basePrice) + getAgencyTransport(agency).total;
}

/* إجماليات بدل الانتقال لمجموعة وكالات */
function sumTransport(agencies) {
    const result = { count: 0, total: 0, share: 0, stamps: 0, stampsValue: 0, cash: 0 };
    (agencies || []).forEach(function (agency) {
        const t = getAgencyTransport(agency);
        Object.keys(result).forEach(function (key) {
            result[key] += t[key];
        });
    });
    return result;
}

/* جدول بدل الانتقال (يستخدم في التقارير) */
function transportTableHTML(t, tableClass) {
    return '<table class="' + (tableClass || "doc-table") + '"><thead><tr><th>البند</th><th class="num">العدد</th><th class="num">القيمة</th></tr></thead><tbody>' +
        "<tr><td>القيمة الكاملة لبدل الانتقال (مضافة لقيمة الوكالات)</td><td class=\"num\">" + t.count + '</td><td class="num">' + money(t.total) + "</td></tr>" +
        "<tr><td>حصة المندوب من بدل الانتقال (لا تُطلب منه)</td><td class=\"num\">" + t.count + '</td><td class="num">' + money(t.share) + "</td></tr>" +
        "<tr><td>طوابع المرافعة المضافة من بدل الانتقال</td><td class=\"num\">" + t.stamps + '</td><td class="num">' + money(t.stampsValue) + "</td></tr>" +
        "</tbody><tfoot><tr><td>المطلوب من بدل الانتقال = القيمة − (حصة المندوب + الطوابع)</td><td class=\"num\">" + t.count + '</td><td class="num">' + money(t.cash) + "</td></tr></tfoot></table>";
}

function formatNotesHTML(value) {
    if (!value) return "-";
    return escapeHTML(value)
        .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
        .replace(/\r?\n/g, "<br>");
}

/*
    تجميع ملاحظات الوكالات: كل سطر ملاحظة (والعبارتان السريعتان حتى لو كُتبتا في سطر واحد)
    مع أرقام الوكالات التي تحمله، بترتيب أول وكالة.
*/
function groupAgencyNotes(agencies) {
    const groups = [];
    const byText = {};
    const known = [NOTE_NO_RECEIPT, NOTE_NO_BOND];
    agencies.slice().sort(function (a, b) { return number(a.number) - number(b.number); }).forEach(function (agency) {
        if (!agency.notes) return;
        const items = [];
        String(agency.notes).split(/\r?\n|<br\s*\/?>/i).forEach(function (line) {
            let rest = line;
            known.forEach(function (phrase) {
                if (rest.indexOf(phrase) !== -1) {
                    items.push(phrase);
                    rest = rest.split(phrase).join(" ");
                }
            });
            rest = rest.replace(/^[\s،,.\-]+|[\s،,.\-]+$/g, "").replace(/\s*[،,]\s*[،,]+\s*/g, "، ");
            if (rest) items.push(rest);
        });
        items.forEach(function (text) {
            if (!byText[text]) {
                byText[text] = { text: text, numbers: [] };
                groups.push(byText[text]);
            }
            if (byText[text].numbers.indexOf(String(agency.number)) === -1) byText[text].numbers.push(String(agency.number));
        });
    });
    return groups;
}

/* =========================================================
التقرير النهائي للسجل
========================================================= */

function getRecordFinalStats(record) {

    const agencies = Array.isArray(record.agencies) ? record.agencies : [];
    const active = agencies.filter(function (agency) {
        return agency.status !== "cancelled";
    });

    const byType = {};
    Object.keys(AGENCY_NAMES).forEach(function (type) {
        byType[type] = { count: 0, total: 0 };
    });

    const missing = { pleading: 0, ambulance: 0, aid: 0 };
    let missingValue = 0;
    let additionsTotal = 0;
    let additionsCount = 0;
    let representativeTotal = 0;
    let signatureCount = 0;

    active.forEach(function (agency) {
        const type = agency.type;
        if (!byType[type]) byType[type] = { count: 0, total: 0 };
        byType[type].count += 1;
        byType[type].total += number(agency.basePrice);

        const ms = agency.stamps || agency.missingStamps || {};
        missing.pleading += number(ms.pleading);
        missing.ambulance += number(ms.ambulance);
        missing.aid += number(ms.aid);
        missingValue += number(agency.missingStampsValue);
        additionsTotal += number(agency.additionsTotal);
        representativeTotal += number(agency.representativeAmount);

        Object.keys(ADDITION_NAMES).forEach(function (key) {
            const count = number(agency.additions && agency.additions[key]);
            additionsCount += count;
            if (key === "signature") signatureCount += count;
        });
    });

    const missingAgenciesCount = agencies.filter(function (agency) {
        return agency.status === "missing";
    }).length;

    const transport = sumTransport(active);

    const stampAdditionsValue = active.reduce(function (sum, agency) {
        return sum + getAgencyStampAdditionsValue(agency);
    }, 0);

    return {
        stampAdditionsValue: stampAdditionsValue,
        grandTotal: getRecordGrandTotal(record),
        agencies: agencies,
        active: active,
        cancelled: agencies.length - active.length,
        missingAgenciesCount: missingAgenciesCount,
        byType: byType,
        missing: missing,
        missingValue: missingValue,
        /* الإضافات النقدية بدون حصة الفرع من بدل الانتقال (لها بند مستقل) */
        additionsTotal: additionsTotal - transport.cash,
        additionsCount: additionsCount,
        signatureCount: signatureCount,
        representativeTotal: representativeTotal,
        transport: transport,
        committees: sumCommittees(active, getRecordDay(record))
    };
}

/* =========================================================
حصص لجنتي الإسعاف والتعاون
========================================================= */

/*
    حصة كل لجنة حسب تاريخ الوكالة:
    1. مبلغ محدد في جدول فترة الوكالة («أسعار حسب الفترات»: حصة الإسعاف / حصة التعاون) إن كُتب؛
    2. وإلا سعر الوكالة في تلك الفترة × نسبة نوعها (فالسجل القديم المحفوظ بسعر واحد تُحسب حصصه بسعر تاريخه)؛
    3. وإن لم تكن له فترة: سعر الوكالة المسجّل × النسبة.
    فترة الوكالة: فترتها المختارة (pricePeriod)، وإلا تاريخ سجلها، وإلا فترة أسعارها المحفوظة.
*/
function agencyCommitteeRow(agency, day) {
    let d = "";
    if (agency.pricePeriod === "base") d = "0000-01-01";
    else if (/^\d{4}-\d{2}-\d{2}$/.test(agency.pricePeriod || "")) d = agency.pricePeriod;
    else if (day) d = String(day).slice(0, 10);
    else if (agency.appliedPrices && agency.appliedPrices.priceMonth) d = scheduleStart(agency.appliedPrices.priceMonth);
    if (!d) return null;
    const table = priceTableForDay(d);
    return (table.prices && table.prices[agency.type]) || null;
}

/* مبلغ محدد في الجدول، أو null إن تُرك فارغاً (= تلقائي بالنسبة) */
function explicitShare(row, field) {
    if (!row || row[field] === undefined || row[field] === null || row[field] === "") return null;
    return number(row[field]);
}

function getAgencyCommittee(agency, day) {
    if (!agency || agency.status === "cancelled") {
        return { ambulance: 0, cooperation: 0 };
    }
    const rate = committeeRates[agency.type] || { ambulance: 0, cooperation: 0 };
    let price =
        number(agency.basePrice) ||
        number(prices[agency.type] && prices[agency.type].agency);
    /* سعر محدد للوكالة: الحصة من سعرها هي، لا من جدول الفترة */
    const row = number(agency.customPrice) > 0 ? null : agencyCommitteeRow(agency, day);
    if (row && number(row.agency) > 0) price = number(row.agency);
    const amb = explicitShare(row, "ambulance");
    const coop = explicitShare(row, "cooperation");
    return {
        ambulance: amb !== null ? amb : committeeAmount(price, rate.ambulance),
        cooperation: coop !== null ? coop : committeeAmount(price, rate.cooperation)
    };
}

/* يوم السجل لكل وكالة محفوظة (للتقارير التي تجمع وكالات من عدة سجلات) */
function agencyDayIndex() {
    const map = new WeakMap();
    records.forEach(function (record) {
        const d = getRecordDay(record);
        (record.agencies || []).forEach(function (a) { if (a && typeof a === "object") map.set(a, d); });
    });
    return map;
}

/* نسبة اللجنة مع مبلغها بسعر الوكالة الحالي (للعرض) */
function committeeRateHTML(type, field) {
    const rate = (committeeRates[type] || {})[field];
    const price = number(prices[type] && prices[type].agency);
    return formatRate(rate) + '<small class="rate-amount">' + money(committeeAmount(price, rate)) + "</small>";
}

/* day: تاريخ السجل إن كانت الوكالات من سجل واحد؛ وإلا يُعرف من سجل كل وكالة */
function sumCommittees(agencies, day) {

    const result = { count: 0, ambulance: 0, cooperation: 0, byType: {} };
    const blank = function () { return { count: 0, ambulance: 0, cooperation: 0, ambAmounts: {}, coopAmounts: {} }; };
    let index = null;

    Object.keys(AGENCY_NAMES).forEach(function (type) {
        result.byType[type] = blank();
    });

    (agencies || []).forEach(function (agency) {
        if (!agency || agency.status === "cancelled") {
            return;
        }
        const d = day || (index || (index = agencyDayIndex())).get(agency) || "";
        const c = getAgencyCommittee(agency, d);
        if (!result.byType[agency.type]) {
            result.byType[agency.type] = blank();
        }
        const t = result.byType[agency.type];
        result.count += 1;
        result.ambulance += c.ambulance;
        result.cooperation += c.cooperation;
        t.count += 1;
        t.ambulance += c.ambulance;
        t.cooperation += c.cooperation;
        t.ambAmounts[c.ambulance] = (t.ambAmounts[c.ambulance] || 0) + 1;
        t.coopAmounts[c.cooperation] = (t.coopAmounts[c.cooperation] || 0) + 1;
    });

    return result;
}

/* الحصة المستخدمة للوكالة الواحدة: مبلغ واحد، أو عدة مبالغ إن اختلفت الفترات (300 × 4 / 335 × 2) */
function shareAmountsText(amounts) {
    const keys = Object.keys(amounts || {}).map(Number).sort(function (a, b) { return a - b; });
    if (!keys.length) return "—";
    if (keys.length === 1) return money(keys[0]);
    return keys.map(function (k) { return money(k) + " × " + amounts[k]; }).join(" / ");
}

function committeesByTypeTableHTML(c) {

    let html = '<table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">العدد</th>' +
        '<th class="num">حصة الإسعاف للوكالة</th><th class="num">لجنة الإسعاف</th>' +
        '<th class="num">حصة التعاون للوكالة</th><th class="num">لجنة التعاون</th><th class="num">المجموع</th></tr></thead><tbody>';

    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const item = c.byType[type] || { count: 0, ambulance: 0, cooperation: 0 };
        html += "<tr" + (item.count === 0 ? ' class="row-zero"' : "") + "><td>" + AGENCY_NAMES[type] + "</td>" +
            '<td class="num">' + item.count + "</td>" +
            '<td class="num">' + shareAmountsText(item.ambAmounts) + "</td>" +
            '<td class="num">' + money(item.ambulance) + "</td>" +
            '<td class="num">' + shareAmountsText(item.coopAmounts) + "</td>" +
            '<td class="num">' + money(item.cooperation) + "</td>" +
            '<td class="num">' + money(item.ambulance + item.cooperation) + "</td></tr>";
    });

    html += '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + c.count + "</td><td></td>" +
        '<td class="num">' + money(c.ambulance) + "</td><td></td>" +
        '<td class="num">' + money(c.cooperation) + "</td>" +
        '<td class="num">' + money(c.ambulance + c.cooperation) + "</td></tr></tfoot></table>";

    return html;
}

/* =========================================================
شعار النظام: دفتر قيد مفتوح وعليه علامة «تمّ التدقيق» ✓
يُستخدم في الدخول، والقائمة، ولوحة التحكم، وترويسة التقارير.
- الشكل الافتراضي: مربع بحواف دائرية (حبر كحلي) وفيه الدفتر بالأبيض.
- mark-outline: بلا مربع، بلون النص (علامة مائية).
الألوان من متغيرات CSS (‎--bm-tile، ‎--bm-ink، ‎--bm-badge‎).
الأماكن في الصفحة: ‎<svg class="seal …" data-seal>‎ تُملأ بـ anchorSeals.
========================================================= */

function sealSVG(extraClass) {
    const outline = /\bmark-outline\b|\bseal-stamp\b/.test(extraClass || "");
    return '<svg class="seal brand-mark' + (outline ? " mark-outline" : "") + (extraClass ? " " + extraClass : "") +
        '" viewBox="0 0 64 64" aria-hidden="true">' +
        (outline ? "" : '<rect class="bm-tile" x="2" y="2" width="60" height="60" rx="17"/>') +
        '<g class="bm-book" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
            /* صفحتا الدفتر */
            '<path d="M32 21 C26.5 17 19 16.5 13 18.5 V43.5 C19 41.5 26.5 42 32 46 Z"/>' +
            '<path d="M32 21 C37.5 17 45 16.5 51 18.5 V35"/>' +
            '<path d="M32 46 C34.5 44.2 37.2 43.1 40 42.6"/>' +
            /* سطور القيد */
            '<path d="M18 25.5 C21.5 24.7 24.8 24.9 27.5 26" stroke-width="2"/>' +
            '<path d="M18 31.5 C21.5 30.7 24.8 30.9 27.5 32" stroke-width="2"/>' +
            '<path d="M18 37.5 C21.5 36.7 24.8 36.9 27.5 38" stroke-width="2"/>' +
            '<path d="M36.5 26 C39.2 24.9 42.5 24.7 46 25.5" stroke-width="2"/>' +
            '<path d="M36.5 32 C39.2 30.9 42.5 30.7 46 31.5" stroke-width="2"/>' +
        "</g>" +
        /* علامة التدقيق */
        '<circle class="bm-badge" cx="47" cy="45.5" r="10.5"/>' +
        '<path class="bm-check" d="M42.3 45.6 L45.6 48.9 L51.8 42.4" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>";
}

/* أماكن الشعار في الصفحة تُملأ بالشعار الموحّد (نفس الحجم والصنف) */
function anchorSeals() {
    document.querySelectorAll("svg.seal[data-seal]").forEach(function (old) {
        const extra = Array.from(old.classList).filter(function (c) { return c !== "seal"; }).join(" ");
        const holder = document.createElement("div");
        holder.innerHTML = sealSVG(extra);
        old.replaceWith(holder.firstChild);
    });
}

anchorSeals();

/* أرقام ترقيم الأقسام: غربية مثل بقية النظام */
function arabicDigit(n) {
    return String(n);
}

function todayArabic() {
    try {
        return new Date().toLocaleDateString(NUMBER_LOCALE, { year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
        return new Date().toISOString().slice(0, 10);
    }
}

function docLetterhead(title, subtitle) {
    return '<header class="doc-head">' +
        sealSVG() +
        '<div class="doc-org"><strong>نقابة المحامين</strong><span>فرع إدلب — مكتب المحاسبة</span></div>' +
        '<div class="doc-title"><h2>' + title + "</h2><span>" + (subtitle || ("تاريخ الإصدار: " + todayArabic())) + "</span></div>" +
        "</header>";
}

function docSignatures() {
    return '<footer class="doc-sign">' +
        "<div><span>المدقق</span><i></i></div>" +
        "<div><span>رئيس مكتب المحاسبة</span><i></i></div>" +
        "</footer>";
}

function buildFinalRecordReport(record, mode) {

    mode = mode || "summary";

    const stats = getRecordFinalStats(record);
    const detailed = mode === "detailed";
    const missingTotalCount = stats.missing.pleading + stats.missing.ambulance + stats.missing.aid;
    const baseTotal = Object.keys(stats.byType).reduce(function (s, t) { return s + stats.byType[t].total; }, 0);

    const createdAt = formatDay(getRecordDay(record));

    let sec = 0;
    const secTitle = function (text) {
        sec += 1;
        return '<h3><span class="sec-no">' + arabicDigit(sec) + "</span>" + text + "</h3>";
    };

    let html = '<div class="final-report doc ' + (detailed ? "doc-detailed" : "doc-summary") + '">';

    html += '<div class="report-actions no-print">' +
        '<button type="button" class="primary-btn" onclick="exportRecordToPDF(\'' + record.id + "', '" + mode + '\')">حفظ PDF</button>' +
        '<button type="button" class="secondary-btn" onclick="printFinalRecordReport(\'' + record.id + "', '" + mode + '\')">طباعة</button>' +
        '<button type="button" class="secondary-btn" onclick="exportRecordToExcel(\'' + record.id + '\')">تصدير Excel</button>' +
        '<button type="button" class="secondary-btn" onclick="showFinalRecordReport(\'' + record.id + "', '" + (detailed ? "summary" : "detailed") + '\')">' +
            (detailed ? "عرض المختصر" : "عرض المفصل") + "</button>" +
        '<button type="button" class="secondary-btn" onclick="closeRecordModal()">إغلاق</button>' +
        "</div>";

    html += docLetterhead(detailed ? "التقرير المفصل للسجل" : "التقرير المختصر للسجل");

    html += '<table class="doc-meta"><tr>' +
        "<td><span>رقم السجل</span><strong>" + escapeHTML(record.recordNumber) + "</strong></td>" +
        "<td><span>المكتب</span><strong>" + escapeHTML(record.officeName) + "</strong></td>" +
        "<td><span>المندوب</span><strong>" + escapeHTML(record.representativeName) + "</strong>" +
            (record.representativeType === "external" ? ' <small class="rep-type">خارجي</small>' : "") + "</td>" +
        "<td><span>تاريخ السجل</span><strong>" + createdAt + "</strong></td>" +
        "</tr></table>";

    html += '<div class="doc-summary-row">' +
        '<div class="doc-due"><span>المبلغ المستحق على المندوب</span><strong>' + money(stats.representativeTotal) + "</strong>" +
        "<small>عن " + stats.active.length + " وكالة غير ملغاة</small>" +
        '<div class="doc-grand"><span>إجمالي مبلغ السجل</span><b>' + money(stats.grandTotal) + "</b>" +
        "<small>سعر الوكالات + الإضافات (الطوابع والنقدية) + بدل الانتقال</small></div></div>" +
        '<dl class="doc-kpis">' +
            "<div><dt>فعالة</dt><dd>" + (stats.active.length - stats.missingAgenciesCount) + "</dd></div>" +
            "<div><dt>مفقودة</dt><dd>" + stats.missingAgenciesCount + "</dd></div>" +
            "<div><dt>ملغاة</dt><dd>" + stats.cancelled + "</dd></div>" +
            "<div><dt>سعر الوكالات</dt><dd>" + money(baseTotal) + "</dd></div>" +
            "<div><dt>عدد الإضافات</dt><dd>" + stats.additionsCount + "</dd></div>" +
            "<div><dt>الإضافات النقدية</dt><dd>" + money(stats.additionsTotal) + "</dd></div>" +
            "<div><dt>قيمة طوابع الإضافات</dt><dd>" + money(stats.stampAdditionsValue) + "</dd></div>" +
            "<div><dt>الطوابع الناقصة</dt><dd>" + missingTotalCount + "</dd></div>" +
            "<div><dt>قيمة الطوابع الناقصة</dt><dd>" + money(stats.missingValue) + "</dd></div>" +
            (stats.transport.count > 0
                ? "<div><dt>قيمة بدل الانتقال</dt><dd>" + money(stats.transport.total) + "</dd></div>" +
                  "<div><dt>حصة المندوب من الانتقال</dt><dd>" + money(stats.transport.share) + "</dd></div>" +
                  "<div><dt>طوابع مرافعة الانتقال (" + stats.transport.stamps + ")</dt><dd>" + money(stats.transport.stampsValue) + "</dd></div>" +
                  "<div><dt>المطلوب من بدل الانتقال</dt><dd>" + money(stats.transport.cash) + "</dd></div>"
                : "") +
        "</dl></div>";

    /* أزرار التدقيق السريع: كل بند موجود في السجل بضغطة واحدة */
    html += quickAuditHTML(record, mode);

    /* الوكالات حسب النوع، وبدل الانتقال بجانبها في المختصر (يوفّر صفحة) */
    const pairTypesTransport = !detailed && stats.transport.count > 0;
    if (pairTypesTransport) html += '<div class="doc-two-col">';

    html += '<section class="doc-section">' + secTitle("الوكالات حسب النوع") +
        '<div class="table-wrapper"><table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">العدد</th><th class="num">إجمالي السعر</th></tr></thead><tbody>';

    let typeCount = 0;
    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const item = stats.byType[type] || { count: 0, total: 0 };
        const allOfType = stats.agencies.filter(function (a) { return a.type === type; }).length;
        typeCount += item.count;
        /* الضغط على النوع يفتح وكالات هذا النوع فقط */
        const clickable = allOfType > 0;
        html += "<tr" +
            (clickable
                ? ' class="clickable-row" tabindex="0" role="button" title="اضغط لعرض ' + AGENCY_NAMES[type] + ' فقط" onclick="showTypeAgencies(\'' + record.id + "', '" + type + "', '" + mode + '\')"'
                : ' class="row-zero"') +
            "><td>" + agencyTypeDot(type) + AGENCY_NAMES[type] +
            (clickable ? ' <i class="ti ti-chevron-left row-go no-print"></i>' : "") +
            '</td><td class="num">' + item.count + '</td><td class="num">' + money(item.total) + "</td></tr>";
    });

    html += '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + typeCount + '</td><td class="num">' + money(baseTotal) + "</td></tr></tfoot></table></div></section>";

    if (stats.transport.count > 0) {
        html += '<section class="doc-section">' + secTitle("بدل الانتقال") +
            '<button type="button" class="audit-link no-print" onclick="showAgencyAudit(\'' + record.id + "', 'transport', '" + mode + '\')">' +
            '<i class="ti ti-list-search" aria-hidden="true"></i> عرض الوكالات التي عليها بدل انتقال (' + stats.transport.count + ')</button>' +
            '<div class="table-wrapper">' + transportTableHTML(stats.transport) + "</div></section>";
    }

    if (pairTypesTransport) html += "</div>";

    if (detailed) {

        let sumBase = 0, sumTransport = 0, sumAdd = 0, sumMissing = 0, sumRep = 0, sumGrand = 0;

        html += '<section class="doc-section">' + secTitle("تفاصيل الوكالات") +
            '<div class="table-wrapper"><table class="doc-table detail-table"><thead><tr>' +
            "<th>رقم الوكالة</th><th>النوع</th><th>الحالة</th>" +
            '<th class="num">السعر</th><th class="num">بدل الانتقال</th><th>الإضافات</th><th class="num">قيمة الإضافات<br><small>طوابع ونقدية</small></th>' +
            '<th>الطوابع الناقصة</th><th class="num">المطلوب من المندوب</th>' +
            '<th class="num total-col">الإجمالي<br><small>السعر + الإضافات + الانتقال</small></th><th>ملاحظات</th>' +
            "</tr></thead><tbody>";

        stats.agencies.slice().sort(function (a, b) { return number(a.number) - number(b.number); }).forEach(function (agency) {

            const ms = agency.stamps || agency.missingStamps || {};
            const isCancelled = agency.status === "cancelled";
            const transport = getAgencyTransport(agency);
            const base = isCancelled ? 0 : number(agency.basePrice);
            const add = isCancelled ? 0 : Math.max(0, number(agency.additionsTotal) - transport.cash) + getAgencyStampAdditionsValue(agency);
            const rep = isCancelled ? 0 : number(agency.representativeAmount);
            const grand = getAgencyGrandTotal(agency);

            sumBase += base; sumTransport += transport.total; sumAdd += add; sumRep += rep; sumGrand += grand;
            sumMissing += isCancelled ? 0 : number(agency.missingStampsValue);

            const statusClass = agency.status === "cancelled" ? "st-cancelled" : agency.status === "missing" ? "st-missing" : "st-active";

            const stampParts = [];
            if (number(ms.pleading)) stampParts.push("مرافعة " + number(ms.pleading));
            if (number(ms.ambulance)) stampParts.push("إسعاف " + number(ms.ambulance));
            if (number(ms.aid)) stampParts.push("معونة " + number(ms.aid));

            html += "<tr" + agencyRowAttrs(agency, isCancelled ? "row-cancelled" : "") + ">" +
                "<td><strong>" + escapeHTML(agency.number) + "</strong>" + (agency.duplicate ? ' <span class="badge badge-warning">مكررة</span>' : "") + agencyMarksHTML(agency) + "</td>" +
                "<td>" + agencyTypeDot(agency.type) + escapeHTML(AGENCY_NAMES[agency.type] || agency.type || "-") + "</td>" +
                '<td><span class="status-pill ' + statusClass + '">' + getAgencyStatusName(agency.status) + "</span></td>" +
                '<td class="num">' + money(base) + "</td>" +
                '<td class="num">' + (transport.count ? money(transport.total) + "<br><small>للمندوب " + money(transport.share) + "</small>" : "—") + "</td>" +
                '<td class="small-text">' + (agencyAdditionsToText(agency, true) === "-" ? "—" : escapeHTML(agencyAdditionsToText(agency, true))) + "</td>" +
                '<td class="num">' + money(add) + "</td>" +
                '<td class="small-text">' + (stampParts.length ? stampParts.join("، ") + "<br><small>" + money(agency.missingStampsValue) + "</small>" : "—") + "</td>" +
                '<td class="num">' + money(rep) + "</td>" +
                '<td class="num total-col">' + money(grand) + "</td>" +
                '<td class="small-text">' + (agency.notes ? formatNotesHTML(agency.notes) : "—") + "</td>" +
                "</tr>";
        });

        html += "</tbody><tfoot><tr>" +
            '<td colspan="3">الإجمالي (' + stats.agencies.length + " وكالة)</td>" +
            '<td class="num">' + money(sumBase) + "</td>" +
            '<td class="num">' + money(sumTransport) + "</td><td></td>" +
            '<td class="num">' + money(sumAdd) + "</td>" +
            '<td class="num">' + money(sumMissing) + "</td>" +
            '<td class="num">' + money(sumRep) + "</td>" +
            '<td class="num total-col">' + money(sumGrand) + "</td><td></td>" +
            "</tr></tfoot></table></div></section>";

    } else {

        html += '<div class="doc-two-col">';

        html += '<section class="doc-section">' + secTitle("الطوابع الناقصة") +
            '<table class="doc-table"><thead><tr><th>الطابع</th><th class="num">العدد</th><th class="num">القيمة</th></tr></thead><tbody>' +
            ["pleading", "ambulance", "aid"].map(function (k) {
                const names = { pleading: "مرافعة", ambulance: "إسعاف", aid: "معونة" };
                return "<tr" + auditRowAttrs(record, "missing:" + k, mode, stats.missing[k]) + "><td>" + names[k] +
                    (stats.missing[k] ? ' <i class="ti ti-chevron-left row-go no-print"></i>' : "") +
                    '</td><td class="num">' + stats.missing[k] + '</td><td class="num">' + money(stats.missing[k] * number(stampPrices[k])) + "</td></tr>";
            }).join("") +
            '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + missingTotalCount + '</td><td class="num">' + money(stats.missingValue) + "</td></tr></tfoot></table></section>";

        html += '<section class="doc-section">' + secTitle("الإضافات") +
            '<table class="doc-table"><thead><tr><th>الإضافة</th><th class="num">العدد</th><th class="num">القيمة النقدية</th></tr></thead><tbody>';

        let addCountTotal = 0, addCashTotal = 0;
        Object.keys(ADDITION_NAMES).forEach(function (key) {
            if (key === "transport") return; /* له قسم مستقل */
            const count = stats.active.reduce(function (sum, a) { return sum + number(a.additions && a.additions[key]); }, 0);
            const cash = stats.active.reduce(function (sum, a) { return sum + number(a.additionValues && a.additionValues[key]); }, 0);
            addCountTotal += count; addCashTotal += cash;
            html += "<tr" + auditRowAttrs(record, "add:" + key, mode, count) + "><td>" + ADDITION_NAMES[key] +
                (count ? ' <i class="ti ti-chevron-left row-go no-print"></i>' : "") +
                '</td><td class="num">' + count + '</td><td class="num">' + money(cash) + "</td></tr>";
        });

        html += '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + addCountTotal + '</td><td class="num">' + money(addCashTotal) + "</td></tr></tfoot></table></section>";

        html += "</div>";

        /* الملاحظة الواحدة مرة واحدة مع أرقام وكالاتها (بدل تكرارها لكل وكالة) */
        const noteGroups = groupAgencyNotes(stats.agencies);

        html += '<section class="doc-section doc-notes-section">' + secTitle("ملاحظات الوكالات") +
            (noteGroups.length === 0
                ? '<p class="doc-empty">لا توجد ملاحظات مسجلة على وكالات هذا السجل.</p>'
                : '<ul class="doc-notes doc-notes-grouped">' + noteGroups.map(function (g) {
                    return "<li><span>" + escapeHTML(g.text) + '</span><b class="note-agencies">' +
                        (g.numbers.length > 1 ? "الوكالات (" + g.numbers.length + "): " : "وكالة ") + g.numbers.map(escapeHTML).join("، ") + "</b></li>";
                }).join("") + "</ul>") +
            "</section>";
    }

    html += '<section class="doc-section">' + secTitle("حصص لجنتي الإسعاف والتعاون") +
        '<div class="table-wrapper">' + committeesByTypeTableHTML(stats.committees) + "</div></section>";

    html += docSignatures();
    html += "</div>";

    return html;
}

/* =========================================================
عرض وكالات نوع واحد من السجل (من جدول «الوكالات حسب النوع»)
عرض فقط، مع زر تعديل لكل وكالة يفتحها في نموذج التعديل.
========================================================= */

function buildTypeAgenciesDoc(record, type, backMode, forPrint) {

    const list = (record.agencies || [])
        .map(function (agency, index) { return { agency: agency, index: index }; })
        .filter(function (item) { return item.agency.type === type; })
        .sort(function (a, b) {
            return String(a.agency.number).localeCompare(String(b.agency.number), "ar", { numeric: true });
        });

    const canEdit = !forPrint && currentUser && currentUser.role !== "viewer";
    const typeName = AGENCY_NAMES[type] || type;

    let sumBase = 0, sumTransport = 0, sumRep = 0, sumGrand = 0, active = 0;

    let html = '<div class="final-report doc doc-detailed doc-type-view">';

    if (!forPrint) {
        html += '<div class="report-actions no-print">' +
            '<button type="button" class="secondary-btn" onclick="showFinalRecordReport(\'' + record.id + "', '" + backMode + '\')"><i class="ti ti-arrow-right"></i> رجوع للتقرير</button>' +
            '<button type="button" class="primary-btn" onclick="printTypeAgencies(\'' + record.id + "', '" + type + '\', true)"><i class="ti ti-file-type-pdf"></i> حفظ PDF</button>' +
            '<button type="button" class="secondary-btn" onclick="printTypeAgencies(\'' + record.id + "', '" + type + '\', false)"><i class="ti ti-printer"></i> طباعة</button>' +
            '<button type="button" class="secondary-btn" onclick="closeRecordModal()">إغلاق</button>' +
            "</div>";
    }

    html += docLetterhead(
        typeName + " فقط",
        "سجل " + escapeHTML(record.recordNumber) + " — " + escapeHTML(record.officeName) + " — المندوب: " +
        escapeHTML(record.representativeName) + " — " + formatDay(getRecordDay(record))
    );

    let rows = "";

    list.forEach(function (item) {

        const a = item.agency;
        const cancelled = a.status === "cancelled";
        const t = getAgencyTransport(a);
        const ms = a.stamps || a.missingStamps || {};
        const base = cancelled ? 0 : number(a.basePrice);
        const rep = cancelled ? 0 : number(a.representativeAmount);
        const grand = getAgencyGrandTotal(a);

        if (!cancelled) active += 1;
        sumBase += base; sumTransport += t.total; sumRep += rep; sumGrand += grand;

        const stampParts = [];
        if (number(ms.pleading)) stampParts.push("مرافعة " + number(ms.pleading));
        if (number(ms.ambulance)) stampParts.push("إسعاف " + number(ms.ambulance));
        if (number(ms.aid)) stampParts.push("معونة " + number(ms.aid));

        const additionsList = Object.keys(ADDITION_NAMES)
            .filter(function (key) { return key !== "transport" && number(a.additions && a.additions[key]) > 0; })
            .map(function (key) { return ADDITION_NAMES[key] + ": " + number(a.additions[key]); });

        const statusClass = cancelled ? "st-cancelled" : a.status === "missing" ? "st-missing" : "st-active";

        rows += "<tr" + agencyRowAttrs(a, cancelled ? "row-cancelled" : "") + ">" +
            "<td><strong>" + escapeHTML(a.number) + "</strong>" + (a.duplicate ? ' <span class="badge badge-warning">مكررة</span>' : "") + agencyMarksHTML(a) + "</td>" +
            '<td><span class="status-pill ' + statusClass + '">' + getAgencyStatusName(a.status) + "</span></td>" +
            '<td class="num">' + money(base) + "</td>" +
            '<td class="num">' + (t.count ? money(t.total) + "<br><small>للمندوب " + money(t.share) + "</small>" : "—") + "</td>" +
            '<td class="small-text">' + (additionsList.length ? additionsList.map(escapeHTML).join("<br>") : "—") + "</td>" +
            '<td class="small-text">' + (stampParts.length ? stampParts.join("<br>") + "<br><small>" + money(a.missingStampsValue) + "</small>" : "—") + "</td>" +
            '<td class="num">' + money(rep) + "</td>" +
            '<td class="num total-col">' + money(grand) + "</td>" +
            '<td class="small-text">' + (a.notes ? formatNotesHTML(a.notes) : "—") + "</td>" +
            (canEdit ? '<td class="no-print"><button type="button" class="act-btn" onclick="openAgencyForEdit(\'' + record.id + "', " + item.index + ')"><i class="ti ti-edit"></i> تعديل</button></td>' : "") +
            "</tr>";
    });

    html += '<div class="doc-summary-row">' +
        '<div class="doc-due"><span>المطلوب من المندوب عن ' + escapeHTML(typeName) + "</span><strong>" + money(sumRep) + "</strong>" +
        "<small>" + list.length + " وكالة، منها " + active + " غير ملغاة</small></div>" +
        '<dl class="doc-kpis">' +
            "<div><dt>عدد الوكالات</dt><dd>" + list.length + "</dd></div>" +
            "<div><dt>سعر الوكالات</dt><dd>" + money(sumBase) + "</dd></div>" +
            "<div><dt>بدل الانتقال</dt><dd>" + money(sumTransport) + "</dd></div>" +
            "<div><dt>الإجمالي</dt><dd>" + money(sumGrand) + "</dd></div>" +
        "</dl></div>";

    /* أرقام وكالات هذا النوع للمطابقة السريعة مع السجل الورقي */
    if (list.length) {
        html += '<div class="audit-numbers audit-numbers-wide"><span>أرقام الوكالات للمطابقة مع السجل</span>' +
            agencyNumbersStripHTML(list, false) + "</div>";
    }

    html += '<section class="doc-section doc-section-flow"><h3><span class="sec-no">1</span>' + escapeHTML(typeName) + " — التفاصيل كما أُدخلت</h3>" +
        '<div class="table-wrapper"><table class="doc-table detail-table cls-table"><thead><tr>' +
        "<th>رقم الوكالة</th><th>الحالة</th>" +
        '<th class="num">السعر</th><th class="num">بدل الانتقال</th><th>الإضافات</th><th>الطوابع الناقصة</th>' +
        '<th class="num">المطلوب من المندوب</th><th class="num total-col">الإجمالي</th><th>ملاحظات</th>' +
        (canEdit ? '<th class="no-print"></th>' : "") +
        "</tr></thead><tbody>" + rows + "</tbody>" +
        '<tfoot><tr><td colspan="2">الإجمالي (' + list.length + " وكالة)</td>" +
        '<td class="num">' + money(sumBase) + '</td><td class="num">' + money(sumTransport) + "</td><td></td><td></td>" +
        '<td class="num">' + money(sumRep) + '</td><td class="num total-col">' + money(sumGrand) + "</td><td></td>" +
        (canEdit ? '<td class="no-print"></td>' : "") +
        "</tr></tfoot></table></div></section>";


    if (forPrint) {
        html += docSignatures();
    }

    html += "</div>";

    return html;
}

function showTypeAgencies(recordId, type, backMode) {
    const record = records.find(function (item) { return item.id === recordId; });
    if (!record) return;
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("recordModal");
    if (!modalContent || !modal) return;
    modalContent.innerHTML = buildTypeAgenciesDoc(record, type, backMode || "summary", false);
    modal.classList.remove("hidden");
    modalContent.scrollTop = 0;
    /* الحاوية التي تتمرر فعلاً هي .modal-content */
    modalContent.closest(".modal-content")?.scrollTo(0, 0);
}

function printTypeAgencies(recordId, type, pdf) {
    const record = records.find(function (item) { return item.id === recordId; });
    if (!record) return;
    openReportDocument(
        buildTypeAgenciesDoc(record, type, "summary", true),
        (AGENCY_NAMES[type] || type) + " - سجل " + sanitizeFileNamePart(record.recordNumber),
        { pdf: !!pdf, landscape: true }
    );
}

window.showTypeAgencies = showTypeAgencies;
window.printTypeAgencies = printTypeAgencies;

/* =========================================================
التدقيق السريع لبند واحد من السجل
الضغط على «بدل الانتقال» أو «نقص مرافعة» أو أي إضافة (حفظ، وكيل عن…)
يعرض الوكالات التي فيها هذا البند فقط، من كل الأنواع، مع أرقامها
مصفوفة في الأعلى للمطابقة السريعة مع السجل الورقي، وزر تعديل لكل وكالة.
filter: "transport" | "missing:pleading|ambulance|aid" | "add:<مفتاح الإضافة>"
========================================================= */

const AUDIT_STAMP_NAMES = {
    pleading: "نقص مرافعة",
    ambulance: "نقص إسعاف",
    aid: "نقص معونة"
};

function auditFilterInfo(filter) {

    filter = String(filter || "");

    if (filter === "transport") {
        return {
            label: "بدل الانتقال",
            icon: "ti-route",
            count: function (agency) { return getAgencyTransport(agency).count; }
        };
    }

    const parts = filter.split(":");
    const key = parts[1];

    if (parts[0] === "missing" && AUDIT_STAMP_NAMES[key]) {
        return {
            label: AUDIT_STAMP_NAMES[key],
            icon: "ti-receipt",
            count: function (agency) {
                return number((agency.stamps || agency.missingStamps || {})[key]);
            }
        };
    }

    if (parts[0] === "add" && ADDITION_NAMES[key]) {
        return {
            label: ADDITION_NAMES[key],
            icon: "ti-circle-plus",
            count: function (agency) {
                return number(agency.additions && agency.additions[key]);
            }
        };
    }

    return null;
}

/* الوكالات غير الملغاة التي فيها البند، مرتبة حسب رقم الوكالة */
function auditAgencies(record, filter) {

    const info = auditFilterInfo(filter);

    if (!info) {
        return [];
    }

    return (record.agencies || [])
        .map(function (agency, index) {
            return { agency: agency, index: index, count: agency.status === "cancelled" ? 0 : info.count(agency) };
        })
        .filter(function (item) { return item.count > 0; })
        .sort(function (a, b) {
            return String(a.agency.number).localeCompare(String(b.agency.number), "ar", { numeric: true });
        });
}

/* صف قابل للضغط في جداول التقرير المختصر */
function auditRowAttrs(record, filter, mode, count) {
    if (!count) {
        return ' class="row-zero"';
    }
    const info = auditFilterInfo(filter);
    return ' class="clickable-row" tabindex="0" role="button" title="اضغط لعرض الوكالات التي فيها ' + info.label + '"' +
        ' onclick="showAgencyAudit(\'' + record.id + "', '" + filter + "', '" + mode + '\')"';
}

/* أزرار التدقيق السريع أعلى التقرير: كل بند موجود في السجل مع عدده */
function quickAuditHTML(record, mode) {

    const filters = ["transport"]
        .concat(Object.keys(AUDIT_STAMP_NAMES).map(function (k) { return "missing:" + k; }))
        .concat(Object.keys(ADDITION_NAMES).filter(function (k) { return k !== "transport"; }).map(function (k) { return "add:" + k; }));

    const chips = filters.map(function (filter) {
        const info = auditFilterInfo(filter);
        const list = auditAgencies(record, filter);
        if (!list.length) return "";
        const total = list.reduce(function (s, item) { return s + item.count; }, 0);
        return '<button type="button" class="audit-chip" onclick="showAgencyAudit(\'' + record.id + "', '" + filter + "', '" + mode + '\')">' +
            '<i class="ti ' + info.icon + '" aria-hidden="true"></i>' + info.label +
            "<b>" + total + "</b><small>" + list.length + " وكالة</small></button>";
    }).join("");

    if (!chips) {
        return "";
    }

    return '<section class="quick-audit no-print" aria-label="تدقيق سريع">' +
        '<h4><i class="ti ti-list-search" aria-hidden="true"></i> تدقيق سريع: اضغط على بند لعرض وكالاته فقط</h4>' +
        '<div class="audit-chips">' + chips + "</div></section>";
}

/* أرقام الوكالات مصفوفة للمطابقة السريعة مع السجل الورقي */
function agencyNumbersStripHTML(list, showCount) {
    return '<div class="numbers-strip" aria-label="أرقام الوكالات">' +
        list.map(function (item) {
            const state = item.agency.status === "missing" ? " is-missing" : item.agency.status === "cancelled" ? " is-cancelled" : "";
            return '<span class="num-tag' + state + '" title="' + getAgencyStatusName(item.agency.status) + '">' + escapeHTML(item.agency.number) +
                (showCount && item.count > 1 ? "<small>×" + item.count + "</small>" : "") + "</span>";
        }).join("") +
        "</div>";
}

function buildAgencyAuditDoc(record, filter, backMode, forPrint) {

    const info = auditFilterInfo(filter);
    const list = auditAgencies(record, filter);
    const canEdit = !forPrint && currentUser && currentUser.role !== "viewer";
    const total = list.reduce(function (s, item) { return s + item.count; }, 0);

    let html = '<div class="final-report doc doc-detailed doc-type-view doc-audit">';

    if (!forPrint) {
        html += '<div class="report-actions no-print">' +
            '<button type="button" class="secondary-btn" onclick="showFinalRecordReport(\'' + record.id + "', '" + backMode + '\')"><i class="ti ti-arrow-right"></i> رجوع للتقرير</button>' +
            '<button type="button" class="primary-btn" onclick="printAgencyAudit(\'' + record.id + "', '" + filter + '\', true)"><i class="ti ti-file-type-pdf"></i> حفظ PDF</button>' +
            '<button type="button" class="secondary-btn" onclick="printAgencyAudit(\'' + record.id + "', '" + filter + '\', false)"><i class="ti ti-printer"></i> طباعة</button>' +
            '<button type="button" class="secondary-btn" onclick="closeRecordModal()">إغلاق</button>' +
            "</div>";
    }

    html += docLetterhead(
        "الوكالات التي فيها " + info.label,
        "سجل " + escapeHTML(record.recordNumber) + " — " + escapeHTML(record.officeName) + " — المندوب: " +
        escapeHTML(record.representativeName) + " — " + formatDay(getRecordDay(record))
    );

    html += '<div class="audit-summary">' +
        '<div class="audit-total"><span>' + info.label + "</span><strong>" + total + "</strong><small>في " + list.length + " وكالة</small></div>" +
        '<div class="audit-numbers"><span>أرقام الوكالات للمطابقة مع السجل</span>' +
        (list.length ? agencyNumbersStripHTML(list, true) : '<p class="doc-empty">لا توجد وكالات فيها هذا البند.</p>') +
        "</div></div>";

    if (list.length) {

        let rows = "";

        list.forEach(function (item) {

            const a = item.agency;
            const ms = a.stamps || a.missingStamps || {};
            const statusClass = a.status === "missing" ? "st-missing" : "st-active";

            const stampParts = [];
            if (number(ms.pleading)) stampParts.push("مرافعة " + number(ms.pleading));
            if (number(ms.ambulance)) stampParts.push("إسعاف " + number(ms.ambulance));
            if (number(ms.aid)) stampParts.push("معونة " + number(ms.aid));

            const additionsText = agencyAdditionsToText(a, false);

            rows += "<tr" + agencyRowAttrs(a, "") + ">" +
                '<td><strong class="audit-no">' + escapeHTML(a.number) + "</strong>" + (a.duplicate ? ' <span class="badge badge-warning">مكررة</span>' : "") + "</td>" +
                "<td>" + agencyTypeDot(a.type) + escapeHTML(AGENCY_NAMES[a.type] || a.type || "-") + "</td>" +
                '<td><span class="status-pill ' + statusClass + '">' + getAgencyStatusName(a.status) + "</span></td>" +
                '<td class="num audit-count">' + item.count + "</td>" +
                '<td class="small-text">' + (additionsText === "-" ? "—" : escapeHTML(additionsText)) + "</td>" +
                '<td class="small-text">' + (stampParts.length ? stampParts.join("<br>") : "—") + "</td>" +
                '<td class="num">' + money(a.representativeAmount) + "</td>" +
                '<td class="small-text">' + (a.notes ? formatNotesHTML(a.notes) : "—") + "</td>" +
                (canEdit ? '<td class="no-print"><button type="button" class="act-btn" onclick="openAgencyForEdit(\'' + record.id + "', " + item.index + ')"><i class="ti ti-edit"></i> تعديل</button></td>' : "") +
                "</tr>";
        });

        html += '<section class="doc-section doc-section-flow"><h3><span class="sec-no">1</span>التفاصيل كما أُدخلت</h3>' +
            '<div class="table-wrapper"><table class="doc-table detail-table cls-table"><thead><tr>' +
            "<th>رقم الوكالة</th><th>النوع</th><th>الحالة</th>" +
            '<th class="num">' + escapeHTML(info.label) + "</th><th>كل الإضافات</th><th>الطوابع الناقصة</th>" +
            '<th class="num">المطلوب من المندوب</th><th>ملاحظات</th>' +
            (canEdit ? '<th class="no-print"></th>' : "") +
            "</tr></thead><tbody>" + rows + "</tbody>" +
            '<tfoot><tr><td colspan="3">الإجمالي (' + list.length + " وكالة)</td>" +
            '<td class="num">' + total + "</td><td></td><td></td><td></td><td></td>" +
            (canEdit ? '<td class="no-print"></td>' : "") +
            "</tr></tfoot></table></div></section>";
    }

    if (forPrint) {
        html += docSignatures();
    }

    html += "</div>";

    return html;
}

function showAgencyAudit(recordId, filter, backMode) {
    const record = records.find(function (item) { return item.id === recordId; });
    if (!record || !auditFilterInfo(filter)) return;
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("recordModal");
    if (!modalContent || !modal) return;
    modalContent.innerHTML = buildAgencyAuditDoc(record, filter, backMode || "summary", false);
    modal.classList.remove("hidden");
    modalContent.scrollTop = 0;
    /* الحاوية التي تتمرر فعلاً هي .modal-content */
    modalContent.closest(".modal-content")?.scrollTo(0, 0);
}

function printAgencyAudit(recordId, filter, pdf) {
    const record = records.find(function (item) { return item.id === recordId; });
    const info = auditFilterInfo(filter);
    if (!record || !info) return;
    openReportDocument(
        buildAgencyAuditDoc(record, filter, "summary", true),
        info.label + " - سجل " + sanitizeFileNamePart(record.recordNumber),
        { pdf: !!pdf, landscape: true }
    );
}

window.showAgencyAudit = showAgencyAudit;
window.printAgencyAudit = printAgencyAudit;

function showFinalRecordReport(id, mode) {
    const record = records.find(function (item) { return item.id === id; });
    if (!record) return;
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("recordModal");
    if (!modalContent || !modal) return;
    modalContent.innerHTML = buildFinalRecordReport(record, mode || "summary");
    modal.classList.remove("hidden");
    modalContent.scrollTop = 0;
    /* الحاوية التي تتمرر فعلاً هي .modal-content */
    modalContent.closest(".modal-content")?.scrollTo(0, 0);
}

/* =========================================================
الطباعة والحفظ PDF
الطريقة السابقة كانت تفتح نافذة منبثقة جديدة وتحمّل فيها ملف التنسيق،
فتفشل عند حظر النوافذ المنبثقة أو عند فتح النظام كملف من الجهاز،
وتخرج بعض التقارير بلا تنسيق. الآن يُطبع التقرير من داخل الصفحة نفسها
(الخطوط والتنسيق محمّلة مسبقاً)، ومحرك الطباعة في المتصفح يُخرج PDF
بنص حقيقي (Vector) واضح عند أي تكبير وقابل للنسخ والبحث.
========================================================= */

let printCleanupTimer = null;

function cleanupPrint() {

    const root = document.getElementById("printRoot");

    document.body.classList.remove("is-printing");

    if (root) {
        root.innerHTML = "";
    }

    if (document.body.dataset.titleBeforePrint) {
        document.title = document.body.dataset.titleBeforePrint;
        delete document.body.dataset.titleBeforePrint;
    }
}

window.addEventListener("afterprint", function () {
    clearTimeout(printCleanupTimer);
    printCleanupTimer = setTimeout(cleanupPrint, 300);
});

/* =========================================================
رسائل النظام: إشعارات قصيرة ونافذة تأكيد بتصميم النظام
بدل نوافذ المتصفح (alert / confirm).
========================================================= */

const TOAST_ICONS = {
    success: "ti-circle-check",
    error: "ti-alert-circle",
    warning: "ti-alert-triangle",
    info: "ti-info-circle"
};

/*
    html: نص الرسالة (قد يحتوي <strong> و <span> لسطرين).
    variant: success | error | warning | info
    rich: true إذا كان html يحتوي سطرين جاهزين.
*/
function showToast(html, ms, variant) {

    let toast = document.getElementById("appToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.className = "app-toast no-print";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
        toast.addEventListener("click", function () {
            toast.classList.remove("show");
        });
    }

    variant = variant || "info";

    toast.className = "app-toast no-print toast-" + variant;
    toast.setAttribute("role", variant === "error" ? "alert" : "status");
    toast.innerHTML =
        '<i class="ti ' + (TOAST_ICONS[variant] || TOAST_ICONS.info) + ' toast-icon" aria-hidden="true"></i>' +
        '<div class="toast-body">' + html + "</div>";

    /* إعادة تشغيل الحركة حتى لو كانت الرسالة السابقة ظاهرة */
    void toast.offsetWidth;
    toast.classList.add("show");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
        toast.classList.remove("show");
    }, ms || (variant === "error" ? 6000 : 4000));
}

function notify(message, variant, ms, rich) {
    showToast(rich ? message : "<strong>" + message + "</strong>", ms, variant || "info");
}

/*
    أي خطأ غير متوقع يظهر للمستخدم برسالة بدل أن يفشل الإجراء بصمت،
    حتى يمكن معرفة سببه وإصلاحه (نص الخطأ يُنقل كما هو).
*/
let lastErrorNoticeAt = 0;

function reportUnexpectedError(message) {
    const now = Date.now();
    if (now - lastErrorNoticeAt < 4000) return;
    lastErrorNoticeAt = now;
    notify(
        "<strong>حدث خطأ غير متوقع</strong><span>لم يكتمل الإجراء الأخير. صوّر هذه الرسالة وأرسلها للمسؤول: " +
        escapeHTML(String(message || "").slice(0, 200)) + "</span>",
        "error",
        15000,
        true
    );
}

window.addEventListener("error", function (event) {
    /* أخطاء تحميل الملفات الخارجية (مثل مكتبة Excel) لا تخص المستخدم */
    if (!event.message) return;
    reportUnexpectedError(event.message + (event.lineno ? " (سطر " + event.lineno + ")" : ""));
});

window.addEventListener("unhandledrejection", function (event) {
    reportUnexpectedError(event.reason && event.reason.message || event.reason);
});

/* رسالة تظهر بعد إعادة تحميل الصفحة (حفظ الأسعار، الاستعادة...) */
const FLASH_KEY = "audit_flash_message";

function flashNotify(message, variant) {
    try {
        sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message: message, variant: variant || "info" }));
    } catch (e) {}
}

onReady(function () {
    let flash = null;
    try {
        flash = JSON.parse(sessionStorage.getItem(FLASH_KEY) || "null");
        sessionStorage.removeItem(FLASH_KEY);
    } catch (e) {}
    if (flash && flash.message) {
        notify(flash.message, flash.variant, 4500);
    }
});

/*
    نافذة اختيار بين عدة أفعال. تُرجع Promise بقيمة الخيار، أو null عند الإلغاء.
    options: { title, message, choices: [{ value, label, kind: primary|secondary|danger }] }
*/
function appChoose(options) {

    options = options || {};

    return new Promise(function (resolve) {

        const dialog = document.createElement("dialog");
        dialog.className = "app-dialog no-print";
        dialog.setAttribute("aria-labelledby", "appChooseTitle");

        dialog.innerHTML =
            '<div class="app-dialog-card">' +
                '<div class="app-dialog-icon" aria-hidden="true"><i class="ti ti-arrows-sort"></i></div>' +
                '<h3 id="appChooseTitle"></h3>' +
                '<p class="app-dialog-message"></p>' +
                '<div class="app-dialog-actions app-choose-actions"></div>' +
            "</div>";

        dialog.querySelector("h3").textContent = options.title || "اختر";
        dialog.querySelector(".app-dialog-message").textContent = options.message || "";

        let done = false;

        const finish = function (value) {
            if (done) return;
            done = true;
            try { if (dialog.open) dialog.close(); } catch (e) {}
            dialog.remove();
            resolve(value);
        };

        const actions = dialog.querySelector(".app-choose-actions");

        (options.choices || []).concat([{ value: null, label: "إلغاء", kind: "secondary" }]).forEach(function (choice) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = (choice.kind === "danger" ? "danger-btn" : choice.kind === "primary" ? "primary-btn" : "secondary-btn");
            b.textContent = choice.label;
            b.addEventListener("click", function () { finish(choice.value); });
            actions.appendChild(b);
        });

        dialog.addEventListener("cancel", function (event) { event.preventDefault(); finish(null); });
        dialog.addEventListener("close", function () { finish(null); });
        dialog.addEventListener("keydown", function (event) {
            if (event.key === "Escape") { event.preventDefault(); finish(null); }
        });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) finish(null);
        });

        document.body.appendChild(dialog);

        if (typeof dialog.showModal === "function") {
            dialog.showModal();
            actions.querySelector("button")?.focus();
        } else {
            finish(null);
        }
    });
}

/*
    نافذة تأكيد بتصميم النظام. تُرجع Promise بقيمة true عند التأكيد.
    options: { title, message, confirmText, cancelText, danger }
*/
function appConfirm(options) {

    options = options || {};

    return new Promise(function (resolve) {

        const dialog = document.createElement("dialog");
        dialog.className = "app-dialog no-print" + (options.danger ? " is-danger" : "");
        dialog.setAttribute("aria-labelledby", "appDialogTitle");

        dialog.innerHTML =
            '<div class="app-dialog-card">' +
                '<div class="app-dialog-icon" aria-hidden="true"><i class="ti ' + (options.danger ? "ti-alert-triangle" : "ti-help-circle") + '"></i></div>' +
                '<h3 id="appDialogTitle"></h3>' +
                '<p class="app-dialog-message"></p>' +
                '<div class="app-dialog-actions">' +
                    '<button type="button" class="' + (options.danger ? "danger-btn" : "primary-btn") + ' app-dialog-ok"></button>' +
                    '<button type="button" class="secondary-btn app-dialog-cancel"></button>' +
                "</div>" +
            "</div>";

        dialog.querySelector("h3").textContent = options.title || "تأكيد";
        dialog.querySelector(".app-dialog-message").textContent = options.message || "";
        dialog.querySelector(".app-dialog-ok").textContent = options.confirmText || "تأكيد";
        dialog.querySelector(".app-dialog-cancel").textContent = options.cancelText || "إلغاء";

        document.body.appendChild(dialog);

        /*
            النتيجة تُعاد مباشرة عند الضغط، ولا نعتمد على حدث «close»
            الذي قد يتأخر في بعض المتصفحات. finish تعمل مرة واحدة فقط.
        */
        let done = false;

        const finish = function (ok) {
            if (done) return;
            done = true;
            try { if (dialog.open) dialog.close(); } catch (e) {}
            dialog.remove();
            resolve(ok);
        };

        dialog.querySelector(".app-dialog-ok").addEventListener("click", function () { finish(true); });
        dialog.querySelector(".app-dialog-cancel").addEventListener("click", function () { finish(false); });

        /* Esc أو الإغلاق بأي طريقة أخرى = إلغاء */
        dialog.addEventListener("cancel", function (event) {
            event.preventDefault();
            finish(false);
        });
        dialog.addEventListener("close", function () { finish(false); });
        dialog.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.preventDefault();
                finish(false);
            }
        });

        /* الضغط خارج البطاقة = إلغاء */
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) {
                finish(false);
            }
        });

        if (typeof dialog.showModal === "function") {
            dialog.showModal();
            /* زر الإلغاء أولاً في الحذف حتى لا يُحذف شيء بضغطة Enter */
            (options.danger ? dialog.querySelector(".app-dialog-cancel") : dialog.querySelector(".app-dialog-ok")).focus();
        } else {
            dialog.remove();
            resolve(window.confirm(options.message || options.title || ""));
        }
    });
}

function openReportDocument(bodyHTML, title, options) {

    options = options || {};

    const root = document.getElementById("printRoot");

    if (!root) {
        return;
    }

    clearTimeout(printCleanupTimer);

    let pageStyle = document.getElementById("printPageStyle");

    if (!pageStyle) {
        pageStyle = document.createElement("style");
        pageStyle.id = "printPageStyle";
        document.head.appendChild(pageStyle);
    }

    pageStyle.textContent =
        "@page{size:A4 " + (options.landscape ? "landscape" : "portrait") + ";margin:10mm 9mm 12mm}";

    root.className = "print-doc" + (options.landscape ? " print-landscape" : "");
    root.innerHTML = bodyHTML;

    /* عنوان الصفحة يصبح الاسم الافتراضي لملف PDF */
    if (!document.body.dataset.titleBeforePrint) {
        document.body.dataset.titleBeforePrint = document.title;
    }
    document.title = title;

    document.body.classList.add("is-printing");

    if (options.pdf) {
        showToast(
            "<strong>حفظ كملف PDF</strong>" +
            "<span>في نافذة الطباعة اختر من قائمة «الوجهة / الطابعة»: <b>حفظ بتنسيق PDF</b> (Save as PDF)، " +
            "وتأكد من تفعيل «رسومات الخلفية» ثم اضغط حفظ.</span>",
            9000
        );
    }

    const doPrint = function () {
        window.print();
        /* احتياط للمتصفحات التي لا تطلق afterprint */
        printCleanupTimer = setTimeout(cleanupPrint, 60000);
    };

    const fonts = document.fonts;

    if (fonts && fonts.ready) {
        fonts.ready.then(function () { setTimeout(doPrint, 150); });
    } else {
        setTimeout(doPrint, 300);
    }
}

function recordFileTitle(record, mode) {
    return (mode === "detailed" ? "تقرير مفصل" : "تقرير مختصر") +
        " - سجل " + sanitizeFileNamePart(record.recordNumber) +
        " - " + sanitizeFileNamePart(record.officeName) +
        " - " + sanitizeFileNamePart(record.representativeName);
}

function printFinalRecordReport(id, mode) {
    const record = records.find(function (item) { return item.id === id; });
    if (!record) return;
    openReportDocument(buildFinalRecordReport(record, mode || "summary"), recordFileTitle(record, mode), {
        landscape: mode === "detailed"
    });
}

function exportRecordToPDF(id, mode) {
    const record = records.find(function (item) { return item.id === id; });
    if (!record) return;
    openReportDocument(buildFinalRecordReport(record, mode || "summary"), recordFileTitle(record, mode), {
        landscape: mode === "detailed",
        pdf: true
    });
}

/*
    التقرير العام كمستند مطبوع بنفس تصميم تقارير السجلات
    (بدلاً من نسخ صفحة التقارير كما هي بخلفياتها الداكنة).
*/
function buildGeneralReportDoc() {

    const filter = getReportFilter();
    const filterActive = isReportFilterActive(filter);
    const matched = getFilteredAgencies(filter);
    const all = matched.map(function (m) { return m.agency; });
    const recordCount = new Set(matched.map(function (m) { return m.record.id; })).size;

    const pseudo = getRecordFinalStats({ agencies: all });
    const baseTotal = Object.keys(pseudo.byType).reduce(function (s, t) { return s + pseudo.byType[t].total; }, 0);
    const missingTotalCount = pseudo.missing.pleading + pseudo.missing.ambulance + pseudo.missing.aid;

    let sec = 0;
    const secTitle = function (text) {
        sec += 1;
        return '<h3><span class="sec-no">' + arabicDigit(sec) + "</span>" + text + "</h3>";
    };

    let html = '<div class="final-report doc doc-summary doc-general-print">';

    html += docLetterhead(
        filterActive ? "تقرير مصفّى" : "التقرير العام",
        filterActive
            ? escapeHTML(reportFilterLabel(filter)) + " — " + todayArabic()
            : "كل السجلات حتى تاريخ " + todayArabic() + " — " + records.length + " سجل"
    );

    html += '<div class="doc-summary-row">' +
        '<div class="doc-due"><span>' + (filterActive ? "المطلوب (حسب التصفية)" : "المطلوب من جميع المندوبين") + "</span><strong>" + money(pseudo.representativeTotal) + "</strong>" +
        "<small>عن " + pseudo.active.length + " وكالة غير ملغاة في " + recordCount + " سجل</small></div>" +
        '<dl class="doc-kpis">' +
            "<div><dt>فعالة</dt><dd>" + (pseudo.active.length - pseudo.missingAgenciesCount) + "</dd></div>" +
            "<div><dt>مفقودة</dt><dd>" + pseudo.missingAgenciesCount + "</dd></div>" +
            "<div><dt>ملغاة</dt><dd>" + pseudo.cancelled + "</dd></div>" +
            "<div><dt>سعر الوكالات</dt><dd>" + money(baseTotal) + "</dd></div>" +
            "<div><dt>الإضافات النقدية</dt><dd>" + money(pseudo.additionsTotal) + "</dd></div>" +
            "<div><dt>قيمة الطوابع الناقصة</dt><dd>" + money(pseudo.missingValue) + "</dd></div>" +
            "<div><dt>قيمة بدل الانتقال</dt><dd>" + money(pseudo.transport.total) + "</dd></div>" +
            "<div><dt>المطلوب من بدل الانتقال</dt><dd>" + money(pseudo.transport.cash) + "</dd></div>" +
        "</dl></div>";

    html += '<section class="doc-section">' + secTitle("الوكالات حسب النوع") +
        '<table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">العدد</th><th class="num">إجمالي السعر</th></tr></thead><tbody>' +
        Object.keys(AGENCY_NAMES).map(function (type) {
            const item = pseudo.byType[type] || { count: 0, total: 0 };
            return "<tr" + (item.count === 0 ? ' class="row-zero"' : "") + "><td>" + AGENCY_NAMES[type] + '</td><td class="num">' + item.count + '</td><td class="num">' + money(item.total) + "</td></tr>";
        }).join("") +
        '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + pseudo.active.length + '</td><td class="num">' + money(baseTotal) + "</td></tr></tfoot></table></section>";

    html += '<div class="doc-two-col">';

    html += '<section class="doc-section">' + secTitle("الطوابع الناقصة") +
        '<table class="doc-table"><thead><tr><th>الطابع</th><th class="num">العدد</th><th class="num">القيمة</th></tr></thead><tbody>' +
        "<tr><td>مرافعة</td><td class=\"num\">" + pseudo.missing.pleading + '</td><td class="num">' + money(pseudo.missing.pleading * number(stampPrices.pleading)) + "</td></tr>" +
        "<tr><td>إسعاف</td><td class=\"num\">" + pseudo.missing.ambulance + '</td><td class="num">' + money(pseudo.missing.ambulance * number(stampPrices.ambulance)) + "</td></tr>" +
        "<tr><td>معونة</td><td class=\"num\">" + pseudo.missing.aid + '</td><td class="num">' + money(pseudo.missing.aid * number(stampPrices.aid)) + "</td></tr>" +
        '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + missingTotalCount + '</td><td class="num">' + money(pseudo.missingValue) + "</td></tr></tfoot></table></section>";

    html += '<section class="doc-section">' + secTitle("بدل الانتقال") + transportTableHTML(pseudo.transport) + "</section>";

    html += "</div>";

    html += '<section class="doc-section">' + secTitle("حصص لجنتي الإسعاف والتعاون") + committeesByTypeTableHTML(pseudo.committees) + "</section>";

    /* حسب المندوب */
    const map = {};
    matched.forEach(function (m) {
        const name = (m.record.representativeName || "-").trim() || "-";
        if (!map[name]) map[name] = { ids: new Set(), records: 0, agencies: 0, share: 0, total: 0 };
        map[name].ids.add(m.record.id);
        map[name].records = map[name].ids.size;
        map[name].agencies += 1;
        map[name].share += getAgencyTransport(m.agency).share;
        map[name].total += m.agency.status === "cancelled" ? 0 : number(m.agency.representativeAmount);
    });

    const names = Object.keys(map).sort(function (a, b) { return map[b].total - map[a].total; });

    html += '<section class="doc-section">' + secTitle("المطلوب من كل مندوب") +
        '<table class="doc-table"><thead><tr><th>المندوب</th><th class="num">السجلات</th><th class="num">الوكالات</th><th class="num">حصته من بدل الانتقال</th><th class="num">المطلوب</th></tr></thead><tbody>' +
        (names.length === 0
            ? '<tr><td colspan="5">لا توجد بيانات.</td></tr>'
            : names.map(function (name) {
                const item = map[name];
                return "<tr><td>" + escapeHTML(name) + '</td><td class="num">' + item.records + '</td><td class="num">' + item.agencies + '</td><td class="num">' + money(item.share) + '</td><td class="num"><strong>' + money(item.total) + "</strong></td></tr>";
            }).join("")) +
        '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + recordCount + '</td><td class="num">' + pseudo.agencies.length + '</td><td class="num">' + money(pseudo.transport.share) + '</td><td class="num">' + money(pseudo.representativeTotal) + "</td></tr></tfoot></table></section>";

    if (filterActive) {
        html += '<section class="doc-section doc-section-flow">' + secTitle("الوكالات المطابقة للتصفية") +
            filteredAgenciesTableHTML(matched, true) + "</section>";
    }


    html += docSignatures();
    html += "</div>";

    return html;
}

function exportReportsToPDF() {
    const filtered = isReportFilterActive(getReportFilter());
    openReportDocument(
        buildGeneralReportDoc(),
        (filtered ? "تقرير مصفى - " : "التقرير العام - ") + todayDay(),
        { pdf: true, landscape: filtered }
    );
}

/* =========================================================
نافذة حصص اللجان
========================================================= */

function getCommitteeFilteredRecords() {

    const from = document.getElementById("committeeFrom")?.value;
    const to = document.getElementById("committeeTo")?.value;
    const rep = document.getElementById("committeeRep")?.value || "";
    const recordId = document.getElementById("committeeRecord")?.value || "";

    return records.filter(function (record) {
        const day = getRecordDay(record);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (rep && (record.representativeName || "").trim() !== rep) return false;
        if (recordId && record.id !== recordId) return false;
        return true;
    });
}

function fillCommitteeFilterOptions() {

    const repSelect = document.getElementById("committeeRep");
    const recordSelect = document.getElementById("committeeRecord");

    if (repSelect) {
        const current = repSelect.value;
        const names = Array.from(new Set(records.map(function (r) { return (r.representativeName || "").trim(); }).filter(Boolean))).sort();
        repSelect.innerHTML = '<option value="">كل المندوبين</option>' +
            names.map(function (n) { return '<option value="' + escapeHTML(n) + '">' + escapeHTML(n) + "</option>"; }).join("");
        repSelect.value = names.indexOf(current) !== -1 ? current : "";
    }

    if (recordSelect) {
        const current = recordSelect.value;
        recordSelect.innerHTML = '<option value="">كل السجلات</option>' +
            records.map(function (r) {
                return '<option value="' + r.id + '">سجل ' + escapeHTML(r.recordNumber) + " — " + escapeHTML(r.officeName) + "</option>";
            }).join("");
        recordSelect.value = records.some(function (r) { return r.id === current; }) ? current : "";
    }
}

function committeeFilterLabel() {

    const parts = [];
    const from = document.getElementById("committeeFrom")?.value;
    const to = document.getElementById("committeeTo")?.value;
    const rep = document.getElementById("committeeRep")?.value;
    const recordSelect = document.getElementById("committeeRecord");

    if (from) parts.push("من " + from);
    if (to) parts.push("إلى " + to);
    if (rep) parts.push("المندوب: " + rep);
    if (recordSelect && recordSelect.value) parts.push(recordSelect.options[recordSelect.selectedIndex].text);

    return parts.length ? parts.join(" — ") : "كل السجلات";
}

function buildCommitteesDoc(forPrint) {

    const list = getCommitteeFilteredRecords();
    const allAgencies = [];

    list.forEach(function (record) {
        (record.agencies || []).forEach(function (a) { allAgencies.push(a); });
    });

    const totals = sumCommittees(allAgencies);

    let html = '<div class="final-report doc doc-summary doc-committees">';

    if (forPrint) {
        html += docLetterhead("حصص لجنتي الإسعاف والتعاون", committeeFilterLabel() + " — تاريخ الإصدار: " + todayArabic());
    }

    html += '<div class="committee-kpis">' +
        '<div class="ck ck-amb"><span>حصة لجنة الإسعاف</span><strong>' + money(totals.ambulance) + "</strong></div>" +
        '<div class="ck ck-coop"><span>حصة لجنة التعاون</span><strong>' + money(totals.cooperation) + "</strong></div>" +
        '<div class="ck ck-sum"><span>مجموع الحصتين</span><strong>' + money(totals.ambulance + totals.cooperation) + "</strong>" +
        "<small>عن " + totals.count + " وكالة غير ملغاة في " + list.length + " سجل</small></div>" +
        "</div>";

    html += '<section class="doc-section"><h3><span class="sec-no">1</span>حسب نوع الوكالة</h3>' +
        '<div class="table-wrapper">' + committeesByTypeTableHTML(totals) + "</div></section>";

    html += '<section class="doc-section"><h3><span class="sec-no">2</span>حسب السجل</h3>' +
        '<div class="table-wrapper"><table class="doc-table"><thead><tr><th>رقم السجل</th><th>المكتب</th><th>المندوب</th><th>التاريخ</th>' +
        '<th class="num">الوكالات</th><th class="num">لجنة الإسعاف</th><th class="num">لجنة التعاون</th><th class="num">المجموع</th></tr></thead><tbody>';

    if (list.length === 0) {
        html += '<tr><td colspan="8">لا توجد سجلات ضمن الفلترة المحددة.</td></tr>';
    }

    list.forEach(function (record) {
        const c = sumCommittees(record.agencies, getRecordDay(record));
        const date = formatDay(getRecordDay(record));
        html += "<tr><td>" + escapeHTML(record.recordNumber) + "</td><td>" + escapeHTML(record.officeName) + "</td><td>" +
            escapeHTML(record.representativeName) + "</td><td>" + date + '</td><td class="num">' + c.count + '</td><td class="num">' +
            money(c.ambulance) + '</td><td class="num">' + money(c.cooperation) + '</td><td class="num">' + money(c.ambulance + c.cooperation) + "</td></tr>";
    });

    html += '</tbody><tfoot><tr><td colspan="4">الإجمالي</td><td class="num">' + totals.count + '</td><td class="num">' + money(totals.ambulance) +
        '</td><td class="num">' + money(totals.cooperation) + '</td><td class="num">' + money(totals.ambulance + totals.cooperation) + "</td></tr></tfoot></table></div></section>";

    if (forPrint) {
        html += docSignatures();
    } else {
        html += '<p class="field-hint">حصة كل لجنة = سعر الوكالة في السجل × نسبة نوعها (من قسم الأسعار ← أسعار اللجان)، والوكالات الملغاة غير محسوبة.</p>';
    }

    html += "</div>";

    return { html: html, totals: totals, list: list };
}

function renderCommittees() {
    const container = document.getElementById("committeesContent");
    if (!container) return;
    fillCommitteeFilterOptions();
    container.innerHTML = buildCommitteesDoc(false).html;
}

function resetCommitteeFilters() {
    ["committeeFrom", "committeeTo", "committeeRep", "committeeRecord"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    renderCommittees();
}

function printCommitteesReport(pdf) {
    openReportDocument(
        buildCommitteesDoc(true).html,
        "حصص اللجان - " + new Date().toISOString().slice(0, 10),
        { pdf: !!pdf }
    );
}

function exportCommitteesToExcel() {

    if (typeof XLSX === "undefined") {
        notify("تعذر تحميل مكتبة الإكسل. تأكد من الاتصال بالإنترنت ثم حدّث الصفحة.", "error");
        return;
    }

    const result = buildCommitteesDoc(false);
    const totals = result.totals;
    const subtitle = committeeFilterLabel() + " — " + todayArabic();

    const typeRows = Object.keys(AGENCY_NAMES).map(function (type) {
        const item = totals.byType[type];
        return [AGENCY_NAMES[type], item.count, shareAmountsText(item.ambAmounts), item.ambulance, shareAmountsText(item.coopAmounts), item.cooperation, item.ambulance + item.cooperation];
    });

    const typesSheet = buildStyledTableSheet({
        title: "حصص لجنتي الإسعاف والتعاون — حسب نوع الوكالة",
        subtitle: subtitle,
        headers: ["نوع الوكالة", "العدد", "حصة الإسعاف للوكالة", "لجنة الإسعاف", "حصة التعاون للوكالة", "لجنة التعاون", "المجموع"],
        rows: typeRows,
        moneyCols: [3, 5, 6],
        totalRow: ["الإجمالي", totals.count, "", totals.ambulance, "", totals.cooperation, totals.ambulance + totals.cooperation],
        widths: [26, 10, 18, 18, 18, 18, 18]
    });

    const recordRows = result.list.map(function (record) {
        const c = sumCommittees(record.agencies, getRecordDay(record));
        return [String(record.recordNumber), record.officeName, record.representativeName, getRecordDay(record), c.count, c.ambulance, c.cooperation, c.ambulance + c.cooperation];
    });

    const recordsSheet = buildStyledTableSheet({
        title: "حصص لجنتي الإسعاف والتعاون — حسب السجل",
        subtitle: subtitle,
        headers: ["رقم السجل", "المكتب", "المندوب", "التاريخ", "الوكالات", "لجنة الإسعاف", "لجنة التعاون", "المجموع"],
        rows: recordRows,
        moneyCols: [5, 6, 7],
        totalRow: ["الإجمالي", "", "", "", totals.count, totals.ambulance, totals.cooperation, totals.ambulance + totals.cooperation],
        widths: [12, 24, 22, 12, 10, 18, 18, 18]
    });

    const wb = xlWorkbook();
    XLSX.utils.book_append_sheet(wb, typesSheet, "حسب النوع");
    XLSX.utils.book_append_sheet(wb, recordsSheet, "حسب السجل");
    XLSX.writeFile(wb, "حصص اللجان " + new Date().toISOString().slice(0, 10) + ".xlsx");
}

["committeeFrom", "committeeTo", "committeeRep", "committeeRecord"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", renderCommittees);
});

/* من صفحة حصص اللجان إلى بطاقة أسعار اللجان في قسم الأسعار */
function openCommitteePrices() {
    switchSection("pricesSection");
    setTimeout(function () {
        document.getElementById("committeePricesCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
}

window.openCommitteePrices = openCommitteePrices;
window.renderCommittees = renderCommittees;
window.resetCommitteeFilters = resetCommitteeFilters;
window.printCommitteesReport = printCommitteesReport;
window.exportCommitteesToExcel = exportCommitteesToExcel;

window.showFinalRecordReport = showFinalRecordReport;
window.printFinalRecordReport = printFinalRecordReport;
window.exportRecordToPDF = exportRecordToPDF;
window.exportReportsToPDF = exportReportsToPDF;



function viewRecord(id) {

const record =
    records.find(
        function (item) {

            return (
                item.id === id
            );

        }
    );


if (!record) {

    notify("السجل غير موجود.", "error");

    return;

}


const modal =
    document.getElementById(
        "recordModal"
    );


const content =
    document.getElementById(
        "modalContent"
    );


if (!modal || !content) {
    return;
}


let totalBase = 0;

let totalAdditions = 0;

let totalMissingStamps = 0;

let totalRepresentative = 0;


record.agencies.forEach(
    function (agency) {

        totalBase +=
            number(
                agency.basePrice
            );

        totalAdditions +=
            number(
                agency.additionsTotal
            );

        totalMissingStamps +=
            number(
                agency.missingStampsValue
            );

        totalRepresentative +=
            number(
                agency.representativeAmount
            );

    }
);


let html = `

    <div class="page-title">

        <h2>
            سجل رقم
            ${escapeHTML(
                record.recordNumber
            )}
        </h2>

        <p>
            تفاصيل السجل والوكالات
        </p>

    </div>


    <div class="report-grid">

        <div>

            <strong>
                المكتب
            </strong>

            <span>
                ${escapeHTML(
                    record.officeName
                )}
            </span>

        </div>


        <div>

            <strong>
                المندوب
            </strong>

            <span>
                ${escapeHTML(
                    record.representativeName
                )}
            </span>

        </div>


        <div>

            <strong>
                عدد الوكالات
            </strong>

            <span>
                ${record.agencies.length}
            </span>

        </div>


        <div>

            <strong>
                السعر الأساسي
            </strong>

            <span>
                ${money(
                    totalBase
                )}
            </span>

        </div>


        <div>

            <strong>
                الإضافات
            </strong>

            <span>
                ${money(
                    totalAdditions
                )}
            </span>

        </div>


        <div>

            <strong>
                الطوابع الناقصة
            </strong>

            <span>
                ${money(
                    totalMissingStamps
                )}
            </span>

        </div>


        <div>

            <strong>
                المطلوب من المندوب
            </strong>

            <span>
                ${money(
                    totalRepresentative
                )}
            </span>

        </div>

    </div>


    <div class="report-card">

        <h3>
            تفاصيل الوكالات
        </h3>

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>
                            رقم الوكالة
                        </th>

                        <th>
                            النوع
                        </th>

                        <th>
                            سعر الوكالة
                        </th>

                        <th>
                            المبلغ الأساسي للمندوب
                        </th>

                        <th>
                            الإضافات
                        </th>

                        <th>
                            الطوابع الناقصة
                        </th>

                        <th>
                            المطلوب من المندوب
                        </th>

                        <th>
                            الحالة
                        </th>

                        <th>
                            الملاحظات
                        </th>

                        <th class="total-col">
                            الإجمالي (السعر + الإضافات + الانتقال)
                        </th>

                    </tr>

                </thead>

                <tbody>

`;


record.agencies
    .slice()
    .sort(
        function (a, b) {

            return (
                String(
                    a.number
                ).localeCompare(
                    String(
                        b.number
                    ),
                    "ar",
                    {
                        numeric: true
                    }
                )
            );

        }
    )
    .forEach(
        function (agency) {

            html += `

                <tr>

                    <td>
                        ${escapeHTML(
                            agency.number
                        )}
                        ${
                            agency.duplicate
                                ? `<br><span class="badge badge-warning">مكررة</span>`
                                : ""
                        }
                    </td>

                    <td>
                        ${escapeHTML(
                            agency.typeName
                        )}
                    </td>

                    <td>
                        ${money(
                            agency.basePrice
                        )}
                    </td>

                    <td>
                        ${money(
                            agency.representativeBase
                        )}
                    </td>

                    <td>
                        ${formatAgencyAdditions(
                            agency
                        )}
                    </td>

                    <td>

                        مرافعة:
                        ${number(
                            agency.stamps.pleading
                        )}

                        <br>

                        إسعاف:
                        ${number(
                            agency.stamps.ambulance
                        )}

                        <br>

                        معونة:
                        ${number(
                            agency.stamps.aid
                        )}

                        <br>

                        القيمة:
                        ${money(
                            agency.missingStampsValue
                        )}

                    </td>

                    <td>

                        <strong>
                            ${money(
                                agency.representativeAmount
                            )}
                        </strong>

                    </td>

                    <td>

                        ${
                            agency.status === "cancelled"
                                ? `<span class="badge badge-danger">ملغاة</span>`
                                : agency.status === "missing"
                                    ? `<span class="badge badge-warning">مفقودة</span>`
                                    : `<span class="badge badge-success">فعالة</span>`
                        }

                    </td>

                    <td>
                        ${escapeHTML(
                            agency.notes ||
                            "-"
                        )}
                    </td>

                    <td class="total-col">
                        <strong>${money(getAgencyGrandTotal(agency))}</strong>
                    </td>

                </tr>

            `;

        }
    );


html += `

                </tbody>

            </table>

        </div>

    </div>

`;


content.innerHTML =
    html;


modal.classList.remove(
    "hidden"
);

}

window.viewRecord =
viewRecord;

/* =========================================================
إغلاق نافذة العرض
========================================================= */

function closeRecordModal() {

document
    .getElementById(
        "recordModal"
    )
    ?.classList.add(
        "hidden"
    );

}

window.closeRecordModal =
closeRecordModal;

/* =========================================================
عرض الإضافات
========================================================= */

function formatAgencyAdditions(
agency
) {

const result = [];


Object.keys(
    ADDITION_NAMES
).forEach(
    function (key) {

        const count =
            number(
                agency.additions[key]
            );


        if (
            count <= 0
        ) {

            return;

        }


        let price = 0;

        let isPleading = false;


        if (
            agency.appliedPrices &&
            agency.appliedPrices.additions &&
            agency.appliedPrices.additions[key]
        ) {

            price =
                number(
                    agency.appliedPrices
                        .additions[key]
                        .price
                );

            isPleading =
                !!agency.appliedPrices
                    .additions[key]
                    .isPleading;

        } else if (
            key === "transport"
        ) {

            price =
                number(
                    agency
                        .transportSettings
                        ?.cashRemainder
                );

            isPleading =
                !!agency
                    .transportSettings
                    ?.pleadingStamp;

        } else {

            price =
                number(
                    additionPrices[key]
                );

            isPleading =
                !!additionStampStatus[key];

        }


        if (key === "transport") {

            const cash = count * price;

            result.push(`
                ${ADDITION_NAMES[key]}:
                ${count}
                ${isPleading ? " — طابع مرافعة" : ""}
                — نقدي:
                ${count} × ${money(price)} = ${money(cash)}
            `);

            return;

        }


        const value =
            isPleading
                ? 0
                : count * price;


        result.push(`

            ${ADDITION_NAMES[key]}:
            ${count}

            ${
                isPleading

                    ? " — طابع مرافعة"

                    : `
                        ×
                        ${money(price)}
                        =
                        ${money(value)}
                      `
            }

        `);

    }
);


/*
    إظهار حصة المندوب من بدل الانتقال
    بشكل منفصل دون إضافتها للمبلغ المطلوب.
*/

if (
    agency.additions.transport > 0 &&
    agency.transportSettings
) {

    const share =
        number(
            agency
                .transportSettings
                .representativeShare
        );


    result.push(`

        حصة المندوب من بدل الانتقال:
        ${money(
            share *
            agency.additions.transport
        )}
        — لا تدخل في المبلغ المطلوب

    `);

}


if (
    result.length === 0
) {

    return "-";

}


return result.join(
    "<br>"
);

}

/* =========================================================
تصنيف الوكالات بالألوان
اللون الأساسي حسب نوع الوكالة، وشدة التظليل حسب عدد الإضافات،
مع علامات للحالة ونقص الطوابع. يظهر في الشاشة وفي PDF.
========================================================= */

const AGENCY_TYPE_COLORS = {
    general: "#2f6690",
    special: "#6c4f9e",
    legal: "#2d7d5f",
    executive: "#b06b2d",
    certified_general_special: "#a3456b",
    certified_legal: "#5f7d24"
};

function hexToRgba(hex, alpha) {
    const h = String(hex || "#888888").replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

/* عدد الإضافات بدون بدل الانتقال (له علامة مستقلة) */
function agencyAdditionsCount(agency) {
    return Object.keys(ADDITION_NAMES).reduce(function (sum, key) {
        if (key === "transport") return sum;
        return sum + number(agency && agency.additions && agency.additions[key]);
    }, 0);
}

function agencyHasTransport(agency) {
    return !!agency && agency.status !== "cancelled" && number(agency.additions && agency.additions.transport) > 0;
}

function agencyHasMissingStamps(agency) {
    const ms = (agency && (agency.stamps || agency.missingStamps)) || {};
    return number(ms.pleading) + number(ms.ambulance) + number(ms.aid) > 0;
}

function additionsCountLabel(n) {
    if (n === 0) return "بدون إضافات";
    if (n === 1) return "إضافة واحدة";
    if (n === 2) return "إضافتان";
    return n + " إضافات";
}

function getAgencyClass(agency) {

    const type = agency.type;
    const color = AGENCY_TYPE_COLORS[type] || "#56677a";
    const status = agency.status || "active";
    const addCount = agencyAdditionsCount(agency);
    const missing = agencyHasMissingStamps(agency);
    const transport = agencyHasTransport(agency);
    const level = Math.min(addCount, 3);
    const tint = status === "cancelled" ? 0 : [0.04, 0.13, 0.23, 0.34][level];

    return {
        key: [type, status, level, missing ? 1 : 0, transport ? 1 : 0].join("|"),
        type: type,
        color: color,
        tint: tint,
        status: status,
        addCount: addCount,
        level: level,
        missing: missing,
        transport: transport,
        label: (AGENCY_NAMES[type] || type) + " — " + getAgencyStatusName(status) + " — " +
            (level === 3 ? "3 إضافات أو أكثر" : additionsCountLabel(level)) +
            (transport ? " — مع بدل انتقال" : "") +
            (missing ? " — فيها نقص طوابع" : "")
    };
}

/* خصائص صف الجدول: شريط بلون النوع + تظليل حسب الإضافات */
function agencyRowAttrs(agency, extraClass) {
    const c = getAgencyClass(agency);
    const classes = ["cls-row", "cls-" + c.status];
    if (c.missing) classes.push("cls-has-missing");
    if (extraClass) classes.push(extraClass);
    return ' class="' + classes.join(" ") + '" style="--cls-color:' + c.color +
        ";--cls-tint:" + hexToRgba(c.color, c.tint) + '"';
}

/* علامات صغيرة: عدد الإضافات ونقص الطوابع */
function agencyMarksHTML(agency) {
    const c = getAgencyClass(agency);
    let html = '<span class="cls-marks">';
    if (c.addCount > 0) {
        html += '<span class="cls-mark cls-mark-add" title="' + additionsCountLabel(c.addCount) + '">+' + c.addCount + "</span>";
    }
    if (c.transport) {
        html += '<span class="cls-mark cls-mark-transport" title="مع بدل انتقال">انتقال</span>';
    }
    if (c.missing) {
        html += '<span class="cls-mark cls-mark-missing" title="فيها نقص طوابع">نقص</span>';
    }
    return html + "</span>";
}

function agencyTypeDot(type) {
    return '<i class="cls-dot" style="background:' + (AGENCY_TYPE_COLORS[type] || "#56677a") + '"></i>';
}

/* دليل الألوان: كل تصنيف موجود مع عدده */
function classLegendHTML(agencies) {

    const groups = {};

    (agencies || []).forEach(function (agency) {
        const c = getAgencyClass(agency);
        if (!groups[c.key]) {
            groups[c.key] = { c: c, count: 0, sample: agency };
        }
        groups[c.key].count += 1;
    });

    const typeOrder = Object.keys(AGENCY_NAMES);
    const statusOrder = ["active", "missing", "cancelled"];

    const list = Object.values(groups).sort(function (a, b) {
        return (typeOrder.indexOf(a.c.type) - typeOrder.indexOf(b.c.type)) ||
            (statusOrder.indexOf(a.c.status) - statusOrder.indexOf(b.c.status)) ||
            (a.c.level - b.c.level) ||
            ((a.c.missing ? 1 : 0) - (b.c.missing ? 1 : 0));
    });

    if (list.length === 0) {
        return '<p class="doc-empty">لا توجد وكالات.</p>';
    }

    return '<table class="doc-table cls-legend"><thead><tr><th>اللون</th><th>التصنيف</th><th class="num">العدد</th></tr></thead><tbody>' +
        list.map(function (g) {
            return "<tr" + agencyRowAttrs(g.sample) + '><td class="cls-swatch-cell"><span class="cls-swatch" style="background:' +
                hexToRgba(g.c.color, Math.max(g.c.tint, 0.05)) + ";border-color:" + g.c.color + '"></span>' + agencyMarksHTML(g.sample) + "</td>" +
                "<td>" + escapeHTML(g.c.label) + '</td><td class="num">' + g.count + "</td></tr>";
        }).join("") +
        "</tbody></table>";
}

/* =========================================================
تصفية وفرز الوكالات في التقارير
========================================================= */

const AGENCY_STATUS_KEYS = ["active", "missing", "cancelled"];

function readCheckedValues(containerId) {
    return Array.from(document.querySelectorAll("#" + containerId + " input:checked")).map(function (input) {
        return input.value;
    });
}

function getReportFilter() {
    return {
        reps: readCheckedValues("filterReps"),
        from: document.getElementById("filterFrom")?.value || "",
        to: document.getElementById("filterTo")?.value || "",
        types: readCheckedValues("filterTypes"),
        statuses: readCheckedValues("filterStatuses"),
        additions: readCheckedValues("filterAdditions"),
        addMode: document.getElementById("filterAddMode")?.value || "all",
        stamps: document.getElementById("filterStamps")?.value || "",
        sort: document.getElementById("filterSort")?.value || "date-desc"
    };
}

function isReportFilterActive(f) {
    return !!(f.reps.length || f.from || f.to || f.types.length || f.statuses.length || f.additions.length || f.stamps);
}

function agencyMatchesAdditions(agency, selected, mode) {
    if (!selected.length) {
        return true;
    }
    const has = Object.keys(ADDITION_NAMES).filter(function (key) {
        return number(agency.additions && agency.additions[key]) > 0;
    });
    if (mode === "any") {
        return selected.some(function (key) { return has.indexOf(key) !== -1; });
    }
    if (mode === "exact") {
        return has.length === selected.length && selected.every(function (key) { return has.indexOf(key) !== -1; });
    }
    return selected.every(function (key) { return has.indexOf(key) !== -1; });
}

/* يعيد الوكالات المطابقة مع سجلها ورقمها داخل السجل */
function getFilteredAgencies(f) {

    f = f || getReportFilter();

    const result = [];

    records.forEach(function (record) {

        const rep = (record.representativeName || "").trim();
        const day = getRecordDay(record);

        if (f.reps.length && f.reps.indexOf(rep) === -1) return;
        if (f.from && day < f.from) return;
        if (f.to && day > f.to) return;

        (record.agencies || []).forEach(function (agency, index) {

            if (f.types.length && f.types.indexOf(agency.type) === -1) return;
            if (f.statuses.length && f.statuses.indexOf(agency.status || "active") === -1) return;
            if (!agencyMatchesAdditions(agency, f.additions, f.addMode)) return;
            if (f.stamps === "with" && !agencyHasMissingStamps(agency)) return;
            if (f.stamps === "without" && agencyHasMissingStamps(agency)) return;

            result.push({ agency: agency, record: record, index: index, day: day });
        });
    });

    const typeOrder = Object.keys(AGENCY_NAMES);

    const sorters = {
        "date-desc": function (a, b) { return b.day.localeCompare(a.day); },
        "date-asc": function (a, b) { return a.day.localeCompare(b.day); },
        "type": function (a, b) { return typeOrder.indexOf(a.agency.type) - typeOrder.indexOf(b.agency.type); },
        "additions": function (a, b) { return agencyAdditionsCount(b.agency) - agencyAdditionsCount(a.agency); },
        "amount": function (a, b) { return number(b.agency.representativeAmount) - number(a.agency.representativeAmount); },
        "rep": function (a, b) { return String(a.record.representativeName).localeCompare(String(b.record.representativeName), "ar"); },
        "record": function (a, b) { return String(a.record.recordNumber).localeCompare(String(b.record.recordNumber), "ar", { numeric: true }); }
    };

    const byAgencyNumber = function (a, b) {
        return String(a.agency.number).localeCompare(String(b.agency.number), "ar", { numeric: true });
    };

    const sorter = sorters[f.sort] || sorters["date-desc"];

    result.sort(function (a, b) {
        return sorter(a, b) || String(a.record.recordNumber).localeCompare(String(b.record.recordNumber), "ar", { numeric: true }) || byAgencyNumber(a, b);
    });

    return result;
}

function reportFilterLabel(f) {
    f = f || getReportFilter();
    const parts = [];
    if (f.reps.length) parts.push("المندوب: " + f.reps.join("، "));
    if (f.from) parts.push("من " + formatDay(f.from));
    if (f.to) parts.push("إلى " + formatDay(f.to));
    if (f.types.length) parts.push("النوع: " + f.types.map(function (t) { return AGENCY_NAMES[t]; }).join("، "));
    if (f.statuses.length) parts.push("الحالة: " + f.statuses.map(getAgencyStatusName).join("، "));
    if (f.additions.length) {
        const modeName = f.addMode === "any" ? "أيٌّ من" : f.addMode === "exact" ? "فقط" : "كلٌّ من";
        parts.push("الإضافات (" + modeName + "): " + f.additions.map(function (k) { return ADDITION_NAMES[k]; }).join("، "));
    }
    if (f.stamps === "with") parts.push("فيها نقص طوابع");
    if (f.stamps === "without") parts.push("بدون نقص طوابع");
    return parts.join(" — ");
}

function chipHTML(value, label, checked, dotColor) {
    return '<label class="chip"><input type="checkbox" value="' + escapeHTML(value) + '"' + (checked ? " checked" : "") + ">" +
        "<span>" + (dotColor ? '<i class="cls-dot" style="background:' + dotColor + '"></i>' : "") + escapeHTML(label) + "</span></label>";
}

function fillReportFilterOptions() {

    const repsBox = document.getElementById("filterReps");
    const typesBox = document.getElementById("filterTypes");
    const statusBox = document.getElementById("filterStatuses");
    const addBox = document.getElementById("filterAdditions");

    if (repsBox) {
        const checked = readCheckedValues("filterReps");
        const names = Array.from(new Set(records.map(function (r) { return (r.representativeName || "").trim(); }).filter(Boolean)))
            .sort(function (a, b) { return a.localeCompare(b, "ar"); });
        repsBox.innerHTML = names.length
            ? names.map(function (n) { return chipHTML(n, n, checked.indexOf(n) !== -1); }).join("")
            : '<span class="empty-hint">لا يوجد مندوبون بعد.</span>';
    }

    if (typesBox && !typesBox.children.length) {
        typesBox.innerHTML = Object.keys(AGENCY_NAMES).map(function (t) {
            return chipHTML(t, AGENCY_NAMES[t], false, AGENCY_TYPE_COLORS[t]);
        }).join("");
    }

    if (statusBox && !statusBox.children.length) {
        statusBox.innerHTML = AGENCY_STATUS_KEYS.map(function (s) {
            return chipHTML(s, getAgencyStatusName(s), false);
        }).join("");
    }

    if (addBox && !addBox.children.length) {
        addBox.innerHTML = Object.keys(ADDITION_NAMES).map(function (k) {
            return chipHTML(k, ADDITION_NAMES[k], false);
        }).join("");
    }
}

function resetReportFilters() {
    document.querySelectorAll(".report-filters input[type=checkbox]").forEach(function (input) { input.checked = false; });
    ["filterFrom", "filterTo", "filterStamps"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const mode = document.getElementById("filterAddMode");
    const sort = document.getElementById("filterSort");
    if (mode) mode.value = "all";
    if (sort) sort.value = "date-desc";
    renderReports();
}

/* الضغط على نوع في جدول التقرير العام يصفّي عليه */
function setReportTypeFilter(type) {
    document.querySelectorAll("#filterTypes input").forEach(function (input) {
        input.checked = input.value === type;
    });
    renderReports();
    document.getElementById("filteredAgenciesCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelector(".report-filters")?.addEventListener("change", function () {
    renderReports();
});

window.resetReportFilters = resetReportFilters;
window.setReportTypeFilter = setReportTypeFilter;

/* جدول الوكالات المطابقة (شاشة و PDF) */
function filteredAgenciesTableHTML(matched, forPrint) {

    const canEdit = !forPrint && currentUser && currentUser.role !== "viewer";

    if (!matched.length) {
        return '<p class="doc-empty">لا توجد وكالات مطابقة للتصفية المختارة.</p>';
    }

    let sumBase = 0, sumTransport = 0, sumRep = 0, sumGrand = 0;

    let html = '<table class="doc-table detail-table cls-table"><thead><tr>' +
        "<th>السجل</th><th>التاريخ</th><th>المندوب</th><th>رقم الوكالة</th><th>النوع</th><th>الحالة</th>" +
        '<th class="num">السعر</th><th class="num">بدل الانتقال</th><th>الإضافات</th><th>الطوابع الناقصة</th>' +
        '<th class="num">المطلوب من المندوب</th><th class="num total-col">الإجمالي</th>' + (canEdit ? "<th></th>" : "") +
        "</tr></thead><tbody>";

    matched.forEach(function (m) {
        const a = m.agency;
        const cancelled = a.status === "cancelled";
        const t = getAgencyTransport(a);
        const ms = a.stamps || a.missingStamps || {};
        const stampParts = [];
        if (number(ms.pleading)) stampParts.push("مرافعة " + number(ms.pleading));
        if (number(ms.ambulance)) stampParts.push("إسعاف " + number(ms.ambulance));
        if (number(ms.aid)) stampParts.push("معونة " + number(ms.aid));
        const base = cancelled ? 0 : number(a.basePrice);
        const rep = cancelled ? 0 : number(a.representativeAmount);
        const grand = getAgencyGrandTotal(a);
        sumBase += base; sumTransport += t.total; sumRep += rep; sumGrand += grand;

        const statusClass = cancelled ? "st-cancelled" : a.status === "missing" ? "st-missing" : "st-active";

        html += "<tr" + agencyRowAttrs(a, cancelled ? "row-cancelled" : "") + ">" +
            "<td><strong>" + escapeHTML(m.record.recordNumber) + "</strong></td>" +
            '<td class="date-cell">' + formatDay(m.day) + "</td>" +
            "<td>" + escapeHTML(m.record.representativeName) + "</td>" +
            "<td><strong>" + escapeHTML(a.number) + "</strong>" + agencyMarksHTML(a) + "</td>" +
            "<td>" + agencyTypeDot(a.type) + escapeHTML(AGENCY_NAMES[a.type] || a.type) + "</td>" +
            '<td><span class="status-pill ' + statusClass + '">' + getAgencyStatusName(a.status) + "</span></td>" +
            '<td class="num">' + money(base) + "</td>" +
            '<td class="num">' + (t.count ? money(t.total) : "—") + "</td>" +
            '<td class="small-text">' + (agencyAdditionsToText(a, true) === "-" ? "—" : escapeHTML(agencyAdditionsToText(a, true))) + "</td>" +
            '<td class="small-text">' + (stampParts.length ? stampParts.join("، ") : "—") + "</td>" +
            '<td class="num">' + money(rep) + "</td>" +
            '<td class="num total-col">' + money(grand) + "</td>" +
            (canEdit ? '<td><button type="button" class="act-btn" onclick="openAgencyForEdit(\'' + m.record.id + "', " + m.index + ')"><i class="ti ti-edit"></i> تعديل</button></td>' : "") +
            "</tr>";
    });

    html += '</tbody><tfoot><tr><td colspan="6">الإجمالي (' + matched.length + " وكالة)</td>" +
        '<td class="num">' + money(sumBase) + '</td><td class="num">' + money(sumTransport) + "</td><td></td><td></td>" +
        '<td class="num">' + money(sumRep) + '</td><td class="num total-col">' + money(sumGrand) + "</td>" + (canEdit ? "<td></td>" : "") +
        "</tr></tfoot></table>";

    return html;
}

/* فتح وكالة محددة مباشرة في نموذج التعديل */
function openAgencyForEdit(recordId, index) {

    if (!currentUser || currentUser.role === "viewer") {
        notify("ليس لديك صلاحية.", "error");
        return;
    }

    closeRecordModal();
    editRecord(recordId);

    if (pendingAgencies[index]) {
        editPendingAgency(index);
    }

    setTimeout(function () {
        document.getElementById("agencyNumber")?.closest(".content-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    showToast(
        "<strong>تعديل الوكالة</strong>" +
        "<span>عدّل بيانات الوكالة ثم اضغط «إضافة الوكالة»، وبعدها «حفظ السجل» لحفظ التعديل.</span>",
        8000
    );
}

window.openAgencyForEdit = openAgencyForEdit;

/* =========================================================
الحاسبة
حسابات منفصلة تماماً: لا تغيّر أي سجل ولا تدخل في الحسابات الأساسية.
١) حصة أعضاء مجلس الفرع من بدل الانتقال (لسجلات/مدى وكالات محددة)
٢) حاسبة الوكالة السريعة
٣) مطابقة المقبوض من المندوب
========================================================= */

const COUNCIL_SHARE_KEY = "audit_council_share";
const COUNCIL_SAVED_KEY = "audit_council_saved";

let councilSaved = loadData(COUNCIL_SAVED_KEY, []);
let calcInitialized = false;
let activeCalcTab = "council";

function calcNumberControl(id, value) {
    return '<div class="number-control">' +
        '<button type="button" class="number-btn minus-btn" data-target="' + id + '">−</button>' +
        '<input type="text" inputmode="numeric" data-num="int" autocomplete="off" id="' + id + '" min="0" value="' + (value || 0) + '">' +
        '<button type="button" class="number-btn plus-btn" data-target="' + id + '">+</button>' +
        "</div>";
}

function recordOptionsHTML(selectedId) {
    const sorted = records.slice().sort(function (a, b) {
        return getRecordDay(b).localeCompare(getRecordDay(a)) ||
            String(b.recordNumber).localeCompare(String(a.recordNumber), "ar", { numeric: true });
    });
    return '<option value="">— اختر السجل —</option>' + sorted.map(function (r) {
        return '<option value="' + r.id + '"' + (r.id === selectedId ? " selected" : "") + ">سجل " +
            escapeHTML(r.recordNumber) + " — " + escapeHTML(r.representativeName) + " — " + formatDay(getRecordDay(r)) +
            " (" + (r.agencies || []).length + " وكالة)</option>";
    }).join("");
}

/* الوكالات ضمن مدى أرقام محدد من سجل (المدى فارغ = كل الوكالات) */
function agenciesInRange(record, from, to) {
    const hasFrom = String(from).trim() !== "";
    const hasTo = String(to).trim() !== "";
    const min = hasFrom ? parseInt(from, 10) : -Infinity;
    const max = hasTo ? parseInt(to, 10) : Infinity;
    return (record && record.agencies ? record.agencies : []).filter(function (agency) {
        if (!hasFrom && !hasTo) return true;
        const n = parseInt(agency.number, 10);
        return Number.isFinite(n) && n >= min && n <= max;
    });
}

function rangeLabel(from, to) {
    const f = String(from).trim(), t = String(to).trim();
    if (!f && !t) return "كل الوكالات";
    if (f && t) return "من " + f + " إلى " + t;
    return f ? "من " + f + " فما فوق" : "حتى " + t;
}

/* ---------- الهيكل ---------- */

function calcShellHTML() {

    /* ١) حصة المجلس */
    let html = '<div class="calc-panel" data-panel="council">' +
        '<div class="content-card">' +
            '<h3><i class="ti ti-users-group"></i> حصة أعضاء مجلس الفرع من بدل الانتقال</h3>' +
            '<p class="guide-text">في بعض الأشهر يذهب جزء من حصة الفرع النقدية في بدل الانتقال لأعضاء مجلس الفرع بدل الصندوق. ' +
            "اختر السجلات ومدى أرقام الوكالات التي تشملها هذه الحصة (السجل قد يمتد على عدة أشهر). هذا الحساب منفصل ولا يغيّر أي رقم في النظام.</p>" +
            '<div class="form-grid calc-top">' +
                '<div class="input-group"><label for="ccShare"><i class="ti ti-coin"></i> حصة المجلس عن كل بدل انتقال</label>' +
                    '<div class="input-suffix"><input type="text" inputmode="numeric" data-num="int" autocomplete="off" id="ccShare" min="0"><span>ل.س</span></div>' +
                    '<small id="ccShareHint"></small></div>' +
                '<div class="input-group"><label for="ccName"><i class="ti ti-tag"></i> اسم الحساب (للحفظ)</label>' +
                    '<input type="text" id="ccName" placeholder="مثال: حصة المجلس — آب 2026"></div>' +
            "</div>" +
            '<h4 class="sub-title"><i class="ti ti-books"></i> السجلات ومدى الوكالات</h4>' +
            '<div id="ccRows"></div>' +
            '<div class="button-row">' +
                '<button type="button" class="secondary-btn" id="ccAddRow"><i class="ti ti-plus"></i> إضافة سجل آخر</button>' +
            "</div>" +
        "</div>" +
        '<div id="ccResult"></div>' +
        '<div class="content-card" id="ccSavedCard">' +
            '<h3><i class="ti ti-history"></i> الحسابات المحفوظة</h3>' +
            '<div id="ccSaved"></div>' +
        "</div>" +
    "</div>";

    /* ٢) الحاسبة السريعة */
    html += '<div class="calc-panel hidden" data-panel="quick">' +
        '<div class="calc-quick">' +
            '<div class="content-card">' +
                '<h3><i class="ti ti-file-dollar"></i> بيانات الوكالة</h3>' +
                '<div class="form-grid">' +
                    '<div class="input-group"><label for="qcType"><i class="ti ti-file-certificate"></i> نوع الوكالة</label><select id="qcType">' +
                        Object.keys(AGENCY_NAMES).map(function (t) { return '<option value="' + t + '"' + (t === DEFAULT_AGENCY_TYPE ? " selected" : "") + ">" + AGENCY_NAMES[t] + "</option>"; }).join("") +
                    "</select></div>" +
                    '<div class="input-group"><label for="qcRep"><i class="ti ti-route"></i> نوع المندوب</label><select id="qcRep">' +
                        '<option value="internal">مندوب داخلي</option><option value="external">مندوب خارجي (مع بدل انتقال)</option>' +
                    "</select></div>" +
                    '<div class="input-group"><label><i class="ti ti-stack-2"></i> عدد الوكالات المتماثلة</label>' + calcNumberControl("qcQty", 1) + "</div>" +
                "</div>" +
                '<h4 class="sub-title"><i class="ti ti-circle-plus"></i> الإضافات</h4>' +
                '<div class="form-grid six-columns">' +
                    Object.keys(ADDITION_NAMES).map(function (key) {
                        return '<div class="input-group"><label>' + ADDITION_NAMES[key] + "</label>" + calcNumberControl("qc_add_" + key, 0) + "</div>";
                    }).join("") +
                "</div>" +
                '<h4 class="sub-title"><i class="ti ti-receipt"></i> الطوابع الناقصة</h4>' +
                '<div class="form-grid three-columns">' +
                    '<div class="input-group"><label>نقص مرافعة</label>' + calcNumberControl("qcMissPleading", 0) + "</div>" +
                    '<div class="input-group"><label>نقص إسعاف</label>' + calcNumberControl("qcMissAmbulance", 0) + "</div>" +
                    '<div class="input-group"><label>نقص معونة</label>' + calcNumberControl("qcMissAid", 0) + "</div>" +
                "</div>" +
                '<div class="button-row"><button type="button" class="secondary-btn" id="qcReset"><i class="ti ti-eraser"></i> تصفير</button></div>' +
            "</div>" +
            '<div class="content-card calc-result-card"><h3><i class="ti ti-receipt-2"></i> النتيجة</h3><div id="qcResult"></div></div>' +
        "</div>" +
    "</div>";

    /* ٣) مطابقة المقبوض */
    html += '<div class="calc-panel hidden" data-panel="reconcile">' +
        '<div class="content-card">' +
            '<h3><i class="ti ti-scale"></i> مطابقة ما سلّمه المندوب مع المطلوب</h3>' +
            '<div class="form-grid">' +
                '<div class="input-group filter-wide"><label for="rcRecord"><i class="ti ti-books"></i> السجل</label><select id="rcRecord"></select></div>' +
                '<div class="input-group"><label for="rcFrom"><i class="ti ti-number"></i> من وكالة رقم</label><input type="text" inputmode="numeric" data-num="int" autocomplete="off" id="rcFrom" min="0" placeholder="الكل"></div>' +
                '<div class="input-group"><label for="rcTo"><i class="ti ti-number"></i> إلى وكالة رقم</label><input type="text" inputmode="numeric" data-num="int" autocomplete="off" id="rcTo" min="0" placeholder="الكل"></div>' +
                '<div class="input-group"><label for="rcReceived"><i class="ti ti-cash"></i> المبلغ المقبوض فعلاً</label>' +
                    '<div class="input-suffix"><input type="text" inputmode="numeric" data-num="int" autocomplete="off" id="rcReceived" min="0" placeholder="0"><span>ل.س</span></div></div>' +
            "</div>" +
        "</div>" +
        '<div id="rcResult"></div>' +
    "</div>";

    return html;
}

/* ---------- ١) حصة أعضاء المجلس ---------- */

function getCouncilShare() {
    return number(document.getElementById("ccShare")?.value);
}

function councilRowHTML(row) {
    row = row || { recordId: "", from: "", to: "" };
    return '<div class="calc-row">' +
        '<div class="input-group"><label>السجل</label><select class="cc-record">' + recordOptionsHTML(row.recordId) + "</select></div>" +
        '<div class="input-group"><label>من وكالة رقم</label><input type="text" inputmode="numeric" data-num="int" autocomplete="off" class="cc-from" min="0" placeholder="الكل" value="' + escapeHTML(row.from) + '"></div>' +
        '<div class="input-group"><label>إلى وكالة رقم</label><input type="text" inputmode="numeric" data-num="int" autocomplete="off" class="cc-to" min="0" placeholder="الكل" value="' + escapeHTML(row.to) + '"></div>' +
        '<button type="button" class="act-btn act-danger cc-remove" title="حذف هذا السطر" aria-label="حذف هذا السطر"><i class="ti ti-trash"></i></button>' +
        "</div>";
}

function readCouncilRows() {
    return Array.from(document.querySelectorAll("#ccRows .calc-row")).map(function (row) {
        return {
            recordId: row.querySelector(".cc-record").value,
            from: row.querySelector(".cc-from").value,
            to: row.querySelector(".cc-to").value
        };
    });
}

function computeCouncil(rows, share) {

    const lines = [];
    const total = { agencies: 0, transports: 0, transportTotal: 0, cash: 0, council: 0, fund: 0 };

    rows.forEach(function (row) {

        const record = records.find(function (r) { return r.id === row.recordId; });

        if (!record) return;

        const list = agenciesInRange(record, row.from, row.to);
        const line = { record: record, from: row.from, to: row.to, agencies: list.length, transports: 0, transportTotal: 0, cash: 0, council: 0, fund: 0 };

        list.forEach(function (agency) {
            const t = getAgencyTransport(agency);
            if (!t.count) return;
            /* حصة المجلس لا تتجاوز حصة الفرع النقدية من البدل */
            const council = Math.min(share * t.count, t.cash);
            line.transports += t.count;
            line.transportTotal += t.total;
            line.cash += t.cash;
            line.council += council;
            line.fund += t.cash - council;
        });

        Object.keys(total).forEach(function (key) { total[key] += line[key]; });
        lines.push(line);
    });

    return { lines: lines, total: total, share: share };
}

function councilTableHTML(result) {

    if (!result.lines.length) {
        return '<p class="doc-empty">اختر سجلاً واحداً على الأقل.</p>';
    }

    return '<table class="doc-table"><thead><tr>' +
        "<th>السجل</th><th>المندوب</th><th>تاريخ السجل</th><th>مدى الوكالات</th>" +
        '<th class="num">الوكالات</th><th class="num">بدلات الانتقال</th><th class="num">حصة الفرع من البدل</th>' +
        '<th class="num total-col">حصة أعضاء المجلس</th><th class="num">الباقي للصندوق</th>' +
        "</tr></thead><tbody>" +
        result.lines.map(function (l) {
            return "<tr><td><strong>" + escapeHTML(l.record.recordNumber) + "</strong></td><td>" + escapeHTML(l.record.representativeName) + "</td>" +
                '<td class="date-cell">' + formatDay(getRecordDay(l.record)) + "</td><td>" + rangeLabel(l.from, l.to) + "</td>" +
                '<td class="num">' + l.agencies + '</td><td class="num">' + l.transports + '</td><td class="num">' + money(l.cash) + "</td>" +
                '<td class="num total-col">' + money(l.council) + '</td><td class="num">' + money(l.fund) + "</td></tr>";
        }).join("") +
        '</tbody><tfoot><tr><td colspan="4">الإجمالي</td>' +
        '<td class="num">' + result.total.agencies + '</td><td class="num">' + result.total.transports + '</td><td class="num">' + money(result.total.cash) + "</td>" +
        '<td class="num total-col">' + money(result.total.council) + '</td><td class="num">' + money(result.total.fund) + "</td></tr></tfoot></table>";
}

function updateCouncilCalc() {

    const share = getCouncilShare();
    const result = computeCouncil(readCouncilRows(), share);
    const box = document.getElementById("ccResult");
    const hint = document.getElementById("ccShareHint");
    const t = getTransportPricing();

    try { localStorage.setItem(COUNCIL_SHARE_KEY, String(share)); } catch (e) {}

    if (hint) {
        hint.textContent = "من حصة الفرع النقدية (" + money(t.cashRemainder) + " لكل بدل انتقال)، والباقي " +
            money(Math.max(0, t.cashRemainder - share)) + " للصندوق.";
    }

    if (!box) return;

    box.innerHTML = '<div class="content-card calc-result-card">' +
        '<h3><i class="ti ti-receipt-2"></i> النتيجة</h3>' +
        '<div class="calc-kpis">' +
            '<div><span>بدلات الانتقال المشمولة</span><strong>' + result.total.transports + "</strong></div>" +
            '<div><span>حصة الفرع النقدية منها</span><strong>' + money(result.total.cash) + "</strong></div>" +
            '<div class="calc-kpi-main"><span>حصة أعضاء مجلس الفرع</span><strong>' + money(result.total.council) + "</strong></div>" +
            '<div><span>الباقي للصندوق</span><strong>' + money(result.total.fund) + "</strong></div>" +
        "</div>" +
        '<div class="table-wrapper">' + councilTableHTML(result) + "</div>" +
        '<div class="button-row">' +
            '<button type="button" class="primary-btn" onclick="printCouncilCalc(true)"><i class="ti ti-file-type-pdf"></i> حفظ PDF</button>' +
            '<button type="button" class="secondary-btn" onclick="printCouncilCalc(false)"><i class="ti ti-printer"></i> طباعة</button>' +
            '<button type="button" class="success-btn" onclick="saveCouncilCalc()"><i class="ti ti-device-floppy"></i> حفظ الحساب</button>' +
        "</div>" +
    "</div>";
}

function buildCouncilDoc(result, name) {
    return '<div class="final-report doc doc-summary">' +
        docLetterhead("حصة أعضاء مجلس الفرع", (name ? escapeHTML(name) + " — " : "") + "تاريخ الإصدار: " + todayArabic()) +
        '<div class="doc-summary-row">' +
            '<div class="doc-due"><span>حصة أعضاء مجلس الفرع</span><strong>' + money(result.total.council) + "</strong>" +
            "<small>" + money(result.share) + " عن كل بدل انتقال — " + result.total.transports + " بدل انتقال</small></div>" +
            '<dl class="doc-kpis">' +
                "<div><dt>عدد السجلات</dt><dd>" + result.lines.length + "</dd></div>" +
                "<div><dt>الوكالات المشمولة</dt><dd>" + result.total.agencies + "</dd></div>" +
                "<div><dt>حصة الفرع من البدل</dt><dd>" + money(result.total.cash) + "</dd></div>" +
                "<div><dt>الباقي للصندوق</dt><dd>" + money(result.total.fund) + "</dd></div>" +
            "</dl></div>" +
        '<section class="doc-section"><h3><span class="sec-no">1</span>التفاصيل حسب السجل</h3>' + councilTableHTML(result) + "</section>" +
        '<p class="doc-empty">هذا الحساب منفصل عن الحسابات الأساسية للنظام ولا يغيّر المطلوب من المندوبين.</p>' +
        docSignatures() +
        "</div>";
}

function printCouncilCalc(pdf) {
    const result = computeCouncil(readCouncilRows(), getCouncilShare());
    const name = document.getElementById("ccName")?.value.trim();
    openReportDocument(buildCouncilDoc(result, name), (name || "حصة مجلس الفرع") + " - " + todayDay(), { pdf: !!pdf });
}

function saveCouncilCalc() {

    const rows = readCouncilRows().filter(function (r) { return r.recordId; });

    if (!rows.length) {
        notify("اختر سجلاً واحداً على الأقل قبل الحفظ.", "error");
        return;
    }

    const nameInput = document.getElementById("ccName");
    const name = (nameInput && nameInput.value.trim()) || ("حصة المجلس — " + formatDay(todayDay()));
    const result = computeCouncil(rows, getCouncilShare());

    councilSaved.unshift({
        id: generateId(),
        name: name,
        savedAt: new Date().toISOString(),
        share: getCouncilShare(),
        rows: rows,
        council: result.total.council,
        transports: result.total.transports
    });

    saveData(COUNCIL_SAVED_KEY, councilSaved);
    renderCouncilSaved();
    showToast("<strong>تم حفظ الحساب</strong><span>" + escapeHTML(name) + " — " + money(result.total.council) + "</span>", 4000, "success");
}

function loadCouncilCalc(id) {
    const item = councilSaved.find(function (s) { return s.id === id; });
    if (!item) return;
    document.getElementById("ccShare").value = item.share;
    document.getElementById("ccName").value = item.name;
    document.getElementById("ccRows").innerHTML = item.rows.map(councilRowHTML).join("");
    updateCouncilCalc();
    document.getElementById("ccResult")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteCouncilCalc(id) {
    appConfirm({
        title: "حذف الحساب المحفوظ",
        message: "هل تريد حذف هذا الحساب المحفوظ؟",
        confirmText: "حذف",
        cancelText: "إلغاء",
        danger: true
    }).then(function (ok) {
        if (!ok) return;
        councilSaved = councilSaved.filter(function (s) { return s.id !== id; });
        saveData(COUNCIL_SAVED_KEY, councilSaved);
        renderCouncilSaved();
    });
}

function renderCouncilSaved() {
    const box = document.getElementById("ccSaved");
    if (!box) return;
    if (!councilSaved.length) {
        box.innerHTML = '<p class="empty-hint">لا توجد حسابات محفوظة بعد. بعد إعداد الحساب اضغط «حفظ الحساب» للرجوع إليه لاحقاً.</p>';
        return;
    }
    box.innerHTML = '<div class="table-wrapper"><table class="ledger-table"><thead><tr><th>الاسم</th><th>تاريخ الحفظ</th><th class="num">السجلات</th><th class="num">بدلات الانتقال</th><th class="num">حصة المجلس</th><th></th></tr></thead><tbody>' +
        councilSaved.map(function (s) {
            return "<tr><td><strong>" + escapeHTML(s.name) + '</strong></td><td class="date-cell">' + formatDay(toDayString(s.savedAt)) + "</td>" +
                '<td class="num">' + s.rows.length + '</td><td class="num">' + number(s.transports) + '</td><td class="num money-cell">' + money(s.council) + "</td>" +
                '<td><div class="action-group">' +
                    '<button type="button" class="act-btn" onclick="loadCouncilCalc(\'' + s.id + '\')"><i class="ti ti-folder-open"></i> فتح</button>' +
                    '<button type="button" class="act-btn act-danger" aria-label="حذف الحساب المحفوظ" title="حذف الحساب المحفوظ" onclick="deleteCouncilCalc(\'' + s.id + '\')"><i class="ti ti-trash"></i></button>' +
                "</div></td></tr>";
        }).join("") +
        "</tbody></table></div>";
}

/* ---------- ٢) الحاسبة السريعة ---------- */

function calcValue(id) {
    return number(document.getElementById(id)?.value);
}

function updateQuickCalc() {

    const box = document.getElementById("qcResult");
    if (!box) return;

    const type = document.getElementById("qcType").value;
    const external = document.getElementById("qcRep").value === "external";
    const qty = Math.max(1, calcValue("qcQty"));
    const pricing = getPricingForType(type);

    const additions = {};
    Object.keys(ADDITION_NAMES).forEach(function (key) {
        additions[key] = calcValue("qc_add_" + key);
    });

    /* بدل الانتقال للعامة والخاصة والشرعية فقط */
    const eligible = isTransportEligible(type);
    const transportField = document.getElementById("qc_add_transport");
    if (!eligible) {
        additions.transport = 0;
        if (transportField) transportField.value = 0;
    }
    if (transportField) {
        transportField.disabled = !eligible;
        transportField.closest(".input-group")?.classList.toggle("is-disabled", !eligible);
    }

    const missing = {
        pleading: calcValue("qcMissPleading"),
        ambulance: calcValue("qcMissAmbulance"),
        aid: calcValue("qcMissAid")
    };

    const addRes = calculateAdditions(additions, pricing);
    const stamps = calculateStamps(addRes, missing, false);
    const rep = calculateRepresentativeAmount(pricing.representative, addRes.total, stamps.missingValue, 0, false);

    const tCount = additions.transport;
    const tTotal = tCount * number(pricing.transport.total);
    const tCash = tCount * number(pricing.transport.cashRemainder);
    const tShare = tCount * number(pricing.transport.representativeShare);
    const otherAdditions = Math.max(0, addRes.total - tCash);
    const tStamps = pricing.transport.pleadingStamp ? tCount : 0;
    const stampAdditionsValue = Math.max(0, addRes.pleadingStamps - tStamps) * number(stampPrices.pleading);
    const grand = number(pricing.agency) + otherAdditions + stampAdditionsValue + tTotal;

    /* حصص اللجان: النسبة الثابتة لنوع الوكالة × سعر الوكالة، تلقائياً */
    /* بأسعار اليوم: المبلغ المحدد في جدول الفترة السارية إن وُجد، وإلا النسبة */
    const committee = getAgencyCommittee({ type: type, status: "active", basePrice: pricing.agency }, todayDay());

    const tile = function (label, value, cls) {
        return '<div class="' + (cls || "") + '"><span>' + label + "</span><strong>" + value + "</strong></div>";
    };

    box.innerHTML =
        (qty > 1 ? '<p class="field-hint">النتائج لـ ' + qty + " وكالات متماثلة (القيمة للوكالة الواحدة × " + qty + ").</p>" : "") +
        '<div class="calc-kpis calc-kpis-quick">' +
            tile("سعر الوكالة", money(pricing.agency * qty)) +
            tile("بدل الانتقال", money(tTotal * qty)) +
            tile("سعر الوكالة مع البدل", money((number(pricing.agency) + tTotal) * qty)) +
            tile("الإضافات النقدية", money(otherAdditions * qty)) +
            tile("قيمة طوابع الإضافات", money(stampAdditionsValue * qty)) +
            tile("قيمة الطوابع الناقصة", money(stamps.missingValue * qty)) +
            tile("طوابع المرافعة المطلوبة", stamps.requiredPleading * qty) +
            tile("حصة المندوب من الانتقال", money(tShare * qty)) +
            tile("لجنة الإسعاف (" + money(committee.ambulance) + " للوكالة)", money(committee.ambulance * qty)) +
            tile("لجنة التعاون (" + money(committee.cooperation) + " للوكالة)", money(committee.cooperation * qty)) +
            tile("الإجمالي (السعر + الإضافات + الانتقال)", money(grand * qty)) +
            tile("المطلوب من المندوب", money(rep * qty), "calc-kpi-main") +
        "</div>" +
        (external && !eligible ? '<p class="field-hint">بدل الانتقال لا يُضاف إلى ' + AGENCY_NAMES[type] + ".</p>" : "") +
        (external && eligible && tCount === 0 ? '<p class="field-hint">المندوب خارجي لكن عدد بدل الانتقال صفر.</p>' : "");
}

function resetQuickCalc() {
    document.querySelectorAll('[data-panel="quick"] input[data-num]').forEach(function (input) {
        input.value = input.id === "qcQty" ? 1 : 0;
    });
    const rep = document.getElementById("qcRep");
    if (rep) rep.value = "internal";
    updateQuickCalc();
}

/* ---------- ٣) مطابقة المقبوض ---------- */

function updateReconcile() {

    const box = document.getElementById("rcResult");
    if (!box) return;

    const record = records.find(function (r) { return r.id === document.getElementById("rcRecord").value; });

    if (!record) {
        box.innerHTML = '<div class="content-card"><p class="empty-hint">اختر السجل، وحدد مدى الوكالات إن أردت، ثم اكتب المبلغ المقبوض.</p></div>';
        return;
    }

    const from = document.getElementById("rcFrom").value;
    const to = document.getElementById("rcTo").value;
    const received = calcValue("rcReceived");
    const list = agenciesInRange(record, from, to);

    const byType = {};
    let required = 0;

    list.forEach(function (agency) {
        const amount = agency.status === "cancelled" ? 0 : number(agency.representativeAmount);
        required += amount;
        if (!byType[agency.type]) byType[agency.type] = { count: 0, amount: 0 };
        byType[agency.type].count += 1;
        byType[agency.type].amount += amount;
    });

    const diff = received - required;
    const state = diff === 0 ? "ok" : diff < 0 ? "short" : "over";
    const stateText = state === "ok" ? "مطابق تماماً" : state === "short" ? "نقص " + money(-diff) : "زيادة " + money(diff);

    const breakdown = '<table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">العدد</th><th class="num">المطلوب</th></tr></thead><tbody>' +
        Object.keys(AGENCY_NAMES).filter(function (t) { return byType[t]; }).map(function (t) {
            return "<tr><td>" + agencyTypeDot(t) + AGENCY_NAMES[t] + '</td><td class="num">' + byType[t].count + '</td><td class="num">' + money(byType[t].amount) + "</td></tr>";
        }).join("") +
        '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + list.length + '</td><td class="num">' + money(required) + "</td></tr></tfoot></table>";

    box.innerHTML = '<div class="content-card calc-result-card">' +
        '<h3><i class="ti ti-receipt-2"></i> النتيجة — سجل ' + escapeHTML(record.recordNumber) + " (" + rangeLabel(from, to) + ")</h3>" +
        '<div class="calc-kpis">' +
            '<div><span>المطلوب من المندوب</span><strong>' + money(required) + "</strong></div>" +
            '<div><span>المقبوض فعلاً</span><strong>' + money(received) + "</strong></div>" +
            '<div class="calc-kpi-main calc-state-' + state + '"><span>الفرق</span><strong>' + stateText + "</strong></div>" +
        "</div>" +
        '<div class="table-wrapper">' + breakdown + "</div>" +
        '<div class="button-row">' +
            '<button type="button" class="primary-btn" onclick="printReconcile(true)"><i class="ti ti-file-type-pdf"></i> حفظ PDF</button>' +
            '<button type="button" class="secondary-btn" onclick="printReconcile(false)"><i class="ti ti-printer"></i> طباعة</button>' +
        "</div>" +
    "</div>";

    box.dataset.doc = "";
    box._docHTML = '<div class="final-report doc doc-summary">' +
        docLetterhead("مطابقة المقبوض من المندوب", "سجل " + escapeHTML(record.recordNumber) + " — " + escapeHTML(record.representativeName) + " — " + rangeLabel(from, to) + " — " + todayArabic()) +
        '<div class="doc-summary-row"><div class="doc-due"><span>الفرق</span><strong>' + stateText + "</strong>" +
        "<small>المطلوب " + money(required) + " — المقبوض " + money(received) + "</small></div>" +
        '<dl class="doc-kpis"><div><dt>عدد الوكالات</dt><dd>' + list.length + "</dd></div><div><dt>المطلوب</dt><dd>" + money(required) +
        "</dd></div><div><dt>المقبوض</dt><dd>" + money(received) + "</dd></div><div><dt>المكتب</dt><dd>" + escapeHTML(record.officeName) + "</dd></div></dl></div>" +
        '<section class="doc-section"><h3><span class="sec-no">1</span>المطلوب حسب نوع الوكالة</h3>' + breakdown + "</section>" +
        docSignatures() + "</div>";
}

function printReconcile(pdf) {
    const box = document.getElementById("rcResult");
    if (!box || !box._docHTML) return;
    openReportDocument(box._docHTML, "مطابقة المقبوض - " + todayDay(), { pdf: !!pdf });
}

/* ---------- التهيئة والتبويبات ---------- */

function switchCalcTab(name) {
    activeCalcTab = name;
    document.querySelectorAll(".calc-tab").forEach(function (b) { b.classList.toggle("active", b.dataset.calc === name); });
    document.querySelectorAll(".calc-panel").forEach(function (p) { p.classList.toggle("hidden", p.dataset.panel !== name); });
}

function renderCalculator() {

    const root = document.getElementById("calculatorContent");
    if (!root) return;

    if (!calcInitialized) {

        root.innerHTML = calcShellHTML();
        calcInitialized = true;

        let savedShare = null;
        try { savedShare = localStorage.getItem(COUNCIL_SHARE_KEY); } catch (e) {}
        document.getElementById("ccShare").value = savedShare !== null ? savedShare : 25;
        document.getElementById("ccRows").innerHTML = councilRowHTML();

        root.addEventListener("input", function (event) {
            if (event.target.closest('[data-panel="council"]')) updateCouncilCalc();
            if (event.target.closest('[data-panel="quick"]')) updateQuickCalc();
            if (event.target.closest('[data-panel="reconcile"]')) updateReconcile();
        });

        root.addEventListener("change", function (event) {
            if (event.target.id === "qcRep" || event.target.id === "qcType") {
                const tr = document.getElementById("qc_add_transport");
                const external = document.getElementById("qcRep")?.value === "external";
                const eligible = isTransportEligible(document.getElementById("qcType")?.value);
                if (tr && event.target.id === "qcRep") tr.value = external && eligible ? Math.max(1, number(tr.value)) : 0;
                if (tr && event.target.id === "qcType" && external && eligible && number(tr.value) === 0) tr.value = 1;
            }
            if (event.target.closest('[data-panel="council"]')) updateCouncilCalc();
            if (event.target.closest('[data-panel="quick"]')) updateQuickCalc();
            if (event.target.closest('[data-panel="reconcile"]')) updateReconcile();
        });

        root.addEventListener("click", function (event) {
            if (event.target.closest("#ccAddRow")) {
                document.getElementById("ccRows").insertAdjacentHTML("beforeend", councilRowHTML());
                updateCouncilCalc();
            }
            const remove = event.target.closest(".cc-remove");
            if (remove) {
                const rows = document.querySelectorAll("#ccRows .calc-row");
                if (rows.length > 1) {
                    remove.closest(".calc-row").remove();
                } else {
                    rows[0].outerHTML = councilRowHTML();
                }
                updateCouncilCalc();
            }
            if (event.target.closest("#qcReset")) resetQuickCalc();
        });

        document.querySelectorAll(".calc-tab").forEach(function (button) {
            button.addEventListener("click", function () { switchCalcTab(button.dataset.calc); });
        });
    }

    /* تحديث قوائم السجلات مع الحفاظ على الاختيار */
    document.querySelectorAll("#ccRows .cc-record").forEach(function (select) {
        const current = select.value;
        select.innerHTML = recordOptionsHTML(current);
    });

    const rc = document.getElementById("rcRecord");
    if (rc) rc.innerHTML = recordOptionsHTML(rc.value);

    switchCalcTab(activeCalcTab);
    updateCouncilCalc();
    renderCouncilSaved();
    updateQuickCalc();
    updateReconcile();
}

window.renderCalculator = renderCalculator;
window.printCouncilCalc = printCouncilCalc;
window.saveCouncilCalc = saveCouncilCalc;
window.loadCouncilCalc = loadCouncilCalc;
window.deleteCouncilCalc = deleteCouncilCalc;
window.printReconcile = printReconcile;

/* =========================================================
دليل النظام: شرح الألوان والحسابات والإرشادات
يُبنى من الأسعار والبيانات الحالية فيبقى محدّثاً دائماً.
========================================================= */

function guideCard(icon, title, body) {
    return '<div class="content-card guide-card"><h3><i class="ti ti-' + icon + '"></i> ' + title + "</h3>" + body + "</div>";
}

function renderGuide() {

    const container = document.getElementById("guideContent");

    if (!container) {
        return;
    }

    const t = getTransportPricing();
    const allAgencies = [];
    records.forEach(function (record) {
        (record.agencies || []).forEach(function (agency) { allAgencies.push(agency); });
    });

    let html = '<div class="guide-grid">';

    /* ١) ألوان الوكالات */
    const demoType = "legal";
    const demoColor = AGENCY_TYPE_COLORS[demoType];

    html += guideCard("palette", "ألوان الوكالات والعلامات",
        '<p class="guide-text">كل وكالة في التقارير والقوائم تُلوَّن حتى تميّزها بنظرة واحدة:</p>' +
        '<h4 class="guide-sub">1. لون الشريط = نوع الوكالة</h4>' +
        '<div class="guide-chips">' +
        Object.keys(AGENCY_NAMES).map(function (type) {
            return '<span class="guide-chip" style="--c:' + AGENCY_TYPE_COLORS[type] + '">' + agencyTypeDot(type) + AGENCY_NAMES[type] + "</span>";
        }).join("") +
        "</div>" +
        '<h4 class="guide-sub">2. شدة التظليل = عدد الإضافات (بدون بدل الانتقال)</h4>' +
        '<div class="guide-shades">' +
        [0, 1, 2, 3].map(function (level) {
            const tint = [0.04, 0.13, 0.23, 0.34][level];
            return '<div class="guide-shade" style="background:' + hexToRgba(demoColor, tint) + ";box-shadow:inset -5px 0 0 " + demoColor + '">' +
                (level === 3 ? "3 أو أكثر" : additionsCountLabel(level)) + "</div>";
        }).join("") +
        "</div>" +
        '<h4 class="guide-sub">3. العلامات</h4>' +
        '<ul class="guide-list">' +
            '<li><span class="cls-mark cls-mark-add" style="--cls-color:' + demoColor + '">+2</span> عدد الإضافات في الوكالة (توقيع، أصالة، وكيل عن…).</li>' +
            '<li><span class="cls-mark cls-mark-transport">انتقال</span> الوكالة عليها بدل انتقال.</li>' +
            '<li><span class="cls-mark cls-mark-missing">نقص</span> الوكالة فيها طوابع ناقصة.</li>' +
            '<li><span class="guide-state guide-state-missing"></span> الوكالة <b>المفقودة</b> مظللة بخطوط مائلة.</li>' +
            '<li><span class="guide-state guide-state-cancelled"></span> الوكالة <b>الملغاة</b> رمادية ومبالغها مشطوبة.</li>' +
        "</ul>"
    );

    /* ٢) تصنيف كل الوكالات */
    html += guideCard("list-details", "تصنيف كل الوكالات في النظام",
        '<p class="guide-text">كل تركيبة موجودة حالياً في السجلات وعددها (' + allAgencies.length + " وكالة في " + records.length + " سجل):</p>" +
        '<div class="table-wrapper">' + classLegendHTML(allAgencies) + "</div>"
    );

    /* ٣) المطلوب من المندوب */
    html += guideCard("calculator", "كيف يُحسب المطلوب من المندوب",
        '<p class="guide-text">لكل وكالة غير ملغاة:</p>' +
        '<div class="guide-formula">المطلوب = المبلغ الأساسي للمندوب + الإضافات النقدية + قيمة الطوابع الناقصة + حصة الفرع من بدل الانتقال</div>' +
        '<div class="table-wrapper"><table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">سعر الوكالة</th><th class="num">المبلغ الأساسي للمندوب</th></tr></thead><tbody>' +
        Object.keys(AGENCY_NAMES).map(function (type) {
            const p = prices[type] || { agency: 0, representative: 0 };
            return "<tr><td>" + agencyTypeDot(type) + AGENCY_NAMES[type] + '</td><td class="num">' + money(p.agency) + '</td><td class="num">' + money(p.representative) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>" +
        '<ul class="guide-list">' +
            "<li>الإضافات المعلّمة «طابع مرافعة» في قسم الأسعار لا تضيف مبلغاً، بل تزيد عدد طوابع المرافعة المطلوبة.</li>" +
            "<li>الطوابع الناقصة: مرافعة " + money(stampPrices.pleading) + "، إسعاف " + money(stampPrices.ambulance) + "، معونة " + money(stampPrices.aid) + ".</li>" +
            "<li>الوكالة <b>الملغاة</b> لا يُطلب عنها شيء، و<b>المفقودة</b> تُحسب مثل الفعالة.</li>" +
        "</ul>"
    );

    /* ٤) بدل الانتقال */
    html += guideCard("route", "بدل الانتقال (المندوب الخارجي)",
        '<p class="guide-text">عند اختيار «مندوب خارجي» في بيانات السجل يُضاف بدل الانتقال تلقائياً إلى الوكالات <b>العامة والخاصة والشرعية فقط</b>، ولا يُضاف إلى الصور المصدقة (طبق الأصل) ولا إلى الوكالة التنفيذية. ويمكن تغييره أو إطفاؤه لكل وكالة من قائمتها.</p>' +
        '<div class="guide-split">' +
            '<div><span>القيمة الكاملة (تضاف لقيمة الوكالة)</span><strong>' + money(t.total) + "</strong></div>" +
            (t.pleadingStamp ? '<div><span>طابع مرافعة</span><strong>' + money(t.stampPrice) + "</strong></div>" : "") +
            '<div><span>حصة المندوب (لا تُطلب منه)</span><strong>' + money(t.representativeShare) + "</strong></div>" +
            '<div class="guide-split-due"><span>المطلوب من المندوب (حصة الفرع)</span><strong>' + money(t.cashRemainder) + "</strong></div>" +
        "</div>" +
        '<p class="guide-text">مثال: وكالة عامة ' + money(prices.general ? prices.general.agency : 0) + " + بدل انتقال " + money(t.total) + " = " +
            money((prices.general ? prices.general.agency : 0) + t.total) + "، والمطلوب من المندوب عنها " +
            money((prices.general ? prices.general.representative : 0) + t.cashRemainder) + ".</p>"
    );

    /* ٥) حصص اللجان */
    html += guideCard("heart-handshake", "حصص لجنتي الإسعاف والتعاون",
        '<p class="guide-text">لكل وكالة غير ملغاة حصة لكل لجنة = <b>سعر الوكالة في السجل × نسبة نوعها</b>. النسب تُعدَّل من قسم الأسعار ← أسعار اللجان، وإذا تغيّر سعر الوكالة تتغير الحصة معه تلقائياً.</p>' +
        '<div class="guide-formula">مثال: ' + money(prices.general ? prices.general.agency : 0) + " × " + formatRate(committeeRates.general ? committeeRates.general.ambulance : 0) +
            " = " + money(committeeAmount(prices.general ? prices.general.agency : 0, committeeRates.general ? committeeRates.general.ambulance : 0)) + " لجنة الإسعاف</div>" +
        '<div class="table-wrapper"><table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">لجنة الإسعاف</th><th class="num">لجنة التعاون</th><th class="num">المجموع بالسعر الحالي</th></tr></thead><tbody>' +
        Object.keys(AGENCY_NAMES).map(function (type) {
            const price = number(prices[type] && prices[type].agency);
            const rate = committeeRates[type] || { ambulance: 0, cooperation: 0 };
            return "<tr><td>" + agencyTypeDot(type) + AGENCY_NAMES[type] + '</td><td class="num">' + committeeRateHTML(type, "ambulance") + '</td><td class="num">' + committeeRateHTML(type, "cooperation") +
                '</td><td class="num">' + money(committeeAmount(price, rate.ambulance) + committeeAmount(price, rate.cooperation)) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>"
    );

    /* ٦) التصفية والفرز */
    html += guideCard("filter", "التصفية والفرز في التقارير",
        '<ul class="guide-list">' +
            "<li>اختر مندوباً أو أكثر، ومدة من تاريخ إلى تاريخ (حسب «تاريخ السجل»)، ونوع الوكالة وحالتها.</li>" +
            "<li><b>مطابقة الإضافات:</b> «تحتوي على كل المختار» مثل توقيع + أصالة معاً ولو فيها غيرها، «أيٌّ منها» يكفي وجود واحدة، «فقط بالضبط» لا يقبل أي إضافة أخرى (بدل الانتقال يُحسب إضافة هنا).</li>" +
            "<li>كل أرقام التقرير وملف PDF وورقة «الوكالات» في Excel تتبع التصفية الحالية.</li>" +
            "<li>الضغط على نوع في جدول «الإجمالي حسب نوع الوكالة» يصفّي عليه مباشرة.</li>" +
        "</ul>"
    );

    /* ٧) نصائح */
    html += guideCard("bulb", "نصائح الاستخدام",
        '<ul class="guide-list">' +
            "<li><b>عرض نوع واحد:</b> في التقرير المختصر أو المفصل اضغط على نوع الوكالة لعرض وكالاته فقط، ومنها زر «تعديل» لكل وكالة.</li>" +
            "<li><b>بعد تعديل وكالة:</b> اضغط «إضافة الوكالة» ثم «حفظ السجل» حتى يُحفظ التعديل.</li>" +
            "<li><b>إضافة سريعة:</b> <b>Ctrl + S</b> يضيف الوكالة من أي حقل في صفحة إنشاء السجل، و«وكالة مماثلة للأخيرة» يكرر آخر وكالة (نوعها وحالتها وإضافاتها وطوابعها) بالرقم التالي. رقم ونوع آخر وكالة يظهران في الشريط السفلي.</li>" +
            "<li><b>وكالة منسية:</b> اكتب رقمها الصحيح (مثلاً 116) ثم «إضافة الوكالة»، واختر «إدراجها وإزاحة الأرقام»: تأخذ رقمها، وكل وكالة بعدها يزداد رقمها 1 مع بقاء بياناتها.</li>" +
            "<li><b>تغيير النوع:</b> من قائمة «النوع» في سطر الوكالة المضافة؛ تُعاد حسابها بسعر النوع الجديد ويبقى رقمها.</li>" +
            "<li><b>أسعار حسب الفترات:</b> من قسم الأسعار ← «أسعار حسب الفترات». كل جدول يبدأ من تاريخ (يوم) محدد، وكل وكالة جديدة تأخذ أسعار فترة «تاريخ السجل»، والسجلات المحفوظة لا تتغير.</li>" +
            "<li><b>الوضع الليلي:</b> زر «الوضع الليلي» في القائمة الجانبية (أو أيقونة القمر على الهاتف)، ويُحفظ اختيارك.</li>" +
            "<li><b>الحفظ التلقائي:</b> السجل غير المحفوظ يُستعاد تلقائياً إذا أُغلقت الصفحة أو انقطعت الكهرباء.</li>" +
            "<li><b>الحاسبة:</b> لحساب حصة أعضاء مجلس الفرع من بدل الانتقال لسجلات ومدى وكالات محددة، ولحساب وكالة دون إنشاء سجل، ولمطابقة ما سلّمه المندوب. كل ذلك منفصل ولا يغيّر أي رقم في السجلات.</li>" +
            "<li><b>حفظ PDF:</b> في نافذة الطباعة اختر «حفظ بتنسيق PDF» وفعّل «رسومات الخلفية» لتظهر الألوان.</li>" +
            "<li><b>النسخ الاحتياطي:</b> البيانات محفوظة في هذا المتصفح فقط؛ حمّل نسخة احتياطية بانتظام من قسم المستخدمين، خصوصاً قبل أي تحديث.</li>" +
        "</ul>"
    );

    html += "</div>";

    container.innerHTML = html;
}

window.renderGuide = renderGuide;

/* =========================================================
التقارير
========================================================= */

function renderReports() {

const container =
    document.getElementById(
        "reportsContent"
    );


if (!container) {
    return;
}


/* التصفية: كل الأرقام أدناه تُحسب على الوكالات المطابقة فقط */

fillReportFilterOptions();

const reportFilter =
    getReportFilter();

const filterActive =
    isReportFilterActive(
        reportFilter
    );

const matchedAgencies =
    getFilteredAgencies(
        reportFilter
    );

const matchedRecordIds =
    new Set(
        matchedAgencies.map(
            function (m) {
                return m.record.id;
            }
        )
    );

const resultCounter =
    document.getElementById(
        "filterResultCount"
    );

if (resultCounter) {

    resultCounter.textContent =
        filterActive
            ? matchedAgencies.length + " وكالة مطابقة في " + matchedRecordIds.size + " سجل"
            : "كل الوكالات (" + matchedAgencies.length + ")";

}


const allAgencies =
    matchedAgencies.map(
        function (m) {

            return {

                ...m.agency,

                recordId:
                    m.record.id,

                recordNumber:
                    m.record.recordNumber,

                representativeName:
                    m.record.representativeName,

                officeName:
                    m.record.officeName

            };

        }
    );


const activeAgencies =
    allAgencies.filter(
        function (agency) {

            return (
                agency.status !==
                "cancelled"
            );

        }
    );


const totalBase =
    activeAgencies.reduce(
        function (sum, agency) {

            return (
                sum +
                number(
                    agency.basePrice
                )
            );

        },
        0
    );


const transportTotals =
    sumTransport(
        activeAgencies
    );


const committeeTotals =
    sumCommittees(
        activeAgencies
    );


/* الإضافات النقدية بدون حصة الفرع من بدل الانتقال (لها بطاقة مستقلة) */

const totalAdditions =
    activeAgencies.reduce(
        function (sum, agency) {

            return (
                sum +
                number(
                    agency.additionsTotal
                )
            );

        },
        0
    ) - transportTotals.cash;


const totalStamps =
    activeAgencies.reduce(
        function (sum, agency) {

            return (
                sum +
                number(
                    agency.missingStampsValue
                )
            );

        },
        0
    );


const totalRepresentative =
    activeAgencies.reduce(
        function (sum, agency) {

            return (
                sum +
                number(
                    agency.representativeAmount
                )
            );

        },
        0
    );


const cancelled =
    allAgencies.length -
    activeAgencies.length;


const missingCount =
    allAgencies.filter(
        function (agency) {

            return (
                agency.status ===
                "missing"
            );

        }
    ).length;


let html = `

    <div class="button-row no-print">
        <button type="button" class="primary-btn" onclick="exportAllRecordsToExcel()">
            تصدير Excel
        </button>
        <button type="button" class="secondary-btn" onclick="exportReportsToPDF()">
            تصدير PDF
        </button>
    </div>

    ${docLetterhead(
        filterActive ? "تقرير مصفّى" : "التقرير العام",
        filterActive
            ? escapeHTML(reportFilterLabel(reportFilter))
            : "كل السجلات حتى تاريخ " + todayArabic() + " — " + records.length + " سجل"
    )}

    <div class="report-total">

        <h2>
            ${filterActive ? "إجمالي النتائج المصفّاة" : "الإجمالي العام"}
        </h2>

        <div class="report-grid">

            <div>

                <span>
                    إجمالي سعر الوكالات
                </span>

                <strong class="report-number">
                    ${money(
                        totalBase
                    )}
                </strong>

            </div>


            <div>

                <span>
                    إجمالي الإضافات النقدية
                </span>

                <strong class="report-number">
                    ${money(
                        totalAdditions
                    )}
                </strong>

            </div>


            <div>

                <span>
                    قيمة الطوابع الناقصة
                </span>

                <strong class="report-number">
                    ${money(
                        totalStamps
                    )}
                </strong>

            </div>


            <div>

                <span>
                    عدد الوكالات الفعالة
                </span>

                <strong class="report-number">
                    ${activeAgencies.length - missingCount}
                </strong>

            </div>


            <div>

                <span>
                    الوكالات الملغاة
                </span>

                <strong class="report-number">
                    ${cancelled}
                </strong>

            </div>


            <div>

                <span>
                    الوكالات المفقودة
                </span>

                <strong class="report-number">
                    ${missingCount}
                </strong>

            </div>


            <div class="report-due">

                <span>
                    ${filterActive ? "المطلوب حسب التصفية" : "المطلوب من جميع المندوبين"}
                </span>

                <strong class="report-number">
                    ${money(
                        totalRepresentative
                    )}
                </strong>

            </div>

        </div>

    </div>


    <div class="report-card">

        <h3>
            الإجمالي حسب نوع الوكالة
        </h3>

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>
                            نوع الوكالة
                        </th>

                        <th>
                            العدد
                        </th>

                        <th>
                            سعر الوكالة الحالي
                        </th>

                        <th>
                            إجمالي سعر الوكالات
                        </th>

                        <th>
                            المبلغ الأساسي للمندوب
                        </th>

                    </tr>

                </thead>

                <tbody>

`;


Object.keys(
    AGENCY_NAMES
).forEach(
    function (type) {

        const list =
            activeAgencies.filter(
                function (agency) {

                    return (
                        agency.type ===
                        type
                    );

                }
            );


        const total =
            list.reduce(
                function (sum, agency) {

                    return (
                        sum +
                        number(
                            agency.basePrice
                        )
                    );

                },
                0
            );


        const representative =
            list.reduce(
                function (sum, agency) {

                    return (
                        sum +
                        number(
                            agency.representativeBase
                        )
                    );

                },
                0
            );


        html += `

            <tr
                class="clickable-row"
                tabindex="0"
                role="button"
                title="اضغط لعرض وكالات هذا النوع فقط"
                onclick="setReportTypeFilter('${type}')"
            >

                <td>
                    ${agencyTypeDot(type)}
                    ${AGENCY_NAMES[type]}
                    <i class="ti ti-chevron-left row-go"></i>
                </td>

                <td>
                    ${list.length}
                </td>

                <td>
                    ${money(
                        prices[type].agency
                    )}
                </td>

                <td>
                    ${money(
                        total
                    )}
                </td>

                <td>
                    ${money(
                        representative
                    )}
                </td>

            </tr>

        `;

    }
);


html += `

                </tbody>

            </table>

        </div>

    </div>


    <div class="report-card">

        <h3>
            إجمالي الإضافات
        </h3>

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>
                            الإضافة
                        </th>

                        <th>
                            العدد
                        </th>

                        <th>
                            نوعها
                        </th>

                        <th>
                            الإجمالي النقدي
                        </th>

                    </tr>

                </thead>

                <tbody>

`;


Object.keys(
    ADDITION_NAMES
).forEach(
    function (key) {

        if (key === "transport") {
            return; /* له بطاقة مستقلة */
        }

        const count =
            activeAgencies.reduce(
                function (sum, agency) {

                    return (
                        sum +
                        number(
                            agency.additions[key]
                        )
                    );

                },
                0
            );


        const total =
            activeAgencies.reduce(
                function (sum, agency) {

                    return (
                        sum +
                        number(
                            agency.additionValues[key]
                        )
                    );

                },
                0
            );


        const stampCount =
            activeAgencies.reduce(
                function (sum, agency) {

                    const settings =
                        agency
                            .appliedPrices
                            ?.additions
                            ?.[key];


                    return (
                        sum +
                        (
                            settings &&
                            settings.isPleading
                                ? number(
                                    agency.additions[key]
                                )
                                : 0
                        )
                    );

                },
                0
            );


        html += `

            <tr>

                <td>
                    ${ADDITION_NAMES[key]}
                </td>

                <td>
                    ${count}
                </td>

                <td>

                    ${
                        stampCount > 0
                            ? `
                                طابع مرافعة:
                                ${stampCount}
                              `
                            : "مبلغ مالي"
                    }

                </td>

                <td>
                    ${money(
                        total
                    )}
                </td>

            </tr>

        `;

    }
);


html += `

                </tbody>

            </table>

        </div>

    </div>


    <div class="report-card">

        <h3>
            الطوابع الناقصة
        </h3>

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>
                            نوع الطابع
                        </th>

                        <th>
                            العدد
                        </th>

                        <th>
                            سعر الطابع
                        </th>

                        <th>
                            القيمة
                        </th>

                    </tr>

                </thead>

                <tbody>

`;


const stampTypes = [

    {
        key:
            "pleading",

        name:
            "مرافعة"
    },

    {
        key:
            "ambulance",

        name:
            "إسعاف"
    },

    {
        key:
            "aid",

        name:
            "معونة"
    }

];


stampTypes.forEach(
    function (stamp) {

        const count =
            activeAgencies.reduce(
                function (sum, agency) {

                    return (
                        sum +
                        number(
                            agency.stamps[
                                stamp.key
                            ]
                        )
                    );

                },
                0
            );


        const price =
            number(
                stampPrices[
                    stamp.key
                ]
            );


        html += `

            <tr>

                <td>
                    ${stamp.name}
                </td>

                <td>
                    ${count}
                </td>

                <td>
                    ${money(
                        price
                    )}
                </td>

                <td>
                    ${money(
                        count * price
                    )}
                </td>

            </tr>

        `;

    }
);


html += `

                </tbody>

            </table>

        </div>

    </div>


    <div class="report-card">

        <h3>
            بدل الانتقال
        </h3>

        <div class="table-wrapper">
            ${transportTableHTML(transportTotals, "report-table")}
        </div>

    </div>


    <div class="report-card">

        <h3>
            حصص لجنتي الإسعاف والتعاون
        </h3>

        <div class="table-wrapper">
            ${committeesByTypeTableHTML(committeeTotals).replace('class="doc-table"', 'class="report-table"')}
        </div>

    </div>


    <div class="report-card">

        <h3>
            المطلوب من كل مندوب
        </h3>

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>
                            المندوب
                        </th>

                        <th>
                            عدد السجلات
                        </th>

                        <th>
                            عدد الوكالات
                        </th>

                        <th>
                            حصته من بدل الانتقال
                        </th>

                        <th>
                            المطلوب
                        </th>

                    </tr>

                </thead>

                <tbody>

`;


const representativeMap = {};


/* حسب المندوب: من الوكالات المطابقة للتصفية فقط */

allAgencies.forEach(
    function (agency) {

        const name =
            agency.representativeName;


        if (
            !representativeMap[name]
        ) {

            representativeMap[name] = {

                recordIds:
                    new Set(),

                records:
                    0,

                agencies:
                    0,

                transportShare:
                    0,

                amount:
                    0

            };

        }


        const item =
            representativeMap[name];

        item.recordIds.add(
            agency.recordId
        );

        item.records =
            item.recordIds.size;

        item.agencies += 1;

        item.transportShare +=
            getAgencyTransport(
                agency
            ).share;

        item.amount +=
            agency.status === "cancelled"
                ? 0
                : number(
                    agency.representativeAmount
                );

    }
);


const representatives =
    Object.keys(
        representativeMap
    );


if (
    representatives.length ===
    0
) {

    html += `

        <tr>

            <td
                colspan="5"
                style="text-align:center"
            >
                لا توجد بيانات.
            </td>

        </tr>

    `;

} else {

    representatives.forEach(
        function (name) {

            const item =
                representativeMap[name];


            html += `

                <tr>

                    <td>
                        ${escapeHTML(
                            name
                        )}
                    </td>

                    <td>
                        ${item.records}
                    </td>

                    <td>
                        ${item.agencies}
                    </td>

                    <td>
                        ${money(
                            item.transportShare
                        )}
                    </td>

                    <td>

                        <strong>
                            ${money(
                                item.amount
                            )}
                        </strong>

                    </td>

                </tr>

            `;

        }
    );

}


html += `

                </tbody>

            </table>

        </div>

    </div>

`;


html += `

    <div class="report-card" id="filteredAgenciesCard">

        <h3>
            <i class="ti ti-list-search"></i>
            ${filterActive ? "الوكالات المطابقة للتصفية" : "كل الوكالات"}
            <span class="counter">${matchedAgencies.length} وكالة</span>
        </h3>

        <div class="table-wrapper">
            ${filteredAgenciesTableHTML(matchedAgencies, false)}
        </div>

    </div>


    <p class="guide-link no-print">
        <i class="ti ti-info-circle"></i>
        معنى الألوان والعلامات وطريقة الحساب موجودة في
        <button type="button" class="link-btn" onclick="switchSection('guideSection')">دليل النظام</button>
    </p>

`;


container.innerHTML =
    html;

}

/* =========================================================
إدارة الأسعار
========================================================= */

function renderPrices() {

if (
    !currentUser ||
    currentUser.role !==
    "manager"
) {

    return;

}


const container =
    document.getElementById(
        "pricesContainer"
    );


if (!container) {
    return;
}


container.innerHTML =
    Object.keys(
        AGENCY_NAMES
    )
    .map(
        function (key) {

            return `

                <div class="price-row">

                    <label>
                        ${AGENCY_NAMES[key]}
                    </label>

                    <input
                        type="text" inputmode="numeric" data-num="int" autocomplete="off"
                        min="0"
                        data-price-key="${key}"
                        data-price-type="agency"
                        value="${prices[key].agency}"
                    >

                </div>


                <div class="price-row">

                    <label>
                        المبلغ المطلوب من المندوب -
                        ${AGENCY_NAMES[key]}
                    </label>

                    <input
                        type="text" inputmode="numeric" data-num="int" autocomplete="off"
                        min="0"
                        data-price-key="${key}"
                        data-price-type="representative"
                        value="${prices[key].representative}"
                    >

                </div>

            `;

        }
    )
    .join("");


renderAdditionPrices();

renderPriceSchedule();

renderStampPrices();

renderTransportPrices();

}

/* =========================================================
بطاقة «أسعار حسب الفترات» في صفحة الأسعار
========================================================= */

/* نسخة عمل غير محفوظة حتى يُضغط «حفظ أسعار الفترات» */
let scheduleDraft = null;

function scheduleWorkingCopy() {
    if (!scheduleDraft) {
        scheduleDraft = JSON.parse(JSON.stringify(priceSchedule));
    }
    return scheduleDraft;
}

/* تاريخ بداية الجدول للعرض: 5 آذار 2026 */
function monthLabel(from) {
    const p = scheduleStart(from).split("-").map(Number);
    try {
        return new Date(p[0], p[1] - 1, p[2] || 1).toLocaleDateString(NUMBER_LOCALE, { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
        return from;
    }
}

function renderPriceSchedule() {

    const box = document.getElementById("priceScheduleList");

    if (!box) {
        return;
    }

    const list = scheduleWorkingCopy().slice().sort(function (a, b) { return scheduleStart(a.from).localeCompare(scheduleStart(b.from)); });

    /* تنبيه في بطاقة الأسعار الأساسية: متى تُستخدم */
    const note = document.getElementById("basePricesNote");
    if (note) {
        const saved = priceSchedule.slice().sort(function (a, b) { return scheduleStart(a.from).localeCompare(scheduleStart(b.from)); });
        const activeNow = priceTableForDay(todayDay()).month;
        note.innerHTML = saved.length
            ? '<i class="ti ti-info-circle" aria-hidden="true"></i><span>هذه الأسعار تُستخدم فقط للسجلات قبل ' + escapeHTML(monthLabel(saved[0].from)) +
              ". " + (activeNow ? "الأسعار السارية الآن هي جدول <b>" + escapeHTML(monthLabel(activeNow)) + "</b> في «أسعار حسب الفترات» أدناه؛ لتغيير الأسعار الحالية أضف جدولاً جديداً بتاريخ بدايته." : "") + "</span>"
            : "";
    }

    if (!list.length) {
        box.innerHTML = '<p class="empty-hint">لا توجد جداول أسعار خاصة بأشهر. كل السجلات تستخدم الأسعار الأساسية.</p>';
        return;
    }

    const today = todayDay();
    const active = priceTableForDay(today).month;

    box.innerHTML = list.map(function (entry) {
        return '<div class="schedule-entry' + (scheduleStart(entry.from) === active ? " is-current" : "") + '" data-from="' + entry.from + '">' +
            '<div class="schedule-head"><strong><i class="ti ti-calendar-event" aria-hidden="true"></i> من ' + escapeHTML(monthLabel(entry.from)) + "</strong>" +
            (scheduleStart(entry.from) === active ? '<span class="badge badge-success">السارية الآن</span>' : scheduleStart(entry.from) > today ? '<span class="badge badge-warning">قادمة</span>' : "") +
            '<button type="button" class="act-btn act-danger" data-remove-schedule="' + entry.from + '" aria-label="حذف جدول ' + entry.from + '"><i class="ti ti-trash" aria-hidden="true"></i> حذف</button></div>' +
            '<div class="table-wrapper"><table class="schedule-table"><thead><tr><th>نوع الوكالة</th><th class="num">سعر الوكالة</th><th class="num">المطلوب من المندوب</th>' +
            '<th class="num">حصة الإسعاف</th><th class="num">حصة التعاون</th></tr></thead><tbody>' +
            Object.keys(AGENCY_NAMES).map(function (type) {
                const p = (entry.prices && entry.prices[type]) || prices[type] || { agency: 0, representative: 0 };
                return "<tr><td>" + agencyTypeDot(type) + AGENCY_NAMES[type] + "</td>" +
                    '<td class="num"><input type="text" inputmode="numeric" data-num="int" autocomplete="off" data-sch-type="' + type + '" data-sch-field="agency" value="' + number(p.agency) + '" aria-label="سعر ' + AGENCY_NAMES[type] + '"></td>' +
                    '<td class="num"><input type="text" inputmode="numeric" data-num="int" autocomplete="off" data-sch-type="' + type + '" data-sch-field="representative" value="' + number(p.representative) + '" aria-label="المطلوب من المندوب ' + AGENCY_NAMES[type] + '"></td>' +
                    scheduleShareCell(type, p, "ambulance", "حصة الإسعاف") +
                    scheduleShareCell(type, p, "cooperation", "حصة التعاون") + "</tr>";
            }).join("") +
            "</tbody></table></div></div>";
    }).join("");
}

/*
    خانة حصة لجنة في جدول الفترة: فارغة = تلقائي (سعر الوكالة × النسبة، يظهر باهتاً)،
    أو مبلغ محدد لهذه الفترة.
*/
function scheduleShareCell(type, p, field, label) {
    const explicit = explicitShare(p, field);
    const auto = committeeAmount(p.agency, (committeeRates[type] || {})[field]);
    return '<td class="num"><input type="text" inputmode="numeric" data-num="int" autocomplete="off" class="share-input" data-sch-type="' + type + '" data-sch-field="' + field + '"' +
        ' value="' + (explicit === null ? "" : explicit) + '" placeholder="' + auto + ' تلقائي" aria-label="' + label + " " + AGENCY_NAMES[type] + ' (فارغ = تلقائي)"></td>';
}

/* قيم الحقول تُنقل إلى نسخة العمل عند الكتابة */
document.getElementById("priceScheduleList")?.addEventListener("input", function (event) {
    const input = event.target.closest("[data-sch-type]");
    if (!input) return;
    const from = input.closest("[data-from]").dataset.from;
    const entry = scheduleWorkingCopy().find(function (e) { return e.from === from; });
    if (!entry) return;
    entry.prices = entry.prices || {};
    entry.prices[input.dataset.schType] = entry.prices[input.dataset.schType] || {};
    const row = entry.prices[input.dataset.schType];
    const field = input.dataset.schField;
    /* حصة فارغة = تلقائي (يُحذف المبلغ المحدد) */
    if ((field === "ambulance" || field === "cooperation") && !String(input.value).trim()) {
        delete row[field];
    } else {
        row[field] = number(input.value);
    }
    /* تغيّر سعر الوكالة: تتحدث الحصة التلقائية المعروضة */
    if (field === "agency") {
        input.closest("tr").querySelectorAll(".share-input").forEach(function (cell) {
            cell.placeholder = committeeAmount(row.agency, (committeeRates[input.dataset.schType] || {})[cell.dataset.schField]) + " تلقائي";
        });
    }
});

document.getElementById("priceScheduleList")?.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-remove-schedule]");
    if (!btn) return;
    const from = btn.dataset.removeSchedule;
    appConfirm({
        title: "حذف جدول أسعار الشهر",
        message: "سيُحذف جدول الأسعار الذي يبدأ من " + monthLabel(from) + ". السجلات المحفوظة لا تتأثر. (يُطبَّق الحذف بعد الضغط على «حفظ أسعار الفترات»)",
        confirmText: "حذف الجدول",
        cancelText: "إلغاء",
        danger: true
    }).then(function (ok) {
        if (!ok) return;
        scheduleDraft = scheduleWorkingCopy().filter(function (e) { return e.from !== from; });
        renderPriceSchedule();
    });
});

document.getElementById("addScheduleBtn")?.addEventListener("click", function () {

    const monthInput = document.getElementById("scheduleMonth");
    const from = monthInput?.value;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "")) {
        notify("اختر التاريخ الذي تبدأ منه الأسعار.", "error");
        monthInput?.focus();
        return;
    }

    if (scheduleWorkingCopy().some(function (e) { return scheduleStart(e.from) === from; })) {
        notify("يوجد جدول أسعار يبدأ في هذا التاريخ. عدّل أسعاره مباشرة.", "warning");
        return;
    }

    /* يبدأ بأسعار الفترة السارية قبله، ثم تعدّلها */
    const base = priceTableForDay(from).prices;
    const copy = {};
    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const p = (base && base[type]) || prices[type] || { agency: 0, representative: 0 };
        copy[type] = { agency: number(p.agency), representative: number(p.representative) };
        ["ambulance", "cooperation"].forEach(function (field) {
            const v = explicitShare(p, field);
            if (v !== null) copy[type][field] = v;
        });
    });

    scheduleWorkingCopy().push({ id: generateId(), from: from, prices: copy, createdAt: new Date().toISOString() });
    renderPriceSchedule();
    notify("أُضيف جدول أسعار يبدأ من " + escapeHTML(monthLabel(from)) + ". عدّل الأسعار ثم اضغط «حفظ أسعار الفترات».", "info", 6000);
});

document.getElementById("saveScheduleBtn")?.addEventListener("click", function () {

    if (!currentUser || currentUser.role !== "manager") {
        notify("هذه العملية للمدير فقط.", "error");
        return;
    }

    const next = scheduleWorkingCopy().slice().sort(function (a, b) { return scheduleStart(a.from).localeCompare(scheduleStart(b.from)); });

    try {
        saveData(PRICE_SCHEDULE_KEY, next);
    } catch (error) {
        notify("تعذر حفظ أسعار الفترات: " + escapeHTML(error && error.message || error), "error");
        return;
    }

    priceSchedule = next;
    scheduleDraft = null;
    renderPriceSchedule();
    renderAgencyPricePeriod();
    updatePreview();
    renderRecordReprice();
    notify("<strong>حُفظت أسعار الفترات</strong><span>" + next.length + " جدول. الوكالات الجديدة تأخذ أسعار فترة «تاريخ السجل».</span>", "success", 5000, true);
});

/* =========================================================
إعادة تسعير السجلات المحفوظة حسب تاريخها
========================================================= */

/*
    السجلات المحفوظة قبل «أسعار حسب الفترات» أخذت سعراً واحداً (الأسعار الأساسية)
    أياً كان تاريخها، فتُحسب حصص اللجان منه أيضاً. هذه الأداة تعيد سعر الوكالة
    وحصة الفرع فقط إلى سعر فترة «تاريخ السجل»، بعد معاينة ونسخة احتياطية وموافقة.
    لا يُحذف شيء: السعر السابق يُحفظ في agency.priceHistory للتراجع.
*/
function collectRecordReprice() {
    const items = [];
    records.forEach(function (record) {
        const day = getRecordDay(record);
        if (!day) return;
        (record.agencies || []).forEach(function (agency) {
            /* الملغاة، والوكالة التي اختير لها سعر فترة بعينها، تبقى كما هي */
            if (!agency || agency.status === "cancelled" || agency.pricePeriod || number(agency.customPrice) > 0) return;
            const p = getPricingForType(agency.type, day);
            const dA = number(p.agency) - number(agency.basePrice);
            const dR = number(p.representative) - number(agency.representativeBase);
            if (!dA && !dR) return;
            items.push({ record: record, agency: agency, day: day, pricing: p, dA: dA, dR: dR });
        });
    });
    return items;
}

function repriceSummary(items) {
    const groups = {};
    const total = { records: new Set(), agencies: 0, dA: 0, dR: 0, ambBefore: 0, ambAfter: 0, coopBefore: 0, coopAfter: 0 };
    items.forEach(function (it) {
        const key = (it.pricing.priceMonth || "base") + "|" + it.agency.type + "|" + number(it.agency.basePrice) + "|" + number(it.pricing.agency) +
            "|" + number(it.agency.representativeBase) + "|" + number(it.pricing.representative);
        if (!groups[key]) {
            groups[key] = {
                month: it.pricing.priceMonth, type: it.agency.type,
                from: number(it.agency.basePrice), to: number(it.pricing.agency),
                repFrom: number(it.agency.representativeBase), repTo: number(it.pricing.representative),
                count: 0, records: new Set()
            };
        }
        groups[key].count++;
        groups[key].records.add(it.record.id);
        const rate = committeeRates[it.agency.type] || { ambulance: 0, cooperation: 0 };
        total.records.add(it.record.id);
        total.agencies++;
        total.dA += it.dA;
        total.dR += it.dR;
        total.ambBefore += committeeAmount(it.agency.basePrice, rate.ambulance);
        total.ambAfter += committeeAmount(it.pricing.agency, rate.ambulance);
        total.coopBefore += committeeAmount(it.agency.basePrice, rate.cooperation);
        total.coopAfter += committeeAmount(it.pricing.agency, rate.cooperation);
    });
    const list = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) {
        return String(a.month || "").localeCompare(String(b.month || "")) || a.type.localeCompare(b.type);
    });
    return { list: list, total: total };
}

/* سجلات استثناها المستخدم من إعادة التسعير (فيها أكثر من سعر — تُعدّل يدوياً) */
const repriceExcluded = new Set();

function lastRepriceBatch() {
    let last = null;
    records.forEach(function (record) {
        (record.agencies || []).forEach(function (agency) {
            (agency.priceHistory || []).forEach(function (h) {
                if (h && h.batch && (!last || String(h.at) > String(last.at))) last = h;
            });
        });
    });
    return last;
}

function renderRecordReprice() {

    const box = document.getElementById("recordRepriceBox");
    if (!box) return;

    /* نحافظ على فتح القائمة وموضع التمرير عند إعادة العرض */
    const wasOpen = !!box.querySelector(".reprice-records")?.open;
    const scrollTop = box.querySelector(".reprice-records-list")?.scrollTop || 0;
    const all = collectRecordReprice();
    const items = all.filter(function (it) { return !repriceExcluded.has(it.record.id); });
    const sum = repriceSummary(items);
    const t = sum.total;
    const last = lastRepriceBatch();
    const undoBtn = last
        ? '<button type="button" class="secondary-btn" data-reprice="undo"><i class="ti ti-arrow-back-up"></i> تراجع عن آخر إعادة تسعير (' + escapeHTML(formatDay(String(last.at).slice(0, 10))) + ")</button>"
        : "";

    if (!all.length) {
        box.innerHTML = '<p class="field-hint"><i class="ti ti-circle-check"></i> كل الوكالات المحفوظة مسعّرة حسب فترة تاريخ سجلها.</p>' +
            (undoBtn ? '<div class="button-row">' + undoBtn + "</div>" : "");
        return;
    }

    const rows = sum.list.map(function (g) {
        const rate = committeeRates[g.type] || { ambulance: 0, cooperation: 0 };
        return "<tr><td>" + escapeHTML(g.month ? monthLabel(g.month) : "الأسعار الأساسية") + "</td><td>" + escapeHTML(AGENCY_NAMES[g.type] || g.type) + "</td>" +
            '<td class="num">' + g.records.size + '</td><td class="num">' + g.count + "</td>" +
            '<td class="num">' + money(g.from) + " ← <b>" + money(g.to) + "</b></td>" +
            '<td class="num">' + money(g.repFrom) + " ← <b>" + money(g.repTo) + "</b></td>" +
            '<td class="num">' + money(committeeAmount(g.from, rate.ambulance)) + " ← <b>" + money(committeeAmount(g.to, rate.ambulance)) + "</b></td>" +
            '<td class="num">' + money(committeeAmount(g.from, rate.cooperation)) + " ← <b>" + money(committeeAmount(g.to, rate.cooperation)) + "</b></td></tr>";
    }).join("");

    const byRecord = {};
    all.forEach(function (it) {
        const r = byRecord[it.record.id] || (byRecord[it.record.id] = { record: it.record, day: it.day, count: 0, from: new Set(), to: new Set() });
        r.count++;
        r.from.add(number(it.agency.basePrice));
        r.to.add(number(it.pricing.agency));
    });
    const recList = Object.keys(byRecord).map(function (k) { return byRecord[k]; })
        .sort(function (a, b) { return a.day.localeCompare(b.day) || String(a.record.recordNumber).localeCompare(String(b.record.recordNumber), undefined, { numeric: true }); });
    const prices = function (set) { return Array.from(set).sort(function (a, b) { return a - b; }).map(money).join(" / "); };
    const recRows = recList.map(function (r) {
        const on = !repriceExcluded.has(r.record.id);
        return '<tr class="' + (on ? "" : "is-excluded") + '"><td><input type="checkbox" data-reprice-record="' + escapeHTML(r.record.id) + '"' + (on ? " checked" : "") +
            ' aria-label="تضمين السجل ' + escapeHTML(r.record.recordNumber) + '"></td>' +
            "<td>" + escapeHTML(r.record.recordNumber) + "</td><td>" + escapeHTML(formatDay(r.day)) + "</td><td>" + escapeHTML(r.record.officeName || "") + "</td>" +
            '<td class="num">' + r.count + '</td><td class="num">' + prices(r.from) + " ← <b>" + prices(r.to) + "</b></td></tr>";
    }).join("");
    const recordsBlock =
        '<details class="reprice-records"' + (wasOpen || repriceExcluded.size ? " open" : "") + "><summary>السجلات المشمولة: " + t.records.size + " من " + recList.length +
            " — أزل علامة السجل الذي فيه أكثر من سعر، ثم عدّل وكالاته يدوياً</summary>" +
            '<div class="button-row"><button type="button" class="secondary-btn" data-reprice="all">تحديد الكل</button>' +
            '<button type="button" class="secondary-btn" data-reprice="none">إلغاء تحديد الكل</button></div>' +
            '<div class="table-wrapper reprice-records-list"><table class="schedule-table"><thead><tr><th></th><th>السجل</th><th>التاريخ</th><th>المكتب</th><th>الوكالات</th><th>سعر الوكالة</th></tr></thead><tbody>' +
            recRows + "</tbody></table></div></details>";

    box.innerHTML =
        '<p class="field-hint"><i class="ti ti-alert-circle"></i> <b>' + all.length + " وكالة في " + recList.length + " سجل</b> محفوظة بسعر يختلف عن سعر فترة تاريخ سجلها" +
        (repriceExcluded.size ? " (المشمول بإعادة التسعير: " + t.agencies + " وكالة في " + t.records.size + " سجل)" : "") + ". " +
        "إعادة التسعير تغيّر سعر الوكالة وحصة الفرع فقط (والمبلغ المطلوب من المندوب بنفس الفرق)، فتُحسب حصص اللجنتين من السعر الصحيح. البنود والإضافات والطوابع والبدل لا تتغير.</p>" +
        '<div class="table-wrapper"><table class="schedule-table reprice-table"><thead><tr><th>الفترة</th><th>النوع</th><th>السجلات</th><th>الوكالات</th><th>سعر الوكالة</th><th>حصة الفرع</th><th>حصة الإسعاف</th><th>حصة التعاون</th></tr></thead><tbody>' +
        rows + "</tbody></table></div>" +
        recordsBlock +
        '<div class="reprice-totals">' +
            "<span>فرق أسعار الوكالات: <b>" + money(t.dA) + "</b></span>" +
            "<span>لجنة الإسعاف: " + money(t.ambBefore) + " ← <b>" + money(t.ambAfter) + "</b></span>" +
            "<span>لجنة التعاون: " + money(t.coopBefore) + " ← <b>" + money(t.coopAfter) + "</b></span>" +
        "</div>" +
        '<div class="button-row">' +
            '<button type="button" class="primary-btn" data-reprice="apply"' + (items.length ? "" : " disabled") + '><i class="ti ti-refresh"></i> تنزيل نسخة احتياطية ثم إعادة تسعير ' + t.agencies + " وكالة</button>" +
            undoBtn +
        "</div>";

    const list = box.querySelector(".reprice-records-list");
    if (list) list.scrollTop = scrollTop;
}

function applyRecordReprice() {

    if (!currentUser || currentUser.role !== "manager") {
        notify("هذه العملية للمدير فقط.", "error");
        return;
    }
    if (recordsLoadFailed) {
        notify("تعذر قراءة السجلات عند فتح الصفحة، لذلك أُوقف الحفظ حمايةً للبيانات. حدّث الصفحة.", "error");
        return;
    }

    const items = collectRecordReprice().filter(function (it) { return !repriceExcluded.has(it.record.id); });
    if (!items.length) {
        renderRecordReprice();
        return;
    }

    /* نسخة احتياطية كاملة أولاً، ثم الموافقة */
    try { downloadBackup(); } catch (e) {}

    appConfirm({
        title: "إعادة تسعير " + items.length + " وكالة",
        message: "نُزّلت نسخة احتياطية الآن — تأكد أنها حُفظت على جهازك. ستأخذ كل وكالة سعر فترة تاريخ سجلها، وتُعاد حصص اللجنتين على هذا السعر. يمكنك التراجع لاحقاً من الزر نفسه. متابعة؟",
        confirmText: "إعادة التسعير",
        cancelText: "إلغاء"
    }).then(function (ok) {

        if (!ok) return;

        const before = JSON.stringify(records);
        const batch = "reprice-" + Date.now();
        const at = new Date().toISOString();

        items.forEach(function (it) {
            applyAgencyPriceChange(it.agency, {
                agency: it.pricing.agency,
                representative: it.pricing.representative,
                priceMonth: it.pricing.priceMonth || null
            }, batch, at);
            it.record.updatedAt = at;
        });

        persistRecords().then(function () {
            refreshAfterReprice();
            notify("<strong>أُعيد تسعير " + items.length + " وكالة</strong><span>حصص اللجنتين تُحسب الآن من سعر فترة كل سجل.</span>", "success", 7000, true);
        }, function (error) {
            /* لم يُحفظ شيء: نعيد النسخة التي في الذاكرة كما كانت */
            records = JSON.parse(before);
            refreshAfterReprice();
            notify("<strong>لم تُحفظ إعادة التسعير</strong><span>" + escapeHTML(error && error.message || error) + "</span>", "error", 10000, true);
        });
    });
}

function undoRecordReprice() {

    if (!currentUser || currentUser.role !== "manager") {
        notify("هذه العملية للمدير فقط.", "error");
        return;
    }

    const last = lastRepriceBatch();
    if (!last) return;

    appConfirm({
        title: "التراجع عن إعادة التسعير",
        message: "تعود الوكالات التي تغيّر سعرها في " + formatDay(String(last.at).slice(0, 10)) + " (آخر عملية) إلى أسعارها السابقة تماماً. متابعة؟",
        confirmText: "تراجع",
        cancelText: "إلغاء"
    }).then(function (ok) {

        if (!ok) return;

        const before = JSON.stringify(records);
        let count = 0;

        records.forEach(function (record) {
            (record.agencies || []).forEach(function (a) {
                const hist = a.priceHistory || [];
                const h = hist.length ? hist[hist.length - 1] : null;
                if (!h || h.batch !== last.batch) return;
                a.basePrice = h.basePrice;
                a.representativeBase = h.representativeBase;
                a.representativeAmount = h.representativeAmount;
                if (h.hadApplied === false) {
                    delete a.appliedPrices;
                } else if (a.appliedPrices) {
                    if (h.appliedAgency === undefined) delete a.appliedPrices.agency; else a.appliedPrices.agency = h.appliedAgency;
                    if (h.appliedRepresentative === undefined) delete a.appliedPrices.representative; else a.appliedPrices.representative = h.appliedRepresentative;
                    a.appliedPrices.priceMonth = h.priceMonth;
                }
                /* الفترة والسعر المحدد (تغيير أسعار وكالات محددة) */
                ["pricePeriod", "customPrice", "customRepresentative"].forEach(function (field) {
                    if (!(field in h)) return;
                    if (h[field] === null || h[field] === undefined) delete a[field]; else a[field] = h[field];
                });
                hist.pop();
                if (!hist.length) delete a.priceHistory;
                record.updatedAt = new Date().toISOString();
                count++;
            });
        });

        persistRecords().then(function () {
            refreshAfterReprice();
            notify("أُعيدت " + count + " وكالة إلى أسعارها السابقة.", "success");
        }, function (error) {
            /* لم يُحفظ شيء: نعيد النسخة التي في الذاكرة كما كانت */
            records = JSON.parse(before);
            refreshAfterReprice();
            notify("<strong>لم يُحفظ التراجع</strong><span>" + escapeHTML(error && error.message || error) + "</span>", "error", 10000, true);
        });
    });
}

/* تحديث الواجهات بعد الحفظ؛ خطأ في عرضٍ ما لا يُلغي ما حُفظ */
function refreshAfterReprice() {
    [renderRecordReprice, renderBulkPrice, renderRecords, updateDashboard, renderReports].forEach(function (step) {
        try { step(); } catch (error) { console.error("Refresh after reprice failed:", error); }
    });
}

document.getElementById("recordRepriceBox")?.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-reprice]");
    if (!btn) return;
    if (btn.dataset.reprice === "apply") applyRecordReprice();
    else if (btn.dataset.reprice === "undo") undoRecordReprice();
    else if (btn.dataset.reprice === "all") { repriceExcluded.clear(); renderRecordReprice(); }
    else if (btn.dataset.reprice === "none") {
        collectRecordReprice().forEach(function (it) { repriceExcluded.add(it.record.id); });
        renderRecordReprice();
    }
});

document.getElementById("recordRepriceBox")?.addEventListener("change", function (event) {
    const box = event.target.closest("[data-reprice-record]");
    if (!box) return;
    if (box.checked) repriceExcluded.delete(box.dataset.repriceRecord); else repriceExcluded.add(box.dataset.repriceRecord);
    renderRecordReprice();
});

renderRecordReprice();

/* =========================================================
تغيير سعر وكالات محفوظة (حسب التاريخ، أو من وكالة إلى وكالة في سجل)
========================================================= */

/*
    يغيّر سعر الوكالة وحصة الفرع لوكالات محفوظة محددة: إلى سعر فترة من «أسعار حسب الفترات»
    (تُعلَّم الوكالة بتلك الفترة pricePeriod)، أو إلى مبلغ محدد (customPrice — لا تغيّره أي
    إعادة تسعير لاحقة). نفس ضمانات «تسعير السجلات المحفوظة»: معاينة، نسخة احتياطية، تأكيد،
    تغيير حقول السعر فقط، وتراجع كامل من priceHistory.
*/

function bulkPriceOptions() {
    const val = function (id) { return document.getElementById(id)?.value || ""; };
    return {
        scope: val("bpScope") || "date",
        from: val("bpFrom"),
        to: val("bpTo"),
        recordId: val("bpRecord"),
        agFrom: String(val("bpAgFrom")).trim(),
        agTo: String(val("bpAgTo")).trim(),
        type: val("bpType"),
        price: val("bpPrice"),
        amount: String(val("bpAmount")).trim(),
        rep: String(val("bpRep")).trim()
    };
}

/* السعر الجديد لوكالة حسب الخيار: فترة، أو مبلغ محدد */
function bulkPriceChange(agency, o) {
    if (o.price === "custom") {
        if (!o.amount || number(o.amount) <= 0) return null;
        return {
            agency: number(o.amount),
            representative: o.rep !== "" ? number(o.rep) : number(agency.representativeBase),
            priceMonth: agency.appliedPrices ? agency.appliedPrices.priceMonth : null,
            pricePeriod: agency.pricePeriod || "",
            customPrice: number(o.amount),
            customRepresentative: o.rep !== "" ? number(o.rep) : null
        };
    }
    if (!o.price) return null;
    const p = getPricingForType(agency.type, o.price === "base" ? "0000-01-01" : o.price);
    return {
        agency: number(p.agency),
        representative: number(p.representative),
        priceMonth: p.priceMonth || null,
        pricePeriod: o.price,
        customPrice: 0,
        customRepresentative: null
    };
}

function collectBulkPrice(o) {
    const items = [];
    const inRange = function (n) {
        const v = number(n);
        return (o.agFrom === "" || v >= number(o.agFrom)) && (o.agTo === "" || v <= number(o.agTo));
    };
    records.forEach(function (record) {
        const day = getRecordDay(record);
        if (o.scope === "record") {
            if (!o.recordId || String(record.id) !== o.recordId) return;
        } else {
            if (!o.from && !o.to) return;
            if ((o.from && day < o.from) || (o.to && day > o.to)) return;
        }
        (record.agencies || []).forEach(function (agency) {
            if (!agency || agency.status === "cancelled") return;
            if (o.type && agency.type !== o.type) return;
            if (o.scope === "record" && !inRange(agency.number)) return;
            const change = bulkPriceChange(agency, o);
            if (!change) return;
            const same = number(change.agency) === number(agency.basePrice) &&
                number(change.representative) === number(agency.representativeBase) &&
                (change.pricePeriod || "") === (agency.pricePeriod || "") &&
                number(change.customPrice) === number(agency.customPrice);
            if (same) return;
            items.push({ record: record, agency: agency, day: day, change: change });
        });
    });
    return items;
}

/* تطبيق تغيير سعر على وكالة محفوظة مع حفظ قيمها السابقة للتراجع (مشترك مع إعادة التسعير) */
function applyAgencyPriceChange(agency, change, batch, at) {
    const applied = agency.appliedPrices || {};
    if (!Array.isArray(agency.priceHistory)) agency.priceHistory = [];
    agency.priceHistory.push({
        batch: batch,
        at: at,
        basePrice: number(agency.basePrice),
        representativeBase: number(agency.representativeBase),
        representativeAmount: number(agency.representativeAmount),
        hadApplied: !!agency.appliedPrices,
        appliedAgency: applied.agency,
        appliedRepresentative: applied.representative,
        priceMonth: applied.priceMonth === undefined ? null : applied.priceMonth,
        pricePeriod: agency.pricePeriod === undefined ? null : agency.pricePeriod,
        customPrice: agency.customPrice === undefined ? null : agency.customPrice,
        customRepresentative: agency.customRepresentative === undefined ? null : agency.customRepresentative
    });
    const dR = number(change.representative) - number(agency.representativeBase);
    agency.basePrice = number(change.agency);
    agency.representativeBase = number(change.representative);
    agency.representativeAmount = number(agency.representativeAmount) + dR;
    agency.appliedPrices = Object.assign({}, applied, {
        agency: agency.basePrice,
        representative: agency.representativeBase,
        priceMonth: change.priceMonth || null
    });
    if ("pricePeriod" in change) {
        if (change.pricePeriod) agency.pricePeriod = change.pricePeriod; else delete agency.pricePeriod;
    }
    if ("customPrice" in change) {
        if (number(change.customPrice) > 0) agency.customPrice = number(change.customPrice); else delete agency.customPrice;
        if (change.customRepresentative !== null && change.customRepresentative !== undefined) agency.customRepresentative = number(change.customRepresentative);
        else delete agency.customRepresentative;
    }
}

function bulkPriceRecordOptions() {
    return records.slice().sort(function (a, b) {
        return getRecordDay(b).localeCompare(getRecordDay(a)) || String(b.recordNumber).localeCompare(String(a.recordNumber), undefined, { numeric: true });
    }).map(function (r) {
        return '<option value="' + escapeHTML(r.id) + '">' + escapeHTML(r.recordNumber) + " — " + escapeHTML(r.officeName || "") +
            " — " + escapeHTML(formatDay(getRecordDay(r))) + " (" + (r.agencies || []).length + " وكالة)</option>";
    }).join("");
}

/* بناء نموذج البطاقة (مرة واحدة)، ثم تحديث القوائم والمعاينة */
function renderBulkPrice() {
    const box = document.getElementById("bulkPriceBox");
    if (!box) return;

    if (!box.dataset.ready) {
        box.dataset.ready = "1";
        box.innerHTML =
            '<p class="field-hint">اختر الوكالات ثم السعر الجديد. يتغير سعر الوكالة وحصة الفرع (والمطلوب من المندوب بنفس الفرق) فقط، وتُحسب حصتا الإسعاف والتعاون من السعر الجديد. البنود والإضافات والطوابع والبدل لا تتغير.</p>' +
            '<div class="bp-grid">' +
                '<label class="input-group"><span>الوكالات</span><select id="bpScope"><option value="date">حسب تاريخ السجل</option><option value="record">من سجل محدد (من وكالة إلى وكالة)</option></select></label>' +
                '<label class="input-group bp-date"><span>من تاريخ</span><input type="date" id="bpFrom" lang="en-GB" dir="ltr"></label>' +
                '<label class="input-group bp-date"><span>إلى تاريخ</span><input type="date" id="bpTo" lang="en-GB" dir="ltr"></label>' +
                '<label class="input-group bp-record"><span>السجل</span><select id="bpRecord"></select></label>' +
                '<label class="input-group bp-record"><span>من وكالة رقم</span><input type="text" inputmode="numeric" data-num="int" id="bpAgFrom" placeholder="الأولى"></label>' +
                '<label class="input-group bp-record"><span>إلى وكالة رقم</span><input type="text" inputmode="numeric" data-num="int" id="bpAgTo" placeholder="الأخيرة"></label>' +
                '<label class="input-group"><span>نوع الوكالة</span><select id="bpType"><option value="">كل الأنواع</option>' +
                    Object.keys(AGENCY_NAMES).map(function (t) { return '<option value="' + t + '">' + AGENCY_NAMES[t] + "</option>"; }).join("") + "</select></label>" +
                '<label class="input-group"><span>السعر الجديد</span><select id="bpPrice"></select></label>' +
                '<label class="input-group bp-custom"><span>سعر الوكالة</span><input type="text" inputmode="numeric" data-num="int" id="bpAmount" placeholder="مثلاً 1800"></label>' +
                '<label class="input-group bp-custom"><span>حصة الفرع (اختياري)</span><input type="text" inputmode="numeric" data-num="int" id="bpRep" placeholder="بدون تغيير"></label>' +
            "</div>" +
            '<div id="bpPreview" aria-live="polite"></div>';
    }

    /* قوائم تتغير مع السجلات والجداول */
    const recSel = document.getElementById("bpRecord");
    const keepRec = recSel.value;
    recSel.innerHTML = bulkPriceRecordOptions();
    if (keepRec && Array.prototype.some.call(recSel.options, function (op) { return op.value === keepRec; })) recSel.value = keepRec;

    const priceSel = document.getElementById("bpPrice");
    const keepPrice = priceSel.value;
    priceSel.innerHTML = '<option value="">— اختر —</option>' +
        pricePeriodChoices().map(function (c) { return '<option value="' + c.value + '">سعر فترة ' + escapeHTML(c.label) + "</option>"; }).join("") +
        '<option value="custom">مبلغ محدد…</option>';
    if (keepPrice && Array.prototype.some.call(priceSel.options, function (op) { return op.value === keepPrice; })) priceSel.value = keepPrice;

    renderBulkPricePreview();
}

function renderBulkPricePreview() {
    const box = document.getElementById("bpPreview");
    if (!box) return;
    const o = bulkPriceOptions();
    document.getElementById("bulkPriceBox").dataset.scope = o.scope;
    document.getElementById("bulkPriceBox").classList.toggle("is-custom", o.price === "custom");

    const last = lastRepriceBatch();
    const undoBtn = last
        ? '<button type="button" class="secondary-btn" data-bp="undo"><i class="ti ti-arrow-back-up"></i> تراجع عن آخر تغيير أسعار (' + escapeHTML(formatDay(String(last.at).slice(0, 10))) + ")</button>"
        : "";

    if (!o.price || (o.price === "custom" && !(number(o.amount) > 0)) || (o.scope === "date" && !o.from && !o.to) || (o.scope === "record" && !o.recordId)) {
        box.innerHTML = '<p class="field-hint">' + (o.scope === "date" ? "حدد تاريخاً واحداً على الأقل" : "اختر السجل") + " والسعر الجديد لتظهر المعاينة.</p>" +
            (undoBtn ? '<div class="button-row">' + undoBtn + "</div>" : "");
        return;
    }

    const items = collectBulkPrice(o);
    if (!items.length) {
        box.innerHTML = '<p class="field-hint"><i class="ti ti-circle-check"></i> لا توجد وكالات تحتاج تغييراً بهذه الاختيارات (الملغاة لا تُحتسب).</p>' +
            (undoBtn ? '<div class="button-row">' + undoBtn + "</div>" : "");
        return;
    }

    const groups = {};
    const recs = new Set();
    let ambB = 0, ambA = 0, coopB = 0, coopA = 0, dPrice = 0;
    items.forEach(function (it) {
        recs.add(it.record.id);
        const key = it.agency.type + "|" + number(it.agency.basePrice) + "|" + number(it.change.agency) + "|" + number(it.agency.representativeBase) + "|" + number(it.change.representative);
        if (!groups[key]) groups[key] = { type: it.agency.type, from: number(it.agency.basePrice), to: number(it.change.agency), repFrom: number(it.agency.representativeBase), repTo: number(it.change.representative), count: 0 };
        groups[key].count++;
        const before = getAgencyCommittee(it.agency, it.day);
        const sim = Object.assign({}, it.agency, { basePrice: it.change.agency });
        if (it.change.pricePeriod) sim.pricePeriod = it.change.pricePeriod; else delete sim.pricePeriod;
        if (number(it.change.customPrice) > 0) sim.customPrice = it.change.customPrice; else delete sim.customPrice;
        const after = getAgencyCommittee(sim, it.day);
        ambB += before.ambulance; ambA += after.ambulance; coopB += before.cooperation; coopA += after.cooperation;
        dPrice += number(it.change.agency) - number(it.agency.basePrice);
    });

    box.innerHTML =
        '<p class="field-hint"><b>' + items.length + " وكالة في " + recs.size + " سجل</b> سيتغير سعرها:</p>" +
        '<div class="table-wrapper"><table class="schedule-table"><thead><tr><th>النوع</th><th class="num">الوكالات</th><th class="num">سعر الوكالة</th><th class="num">حصة الفرع</th></tr></thead><tbody>' +
        Object.keys(groups).map(function (k) {
            const g = groups[k];
            return "<tr><td>" + agencyTypeDot(g.type) + escapeHTML(AGENCY_NAMES[g.type] || g.type) + '</td><td class="num">' + g.count + "</td>" +
                '<td class="num">' + money(g.from) + " ← <b>" + money(g.to) + "</b></td>" +
                '<td class="num">' + money(g.repFrom) + " ← <b>" + money(g.repTo) + "</b></td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<div class="reprice-totals">' +
            "<span>فرق أسعار الوكالات: <b>" + money(dPrice) + "</b></span>" +
            "<span>لجنة الإسعاف: " + money(ambB) + " ← <b>" + money(ambA) + "</b></span>" +
            "<span>لجنة التعاون: " + money(coopB) + " ← <b>" + money(coopA) + "</b></span>" +
        "</div>" +
        '<div class="button-row"><button type="button" class="primary-btn" data-bp="apply"><i class="ti ti-check"></i> تنزيل نسخة احتياطية ثم تطبيق السعر على ' + items.length + " وكالة</button>" + undoBtn + "</div>";
}

function applyBulkPrice() {
    if (!currentUser || currentUser.role !== "manager") {
        notify("هذه العملية للمدير فقط.", "error");
        return;
    }
    if (recordsLoadFailed) {
        notify("تعذر قراءة السجلات عند فتح الصفحة، لذلك أُوقف الحفظ حمايةً للبيانات. حدّث الصفحة.", "error");
        return;
    }
    const o = bulkPriceOptions();
    const items = collectBulkPrice(o);
    if (!items.length) { renderBulkPricePreview(); return; }

    try { downloadBackup(); } catch (e) {}

    appConfirm({
        title: "تغيير سعر " + items.length + " وكالة",
        message: "نُزّلت نسخة احتياطية الآن — تأكد أنها حُفظت على جهازك. يتغير سعر الوكالة وحصة الفرع لهذه الوكالات فقط، ويمكنك التراجع لاحقاً. متابعة؟",
        confirmText: "تطبيق السعر",
        cancelText: "إلغاء"
    }).then(function (ok) {
        if (!ok) return;
        const before = JSON.stringify(records);
        const batch = "bulk-" + Date.now();
        const at = new Date().toISOString();
        const touched = new Set();
        items.forEach(function (it) {
            applyAgencyPriceChange(it.agency, it.change, batch, at);
            touched.add(it.record);
        });
        /* السجل تغيّر الآن (لحسم المزامنة بين الأجهزة لصالح هذا التعديل) */
        touched.forEach(function (r) { r.updatedAt = at; });
        persistRecords().then(function () {
            refreshAfterReprice();
            notify("<strong>تغيّر سعر " + items.length + " وكالة</strong><span>حصص اللجنتين محسوبة من السعر الجديد.</span>", "success", 7000, true);
        }, function (error) {
            records = JSON.parse(before);
            refreshAfterReprice();
            notify("<strong>لم يُحفظ تغيير الأسعار</strong><span>" + escapeHTML(error && error.message || error) + "</span>", "error", 10000, true);
        });
    });
}

/* «input» يكفي (القوائم والتواريخ تطلقه أيضاً). لا نعيد العرض عند «change»: ترك خانة نصية
   بالضغط على «تطبيق» يطلقه، فيُستبدل الزر تحت المؤشر ولا تصل النقرة. */
document.getElementById("bulkPriceBox")?.addEventListener("input", function (event) {
    if (event.target.matches("input, select")) renderBulkPricePreview();
});
document.getElementById("bulkPriceBox")?.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-bp]");
    if (!btn) return;
    if (btn.dataset.bp === "apply") applyBulkPrice();
    else if (btn.dataset.bp === "undo") undoRecordReprice();
});

renderBulkPrice();

/* =========================================================
أسعار الإضافات
========================================================= */

function renderAdditionPrices() {

const container =
    document.getElementById(
        "additionPricesContainer"
    );


if (!container) {
    return;
}


container.innerHTML =
    Object.keys(
        ADDITION_NAMES
    )
    .filter(
        function (key) {

            return key !==
                "transport";

        }
    )
    .map(
        function (key) {

            return `

                <div
                    class="price-row"
                    style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"
                >

                    <label>
                        ${ADDITION_NAMES[key]}
                    </label>

                    <input
                        type="text" inputmode="numeric" data-num="int" autocomplete="off"
                        min="0"
                        data-addition-price-key="${key}"
                        value="${additionPrices[key]}"
                    >


                    <label
                        style="display:flex;align-items:center;gap:5px;"
                    >

                        <input
                            type="checkbox"
                            data-addition-stamp-key="${key}"
                            ${
                                additionStampStatus[key]
                                    ? "checked"
                                    : ""
                            }
                        >

                        طابع مرافعة

                    </label>

                </div>

            `;

        }
    )
    .join("");

}

/* =========================================================
أسعار الطوابع
========================================================= */

function renderStampPrices() {

const container =
    document.getElementById(
        "stampPricesContainer"
    );


if (!container) {
    return;
}


container.innerHTML = `

    <div class="price-row">

        <label>
            سعر طابع المرافعة
        </label>

        <input
            type="text" inputmode="numeric" data-num="int" autocomplete="off"
            min="0"
            data-stamp-price-key="pleading"
            value="${stampPrices.pleading}"
        >

    </div>


    <div class="price-row">

        <label>
            سعر طابع الإسعاف
        </label>

        <input
            type="text" inputmode="numeric" data-num="int" autocomplete="off"
            min="0"
            data-stamp-price-key="ambulance"
            value="${stampPrices.ambulance}"
        >

    </div>


    <div class="price-row">

        <label>
            سعر طابع المعونة
        </label>

        <input
            type="text" inputmode="numeric" data-num="int" autocomplete="off"
            min="0"
            data-stamp-price-key="aid"
            value="${stampPrices.aid}"
        >

    </div>

`;

}

/* =========================================================
أسعار بدل الانتقال
========================================================= */

function renderTransportPrices() {

const container =
    document.getElementById(
        "specialPricesContainer"
    );


if (!container) {
    return;
}


container.innerHTML = `

    <div class="price-row">

        <label>
            القيمة الكاملة لبدل الانتقال (تضاف إلى قيمة الوكالة)
        </label>

        <input
            type="text" inputmode="numeric" data-num="int" autocomplete="off"
            min="0"
            id="globalTransportTotal"
            value="${number(transportSettings.total)}"
        >

    </div>


    <div class="price-row">

        <label>
            يتضمن بدل الانتقال طابع مرافعة
        </label>

        <input
            type="checkbox"
            id="globalTransportPleading"
            ${
                transportSettings.pleadingStamp
                    ? "checked"
                    : ""
            }
        >

    </div>


    <div class="price-row">

        <label>
            حصة المندوب من بدل الانتقال (لا تُطلب منه)
        </label>

        <input
            type="text" inputmode="numeric" data-num="int" autocomplete="off"
            min="0"
            id="globalTransportShare"
            value="${transportSettings.representativeShare}"
        >

    </div>


    <div class="price-row">

        <label>
            المطلوب من المندوب عن بدل الانتقال (حصة الفرع) — يُحسب تلقائياً
        </label>

        <strong id="globalTransportCashPreview" class="computed-value"></strong>

    </div>

`;

const refreshTransportCash = function () {
    const out = document.getElementById("globalTransportCashPreview");
    const stampInput = document.querySelector('[data-stamp-price-key="pleading"]');
    if (!out) return;
    const total = number(document.getElementById("globalTransportTotal")?.value);
    const share = number(document.getElementById("globalTransportShare")?.value);
    const pleading = !!document.getElementById("globalTransportPleading")?.checked;
    const stamp = number(stampInput ? stampInput.value : stampPrices.pleading);
    const cash = computeTransportCash(total, share, pleading, stamp);
    out.innerHTML = money(cash) + "<small>" + money(total) + " − (حصة المندوب " + money(share) +
        (pleading ? " + طابع مرافعة " + money(stamp) : "") + ")</small>";
};

["globalTransportTotal", "globalTransportShare", "globalTransportPleading"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("input", refreshTransportCash);
    document.getElementById(id)?.addEventListener("change", refreshTransportCash);
});

document.querySelector('[data-stamp-price-key="pleading"]')?.addEventListener("input", refreshTransportCash);

refreshTransportCash();

renderCommitteePrices();

}

/* =========================================================
أسعار حصص اللجان
========================================================= */

/*
    لكل نوع وكالة ولكل لجنة: مبلغ بالليرة ونسبة من سعر الوكالة، مترابطان.
    تعديل المبلغ يحسب النسبة، وتعديل النسبة يحسب المبلغ، وتغيير سعر
    الوكالة في الأعلى يحدّث المبالغ مع بقاء النسبة.
    المحفوظ هو النسبة (data-rate بدقة كاملة).
*/
function renderCommitteePrices() {

    const container = document.getElementById("committeePricesContainer");

    if (!container) {
        return;
    }

    const cell = function (type, field, label) {
        const rate = number((committeeRates[type] || {})[field]);
        const price = number(prices[type] && prices[type].agency);
        return '<td><div class="rate-pair" data-committee-type="' + type + '" data-committee-field="' + field + '" data-rate="' + rate + '">' +
            '<label class="rate-input"><input type="text" inputmode="numeric" data-num="int" autocomplete="off" class="committee-amount" aria-label="' + label + " — " + AGENCY_NAMES[type] + ' بالليرة" value="' + committeeAmount(price, rate) + '"><span>ل.س</span></label>' +
            '<label class="rate-input"><input type="text" inputmode="decimal" data-num="dec" autocomplete="off" class="committee-rate" aria-label="' + label + " — " + AGENCY_NAMES[type] + ' نسبة مئوية" value="' + Number(rate.toFixed(3)) + '"><span>%</span></label>' +
            "</div></td>";
    };

    container.innerHTML =
        '<p class="field-hint">حصة كل لجنة = سعر الوكالة × النسبة. اكتب المبلغ أو النسبة وسيُحسب الآخر تلقائياً. النسبة هي المعتمدة، فإذا تغيّر سعر الوكالة تتغير الحصة معه.</p>' +
        '<div class="table-wrapper"><table class="committee-price-table"><thead><tr>' +
        '<th>نوع الوكالة</th><th class="num">سعر الوكالة</th><th>لجنة الإسعاف</th><th>لجنة التعاون</th>' +
        "</tr></thead><tbody>" +
        Object.keys(AGENCY_NAMES).map(function (type) {
            return '<tr data-committee-row="' + type + '"><td>' + agencyTypeDot(type) + AGENCY_NAMES[type] + "</td>" +
                '<td class="num committee-price-cell">' + money(prices[type] ? prices[type].agency : 0) + "</td>" +
                cell(type, "ambulance", "لجنة الإسعاف") +
                cell(type, "cooperation", "لجنة التعاون") +
                "</tr>";
        }).join("") +
        "</tbody></table></div>";

    /* سعر الوكالة كما هو مكتوب الآن في جدول أسعار الوكالات */
    const livePrice = function (type) {
        const input = document.querySelector('[data-price-key="' + type + '"][data-price-type="agency"]');
        return input ? number(input.value) : number(prices[type] && prices[type].agency);
    };

    if (!container.dataset.bound) container.addEventListener("input", function (event) {

        const pair = event.target.closest(".rate-pair");

        if (!pair) {
            return;
        }

        const price = livePrice(pair.dataset.committeeType);
        const amountInput = pair.querySelector(".committee-amount");
        const rateInput = pair.querySelector(".committee-rate");

        if (event.target === amountInput) {
            const rate = price > 0 ? (number(amountInput.value) / price) * 100 : 0;
            pair.dataset.rate = rate;
            rateInput.value = Number(rate.toFixed(3));
        } else if (event.target === rateInput) {
            pair.dataset.rate = number(rateInput.value);
            amountInput.value = committeeAmount(price, rateInput.value);
        }
    });

    container.dataset.bound = "1";

    /* تغيير سعر الوكالة يحدّث مبالغ اللجان مع بقاء النسب */
    document.querySelectorAll('[data-price-type="agency"]').forEach(function (input) {
        input.addEventListener("input", function () {
            const type = input.dataset.priceKey;
            const row = container.querySelector('[data-committee-row="' + type + '"]');
            if (!row) return;
            row.querySelector(".committee-price-cell").textContent = money(number(input.value));
            row.querySelectorAll(".rate-pair").forEach(function (pair) {
                pair.querySelector(".committee-amount").value = committeeAmount(number(input.value), pair.dataset.rate);
            });
        });
    });
}

/* =========================================================
حفظ الأسعار
========================================================= */

const savePricesBtn =
document.getElementById(
"savePricesBtn"
);

if (savePricesBtn) {

savePricesBtn.addEventListener(
    "click",
    function () {

        if (
            !currentUser ||
            currentUser.role !==
            "manager"
        ) {

            notify("هذه العملية للمدير فقط.", "error");

            return;

        }


        /*
            أسعار الوكالات + المبلغ المطلوب
        */

        document
            .querySelectorAll(
                "[data-price-key]"
            )
            .forEach(
                function (input) {

                    const key =
                        input.dataset
                            .priceKey;


                    const type =
                        input.dataset
                            .priceType;


                    if (
                        !prices[key]
                    ) {

                        prices[key] = {

                            agency:
                                0,

                            representative:
                                300

                        };

                    }


                    if (
                        type ===
                        "agency"
                    ) {

                        prices[key].agency =
                            number(
                                input.value
                            );

                    }


                    if (
                        type ===
                        "representative"
                    ) {

                        prices[key].representative =
                            number(
                                input.value
                            );

                    }

                }
            );


        /*
            أسعار الإضافات
        */

        document
            .querySelectorAll(
                "[data-addition-price-key]"
            )
            .forEach(
                function (input) {

                    const key =
                        input.dataset
                            .additionPriceKey;


                    additionPrices[key] =
                        number(
                            input.value
                        );

                }
            );


        /*
            هل الإضافة طابع مرافعة؟
        */

        document
            .querySelectorAll(
                "[data-addition-stamp-key]"
            )
            .forEach(
                function (input) {

                    const key =
                        input.dataset
                            .additionStampKey;


                    additionStampStatus[key] =
                        input.checked;

                }
            );


        /*
            أسعار الطوابع
        */

        document
            .querySelectorAll(
                "[data-stamp-price-key]"
            )
            .forEach(
                function (input) {

                    const key =
                        input.dataset
                            .stampPriceKey;


                    stampPrices[key] =
                        number(
                            input.value
                        );

                }
            );


        /*
            بدل الانتقال
        */

        const globalTransportPleading =
            document.getElementById(
                "globalTransportPleading"
            );


        const globalTransportShare =
            document.getElementById(
                "globalTransportShare"
            );


        const globalTransportTotal =
            document.getElementById(
                "globalTransportTotal"
            );


        if (globalTransportTotal) {

            transportSettings.total =
                number(
                    globalTransportTotal.value
                );

        }


        if (globalTransportPleading) {

            transportSettings.pleadingStamp =
                globalTransportPleading.checked;

        }


        if (globalTransportShare) {

            transportSettings.representativeShare =
                number(
                    globalTransportShare.value
                );

        }


        transportSettings.cashRemainder =
            computeTransportCash(
                transportSettings.total,
                transportSettings.representativeShare,
                transportSettings.pleadingStamp,
                stampPrices.pleading
            );


        /*
            حصص لجنتي الإسعاف والتعاون
        */

        document
            .querySelectorAll(
                ".rate-pair[data-committee-type]"
            )
            .forEach(
                function (pair) {

                    const type = pair.dataset.committeeType;
                    const field = pair.dataset.committeeField;

                    if (!committeeRates[type]) {
                        committeeRates[type] = { ambulance: 0, cooperation: 0 };
                    }

                    committeeRates[type][field] = number(pair.dataset.rate);

                }
            );

        /* المبالغ الثابتة المقابلة تبقى محدّثة للتوافق */
        syncCommitteeSharesFromRates();

        saveData(
            COMMITTEE_RATES_KEY,
            committeeRates
        );

        saveData(
            "audit_committee_shares",
            committeeShares
        );


        saveData(
            "audit_prices",
            prices
        );


        saveData(
            "audit_addition_prices",
            additionPrices
        );


        saveData(
            "audit_addition_stamp_status",
            additionStampStatus
        );


        saveData(
            "audit_stamp_prices",
            stampPrices
        );


        saveData(
            "audit_transport_settings",
            transportSettings
        );


        ensureAgencyPriceControls();

        loadCurrentAgencyPrices();

        updatePreview();

        renderPrices();

        renderReports();

        // الاحتفاظ بتسجيل الدخول والصفحة الحالية بعد إعادة التحميل
        const savedUserForReload = JSON.stringify(currentUser);
        localStorage.setItem("currentUser", savedUserForReload);
        sessionStorage.setItem("currentUser", savedUserForReload);
        localStorage.setItem("activeSection", "pricesSection");
        sessionStorage.setItem("activeSection", "pricesSection");

        flashNotify("تم حفظ جميع الأسعار والإعدادات بنجاح.", "success");

        window.location.reload();

    }
);

}

/* =========================================================
المستخدمون
========================================================= */

function renderUsers() {

if (
    !currentUser ||
    currentUser.role !==
    "manager"
) {

    return;

}


const tbody =
    document.getElementById(
        "usersTableBody"
    );


if (!tbody) {
    return;
}


tbody.innerHTML =
    users
        .map(
            function (user) {

                return `

                    <tr>

                        <td>
                            ${escapeHTML(
                                user.username
                            )}
                        </td>

                        <td>
                            ${getRoleName(
                                user.role
                            )}
                        </td>

                        <td>

                            ${
                                user.username ===
                                "admin"

                                    ? "الحساب الأساسي"

                                    : `

                                        <button
                                            type="button"
                                            class="danger-btn"
                                            onclick="
                                                deleteUser(
                                                    '${user.id}'
                                                )
                                            "
                                        >
                                            حذف
                                        </button>

                                      `
                            }

                        </td>

                    </tr>

                `;

            }
        )
        .join("");

}

/* =========================================================
إضافة مستخدم
========================================================= */

const addUserBtn =
document.getElementById(
"addUserBtn"
);

if (addUserBtn) {

addUserBtn.addEventListener(
    "click",
    function () {

        if (
            !currentUser ||
            currentUser.role !==
            "manager"
        ) {

            return;

        }


        const username =
            document.getElementById(
                "newUsername"
            ).value.trim();


        const password =
            document.getElementById(
                "newPassword"
            ).value.trim();


        const role =
            document.getElementById(
                "newRole"
            ).value;


        if (
            !username ||
            !password
        ) {

            notify("يرجى إدخال اسم المستخدم وكلمة المرور.", "error");

            return;

        }


        const exists =
            users.some(
                function (user) {

                    return (
                        user.username
                            .toLowerCase() ===
                        username
                            .toLowerCase()
                    );

                }
            );


        if (exists) {

            notify("اسم المستخدم موجود مسبقًا.", "error");

            return;

        }


        users.push({

            id:
                generateId(),

            username:
                username,

            password:
                password,

            role:
                role

        });


        saveData(
            "audit_users",
            users
        );


        document.getElementById(
            "newUsername"
        ).value = "";


        document.getElementById(
            "newPassword"
        ).value = "";


        renderUsers();


        notify("تمت إضافة المستخدم.", "success");

    }
);

}

/* =========================================================
حذف مستخدم
========================================================= */

function deleteUser(id) {

if (
    !currentUser ||
    currentUser.role !==
    "manager"
) {

    return;

}


const user =
    users.find(
        function (item) {

            return (
                item.id ===
                id
            );

        }
    );


if (!user) {
    return;
}


if (
    user.username ===
    "admin"
) {

    notify("لا يمكن حذف المدير الأساسي.", "error");

    return;

}


appConfirm({
    title: "حذف المستخدم",
    message: "هل تريد حذف المستخدم «" + user.username + "»؟ لن يتمكن من الدخول بعد ذلك.",
    confirmText: "حذف المستخدم",
    cancelText: "إلغاء",
    danger: true
}).then(function (ok) {

    if (!ok) {
        return;
    }

    users =
        users.filter(
            function (item) {

                return (
                    item.id !==
                    id
                );

            }
        );


    saveData(
        "audit_users",
        users
    );


    renderUsers();

    notify("تم حذف المستخدم.", "info");
});

}

window.deleteUser =
deleteUser;

/* =========================================================
البحث
========================================================= */

const recordSearch =
document.getElementById(
"recordSearch"
);

if (recordSearch) {

/* البحث يعمل مع الفلترة والترتيب (ويقبل الأرقام العربية) */
recordSearch.addEventListener(
    "input",
    function () {
        renderRecords();
    }
);

}

/* =========================================================
إلغاء التعديل
========================================================= */

const cancelEditBtn =
document.getElementById(
"cancelEditBtn"
);

if (cancelEditBtn) {

cancelEditBtn.addEventListener(
    "click",
    function () {

        resetRecordForm();

        switchSection(
            "recordsSection"
        );

    }
);

}

/* =========================================================
Dashboard
========================================================= */

/* =========================================================
نشاط الفترة (لوحة التحكم)
إحصائيات حسب «تاريخ السجل» لفترة مختارة، مع المقارنة بالفترة
السابقة المساوية لها، ومخطط أعمدة للوكالات المدخلة.
========================================================= */

let activityPeriod = "month";
let activityAsTable = false;

try {
    activityPeriod = localStorage.getItem("audit_ui_activity_period") || "month";
} catch (e) {}

function dayStr(d) {
    return toDayString(d);
}

/* «YYYY-MM-DD» إلى تاريخ محلي (بدون انزياح المنطقة الزمنية) */
function parseDay(s) {
    const p = String(s).split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
}

/* حدود الفترة الحالية والسابقة المساوية لها (أيام بصيغة YYYY-MM-DD) */
function activityRanges(period) {

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let from, to, prevFrom, prevTo, bucket;

    if (period === "lastMonth") {
        from = new Date(y, m - 1, 1); to = new Date(y, m, 0);
        prevFrom = new Date(y, m - 2, 1); prevTo = new Date(y, m - 1, 0);
        bucket = "day";
    } else if (period === "quarter") {
        from = new Date(y, m - 2, 1); to = now;
        prevFrom = new Date(y, m - 5, 1); prevTo = new Date(y, m - 2, 0);
        bucket = "month";
    } else if (period === "year") {
        from = new Date(y, 0, 1); to = now;
        prevFrom = new Date(y - 1, 0, 1); prevTo = new Date(y - 1, m, now.getDate());
        bucket = "month";
    } else if (period === "all") {
        const days = records.map(getRecordDay).filter(Boolean).sort();
        from = days.length ? parseDay(days[0]) : now; to = now;
        prevFrom = null; prevTo = null;
        bucket = "month";
    } else {
        from = new Date(y, m, 1); to = now;
        prevFrom = new Date(y, m - 1, 1); prevTo = new Date(y, m - 1, Math.min(now.getDate(), new Date(y, m, 0).getDate()));
        bucket = "day";
    }

    return {
        from: dayStr(from), to: dayStr(to),
        prevFrom: prevFrom ? dayStr(prevFrom) : null, prevTo: prevTo ? dayStr(prevTo) : null,
        bucket: bucket
    };
}

function activityTotals(from, to) {

    const t = { records: 0, agencies: 0, grand: 0, due: 0, transport: 0 };

    records.forEach(function (record) {
        const day = getRecordDay(record);
        if (!day || day < from || day > to) return;
        t.records += 1;
        (record.agencies || []).forEach(function (a) {
            if (a.status === "cancelled") return;
            t.agencies += 1;
            t.grand += getAgencyGrandTotal(a);
            t.due += number(a.representativeAmount);
            t.transport += getAgencyTransport(a).count;
        });
    });

    return t;
}

function deltaHTML(current, previous) {
    if (previous === null || previous === undefined) return "";
    if (!previous) {
        return current ? '<span class="delta delta-up">جديد مقارنة بالفترة السابقة</span>' : '<span class="delta">لا تغيير</span>';
    }
    const pct = ((current - previous) / previous) * 100;
    const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
    const cls = pct > 0 ? "delta-up" : pct < 0 ? "delta-down" : "";
    const icon = pct > 0 ? "ti-trending-up" : pct < 0 ? "ti-trending-down" : "ti-minus";
    return '<span class="delta ' + cls + '"><i class="ti ' + icon + '" aria-hidden="true"></i>' +
        sign + new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 1 }).format(Math.abs(pct)) + "% عن الفترة السابقة</span>";
}

/* سلاسل الأعمدة: يوم بيوم للشهر، أو شهر بشهر للفترات الأطول */
function activitySeries(range) {

    const buckets = [];
    const index = {};
    const start = parseDay(range.from);
    const end = parseDay(range.to);

    if (range.bucket === "day") {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = dayStr(d);
            index[key] = buckets.length;
            buckets.push({ key: key, label: String(d.getDate()), full: formatDay(key), value: 0 });
        }
    } else {
        for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
            const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
            index[key] = buckets.length;
            const name = d.toLocaleDateString(NUMBER_LOCALE, { month: "short" });
            buckets.push({ key: key, label: name, full: d.toLocaleDateString(NUMBER_LOCALE, { month: "long", year: "numeric" }), value: 0 });
        }
    }

    records.forEach(function (record) {
        const day = getRecordDay(record);
        if (!day || day < range.from || day > range.to) return;
        const key = range.bucket === "day" ? day : day.slice(0, 7);
        if (index[key] === undefined) return;
        buckets[index[key]].value += (record.agencies || []).filter(function (a) { return a.status !== "cancelled"; }).length;
    });

    return buckets;
}

/* تقريب أعلى المحور إلى رقم نظيف */
function niceMax(v) {
    if (v <= 4) return 4;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
}

function activityChartHTML(series) {

    if (!series.length || series.every(function (b) { return b.value === 0; })) {
        return '<p class="empty-hint activity-empty">لا توجد وكالات مدخلة في هذه الفترة. أنشئ سجلاً بتاريخ ضمنها ليظهر هنا.</p>';
    }

    if (activityAsTable) {
        return '<div class="table-wrapper"><table class="ledger-table"><thead><tr><th>الفترة</th><th class="num">الوكالات</th></tr></thead><tbody>' +
            series.filter(function (b) { return b.value > 0; }).map(function (b) {
                return "<tr><td>" + escapeHTML(b.full) + '</td><td class="num">' + b.value + "</td></tr>";
            }).join("") + "</tbody></table></div>";
    }

    const max = niceMax(Math.max.apply(null, series.map(function (b) { return b.value; })));
    const W = 760, H = 220, padL = 8, padR = 34, padT = 12, padB = 26;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const slot = plotW / series.length;
    const barW = Math.min(24, Math.max(4, slot - 4));
    const ticks = [0, max / 2, max];
    const labelEvery = series.length > 16 ? Math.ceil(series.length / 10) : 1;

    let svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="activity-svg" direction="ltr" role="img" aria-label="الوكالات المدخلة في الفترة">';

    ticks.forEach(function (t) {
        const y = padT + plotH - (t / max) * plotH;
        svg += '<line class="grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '"/>' +
            '<text class="tick" x="' + (W - padR + 8) + '" y="' + (y + 4) + '" text-anchor="start">' + Math.round(t) + "</text>";
    });

    /* الأعمدة من اليمين إلى اليسار مع اتجاه القراءة العربي */
    series.forEach(function (b, i) {
        const cx = W - padR - slot * (i + 0.5);
        const h = (b.value / max) * plotH;
        const x = cx - barW / 2;
        const y = padT + plotH - h;
        const r = Math.min(4, barW / 2, h);
        if (b.value > 0) {
            svg += '<path class="bar" d="M' + x + " " + (padT + plotH) + " V" + (y + r) + " Q" + x + " " + y + " " + (x + r) + " " + y +
                " H" + (x + barW - r) + " Q" + (x + barW) + " " + y + " " + (x + barW) + " " + (y + r) + " V" + (padT + plotH) + ' Z"/>';
        }
        /* منطقة لمس أكبر من العمود */
        svg += '<rect class="hit" x="' + (cx - slot / 2) + '" y="' + padT + '" width="' + slot + '" height="' + plotH + '" tabindex="0" data-i="' + i + '"/>';
        if (i % labelEvery === 0) {
            svg += '<text class="xlabel" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + escapeHTML(b.label) + "</text>";
        }
    });

    svg += '<line class="baseline" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '"/>';
    svg += "</svg>";

    return '<div class="activity-plot">' + svg + '<div class="chart-tip" role="status" aria-live="polite"></div></div>';
}

function renderActivity() {

    const tiles = document.getElementById("activityTiles");
    const chart = document.getElementById("activityChart");

    if (!tiles || !chart) {
        return;
    }

    const range = activityRanges(activityPeriod);
    const cur = activityTotals(range.from, range.to);
    const prev = range.prevFrom ? activityTotals(range.prevFrom, range.prevTo) : null;

    document.querySelectorAll("#activityPeriods [data-period]").forEach(function (b) {
        const on = b.dataset.period === activityPeriod;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
    });

    const rangeEl = document.getElementById("activityRange");
    if (rangeEl) {
        rangeEl.textContent = "من " + formatDay(range.from) + " إلى " + formatDay(range.to) + " (حسب تاريخ السجل)";
    }

    const tile = function (label, value, previous, isMoney) {
        return '<div class="a-tile"><span>' + label + "</span><strong>" + (isMoney ? money(value) : value) + "</strong>" +
            deltaHTML(value, previous) + "</div>";
    };

    tiles.innerHTML =
        tile("السجلات", cur.records, prev && prev.records) +
        tile("الوكالات غير الملغاة", cur.agencies, prev && prev.agencies) +
        tile("بدلات الانتقال", cur.transport, prev && prev.transport) +
        tile("إجمالي مبالغ السجلات", cur.grand, prev && prev.grand, true) +
        tile("المطلوب من المندوبين", cur.due, prev && prev.due, true);

    const series = activitySeries(range);
    chart.innerHTML = activityChartHTML(series);

    const title = document.getElementById("activityChartTitle");
    if (title) {
        title.textContent = range.bucket === "day" ? "الوكالات المدخلة يوماً بيوم" : "الوكالات المدخلة شهراً بشهر";
    }

    /* تلميح الأعمدة بالمرور أو بلوحة المفاتيح */
    const plot = chart.querySelector(".activity-plot");
    if (plot) {
        const tip = plot.querySelector(".chart-tip");
        const show = function (el) {
            const b = series[number(el.dataset.i)];
            if (!b) return;
            tip.textContent = "";
            const v = document.createElement("strong");
            v.textContent = b.value + " وكالة";
            const l = document.createElement("span");
            l.textContent = b.full;
            tip.appendChild(v);
            tip.appendChild(l);
            const pr = plot.getBoundingClientRect();
            const er = el.getBoundingClientRect();
            tip.style.left = Math.min(Math.max(0, er.left - pr.left + er.width / 2 - 60), pr.width - 120) + "px";
            tip.classList.add("show");
            plot.querySelectorAll(".hit").forEach(function (h) { h.classList.toggle("is-hover", h === el); });
        };
        const hide = function () {
            tip.classList.remove("show");
            plot.querySelectorAll(".hit").forEach(function (h) { h.classList.remove("is-hover"); });
        };
        plot.querySelectorAll(".hit").forEach(function (h) {
            h.addEventListener("pointerenter", function () { show(h); });
            h.addEventListener("focus", function () { show(h); });
            h.addEventListener("blur", hide);
        });
        plot.addEventListener("pointerleave", hide);
    }
}

document.getElementById("activityPeriods")?.addEventListener("click", function (event) {
    const b = event.target.closest("[data-period]");
    if (!b) return;
    activityPeriod = b.dataset.period;
    try { localStorage.setItem("audit_ui_activity_period", activityPeriod); } catch (e) {}
    renderActivity();
});

document.getElementById("activityTableToggle")?.addEventListener("click", function () {
    activityAsTable = !activityAsTable;
    this.textContent = activityAsTable ? "عرض كمخطط" : "عرض كجدول";
    this.setAttribute("aria-pressed", activityAsTable ? "true" : "false");
    renderActivity();
});

function updateDashboard() {

    renderActivity();

    const agencies = [];

    records.forEach(function (record) {
        (record.agencies || []).forEach(function (agency) {
            agencies.push(agency);
        });
    });

    const cancelled = agencies.filter(function (a) { return a.status === "cancelled"; }).length;
    const missingCount = agencies.filter(function (a) { return a.status === "missing"; }).length;
    const activeCount = agencies.length - cancelled - missingCount;

    const representativeTotal = agencies.reduce(function (sum, agency) {
        return sum + number(agency.representativeAmount);
    }, 0);

    const setText = function (id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText("totalRecords", records.length);
    setText("totalAgencies", agencies.length);
    setText("activeAgencies", activeCount);
    setText("cancelledAgencies", cancelled);
    setText("missingAgencies", missingCount);
    setText("totalRepresentativeAmount", money(representativeTotal));
    setText(
        "dashDueNote",
        records.length
            ? "مجموع " + records.length + " سجل و " + agencies.length + " وكالة"
            : "لم يُسجَّل أي سجل بعد"
    );

    try {
        setText(
            "dashDate",
            new Date().toLocaleDateString(NUMBER_LOCALE, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        );
    } catch (e) {}

    /* حالة الوكالات: شريط نسب */
    const statusBox = document.getElementById("dashStatus");

    if (statusBox) {
        if (agencies.length === 0) {
            statusBox.innerHTML = '<p class="empty-hint">ستظهر هنا نسب الوكالات الفعالة والملغاة والمفقودة بعد حفظ أول سجل.</p>';
        } else {
            const parts = [
                { cls: "seg-active", label: "فعالة", value: activeCount },
                { cls: "seg-missing", label: "مفقودة", value: missingCount },
                { cls: "seg-cancelled", label: "ملغاة", value: cancelled }
            ];
            statusBox.innerHTML =
                '<div class="status-bar">' +
                parts.map(function (p) {
                    const pct = (p.value / agencies.length) * 100;
                    return pct > 0 ? '<span class="' + p.cls + '" style="width:' + pct + '%"></span>' : "";
                }).join("") +
                "</div>" +
                '<ul class="status-legend">' +
                parts.map(function (p) {
                    const pct = Math.round((p.value / agencies.length) * 100);
                    return '<li><i class="' + p.cls + '"></i>' + p.label + "<strong>" + p.value + "</strong><small>" + pct + "%</small></li>";
                }).join("") +
                "</ul>";
        }
    }

    /* الوكالات حسب النوع */
    const typesBox = document.getElementById("dashTypes");

    if (typesBox) {
        const counts = {};
        Object.keys(AGENCY_NAMES).forEach(function (t) { counts[t] = 0; });
        agencies.forEach(function (a) {
            if (a.status === "cancelled") return;
            counts[a.type] = (counts[a.type] || 0) + 1;
        });
        const max = Math.max.apply(null, Object.values(counts).concat([1]));
        const total = Object.values(counts).reduce(function (s, v) { return s + v; }, 0);

        typesBox.innerHTML = total === 0
            ? '<p class="empty-hint">لا توجد وكالات فعالة بعد.</p>'
            : '<div class="type-bars">' +
              Object.keys(counts).map(function (t) {
                  return '<div class="type-bar"><span class="type-name">' + escapeHTML(AGENCY_NAMES[t] || t) +
                      '</span><span class="type-track"><span style="width:' + (counts[t] / max) * 100 + '%"></span></span><strong>' +
                      counts[t] + "</strong></div>";
              }).join("") +
              "</div>";
    }

    /* أعلى المندوبين استحقاقاً */
    const repsBox = document.getElementById("dashReps");

    if (repsBox) {
        const map = {};
        records.forEach(function (record) {
            const name = (record.representativeName || "-").trim() || "-";
            if (!map[name]) map[name] = { name: name, total: 0, records: 0 };
            map[name].total += getRecordRepresentativeTotal(record);
            map[name].records += 1;
        });
        const reps = Object.values(map).sort(function (a, b) { return b.total - a.total; }).slice(0, 5);

        repsBox.innerHTML = reps.length === 0
            ? '<p class="empty-hint">لا يوجد مندوبون بعد.</p>'
            : '<ol class="rep-list">' +
              reps.map(function (r) {
                  return "<li><span><strong>" + escapeHTML(r.name) + "</strong><small>" + r.records + " سجل</small></span><b>" + money(r.total) + "</b></li>";
              }).join("") +
              "</ol>";
    }

    /* آخر السجلات */
    const container = document.getElementById("latestRecords");

    if (!container) {
        return;
    }

    const latest = records.slice().reverse().slice(0, 5);

    if (latest.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><p>لا توجد سجلات محفوظة.</p>' +
            '<button type="button" class="primary-btn" onclick="switchSection(\'newRecordSection\')">إنشاء أول سجل</button></div>';
        return;
    }

    container.innerHTML =
        '<div class="table-wrapper"><table class="ledger-table"><thead><tr>' +
        "<th>السجل</th><th>المكتب</th><th>المندوب</th><th class=\"num\">الوكالات</th><th class=\"num\">المطلوب</th><th></th>" +
        "</tr></thead><tbody>" +
        latest.map(function (record) {
            return "<tr>" +
                '<td><span class="record-tag">' + escapeHTML(record.recordNumber) + "</span></td>" +
                "<td>" + escapeHTML(record.officeName) + "</td>" +
                "<td>" + escapeHTML(record.representativeName) + "</td>" +
                '<td class="num">' + (record.agencies || []).length + "</td>" +
                '<td class="num money-cell">' + money(getRecordRepresentativeTotal(record)) + "</td>" +
                '<td><button type="button" class="link-btn" onclick="showFinalRecordReport(\'' + record.id + '\', \'summary\')">التقرير</button></td>' +
                "</tr>";
        }).join("") +
        "</tbody></table></div>";

}

/* =========================================================
تحضير وكالة جديدة
========================================================= */

function prepareNewAgency() {

ensureAgencyPriceControls();

const numberInput =
    document.getElementById(
        "agencyNumber"
    );


/*
    لا نغير الرقم أثناء تعديل وكالة.
*/

const editingId =
    document.getElementById(
        "editingRecordId"
    )?.value;


if (
    !editingId &&
    numberInput
) {

    numberInput.value =
        getNextAgencyNumber();

}


const recordDateInput =
    document.getElementById(
        "recordDate"
    );

if (recordDateInput && !recordDateInput.value) {

    recordDateInput.value =
        todayDay();

}


loadCurrentAgencyPrices();

updatePreview();

}

/* =========================================================
تحديث كل شيء
========================================================= */

function updateAll() {

if (!currentUser) {
    return;
}


ensureAgencyPriceControls();

renderRecords();

updateDashboard();

renderPendingAgencies();

loadCurrentAgencyPrices();

updatePreview();

renderReports();


if (
    currentUser.role ===
    "manager"
) {

    renderPrices();

    renderUsers();

}

renderStorageInfo();

/* السجلات الكبيرة تُنقل إلى المخزن الأكبر قبل أن تمتلئ المساحة */
maybeMoveRecordsStore();

}

/* مكان حفظ السجلات وحجمها (قسم النسخ الاحتياطي) */
function renderStorageInfo() {

    const box = document.getElementById("storageInfo");

    if (!box) {
        return;
    }

    let used = 0;
    try {
        Object.keys(localStorage).forEach(function (k) {
            used += (k.length + (localStorage.getItem(k) || "").length);
        });
    } catch (e) {}

    const pct = Math.min(100, Math.round((used / 5000000) * 100));

    box.innerHTML = recordsInIDB
        ? '<i class="ti ti-database-check" aria-hidden="true"></i><span>السجلات محفوظة في <b>المخزن الكبير</b> داخل هذا المتصفح (' + records.length +
          " سجل). المساحة كافية لسنوات من العمل. استمر بتحميل نسخة احتياطية بانتظام.</span>"
        : '<i class="ti ti-database" aria-hidden="true"></i><span>السجلات محفوظة في المساحة العادية للمتصفح: مستخدم <b>' + pct +
          "%</b> منها. عند امتلائها تُنقل السجلات تلقائياً إلى مخزن أكبر.</span>";

    box.classList.toggle("is-warning", !recordsInIDB && pct >= 60);
}

onReady(function () {
    if (recordsLoadFailed) {
        notify("<strong>تعذر قراءة السجلات</strong><span>لم يتمكن المتصفح من قراءة السجلات من المخزن الكبير. لا تُدخل سجلات الآن؛ حدّث الصفحة (Ctrl + F5)، وإن استمرت المشكلة استعد آخر نسخة احتياطية.</span>", "error", 30000, true);
    }
});

/* =========================================================
DOMContentLoaded
========================================================= */

onReady(
function () {

    ensureAgencyPriceControls();


    const savedUser =
        localStorage.getItem("currentUser") ||
        sessionStorage.getItem("currentUser");


    if (savedUser) {

        try {

            currentUser =
                JSON.parse(
                    savedUser
                );


            loginPage.classList.add(
                "hidden"
            );


            appPage.classList.remove(
                "hidden"
            );


            updateProfileCard();


            applyPermissions();

            updateAll();

            const savedSection =
                localStorage.getItem("activeSection") ||
                sessionStorage.getItem("activeSection") ||
                "dashboardSection";

            switchSection(savedSection);

        } catch (error) {

            console.error(
                error
            );

            localStorage.removeItem(
                "currentUser"
            );
            sessionStorage.removeItem(
                "currentUser"
            );

        }

    }


    /*
        أول رقم وكالة يكون 1
        وبعدها 2 ثم 3 وهكذا.
    */

    const agencyNumber =
        document.getElementById(
            "agencyNumber"
        );


    const editingId =
        document.getElementById(
            "editingRecordId"
        )?.value;


    if (
        agencyNumber &&
        !editingId
    ) {

        agencyNumber.value =
            getNextAgencyNumber();

    }


    loadCurrentAgencyPrices();

    updatePreview();

}

);

/* =========================================================
إغلاق Modal عند الضغط خارجه
========================================================= */

document
.getElementById(
"recordModal"
)
?.addEventListener(
"click",
function (event) {

        if (
            event.target ===
            this
        ) {

            closeRecordModal();

        }

    }
);

/* =========================================================
النسخ الاحتياطي والاستعادة
========================================================= */

function downloadBackup() {

    const backup = {
        appName: "نظام تدقيق السجلات والوكالات",
        version: 1,
        exportedAt: new Date().toISOString(),
        users: users,
        prices: prices,
        additionPrices: additionPrices,
        additionStampStatus: additionStampStatus,
        transportSettings: transportSettings,
        stampPrices: stampPrices,
        committeeShares: committeeShares,
        committeeRates: committeeRates,
        priceSchedule: priceSchedule,
        councilSaved: councilSaved,
        records: records
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().slice(0, 10);

    const link = document.createElement("a");
    link.href = url;
    link.download = "نسخة-احتياطية-" + dateStr + ".json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    try { markBackupDone(); } catch (e) {}

    telegramAfterBackup("تحميل نسخة يدوي");

}

/* =========================================================
النسخ الاحتياطي التلقائي
- مجلد ثابت يُختار مرة واحدة (Chrome / Edge على الكمبيوتر):
  بعد كل حفظ سجل تُكتب فيه نسخة اليوم (ملف واحد لكل يوم يُحدَّث).
- بدون مجلد أو في متصفح لا يدعمه: تنزيل تلقائي مرة كل يوم.
- تنبيه عند مغادرة الموقع إذا تغيّرت البيانات بعد آخر نسخة.
مقبض المجلد يُحفظ في قاعدة منفصلة (audit_ui_db) بعيداً عن السجلات،
وحالة النسخ تفضيل واجهة (audit_ui_backup_state) وليست بيانات.
========================================================= */

const BACKUP_STATE_KEY = "audit_ui_backup_state";
const UI_DB_NAME = "audit_ui_db";
const UI_DB_STORE = "handles";
const BACKUP_FOLDER_SUPPORTED = typeof window.showDirectoryPicker === "function";

function loadBackupState() {
    try {
        return Object.assign({ lastBackupAt: "", lastChangeAt: "", lastAutoDownloadDay: "", folderName: "" },
            JSON.parse(localStorage.getItem(BACKUP_STATE_KEY) || "{}"));
    } catch (e) {
        return { lastBackupAt: "", lastChangeAt: "", lastAutoDownloadDay: "", folderName: "" };
    }
}

let backupState = loadBackupState();

function saveBackupState() {
    try { localStorage.setItem(BACKUP_STATE_KEY, JSON.stringify(backupState)); } catch (e) {}
    renderBackupStatus();
}

/* تغيّرت البيانات (سجل، أسعار، مستخدمون…) ولم تُنسخ بعد */
function markDataChanged() {
    backupState.lastChangeAt = new Date().toISOString();
    saveBackupState();
}

function markBackupDone(extra) {
    backupState.lastBackupAt = new Date().toISOString();
    Object.assign(backupState, extra || {});
    saveBackupState();
}

function hasUnbackedChanges() {
    return !!backupState.lastChangeAt && (!backupState.lastBackupAt || backupState.lastChangeAt > backupState.lastBackupAt);
}

/* نفس محتوى «تحميل نسخة احتياطية» تماماً (version: 1) */
function buildBackupJSON() {
    return JSON.stringify({
        appName: "نظام تدقيق السجلات والوكالات",
        version: 1,
        exportedAt: new Date().toISOString(),
        users: users,
        prices: prices,
        additionPrices: additionPrices,
        additionStampStatus: additionStampStatus,
        transportSettings: transportSettings,
        stampPrices: stampPrices,
        committeeShares: committeeShares,
        committeeRates: committeeRates,
        priceSchedule: priceSchedule,
        councilSaved: councilSaved,
        records: records
    }, null, 2);
}

/* ---------- مقبض المجلد في قاعدة الواجهة ---------- */

function uiDb() {
    return new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB غير متاح"));
            return;
        }
        const req = indexedDB.open(UI_DB_NAME, 1);
        req.onupgradeneeded = function () {
            req.result.createObjectStore(UI_DB_STORE);
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
    });
}

function uiDbGet(key) {
    return uiDb().then(function (db) {
        return new Promise(function (resolve, reject) {
            const req = db.transaction(UI_DB_STORE, "readonly").objectStore(UI_DB_STORE).get(key);
            req.onsuccess = function () { resolve(req.result || null); };
            req.onerror = function () { reject(req.error); };
        });
    });
}

function uiDbPut(key, value) {
    return uiDb().then(function (db) {
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(UI_DB_STORE, "readwrite");
            tx.objectStore(UI_DB_STORE).put(value, key);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
        });
    });
}

let backupFolderHandle = null;

function loadBackupFolder() {
    if (!BACKUP_FOLDER_SUPPORTED) return Promise.resolve(null);
    return uiDbGet("backupFolder").then(function (handle) {
        backupFolderHandle = handle;
        return handle;
    }).catch(function () { return null; });
}

/* اختيار المجلد: يفتح على سطح المكتب أول مرة، ثم على آخر مجلد مختار */
function chooseBackupFolder() {

    if (!BACKUP_FOLDER_SUPPORTED) {
        notify("<strong>اختيار المجلد غير مدعوم في هذا المتصفح</strong><span>استخدم Chrome أو Edge على الكمبيوتر. حتى ذلك الحين تُنزَّل نسخة احتياطية تلقائياً مرة كل يوم.</span>", "warning", 8000, true);
        return Promise.resolve(false);
    }

    return window.showDirectoryPicker({ id: "audit-backups", mode: "readwrite", startIn: backupFolderHandle || "desktop" })
        .then(function (handle) {
            backupFolderHandle = handle;
            backupState.folderName = handle.name;
            saveBackupState();
            return uiDbPut("backupFolder", handle).then(function () {
                notify("<strong>مجلد النسخ الاحتياطية: " + escapeHTML(handle.name) + "</strong><span>ستُحفظ فيه نسخة تلقائياً بعد كل سجل.</span>", "success", 5000, true);
                return writeBackupToFolder(true);
            });
        })
        .catch(function (error) {
            if (error && error.name === "AbortError") return false;
            notify("تعذر اختيار المجلد: " + escapeHTML(error && error.message || error), "error");
            return false;
        });
}

window.chooseBackupFolder = chooseBackupFolder;

/* صلاحية الكتابة: interactive = يمكن سؤال المستخدم (بعد ضغطة زر) */
function ensureFolderPermission(interactive) {
    if (!backupFolderHandle) return Promise.resolve(false);
    const opts = { mode: "readwrite" };
    return backupFolderHandle.queryPermission(opts).then(function (state) {
        if (state === "granted") return true;
        if (!interactive) return false;
        return backupFolderHandle.requestPermission(opts).then(function (s) { return s === "granted"; });
    }).catch(function () { return false; });
}

function backupFileName() {
    return "نسخة-احتياطية-" + todayDay() + ".json";
}

/* كتابة نسخة اليوم في المجلد (تحلّ محل نسخة اليوم السابقة: الأحدث تحوي كل شيء) */
function writeBackupToFolder(interactive) {
    return ensureFolderPermission(interactive).then(function (ok) {
        if (!ok) return false;
        const name = backupFileName();
        return backupFolderHandle.getFileHandle(name, { create: true })
            .then(function (file) { return file.createWritable(); })
            .then(function (stream) {
                return stream.write(buildBackupJSON()).then(function () { return stream.close(); });
            })
            .then(function () {
                markBackupDone({ lastBackupFile: name, folderName: backupFolderHandle.name });
                return true;
            });
    });
}

/* تنزيل عادي (بدون مجلد): يحسب كنسخة */
function downloadBackupFile(auto) {
    const blob = new Blob([buildBackupJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    markBackupDone(auto ? { lastAutoDownloadDay: todayDay() } : null);
}

/* بعد حفظ كل سجل: نسخة تلقائية + تذكير */
function autoBackupAfterSave() {

    const done = function () {
        notify("<strong>حُفظ السجل ونُسخ احتياطياً</strong><span>النسخة في مجلد «" + escapeHTML(backupState.folderName || "") + "» — " + escapeHTML(backupFileName()) + "</span>", "success", 3500, true);
    };

    const remind = function (text) {
        notify("<strong>حُفظ السجل — تذكير بالنسخة الاحتياطية</strong><span>" + text + "</span>" +
            '<span class="toast-actions">' +
                (BACKUP_FOLDER_SUPPORTED ? '<button type="button" class="act-btn" onclick="backupNow()">' + (backupFolderHandle ? "السماح والنسخ الآن" : "اختيار مجلد النسخ") + "</button>" : "") +
                '<button type="button" class="act-btn" onclick="downloadBackupFile(false)">تنزيل نسخة الآن</button>' +
            "</span>", "warning", 12000, true);
    };

    const fallback = function () {
        /* لا مجلد أو لا صلاحية: تنزيل تلقائي مرة يومياً حتى لا تضيع البيانات إن نُسي النسخ */
        if (backupState.lastAutoDownloadDay !== todayDay()) {
            try {
                downloadBackupFile(true);
                notify("<strong>حُفظ السجل ونُزّلت نسخة احتياطية تلقائياً</strong><span>" + escapeHTML(backupFileName()) + " في مجلد التنزيلات. " +
                    (BACKUP_FOLDER_SUPPORTED ? "اختر مجلداً ثابتاً من «النسخ الاحتياطي» لتُحفظ النسخ فيه مباشرة بعد كل سجل." : "") + "</span>", "info", 9000, true);
                return;
            } catch (e) {}
        }
        remind(backupFolderHandle
            ? "يحتاج المتصفح إذنك للكتابة في مجلد «" + escapeHTML(backupState.folderName || "") + "»."
            : "لم يُختر مجلد للنسخ الاحتياطية بعد. آخر نسخة: " + escapeHTML(backupAgeText()) + ".");
    };

    /* تليجرام (إن كان مُعدّاً) يعمل مع المجلد أو بدونه */
    const telegram = telegramAfterBackup("حفظ سجل");

    if (!backupFolderHandle) {
        if (!telegramReady()) {
            fallback();
            return Promise.resolve(false);
        }
        /* بدون مجلد (الهاتف مثلاً): نسخة تليجرام تكفي، وإن فشلت نرجع للتنزيل اليومي */
        return telegram.then(function (ok) {
            if (ok) {
                notify("<strong>حُفظ السجل ورُفعت نسخة احتياطية إلى تليجرام</strong><span>" + escapeHTML(telegramSettings.chatTitle || "") + "</span>", "success", 3500, true);
            } else {
                fallback();
            }
            return ok;
        });
    }

    /* الضغط على «حفظ السجل» يسمح للمتصفح بسؤال الإذن إن لزم */
    return writeBackupToFolder(true).then(function (ok) {
        if (ok) done(); else fallback();
        return ok;
    }).catch(function (error) {
        console.error("Auto backup failed:", error);
        fallback();
        return false;
    });
}

/* زر «نسخ الآن» في القائمة الجانبية والتذكيرات */
function backupNow() {
    telegramAfterBackup("نسخ يدوي");
    if (BACKUP_FOLDER_SUPPORTED && !backupFolderHandle) {
        return chooseBackupFolder();
    }
    if (backupFolderHandle) {
        return writeBackupToFolder(true).then(function (ok) {
            if (ok) {
                notify("<strong>تم النسخ الاحتياطي</strong><span>" + escapeHTML(backupFileName()) + " في مجلد «" + escapeHTML(backupState.folderName || "") + "»</span>", "success", 4000, true);
            } else {
                downloadBackupFile(false);
            }
            return ok;
        }).catch(function (error) {
            notify("تعذر الكتابة في المجلد: " + escapeHTML(error && error.message || error) + " — نُزّلت النسخة بدلاً من ذلك.", "warning");
            downloadBackupFile(false);
        });
    }
    downloadBackupFile(false);
    return Promise.resolve(true);
}

window.backupNow = backupNow;
window.downloadBackupFile = downloadBackupFile;

function backupAgeText() {
    if (!backupState.lastBackupAt) return "لم تُؤخذ نسخة بعد";
    const mins = Math.round((Date.now() - new Date(backupState.lastBackupAt).getTime()) / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return "قبل " + mins + " دقيقة";
    const hours = Math.round(mins / 60);
    if (hours < 24) return "قبل " + hours + " ساعة";
    return "قبل " + Math.round(hours / 24) + " يوم";
}

function renderBackupStatus() {

    const pending = hasUnbackedChanges();
    const btn = document.getElementById("backupStatus");
    const text = document.getElementById("backupStatusText");

    if (btn) {
        btn.classList.toggle("is-pending", pending);
        btn.title = pending ? "توجد تغييرات بعد آخر نسخة — اضغط للنسخ الآن" : "اضغط لأخذ نسخة احتياطية الآن";
    }
    if (text) {
        text.textContent = (pending ? "تغييرات غير منسوخة · " : "") + "آخر نسخة: " + backupAgeText();
    }

    const folder = document.getElementById("backupFolderName");
    if (folder) {
        folder.textContent = !BACKUP_FOLDER_SUPPORTED
            ? "غير مدعوم في هذا المتصفح (تنزيل تلقائي مرة يومياً)"
            : (backupState.folderName || "لم يُختر بعد");
    }
    const chooseBtn = document.getElementById("chooseBackupFolderBtn");
    if (chooseBtn) {
        chooseBtn.hidden = !BACKUP_FOLDER_SUPPORTED;
        chooseBtn.innerHTML = '<i class="ti ti-folder" aria-hidden="true"></i> ' + (backupState.folderName ? "تغيير المجلد" : "اختيار المجلد");
    }
}

document.getElementById("chooseBackupFolderBtn")?.addEventListener("click", chooseBackupFolder);

/* عند المغادرة: تنبيه المتصفح إذا وُجدت تغييرات لم تُنسخ */
window.addEventListener("beforeunload", function (event) {
    if (!currentUser || !hasUnbackedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
});

/* عند إخفاء الصفحة (إغلاق التبويب أو الانتقال لغيره): محاولة نسخ صامتة إن كان الإذن ممنوحاً */
document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden" && currentUser && backupFolderHandle && hasUnbackedChanges()) {
        writeBackupToFolder(false).catch(function () {});
    }
});

onReady(function () {
    loadBackupFolder().then(renderBackupStatus);
    renderBackupStatus();
    setInterval(renderBackupStatus, 60000);
});


/* =========================================================
النسخ الاحتياطي إلى تليجرام
- بعد كل نسخة احتياطية (حفظ سجل، «نسخ الآن»، «تحميل نسخة») يرفع المتصفح
  نفس محتوى النسخة (version: 1) مضغوطاً ‎.json.gz إلى محادثة بوت أو قناة خاصة.
- رسالة جديدة لكل نسخة (بدون صوت إشعار) فيبقى تاريخ كامل للنسخ.
- الرمز (token) ومعرّف المحادثة تفضيل واجهة لكل جهاز (audit_ui_telegram)،
  لا يدخلان في ملف النسخة ولا في المستودع.
- إن فشل الرفع (لا إنترنت…) يُعاد تلقائياً عند عودة الاتصال أو فتح الموقع.
========================================================= */

const TELEGRAM_KEY = "audit_ui_telegram";
const TELEGRAM_API = "https://api.telegram.org/bot";

function loadTelegramSettings() {
    const base = { enabled: false, token: "", chatId: "", chatTitle: "", botName: "", lastSentAt: "", lastError: "", pending: false };
    try {
        return Object.assign(base, JSON.parse(localStorage.getItem(TELEGRAM_KEY) || "{}"));
    } catch (e) {
        return base;
    }
}

let telegramSettings = loadTelegramSettings();

function saveTelegramSettings() {
    try { localStorage.setItem(TELEGRAM_KEY, JSON.stringify(telegramSettings)); } catch (e) {}
    fillTelegramForm();
    renderTelegramStatus();
}

function telegramReady() {
    return !!(telegramSettings.enabled && telegramSettings.token && telegramSettings.chatId);
}

function telegramApi(method, body, token) {
    return fetch(TELEGRAM_API + (token || telegramSettings.token) + "/" + method, { method: "POST", body: body })
        .then(function (response) {
            return response.json().catch(function () { return { ok: false, description: "HTTP " + response.status }; });
        })
        .then(function (json) {
            if (!json.ok) throw new Error(telegramErrorText(json));
            return json.result;
        }, function (error) {
            if (error && error.name === "TypeError") throw new Error("لا يوجد اتصال بتليجرام (الإنترنت مقطوع أو تليجرام محجوب)");
            throw error;
        });
}

function telegramErrorText(json) {
    const d = String(json.description || "");
    if (json.error_code === 401 || /Unauthorized/i.test(d)) return "رمز البوت غير صحيح";
    if (/chat not found/i.test(d)) return "المحادثة غير موجودة — أرسل /start للبوت أو أضفه مشرفاً في القناة";
    if (/bot was blocked/i.test(d)) return "البوت محظور من حسابك — ألغِ الحظر وأرسل /start";
    if (/not enough rights|need administrator/i.test(d)) return "البوت ليس مشرفاً في القناة أو لا يملك صلاحية النشر";
    if (/too big/i.test(d)) return "الملف أكبر من حد تليجرام (50 ميغابايت)";
    return d || "خطأ غير معروف";
}

function gzipText(text) {
    if (typeof CompressionStream !== "function") return Promise.resolve(null);
    return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).blob()
        .catch(function () { return null; });
}

function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function telegramCaption(reason, size) {
    const now = new Date();
    const agencies = records.reduce(function (sum, r) { return sum + ((r && r.agencies) || []).length; }, 0);
    return "📦 نسخة احتياطية — نظام تدقيق السجلات والوكالات\n" +
        "🗓 " + todayDay() + " " + now.toLocaleTimeString(NUMBER_LOCALE, { hour: "2-digit", minute: "2-digit" }) + "\n" +
        "📁 " + records.length.toLocaleString(NUMBER_LOCALE) + " سجل · " + agencies.toLocaleString(NUMBER_LOCALE) + " وكالة\n" +
        "💾 " + formatFileSize(size) +
        (reason ? "\n📝 " + reason : "") +
        (currentUser && currentUser.username ? "\n👤 " + currentUser.username : "");
}

function sendTelegramNow(reason) {
    const json = buildBackupJSON();
    const startedAt = new Date().toISOString();
    const stamp = todayDay() + "-" + new Date().toTimeString().slice(0, 5).replace(":", "-");
    return gzipText(json).then(function (gz) {
        const file = gz
            ? new File([gz], "نسخة-احتياطية-" + stamp + ".json.gz", { type: "application/gzip" })
            : new File([json], "نسخة-احتياطية-" + stamp + ".json", { type: "application/json" });
        const form = new FormData();
        form.append("chat_id", telegramSettings.chatId);
        form.append("document", file);
        form.append("caption", telegramCaption(reason, file.size));
        form.append("disable_notification", "true");
        return telegramApi("sendDocument", form);
    }).then(function () {
        Object.assign(telegramSettings, { lastSentAt: new Date().toISOString(), lastError: "", pending: false });
        saveTelegramSettings();
        /* نسخة خارج الجهاز: تُحسب نسخة احتياطية (إن لم تتغير البيانات أثناء الرفع) */
        if (!backupState.lastChangeAt || backupState.lastChangeAt <= startedAt) markBackupDone({ lastTelegramAt: telegramSettings.lastSentAt });
        return true;
    }).catch(function (error) {
        console.error("Telegram backup failed:", error);
        Object.assign(telegramSettings, { lastError: String(error && error.message || error), pending: true });
        saveTelegramSettings();
        return false;
    });
}

/* رفع واحد في كل مرة؛ ما يُطلب أثناء الرفع يُدمج في رفع واحد بعده (بأحدث البيانات) */
let telegramInFlight = null;
let telegramQueued = null;

function startTelegramSend(reason) {
    telegramInFlight = sendTelegramNow(reason).finally(function () { telegramInFlight = null; });
    return telegramInFlight;
}

function sendBackupToTelegram(reason) {
    if (!telegramReady() || recordsLoadFailed) return Promise.resolve(false);
    if (telegramInFlight) {
        if (!telegramQueued) {
            telegramQueued = telegramInFlight.then(function () {
                telegramQueued = null;
                return startTelegramSend(reason);
            });
        }
        return telegramQueued;
    }
    return startTelegramSend(reason);
}

/* بعد نسخة: رسالة فقط عند الفشل (النجاح يظهر في حالة النسخ) */
function telegramAfterBackup(reason) {
    if (!telegramReady()) return Promise.resolve(false);
    return sendBackupToTelegram(reason).then(function (ok) {
        if (!ok) notifyTelegramFailure();
        return ok;
    });
}

function notifyTelegramFailure() {
    notify("<strong>تعذّر رفع النسخة إلى تليجرام</strong><span>" + escapeHTML(telegramSettings.lastError) +
        " — ستُعاد المحاولة تلقائياً عند عودة الاتصال.</span>" +
        '<span class="toast-actions"><button type="button" class="act-btn" onclick="retryTelegramBackup()">إعادة المحاولة الآن</button></span>',
        "warning", 10000, true);
}

function retryTelegramBackup() {
    return sendBackupToTelegram("إعادة محاولة").then(function (ok) {
        if (ok) notify("<strong>رُفعت النسخة إلى تليجرام</strong><span>" + escapeHTML(telegramSettings.chatTitle || telegramSettings.chatId) + "</span>", "success", 4000, true);
        else notifyTelegramFailure();
    });
}

window.retryTelegramBackup = retryTelegramBackup;

/* ---------- الإعداد في قسم المستخدمين ---------- */

function readTelegramForm() {
    const token = (document.getElementById("tgToken")?.value || "").trim();
    const chatId = (document.getElementById("tgChatId")?.value || "").trim();
    return { token: token, chatId: chatId };
}

/* يقرأ آخر رسالة وصلت للبوت (في الخاص أو منشور في قناة) ليعرف معرّف المحادثة */
function detectTelegramChat() {
    const form = readTelegramForm();
    if (!/^\d+:[\w-]{20,}$/.test(form.token)) {
        notify("الصق رمز البوت كما أعطاه BotFather (أرقام ثم : ثم حروف).", "warning");
        return Promise.resolve(false);
    }
    return telegramApi("getMe", null, form.token).then(function (bot) {
        telegramSettings.token = form.token;
        telegramSettings.botName = bot.username || bot.first_name || "";
        return telegramApi("getUpdates", null, form.token);
    }).then(function (updates) {
        /* كل المحادثات التي راسلت البوت (الأحدث أولاً): قد يكون بينها غريب عرف اسم البوت */
        const chats = [];
        (updates || []).slice().reverse().forEach(function (u) {
            const m = u.message || u.channel_post || u.my_chat_member || u.edited_message || u.edited_channel_post;
            if (m && m.chat && !chats.some(function (c) { return c.id === m.chat.id; })) chats.push(m.chat);
        });
        if (!chats.length) {
            saveTelegramSettings();
            notify("<strong>البوت @" + escapeHTML(telegramSettings.botName) + " يعمل، لكن لم تصله رسالة بعد</strong>" +
                "<span>افتح البوت في تليجرام واضغط Start (أو انشر أي رسالة في القناة بعد إضافته مشرفاً)، ثم اضغط «اكتشاف المحادثة» مرة أخرى.</span>",
                "warning", 12000, true);
            return false;
        }
        saveTelegramSettings();
        /* تأكيد صريح: لا يُحفظ معرّف محادثة قبل أن يختار المستخدم أنها محادثته */
        return appChoose({
            title: "إلى من تُرسل النسخ الاحتياطية؟",
            message: chats.length === 1
                ? "وُجدت محادثة واحدة مع البوت \u2066@" + telegramSettings.botName + "\u2069. تأكد أنها حسابك أو قناتك قبل الحفظ — النسخ تحوي كل السجلات وكلمات المرور."
                : "راسل البوت \u2066@" + telegramSettings.botName + "\u2069 أكثر من حساب. اختر حسابك أو قناتك فقط — لا تختر اسماً لا تعرفه.",
            /* أكثر من حساب: لا يُبرز أي اختيار حتى لا يُضغط اسم الغريب بالخطأ */
            choices: chats.slice(0, 5).map(function (chat) {
                return { value: chat, label: (chats.length === 1 ? "نعم، هذا أنا: " : "") + telegramChatLabel(chat), kind: chats.length === 1 ? "primary" : "secondary" };
            })
        }).then(function (chat) {
            if (!chat) {
                notify("لم يُحفظ أي معرّف محادثة.", "info", 4000);
                return false;
            }
            telegramSettings.chatId = String(chat.id);
            telegramSettings.chatTitle = telegramChatName(chat);
            saveTelegramSettings();
            notify("<strong>المحادثة: " + escapeHTML(telegramSettings.chatTitle || telegramSettings.chatId) + "</strong>" +
                "<span>اضغط «حفظ وإرسال تجربة» لرفع نسخة الآن.</span>", "success", 7000, true);
            return true;
        });
    }).catch(function (error) {
        notify("تعذّر الاتصال بالبوت: " + escapeHTML(error && error.message || error), "error");
        return false;
    });
}

function telegramChatName(chat) {
    return chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || String(chat.id);
}

function telegramChatLabel(chat) {
    const kind = chat.type === "channel" ? "قناة: " : (chat.type === "group" || chat.type === "supergroup") ? "مجموعة: " : "";
    return kind + telegramChatName(chat) + (chat.username ? " (\u2066@" + chat.username + "\u2069)" : "") + " — " + chat.id;
}

function saveTelegramFromForm() {
    const form = readTelegramForm();
    if (!form.token || !form.chatId) {
        notify("أدخل رمز البوت ومعرّف المحادثة (أو اضغط «اكتشاف المحادثة»).", "warning");
        return Promise.resolve(false);
    }
    if (form.chatId !== telegramSettings.chatId) telegramSettings.chatTitle = "";
    Object.assign(telegramSettings, { token: form.token, chatId: form.chatId, enabled: true });
    saveTelegramSettings();
    return sendBackupToTelegram("تجربة الإعداد").then(function (ok) {
        if (ok) {
            notify("<strong>رُفعت نسخة تجريبية إلى تليجرام ✓</strong><span>من الآن تُرفع نسخة بعد كل حفظ سجل.</span>", "success", 6000, true);
        } else {
            notifyTelegramFailure();
        }
        return ok;
    });
}

function toggleTelegram(on) {
    telegramSettings.enabled = !!on;
    saveTelegramSettings();
}

function fillTelegramForm() {
    const token = document.getElementById("tgToken");
    const chat = document.getElementById("tgChatId");
    const toggle = document.getElementById("tgEnabled");
    if (token && document.activeElement !== token) token.value = telegramSettings.token;
    if (chat && document.activeElement !== chat) chat.value = telegramSettings.chatId;
    if (toggle) toggle.checked = !!telegramSettings.enabled;
}

function renderTelegramStatus() {
    const el = document.getElementById("tgStatus");
    if (!el) return;
    let text, cls;
    if (!telegramSettings.token || !telegramSettings.chatId) {
        text = "غير مُعدّ بعد";
        cls = "";
    } else if (!telegramSettings.enabled) {
        text = "متوقف";
        cls = "";
    } else if (telegramSettings.lastError) {
        text = "آخر محاولة فشلت: " + telegramSettings.lastError;
        cls = "is-error";
    } else {
        text = "يعمل" + (telegramSettings.chatTitle ? " — " + telegramSettings.chatTitle : "") +
            (telegramSettings.lastSentAt ? " · آخر رفع: " + new Date(telegramSettings.lastSentAt).toLocaleString(NUMBER_LOCALE, { dateStyle: "short", timeStyle: "short" }) : "");
        cls = "is-ok";
    }
    el.textContent = text;
    el.className = "tg-status " + cls;
}

document.getElementById("tgDetectBtn")?.addEventListener("click", detectTelegramChat);
document.getElementById("tgSaveBtn")?.addEventListener("click", saveTelegramFromForm);
document.getElementById("tgEnabled")?.addEventListener("change", function () { toggleTelegram(this.checked); });
document.getElementById("tgTokenShow")?.addEventListener("click", function () {
    const input = document.getElementById("tgToken");
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    this.setAttribute("aria-pressed", input.type === "text" ? "true" : "false");
});

/* إعادة رفع ما فشل: عند عودة الإنترنت وبعد فتح الموقع */
window.addEventListener("online", function () {
    if (telegramReady() && telegramSettings.pending && currentUser) sendBackupToTelegram("بعد عودة الاتصال");
});

onReady(function () {
    fillTelegramForm();
    renderTelegramStatus();
    if (telegramReady() && telegramSettings.pending) {
        setTimeout(function () {
            if (currentUser && !recordsLoadFailed) sendBackupToTelegram("نسخة لم تُرفع سابقاً");
        }, 5000);
    }
});

/* ملف النسخة: JSON عادي، أو مضغوط gzip (نسخ تليجرام ‎.json.gz) */
function readBackupFileText(file) {
    return file.slice(0, 2).arrayBuffer().then(function (head) {
        const bytes = new Uint8Array(head);
        const gzipped = bytes.length === 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
        if (!gzipped) return file.text();
        if (typeof DecompressionStream !== "function") {
            throw new Error("هذا المتصفح لا يفك الملفات المضغوطة (‎.gz). افتحها في Chrome أو Edge حديث.");
        }
        return new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text();
    });
}

function restoreBackupFromFile(file) {

    readBackupFileText(file).then(function (text) {

        let data;

        try {
            data = JSON.parse(text);
        } catch (error) {
            notify("تعذر قراءة الملف. تأكد أنه ملف نسخة احتياطية صحيح.", "error");
            return;
        }

        if (!data || !Array.isArray(data.records)) {
            notify("ملف النسخة الاحتياطية غير صالح.", "error");
            return;
        }

        appConfirm({
            title: "استعادة نسخة احتياطية",
            message: "سيتم استبدال كل البيانات الحالية (" + records.length + " سجل، الأسعار، المستخدمين) بالبيانات الموجودة في هذا الملف (" +
                data.records.length + " سجل). ننصح بتحميل نسخة احتياطية من البيانات الحالية أولاً. هل تريد المتابعة؟",
            confirmText: "استبدال البيانات",
            cancelText: "إلغاء",
            danger: true
        }).then(function (ok) {
            if (ok) {
                applyBackupData(data);
            }
        });

    }).catch(function (error) {
        notify("تعذر قراءة الملف: " + escapeHTML(error && error.message || error), "error");
    });

}

function applyBackupData(data) {

        /*
            السجلات تُحفظ أولاً (أكبر جزء، وقد تكون في المخزن الكبير)،
            وبقية الإعدادات لا تُكتب إلا بعد نجاحها.
            الاستعادة مقصودة لاستبدال السجلات، فهي تعمل حتى لو تعذرت قراءتها.
        */
        recordsLoadFailed = false;
        records = data.records || [];

        persistRecords().then(function () {
            applyBackupSettings(data);
        }).catch(function (error) {
            console.error("Restore records failed:", error);
            notify("<strong>لم تكتمل الاستعادة</strong><span>تعذر حفظ السجلات: " + escapeHTML(error && error.message || error) +
                " — لم يتغير شيء. حدّث الصفحة.</span>", "error", 15000, true);
        });
}

function applyBackupSettings(data) {

        users = data.users || users;
        prices = data.prices || prices;
        additionPrices = data.additionPrices || additionPrices;
        additionStampStatus = data.additionStampStatus || additionStampStatus;
        transportSettings = data.transportSettings || transportSettings;
        stampPrices = data.stampPrices || stampPrices;
        committeeShares = data.committeeShares || committeeShares;

        /* النسخ القديمة لا تحتوي القيمة الكاملة لبدل الانتقال:
           نحذفها ليُعاد استنتاجها من مكوناتها عند إعادة التحميل */
        if (data.transportSettings && typeof data.transportSettings.total !== "number") {
            delete transportSettings.total;
        }

        if (Array.isArray(data.councilSaved)) {
            saveData(COUNCIL_SAVED_KEY, data.councilSaved);
        }

        /* أسعار الأشهر: من الملف إن وُجدت (النسخ الأقدم لا تحتويها فتبقى كما هي) */
        if (Array.isArray(data.priceSchedule)) {
            saveData(PRICE_SCHEDULE_KEY, data.priceSchedule);
        }

        /*
            نسب اللجان: من الملف إن وُجدت، وإلا تُشتق عند إعادة التحميل
            من المبالغ الثابتة والأسعار المستعادة (النسخ الأقدم).
        */
        if (data.committeeRates && typeof data.committeeRates === "object") {
            saveData(COMMITTEE_RATES_KEY, data.committeeRates);
        } else {
            /* null = تُشتق بعد ترحيل الأسعار عند إعادة التحميل */
            saveData(COMMITTEE_RATES_KEY, null);
        }

        saveData("audit_committee_shares", committeeShares);
        saveData("audit_users", users);
        saveData("audit_prices", prices);
        saveData("audit_addition_prices", additionPrices);
        saveData("audit_addition_stamp_status", additionStampStatus);
        saveData("audit_transport_settings", transportSettings);
        saveData("audit_stamp_prices", stampPrices);

        flashNotify("تم استيراد النسخة الاحتياطية بنجاح (" + records.length + " سجل).", "success");

        location.reload();

}

const downloadBackupBtn =
document.getElementById(
"downloadBackupBtn"
);

if (downloadBackupBtn) {

    downloadBackupBtn.addEventListener(
        "click",
        downloadBackup
    );

}

const restoreBackupBtn =
document.getElementById(
"restoreBackupBtn"
);

const restoreBackupInput =
document.getElementById(
"restoreBackupInput"
);

if (restoreBackupBtn && restoreBackupInput) {

    restoreBackupBtn.addEventListener(
        "click",
        function () {
            restoreBackupInput.click();
        }
    );

    restoreBackupInput.addEventListener(
        "change",
        function () {

            const file =
                this.files &&
                this.files[0];

            if (file) {
                restoreBackupFromFile(file);
            }

            this.value = "";

        }
    );

}

/* =========================================================
المزامنة مع Firebase (استخدام الموقع من أي جهاز)
========================================================= */

/*
    البيانات المحلية (localStorage / IndexedDB) تبقى هي الأصل، وFirebase نسخة متزامنة.
    - الدخول بحساب Google؛ قواعد Firestore تسمح لحساب المالك فقط (docs/FIREBASE.md).
    - مساحة مشتركة للفرع (FB_WORKSPACE) يعمل عليها كل الحسابات المسموحة في القواعد (حسين وباسل):
      كل سجل وثيقة مستقلة: workspaces/{ws}/records/{id} = {id, json, hash, deleted, updatedAt, syncedAt}
      والإعدادات (الأسعار، الجداول، النسب، المستخدمون…) وثيقة واحدة workspaces/{ws}/meta/settings.
    - مزامنة ثلاثية: لكل سجل نحفظ بصمة آخر نسخة متزامنة على هذا الجهاز (base).
      تغيّر المحلي فقط ← يُرفع. تغيّر البعيد فقط ← يُطبَّق هنا. تغيّر الاثنان ← الأحدث يفوز
      بعد نسخة احتياطية، والحذف لا يغلب تعديلاً أبداً.
    - أول مزامنة على أي جهاز: تنزيل نسخة احتياطية أولاً.
    - حالة المزامنة تفضيل واجهة لهذا الجهاز (audit_ui_firebase)، لا تدخل في النسخ الاحتياطية.
*/

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD4EqYkOr359yOQ_VDbFadUD_Q6-jT88BM",
    authDomain: "work-1-c2965.firebaseapp.com",
    projectId: "work-1-c2965",
    storageBucket: "work-1-c2965.firebasestorage.app",
    messagingSenderId: "859204415987",
    appId: "1:859204415987:web:2bfccb5c1d56a3eccc6286"
};
const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const FB_STATE_KEY = "audit_ui_firebase";
/* المساحة المشتركة: لا تغيّرها بعد بدء المزامنة (تغييرها = مساحة فارغة جديدة) */
const FB_WORKSPACE = "idlib";

/* مفاتيح الإعدادات المتزامنة (نفس ما تحويه النسخة الاحتياطية عدا السجلات) */
const FB_SETTINGS_KEYS = [
    "audit_users", "audit_prices", "audit_addition_prices", "audit_addition_stamp_status",
    "audit_transport_settings", "audit_stamp_prices", "audit_price_schedule",
    "audit_committee_shares", "audit_committee_rates", "audit_council_share", "audit_council_saved"
];

let fbState = loadData(FB_STATE_KEY, null);
if (!fbState || typeof fbState !== "object") fbState = {};
if (!fbState.base || typeof fbState.base !== "object") fbState.base = {};

/* أول بصمة للإعدادات على هذا الجهاز: لا تُعدّ تعديلاً */
if (!fbState.settingsLocalHash) {
    try { fbState.settingsLocalHash = fbSettingsHash(fbSettingsJSON()); } catch (e) {}
}

let fbBackend = null;
let fbUser = null;
let fbSyncing = null;
let fbSyncAgain = false;
let fbTimer = null;

function saveFbState() {
    try { localStorage.setItem(FB_STATE_KEY, JSON.stringify(fbState)); } catch (e) {}
}

/* بصمة نصية قصيرة (FNV-1a) لمقارنة النسخ دون رفع كل شيء */
function fbHash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36) + "-" + text.length.toString(36);
}

/* نص ثابت للمحتوى نفسه مهما اختلف ترتيب المفاتيح (حتى لا يرى جهازان المحتوى نفسه مختلفاً) */
function fbCanonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
    if (Array.isArray(value)) return "[" + value.map(fbCanonical).join(",") + "]";
    return "{" + Object.keys(value).filter(function (k) { return value[k] !== undefined; }).sort().map(function (k) {
        return JSON.stringify(k) + ":" + fbCanonical(value[k]);
    }).join(",") + "}";
}

function fbRecordHash(record) {
    return fbHash(fbCanonical(record));
}

function fbSettingsHash(json) {
    const data = JSON.parse(json);
    const canon = {};
    Object.keys(data).forEach(function (k) {
        try { canon[k] = JSON.parse(data[k]); } catch (e) { canon[k] = data[k]; }
    });
    return fbHash(fbCanonical(canon));
}

function fbDocId(id) {
    const s = String(id);
    return /^[A-Za-z0-9_-]{1,200}$/.test(s) ? s : "x_" + fbHash(s).replace(/-/g, "_");
}

function fbSettingsJSON() {
    const out = {};
    FB_SETTINGS_KEYS.forEach(function (key) {
        let raw = null;
        try { raw = localStorage.getItem(key); } catch (e) {}
        if (raw !== null) out[key] = raw;
    });
    return JSON.stringify(out);
}

/* يُستدعى من saveData: تغيّرت الإعدادات فعلاً؟ نسجّل وقت التغيير لحسم التعارض */
function fbNoteSettingsChange(key) {
    if (FB_SETTINGS_KEYS.indexOf(key) === -1) return;
    const hash = fbSettingsHash(fbSettingsJSON());
    if (fbState.settingsLocalHash === hash) return;
    /* أول حساب على هذا الجهاز لا يُعدّ تعديلاً (إعدادات افتراضية لجهاز جديد لا تغلب البعيدة) */
    if (fbState.settingsLocalHash) fbState.settingsChangedAt = Date.now();
    fbState.settingsLocalHash = hash;
    saveFbState();
}

/* ---------- الواجهة الخلفية: Firebase الحقيقي (أو بديل للاختبار) ---------- */

function fbLoadBackend() {
    if (fbBackend) return Promise.resolve(fbBackend);
    if (window.__FB_TEST_BACKEND) {
        fbBackend = window.__FB_TEST_BACKEND;
        return Promise.resolve(fbBackend);
    }
    return Promise.all([
        import(FIREBASE_SDK + "firebase-app.js"),
        import(FIREBASE_SDK + "firebase-auth.js"),
        import(FIREBASE_SDK + "firebase-firestore.js")
    ]).then(function (mods) {
        const appMod = mods[0], authMod = mods[1], fs = mods[2];
        const app = appMod.initializeApp(FIREBASE_CONFIG);
        const auth = authMod.getAuth(app);
        const db = fs.getFirestore(app);
        /* ws = المساحة المشتركة (لا معرّف الحساب): كل الحسابات المسموحة ترى البيانات نفسها */
        const col = function (ws, name) { return fs.collection(db, "workspaces", ws, name); };
        const millis = function (ts) { return ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0; };

        fbBackend = {
            onUser: function (cb) {
                authMod.getRedirectResult(auth).catch(function () {});
                return authMod.onAuthStateChanged(auth, cb);
            },
            signIn: function () {
                const provider = new authMod.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: "select_account" });
                return authMod.signInWithPopup(auth, provider).catch(function (error) {
                    /* الهاتف أو منع النوافذ المنبثقة: الدخول بإعادة التوجيه */
                    if (error && /popup-blocked|operation-not-supported|popup-closed-by-browser/.test(error.code || "")) {
                        return authMod.signInWithRedirect(auth, provider);
                    }
                    throw error;
                });
            },
            signOut: function () { return authMod.signOut(auth); },
            pullRecords: function (uid, since) {
                const q = since
                    ? fs.query(col(uid, "records"), fs.where("syncedAt", ">", fs.Timestamp.fromMillis(since)))
                    : col(uid, "records");
                return fs.getDocs(q).then(function (snap) {
                    return snap.docs.map(function (d) {
                        const v = d.data();
                        return { id: v.id, json: v.json || "", hash: v.hash, deleted: !!v.deleted, updatedAt: v.updatedAt || "", syncedAt: millis(v.syncedAt) };
                    });
                });
            },
            getSettings: function (uid) {
                return fs.getDoc(fs.doc(db, "workspaces", uid, "meta", "settings")).then(function (d) {
                    if (!d.exists()) return null;
                    const v = d.data();
                    return { json: v.json || "", hash: v.hash, changedAt: v.changedAt || 0, records: v.records || 0, syncedAt: millis(v.syncedAt) };
                });
            },
            pushRecords: function (uid, list) {
                /* دفعات صغيرة: حد Firestore 500 عملية و10 ميغابايت للطلب */
                const chunks = [];
                let cur = [], size = 0;
                list.forEach(function (r) {
                    const n = (r.json || "").length + 300;
                    if (cur.length && (cur.length >= 300 || size + n > 3000000)) { chunks.push(cur); cur = []; size = 0; }
                    cur.push(r); size += n;
                });
                if (cur.length) chunks.push(cur);
                return chunks.reduce(function (p, chunk) {
                    return p.then(function () {
                        const batch = fs.writeBatch(db);
                        chunk.forEach(function (r) {
                            batch.set(fs.doc(db, "workspaces", uid, "records", fbDocId(r.id)), {
                                id: String(r.id), json: r.deleted ? "" : r.json, hash: r.hash, deleted: !!r.deleted,
                                updatedAt: r.updatedAt || "", syncedAt: fs.serverTimestamp()
                            });
                        });
                        return batch.commit();
                    });
                }, Promise.resolve());
            },
            pushSettings: function (uid, s) {
                return fs.setDoc(fs.doc(db, "workspaces", uid, "meta", "settings"), {
                    json: s.json, hash: s.hash, changedAt: s.changedAt || 0, records: s.records || 0, syncedAt: fs.serverTimestamp()
                });
            }
        };
        return fbBackend;
    });
}

/* ---------- المزامنة ---------- */

function fbRecordUpdatedAt(record) {
    return String(record && (record.updatedAt || record.createdAt) || "");
}

/* نسخة احتياطية هادئة قبل أي تغيير يُسقط نسخة محلية (تعارض أو حذف من جهاز آخر) */
function fbSafetyBackup(reason) {
    const jobs = [];
    try { if (telegramReady()) jobs.push(telegramAfterBackup(reason)); } catch (e) {}
    try { if (backupFolderHandle) jobs.push(writeBackupToFolder(false)); } catch (e) {}
    if (!jobs.length) {
        try { downloadBackupFile(true); } catch (e) {}
        return Promise.resolve();
    }
    const timeout = new Promise(function (r) { setTimeout(r, 15000); });
    return Promise.race([Promise.all(jobs.map(function (j) { return Promise.resolve(j).catch(function () {}); })), timeout]);
}

function fbSync(reason) {

    if (!fbUser || recordsLoadFailed || !currentUser) return Promise.resolve(false);
    if (fbSyncing) { fbSyncAgain = true; return fbSyncing; }

    const uid = FB_WORKSPACE;
    const first = !fbState.firstSyncDone || fbState.uid !== uid;
    if (first) {
        fbState.base = {};
        fbState.lastPull = 0;
        fbState.settingsBase = null;
        fbState.uid = uid;
    }

    renderFirebasePanel("syncing");

    fbSyncing = (first && records.length ? Promise.resolve().then(function () {
        /* أول مزامنة على هذا الجهاز: نسخة كاملة قبل أي شيء */
        try { downloadBackupFile(false); } catch (e) {}
    }) : Promise.resolve()).then(function () {
        return Promise.all([fbBackend.pullRecords(uid, fbState.lastPull || 0), fbBackend.getSettings(uid)]);
    }).then(function (res) {

        const remoteList = res[0];
        const remoteSettings = res[1];
        const base = fbState.base;
        const localById = {};
        records.forEach(function (r) { localById[String(r.id)] = r; });
        const localJSON = {};
        const localHashes = {};
        const localHash = function (id) {
            const r = localById[id];
            if (!r) return null;
            if (!(id in localHashes)) {
                localJSON[id] = JSON.stringify(r);
                localHashes[id] = fbRecordHash(r);
            }
            return localHashes[id];
        };

        const toPush = [];
        const apply = [];      /* {id, record|null} */
        let conflicts = 0, lostLocal = false, maxSynced = fbState.lastPull || 0;
        const conflictNums = [];
        const seen = {};

        remoteList.forEach(function (rem) {
            const id = String(rem.id);
            seen[id] = true;
            if (rem.syncedAt > maxSynced) maxSynced = rem.syncedAt;
            const R = rem.deleted ? "deleted" : rem.hash;
            const L = localHash(id);
            const B = base[id];
            if (L === R || (L === null && R === "deleted")) { base[id] = R; return; }
            const localChanged = B === undefined ? L !== null : L !== B && !(L === null && B === "deleted");
            const remoteChanged = B === undefined ? true : R !== B;
            if (!remoteChanged) return;               /* الرفع أدناه */
            if (!localChanged) {
                apply.push({ id: id, record: rem.deleted ? null : JSON.parse(rem.json) });
                if (rem.deleted) lostLocal = true;
                base[id] = R;
                return;
            }
            /* تعارض: الحذف لا يغلب تعديلاً، وإلا فالأحدث */
            conflicts++;
            if (localById[id]) conflictNums.push(localById[id].recordNumber);
            if (rem.deleted) return;                  /* يبقى المحلي ويُرفع */
            if (L === null) { apply.push({ id: id, record: JSON.parse(rem.json) }); base[id] = R; return; }
            const remoteRecord = JSON.parse(rem.json);
            if (fbRecordUpdatedAt(remoteRecord) > fbRecordUpdatedAt(localById[id])) {
                apply.push({ id: id, record: remoteRecord });
                lostLocal = true;
                base[id] = R;
            }
        });

        /* الرفع: كل ما تغيّر محلياً منذ آخر مزامنة (أو لم يُرفع قط) */
        records.forEach(function (r) {
            const id = String(r.id);
            if (apply.some(function (a) { return a.id === id; })) return;
            const L = localHash(id);
            if (base[id] !== L) toPush.push({ id: id, json: localJSON[id], hash: L, updatedAt: fbRecordUpdatedAt(r) });
        });
        /* سجلات حُذفت محلياً بعد مزامنتها */
        Object.keys(base).forEach(function (id) {
            if (base[id] !== "deleted" && !localById[id] && !apply.some(function (a) { return a.id === id; })) {
                toPush.push({ id: id, deleted: true, hash: "deleted", updatedAt: new Date().toISOString() });
            }
        });

        /* الإعدادات: وحدة واحدة بالمنطق نفسه */
        const sJSON = fbSettingsJSON();
        const sL = fbSettingsHash(sJSON);
        const sB = fbState.settingsBase;
        let pushSettings = false, applySettings = null;
        if (!fbState.settingsLocalHash) fbState.settingsLocalHash = sL;
        if (!remoteSettings) {
            pushSettings = true;
        } else if (remoteSettings.hash !== sL) {
            const remoteChanged = remoteSettings.hash !== sB;
            const localChanged = sB ? sL !== sB : true;
            /* الأحدث تعديلاً يفوز. إعدادات لم تُعدَّل قط تُقدَّر بوجود سجلات معها:
               جهاز جديد فارغ (أسعار افتراضية) لا يكتب فوق إعدادات جهاز فيه سجلات، في أي ترتيب دخول.
               التعادل ← النسخة المشتركة. */
            const localScore = number(fbState.settingsChangedAt) || (records.length ? 1 : 0);
            const remoteScore = number(remoteSettings.changedAt) || (number(remoteSettings.records) ? 1 : 0);
            if (remoteChanged && (!localChanged || remoteScore >= localScore)) {
                applySettings = remoteSettings;
            } else if (localChanged) {
                pushSettings = true;
            }
        } else {
            fbState.settingsBase = sL;
        }
        /* إعدادات تصل أثناء إدخال سجل: تؤجَّل حتى لا تضيع الوكالات المضافة */
        if (applySettings && pendingAgencies.length) applySettings = null;

        return (lostLocal || conflicts ? fbSafetyBackup("قبل تطبيق مزامنة") : Promise.resolve()).then(function () {

            let localChangedNow = false;
            apply.forEach(function (a) {
                const idx = records.findIndex(function (r) { return String(r.id) === a.id; });
                if (a.record === null) {
                    if (idx !== -1) { records.splice(idx, 1); localChangedNow = true; }
                } else if (idx !== -1) {
                    records[idx] = a.record; localChangedNow = true;
                } else {
                    records.push(a.record); localChangedNow = true;
                }
            });

            /* حفظ مباشر (لا persistRecords حتى لا تُطلب مزامنة جديدة)، مع تعليم التغيير للنسخ الاحتياطي */
            const save = localChangedNow ? persistRecordsNow().then(function () { try { markDataChanged(); } catch (e) {} }) : Promise.resolve();
            return save.then(function () {
                return toPush.length ? fbBackend.pushRecords(uid, toPush) : null;
            }).then(function () {
                toPush.forEach(function (p) { base[p.id] = p.hash; });
                if (pushSettings) {
                    return fbBackend.pushSettings(uid, { json: sJSON, hash: sL, changedAt: fbState.settingsChangedAt || 0, records: records.length }).then(function () {
                        fbState.settingsBase = sL;
                    });
                }
            }).then(function () {
                fbState.lastPull = maxSynced;
                fbState.firstSyncDone = true;
                fbState.lastSyncAt = new Date().toISOString();
                fbState.email = fbUser.email || "";
                fbState.lastError = "";
                fbState.lastResult = { pulled: apply.length, pushed: toPush.length, conflicts: conflicts };
                saveFbState();

                if (localChangedNow) {
                    [renderRecords, updateDashboard, renderReports].forEach(function (step) {
                        try { step(); } catch (e) { console.error("Refresh after sync failed:", e); }
                    });
                    notify("<strong>مزامنة Firebase</strong><span>وصل " + apply.length + " تغيير من جهاز آخر.</span>", "info", 5000, true);
                }

                if (conflictNums.length) {
                    notify("<strong>سجلات عُدّلت في جهازين قبل أن يتزامنا</strong><span>السجل " + conflictNums.map(escapeHTML).join("، ") +
                        ": بقي التعديل الأحدث، وأُخذت نسخة احتياطية قبل الحسم. راجعها إن لزم.</span>", "warning", 15000, true);
                }

                /* السجل المفتوح للتعديل هنا عُدّل في جهاز آخر: الحفظ سيكتب فوق تعديله */
                const editingId = document.getElementById("editingRecordId")?.value;
                const editedRemote = editingId && apply.find(function (a) { return a.id === String(editingId); });
                if (editedRemote) {
                    const num = editedRemote.record ? editedRemote.record.recordNumber : "";
                    notify("<strong>السجل " + escapeHTML(num) + " الذي تعدّله الآن عُدّل من جهاز آخر</strong>" +
                        "<span>إن حفظت الآن فستُكتب نسختك فوق تعديله. الأفضل فتح النسخة الجديدة ثم إعادة تعديلك.</span>" +
                        (editedRemote.record ? '<span class="toast-actions"><button type="button" class="act-btn" onclick="editRecord(\'' + escapeHTML(editingId) + '\')">فتح النسخة الجديدة</button></span>' : ""),
                        "warning", 30000, true);
                }

                if (applySettings) {
                    /* إعدادات أحدث من جهاز آخر: تُكتب ثم يُعاد التحميل لتُقرأ من جديد */
                    const data = JSON.parse(applySettings.json || "{}");
                    FB_SETTINGS_KEYS.forEach(function (key) {
                        if (typeof data[key] === "string") localStorage.setItem(key, data[key]);
                    });
                    fbState.settingsBase = applySettings.hash;
                    fbState.settingsLocalHash = applySettings.hash;
                    fbState.settingsChangedAt = number(applySettings.changedAt);
                    saveFbState();
                    notify("<strong>وصلت أسعار وإعدادات أحدث من جهاز آخر</strong><span>يُعاد تحميل الصفحة الآن.</span>", "info", 4000, true);
                    setTimeout(function () { location.reload(); }, 1500);
                }
                return true;
            });
        });
    }).catch(function (error) {
        console.error("Firebase sync failed:", error);
        const code = String(error && (error.code || error.message) || error);
        fbState.lastError = /permission/i.test(code)
            ? "هذا الحساب غير مسموح له بالوصول. ادخل بحساب المالك."
            : (navigator.onLine === false ? "لا يوجد اتصال بالإنترنت — ستُعاد المحاولة تلقائياً." : code);
        saveFbState();
        return false;
    }).then(function (ok) {
        fbSyncing = null;
        renderFirebasePanel();
        if (fbSyncAgain) { fbSyncAgain = false; fbScheduleSync(1000); }
        return ok;
    });

    return fbSyncing;
}

/* مزامنة مؤجّلة قليلاً بعد كل حفظ (تُجمع عدة حفظات في رفع واحد) */
function fbScheduleSync(delay) {
    if (!fbUser) return;
    clearTimeout(fbTimer);
    fbTimer = setTimeout(function () { fbSync("auto"); }, delay == null ? 4000 : delay);
}

function fbSignIn() {
    fbConnect();
    fbLoadBackend().then(function (b) {
        return b.signIn();
    }).catch(function (error) {
        console.error("Firebase sign-in failed:", error);
        const code = String(error && error.code || "");
        if (/popup-closed-by-user|cancelled-popup-request/.test(code)) return;
        notify("<strong>تعذر الدخول بحساب Google</strong><span>" + escapeHTML(/unauthorized-domain/.test(code)
            ? "أضف hussein199800.github.io إلى Authorized domains في إعدادات Authentication."
            : (error && error.message || error)) + "</span>", "error", 10000, true);
    });
}

function fbSignOut() {
    appConfirm({
        title: "إيقاف المزامنة على هذا الجهاز",
        message: "تبقى بياناتك كاملة على هذا الجهاز وعلى Firebase. فقط يتوقف هذا الجهاز عن المزامنة حتى تدخل مرة أخرى.",
        confirmText: "إيقاف",
        cancelText: "إلغاء"
    }).then(function (ok) {
        if (!ok || !fbBackend) return;
        fbBackend.signOut().then(function () {
            fbState.firstSyncDone = false;
            saveFbState();
            renderFirebasePanel();
        });
    });
}

function renderFirebasePanel(mode) {
    const status = document.getElementById("fbStatus");
    const box = document.getElementById("fbActions");
    if (!status || !box) return;
    const r = fbState.lastResult;
    let text;
    if (!fbUser) {
        text = fbState.lastError ? fbState.lastError : "غير متصل";
    } else if (mode === "syncing") {
        text = "جارٍ المزامنة…";
    } else if (fbState.lastError) {
        text = fbState.lastError;
    } else {
        text = "متصل: " + (fbUser.email || "") + (fbState.lastSyncAt ? " — آخر مزامنة " + new Date(fbState.lastSyncAt).toLocaleString(NUMBER_LOCALE, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }) : "") +
            (r && (r.pulled || r.pushed) ? " (رُفع " + r.pushed + "، وصل " + r.pulled + ")" : "");
    }
    status.textContent = text;
    status.classList.toggle("is-ok", !!fbUser && !fbState.lastError && mode !== "syncing");
    status.classList.toggle("is-error", !!fbState.lastError);
    box.innerHTML = fbUser
        ? '<button type="button" class="primary-btn" data-fb="sync"' + (mode === "syncing" ? " disabled" : "") + '><i class="ti ti-refresh" aria-hidden="true"></i> مزامنة الآن</button>' +
          '<button type="button" class="secondary-btn" data-fb="out"><i class="ti ti-logout" aria-hidden="true"></i> إيقاف المزامنة على هذا الجهاز</button>'
        : '<button type="button" class="primary-btn" data-fb="in"><i class="ti ti-brand-google" aria-hidden="true"></i> الدخول بحساب Google وبدء المزامنة</button>';
}

document.getElementById("fbActions")?.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-fb]");
    if (!btn) return;
    if (btn.dataset.fb === "in") fbSignIn();
    else if (btn.dataset.fb === "out") fbSignOut();
    else if (btn.dataset.fb === "sync") fbSync("manual");
});

/* بدء الاتصال: فقط إن سبق الدخول على هذا الجهاز (لا تحميل لمكتبات Firebase دون حاجة) */
function fbStart() {
    renderFirebasePanel();
    if (!fbState.signedIn && !window.__FB_TEST_BACKEND) return;
    fbConnect();
}

let fbConnected = false;
function fbConnect() {
    if (fbConnected) return;
    fbConnected = true;
    fbLoadBackend().then(function (b) {
        b.onUser(function (user) {
            fbUser = user || null;
            fbState.signedIn = !!user;
            saveFbState();
            renderFirebasePanel();
            if (user) fbSync("start");
        });
    }).catch(function (error) {
        fbConnected = false;
        fbState.lastError = "تعذر تحميل Firebase — تحقق من الاتصال.";
        console.error("Firebase load failed:", error);
        renderFirebasePanel();
    });
}

window.addEventListener("online", function () { fbScheduleSync(2000); });

/* والصفحة مفتوحة أمامك: فحص هادئ كل دقيقة لتصل تعديلات الطرف الآخر (يقرأ المتغيّر فقط) */
setInterval(function () {
    if (fbUser && !fbSyncing && document.visibilityState === "visible") fbSync("poll");
}, 60000);
document.addEventListener("visibilitychange", function () {
    /* العودة إلى الصفحة: جلب تغييرات الأجهزة الأخرى (مرة كل دقيقة على الأكثر) */
    if (document.visibilityState === "visible" && fbUser && (!fbState.lastSyncAt || Date.now() - Date.parse(fbState.lastSyncAt) > 60000)) {
        fbScheduleSync(500);
    }
});

onReady(fbStart);

/* =========================================================
تبديل الملاحظات السريعة (لا تؤثر على أي حساب مالي)
========================================================= */

function setupQuickNoteToggle(checkboxId, phrase) {

    const checkbox =
        document.getElementById(checkboxId);

    const textarea =
        document.getElementById("agencyNotes");

    if (!checkbox || !textarea) {
        return;
    }

    checkbox.addEventListener(
        "change",
        function () {

            const lines =
                textarea.value
                    .split("\n")
                    .map(function (line) {
                        return line.trim();
                    })
                    .filter(function (line) {
                        return line.length > 0;
                    });

            const existingIndex =
                lines.indexOf(phrase);

            if (checkbox.checked) {

                if (existingIndex === -1) {
                    lines.push(phrase);
                }

            } else {

                if (existingIndex !== -1) {
                    lines.splice(existingIndex, 1);
                }

            }

            textarea.value = lines.join("\n");

        }
    );

}

setupQuickNoteToggle("noteNoReceipt", NOTE_NO_RECEIPT);
setupQuickNoteToggle("noteNoBond", NOTE_NO_BOND);

/* =========================================================
تصدير Excel
========================================================= */

function sanitizeFileNamePart(text) {

    return String(text || "")
        .replace(/[\\/:*?"<>|]/g, "-")
        .trim();

}

function agencyAdditionsToText(agency, skipTransport) {

    const parts = [];

    Object.keys(ADDITION_NAMES).forEach(function (key) {

        if (skipTransport && key === "transport") {
            return;
        }

        const count = number(agency.additions && agency.additions[key]);

        if (count > 0) {
            parts.push(ADDITION_NAMES[key] + ": " + count);
        }

    });

    return parts.length ? parts.join("، ") : "-";

}

/* =========================================================
تصدير Excel منسق (xlsx-js-style)
عنوان رسمي، رأسية ملونة، أرقام بصيغة ل.س، صفوف متناوبة،
صف إجمالي، اتجاه من اليمين لليسار، عرض أعمدة مضبوط.
========================================================= */

const XL = {
    /* ألوان الهوية الحالية للنظام (كحلي + زمردي هادئ) */
    ink: "22394F",
    brass: "347570",
    brassSoft: "DCECE9",
    paper: "F7F8FA",
    line: "E2E7EC",
    white: "FFFFFF",
    muted: "8A98A8",
    red: "B0493F",
    moneyFmt: '#,##0 "ل.س"',
    font: "Calibri"
};

function xlBorder(color) {
    const side = { style: "thin", color: { rgb: color || XL.line } };
    return { top: side, bottom: side, left: side, right: side };
}

function xlStyle(kind) {
    const base = {
        font: { name: XL.font, sz: 11, color: { rgb: "222222" } },
        alignment: { horizontal: "right", vertical: "center", wrapText: true, readingOrder: 2 },
        border: xlBorder()
    };
    switch (kind) {
        case "title":
            return { font: { name: XL.font, sz: 16, bold: true, color: { rgb: XL.white } }, fill: { fgColor: { rgb: XL.ink } }, alignment: { horizontal: "center", vertical: "center", readingOrder: 2 } };
        case "subtitle":
            return { font: { name: XL.font, sz: 11, color: { rgb: XL.ink }, bold: true }, fill: { fgColor: { rgb: XL.brassSoft } }, alignment: { horizontal: "center", vertical: "center", readingOrder: 2 } };
        case "header":
            return { font: { name: XL.font, sz: 11, bold: true, color: { rgb: XL.white } }, fill: { fgColor: { rgb: XL.brass } }, alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2 }, border: xlBorder(XL.brass) };
        case "label":
            return Object.assign({}, base, { font: { name: XL.font, sz: 11, bold: true, color: { rgb: XL.ink } }, fill: { fgColor: { rgb: XL.paper } } });
        case "total":
            return Object.assign({}, base, { font: { name: XL.font, sz: 12, bold: true, color: { rgb: XL.white } }, fill: { fgColor: { rgb: XL.ink } }, border: xlBorder(XL.ink) });
        case "due":
            return Object.assign({}, base, { font: { name: XL.font, sz: 13, bold: true, color: { rgb: XL.white } }, fill: { fgColor: { rgb: XL.brass } }, border: xlBorder(XL.brass) });
        case "zebra":
            return Object.assign({}, base, { fill: { fgColor: { rgb: XL.paper } } });
        case "muted":
            return Object.assign({}, base, { font: { name: XL.font, sz: 11, color: { rgb: XL.muted }, strike: true } });
        default:
            return base;
    }
}

function xlCell(value, style, isMoney) {
    const cell = typeof value === "number"
        ? { v: value, t: "n" }
        : { v: value === undefined || value === null ? "" : String(value), t: "s" };
    cell.s = JSON.parse(JSON.stringify(style));
    if (isMoney && typeof value === "number") {
        cell.z = XL.moneyFmt;
        cell.s.numFmt = XL.moneyFmt;
    }
    return cell;
}

/*
    يبني ورقة: عنوان + سطر فرعي + جدول
    spec = { title, subtitle, headers, rows, moneyCols, totalRow, widths, mutedRows }
*/
function buildStyledTableSheet(spec) {

    const ws = {};
    const colCount = spec.headers.length;
    const moneyCols = spec.moneyCols || [];
    let r = 0;

    const put = function (row, col, cell) {
        ws[XLSX.utils.encode_cell({ r: row, c: col })] = cell;
    };

    ws["!merges"] = [];

    /* العنوان */
    for (let c = 0; c < colCount; c++) put(r, c, xlCell(c === 0 ? spec.title : "", xlStyle("title")));
    ws["!merges"].push({ s: { r: r, c: 0 }, e: { r: r, c: colCount - 1 } });
    r++;

    for (let c = 0; c < colCount; c++) put(r, c, xlCell(c === 0 ? spec.subtitle : "", xlStyle("subtitle")));
    ws["!merges"].push({ s: { r: r, c: 0 }, e: { r: r, c: colCount - 1 } });
    r++;

    r++; /* سطر فارغ */

    const headerRow = r;
    spec.headers.forEach(function (h, c) { put(r, c, xlCell(h, xlStyle("header"))); });
    r++;

    spec.rows.forEach(function (row, i) {
        const muted = spec.mutedRows && spec.mutedRows.indexOf(i) !== -1;
        const style = muted ? xlStyle("muted") : (i % 2 === 1 ? xlStyle("zebra") : xlStyle("cell"));
        row.forEach(function (value, c) {
            put(r, c, xlCell(value, style, moneyCols.indexOf(c) !== -1));
        });
        r++;
    });

    if (spec.totalRow) {
        spec.totalRow.forEach(function (value, c) {
            put(r, c, xlCell(value, xlStyle("total"), moneyCols.indexOf(c) !== -1));
        });
        r++;
    }

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(r - 1, headerRow), c: colCount - 1 } });
    ws["!cols"] = (spec.widths || []).map(function (w) { return { wch: w }; });

    const rows = [];
    rows[0] = { hpt: 30 };
    rows[1] = { hpt: 22 };
    rows[headerRow] = { hpt: 32 };
    ws["!rows"] = rows;

    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: headerRow, c: colCount - 1 } }) };

    return ws;
}

/*
    ورقة ملخص: عنوان + أزواج (البند، القيمة)
    items = [{ label, value, money, due }]
*/
function buildStyledSummarySheet(title, subtitle, items) {

    const ws = {};
    let r = 0;

    const put = function (row, col, cell) {
        ws[XLSX.utils.encode_cell({ r: row, c: col })] = cell;
    };

    put(r, 0, xlCell(title, xlStyle("title")));
    put(r, 1, xlCell("", xlStyle("title")));
    r++;
    put(r, 0, xlCell(subtitle, xlStyle("subtitle")));
    put(r, 1, xlCell("", xlStyle("subtitle")));
    r++;
    r++;

    items.forEach(function (item, i) {
        if (item.gap) { r++; return; }
        const valueStyle = item.due ? xlStyle("due") : (i % 2 === 1 ? xlStyle("zebra") : xlStyle("cell"));
        put(r, 0, xlCell(item.label, item.due ? xlStyle("due") : xlStyle("label")));
        put(r, 1, xlCell(item.value, valueStyle, !!item.money));
        r++;
    });

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 1 } });
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
    ];
    ws["!cols"] = [{ wch: 34 }, { wch: 26 }];
    ws["!rows"] = [{ hpt: 30 }, { hpt: 22 }];

    return ws;
}

function xlWorkbook() {
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    return wb;
}

function exportRecordToExcel(id) {

    if (typeof XLSX === "undefined") {
        notify("تعذر تحميل مكتبة الإكسل. تأكد من الاتصال بالإنترنت ثم حدّث الصفحة.", "error");
        return;
    }

    const record = records.find(function (r) { return r.id === id; });
    if (!record) return;

    const stats = getRecordFinalStats(record);
    const baseTotal = Object.keys(stats.byType).reduce(function (s, t) { return s + stats.byType[t].total; }, 0);
    const subtitle = "سجل " + record.recordNumber + " — " + record.officeName + " — المندوب: " + record.representativeName + " — " + todayArabic();

    /* 1) الملخص */
    const summary = buildStyledSummarySheet("نقابة المحامين — فرع إدلب | ملخص السجل", subtitle, [
        { label: "رقم السجل", value: String(record.recordNumber) },
        { label: "المكتب", value: record.officeName },
        { label: "المندوب", value: record.representativeName },
        { gap: true },
        { label: "الوكالات الفعالة", value: stats.active.length - stats.missingAgenciesCount },
        { label: "الوكالات المفقودة", value: stats.missingAgenciesCount },
        { label: "الوكالات الملغاة", value: stats.cancelled },
        { label: "إجمالي سعر الوكالات", value: baseTotal, money: true },
        { label: "عدد الإضافات", value: stats.additionsCount },
        { label: "الإضافات النقدية", value: stats.additionsTotal, money: true },
        { label: "قيمة طوابع الإضافات", value: stats.stampAdditionsValue, money: true },
        { label: "إجمالي مبلغ السجل", value: stats.grandTotal, money: true },
        { label: "عدد الطوابع الناقصة", value: stats.missing.pleading + stats.missing.ambulance + stats.missing.aid },
        { label: "قيمة الطوابع الناقصة", value: stats.missingValue, money: true },
        { gap: true },
        { label: "عدد بدلات الانتقال", value: stats.transport.count },
        { label: "القيمة الكاملة لبدل الانتقال", value: stats.transport.total, money: true },
        { label: "حصة المندوب من بدل الانتقال", value: stats.transport.share, money: true },
        { label: "طوابع مرافعة بدل الانتقال", value: stats.transport.stampsValue, money: true },
        { label: "المطلوب من بدل الانتقال", value: stats.transport.cash, money: true },
        { gap: true },
        { label: "حصة لجنة الإسعاف", value: stats.committees.ambulance, money: true },
        { label: "حصة لجنة التعاون", value: stats.committees.cooperation, money: true },
        { gap: true },
        { label: "المبلغ المستحق على المندوب", value: stats.representativeTotal, money: true, due: true }
    ]);

    /* 2) الوكالات */
    const sorted = stats.agencies.slice().sort(function (a, b) { return number(a.number) - number(b.number); });
    const muted = [];
    let sBase = 0, sTransport = 0, sAdd = 0, sMissing = 0, sRep = 0, sGrand = 0;

    const rows = sorted.map(function (agency, i) {
        const ms = agency.stamps || agency.missingStamps || {};
        const cancelled = agency.status === "cancelled";
        if (cancelled) muted.push(i);
        const transport = getAgencyTransport(agency);
        const base = cancelled ? 0 : number(agency.basePrice);
        const add = cancelled ? 0 : Math.max(0, number(agency.additionsTotal) - transport.cash) + getAgencyStampAdditionsValue(agency);
        const miss = cancelled ? 0 : number(agency.missingStampsValue);
        const rep = cancelled ? 0 : number(agency.representativeAmount);
        const grand = getAgencyGrandTotal(agency);
        sBase += base; sTransport += transport.total; sAdd += add; sMissing += miss; sRep += rep; sGrand += grand;
        return [
            String(agency.number) + (agency.duplicate ? " (مكررة)" : ""),
            AGENCY_NAMES[agency.type] || agency.type || "-",
            getAgencyStatusName(agency.status),
            base,
            transport.total,
            agencyAdditionsToText(agency, true),
            add,
            number(ms.pleading),
            number(ms.ambulance),
            number(ms.aid),
            miss,
            rep,
            grand,
            agency.notes || ""
        ];
    });

    const agenciesSheet = buildStyledTableSheet({
        title: "تفاصيل وكالات السجل " + record.recordNumber,
        subtitle: subtitle,
        headers: ["رقم الوكالة", "النوع", "الحالة", "السعر", "بدل الانتقال", "الإضافات", "قيمة الإضافات (طوابع ونقدية)", "نقص مرافعة", "نقص إسعاف", "نقص معونة", "قيمة الطوابع الناقصة", "المطلوب من المندوب", "الإجمالي (السعر + الإضافات + الانتقال)", "ملاحظات"],
        rows: rows,
        moneyCols: [3, 4, 6, 10, 11, 12],
        mutedRows: muted,
        totalRow: ["الإجمالي", rows.length + " وكالة", "", sBase, sTransport, "", sAdd,
            stats.missing.pleading, stats.missing.ambulance, stats.missing.aid, sMissing, sRep, sGrand, ""],
        widths: [14, 20, 10, 14, 14, 34, 14, 11, 11, 11, 16, 18, 22, 40]
    });

    /* 3) حسب النوع */
    const typeRows = Object.keys(AGENCY_NAMES).map(function (t) {
        const item = stats.byType[t] || { count: 0, total: 0 };
        return [AGENCY_NAMES[t], item.count, item.total];
    });

    const typesSheet = buildStyledTableSheet({
        title: "الوكالات حسب النوع",
        subtitle: subtitle,
        headers: ["نوع الوكالة", "العدد", "إجمالي السعر"],
        rows: typeRows,
        moneyCols: [2],
        totalRow: ["الإجمالي", typeRows.reduce(function (s, r) { return s + r[1]; }, 0), baseTotal],
        widths: [28, 12, 20]
    });

    const wb = xlWorkbook();
    XLSX.utils.book_append_sheet(wb, summary, "الملخص");
    XLSX.utils.book_append_sheet(wb, agenciesSheet, "الوكالات");
    XLSX.utils.book_append_sheet(wb, typesSheet, "حسب النوع");

    XLSX.writeFile(wb,
        "سجل " + sanitizeFileNamePart(record.recordNumber) + " - " +
        sanitizeFileNamePart(record.officeName) + " - " +
        sanitizeFileNamePart(record.representativeName) + ".xlsx"
    );
}

window.exportRecordToExcel = exportRecordToExcel;

function exportAllRecordsToExcel() {

    if (typeof XLSX === "undefined") {
        notify("تعذر تحميل مكتبة الإكسل. تأكد من الاتصال بالإنترنت ثم حدّث الصفحة.", "error");
        return;
    }

    const subtitle = "كل السجلات حتى " + todayArabic() + " — " + records.length + " سجل";

    let tBase = 0, tTransport = 0, tShare = 0, tAdd = 0, tMissing = 0, tRep = 0, tAg = 0, tActive = 0, tCancelled = 0, tLost = 0, tAmb = 0, tCoop = 0;

    const rows = records.map(function (record) {
        const stats = getRecordFinalStats(record);
        const base = Object.keys(stats.byType).reduce(function (s, t) { return s + stats.byType[t].total; }, 0);
        const active = stats.active.length - stats.missingAgenciesCount;
        tBase += base; tTransport += stats.transport.total; tShare += stats.transport.share;
        tAdd += stats.additionsTotal; tMissing += stats.missingValue; tRep += stats.representativeTotal;
        tAg += stats.agencies.length; tActive += active; tCancelled += stats.cancelled; tLost += stats.missingAgenciesCount;
        tAmb += stats.committees.ambulance; tCoop += stats.committees.cooperation;
        return [
            String(record.recordNumber), record.officeName, record.representativeName,
            stats.agencies.length, active, stats.missingAgenciesCount, stats.cancelled,
            base, stats.transport.total, stats.transport.share, stats.additionsTotal, stats.missingValue, stats.representativeTotal
        ];
    });

    const summary = buildStyledSummarySheet("نقابة المحامين — فرع إدلب | التقرير العام", subtitle, [
        { label: "عدد السجلات", value: records.length },
        { label: "عدد الوكالات", value: tAg },
        { label: "الوكالات الفعالة", value: tActive },
        { label: "الوكالات المفقودة", value: tLost },
        { label: "الوكالات الملغاة", value: tCancelled },
        { gap: true },
        { label: "إجمالي سعر الوكالات", value: tBase, money: true },
        { label: "الإضافات النقدية", value: tAdd, money: true },
        { label: "قيمة الطوابع الناقصة", value: tMissing, money: true },
        { label: "القيمة الكاملة لبدل الانتقال", value: tTransport, money: true },
        { label: "حصة المندوبين من بدل الانتقال", value: tShare, money: true },
        { gap: true },
        { label: "حصة لجنة الإسعاف", value: tAmb, money: true },
        { label: "حصة لجنة التعاون", value: tCoop, money: true },
        { gap: true },
        { label: "المطلوب من جميع المندوبين", value: tRep, money: true, due: true }
    ]);

    const recordsSheet = buildStyledTableSheet({
        title: "السجلات",
        subtitle: subtitle,
        headers: ["رقم السجل", "المكتب", "المندوب", "الوكالات", "فعالة", "مفقودة", "ملغاة", "سعر الوكالات", "بدل الانتقال", "حصة المندوب من الانتقال", "الإضافات النقدية", "الطوابع الناقصة", "المطلوب من المندوب"],
        rows: rows,
        moneyCols: [7, 8, 9, 10, 11, 12],
        totalRow: ["الإجمالي", "", "", tAg, tActive, tLost, tCancelled, tBase, tTransport, tShare, tAdd, tMissing, tRep],
        widths: [12, 24, 22, 10, 9, 9, 9, 16, 14, 16, 16, 16, 20]
    });

    /* حسب المندوب */
    const map = {};
    records.forEach(function (record) {
        const name = (record.representativeName || "-").trim() || "-";
        if (!map[name]) map[name] = { records: 0, agencies: 0, total: 0 };
        map[name].records += 1;
        map[name].agencies += (record.agencies || []).length;
        map[name].total += getRecordRepresentativeTotal(record);
    });

    const repRows = Object.keys(map)
        .map(function (name) { return [name, map[name].records, map[name].agencies, map[name].total]; })
        .sort(function (a, b) { return b[3] - a[3]; });

    const repsSheet = buildStyledTableSheet({
        title: "المستحق حسب المندوب",
        subtitle: subtitle,
        headers: ["المندوب", "عدد السجلات", "عدد الوكالات", "المطلوب"],
        rows: repRows,
        moneyCols: [3],
        totalRow: ["الإجمالي", records.length, tAg, tRep],
        widths: [28, 14, 14, 20]
    });

    /* الوكالات حسب التصفية الحالية في قسم التقارير */
    const reportFilter = getReportFilter();
    const matched = getFilteredAgencies(reportFilter);
    const agencyMuted = [];
    let fBase = 0, fTransport = 0, fRep = 0, fGrand = 0;

    const agencyRows = matched.map(function (m, i) {
        const a = m.agency;
        const cancelled = a.status === "cancelled";
        if (cancelled) agencyMuted.push(i);
        const t = getAgencyTransport(a);
        const ms = a.stamps || a.missingStamps || {};
        const base = cancelled ? 0 : number(a.basePrice);
        const rep = cancelled ? 0 : number(a.representativeAmount);
        const grand = getAgencyGrandTotal(a);
        fBase += base; fTransport += t.total; fRep += rep; fGrand += grand;
        return [
            String(m.record.recordNumber), m.day, m.record.representativeName,
            String(a.number), AGENCY_NAMES[a.type] || a.type, getAgencyStatusName(a.status),
            base, t.total, agencyAdditionsToText(a, true), agencyAdditionsCount(a),
            number(ms.pleading) + number(ms.ambulance) + number(ms.aid), rep, grand, a.notes || ""
        ];
    });

    const agenciesSheet = buildStyledTableSheet({
        title: isReportFilterActive(reportFilter) ? "الوكالات المطابقة للتصفية" : "كل الوكالات",
        subtitle: isReportFilterActive(reportFilter) ? reportFilterLabel(reportFilter) : subtitle,
        headers: ["السجل", "تاريخ السجل", "المندوب", "رقم الوكالة", "النوع", "الحالة", "السعر", "بدل الانتقال", "الإضافات", "عدد الإضافات", "طوابع ناقصة", "المطلوب من المندوب", "الإجمالي", "ملاحظات"],
        rows: agencyRows,
        moneyCols: [6, 7, 11, 12],
        mutedRows: agencyMuted,
        totalRow: ["الإجمالي", "", "", agencyRows.length + " وكالة", "", "", fBase, fTransport, "", "", "", fRep, fGrand, ""],
        widths: [10, 12, 18, 11, 20, 10, 14, 13, 30, 11, 11, 16, 16, 34]
    });

    const wb = xlWorkbook();
    XLSX.utils.book_append_sheet(wb, summary, "الملخص العام");
    XLSX.utils.book_append_sheet(wb, recordsSheet, "السجلات");
    XLSX.utils.book_append_sheet(wb, repsSheet, "حسب المندوب");
    XLSX.utils.book_append_sheet(wb, agenciesSheet, "الوكالات");

    XLSX.writeFile(wb, "التقرير العام " + new Date().toISOString().slice(0, 10) + ".xlsx");
}

window.exportAllRecordsToExcel = exportAllRecordsToExcel;





/* =========================================================
الحفظ التلقائي لمسودة السجل (Auto Save)
يحفظ بيانات السجل والوكالات المضافة قبل الضغط على "حفظ السجل"
حتى لا تضيع عند إغلاق الصفحة أو انقطاع الكهرباء.
========================================================= */

const DRAFT_KEY = "audit_record_draft";

let draftRestored = false;

function getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function saveRecordDraft() {

    try {

        const draft = {
            editingRecordId: getFieldValue("editingRecordId"),
            recordNumber: getFieldValue("recordNumber"),
            officeName: getFieldValue("officeName"),
            representativeName: getFieldValue("representativeName"),
            representativeType: getFieldValue("representativeType"),
            recordDate: getFieldValue("recordDate"),
            auditors: getFormAuditors(),
            pendingAgencies: pendingAgencies,
            savedAt: new Date().toISOString()
        };

        const isEmpty =
            !draft.recordNumber &&
            !draft.officeName &&
            !draft.representativeName &&
            pendingAgencies.length === 0;

        if (isEmpty) {
            localStorage.removeItem(DRAFT_KEY);
        } else {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }

        const status = document.getElementById("autosaveStatus");

        if (status) {
            status.textContent =
                isEmpty
                    ? ""
                    : "تم الحفظ التلقائي " + new Date().toLocaleTimeString(NUMBER_LOCALE);
        }

    } catch (error) {
        console.error("Auto save error:", error);
    }

}

function clearRecordDraft() {
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch (error) {}
}

/*
    استيراد سجل غير محفوظ من ملف JSON (بنفس شكل المسودة):
    { recordNumber, officeName, representativeName, representativeType,
      recordDate, editingRecordId?, pendingAgencies: [...] }
    يملأ النموذج بالوكالات، ثم يراجعها المستخدم ويضغط «حفظ السجل».
*/
function importRecordDraftFromFile(file) {

    const reader = new FileReader();

    reader.onload = function (event) {

        let data;

        try {
            data = JSON.parse(event.target.result);
        } catch (error) {
            notify("تعذر قراءة الملف. تأكد أنه ملف السجل غير المحفوظ (.json).", "error");
            return;
        }

        const list = data && Array.isArray(data.pendingAgencies) ? data.pendingAgencies : null;

        if (!list || !list.length || !list.every(function (a) { return a && a.type && a.number !== undefined; })) {
            notify("هذا الملف لا يحتوي وكالات سجل صالحة.", "error");
            return;
        }

        const apply = function () {

            const setValue = function (id, value) {
                const el = document.getElementById(id);
                if (el) el.value = value || "";
            };

            /* رقم «قيد التعديل» يُحتفظ به فقط إذا كان السجل موجوداً فعلاً */
            const editingExists = data.editingRecordId && records.some(function (r) { return r.id === data.editingRecordId; });

            setValue("editingRecordId", editingExists ? data.editingRecordId : "");
            setValue("recordNumber", data.recordNumber);
            setValue("officeName", data.officeName);
            setValue("representativeName", data.representativeName);
            setValue("representativeType", data.representativeType === "external" ? "external" : "internal");
            setValue("recordDate", data.recordDate || todayDay());
            if (Array.isArray(data.auditors)) setFormAuditors(data.auditors);
            updateRepresentativeTypeHint();

            pendingAgencies = list;

            const title = document.getElementById("recordFormTitle");
            if (title) {
                title.textContent = editingExists ? "تعديل السجل رقم " + (data.recordNumber || "") : "إنشاء سجل جديد";
            }

            renderPendingAgencies();
            clearAgencyForm();
            switchSection("newRecordSection");

            notify("<strong>تم استيراد " + list.length + " وكالة</strong><span>راجع بيانات السجل والوكالات ثم اضغط «حفظ السجل».</span>", "success", 7000, true);
        };

        if (pendingAgencies.length) {
            appConfirm({
                title: "استبدال الوكالات الحالية",
                message: "في النموذج الآن " + pendingAgencies.length + " وكالة غير محفوظة. هل تريد استبدالها بالوكالات الموجودة في الملف (" + list.length + " وكالة)؟",
                confirmText: "استبدالها",
                cancelText: "إلغاء",
                danger: true
            }).then(function (ok) {
                if (ok) apply();
            });
        } else {
            apply();
        }
    };

    reader.readAsText(file, "UTF-8");
}

document.getElementById("importDraftBtn")?.addEventListener("click", function () {
    document.getElementById("importDraftInput")?.click();
});

document.getElementById("importDraftInput")?.addEventListener("change", function () {
    const file = this.files && this.files[0];
    if (file) {
        importRecordDraftFromFile(file);
    }
    this.value = "";
});

function restoreRecordDraft() {

    if (draftRestored) {
        return;
    }

    draftRestored = true;

    let draft = null;

    try {
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    } catch (error) {
        draft = null;
    }

    if (!draft) {
        return;
    }

    if (pendingAgencies.length > 0) {
        return;
    }

    const setValue = function (id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value || "";
        }
    };

    setValue("editingRecordId", draft.editingRecordId);
    setValue("recordNumber", draft.recordNumber);
    setValue("officeName", draft.officeName);
    setValue("representativeName", draft.representativeName);
    setValue("representativeType", draft.representativeType === "external" ? "external" : "internal");
    setValue("recordDate", draft.recordDate || todayDay());
    if (Array.isArray(draft.auditors)) setFormAuditors(draft.auditors);
    updateRepresentativeTypeHint();

    pendingAgencies = Array.isArray(draft.pendingAgencies)
        ? draft.pendingAgencies
        : [];

    const title = document.getElementById("recordFormTitle");

    if (title && draft.editingRecordId) {
        title.textContent = "تعديل السجل رقم " + (draft.recordNumber || "");
    }

    renderPendingAgencies();

    if (typeof clearAgencyForm === "function") {
        clearAgencyForm();
    }

    const form = document.getElementById("recordForm");

    if (form && !document.getElementById("draftNotice")) {

        const notice = document.createElement("div");
        notice.id = "draftNotice";
        notice.className = "draft-notice";
        notice.textContent =
            "تمت استعادة سجل غير محفوظ (" +
            pendingAgencies.length +
            " وكالة). أكمل العمل ثم اضغط \"حفظ السجل\".";

        form.insertBefore(notice, form.firstChild);

    }

}

/* ربط الحفظ التلقائي بعرض الوكالات المضافة */
const originalRenderPendingAgencies = renderPendingAgencies;

renderPendingAgencies = function () {
    originalRenderPendingAgencies.apply(this, arguments);
    if (draftRestored) {
        saveRecordDraft();
    }
};

/* مسح المسودة عند حفظ السجل أو إلغاء التعديل */
const originalResetRecordForm = resetRecordForm;

resetRecordForm = function () {
    originalResetRecordForm.apply(this, arguments);
    clearRecordDraft();
    const notice = document.getElementById("draftNotice");
    if (notice) {
        notice.remove();
    }
    const status = document.getElementById("autosaveStatus");
    if (status) {
        status.textContent = "";
    }
};

["recordNumber", "officeName", "representativeName", "recordDate"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", saveRecordDraft);
    }
});

/* الاستعادة بعد تسجيل الدخول */
const originalUpdateAll = updateAll;

updateAll = function () {
    originalUpdateAll.apply(this, arguments);
    if (currentUser) {
        restoreRecordDraft();
    }
};

/* إذا كان المستخدم مسجلاً مسبقاً (جلسة محفوظة) */
if (typeof currentUser !== "undefined" && currentUser) {
    restoreRecordDraft();
}
