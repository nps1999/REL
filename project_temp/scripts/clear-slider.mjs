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

async function clearSlider() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✓ متصل بـ MongoDB Cloud');
    
    const db = client.db(DB_NAME);
    
    // حذف جميع بيانات السلايدر بالكامل
    const result = await db.collection('settings').updateMany(
      {},
      { 
        $set: { 
          slider: []
        } 
      }
    );
    
    console.log('✓ تم حذف جميع صور السلايدر بنجاح');
    console.log(`✓ تم تحديث ${result.modifiedCount} سجل`);
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('✓ تم إغلاق الاتصال');
  }
}

clearSlider();
