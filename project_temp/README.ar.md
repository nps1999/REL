# PRESTIGE DESIGNS - متجر التصاميم الاحترافي

متجر إلكتروني متكامل لبيع التصاميم والأوفرلايات للستريمرز وصناع المحتوى، بتصميم "Liquid Glass" الداكن مع لمسات بنفسجية أنيقة.

## 🎨 الميزات الرئيسية

### للعملاء
- ✅ **نظام أقسام ديناميكي**: كل قسم له رابط خاص ويعرض منتجاته فقط
- ✅ **صفحات منتجات مخصصة**: كل منتج له صفحة تفصيلية مع صور وفيديو يوتيوب
- ✅ **سلة تسوق ذكية**: تُحفظ تلقائياً حتى إتمام عملية الشراء
- ✅ **منتجات مجانية**: إمكانية إضافة منتجات مجانية بدون بوابة دفع
- ✅ **تسجيل دخول سهل**: عبر Google أو Discord
- ✅ **نظام ولاء**: اكسب نقاطاً مع كل عملية شراء
- ✅ **أكواد خصم**: إمكانية استخدام أكواد الخصم
- ✅ **دفع آمن**: عبر PayPal
- ✅ **تقييمات العملاء**: carousel متحرك تلقائياً
- ✅ **قائمة مفضلة**: احفظ المنتجات المفضلة

### للمدراء
- 📊 **لوحة تحكم شاملة**: إحصائيات مفصلة
- 📦 **إدارة المنتجات**: إضافة/تعديل/حذف المنتجات
- 📂 **إدارة الأقسام**: ترتيب وتنظيم الأقسام
- 🎫 **أكواد الخصم**: إنشاء وإدارة أكواد الخصم
- 👥 **إدارة المستخدمين**: عرض وتعديل بيانات المستخدمين
- ⭐ **إدارة التقييمات**: الموافقة على التقييمات أو رفضها
- ⚙️ **إعدادات المتجر**: تخصيص الشعار والسلايدر وروابط التواصل
- 🔔 **إشعارات Discord**: webhook يرسل تفاصيل كل طلب جديد

## 🛠️ التقنيات المستخدمة

- **Frontend**: Next.js 14+ (App Router) + React
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MongoDB + Mongoose
- **Authentication**: NextAuth.js (Google, Discord)
- **Payment**: PayPal SDK
- **Notifications**: Discord Webhooks

## 📋 المتطلبات

### متغيرات البيئة المطلوبة (.env)

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/prestige_designs

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
PAYPAL_MODE=sandbox

# Discord Webhook (اختياري)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url

# Admin Email
ADMIN_EMAIL=admin@example.com

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🚀 التشغيل

1. **تثبيت المكتبات**:
```bash
yarn install
```

2. **تكوين ملف .env**:
   - انسخ `.env.example` إلى `.env`
   - أضف جميع المفاتيح المطلوبة

3. **تشغيل المشروع**:
```bash
yarn dev
```

4. **الوصول للتطبيق**:
   - المتجر: `http://localhost:3000`
   - لوحة التحكم: `http://localhost:3000/admin`

## 📁 هيكل المشروع

```
/app
├── /app                    # صفحات Next.js
│   ├── page.js            # الصفحة الرئيسية
│   ├── /category/[slug]   # صفحات الأقسام
│   ├── /product/[slug]    # صفحات المنتجات
│   ├── /cart              # سلة التسوق
│   ├── /checkout          # صفحة الدفع
│   ├── /orders            # طلباتي
│   ├── /admin             # لوحة التحكم
│   └── /api               # API Routes
├── /lib                   # مكتبات مساعدة
│   ├── mongodb.js         # اتصال MongoDB
│   ├── auth.js            # إعدادات NextAuth
│   ├── paypal.js          # PayPal SDK
│   └── security.js        # أدوات الأمان
└── /public                # ملفات ثابتة
```

## 🔒 الأمان

- ✅ Rate limiting لمنع الطلبات الزائدة
- ✅ Input sanitization لمنع XSS
- ✅ MongoDB query sanitization لمنع injection
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ تشفير كلمات المرور
- ✅ حماية CSRF للنماذج

## 🎯 الميزات المنفذة

### نظام التوجيه والروابط ✅
- [x] صفحات ديناميكية للأقسام (`/category/[slug]`)
- [x] صفحات ديناميكية للمنتجات (`/product/[slug]`)
- [x] روابط SEO-friendly
- [x] زر "رجوع للقائمة الرئيسية" في صفحات الأقسام

### التصميم والواجهة ✅
- [x] إزالة اسم المتجر من بجانب اللوجو في الهيدر
- [x] اسم المتجر بالألوان البنفسجية في الفوتر
- [x] favicon مخصص (شعار المتجر)
- [x] شعارات حقيقية للدفع (PayPal, Visa, Mastercard)
- [x] ألوان أزرار التواصل بنفس ثيم المتجر
- [x] إيموجيات الأسئلة الشائعة بألوان بنفسجية

### التقييمات والتفاعل ✅
- [x] Carousel متحرك تلقائياً (من اليسار لليمين)
- [x] أسهم للتحكم اليدوي
- [x] تصميم متناسق وأنيق

### السلة والطلبات ✅
- [x] حفظ السلة في localStorage
- [x] دعم المنتجات المجانية (تخطي بوابة الدفع)
- [x] زر مخصص للطلبات المجانية
- [x] تسجيل الدخول إلزامي لإتمام الشراء

### Discord Webhook ✅
- [x] إرسال إشعار Discord عند كل طلب
- [x] Embed منسق بجميع تفاصيل الطلب:
  - رقم الطلب
  - اسم العميل
  - البريد الإلكتروني
  - رقم الواتساب
  - المبلغ الإجمالي
  - حالة الدفع
  - قائمة المنتجات
  - ملاحظات العميل (إن وجدت)

### الأمان والحماية ✅
- [x] دوال أمان في `/lib/security.js`
- [x] Rate limiting
- [x] Input sanitization
- [x] MongoDB query sanitization
- [x] Security headers

## 📝 ملاحظات مهمة

1. **المنتجات المجانية**:
   - عند تعيين سعر المنتج = 0، يتم تخطي بوابة الدفع
   - العميل يدخل بياناته فقط ويتم إنشاء الطلب مباشرة

2. **Discord Webhook**:
   - أضف `DISCORD_WEBHOOK_URL` في `.env`
   - يتم إرسال إشعار تلقائي عند إتمام أي طلب

3. **أيقونات التواصل الاجتماعي**:
   - قابلة للتحرير من لوحة التحكم
   - يمكن إضافة: Facebook, Twitter, Instagram, Discord, WhatsApp, Telegram, YouTube, TikTok

4. **الأقسام**:
   - كل قسم له slug فريد
   - الرابط: `/category/[slug]`
   - تظهر فقط المنتجات التابعة للقسم

5. **المنتجات**:
   - كل منتج له slug فريد
   - الرابط: `/product/[slug]`
   - يمكن إضافة فيديو YouTube
   - خيارات تخصيص (ألوان، نصوص، إلخ)

## 🆘 الدعم

للمساعدة أو الاستفسارات:
- تواصل عبر الديسكورد
- أو عبر البريد الإلكتروني

---

**صُنع بـ 💜 لصناع المحتوى العرب**

© 2024 PRESTIGE DESIGNS - جميع الحقوق محفوظة
