// تحديث schema الأقسام لدعم التفعيل/الإلغاء
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/prestige_designs';

async function updateCategoriesSchema() {
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db();

  console.log('🔄 Updating categories schema...');

  // إضافة status لجميع الأقسام الموجودة
  await db.collection('categories').updateMany(
    { status: { $exists: false } },
    { $set: { status: 'active' } }
  );

  console.log('✅ Categories schema updated');

  // تحديث schema للطلبات لحفظ التخصيصات
  const orders = await db.collection('orders').find({}).toArray();
  console.log(`📦 Found ${orders.length} orders`);

  await client.close();
  console.log('✅ Done!');
}

updateCategoriesSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
