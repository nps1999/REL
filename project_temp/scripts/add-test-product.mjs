import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

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

async function addTestProduct() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✓ متصل بـ MongoDB Cloud');
    
    const db = client.db(DB_NAME);
    
    // إضافة منتج تجريبي للاختبار
    const testProduct = {
      id: uuidv4(),
      slug: 'test-product-payment',
      title: 'منتج اختبار الدفع',
      description: 'هذا منتج للاختبار فقط',
      price: 10.00,
      discount: 0,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop',
      fileUrl: 'https://example.com/test-file.zip',
      categories: [],
      status: 'active',
      featured: false,
      stock: 999,
      downloads: 0,
      rating: 0,
      customizations: {
        logoUpload: { enabled: false },
        primaryColor: { enabled: false },
        secondaryColor: { enabled: false },
        notes: { enabled: false },
        options: { enabled: false }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('products').insertOne(testProduct);
    console.log('✓ تم إضافة منتج اختبار بنجاح');
    console.log(`✓ ID: ${testProduct.id}`);
    console.log(`✓ Slug: ${testProduct.slug}`);
    console.log('✓ السعر: $10.00');
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await client.close();
    console.log('✓ تم إغلاق الاتصال');
  }
}

addTestProduct();
