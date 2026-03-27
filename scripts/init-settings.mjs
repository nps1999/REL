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

async function initializeSettings() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✓ متصل بـ MongoDB Cloud');
    
    const db = client.db(DB_NAME);
    
    // Check if settings exist
    const existing = await db.collection('settings').findOne({ key: 'main' });
    
    if (existing) {
      console.log('✓ الإعدادات موجودة بالفعل');
      console.log('Settings:', JSON.stringify(existing, null, 2));
    } else {
      // Create default settings
      const defaultSettings = {
        key: 'main',
        siteName: 'PRESTIGE DESIGNS',
        logo: env.NEXT_PUBLIC_LOGO_URL || '',
        slider: [],
        socialLinks: {
          discord: '',
          whatsapp: '',
          telegram: '',
          youtube: '',
          tiktok: ''
        },
        featuredCustomers: [],
        faq: [],
        loyaltyConfig: {
          pointsPerDollar: 1,
          dollarPerPoint: 0.01
        },
        festivities: {
          ramadan: false,
          eid_fitr: false,
          eid_adha: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('settings').insertOne(defaultSettings);
      console.log('✓ تم إنشاء الإعدادات الافتراضية');
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('✓ تم إغلاق الاتصال');
  }
}

initializeSettings();
