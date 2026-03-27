import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const uri = process.env.MONGO_URL || 'mongodb://localhost:27017/prestige';
const client = new MongoClient(uri);

async function seedProducts() {
  try {
    await client.connect();
    const db = client.db();
    
    // Get categories first
    const categories = await db.collection('categories').find({}).toArray();
    const catIds = categories.map(c => c.id);
    
    const products = [
      {
        id: uuidv4(),
        title: 'أوفرلاي Twitch احترافي - نمط بنفسجي',
        slug: 'twitch-overlay-purple',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500',
        categories: catIds.slice(0, 1),
        price: 29.99,
        discount: null,
        description: '<p>أوفرلاي احترافي لبث Twitch بتصميم بنفسجي أنيق مع جميع العناصر المطلوبة.</p><ul><li>شاشة كاميرا</li><li>شاشة الدردشة</li><li>إطار البث</li><li>لوحة المعلومات</li></ul>',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileUrl: 'https://drive.google.com/file/example',
        status: 'active',
        featured: true,
        views: 0,
        orderCount: 0,
        customizations: {
          logoUpload: { enabled: true },
          primaryColor: { enabled: true },
          secondaryColor: { enabled: false },
          notes: { enabled: true },
          options: { enabled: false, items: [] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'باقة شاشات بداية البث - 5 تصاميم',
        slug: 'stream-starting-screens-5pack',
        image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=500',
        categories: catIds.slice(2, 3),
        price: 19.99,
        discount: 25,
        description: '<p>5 شاشات بداية بث مختلفة لتنويع بثوثك.</p>',
        youtubeUrl: '',
        fileUrl: '',
        status: 'active',
        featured: true,
        views: 0,
        orderCount: 0,
        customizations: {
          logoUpload: { enabled: true },
          primaryColor: { enabled: false },
          secondaryColor: { enabled: false },
          notes: { enabled: false },
          options: {
            enabled: true,
            items: [
              { id: '1', name: 'تصميم كلاسيكي', fileUrl: 'https://drive.google.com/file/classic' },
              { id: '2', name: 'تصميم عصري', fileUrl: 'https://drive.google.com/file/modern' },
              { id: '3', name: 'تصميم نيون', fileUrl: 'https://drive.google.com/file/neon' },
            ],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'قالب يوتيوب كامل - احترافي',
        slug: 'youtube-complete-template',
        image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500',
        categories: [catIds[1], catIds[5]],
        price: 49.99,
        discount: null,
        description: '<p>قالب كامل لقناة يوتيوب يشمل:</p><ul><li>بانر القناة</li><li>صورة الملف الشخصي</li><li>مقدمة وخاتمة</li><li>شاشات النهاية</li></ul>',
        youtubeUrl: 'https://www.youtube.com/watch?v=example',
        fileUrl: '',
        status: 'active',
        featured: false,
        views: 0,
        orderCount: 0,
        customizations: {
          logoUpload: { enabled: true },
          primaryColor: { enabled: true },
          secondaryColor: { enabled: true },
          notes: { enabled: true },
          options: { enabled: false, items: [] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'شعار جاهز - حرف A',
        slug: 'logo-letter-a',
        image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500',
        categories: [catIds[4]],
        price: 9.99,
        discount: 50,
        description: '<p>شعار احترافي بحرف A قابل للتخصيص بالكامل.</p>',
        youtubeUrl: '',
        fileUrl: 'https://drive.google.com/file/logo-a',
        status: 'active',
        featured: false,
        views: 0,
        orderCount: 0,
        customizations: {
          logoUpload: { enabled: false },
          primaryColor: { enabled: true },
          secondaryColor: { enabled: false },
          notes: { enabled: false },
          options: { enabled: false, items: [] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        title: 'بانر تويتر + فيسبوك + إنستغرام',
        slug: 'social-media-banners-pack',
        image: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=500',
        categories: [catIds[3]],
        price: 14.99,
        discount: null,
        description: '<p>مجموعة بانرات لجميع منصات التواصل الاجتماعي بتصميم موحد.</p>',
        youtubeUrl: '',
        fileUrl: '',
        status: 'active',
        featured: false,
        views: 0,
        orderCount: 0,
        customizations: {
          logoUpload: { enabled: true },
          primaryColor: { enabled: true },
          secondaryColor: { enabled: false },
          notes: { enabled: true },
          options: { enabled: false, items: [] },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    await db.collection('products').insertMany(products);
    console.log(`✅ تم إضافة ${products.length} منتجات بنجاح`);
    
    await client.close();
  } catch (error) {
    console.error('خطأ:', error);
    await client.close();
    process.exit(1);
  }
}

seedProducts();
