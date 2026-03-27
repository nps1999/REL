# دليل حفظ الملفات والصور محلياً

## 📁 نظام تخزين الملفات المحلي

جميع البيانات في متجر PRESTIGE DESIGNS يتم حفظها محلياً على نفس الخادم:

### 1. قاعدة البيانات (MongoDB)
- **الموقع**: `mongodb://localhost:27017/prestige_designs`
- **ما يُحفظ**:
  - بيانات المنتجات (العنوان، الوصف، السعر، إلخ)
  - معلومات المستخدمين
  - الطلبات وتفاصيلها
  - التقييمات والتعليقات
  - أكواد الخصم
  - الإعدادات
  - روابط الملفات والصور فقط (URLs)

### 2. الملفات الثابتة (Public Files)
- **الموقع**: `/app/public/`
- **ما يُحفظ**:
  - صور المنتجات
  - صور السلايدر
  - الشعار
  - الملفات القابلة للتنزيل

### 3. رفع الملفات والصور

#### الطريقة الحالية:
حالياً، يتم حفظ **روابط URL** للصور والملفات في قاعدة البيانات فقط.

#### لتفعيل الرفع المحلي للملفات:

##### أ) إنشاء API لرفع الملفات

إنشاء ملف جديد: `/app/app/api/upload/route.js`

```javascript
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم اختيار ملف' },
        { status: 400 }
      );
    }

    // قراءة البيانات
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // إنشاء اسم فريد للملف
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s/g, '_');
    const filename = `${timestamp}_${originalName}`;

    // حفظ الملف في /public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filepath = path.join(uploadDir, filename);
    
    await writeFile(filepath, buffer);

    // إرجاع رابط الملف
    const fileUrl = `/uploads/${filename}`;
    
    return NextResponse.json({ 
      success: true,
      url: fileUrl,
      filename: filename
    });

  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    return NextResponse.json(
      { error: 'فشل رفع الملف' },
      { status: 500 }
    );
  }
}
```

##### ب) إنشاء مجلد uploads

```bash
mkdir -p /app/public/uploads
chmod 755 /app/public/uploads
```

##### ج) تحديث نموذج رفع الصور في لوحة التحكم

مثال على مكون رفع الصور:

```javascript
'use client'
import { useState } from 'react'

export default function ImageUploader({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // عرض معاينة
    setPreview(URL.createObjectURL(file))

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      
      if (data.success) {
        onUploadComplete(data.url)
        alert('تم رفع الصورة بنجاح!')
      }
    } catch (error) {
      alert('فشل رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {preview && (
        <img src={preview} alt="Preview" className="w-32 h-32 object-cover mt-2" />
      )}
      {uploading && <p>جاري الرفع...</p>}
    </div>
  )
}
```

### 4. أنواع الملفات المدعومة

#### الصور:
- `.jpg`, `.jpeg`
- `.png`
- `.webp`
- `.gif`

#### الملفات القابلة للتنزيل:
- `.zip` (ملفات التصاميم)
- `.psd` (ملفات Photoshop)
- `.ai` (ملفات Illustrator)
- `.mp4` (فيديوهات)

### 5. حد حجم الملفات

يمكنك تحديد حد أقصى لحجم الملف في `/app/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // حد 10 ميجابايت
    },
  },
}

module.exports = nextConfig
```

### 6. تنظيف الملفات القديمة

يمكنك إنشاء script لحذف الملفات غير المستخدمة:

```javascript
// scripts/cleanup-uploads.js
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

async function cleanupUnusedFiles() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const files = fs.readdirSync(uploadsDir);

  const client = await MongoClient.connect(process.env.MONGO_URL);
  const db = client.db();

  for (const file of files) {
    const fileUrl = `/uploads/${file}`;
    
    // البحث في المنتجات
    const product = await db.collection('products').findOne({ image: fileUrl });
    
    // البحث في الإعدادات
    const settings = await db.collection('settings').findOne({ 
      'slider.image': fileUrl 
    });

    // إذا لم يُستخدم الملف، احذفه
    if (!product && !settings) {
      fs.unlinkSync(path.join(uploadsDir, file));
      console.log(`تم حذف: ${file}`);
    }
  }

  await client.close();
}

cleanupUnusedFiles();
```

### 7. النسخ الاحتياطي

#### النسخ اليدوي:

```bash
# نسخ قاعدة البيانات
mongodump --db prestige_designs --out /backup/mongo/$(date +%Y%m%d)

# نسخ الملفات
cp -r /app/public/uploads /backup/uploads/$(date +%Y%m%d)
```

#### النسخ التلقائي (Cron Job):

```bash
# تعديل crontab
crontab -e

# إضافة مهمة يومية في الساعة 2 صباحاً
0 2 * * * /path/to/backup-script.sh
```

### 8. الملاحظات المهمة

1. **الأمان**:
   - تحقق من نوع الملف قبل الحفظ
   - تجنب السماح برفع ملفات تنفيذية (`.exe`, `.sh`)
   - استخدم مكتبات للتحقق من MIME types

2. **الأداء**:
   - ضغط الصور قبل الحفظ (استخدم Sharp أو ImageMagick)
   - استخدم CDN إذا كانت حركة المرور عالية

3. **المساحة**:
   - راقب مساحة القرص باستمرار
   - احذف الملفات غير المستخدمة دورياً

4. **الصلاحيات**:
   ```bash
   # تأكد من صلاحيات القراءة/الكتابة
   chmod 755 /app/public/uploads
   chown -R www-data:www-data /app/public/uploads
   ```

### 9. استرجاع الملفات

لعرض جميع الملفات المحفوظة:

```bash
# عرض جميع الصور
ls -lh /app/public/uploads/*.{jpg,png,webp}

# عرض حجم المجلد
du -sh /app/public/uploads
```

---

## ✅ الخلاصة

- ✅ جميع البيانات محفوظة محلياً في MongoDB
- ✅ الملفات والصور في `/app/public/uploads`
- ✅ يمكن تفعيل نظام رفع الملفات بإضافة API endpoint
- ✅ النسخ الاحتياطي ضروري لحماية البيانات
