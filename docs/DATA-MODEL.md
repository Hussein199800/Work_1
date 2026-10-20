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
| `audit_record_draft` | مسودة السجل غير المحفوظ |
| `currentUser`, `activeSection` | الجلسة والقسم المفتوح |

تفضيلات واجهة (ليست بيانات، يمكن أن تضيع دون ضرر): `audit_ui_theme`, `audit_ui_records_view`, `audit_ui_activity_period`, `audit_ui_last_auditors`, `audit_ui_backup_state`, `audit_ui_seq_check`, `audit_ui_telegram` (رمز البوت — لا يدخل النسخ الاحتياطية ولا المستودع).

## IndexedDB
- `audit_db` → مخزن `kv` → مفتاح `audit_records`: السجلات حين `audit_records_store === "idb"`. **لا تحذف هذه القاعدة أبداً.**
- `audit_ui_db` → `handles`: مقبض مجلد النسخ التلقائي فقط.

## السجل (record)
```js
{
  id, recordNumber, officeName, representativeName,
  representativeType: "internal" | "external",
  recordDate: "YYYY-MM-DD",          // قديماً قد يغيب → getRecordDay() يرجع إلى createdAt
  agencies: [ /* وكالات */ ],
  auditors: ["اسم", "اسم"],          // اختياري، داخل البرنامج فقط، لا يظهر في التقارير
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
  stamps: {pleading, ambulance, aid}, missingStampsValue, pleadingRequired,
  notes, transportInAdditions, transportSettings,
  appliedPrices: { agency, representative, priceMonth, additions, transport, stamps },  // الأسعار وقت الحفظ
  pricePeriod,             // اختياري (20/10/2026): "" أو غائب = حسب تاريخ السجل؛ "YYYY-MM-DD" = جدول فترة بعينه؛ "base" = الأسعار الأساسية
  priceHistory             // اختياري: [{batch, at, basePrice, representativeBase, representativeAmount, hadApplied, appliedAgency, appliedRepresentative, priceMonth}] — للتراجع عن إعادة التسعير
}
```
السجلات القديمة قد تنقصها `appliedPrices` أو `pricePeriod` أو غيرها — اقرأها بقيم افتراضية وقت القراءة، ولا تفترض وجودها.

## النسخة الاحتياطية (`version: 1`)
`downloadBackup()` / `buildBackupJSON()` تكتب: `appName, version: 1, exportedAt, users, prices, additionPrices, additionStampStatus, transportSettings, stampPrices, committeeShares, committeeRates, priceSchedule, councilSaved, records`.
`restoreBackupFromFile()` يقرأ JSON عادياً أو مضغوطاً gzip (`.json.gz`). يجب أن يبقى قادراً على قراءة الملفات القديمة.
