# المزامنة مع Firebase

استخدام الموقع من أي جهاز بحساب Google واحد. البيانات المحلية تبقى هي الأصل؛ Firebase نسخة متزامنة.

## الإعداد (مرة واحدة — تم لمشروع `work-1-c2965`)
1. مشروع Firebase (خطة Spark المجانية تكفي).
2. Authentication ← Google ← Enable، وإضافة `hussein199800.github.io` إلى **Authorized domains**.
3. Firestore Database ← Production mode.
4. **قواعد الأمان** (Firestore ← Rules) — ضع بريد المالك بدل `OWNER_EMAIL`، ثم **Publish**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid
        && request.auth.token.email == "OWNER_EMAIL"
        && request.auth.token.email_verified == true;
    }
  }
}
```
بدون هذه القواعد (وضع الإنتاج الافتراضي) يُرفض كل شيء — آمن لكن المزامنة لا تعمل.

إعدادات الويب (`FIREBASE_CONFIG` في `script.js`) ليست سراً: تظهر في أي موقع يستخدم Firebase، والحماية بالقواعد أعلاه.

## شكل البيانات في Firestore
- `users/{uid}/records/{recordId}` = `{ id, json, hash, deleted, updatedAt, syncedAt }`
  - `json`: السجل كاملاً كنص (يتجنب قيود Firestore على المصفوفات المتداخلة والقيم `undefined`).
  - `hash`: بصمة المحتوى بترتيب مفاتيح ثابت (`fbRecordHash`).
  - `deleted: true` = سجل حُذف (علامة حذف بلا محتوى).
  - `syncedAt`: وقت الخادم — للجلب التدريجي.
- `users/{uid}/meta/settings` = `{ json, hash, changedAt, records, syncedAt }` — نصوص مفاتيح الإعدادات (`FB_SETTINGS_KEYS`: المستخدمون، الأسعار، الإضافات، الطوابع، البدل، الجداول، الحصص، المجلس).

## خوارزمية المزامنة (`fbSync`)
لكل سجل: `base` = بصمة آخر نسخة متزامنة على هذا الجهاز (`audit_ui_firebase.base`)، `L` = المحلي، `R` = البعيد.
| الحالة | الإجراء |
|---|---|
| `L == R` | لا شيء |
| تغيّر المحلي فقط | رفع |
| تغيّر البعيد فقط | تطبيق هنا (إضافة/تحديث/حذف) |
| تغيّر الاثنان | الأحدث `updatedAt` يفوز، بعد نسخة احتياطية هادئة؛ **الحذف لا يغلب تعديلاً** |
| أول مزامنة للجهاز | تنزيل نسخة احتياطية كاملة أولاً؛ السجلات تُجمع من الطرفين |

الإعدادات وحدة واحدة بالمنطق نفسه. حسم التعارض: الأحدث تعديلاً (`settingsChangedAt`)؛ إعدادات لم تُعدَّل قط تُقدَّر بوجود سجلات معها، فلا يكتب جهاز جديد فارغ أسعاره الافتراضية فوق جهاز فيه سجلات مهما كان ترتيب الدخول؛ التعادل للنسخة المشتركة. تطبيق إعدادات بعيدة = كتابة المفاتيح ثم إعادة تحميل الصفحة (يؤجَّل إن كان هناك وكالات مضافة لم تُحفظ).

## متى تعمل
- عند فتح الموقع إن سبق الدخول على هذا الجهاز، وبعد كل `persistRecords()` (بعد 4 ثوانٍ، تُجمع الحفظات)، وعند عودة الاتصال، وعند العودة إلى الصفحة (مرة في الدقيقة على الأكثر)، وزر «مزامنة الآن».
- لا مزامنة إذا تعذّرت قراءة السجلات (`recordsLoadFailed`).
- مكتبات Firebase لا تُحمَّل إلا إذا فُعّلت المزامنة على الجهاز.

## الاختبار
لا يمكن الوصول إلى Firebase الحقيقي في بيئات الاختبار المعزولة. الكود يقبل واجهة بديلة `window.__FB_TEST_BACKEND` (نفس دوال `fbBackend`: `onUser, signIn, signOut, pullRecords, getSettings, pushRecords, pushSettings`) لاختبار جهازين على مخزن مشترك في الذاكرة.
