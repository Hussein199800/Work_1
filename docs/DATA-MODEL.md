# نموذج البيانات والتخزين

> ⚠️ هذه البيانات حقيقية ولا نسخة لها إلا في متصفح المستخدم. أي تغيير هنا **إضافي فقط**: لا تحذف حقلاً، لا تغيّر معناه، لا تغيّر اسم مفتاح.

## مفاتيح localStorage (بيانات — لا تُمس أسماؤها)
| المفتاح | المحتوى |
|---|---|
| `audit_users` | المستخدمون `{id, username, password, role}`؛ الأدوار `manager` / `auditor` / `viewer` |
| `audit_prices` | الأسعار الأساسية لكل نوع `{agency, representative}` (تُستخدم للسجلات قبل أول جدول فترات) |
| `audit_addition_prices` | أسعار الإضافات |
| `audit_addition_stamp_status` | أي إضافة تُحسب كطابع مرافعة |
| `audit_transport_settings` | إعدادات بدل الانتقال |
| `audit_stamp_prices` | أسعار الطوابع |
| `audit_records` | السجلات (إن لم تُنقل إلى IndexedDB) |
| `audit_records_store` | `"idb"` = السجلات في IndexedDB فقط |
| `audit_price_schedule` | أسعار حسب الفترات `[{id, from:"YYYY-MM-DD" (قديماً "YYYY-MM"), prices:{type:{agency, representative}}}]` |
| `audit_committee_shares` | مبالغ الحصص الثابتة (للتوافق فقط) |
| `audit_committee_rates` | نسب الحصص % من سعر الوكالة لكل نوع `{type:{ambulance, cooperation}}` |
| `audit_council_share`, `audit_council_saved` | حصة المجلس |
| `audit_audit_committee` | (23/11/2026) توقيعات التقارير (لجنة التدقيق فقط): `{chair, members:[4], chairTitle?, memberTitles?:[4], heading?}` — الصفات والعنوان إضافية، الغائب = الافتراضي. في النسخة الاحتياطية (`auditCommittee`) والمزامنة |
| `audit_fee_destinations` | (16/11/2026) جهة رسوم كل بند نقص: `{pleading, ambulance, aid, receipt}` = `"central"` (النقابة المركزية) أو `"branch"` (الفرع). الافتراضي: الطوابع للمركزية والإيصال للفرع. يدخل النسخة الاحتياطية (`feeDestinations`) ومزامنة Firebase |
| `audit_record_draft` | مسودة السجل غير المحفوظ |
| `currentUser`, `activeSection` | الجلسة والقسم المفتوح |

تفضيلات واجهة (ليست بيانات، يمكن أن تضيع دون ضرر): `audit_ui_theme`, `audit_ui_records_view`, `audit_ui_activity_period`, `audit_ui_last_auditors`, `audit_ui_backup_state`, `audit_ui_seq_check`, `audit_ui_font_scale` (حجم خط الموقع 0.85–1.3)، `audit_ui_report` (`{scale, recovery}`: حجم خط التقرير 0.8–1.4 وإدراج بيان الاستدراك)، `audit_ui_custom_reports` (`{templates, last}`: قوالب التقارير المخصّصة لهذا الجهاز)، `audit_ui_telegram` (رمز البوت — لا يدخل النسخ الاحتياطية ولا المستودع)، `audit_ui_firebase` (حالة المزامنة لهذا الجهاز: `signedIn, uid, base{id:hash}, lastPull, settingsBase, settingsLocalHash, settingsChangedAt, lastSyncAt` — حذفه يعني فقط مزامنة أولى جديدة).

## Firebase (اختياري)
نسخة متزامنة على Firestore في مساحة مشتركة: `workspaces/idlib/records/{id}` و`workspaces/idlib/meta/settings`. التفاصيل والقواعد في [`FIREBASE.md`](FIREBASE.md). البيانات المحلية تبقى الأصل.

## IndexedDB
- `audit_db` → مخزن `kv` → مفتاح `audit_records`: السجلات حين `audit_records_store === "idb"`. **لا تحذف هذه القاعدة أبداً.**
- `audit_db` → `kv` → `audit_records_rev` (17/11/2026، إضافي): رقم نسخة السجلات. يُقارن ويُكتب مع السجلات في معاملة واحدة؛ إن كتبت نافذة أخرى بعد أن قرأت هذه النافذة يُرفض حفظها («أعد التحميل»). غيابه = لا رقم بعد.
- `audit_ui_db` → `handles`: مقبض مجلد النسخ التلقائي فقط.

## السجل (record)
```js
{
  id, recordNumber, officeName, representativeName,
  representativeType: "internal" | "external",
  recordDate: "YYYY-MM-DD",          // قديماً قد يغيب → getRecordDay() يرجع إلى createdAt
  agencies: [ /* وكالات */ ],
  auditors: ["اسم", "اسم"],          // اختياري، داخل البرنامج فقط، لا يظهر في التقارير
  recovery: { centralReceipt, centralDate, branchReceipt, branchDate, text },  // اختياري (16/11/2026): إيصالات «بيان استدراك النقص» — تُكتب من نافذة التقرير
  source: { kind: "site"|"manual", name },   // اختياري (23/11/2026): سجل مسترد من موقع تدقيق آخر أو تدقيق يدوي (agencies = [])
  summary: { agencyCount, amountDue },       // اختياري: ملخص السجل المسترد كما في مصدره
  deduction: { amount, reason },     // اختياري (19/11/2026): المقاصة — حسم للمندوب وسببه؛ ينقص المطلوب منه فقط (getRecordNetDue)
  payment: { status: "paid", at, by, day, receipt }, // اختياري (24/11/2026): حالة القبض؛ الغياب = غير مقبوض. day = تاريخ القبض «YYYY-MM-DD» (القديم بلا day: يوم at)، receipt = رقم إيصال القبض (اختياري)
  history: [{ at, by, action, detail }], // اختياري (24/11/2026): سجل التعديلات (create/edit/paid/unpaid/recovery/price/import)، حد 200 سطر
  recordNote: "نص",                  // اختياري (3/11/2026): ملاحظة على السجل كاملاً — مربع في التقرير وExcel؛ يُحفظ فقط إن كُتب
  createdAt, updatedAt               // ISO
}
```

## الوكالة (agency) — داخل `record.agencies`
```js
{
  id, number: "12", type: "general"|"special"|"legal"|"executive"|"certified_general_special"|"certified_legal",
  typeName, status: "active"|"cancelled"|"missing", duplicate: false,
  basePrice,               // سعر الوكالة المحفوظ — منه تُحسب حصتا الإسعاف والتعاون
  representativeBase,      // حصة الفرع
  representativeAmount,    // المطلوب من المندوب = حصة الفرع + الإضافات النقدية + الطوابع الناقصة (+ فروق البدل)
  additions: {save, signature, inheritance, children, agents, originality, transport},
  additionValues, additionsTotal, pleadingAdditions,
  stamps: {pleading, ambulance, aid, receipt}, missingStampsValue, pleadingRequired,
                           // receipt (3/11/2026، اختياري): عدد «إيصال حد أدنى أتعاب» — يُحمَّل على المندوب مثل نقص الطابع
                           // بسعر stampPrices.receipt (افتراضي 150) ولا يغيّر قيمة الوكالة؛ غيابه = 0
  notes, transportInAdditions, transportSettings,
  appliedPrices: { agency, representative, priceMonth, additions, transport, stamps },  // الأسعار وقت الحفظ
  pricePeriod,             // اختياري (20/10/2026): "" أو غائب = حسب تاريخ السجل؛ "YYYY-MM-DD" = جدول فترة بعينه؛ "base" = الأسعار الأساسية
  customPrice,             // اختياري (21/10/2026): سعر محدد من «تغيير سعر وكالات محفوظة» — يغلب الفترة
  customRepresentative,    // اختياري: حصة الفرع المحددة معه
  priceHistory             // اختياري: [{batch, at, basePrice, representativeBase, representativeAmount, hadApplied, appliedAgency, appliedRepresentative, priceMonth}] — للتراجع عن إعادة التسعير
}
```
السجلات القديمة قد تنقصها `appliedPrices` أو `pricePeriod` أو غيرها — اقرأها بقيم افتراضية وقت القراءة، ولا تفترض وجودها.

## النسخة الاحتياطية (`version: 1`)
`downloadBackup()` / `buildBackupJSON()` تكتب: `appName, version: 1, exportedAt, users, prices, additionPrices, additionStampStatus, transportSettings, stampPrices, committeeShares, committeeRates, priceSchedule, councilSaved, feeDestinations (منذ 16/11/2026؛ غيابه في ملف أقدم = تبقى الجهات كما هي), records`.
`restoreBackupFromFile()` يقرأ JSON عادياً أو مضغوطاً gzip (`.json.gz`). يجب أن يبقى قادراً على قراءة الملفات القديمة.
