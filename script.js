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

const DEFAULT_TRANSPORT_SETTINGS = {

pleadingStamp:
    false,

representativeShare:
    50,

cashRemainder:
    100

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
حفظ الإعدادات
========================================================= */

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


currentUserElement.textContent =
    user.username +
    " - " +
    getRoleName(
        user.role
    );


applyPermissions();

updateAll();

}

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

}


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
    id === "usersSection"
) {

    renderUsers();

}


if (
    id === "newRecordSection"
) {

    prepareNewAgency();

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
    const type =
        document.getElementById(
            "agencyType"
        )?.value || "general";

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
        transport: {
            pleadingStamp:
                !!transportSettings.pleadingStamp,
            representativeShare:
                number(
                    transportSettings.representativeShare
                ),
            cashRemainder:
                number(
                    transportSettings.cashRemainder
                )
        }
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
        {

            pleadingStamp:
                pricing
                    .transport
                    .pleadingStamp,

            representativeShare:
                pricing
                    .transport
                    .representativeShare,

            cashRemainder:
                pricing
                    .transport
                    .cashRemainder

        },

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


container.innerHTML =
    pendingAgencies
        .map(
            function (agency, index) {

                return `

                    <div class="agency-item">

                        <div class="agency-item-info">

                            <strong>
                                رقم الوكالة:
                                ${escapeHTML(
                                    agency.number
                                )}
                            </strong>

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


renderPendingAgencies();

ensureAgencyPriceControls();

clearAgencyForm();

updatePreview();

}

/* =========================================================
عرض السجلات
========================================================= */

function renderRecords() {

const tbody =
    document.getElementById(
        "recordsTableBody"
    );


if (!tbody) {
    return;
}


if (
    records.length ===
    0
) {

    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                style="text-align:center"
            >
                لا توجد سجلات.
            </td>

        </tr>

    `;

    return;

}


tbody.innerHTML =
    records
        .map(
            function (record) {

                const totalBase =
                    getRecordBaseTotal(
                        record
                    );


                const representativeTotal =
                    getRecordRepresentativeTotal(
                        record
                    );


                return `

                    <tr>

                        <td>
                            ${escapeHTML(
                                record.recordNumber
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                record.officeName
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                record.representativeName
                            )}
                        </td>

                        <td>
                            ${record.agencies.length}
                        </td>

                        <td>
                            ${money(
                                totalBase
                            )}
                        </td>

                        <td>
                            <strong>
                                ${money(
                                    representativeTotal
                                )}
                            </strong>
                        </td>

                        <td>
                            ${new Date(
                                record.createdAt
                            ).toLocaleDateString(
                                "ar-SY"
                            )}
                        </td>

                        <td>

                            <div class="button-row">

                                <button
                                    type="button"
                                    class="primary-btn"
                                    onclick="
                                        viewRecord(
                                            '${record.id}'
                                        )
                                    "
                                >
                                    عرض
                                </button>


                                ${
                                    currentUser &&
                                    currentUser.role !==
                                    "viewer"

                                        ? `

                                            <button
                                                type="button"
                                                class="secondary-btn"
                                                onclick="
                                                    editRecord(
                                                        '${record.id}'
                                                    )
                                                "
                                            >
                                                تعديل
                                            </button>

                                          `

                                        : ""
                                }


                                ${
                                    currentUser &&
                                    currentUser.role ===
                                    "manager"

                                        ? `

                                            <button
                                                type="button"
                                                class="danger-btn"
                                                onclick="
                                                    deleteRecord(
                                                        '${record.id}'
                                                    )
                                                "
                                            >
                                                حذف
                                            </button>

                                          `

                                        : ""
                                }

                                <button
                                    type="button"
                                    class="primary-btn"
                                    onclick="showFinalRecordReport('${record.id}', 'summary')"
                                >
                                    التقرير المختصر
                                </button>

                                <button
                                    type="button"
                                    class="secondary-btn"
                                    onclick="showFinalRecordReport('${record.id}', 'detailed')"
                                >
                                    التقرير المفصل والطباعة
                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            }
        )
        .join("");

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
    إجمالي الوكالة = سعر الوكالة + الإضافات النقدية (للوكالة غير الملغاة)
*/
function getAgencyGrandTotal(agency) {
    if (!agency || agency.status === "cancelled") {
        return 0;
    }
    return number(agency.basePrice) + number(agency.additionsTotal);
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

    return {
        agencies: agencies,
        active: active,
        cancelled: agencies.length - active.length,
        missingAgenciesCount: missingAgenciesCount,
        byType: byType,
        missing: missing,
        missingValue: missingValue,
        additionsTotal: additionsTotal,
        additionsCount: additionsCount,
        signatureCount: signatureCount,
        representativeTotal: representativeTotal
    };
}

function buildFinalRecordReport(record, mode) {

    mode = mode || "summary";
    const stats = getRecordFinalStats(record);

    let html = `
        <div class="final-report">
            <div class="report-actions no-print">
                <button type="button" class="primary-btn" onclick="printFinalRecordReport('${record.id}', '${mode}')">
                    طباعة التقرير
                </button>
                <button type="button" class="secondary-btn" onclick="exportRecordToPDF('${record.id}', '${mode}')">
                    تصدير PDF
                </button>
                <button type="button" class="secondary-btn" onclick="exportRecordToExcel('${record.id}')">
                    تصدير Excel
                </button>
                <button type="button" class="secondary-btn" onclick="closeRecordModal()">
                    إغلاق
                </button>
            </div>
            <div class="report-header">
                <h2>التقرير النهائي للسجل</h2>
                <p>رقم السجل: ${escapeHTML(record.recordNumber)}</p>
                <p>المكتب: ${escapeHTML(record.officeName)} — المندوب: ${escapeHTML(record.representativeName)}</p>
            </div>

            <div class="report-grid">
                <div><span>عدد الوكالات الفعالة</span><strong class="report-number">${stats.active.length}</strong></div>
                <div><span>عدد الوكالات الملغاة</span><strong class="report-number">${stats.cancelled}</strong></div>
                <div><span>عدد الوكالات المفقودة</span><strong class="report-number">${stats.missingAgenciesCount}</strong></div>
                <div class="report-due"><span>المطلوب من المندوب (الإجمالي المستحق)</span><strong class="report-number">${money(stats.representativeTotal)}</strong></div>
                <div><span>إجمالي الإضافات النقدية</span><strong class="report-number">${money(stats.additionsTotal)}</strong></div>
                <div><span>عدد الإضافات</span><strong class="report-number">${stats.additionsCount}</strong></div>
                <div><span>توقيع إضافي</span><strong class="report-number">${stats.signatureCount}</strong></div>
                <div><span>الطوابع الناقصة</span><strong class="report-number">${stats.missing.pleading + stats.missing.ambulance + stats.missing.aid}</strong></div>
                <div><span>قيمة الطوابع الناقصة</span><strong class="report-number">${money(stats.missingValue)}</strong></div>
            </div>

            <div class="report-card">
                <h3>نوع الوكالات وعددها</h3>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>نوع الوكالة</th><th>عدد الوكالات</th><th>إجمالي سعر الوكالات</th></tr></thead>
                        <tbody>
    `;

    Object.keys(AGENCY_NAMES).forEach(function (type) {
        const item = stats.byType[type] || { count: 0, total: 0 };
        html += `<tr><td>${AGENCY_NAMES[type]}</td><td><strong>${item.count}</strong></td><td>${money(item.total)}</td></tr>`;
    });

    html += `</tbody></table></div></div>`;

    if (mode === "detailed") {
        html += `
            <div class="report-card">
                <h3>التقرير المفصل للوكالات</h3>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>رقم الوكالة</th><th>النوع</th><th>السعر</th><th>المطلوب من المندوب</th><th>الطوابع الناقصة</th><th>الإضافات</th><th>الملاحظات</th><th class="total-col">الإجمالي (السعر + الإضافات)</th></tr></thead>
                        <tbody>
        `;
        stats.agencies.slice().sort(function(a,b){ return number(a.number)-number(b.number); }).forEach(function(agency){
            const ms = agency.stamps || agency.missingStamps || {};
            html += `<tr>
                <td>${escapeHTML(agency.number)}${agency.duplicate ? ' <span class="badge badge-warning">مكررة</span>' : ""}</td>
                <td>${escapeHTML(AGENCY_NAMES[agency.type] || agency.type || "-")}</td>
                <td>${money(agency.status === "cancelled" ? 0 : agency.basePrice)}</td>
                <td>${money(agency.status === "cancelled" ? 0 : agency.representativeAmount)}</td>
                <td>مرافعة: ${number(ms.pleading)}<br>إسعاف: ${number(ms.ambulance)}<br>معونة: ${number(ms.aid)}</td>
                <td>${formatAgencyAdditions(agency)}</td>
                <td>${formatNotesHTML(agency.notes)}</td>
                <td class="total-col"><strong>${money(getAgencyGrandTotal(agency))}</strong></td>
            </tr>`;
        });
        html += `</tbody></table></div></div>`;
    } else {
        html += `
            <div class="report-card">
                <h3>الطوابع الناقصة</h3>
                <table><thead><tr><th>النوع</th><th>العدد</th><th>القيمة</th></tr></thead><tbody>
                    <tr><td>مرافعة</td><td>${stats.missing.pleading}</td><td>${money(stats.missing.pleading * number(stampPrices.pleading))}</td></tr>
                    <tr><td>إسعاف</td><td>${stats.missing.ambulance}</td><td>${money(stats.missing.ambulance * number(stampPrices.ambulance))}</td></tr>
                    <tr><td>معونة</td><td>${stats.missing.aid}</td><td>${money(stats.missing.aid * number(stampPrices.aid))}</td></tr>
                    <tr><th>الإجمالي</th><th>${stats.missing.pleading + stats.missing.ambulance + stats.missing.aid}</th><th>${money(stats.missingValue)}</th></tr>
                </tbody></table>
            </div>

            <div class="report-card">
                <h3>الإضافات والتوقيعات</h3>
                <div class="table-wrapper"><table><thead><tr><th>الإضافة</th><th>العدد</th><th>القيمة النقدية</th></tr></thead><tbody>
        `;
        Object.keys(ADDITION_NAMES).forEach(function(key){
            const count = stats.active.reduce(function(sum,a){ return sum + number(a.additions && a.additions[key]); },0);
            const cash = stats.active.reduce(function(sum,a){ return sum + number(a.additionValues && a.additionValues[key]); },0);
            html += `<tr><td>${ADDITION_NAMES[key]}</td><td>${count}</td><td>${money(cash)}</td></tr>`;
        });
        html += `</tbody></table></div></div>
            <div class="report-card"><h3>ملاحظات الوكالات</h3><div class="notes-list">`;
        stats.agencies.forEach(function(agency){
            if (agency.notes) html += `<div class="report-note"><strong>الوكالة ${escapeHTML(agency.number)}:</strong> ${formatNotesHTML(agency.notes)}</div>`;
        });
        if (!stats.agencies.some(function(a){ return a.notes; })) html += `<div>لا توجد ملاحظات مسجلة.</div>`;
        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

function showFinalRecordReport(id, mode) {
    const record = records.find(function(item){ return item.id === id; });
    if (!record) return;
    const modalContent = document.getElementById("modalContent");
    const modal = document.getElementById("recordModal");
    if (!modalContent || !modal) return;
    modalContent.innerHTML = buildFinalRecordReport(record, mode || "summary");
    modal.classList.remove("hidden");
}

function printFinalRecordReport(id, mode) {
    const record = records.find(function(item){ return item.id === id; });
    if (!record) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة."); return; }
    const reportFileTitle = `تقرير سجل ${record.recordNumber} - ${record.officeName} - ${record.representativeName}`;
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${escapeHTML(reportFileTitle)}</title><link rel="stylesheet" href="style.css"><style>@media print{.no-print{display:none!important}}body{padding:20px}</style></head><body>${buildFinalRecordReport(record, mode || "summary")}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function(){ printWindow.print(); }, 400);
}

window.showFinalRecordReport = showFinalRecordReport;
window.printFinalRecordReport = printFinalRecordReport;

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


const allAgencies = [];


records.forEach(
    function (record) {

        record.agencies.forEach(
            function (agency) {

                allAgencies.push(
                    {

                        ...agency,

                        recordNumber:
                            record.recordNumber,

                        representativeName:
                            record.representativeName,

                        officeName:
                            record.officeName

                    }
                );

            }
        );

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
    );


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

    <div class="report-total">

        <h2>
            الإجمالي العام
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
                    ${activeAgencies.length}
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
                    المطلوب من جميع المندوبين
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

            <tr>

                <td>
                    ${AGENCY_NAMES[type]}
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
                            المطلوب
                        </th>

                    </tr>

                </thead>

                <tbody>

`;


const representativeMap = {};


records.forEach(
    function (record) {

        const name =
            record.representativeName;


        if (
            !representativeMap[name]
        ) {

            representativeMap[name] = {

                records:
                    0,

                agencies:
                    0,

                amount:
                    0

            };

        }


        representativeMap[name]
            .records += 1;


        representativeMap[name]
            .agencies +=
                record.agencies.length;


        representativeMap[name]
            .amount +=
                getRecordRepresentativeTotal(
                    record
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
                colspan="4"
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
            حصة المندوب من بدل الانتقال
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
            المبلغ النقدي المتبقي من بدل الانتقال
        </label>

        <input
            type="number"
            min="0"
            id="globalTransportCash"
            value="${transportSettings.cashRemainder}"
        >

    </div>

`;

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


        const globalTransportCash =
            document.getElementById(
                "globalTransportCash"
            );


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


        if (globalTransportCash) {

            transportSettings.cashRemainder =
                number(
                    globalTransportCash.value
                );

        }


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


records.forEach(
    function (record) {

        record.agencies.forEach(
            function (agency) {

                agencies.push(
                    agency
                );

            }
        );

    }
);


const cancelled =
    agencies.filter(
        function (agency) {

            return (
                agency.status ===
                "cancelled"
            );

        }
    ).length;


const missingCount =
    agencies.filter(
        function (agency) {

            return (
                agency.status ===
                "missing"
            );

        }
    ).length;


const representativeTotal =
    agencies.reduce(
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


const totalRecords =
    document.getElementById(
        "totalRecords"
    );


const totalAgencies =
    document.getElementById(
        "totalAgencies"
    );


const cancelledAgencies =
    document.getElementById(
        "cancelledAgencies"
    );


const missingAgencies =
    document.getElementById(
        "missingAgencies"
    );


const totalRepresentativeAmount =
    document.getElementById(
        "totalRepresentativeAmount"
    );


if (totalRecords) {

    totalRecords.textContent =
        records.length;

}


if (totalAgencies) {

    totalAgencies.textContent =
        agencies.length;

}


if (cancelledAgencies) {

    cancelledAgencies.textContent =
        cancelled;

}


if (missingAgencies) {

    missingAgencies.textContent =
        missingCount;

}


if (totalRepresentativeAmount) {

    totalRepresentativeAmount.textContent =
        money(
            representativeTotal
        );

}


const latest =
    records
        .slice()
        .reverse()
        .slice(
            0,
            5
        );


const container =
    document.getElementById(
        "latestRecords"
    );


if (!container) {
    return;
}


if (
    latest.length ===
    0
) {

    container.innerHTML =
        "<p>لا توجد سجلات.</p>";

    return;

}


container.innerHTML =
    latest
        .map(
            function (record) {

                return `

                    <div class="agency-item">

                        <div>

                            <strong>
                                سجل رقم
                                ${escapeHTML(
                                    record.recordNumber
                                )}
                            </strong>

                            <br>

                            المكتب:
                            ${escapeHTML(
                                record.officeName
                            )}

                            <br>

                            المندوب:
                            ${escapeHTML(
                                record.representativeName
                            )}

                        </div>


                        <strong>

                            المطلوب:
                            ${money(
                                getRecordRepresentativeTotal(
                                    record
                                )
                            )}

                        </strong>

                    </div>

                `;

            }
        )
        .join("");

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


            currentUserElement.textContent =
                currentUser.username +
                " - " +
                getRoleName(
                    currentUser.role
                );


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

function agencyAdditionsToText(agency) {

    const parts = [];

    Object.keys(ADDITION_NAMES).forEach(function (key) {

        const count = number(agency.additions && agency.additions[key]);

        if (count > 0) {
            parts.push(ADDITION_NAMES[key] + ": " + count);
        }

    });

    return parts.length ? parts.join("، ") : "-";

}

function exportRecordToExcel(id) {

    if (typeof XLSX === "undefined") {
        alert("تعذر تحميل مكتبة تصدير الإكسل. تأكد من الاتصال بالإنترنت وحاول مجدداً.");
        return;
    }

    const record = records.find(function (r) { return r.id === id; });

    if (!record) {
        return;
    }

    const stats = getRecordFinalStats(record);

    const infoSheetData = [
        ["رقم السجل", record.recordNumber],
        ["اسم المكتب", record.officeName],
        ["اسم المندوب", record.representativeName],
        [],
        ["عدد الوكالات الفعالة", stats.active.length],
        ["عدد الوكالات الملغاة", stats.cancelled],
        ["عدد الوكالات المفقودة", stats.missingAgenciesCount],
        ["المطلوب من المندوب", stats.representativeTotal],
        ["إجمالي الإضافات النقدية", stats.additionsTotal],
        ["قيمة الطوابع الناقصة", stats.missingValue]
    ];

    const agenciesSheetData = [
        [
            "رقم الوكالة",
            "مكررة",
            "النوع",
            "الحالة",
            "السعر",
            "المطلوب من المندوب",
            "نقص مرافعة",
            "نقص إسعاف",
            "نقص معونة",
            "قيمة الطوابع الناقصة",
            "الإضافات",
            "القيمة النقدية للإضافات",
            "الملاحظات",
            "الإجمالي (السعر + الإضافات)"
        ]
    ];

    stats.agencies
        .slice()
        .sort(function (a, b) {
            return number(a.number) - number(b.number);
        })
        .forEach(function (agency) {

            const ms = agency.stamps || agency.missingStamps || {};

            agenciesSheetData.push([
                agency.number,
                agency.duplicate ? "نعم" : "لا",
                AGENCY_NAMES[agency.type] || agency.type || "-",
                getAgencyStatusName(agency.status),
                agency.status === "cancelled" ? 0 : number(agency.basePrice),
                agency.status === "cancelled" ? 0 : number(agency.representativeAmount),
                number(ms.pleading),
                number(ms.ambulance),
                number(ms.aid),
                number(agency.missingStampsValue),
                agencyAdditionsToText(agency),
                number(agency.additionsTotal),
                agency.notes || "-",
                getAgencyGrandTotal(agency)
            ]);

        });

    const workbook = XLSX.utils.book_new();

    const infoSheet = XLSX.utils.aoa_to_sheet(infoSheetData);
    const agenciesSheet = XLSX.utils.aoa_to_sheet(agenciesSheetData);

    XLSX.utils.book_append_sheet(workbook, infoSheet, "بيانات السجل");
    XLSX.utils.book_append_sheet(workbook, agenciesSheet, "الوكالات");

    const fileName =
        "سجل-" +
        sanitizeFileNamePart(record.recordNumber) + "-" +
        sanitizeFileNamePart(record.officeName) + "-" +
        sanitizeFileNamePart(record.representativeName) +
        ".xlsx";

    XLSX.writeFile(workbook, fileName);

}

window.exportRecordToExcel = exportRecordToExcel;

function exportAllRecordsToExcel() {

    if (typeof XLSX === "undefined") {
        alert("تعذر تحميل مكتبة تصدير الإكسل. تأكد من الاتصال بالإنترنت وحاول مجدداً.");
        return;
    }

    const allAgencies = [];

    records.forEach(function (record) {
        record.agencies.forEach(function (agency) {
            allAgencies.push(agency);
        });
    });

    const activeAgencies = allAgencies.filter(function (agency) {
        return agency.status !== "cancelled";
    });

    const totalBase = activeAgencies.reduce(function (sum, agency) {
        return sum + number(agency.basePrice);
    }, 0);

    const totalAdditions = activeAgencies.reduce(function (sum, agency) {
        return sum + number(agency.additionsTotal);
    }, 0);

    const totalStamps = activeAgencies.reduce(function (sum, agency) {
        return sum + number(agency.missingStampsValue);
    }, 0);

    const totalRepresentative = activeAgencies.reduce(function (sum, agency) {
        return sum + number(agency.representativeAmount);
    }, 0);

    const cancelledCount = allAgencies.length - activeAgencies.length;

    const missingCount = allAgencies.filter(function (agency) {
        return agency.status === "missing";
    }).length;

    const totalsSheetData = [
        ["إجمالي سعر الوكالات", totalBase],
        ["إجمالي الإضافات النقدية", totalAdditions],
        ["قيمة الطوابع الناقصة", totalStamps],
        ["عدد الوكالات الفعالة", activeAgencies.length],
        ["الوكالات الملغاة", cancelledCount],
        ["الوكالات المفقودة", missingCount],
        ["المطلوب من جميع المندوبين", totalRepresentative]
    ];

    const recordsSheetData = [
        [
            "رقم السجل",
            "المكتب",
            "المندوب",
            "عدد الوكالات",
            "الفعالة",
            "الملغاة",
            "المفقودة",
            "السعر الأساسي",
            "الإضافات",
            "الطوابع الناقصة",
            "المطلوب من المندوب"
        ]
    ];

    records.forEach(function (record) {

        const stats = getRecordFinalStats(record);

        recordsSheetData.push([
            record.recordNumber,
            record.officeName,
            record.representativeName,
            record.agencies.length,
            stats.active.length,
            stats.cancelled,
            stats.missingAgenciesCount,
            stats.byType
                ? Object.keys(stats.byType).reduce(function (sum, type) {
                    return sum + stats.byType[type].total;
                }, 0)
                : 0,
            stats.additionsTotal,
            stats.missingValue,
            stats.representativeTotal
        ]);

    });

    const workbook = XLSX.utils.book_new();

    const totalsSheet = XLSX.utils.aoa_to_sheet(totalsSheetData);
    const recordsSheet = XLSX.utils.aoa_to_sheet(recordsSheetData);

    XLSX.utils.book_append_sheet(workbook, totalsSheet, "الإجمالي العام");
    XLSX.utils.book_append_sheet(workbook, recordsSheet, "السجلات");

    const dateStr = new Date().toISOString().slice(0, 10);

    XLSX.writeFile(workbook, "التقرير-العام-" + dateStr + ".xlsx");

}

window.exportAllRecordsToExcel = exportAllRecordsToExcel;

/* =========================================================
تصدير PDF (تحميل ملف مباشرة)
========================================================= */

function exportHTMLToPDF(innerHTML, fileName, landscape) {

    if (typeof html2pdf === "undefined") {
        alert("تعذر تحميل مكتبة تصدير PDF. تأكد من الاتصال بالإنترنت وحاول مجدداً.");
        return;
    }

    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.top = "0";
    holder.style.left = "-10000px";
    holder.style.zIndex = "-1";

    const root = document.createElement("div");
    root.className = "pdf-export-root";
    root.dir = "rtl";
    root.innerHTML = innerHTML;

    root.querySelectorAll(".no-print, .report-actions, button").forEach(function (el) {
        el.remove();
    });

    holder.appendChild(root);
    document.body.appendChild(holder);

    const options = {
        margin: [8, 8, 8, 8],
        filename: fileName,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".report-grid > div"] }
    };

    html2pdf()
        .set(options)
        .from(root)
        .save()
        .then(function () {
            holder.remove();
        })
        .catch(function (error) {
            console.error(error);
            holder.remove();
            alert("حدث خطأ أثناء إنشاء ملف PDF.");
        });

}

function exportRecordToPDF(id, mode) {

    const record = records.find(function (r) { return r.id === id; });

    if (!record) {
        return;
    }

    const fileName =
        "تقرير سجل " +
        sanitizeFileNamePart(record.recordNumber) + " - " +
        sanitizeFileNamePart(record.officeName) + " - " +
        sanitizeFileNamePart(record.representativeName) +
        ".pdf";

    exportHTMLToPDF(
        buildFinalRecordReport(record, mode || "summary"),
        fileName,
        mode === "detailed"
    );

}

window.exportRecordToPDF = exportRecordToPDF;

function exportReportsToPDF() {

    const container = document.getElementById("reportsContent");

    if (!container) {
        return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);

    exportHTMLToPDF(
        container.innerHTML,
        "التقرير العام " + dateStr + ".pdf",
        false
    );

}

window.exportReportsToPDF = exportReportsToPDF;

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

["recordNumber", "officeName", "representativeName"].forEach(function (id) {
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
