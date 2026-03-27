import { NextResponse } from 'next/server';
import { getDB } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createPayPalOrder, capturePayPalOrder } from '@/lib/paypal';
import { sendOrderConfirmationEmail, sendOrderDeliveredEmail, sendOrderCancelledEmail } from '@/lib/email';
import { sanitizeInput, sanitizeMongoQuery } from '@/lib/security';

// Helper: Send Discord Webhook
async function sendDiscordNotification(order) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const embed = {
      title: '🛍️ طلب جديد!',
      color: 0x9333EA, // Purple color
      fields: [
        {
          name: '📦 رقم الطلب',
          value: `#${order.id.slice(-8).toUpperCase()}`,
          inline: true
        },
        {
          name: '👤 اسم العميل',
          value: order.customerInfo?.name || 'غير محدد',
          inline: true
        },
        {
          name: '📧 البريد الإلكتروني',
          value: order.customerInfo?.email || 'غير محدد',
          inline: false
        },
        {
          name: '📱 رقم الواتساب',
          value: order.customerInfo?.whatsapp || 'غير محدد',
          inline: true
        },
        {
          name: '💰 المبلغ الإجمالي',
          value: `$${order.totalAmount.toFixed(2)}`,
          inline: true
        },
        {
          name: '📊 حالة الدفع',
          value: order.paymentStatus === 'paid' ? '✅ مدفوع' : '⏳ قيد المراجعة',
          inline: true
        },
        {
          name: '🛒 المنتجات',
          value: order.items.map(item => `• ${item.title} (x${item.quantity})`).join('\n') || 'لا توجد منتجات',
          inline: false
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'PRESTIGE DESIGNS'
      }
    };

    if (order.customerInfo?.notes) {
      embed.fields.push({
        name: '📝 ملاحظات العميل',
        value: order.customerInfo.notes,
        inline: false
      });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (error) {
    console.error('فشل إرسال إشعار Discord:', error);
  }
}

// Helper: Get session
async function getSession(request) {
  return await getServerSession(authOptions);
}

// Helper: Check admin
async function checkAdmin(session) {
  if (!session?.user) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  return adminEmails.includes(session.user.email) || session.user.role === 'admin';
}

// Helper: Get path
async function getPath(params) {
  const resolvedParams = await params;
  const pathArr = resolvedParams?.path || [];
  return '/' + pathArr.join('/');
}

// ==================== GET ROUTES ====================
export async function GET(request, { params }) {
  const path = await getPath(params);
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  try {
    const db = await getDB();
    const session = await getSession(request);

    // ---- PRODUCTS ----
    if (path === '/products' || path === '/') {
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      const featured = searchParams.get('featured');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = parseInt(searchParams.get('skip') || '0');

      let query = { status: 'active' };
      if (category) query.categories = { $in: [category] };
      if (search) query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
      if (featured === 'true') query.featured = true;

      const products = await db.collection('products')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await db.collection('products').countDocuments(query);
      return NextResponse.json({ products, total });
    }

    if (path.startsWith('/products/') && path.split('/').length === 3) {
      const slug = path.split('/')[2];
      console.log('[DEBUG] Looking for product with slug:', slug);
      const product = await db.collection('products').findOne({
        $or: [{ slug }, { id: slug }, { _id: slug }],
        status: 'active',
      });
      console.log('[DEBUG] Product found:', !!product);
      if (product) console.log('[DEBUG] Product title:', product.title);
      if (!product) return NextResponse.json({ error: 'المنتج غير موجود', slug }, { status: 404 });
      
      // Increment view count
      if (product.id) {
        await db.collection('products').updateOne(
          { id: product.id },
          { $inc: { views: 1 } }
        );
      }
      
      return NextResponse.json(product);
    }

    // ---- CATEGORIES ----
    if (path === '/categories') {
      const cats = await db.collection('categories')
        .find({})
        .sort({ order: 1 })
        .toArray();
      return NextResponse.json(cats);
    }

    // ---- ORDERS ----
    if (path === '/orders') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      const admin = await checkAdmin(session);
      
      const status = searchParams.get('status');
      let query = admin ? {} : { userId: session.user.id };
      if (status) query.paymentStatus = status;
      
      // Impersonation support
      const viewAs = searchParams.get('viewAs');
      if (admin && viewAs) query = { userId: viewAs };
      
      const orders = await db.collection('orders')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(orders);
    }

    if (path.startsWith('/orders/') && path.split('/').length === 3) {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      const orderId = path.split('/')[2];
      const admin = await checkAdmin(session);
      
      const query = admin ? { id: orderId } : { id: orderId, userId: session.user.id };
      const order = await db.collection('orders').findOne(query);
      if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
      return NextResponse.json(order);
    }

    // ---- REVIEWS ----
    if (path === '/reviews') {
      const productId = searchParams.get('productId');
      const admin = await checkAdmin(session);
      
      let query = admin ? {} : { status: 'approved' };
      if (productId) query.productId = productId;
      
      const reviews = await db.collection('reviews')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(reviews);
    }

    // ---- SETTINGS ----
    if (path === '/settings') {
      const settings = await db.collection('settings').findOne({ key: 'main' });
      return NextResponse.json(settings || {});
    }

    // ---- USERS ----
    if (path === '/users') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const users = await db.collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(users);
    }

    if (path === '/users/me') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      const user = await db.collection('users').findOne({ email: session.user.email });
      return NextResponse.json(user || session.user);
    }

    if (path.startsWith('/users/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      const userId = path.split('/')[2];
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
      return NextResponse.json(user);
    }

    // ---- WISHLIST ----
    if (path === '/wishlist') {
      if (!session?.user) return NextResponse.json({ wishlist: [] });
      const wishlist = await db.collection('wishlists').findOne({ userId: session.user.id });
      if (!wishlist) return NextResponse.json({ wishlist: [] });
      
      const products = await db.collection('products')
        .find({ id: { $in: wishlist.productIds || [] }, status: 'active' })
        .toArray();
      return NextResponse.json({ wishlist: products });
    }

    // ---- LOYALTY ----
    if (path === '/loyalty') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      const user = await db.collection('users').findOne({ email: session.user.email });
      const history = await db.collection('loyalty_history')
        .find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      
      const settings = await db.collection('settings').findOne({ key: 'main' });
      return NextResponse.json({
        points: user?.loyaltyPoints || 0,
        history,
        config: settings?.loyaltyConfig || { pointsPerDollar: 1, dollarPerPoint: 0.01 },
      });
    }

    // ---- DISCOUNTS ----
    if (path === '/discounts') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const codes = await db.collection('discount_codes')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json(codes);
    }

    // ---- ADMIN STATS ----
    if (path === '/admin/stats') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const totalOrders = await db.collection('orders').countDocuments({ paymentStatus: 'paid' });
      const totalUsers = await db.collection('users').countDocuments({});
      const totalReviews = await db.collection('reviews').countDocuments({});
      const totalDiscounts = await db.collection('discount_codes').countDocuments({});
      const pendingOrders = await db.collection('orders').countDocuments({ paymentStatus: 'paid', deliveryStatus: 'pending' });
      const deliveredOrders = await db.collection('orders').countDocuments({ deliveryStatus: 'delivered' });
      
      // Weekly income
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyOrders = await db.collection('orders')
        .find({ paymentStatus: 'paid', createdAt: { $gte: oneWeekAgo } })
        .toArray();
      const weeklyIncome = weeklyOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Total income
      const allPaidOrders = await db.collection('orders').find({ paymentStatus: 'paid' }).toArray();
      const totalIncome = allPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Previous week income for comparison
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const prevWeekOrders = await db.collection('orders')
        .find({ paymentStatus: 'paid', createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } })
        .toArray();
      const prevWeekIncome = prevWeekOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      return NextResponse.json({
        totalOrders, totalUsers, totalReviews, totalDiscounts,
        pendingOrders, deliveredOrders, weeklyIncome, totalIncome, prevWeekIncome,
      });
    }

    // ---- VALIDATE DISCOUNT ----
    if (path === '/discounts/validate') {
      const code = searchParams.get('code');
      const amount = parseFloat(searchParams.get('amount') || '0');
      
      if (!code) return NextResponse.json({ error: 'كود غير صحيح' }, { status: 400 });
      
      const discount = await db.collection('discount_codes').findOne({
        code: code.toUpperCase(),
        status: 'active',
      });
      
      if (!discount) return NextResponse.json({ error: 'كود الخصم غير صحيح أو منتهي' }, { status: 404 });
      
      const now = new Date();
      if (discount.startDate && new Date(discount.startDate) > now) {
        return NextResponse.json({ error: 'كود الخصم لم يبدأ بعد' }, { status: 400 });
      }
      if (discount.endDate && new Date(discount.endDate) < now) {
        return NextResponse.json({ error: 'كود الخصم منتهي الصلاحية' }, { status: 400 });
      }
      if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
        return NextResponse.json({ error: 'تم استنفاد عدد مرات استخدام الكود' }, { status: 400 });
      }
      if (discount.userId && session?.user?.id !== discount.userId) {
        return NextResponse.json({ error: 'هذا الكود مخصص لشخص آخر' }, { status: 400 });
      }
      if (discount.minAmount && amount < discount.minAmount) {
        return NextResponse.json({ error: `الحد الأدنى للطلب $${discount.minAmount}` }, { status: 400 });
      }
      if (discount.maxAmount && amount > discount.maxAmount) {
        return NextResponse.json({ error: `الحد الأقصى للطلب $${discount.maxAmount}` }, { status: 400 });
      }
      
      let discountAmount = 0;
      if (discount.type === 'percentage') {
        discountAmount = (amount * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }
      
      return NextResponse.json({
        valid: true,
        discount,
        discountAmount: Math.min(discountAmount, amount),
      });
    }

    return NextResponse.json({ message: 'PRESTIGE DESIGNS API', version: '1.0.0' });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ==================== POST ROUTES ====================
export async function POST(request, { params }) {
  const path = await getPath(params);

  try {
    const db = await getDB();
    const session = await getSession(request);
    let body = {};
    try { body = await request.json(); } catch (e) {}

    // ---- CREATE PRODUCT ----
    if (path === '/products') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const product = {
        id: uuidv4(),
        ...body,
        slug: body.slug || body.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || uuidv4(),
        views: 0,
        orderCount: 0,
        status: body.status || 'active',
        featured: body.featured || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('products').insertOne(product);
      return NextResponse.json(product, { status: 201 });
    }

    // ---- CREATE CATEGORY ----
    if (path === '/categories') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const category = {
        id: uuidv4(),
        ...body,
        createdAt: new Date(),
      };
      
      await db.collection('categories').insertOne(category);
      return NextResponse.json(category, { status: 201 });
    }

    // ---- CREATE ORDER ----
    if (path === '/orders') {
      const orderId = uuidv4();
      const settings = await db.collection('settings').findOne({ key: 'main' });
      const loyaltyConfig = settings?.loyaltyConfig || { pointsPerDollar: 1, dollarPerPoint: 0.01 };
      
      // Validate and apply discount code
      let discountAmount = 0;
      let discountCodeId = null;
      if (body.discountCode) {
        const discount = await db.collection('discount_codes').findOne({
          code: body.discountCode.toUpperCase(),
          status: 'active',
        });
        if (discount) {
          discountCodeId = discount.id;
          if (discount.type === 'percentage') {
            discountAmount = (body.subtotal * discount.value) / 100;
          } else {
            discountAmount = discount.value;
          }
          // Update usage count
          await db.collection('discount_codes').updateOne(
            { id: discount.id },
            { $inc: { usageCount: 1 } }
          );
          
          // If partner code, give partner points
          if (discount.isPartner && discount.partnerId) {
            await db.collection('users').updateOne(
              { id: discount.partnerId },
              { $inc: { loyaltyPoints: discount.partnerPoints || 0 } }
            );
            await db.collection('loyalty_history').insertOne({
              id: uuidv4(),
              userId: discount.partnerId,
              points: discount.partnerPoints || 0,
              type: 'earned',
              description: `نقاط شراكة - كود: ${discount.code}`,
              createdAt: new Date(),
            });
          }
        }
      }
      
      // Apply loyalty points
      let loyaltyDiscount = 0;
      if (body.useLoyaltyPoints && session?.user) {
        const user = await db.collection('users').findOne({ email: session.user.email });
        const pointsValue = (user?.loyaltyPoints || 0) * loyaltyConfig.dollarPerPoint;
        loyaltyDiscount = Math.min(pointsValue, body.subtotal - discountAmount);
        
        // Deduct points
        const pointsUsed = Math.ceil(loyaltyDiscount / loyaltyConfig.dollarPerPoint);
        await db.collection('users').updateOne(
          { email: session.user.email },
          { $inc: { loyaltyPoints: -pointsUsed } }
        );
        await db.collection('loyalty_history').insertOne({
          id: uuidv4(),
          userId: session.user.id,
          points: -pointsUsed,
          type: 'spent',
          description: `استخدام نقاط في طلب #${orderId.slice(-8).toUpperCase()}`,
          createdAt: new Date(),
        });
      }
      
      const totalAmount = Math.max(0, (body.subtotal || 0) - discountAmount - loyaltyDiscount);
      
      // Check if all items are ready for delivery
      const items = body.items || [];
      const autoDeliver = items.every(item => item.fileUrl || (item.selectedOption?.fileUrl));
      
      // Check if order is free (no payment required)
      const isFreeOrder = totalAmount === 0;
      
      const order = {
        id: orderId,
        userId: session?.user?.id || 'guest',
        customerInfo: {
          name: sanitizeInput(body.customerName),
          email: sanitizeInput(body.customerEmail),
          whatsapp: sanitizeInput(body.customerWhatsapp),
          country: sanitizeInput(body.customerCountry),
          notes: sanitizeInput(body.notes || ''),
        },
        customerName: sanitizeInput(body.customerName),
        customerEmail: sanitizeInput(body.customerEmail),
        customerWhatsapp: sanitizeInput(body.customerWhatsapp),
        customerCountry: sanitizeInput(body.customerCountry),
        notes: sanitizeInput(body.notes || ''),
        items,
        subtotal: body.subtotal || 0,
        discountCode: body.discountCode || null,
        discountCodeId,
        discountAmount,
        loyaltyDiscount,
        loyaltyPointsUsed: body.useLoyaltyPoints ? Math.ceil(loyaltyDiscount / loyaltyConfig.dollarPerPoint) : 0,
        totalAmount,
        paymentStatus: isFreeOrder ? 'paid' : 'pending',
        deliveryStatus: autoDeliver ? 'delivered' : 'pending',
        paypalOrderId: null,
        deliveredFiles: autoDeliver ? items.map(i => ({
          productId: i.id,
          productTitle: i.title,
          fileUrl: i.selectedOption?.fileUrl || i.fileUrl,
        })) : [],
        gift: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('orders').insertOne(order);
      
      // If free order, process it immediately
      if (isFreeOrder) {
        // Update product order counts
        for (const item of items) {
          await db.collection('products').updateOne(
            { id: item.id },
            { $inc: { orderCount: 1 } }
          );
        }
        
        // Send confirmation email
        await sendOrderConfirmationEmail(order);
        
        // Send Discord notification
        await sendDiscordNotification(order);
        
        return NextResponse.json({ 
          orderId: order.id, 
          totalAmount: order.totalAmount, 
          isFree: true,
          success: true 
        }, { status: 201 });
      }
      
      return NextResponse.json({ orderId: order.id, totalAmount: order.totalAmount, isFree: false }, { status: 201 });
    }

    // ---- PAYPAL CREATE ORDER ----
    if (path === '/paypal/create-order') {
      const { orderId } = body;
      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
      
      const paypalOrder = await createPayPalOrder(order.totalAmount, 'USD', orderId);
      
      if (paypalOrder.id) {
        await db.collection('orders').updateOne(
          { id: orderId },
          { $set: { paypalOrderId: paypalOrder.id, updatedAt: new Date() } }
        );
        return NextResponse.json({ paypalOrderId: paypalOrder.id });
      }
      
      return NextResponse.json({ error: 'فشل إنشاء طلب PayPal', details: paypalOrder }, { status: 500 });
    }

    // ---- PAYPAL CAPTURE ORDER ----
    if (path === '/paypal/capture-order') {
      const { paypalOrderId, orderId } = body;
      
      const result = await capturePayPalOrder(paypalOrderId);
      
      if (result.status === 'COMPLETED') {
        const order = await db.collection('orders').findOne({ id: orderId });
        
        if (order) {
          const settings = await db.collection('settings').findOne({ key: 'main' });
          const loyaltyConfig = settings?.loyaltyConfig || { pointsPerDollar: 1, dollarPerPoint: 0.01 };
          const earnedPoints = Math.floor(order.totalAmount * loyaltyConfig.pointsPerDollar);
          
          await db.collection('orders').updateOne(
            { id: orderId },
            { 
              $set: { 
                paymentStatus: 'paid',
                deliveryStatus: order.deliveryStatus === 'delivered' ? 'delivered' : 'pending',
                earnedPoints,
                updatedAt: new Date(),
              } 
            }
          );
          
          // Update product order counts
          for (const item of order.items) {
            await db.collection('products').updateOne(
              { id: item.id },
              { $inc: { orderCount: 1 } }
            );
          }
          
          // Give loyalty points
          if (order.userId !== 'guest') {
            await db.collection('users').updateOne(
              { id: order.userId },
              { 
                $inc: { 
                  loyaltyPoints: earnedPoints,
                  totalSpent: order.totalAmount,
                  orderCount: 1,
                } 
              }
            );
            await db.collection('loyalty_history').insertOne({
              id: uuidv4(),
              userId: order.userId,
              points: earnedPoints,
              type: 'earned',
              description: `نقاط من طلب #${orderId.slice(-8).toUpperCase()}`,
              orderId,
              createdAt: new Date(),
            });
          }
          
          // Send confirmation email
          const updatedOrder = { ...order, paymentStatus: 'paid', earnedPoints };
          await sendOrderConfirmationEmail(updatedOrder);
          
          // Send Discord notification
          await sendDiscordNotification(updatedOrder);
          
          return NextResponse.json({ 
            success: true, 
            orderId,
            earnedPoints,
            deliveryStatus: order.deliveryStatus,
          });
        }
      }
      
      // Payment failed
      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { paymentStatus: 'failed', updatedAt: new Date() } }
      );
      
      return NextResponse.json({ 
        error: 'فشلت عملية الدفع', 
        reason: result.message || 'خطأ غير معروف',
        status: result.status,
      }, { status: 400 });
    }

    // ---- CREATE REVIEW ----
    if (path === '/reviews') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      
      // Check if user bought the product
      const order = await db.collection('orders').findOne({
        userId: session.user.id,
        paymentStatus: 'paid',
        'items.id': body.productId,
      });
      
      if (!order) return NextResponse.json({ error: 'يجب شراء المنتج قبل التقييم' }, { status: 400 });
      
      // Check if already reviewed
      const existing = await db.collection('reviews').findOne({
        userId: session.user.id,
        productId: body.productId,
      });
      if (existing) return NextResponse.json({ error: 'لقد قيّمت هذا المنتج مسبقاً' }, { status: 400 });
      
      const review = {
        id: uuidv4(),
        userId: session.user.id,
        userName: session.user.name,
        userImage: session.user.image,
        productId: body.productId,
        orderId: order.id,
        rating: body.rating,
        text: body.text,
        status: 'pending',
        createdAt: new Date(),
      };
      
      await db.collection('reviews').insertOne(review);
      return NextResponse.json(review, { status: 201 });
    }

    // ---- WISHLIST TOGGLE ----
    if (path === '/wishlist/toggle') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      const { productId } = body;
      
      const wishlist = await db.collection('wishlists').findOne({ userId: session.user.id });
      
      if (!wishlist) {
        await db.collection('wishlists').insertOne({
          id: uuidv4(),
          userId: session.user.id,
          productIds: [productId],
          createdAt: new Date(),
        });
        return NextResponse.json({ added: true });
      }
      
      const isInWishlist = wishlist.productIds?.includes(productId);
      
      if (isInWishlist) {
        await db.collection('wishlists').updateOne(
          { userId: session.user.id },
          { $pull: { productIds: productId } }
        );
        return NextResponse.json({ added: false });
      } else {
        await db.collection('wishlists').updateOne(
          { userId: session.user.id },
          { $push: { productIds: productId } }
        );
        return NextResponse.json({ added: true });
      }
    }

    // ---- LOYALTY REDEEM ----
    if (path === '/loyalty/redeem') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      
      const { points } = body;
      const user = await db.collection('users').findOne({ email: session.user.email });
      
      if (!user || user.loyaltyPoints < points) {
        return NextResponse.json({ error: 'رصيد النقاط غير كافٍ' }, { status: 400 });
      }
      
      const settings = await db.collection('settings').findOne({ key: 'main' });
      const config = settings?.loyaltyConfig || { dollarPerPoint: 0.01 };
      const value = points * config.dollarPerPoint;
      
      const code = 'LOYALTY-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await db.collection('discount_codes').insertOne({
        id: uuidv4(),
        code,
        name: `نقاط ولاء - ${session.user.name}`,
        type: 'fixed',
        value,
        userId: session.user.id,
        usageLimit: 1,
        usageCount: 0,
        endDate: expiresAt,
        status: 'active',
        isLoyalty: true,
        createdAt: new Date(),
      });
      
      await db.collection('users').updateOne(
        { email: session.user.email },
        { $inc: { loyaltyPoints: -points } }
      );
      
      await db.collection('loyalty_history').insertOne({
        id: uuidv4(),
        userId: session.user.id,
        points: -points,
        type: 'redeemed',
        description: `استرداد نقاط - كود: ${code}`,
        createdAt: new Date(),
      });
      
      return NextResponse.json({ code, value, expiresAt });
    }

    // ---- SETTINGS UPDATE (admin) ----
    if (path === '/settings') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      await db.collection('settings').updateOne(
        { key: 'main' },
        { $set: { key: 'main', ...body, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    // ---- CREATE DISCOUNT CODE ----
    if (path === '/discounts') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const discount = {
        id: uuidv4(),
        ...body,
        code: body.code.toUpperCase(),
        usageCount: 0,
        status: body.status || 'active',
        createdAt: new Date(),
      };
      
      await db.collection('discount_codes').insertOne(discount);
      return NextResponse.json(discount, { status: 201 });
    }

    return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ==================== PUT ROUTES ====================
export async function PUT(request, { params }) {
  const path = await getPath(params);

  try {
    const db = await getDB();
    const session = await getSession(request);
    let body = {};
    try { body = await request.json(); } catch (e) {}

    // ---- UPDATE PRODUCT ----
    if (path.startsWith('/products/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const productId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      const result = await db.collection('products').updateOne(
        { id: productId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 });
      }
      
      const updatedProduct = await db.collection('products').findOne({ id: productId });
      return NextResponse.json({ success: true, product: updatedProduct });
    }

    // ---- UPDATE CATEGORY ----
    if (path.startsWith('/categories/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const catId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('categories').updateOne(
        { id: catId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- UPDATE ORDER ----
    if (path.startsWith('/orders/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const orderId = path.split('/')[2];
      const order = await db.collection('orders').findOne({ id: orderId });
      if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
      
      // Handle delivery
      if (body.action === 'deliver') {
        const deliveredFiles = body.files || [];
        const gift = body.gift || null;
        
        await db.collection('orders').updateOne(
          { id: orderId },
          { 
            $set: { 
              deliveryStatus: 'delivered',
              deliveredFiles,
              gift,
              updatedAt: new Date(),
            } 
          }
        );
        
        const updatedOrder = { ...order, deliveredFiles, gift };
        await sendOrderDeliveredEmail(updatedOrder);
        return NextResponse.json({ success: true });
      }
      
      // Handle cancel
      if (body.action === 'cancel') {
        await db.collection('orders').updateOne(
          { id: orderId },
          { $set: { paymentStatus: 'cancelled', updatedAt: new Date() } }
        );
        await sendOrderCancelledEmail(order);
        return NextResponse.json({ success: true });
      }
      
      // Handle status change (mark as paid)
      if (body.paymentStatus === 'paid' && order.paymentStatus !== 'paid') {
        const settings = await db.collection('settings').findOne({ key: 'main' });
        const loyaltyConfig = settings?.loyaltyConfig || { pointsPerDollar: 1 };
        const earnedPoints = Math.floor(order.totalAmount * loyaltyConfig.pointsPerDollar);
        
      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { ...body, earnedPoints, updatedAt: new Date() } }
      );
        
        if (order.userId !== 'guest') {
          await db.collection('users').updateOne(
            { id: order.userId },
            { $inc: { loyaltyPoints: earnedPoints, totalSpent: order.totalAmount, orderCount: 1 } }
          );
        }
        
        return NextResponse.json({ success: true });
      }
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('orders').updateOne(
        { id: orderId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- UPDATE USER ----
    if (path.startsWith('/users/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const userId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('users').updateOne(
        { id: userId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- UPDATE REVIEW ----
    if (path.startsWith('/reviews/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const reviewId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('reviews').updateOne(
        { id: reviewId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- UPDATE DISCOUNT ----
    if (path.startsWith('/discounts/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const discountId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('discount_codes').updateOne(
        { id: discountId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- UPDATE SETTINGS ----
    if (path === '/settings') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      // Remove _id before update to avoid immutable field error
      const { _id, ...updateData } = body;
      
      await db.collection('settings').updateOne(
        { key: 'main' },
        { $set: { key: 'main', ...updateData, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });

  } catch (error) {
    console.error('PUT API Error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ==================== PATCH ROUTES ====================
export async function PATCH(request, { params }) {
  const path = await getPath(params);

  try {
    const db = await getDB();
    const session = await getSession(request);
    let body = {};
    try { body = await request.json(); } catch (e) {}

    // ---- PARTIAL UPDATE CATEGORY ----
    if (path.startsWith('/categories/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const catId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('categories').updateOne(
        { id: catId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- PARTIAL UPDATE PRODUCT ----
    if (path.startsWith('/products/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const productId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('products').updateOne(
        { id: productId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- PARTIAL UPDATE DISCOUNT ----
    if (path.startsWith('/discounts/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const discountId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('discount_codes').updateOne(
        { id: discountId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- PARTIAL UPDATE REVIEW ----
    if (path.startsWith('/reviews/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const reviewId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      
      await db.collection('reviews').updateOne(
        { id: reviewId },
        { $set: { ...updateData, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });

  } catch (error) {
    console.error('PATCH API Error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ==================== DELETE ROUTES ====================
export async function DELETE(request, { params }) {
  const path = await getPath(params);

  try {
    const db = await getDB();
    const session = await getSession(request);
    const admin = await checkAdmin(session);
    if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      await db.collection('products').deleteOne({ id });
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('/categories/')) {
      const id = path.split('/')[2];
      await db.collection('categories').deleteOne({ id });
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('/discounts/')) {
      const id = path.split('/')[2];
      await db.collection('discount_codes').deleteOne({ id });
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('/users/')) {
      const id = path.split('/')[2];
      await db.collection('users').deleteOne({ id });
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('/reviews/')) {
      const id = path.split('/')[2];
      await db.collection('reviews').deleteOne({ id });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'المسار غير موجود' }, { status: 404 });

  } catch (error) {
    console.error('DELETE API Error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}
