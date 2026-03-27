import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

// قراءة الـ env file
const envContent = readFileSync('/app/.env', 'utf-8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const MONGO_URL = env.MONGO_URL;
const DB_NAME = env.DB_NAME || 'prestige-designs';

async function cleanupDatabase() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✓ متصل بـ MongoDB Cloud');
    
    const db = client.db(DB_NAME);
    
    // 1. حذف جميع المنتجات التجريبية
    const productsResult = await db.collection('products').deleteMany({});
    console.log(`✓ تم حذف ${productsResult.deletedCount} منتج تجريبي`);
    
    // 2. حذف جميع التقييمات
    const reviewsResult = await db.collection('reviews').deleteMany({});
    console.log(`✓ تم حذف ${reviewsResult.deletedCount} تقييم تجريبي`);
    
    // 3. حذف جميع الطلبات
    const ordersResult = await db.collection('orders').deleteMany({});
    console.log(`✓ تم حذف ${ordersResult.deletedCount} طلب تجريبي`);
    
    // 4. حذف جميع المستخدمين (عدا الأدمن)
    const usersResult = await db.collection('users').deleteMany({
      email: { $ne: env.ADMIN_EMAILS?.split(',')[0] || 'admin@example.com' }
    });
    console.log(`✓ تم حذف ${usersResult.deletedCount} مستخدم تجريبي`);
    
    // 5. حذف wishlist
    const wishlistResult = await db.collection('wishlists').deleteMany({});
    console.log(`✓ تم حذف ${wishlistResult.deletedCount} wishlist`);
    
    // 6. حذف loyalty
    const loyaltyResult = await db.collection('loyalty').deleteMany({});
    console.log(`✓ تم حذف ${loyaltyResult.deletedCount} سجل نقاط ولاء`);
    
    // 7. تحديث الإعدادات: حذف نصوص السلايدر
    const settingsResult = await db.collection('settings').updateOne(
      {},
      { 
        $set: { 
          slider: [],
          featuredClients: []
        } 
      }
    );
    console.log('✓ تم حذف نصوص السلايدر والعملاء المميزين');
    
    // 8. الإبقاء على الفئات كما هي
    const categoriesCount = await db.collection('categories').countDocuments();
    console.log(`✓ تم الإبقاء على ${categoriesCount} فئة`);
    
    console.log('\n🎉 تم تنظيف قاعدة البيانات بنجاح!');
    console.log('📊 قاعدة البيانات الآن نظيفة وجاهزة للاستخدام الفعلي');
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('✓ تم إغلاق الاتصال');
  }
}

cleanupDatabase();
