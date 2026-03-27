import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/prestige_designs';

async function addSampleReviews() {
  const client = await MongoClient.connect(MONGO_URL);
  const db = client.db();

  console.log('🔄 Adding sample reviews...');

  // Get first product
  const products = await db.collection('products').find().limit(3).toArray();
  
  if (products.length === 0) {
    console.log('❌ No products found');
    await client.close();
    return;
  }

  const sampleReviews = [
    {
      productId: products[0].id,
      userId: 'user-1',
      userName: 'أحمد محمد',
      rating: 5,
      text: 'تصميم رائع جداً! استخدمته في بثوثي المباشرة وحصلت على ردود فعل إيجابية كثيرة من المتابعين. جودة عالية وسعر مناسب.',
      isApproved: true,
      createdAt: new Date('2024-01-15'),
    },
    {
      productId: products[0].id,
      userId: 'user-2',
      userName: 'سارة العتيبي',
      rating: 5,
      text: 'ممتاز! التصميم احترافي والألوان متناسقة. التسليم كان سريع جداً والدعم الفني ممتاز.',
      isApproved: true,
      createdAt: new Date('2024-01-20'),
    },
    {
      productId: products[0].id,
      userId: 'user-3',
      userName: 'محمد الشمري',
      rating: 4,
      text: 'تصميم جميل وسهل التخصيص. أنصح به بشدة لكل ستريمر يبحث عن تصاميم احترافية.',
      isApproved: true,
      createdAt: new Date('2024-02-01'),
    },
    {
      productId: products[0].id,
      userId: 'user-4',
      userName: 'ليلى أحمد',
      rating: 5,
      text: 'أفضل تصميم اشتريته! يعطي قناتي مظهر احترافي جداً. شكراً برستيج ديزاينز 💜',
      isApproved: true,
      createdAt: new Date('2024-02-10'),
    },
  ];

  // Add reviews for second product if exists
  if (products.length > 1) {
    sampleReviews.push(
      {
        productId: products[1].id,
        userId: 'user-5',
        userName: 'خالد السعيد',
        rating: 5,
        text: 'باكج كامل ومتكامل! كل ما أحتاجه في حزمة واحدة. ممتاز جداً.',
        isApproved: true,
        createdAt: new Date('2024-02-15'),
      },
      {
        productId: products[1].id,
        userId: 'user-6',
        userName: 'نورة القحطاني',
        rating: 4,
        text: 'جودة عالية وسعر مناسب. أعجبني التصميم كثيراً.',
        isApproved: true,
        createdAt: new Date('2024-02-20'),
      }
    );
  }

  // Add reviews for third product if exists
  if (products.length > 2) {
    sampleReviews.push(
      {
        productId: products[2].id,
        userId: 'user-7',
        userName: 'عبدالله المطيري',
        rating: 5,
        text: 'شاشة انتظار رائعة! التأثيرات جميلة والتصميم احترافي.',
        isApproved: true,
        createdAt: new Date('2024-03-01'),
      }
    );
  }

  await db.collection('reviews').insertMany(sampleReviews);
  console.log(`✅ Added ${sampleReviews.length} sample reviews`);

  await client.close();
}

addSampleReviews()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
