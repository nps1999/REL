import { NextResponse } from 'next/server';
import { getDB } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createPayPalOrder, capturePayPalOrder } from '@/lib/paypal';
import { sendOrderConfirmationEmail, sendOrderDeliveredEmail, sendOrderCancelledEmail } from '@/lib/email';
import { sanitizeInput, sanitizeMongoQuery } from '@/lib/security';

// Helper: Send Discord Webhook
function getPaymentMethod(order) {
  if (order?.paymentMethod) return order.paymentMethod;
  if ((order?.totalAmount || 0) === 0) return 'free';
  if (order?.paypalOrderId) return 'paypal';
  return 'manual';
}

function paymentMethodLabel(method) {
  const map = {
    paypal: 'PayPal',
    free: 'مجاني',
    manual: 'يدوي',
    card: 'بطاقة',
    bank: 'تحويل بنكي',
  };
  return map[method] || method || 'غير محدد';
}

async function sendDiscordNotification(order) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.WEBHOOK_DISCORD;
  if (!webhookUrl) return;

  try {
    const itemsText = order.items?.map(item => {
      const optionName = item.selectedOption?.name ? ` - ${item.selectedOption.name}` : '';
      const qty = item.quantity || 1;
      const price = typeof item.price === 'number' ? item.price.toFixed(2) : item.price;
      return `• ${item.title}${optionName} | x${qty} | $${price}`;
    }).join('\n') || 'لا توجد منتجات';

    const paymentMethod = getPaymentMethod(order);
    const embed = {
      title: '🛍️ طلب مكتمل في المتجر',
      color: 0x22C55E,
      fields: [
        {
          name: '📦 رقم الطلب',
          value: `#${order.id?.slice(-8)?.toUpperCase() || 'N/A'}`,
          inline: true
        },
        {
          name: '👤 اسم العميل',
          value: order.customerInfo?.name || order.customerName || 'غير محدد',
          inline: true
        },
        {
          name: '📧 البريد الإلكتروني',
          value: order.customerInfo?.email || order.customerEmail || 'غير محدد',
          inline: false
        },
        {
          name: '📱 واتساب',
          value: order.customerInfo?.whatsapp || order.customerWhatsapp || 'غير محدد',
          inline: true
        },
        {
          name: '💳 طريقة الدفع',
          value: paymentMethodLabel(paymentMethod),
          inline: true
        },
        {
          name: '📊 حالة الطلب',
          value: `الدفع: ${order.paymentStatus || 'pending'} | التسليم: ${order.deliveryStatus || 'pending'}`,
          inline: false
        },
        {
          name: '💰 المبلغ',
          value: `الإجمالي: $${(order.totalAmount || 0).toFixed(2)}
الفرعي: $${(order.subtotal || 0).toFixed(2)}
الخصم: $${(order.discountAmount || 0).toFixed(2)}
خصم النقاط: $${(order.loyaltyDiscount || 0).toFixed(2)}`,
          inline: false
        },
        {
          name: '🏷️ كود الخصم',
          value: order.discountCode || 'لا يوجد',
          inline: true
        },
        {
          name: '⭐ نقاط مكتسبة',
          value: `${order.earnedPoints || 0}`,
          inline: true
        },
        {
          name: '🛒 المنتجات',
          value: itemsText,
          inline: false
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'RELOAD STORE'
      }
    };

    if (order.customerInfo?.notes || order.notes) {
      embed.fields.push({
        name: '📝 ملاحظات العميل',
        value: order.customerInfo?.notes || order.notes,
        inline: false
      });
    }

    if (order.paypalOrderId) {
      embed.fields.push({
        name: '🧾 PayPal Order ID',
        value: order.paypalOrderId,
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

function normalizeFulfillmentMode(mode) {
  return mode === 'stock' ? 'stock' : 'manual';
}

async function buildPaidOrderFulfillment(db, order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    return { deliveryStatus: 'pending', deliveredFiles: [], deliveredCodes: [], stockPendingItems: [] };
  }

  const productIds = [...new Set(items.map(item => item?.id).filter(Boolean))];
  const products = await db.collection('products').find({ id: { $in: productIds } }).toArray();
  const productById = new Map(products.map(p => [p.id, p]));

  const deliveredFiles = [];
  const deliveredCodes = [];
  const stockPendingItems = [];
  let allDelivered = true;

  for (const item of items) {
    if (!item?.id) {
      allDelivered = false;
      continue;
    }

    const product = productById.get(item.id);
    const quantity = Math.max(1, parseInt(item.quantity || 1, 10));
    const mode = normalizeFulfillmentMode(product?.fulfillmentMode || item?.fulfillmentMode);
    const legacyFileUrl = item?.selectedOption?.fileUrl || item?.fileUrl || '';

    if (mode === 'stock') {
      let deliveredCount = 0;
      for (let idx = 0; idx < quantity; idx++) {
        const codeDoc = await db.collection('product_codes').findOneAndUpdate(
          { productId: item.id, status: 'available' },
          {
            $set: {
              status: 'sold',
              orderId: order.id,
              itemProductId: item.id,
              itemTitle: item.title,
              soldAt: new Date(),
              updatedAt: new Date(),
            }
          },
          { sort: { createdAt: 1 }, returnDocument: 'after' }
        );

        const soldCode = codeDoc?.value || codeDoc;
        if (soldCode?.code) {
          deliveredCodes.push({
            productId: item.id,
            productTitle: item.title,
            code: soldCode.code,
            codeId: soldCode.id,
            quantityIndex: idx + 1,
          });
          deliveredCount += 1;
        }
      }

      if (deliveredCount < quantity) {
        allDelivered = false;
        stockPendingItems.push({
          productId: item.id,
          productTitle: item.title,
          missing: quantity - deliveredCount,
        });
      }
      continue;
    }

    // Backward compatibility:
    // Legacy products (without explicit fulfillment mode) that have direct file URL
    // keep their old instant delivery behavior.
    const shouldLegacyAutoDeliver = !product?.fulfillmentMode && !!legacyFileUrl;
    if (shouldLegacyAutoDeliver) {
      deliveredFiles.push({
        productId: item.id,
        productTitle: item.title,
        fileUrl: legacyFileUrl,
      });
    } else {
      allDelivered = false;
    }
  }

  return {
    deliveryStatus: allDelivered ? 'delivered' : 'pending',
    deliveredFiles,
    deliveredCodes,
    stockPendingItems,
  };
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

    if (path.startsWith('/products/') && path.endsWith('/codes') && path.split('/').length === 4) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

      const productId = path.split('/')[2];
      const codes = await db.collection('product_codes')
        .find({ productId })
        .sort({ createdAt: -1 })
        .toArray();

      const summary = codes.reduce((acc, code) => {
        const status = code.status || 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, { available: 0, reserved: 0, sold: 0 });

      return NextResponse.json({ codes, summary });
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
      let query = admin ? {} : { $or: [{ userId: session.user.id }, { customerEmail: session.user.email }] };
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
      
      const query = admin ? { id: orderId } : { id: orderId, $or: [{ userId: session.user.id }, { customerEmail: session.user.email }] };
      const order = await db.collection('orders').findOne(query);
      if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
      return NextResponse.json(order);
    }

    if (path === '/orders/unseen-delivered-count') {
      if (!session?.user) return NextResponse.json({ count: 0 });
      const admin = await checkAdmin(session);
      if (admin) return NextResponse.json({ count: 0 });

      const query = {
        paymentStatus: 'paid',
        deliveryStatus: 'delivered',
        deliverySeen: { $ne: true },
        $or: [{ userId: session.user.id }, { customerEmail: session.user.email }],
      };
      const count = await db.collection('orders').countDocuments(query);
      return NextResponse.json({ count });
    }

    // ---- REVIEWS ----
    if (path === '/reviews') {
      const productId = searchParams.get('productId');
      const mine = searchParams.get('mine') === 'true';
      const admin = await checkAdmin(session);

      if (mine) {
        if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

        const myReviews = await db.collection('reviews')
          .find({ userId: session.user.id })
          .sort({ createdAt: -1 })
          .toArray();

        return NextResponse.json(myReviews);
      }
      
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

    return NextResponse.json({ message: 'RELOAD STORE API', version: '1.0.0' });

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
    const requestOrigin = new URL(request.url).origin;

    // ---- CREATE PRODUCT ----
    if (path === '/products') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const product = {
        id: uuidv4(),
        ...body,
        slug: body.slug || body.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || uuidv4(),
        fulfillmentMode: normalizeFulfillmentMode(body.fulfillmentMode),
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

    if (path.startsWith('/products/') && path.endsWith('/codes') && path.split('/').length === 4) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

      const productId = path.split('/')[2];
      const rawCodes = Array.isArray(body.codes)
        ? body.codes
        : String(body.codesText || '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

      const uniqueCodes = [...new Set(rawCodes.map(code => sanitizeInput(code).trim()).filter(Boolean))];
      if (uniqueCodes.length === 0) {
        return NextResponse.json({ error: 'لا توجد أكواد صالحة' }, { status: 400 });
      }

      const existing = await db.collection('product_codes')
        .find({ productId, code: { $in: uniqueCodes } })
        .project({ code: 1, _id: 0 })
        .toArray();
      const existingSet = new Set(existing.map(item => item.code));
      const newCodes = uniqueCodes.filter(code => !existingSet.has(code));

      if (newCodes.length > 0) {
        await db.collection('product_codes').insertMany(
          newCodes.map(code => ({
            id: uuidv4(),
            productId,
            code,
            status: 'available',
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }

      const summary = await db.collection('product_codes').aggregate([
        { $match: { productId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray();

      return NextResponse.json({
        success: true,
        inserted: newCodes.length,
        skipped: uniqueCodes.length - newCodes.length,
        summary: summary.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), { available: 0, reserved: 0, sold: 0 }),
      });
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
      if (!session?.user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });

      const orderId = uuidv4();
      const settings = await db.collection('settings').findOne({ key: 'main' });
      const loyaltyConfig = settings?.loyaltyConfig || { pointsPerDollar: 1, dollarPerPoint: 0.01 };

      const normalizedCustomerEmail = sanitizeInput(body.customerEmail || '').toLowerCase();
      let resolvedUserId = session?.user?.id || null;
      if (!resolvedUserId && normalizedCustomerEmail) {
        const existingUser = await db.collection('users').findOne({ email: normalizedCustomerEmail });
        resolvedUserId = existingUser?.id || null;
      }
      
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
      
      const items = Array.isArray(body.items)
        ? body.items.map(item => ({
            ...item,
            fulfillmentMode: normalizeFulfillmentMode(item?.fulfillmentMode),
          }))
        : [];

      const isFreeOrder = totalAmount === 0;

      const order = {
  id: orderId,
  userId: resolvedUserId || 'guest',
  customerInfo: {
    name: sanitizeInput(body.customerName),
    email: normalizedCustomerEmail,
    whatsapp: sanitizeInput(body.customerWhatsapp),
    country: sanitizeInput(body.customerCountry),
    notes: sanitizeInput(body.notes || ''),
  },
  customerName: sanitizeInput(body.customerName),
  customerEmail: normalizedCustomerEmail,
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
  paymentMethod: isFreeOrder ? (loyaltyDiscount > 0 ? 'loyalty_points' : 'free') : 'paypal',
  deliveryStatus: 'pending',
  deliverySeen: true,
  paypalOrderId: null,
  deliveredFiles: [],
  deliveredCodes: [],
  stockPendingItems: [],
  gift: null,
  storefrontUrl: requestOrigin,
  createdAt: new Date(),
  updatedAt: new Date(),
      };
      
      await db.collection('orders').insertOne(order);
      
      // If free order, process it immediately
      if (isFreeOrder) {
        const fulfillment = await buildPaidOrderFulfillment(db, order);

        await db.collection('orders').updateOne(
          { id: orderId },
          {
            $set: {
              deliveryStatus: fulfillment.deliveryStatus,
              deliverySeen: fulfillment.deliveryStatus !== 'delivered',
              deliveredFiles: fulfillment.deliveredFiles,
              deliveredCodes: fulfillment.deliveredCodes,
              stockPendingItems: fulfillment.stockPendingItems,
              updatedAt: new Date(),
            }
          }
        );

        // Update product order counts
        for (const item of items) {
          await db.collection('products').updateOne(
            { id: item.id },
            { $inc: { orderCount: 1 } }
          );
        }
        
        // Give loyalty points for free orders as well
        const freeOrderPoints = Math.floor(order.totalAmount * loyaltyConfig.pointsPerDollar);
        if ((resolvedUserId || 'guest') !== 'guest') {
          await db.collection('users').updateOne(
            { id: resolvedUserId },
            {
              $inc: {
                loyaltyPoints: freeOrderPoints,
                totalSpent: order.totalAmount,
                orderCount: 1,
              }
            }
          );

          if (freeOrderPoints > 0) {
            await db.collection('loyalty_history').insertOne({
              id: uuidv4(),
              userId: resolvedUserId,
              points: freeOrderPoints,
              type: 'earned',
              description: `نقاط من طلب #${orderId.slice(-8).toUpperCase()}`,
              orderId,
              createdAt: new Date(),
            });
          }
        }

        // Send confirmation email
        await sendOrderConfirmationEmail({
          ...order,
          deliveryStatus: fulfillment.deliveryStatus,
          deliverySeen: fulfillment.deliveryStatus !== 'delivered',
          deliveredFiles: fulfillment.deliveredFiles,
          deliveredCodes: fulfillment.deliveredCodes,
          stockPendingItems: fulfillment.stockPendingItems,
        });
        
        // Send Discord notification
        await sendDiscordNotification({
          ...order,
          deliveryStatus: fulfillment.deliveryStatus,
          deliverySeen: fulfillment.deliveryStatus !== 'delivered',
          deliveredFiles: fulfillment.deliveredFiles,
          deliveredCodes: fulfillment.deliveredCodes,
          stockPendingItems: fulfillment.stockPendingItems,
        });
        
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
          
          const fulfillment = await buildPaidOrderFulfillment(db, order);

await db.collection('orders').updateOne(
  { id: orderId },
  {
    $set: {
      paymentStatus: 'paid',
      paymentMethod: order.paymentMethod || 'paypal',
      deliveryStatus: fulfillment.deliveryStatus,
      deliverySeen: fulfillment.deliveryStatus !== 'delivered',
      deliveredFiles: fulfillment.deliveredFiles,
      deliveredCodes: fulfillment.deliveredCodes,
      stockPendingItems: fulfillment.stockPendingItems,
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
          let rewardUserId = order.userId;
          if (rewardUserId === 'guest' && order.customerEmail) {
            const matchedUser = await db.collection('users').findOne({ email: order.customerEmail.toLowerCase() });
            rewardUserId = matchedUser?.id || 'guest';
            if (rewardUserId !== 'guest') {
              await db.collection('orders').updateOne(
                { id: orderId, userId: 'guest' },
                { $set: { userId: rewardUserId, updatedAt: new Date() } }
              );
            }
          }

          if (rewardUserId !== 'guest') {
            await db.collection('users').updateOne(
              { id: rewardUserId },
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
              userId: rewardUserId,
              points: earnedPoints,
              type: 'earned',
              description: `نقاط من طلب #${orderId.slice(-8).toUpperCase()}`,
              orderId,
              createdAt: new Date(),
            });
          }
          
          // Send confirmation email
          const updatedOrder = {
            ...order,
            paymentStatus: 'paid',
            paymentMethod: order.paymentMethod || 'paypal',
            deliveryStatus: fulfillment.deliveryStatus,
            deliverySeen: fulfillment.deliveryStatus !== 'delivered',
            deliveredFiles: fulfillment.deliveredFiles,
            deliveredCodes: fulfillment.deliveredCodes,
            stockPendingItems: fulfillment.stockPendingItems,
            earnedPoints,
          };
          await sendOrderConfirmationEmail(updatedOrder);
          
          // Send Discord notification
          await sendDiscordNotification(updatedOrder);
          
          return NextResponse.json({ 
            success: true, 
            orderId,
            earnedPoints,
            deliveryStatus: fulfillment.deliveryStatus,
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
      const orderQuery = {
        paymentStatus: 'paid',
        'items.id': body.productId,
        $or: [
          { userId: session.user.id },
          { customerEmail: session.user.email },
        ],
      };

      if (body.orderId) orderQuery.id = body.orderId;

      const order = await db.collection('orders').findOne(orderQuery);
      const isProductDelivered = !!(
        order && (
          order.deliveryStatus === 'delivered' ||
          (Array.isArray(order.deliveredFiles) && order.deliveredFiles.some(file => (
            file?.productId === body.productId ||
            file?.productTitle === order.items?.find(i => i.id === body.productId)?.title
          )))
        )
      );
      
      if (!isProductDelivered) return NextResponse.json({ error: 'يجب استلام المنتج قبل التقييم' }, { status: 400 });
      
      // Check if already reviewed
      const existing = await db.collection('reviews').findOne({
        productId: body.productId,
        $or: [
          { userId: session.user.id },
          { userEmail: session.user.email },
        ],
      });
      if (existing) return NextResponse.json({ error: 'لقد قيّمت هذا المنتج مسبقاً' }, { status: 400 });
      
      const review = {
        id: uuidv4(),
        userId: session.user.id,
        userName: session.user.name,
        userImage: session.user.image,
        userEmail: session.user.email,
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


    // ---- MARK DELIVERED ORDERS AS SEEN ----
    if (path === '/orders/mark-delivery-seen') {
      if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

      await db.collection('orders').updateMany(
        {
          paymentStatus: 'paid',
          deliveryStatus: 'delivered',
          deliverySeen: { $ne: true },
          $or: [{ userId: session.user.id }, { customerEmail: session.user.email }],
        },
        { $set: { deliverySeen: true, deliverySeenAt: new Date(), updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true });
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


    // ---- NOTIFICATION SUBSCRIBE ----
    if (path === '/notifications/subscribe') {
      const { email } = body;
      if (!email) return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
      
      const existing = await db.collection('notification_subscribers').findOne({ email });
      if (existing) return NextResponse.json({ success: true, message: 'مشترك بالفعل' });
      
      await db.collection('notification_subscribers').insertOne({
        id: uuidv4(),
        email,
        subscribedAt: new Date(),
        active: true,
      });
      return NextResponse.json({ success: true, message: 'تم الاشتراك بنجاح' });
    }

    // ---- GET NOTIFICATION SUBSCRIBERS (admin) ----
    if (path === '/notifications/subscribers') {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      const subscribers = await db.collection('notification_subscribers').find({ active: true }).sort({ subscribedAt: -1 }).toArray();
      return NextResponse.json({ subscribers: subscribers.map(s => ({ ...s, _id: undefined })), total: subscribers.length });
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

    // ---- UPDATE PRODUCT CODE ----
    if (path.startsWith('/products/') && path.includes('/codes/') && path.split('/').length === 5) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

      const [, , productId, , codeId] = path.split('/');
      const nextStatus = body.status;
      if (!['available', 'reserved', 'sold'].includes(nextStatus)) {
        return NextResponse.json({ error: 'حالة الكود غير صالحة' }, { status: 400 });
      }

      const existingCode = await db.collection('product_codes').findOne({ id: codeId, productId });
      if (!existingCode) return NextResponse.json({ error: 'الكود غير موجود' }, { status: 404 });
      if (existingCode.status === 'sold' && nextStatus !== 'sold') {
        return NextResponse.json({ error: 'لا يمكن تغيير كود مبيع' }, { status: 400 });
      }

      await db.collection('product_codes').updateOne(
        { id: codeId, productId },
        { $set: { status: nextStatus, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true });
    }

    // ---- UPDATE PRODUCT ----
    if (path.startsWith('/products/') && path.split('/').length === 3) {
      const admin = await checkAdmin(session);
      if (!admin) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
      
      const productId = path.split('/')[2];
      
      // Remove immutable fields
      const { _id, id, createdAt, ...updateData } = body;
      if (updateData.fulfillmentMode !== undefined) {
        updateData.fulfillmentMode = normalizeFulfillmentMode(updateData.fulfillmentMode);
      }
      
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
      const requestOrigin = new URL(request.url).origin;
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
              deliverySeen: false,
              deliveredFiles,
              gift,
              updatedAt: new Date(),
            } 
          }
        );
        
        const updatedOrder = { ...order, deliveryStatus: 'delivered', deliverySeen: false, deliveredFiles, gift, storefrontUrl: order.storefrontUrl || requestOrigin };
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
  const fulfillment = await buildPaidOrderFulfillment(db, order);

  await db.collection('orders').updateOne(
    { id: orderId },
    {
      $set: {
        ...body,
        paymentStatus: 'paid',
        paymentMethod: body.paymentMethod || order.paymentMethod || 'manual',
        deliveryStatus: fulfillment.deliveryStatus,
        deliverySeen: fulfillment.deliveryStatus !== 'delivered',
        deliveredFiles: fulfillment.deliveredFiles,
        deliveredCodes: fulfillment.deliveredCodes,
        stockPendingItems: fulfillment.stockPendingItems,
        earnedPoints,
        updatedAt: new Date(),
      }
    }
  );

  if (order.userId !== 'guest') {
    await db.collection('users').updateOne(
      { id: order.userId },
      { $inc: { loyaltyPoints: earnedPoints, totalSpent: order.totalAmount, orderCount: 1 } }
    );
  }

  await sendDiscordNotification({
    ...order,
    ...body,
    earnedPoints,
    paymentStatus: 'paid',
    paymentMethod: body.paymentMethod || order.paymentMethod || 'manual',
    deliveryStatus: fulfillment.deliveryStatus,
    deliveredFiles: fulfillment.deliveredFiles,
    deliveredCodes: fulfillment.deliveredCodes,
    stockPendingItems: fulfillment.stockPendingItems,
  });

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

    if (path.startsWith('/products/') && path.includes('/codes/') && path.split('/').length === 5) {
      const [, , productId, , codeId] = path.split('/');
      const code = await db.collection('product_codes').findOne({ id: codeId, productId });
      if (!code) return NextResponse.json({ error: 'الكود غير موجود' }, { status: 404 });
      if (code.status === 'sold') {
        return NextResponse.json({ error: 'لا يمكن حذف كود تم بيعه' }, { status: 400 });
      }
      await db.collection('product_codes').deleteOne({ id: codeId, productId });
      return NextResponse.json({ success: true });
    }

    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      await db.collection('products').deleteOne({ id });
      await db.collection('product_codes').deleteMany({ productId: id, status: { $ne: 'sold' } });
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
