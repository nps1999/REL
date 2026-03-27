import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png';
const WHATSAPP = process.env.STORE_WHATSAPP || '';
const STORE_BASE_URL = 'https://prestigedesigns.store';

function resolveBaseUrl() {
  return STORE_BASE_URL;
}

function getEmailTemplate(title, content, ctaText, ctaLink) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { background: #050508; color: #f8f8ff; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0d0d1a, #150d2a); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4c1d95, #7c3aed, #9d174d); padding: 30px; text-align: center; }
    .header img { height: 60px; }
    .header h1 { color: white; font-size: 24px; margin: 10px 0 0; }
    .body { padding: 30px; }
    .body p { color: #c4b5fd; font-size: 16px; line-height: 1.8; }
    .details { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .details p { margin: 8px 0; color: #e2d9f3; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background: linear-gradient(135deg, #7c3aed, #9d174d); color: white; padding: 14px 30px; border-radius: 50px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block; }
    .whatsapp { text-align: center; margin: 20px 0; }
    .whatsapp a { color: #4ade80; text-decoration: none; font-size: 15px; }
    .footer { background: rgba(0,0,0,0.3); padding: 20px; text-align: center; color: #6b7280; font-size: 13px; }
    .item { margin: 8px 0; color: #e2d9f3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Prestige Designs" />
      <h1>PRESTIGE DESIGNS</h1>
    </div>
    <div class="body">
      <h2 style="color: #a78bfa; text-align: center;">${title}</h2>
      ${content}
      ${ctaText && ctaLink ? `<div class="cta"><a href="${ctaLink}">${ctaText}</a></div>` : ''}
      ${WHATSAPP ? `<div class="whatsapp"><a href="https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}">📱 تواصل معنا عبر واتساب</a></div>` : ''}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Prestige Designs. جميع الحقوق محفوظة.</p>
      <p>وجهة صناع المحتوى الأولى</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const baseUrl = resolveBaseUrl();

  const itemsList = (order.items || []).map(item =>
    `<p class="item"><strong>${item.title}</strong> - $${item.price}</p>`
  ).join('');

  const content = `
    <p>شكراً لك على ثقتك بنا! تم استلام طلبك بنجاح.</p>
    <div class="details">
      <p><strong>رقم الطلب:</strong> #${order.id?.slice(-8)?.toUpperCase()}</p>
      <p><strong>المبلغ الإجمالي:</strong> $${order.totalAmount}</p>
      <p><strong>الحالة:</strong> ${order.deliveryStatus === 'delivered' ? 'تم التسليم' : 'قيد التجهيز'}</p>
      ${itemsList}
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'PRESTIGE DESIGNS <noreply@prestige.com>',
      to: order.customerEmail,
      subject: 'تأكيد طلبك - PRESTIGE DESIGNS',
      html: getEmailTemplate(
        'تم تأكيد طلبك! 🎉',
        content,
        'عرض تفاصيل الطلب',
        `${baseUrl}/orders/${order.id}`
      ),
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}

export async function sendOrderDeliveredEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const baseUrl = resolveBaseUrl();

  const filesList = order.deliveredFiles?.map(f =>
    `<div class="details"><p><strong>${f.productTitle}</strong></p>${f.fileUrl ? `<p><a href="${f.fileUrl}" style="color:#a78bfa">تحميل الملف</a></p>` : ''}</div>`
  ).join('') || '';

  const giftHtml = order.gift ? `
    <div style="background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(157,23,77,0.2)); border-radius: 12px; padding: 20px; margin: 15px 0; text-align: center;">
      <h3 style="color: #f59e0b;">🎁 لديك هدية من المتجر!</h3>
      <p>${order.gift.name}</p>
      ${order.gift.fileUrl ? `<a href="${order.gift.fileUrl}" style="color:#a78bfa">تحميل الهدية</a>` : ''}
    </div>
  ` : '';

  const content = `
    <p>يسعدنا إخبارك بأن طلبك قد تم تسليمه! 🎉</p>
    <div class="details">
      <p><strong>رقم الطلب:</strong> #${order.id?.slice(-8)?.toUpperCase()}</p>
    </div>
    ${filesList}
    ${giftHtml}
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'PRESTIGE DESIGNS <noreply@prestige.com>',
      to: order.customerEmail,
      subject: 'تم تسليم طلبك - PRESTIGE DESIGNS 🎉',
      html: getEmailTemplate(
        'طلبك جاهز! 🎉',
        content,
        'عرض تفاصيل الطلب',
        `${baseUrl}/orders/${order.id}`
      ),
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}

export async function sendOrderCancelledEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const content = `
    <p>نأسف لإخبارك بأنه تم إلغاء طلبك.</p>
    <div class="details">
      <p><strong>رقم الطلب:</strong> #${order.id?.slice(-8)?.toUpperCase()}</p>
      <p><strong>السبب:</strong> تم الإلغاء من قبل فريق المتجر</p>
    </div>
    <p>سيتم التواصل معك عبر الواتساب لاسترداد المبلغ.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'PRESTIGE DESIGNS <noreply@prestige.com>',
      to: order.customerEmail,
      subject: 'تم إلغاء طلبك - PRESTIGE DESIGNS',
      html: getEmailTemplate(
        'تم إلغاء طلبك',
        content,
        'تواصل معنا',
        `https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`
      ),
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}