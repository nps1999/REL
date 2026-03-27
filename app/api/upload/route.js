import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'general'; // products, slider, logos, customers, etc.
    
    if (!file) {
      return NextResponse.json(
        { error: 'لم يتم اختيار ملف' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/webp', 
      'image/gif',
      'image/svg+xml'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WebP, GIF, SVG)' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'حجم الملف كبير جداً. الحد الأقصى 10MB' },
        { status: 400 }
      );
    }

    // Read file data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(buffer, folder, file.name);
    
    return NextResponse.json({ 
      success: true,
      url: cloudinaryUrl,
      filename: file.name
    });

  } catch (error) {
    console.error('خطأ في رفع الملف إلى Cloudinary:', error);
    return NextResponse.json(
      { error: 'فشل رفع الملف إلى Cloudinary' },
      { status: 500 }
    );
  }
}

