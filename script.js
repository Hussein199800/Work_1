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

let records =
loadData(
"audit_records",
[]
);

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
        saveData("audit_records", records);
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
حفظ الإعدادات
========================================================= */

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
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("ar-SY");
    } catch (e) {
        return day;
    }
}

function number(value) {

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
        "ar-SY"
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
            date.textContent = new Date().toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" });
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
        )?.value || "general"
    );
}

/* أسعار نوع وكالة معيّن (تستخدمها الحاسبة أيضاً) */
function getPricingForType(type) {

    const globalPrice =
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

function getAgencyFromForm() {

const status =
    document.getElementById(
        "agencyStatus"
    )?.value ||
    "active";


const cancelled =
    status ===
    "cancelled";


const isDuplicate =
    !!document.getElementById(
        "agencyDuplicate"
    )?.checked;


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

    /* الوكالة الملغاة لا يُحسب عليها بدل انتقال */
    transport:
        cancelled
            ? 0
            : number(
                document.getElementById(
                    "transportCount"
                )?.value
            )

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


const additionResult =
    calculateAdditions(
        additions,
        pricing
    );


const stampResult =
    calculateStamps(
        additionResult,
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


const representativeAmount =
    calculateRepresentativeAmount(
        pricing.representative,
        additionResult.total,
        stampResult.missingValue,
        0,
        cancelled
    );


const type =
    document.getElementById(
        "agencyType"
    )?.value ||
    "general";


const basePrice =
    cancelled
        ? 0
        : number(
            pricing.agency
        );


return {

    id:
        generateId(),

    number:
        document.getElementById(
            "agencyNumber"
        )?.value.trim() ||
        String(
            getNextAgencyNumber()
        ),

    type:
        type,

    typeName:
        AGENCY_NAMES[type],

    status:
        status,

    duplicate:
        isDuplicate,

    transportInAdditions:
        true,

    basePrice:
        basePrice,

    representativeBase:
        cancelled
            ? 0
            : number(
                pricing.representative
            ),

    additions:
        additions,

    additionValues:
        additionResult.values,

    additionsTotal:
        additionResult.total,

    pleadingAdditions:
        additionResult.pleadingStamps,

    stamps:
        missing,

    missingStampsValue:
        stampResult.missingValue,

    pleadingRequired:
        stampResult.requiredPleading,

    representativeAmount:
        representativeAmount,

    notes:
        document.getElementById(
            "agencyNotes"
        )?.value.trim() ||
        "",

    transportSettings:
        JSON.parse(
            JSON.stringify(
                pricing.transport
            )
        ),

    appliedPrices: {

        agency:
            basePrice,

        representative:
            pricing.representative,

        additions:
            JSON.parse(
                JSON.stringify(
                    pricing.additions
                )
            ),

        transport:
            JSON.parse(
                JSON.stringify(
                    pricing.transport
                )
            ),

        stamps:
            JSON.parse(
                JSON.stringify(
                    stampPrices
                )
            )

    }

};

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

function changePendingTransport(index, value) {
    const agency = pendingAgencies[index];
    if (!agency) {
        return;
    }
    setAgencyTransportCount(agency, value);
    renderPendingAgencies();
}

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

    if (external) {

        pendingAgencies.forEach(function (agency) {
            if (number(agency.additions && agency.additions.transport) === 0) {
                setAgencyTransportCount(agency, 1);
            }
        });

        if (formTransport && number(formTransport.value) === 0) {
            formTransport.value = 1;
        }

    } else {

        const withTransport = pendingAgencies.filter(function (agency) {
            return number(agency.additions && agency.additions.transport) > 0;
        });

        if (
            withTransport.length > 0 &&
            confirm("هل تريد إزالة بدل الانتقال من " + withTransport.length + " وكالة مضافة؟")
        ) {
            withTransport.forEach(function (agency) {
                setAgencyTransportCount(agency, 0);
            });
        }

        if (formTransport) {
            formTransport.value = 0;
        }
    }

    updateRepresentativeTypeHint();
    renderPendingAgencies();
    updatePreview();

    if (typeof saveRecordDraft === "function") {
        saveRecordDraft();
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

            alert(
                "ليس لديك صلاحية."
            );

            return;

        }


        const agency =
            getAgencyFromForm();


        /*
            الرقم يُقرأ من حقل "رقم الوكالة" كما هو
            (getAgencyFromForm تتكفل بهذا، وتضع رقماً
            تلقائياً فقط إذا كان الحقل فارغاً).
            هذا يحافظ على رقم الوكالة الأصلي عند التعديل
            بدل استبداله برقم جديد.
        */


        pendingAgencies.push(
            agency
        );


        renderPendingAgencies();

        clearAgencyForm();

    }
);

}

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


if (
    pendingAgencies.length ===
    0
) {

    container.innerHTML =
        "<p>لا توجد وكالات مضافة.</p>";

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
                    (external || transportCount > 0)
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
                        class="agency-item cls-card cls-${agency.status || "active"}"
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


document.getElementById(
    "transportCount"
).value =
    agency.additions.transport;


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

if (
    !confirm(
        "هل تريد حذف هذه الوكالة؟"
    )
) {

    return;

}


pendingAgencies.splice(
    index,
    1
);


renderPendingAgencies();

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
        "general";

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


/* المندوب الخارجي: بدل الانتقال مفعّل افتراضياً لكل وكالة جديدة */

const transportInput =
    document.getElementById(
        "transportCount"
    );

if (transportInput && isExternalRepresentative()) {

    transportInput.value = 1;

}


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
        number(
            document.getElementById(
                "transportCount"
            )?.value
        )

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

            alert(
                "ليس لديك صلاحية."
            );

            return;

        }


        if (
            pendingAgencies.length ===
            0
        ) {

            alert(
                "يجب إضافة وكالة واحدة على الأقل."
            );

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

            alert(
                "يرجى تعبئة بيانات السجل."
            );

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

            createdAt:
                oldRecord
                    ? oldRecord.createdAt
                    : new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        };


        if (editingId) {

            const index =
                records.findIndex(
                    function (item) {

                        return (
                            item.id ===
                            editingId
                        );

                    }
                );


            if (index !== -1) {

                records[index] =
                    record;

            }

        } else {

            records.push(
                record
            );

        }


        saveData(
            "audit_records",
            records
        );


        resetRecordForm();

        renderRecords();

        updateDashboard();

        renderReports();


        alert(
            editingId
                ? "تم تعديل السجل بنجاح."
                : "تم حفظ السجل بنجاح."
        );


        switchSection(
            "recordsSection"
        );

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

renderPendingAgencies();

ensureAgencyPriceControls();

clearAgencyForm();

updatePreview();

}

/* =========================================================
عرض السجلات
========================================================= */

function renderRecords() {

    const tbody = document.getElementById("recordsTableBody");

    if (!tbody) {
        return;
    }

    if (records.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="8"><div class="empty-state"><p>لا توجد سجلات محفوظة بعد.</p>' +
            '<button type="button" class="primary-btn" onclick="switchSection(\'newRecordSection\')">إنشاء سجل جديد</button></div></td></tr>';
        return;
    }

    const canEdit = currentUser && currentUser.role !== "viewer";
    const canDelete = currentUser && currentUser.role === "manager";

    tbody.innerHTML = records.map(function (record) {

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
            "<td><strong>" + escapeHTML(record.officeName) + "</strong></td>" +
            "<td>" + escapeHTML(record.representativeName) + "</td>" +
            '<td class="num"><span class="agency-count">' + (record.agencies || []).length + "</span>" + bar + "</td>" +
            '<td class="num">' + money(getRecordBaseTotal(record)) + "</td>" +
            '<td class="num money-cell">' + money(getRecordRepresentativeTotal(record)) + "</td>" +
            '<td class="date-cell">' + date + "</td>" +
            '<td><div class="row-actions">' +
                '<div class="action-group">' +
                    '<button type="button" class="act-btn" onclick="viewRecord(\'' + record.id + '\')">عرض</button>' +
                    (canEdit ? '<button type="button" class="act-btn" onclick="editRecord(\'' + record.id + '\')">تعديل</button>' : "") +
                    (canDelete ? '<button type="button" class="act-btn act-danger" onclick="deleteRecord(\'' + record.id + '\')">حذف</button>' : "") +
                "</div>" +
                '<div class="action-group report-group">' +
                    '<button type="button" class="act-btn" onclick="showFinalRecordReport(\'' + record.id + '\', \'summary\')">تقرير مختصر</button>' +
                    '<button type="button" class="act-btn" onclick="showFinalRecordReport(\'' + record.id + '\', \'detailed\')">تقرير مفصل</button>' +
                "</div>" +
            "</div></td>" +
            "</tr>";

    }).join("");

}

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

    alert(
        "السجل غير موجود."
    );

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

    alert(
        "الحذف متاح للمدير فقط."
    );

    return;

}


if (
    !confirm(
        "هل أنت متأكد من حذف السجل؟"
    )
) {

    return;

}


records =
    records.filter(
        function (record) {

            return (
                record.id !==
                id
            );

        }
    );


saveData(
    "audit_records",
    records
);


renderRecords();

updateDashboard();

renderReports();

}

window.deleteRecord =
deleteRecord;

/* =========================================================
عرض سجل كامل
========================================================= */

/*
    إجمالي الوكالة = سعر الوكالة + القيمة الكاملة لبدل الانتقال
    + الإضافات النقدية الأخرى (للوكالة غير الملغاة).
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
        transport.total;
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

    return {
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
        committees: sumCommittees(active)
    };
}

/* =========================================================
حصص لجنتي الإسعاف والتعاون
========================================================= */

function getAgencyCommittee(agency) {
    if (!agency || agency.status === "cancelled") {
        return { ambulance: 0, cooperation: 0 };
    }
    const share = committeeShares[agency.type] || { ambulance: 0, cooperation: 0 };
    return {
        ambulance: number(share.ambulance),
        cooperation: number(share.cooperation)
    };
}

function sumCommittees(agencies) {

    const result = { count: 0, ambulance: 0, cooperation: 0, byType: {} };

    Object.keys(AGENCY_NAMES).forEach(function (type) {
        result.byType[type] = { count: 0, ambulance: 0, cooperation: 0 };
    });

    (agencies || []).forEach(function (agency) {
        if (!agency || agency.status === "cancelled") {
            return;
        }
        const c = getAgencyCommittee(agency);
        if (!result.byType[agency.type]) {
            result.byType[agency.type] = { count: 0, ambulance: 0, cooperation: 0 };
        }
        result.count += 1;
        result.ambulance += c.ambulance;
        result.cooperation += c.cooperation;
        result.byType[agency.type].count += 1;
        result.byType[agency.type].ambulance += c.ambulance;
        result.byType[agency.type].cooperation += c.cooperation;
    });

    return result;
}

function committeesByTypeTableHTML(c) {

    let html = '<table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">العدد</th>' +
        '<th class="num">حصة الإسعاف للوكالة</th><th class="num">لجنة الإسعاف</th>' +
        '<th class="num">حصة التعاون للوكالة</th><th class="num">لجنة التعاون</th><th class="num">المجموع</th></tr></thead><tbody>';

    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const item = c.byType[type] || { count: 0, ambulance: 0, cooperation: 0 };
        const unit = committeeShares[type] || { ambulance: 0, cooperation: 0 };
        html += "<tr" + (item.count === 0 ? ' class="row-zero"' : "") + "><td>" + AGENCY_NAMES[type] + "</td>" +
            '<td class="num">' + item.count + "</td>" +
            '<td class="num">' + money(unit.ambulance) + "</td>" +
            '<td class="num">' + money(item.ambulance) + "</td>" +
            '<td class="num">' + money(unit.cooperation) + "</td>" +
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
الختم الرسمي (يستخدم في رأس التقارير)
========================================================= */

let sealCounter = 0;

function sealSVG() {
    sealCounter += 1;
    const id = "sealArc" + sealCounter;
    return '<svg class="seal" viewBox="0 0 120 120" aria-hidden="true">' +
        '<defs><path id="' + id + '" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs>' +
        '<circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
        '<circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" stroke-width="0.8"/>' +
        '<circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width="0.8"/>' +
        '<text font-size="10" font-weight="700" fill="currentColor"><textPath href="#' + id + '">نقابة المحامين ✦ فرع إدلب ✦ تدقيق السجلات ✦</textPath></text>' +
        '<g transform="translate(60 62) scale(0.52) translate(-50 -50)" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M50 22 V76"/><path d="M26 32 H74"/><path d="M36 78 H64"/>' +
        '<path d="M26 32 L17 54 M26 32 L35 54"/><path d="M14 54 Q26 66 38 54 Z"/>' +
        '<path d="M74 32 L65 54 M74 32 L83 54"/><path d="M62 54 Q74 66 86 54 Z"/>' +
        "</g></svg>";
}

function arabicDigit(n) {
    return String(n).replace(/[0-9]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; });
}

function todayArabic() {
    try {
        return new Date().toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" });
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
        "<small>عن " + stats.active.length + " وكالة غير ملغاة</small></div>" +
        '<dl class="doc-kpis">' +
            "<div><dt>فعالة</dt><dd>" + (stats.active.length - stats.missingAgenciesCount) + "</dd></div>" +
            "<div><dt>مفقودة</dt><dd>" + stats.missingAgenciesCount + "</dd></div>" +
            "<div><dt>ملغاة</dt><dd>" + stats.cancelled + "</dd></div>" +
            "<div><dt>سعر الوكالات</dt><dd>" + money(baseTotal) + "</dd></div>" +
            "<div><dt>عدد الإضافات</dt><dd>" + stats.additionsCount + "</dd></div>" +
            "<div><dt>الإضافات النقدية</dt><dd>" + money(stats.additionsTotal) + "</dd></div>" +
            "<div><dt>الطوابع الناقصة</dt><dd>" + missingTotalCount + "</dd></div>" +
            "<div><dt>قيمة الطوابع الناقصة</dt><dd>" + money(stats.missingValue) + "</dd></div>" +
            (stats.transport.count > 0
                ? "<div><dt>قيمة بدل الانتقال</dt><dd>" + money(stats.transport.total) + "</dd></div>" +
                  "<div><dt>حصة المندوب من الانتقال</dt><dd>" + money(stats.transport.share) + "</dd></div>" +
                  "<div><dt>طوابع مرافعة الانتقال (" + stats.transport.stamps + ")</dt><dd>" + money(stats.transport.stampsValue) + "</dd></div>" +
                  "<div><dt>المطلوب من بدل الانتقال</dt><dd>" + money(stats.transport.cash) + "</dd></div>"
                : "") +
        "</dl></div>";

    /* الوكالات حسب النوع */
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
                ? ' class="clickable-row" title="اضغط لعرض ' + AGENCY_NAMES[type] + ' فقط" onclick="showTypeAgencies(\'' + record.id + "', '" + type + "', '" + mode + '\')"'
                : ' class="row-zero"') +
            "><td>" + agencyTypeDot(type) + AGENCY_NAMES[type] +
            (clickable ? ' <i class="ti ti-chevron-left row-go no-print"></i>' : "") +
            '</td><td class="num">' + item.count + '</td><td class="num">' + money(item.total) + "</td></tr>";
    });

    html += '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + typeCount + '</td><td class="num">' + money(baseTotal) + "</td></tr></tfoot></table></div></section>";

    if (stats.transport.count > 0) {
        html += '<section class="doc-section">' + secTitle("بدل الانتقال") +
            '<div class="table-wrapper">' + transportTableHTML(stats.transport) + "</div></section>";
    }

    if (detailed) {

        let sumBase = 0, sumTransport = 0, sumAdd = 0, sumMissing = 0, sumRep = 0, sumGrand = 0;

        html += '<section class="doc-section">' + secTitle("تفاصيل الوكالات") +
            '<div class="table-wrapper"><table class="doc-table detail-table"><thead><tr>' +
            "<th>رقم الوكالة</th><th>النوع</th><th>الحالة</th>" +
            '<th class="num">السعر</th><th class="num">بدل الانتقال</th><th>الإضافات</th><th class="num">قيمة الإضافات</th>' +
            '<th>الطوابع الناقصة</th><th class="num">المطلوب من المندوب</th>' +
            '<th class="num total-col">الإجمالي<br><small>السعر + الانتقال + الإضافات</small></th><th>ملاحظات</th>' +
            "</tr></thead><tbody>";

        stats.agencies.slice().sort(function (a, b) { return number(a.number) - number(b.number); }).forEach(function (agency) {

            const ms = agency.stamps || agency.missingStamps || {};
            const isCancelled = agency.status === "cancelled";
            const transport = getAgencyTransport(agency);
            const base = isCancelled ? 0 : number(agency.basePrice);
            const add = isCancelled ? 0 : Math.max(0, number(agency.additionsTotal) - transport.cash);
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
            "<tr><td>مرافعة</td><td class=\"num\">" + stats.missing.pleading + '</td><td class="num">' + money(stats.missing.pleading * number(stampPrices.pleading)) + "</td></tr>" +
            "<tr><td>إسعاف</td><td class=\"num\">" + stats.missing.ambulance + '</td><td class="num">' + money(stats.missing.ambulance * number(stampPrices.ambulance)) + "</td></tr>" +
            "<tr><td>معونة</td><td class=\"num\">" + stats.missing.aid + '</td><td class="num">' + money(stats.missing.aid * number(stampPrices.aid)) + "</td></tr>" +
            '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + missingTotalCount + '</td><td class="num">' + money(stats.missingValue) + "</td></tr></tfoot></table></section>";

        html += '<section class="doc-section">' + secTitle("الإضافات") +
            '<table class="doc-table"><thead><tr><th>الإضافة</th><th class="num">العدد</th><th class="num">القيمة النقدية</th></tr></thead><tbody>';

        let addCountTotal = 0, addCashTotal = 0;
        Object.keys(ADDITION_NAMES).forEach(function (key) {
            if (key === "transport") return; /* له قسم مستقل */
            const count = stats.active.reduce(function (sum, a) { return sum + number(a.additions && a.additions[key]); }, 0);
            const cash = stats.active.reduce(function (sum, a) { return sum + number(a.additionValues && a.additionValues[key]); }, 0);
            addCountTotal += count; addCashTotal += cash;
            html += "<tr" + (count === 0 ? ' class="row-zero"' : "") + "><td>" + ADDITION_NAMES[key] + '</td><td class="num">' + count + '</td><td class="num">' + money(cash) + "</td></tr>";
        });

        html += '</tbody><tfoot><tr><td>الإجمالي</td><td class="num">' + addCountTotal + '</td><td class="num">' + money(addCashTotal) + "</td></tr></tfoot></table></section>";

        html += "</div>";

        const withNotes = stats.agencies.filter(function (a) { return a.notes; });

        html += '<section class="doc-section">' + secTitle("ملاحظات الوكالات") +
            (withNotes.length === 0
                ? '<p class="doc-empty">لا توجد ملاحظات مسجلة على وكالات هذا السجل.</p>'
                : '<ul class="doc-notes">' + withNotes.map(function (a) {
                    return "<li><b>وكالة " + escapeHTML(a.number) + "</b><span>" + formatNotesHTML(a.notes) + "</span></li>";
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

    html += '<section class="doc-section doc-section-flow"><h3><span class="sec-no">١</span>' + escapeHTML(typeName) + " — التفاصيل كما أُدخلت</h3>" +
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

function showFinalRecordReport(id, mode) {
    const record = records.find(function (item) { return item.id === id; });
    if (!record) return;
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("recordModal");
    if (!modalContent || !modal) return;
    modalContent.innerHTML = buildFinalRecordReport(record, mode || "summary");
    modal.classList.remove("hidden");
    modalContent.scrollTop = 0;
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

function showToast(html, ms) {

    let toast = document.getElementById("appToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.className = "app-toast no-print";
        document.body.appendChild(toast);
    }

    toast.innerHTML = html;
    toast.classList.add("show");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
        toast.classList.remove("show");
    }, ms || 6000);
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

    html += '<section class="doc-section"><h3><span class="sec-no">١</span>حسب نوع الوكالة</h3>' +
        '<div class="table-wrapper">' + committeesByTypeTableHTML(totals) + "</div></section>";

    html += '<section class="doc-section"><h3><span class="sec-no">٢</span>حسب السجل</h3>' +
        '<div class="table-wrapper"><table class="doc-table"><thead><tr><th>رقم السجل</th><th>المكتب</th><th>المندوب</th><th>التاريخ</th>' +
        '<th class="num">الوكالات</th><th class="num">لجنة الإسعاف</th><th class="num">لجنة التعاون</th><th class="num">المجموع</th></tr></thead><tbody>';

    if (list.length === 0) {
        html += '<tr><td colspan="8">لا توجد سجلات ضمن الفلترة المحددة.</td></tr>';
    }

    list.forEach(function (record) {
        const c = sumCommittees(record.agencies);
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
        html += '<p class="field-hint">الحصص محسوبة من قسم الأسعار ← حصص لجنتي الإسعاف والتعاون، والوكالات الملغاة غير محسوبة.</p>';
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
        alert("تعذر تحميل مكتبة الإكسل. تأكد من الاتصال بالإنترنت ثم حدّث الصفحة.");
        return;
    }

    const result = buildCommitteesDoc(false);
    const totals = result.totals;
    const subtitle = committeeFilterLabel() + " — " + todayArabic();

    const typeRows = Object.keys(AGENCY_NAMES).map(function (type) {
        const item = totals.byType[type];
        const unit = committeeShares[type] || { ambulance: 0, cooperation: 0 };
        return [AGENCY_NAMES[type], item.count, number(unit.ambulance), item.ambulance, number(unit.cooperation), item.cooperation, item.ambulance + item.cooperation];
    });

    const typesSheet = buildStyledTableSheet({
        title: "حصص لجنتي الإسعاف والتعاون — حسب نوع الوكالة",
        subtitle: subtitle,
        headers: ["نوع الوكالة", "العدد", "حصة الإسعاف للوكالة", "لجنة الإسعاف", "حصة التعاون للوكالة", "لجنة التعاون", "المجموع"],
        rows: typeRows,
        moneyCols: [2, 3, 4, 5, 6],
        totalRow: ["الإجمالي", totals.count, "", totals.ambulance, "", totals.cooperation, totals.ambulance + totals.cooperation],
        widths: [26, 10, 18, 18, 18, 18, 18]
    });

    const recordRows = result.list.map(function (record) {
        const c = sumCommittees(record.agencies);
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

    alert(
        "السجل غير موجود."
    );

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
                            الإجمالي (السعر + الإضافات)
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
        alert("ليس لديك صلاحية.");
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
        '<input type="number" id="' + id + '" min="0" value="' + (value || 0) + '">' +
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
                    '<div class="input-suffix"><input type="number" id="ccShare" min="0"><span>ل.س</span></div>' +
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
                        Object.keys(AGENCY_NAMES).map(function (t) { return '<option value="' + t + '">' + AGENCY_NAMES[t] + "</option>"; }).join("") +
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
                '<div class="input-group"><label for="rcFrom"><i class="ti ti-number"></i> من وكالة رقم</label><input type="number" id="rcFrom" min="0" placeholder="الكل"></div>' +
                '<div class="input-group"><label for="rcTo"><i class="ti ti-number"></i> إلى وكالة رقم</label><input type="number" id="rcTo" min="0" placeholder="الكل"></div>' +
                '<div class="input-group"><label for="rcReceived"><i class="ti ti-cash"></i> المبلغ المقبوض فعلاً</label>' +
                    '<div class="input-suffix"><input type="number" id="rcReceived" min="0" placeholder="0"><span>ل.س</span></div></div>' +
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
        '<div class="input-group"><label>من وكالة رقم</label><input type="number" class="cc-from" min="0" placeholder="الكل" value="' + escapeHTML(row.from) + '"></div>' +
        '<div class="input-group"><label>إلى وكالة رقم</label><input type="number" class="cc-to" min="0" placeholder="الكل" value="' + escapeHTML(row.to) + '"></div>' +
        '<button type="button" class="act-btn act-danger cc-remove" title="حذف هذا السطر"><i class="ti ti-trash"></i></button>' +
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
        '<section class="doc-section"><h3><span class="sec-no">١</span>التفاصيل حسب السجل</h3>' + councilTableHTML(result) + "</section>" +
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
        alert("اختر سجلاً واحداً على الأقل قبل الحفظ.");
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
    showToast("<strong>تم حفظ الحساب</strong><span>" + escapeHTML(name) + " — " + money(result.total.council) + "</span>", 4000);
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
    if (!confirm("حذف هذا الحساب المحفوظ؟")) return;
    councilSaved = councilSaved.filter(function (s) { return s.id !== id; });
    saveData(COUNCIL_SAVED_KEY, councilSaved);
    renderCouncilSaved();
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
                    '<button type="button" class="act-btn act-danger" onclick="deleteCouncilCalc(\'' + s.id + '\')"><i class="ti ti-trash"></i></button>' +
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
    const grand = number(pricing.agency) + tTotal + otherAdditions;
    const committee = committeeShares[type] || { ambulance: 0, cooperation: 0 };

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
            tile("قيمة الطوابع الناقصة", money(stamps.missingValue * qty)) +
            tile("طوابع المرافعة المطلوبة", stamps.requiredPleading * qty) +
            tile("حصة المندوب من الانتقال", money(tShare * qty)) +
            tile("لجنة الإسعاف", money(number(committee.ambulance) * qty)) +
            tile("لجنة التعاون", money(number(committee.cooperation) * qty)) +
            tile("الإجمالي (السعر + الانتقال + الإضافات)", money(grand * qty)) +
            tile("المطلوب من المندوب", money(rep * qty), "calc-kpi-main") +
        "</div>" +
        (external && tCount === 0 ? '<p class="field-hint">المندوب خارجي لكن عدد بدل الانتقال صفر.</p>' : "");
}

function resetQuickCalc() {
    document.querySelectorAll('[data-panel="quick"] input[type=number]').forEach(function (input) {
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
        '<section class="doc-section"><h3><span class="sec-no">١</span>المطلوب حسب نوع الوكالة</h3>' + breakdown + "</section>" +
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
            if (event.target.id === "qcRep") {
                const tr = document.getElementById("qc_add_transport");
                if (tr) tr.value = event.target.value === "external" ? Math.max(1, number(tr.value)) : 0;
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
        '<h4 class="guide-sub">١. لون الشريط = نوع الوكالة</h4>' +
        '<div class="guide-chips">' +
        Object.keys(AGENCY_NAMES).map(function (type) {
            return '<span class="guide-chip" style="--c:' + AGENCY_TYPE_COLORS[type] + '">' + agencyTypeDot(type) + AGENCY_NAMES[type] + "</span>";
        }).join("") +
        "</div>" +
        '<h4 class="guide-sub">٢. شدة التظليل = عدد الإضافات (بدون بدل الانتقال)</h4>' +
        '<div class="guide-shades">' +
        [0, 1, 2, 3].map(function (level) {
            const tint = [0.04, 0.13, 0.23, 0.34][level];
            return '<div class="guide-shade" style="background:' + hexToRgba(demoColor, tint) + ";box-shadow:inset -5px 0 0 " + demoColor + '">' +
                (level === 3 ? "3 أو أكثر" : additionsCountLabel(level)) + "</div>";
        }).join("") +
        "</div>" +
        '<h4 class="guide-sub">٣. العلامات</h4>' +
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
        '<p class="guide-text">عند اختيار «مندوب خارجي» في بيانات السجل يُضاف بدل الانتقال إلى كل وكالة، ويمكن تغييره أو إطفاؤه لكل وكالة من قائمتها.</p>' +
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
        '<p class="guide-text">لكل وكالة غير ملغاة حصة ثابتة لكل لجنة حسب نوعها. تُعدَّل من قسم الأسعار، وتُحسب بالأسعار الحالية حتى للسجلات القديمة.</p>' +
        '<div class="table-wrapper"><table class="doc-table"><thead><tr><th>نوع الوكالة</th><th class="num">لجنة الإسعاف</th><th class="num">لجنة التعاون</th><th class="num">المجموع</th></tr></thead><tbody>' +
        Object.keys(AGENCY_NAMES).map(function (type) {
            const c = committeeShares[type] || { ambulance: 0, cooperation: 0 };
            return "<tr><td>" + agencyTypeDot(type) + AGENCY_NAMES[type] + '</td><td class="num">' + money(c.ambulance) + '</td><td class="num">' + money(c.cooperation) + '</td><td class="num">' + money(number(c.ambulance) + number(c.cooperation)) + "</td></tr>";
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
                        type="number"
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
                        type="number"
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

renderStampPrices();

renderTransportPrices();

}

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
                        type="number"
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
            type="number"
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
            type="number"
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
            type="number"
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
            type="number"
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
            type="number"
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

function renderCommitteePrices() {

    const container = document.getElementById("committeePricesContainer");

    if (!container) {
        return;
    }

    container.innerHTML =
        '<div class="table-wrapper"><table class="committee-price-table"><thead><tr>' +
        "<th>نوع الوكالة</th><th>حصة لجنة الإسعاف</th><th>حصة لجنة التعاون</th>" +
        "</tr></thead><tbody>" +
        Object.keys(AGENCY_NAMES).map(function (type) {
            const share = committeeShares[type] || { ambulance: 0, cooperation: 0 };
            return "<tr><td>" + AGENCY_NAMES[type] + "</td>" +
                '<td><input type="number" min="0" data-committee-type="' + type + '" data-committee-field="ambulance" value="' + number(share.ambulance) + '"></td>' +
                '<td><input type="number" min="0" data-committee-type="' + type + '" data-committee-field="cooperation" value="' + number(share.cooperation) + '"></td>' +
                "</tr>";
        }).join("") +
        "</tbody></table></div>";
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

            alert(
                "هذه العملية للمدير فقط."
            );

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
                "[data-committee-type]"
            )
            .forEach(
                function (input) {

                    const type = input.dataset.committeeType;
                    const field = input.dataset.committeeField;

                    if (!committeeShares[type]) {
                        committeeShares[type] = { ambulance: 0, cooperation: 0 };
                    }

                    committeeShares[type][field] = number(input.value);

                }
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

        alert(
            "تم حفظ جميع الأسعار والإعدادات بنجاح. سيتم إعادة تحميل الصفحة الآن."
        );

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

            alert(
                "يرجى إدخال اسم المستخدم وكلمة المرور."
            );

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

            alert(
                "اسم المستخدم موجود مسبقًا."
            );

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


        alert(
            "تمت إضافة المستخدم."
        );

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

    alert(
        "لا يمكن حذف المدير الأساسي."
    );

    return;

}


if (
    !confirm(
        "هل تريد حذف هذا المستخدم؟"
    )
) {

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

recordSearch.addEventListener(
    "input",
    function () {

        const value =
            this.value
                .trim()
                .toLowerCase();


        document
            .querySelectorAll(
                "#recordsTableBody tr"
            )
            .forEach(
                function (row) {

                    row.style.display =
                        row.textContent
                            .toLowerCase()
                            .includes(
                                value
                            )
                            ? ""
                            : "none";

                }
            );

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

function updateDashboard() {

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
            new Date().toLocaleDateString("ar-SY", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
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

}

/* =========================================================
DOMContentLoaded
========================================================= */

window.addEventListener(
"DOMContentLoaded",
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

}

function restoreBackupFromFile(file) {

    const reader = new FileReader();

    reader.onload = function (event) {

        let data;

        try {
            data = JSON.parse(event.target.result);
        } catch (error) {
            alert("تعذر قراءة الملف. تأكد أنه ملف نسخة احتياطية صحيح.");
            return;
        }

        if (!data || !Array.isArray(data.records)) {
            alert("ملف النسخة الاحتياطية غير صالح.");
            return;
        }

        if (
            !confirm(
                "سيتم استبدال كل البيانات الحالية (السجلات، الأسعار، المستخدمين) بالبيانات الموجودة في هذا الملف. هل أنت متأكد من المتابعة؟"
            )
        ) {
            return;
        }

        records = data.records || [];
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

        saveData("audit_committee_shares", committeeShares);
        saveData("audit_records", records);
        saveData("audit_users", users);
        saveData("audit_prices", prices);
        saveData("audit_addition_prices", additionPrices);
        saveData("audit_addition_stamp_status", additionStampStatus);
        saveData("audit_transport_settings", transportSettings);
        saveData("audit_stamp_prices", stampPrices);

        alert("تم استيراد النسخة الاحتياطية بنجاح. سيتم إعادة تحميل الصفحة الآن.");

        location.reload();

    };

    reader.readAsText(file, "UTF-8");

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
        alert("تعذر تحميل مكتبة الإكسل. تأكد من الاتصال بالإنترنت ثم حدّث الصفحة.");
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
        const add = cancelled ? 0 : Math.max(0, number(agency.additionsTotal) - transport.cash);
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
        headers: ["رقم الوكالة", "النوع", "الحالة", "السعر", "بدل الانتقال", "الإضافات", "قيمة الإضافات", "نقص مرافعة", "نقص إسعاف", "نقص معونة", "قيمة الطوابع الناقصة", "المطلوب من المندوب", "الإجمالي (السعر + الانتقال + الإضافات)", "ملاحظات"],
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
        alert("تعذر تحميل مكتبة الإكسل. تأكد من الاتصال بالإنترنت ثم حدّث الصفحة.");
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
                    : "تم الحفظ التلقائي " + new Date().toLocaleTimeString("ar");
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
