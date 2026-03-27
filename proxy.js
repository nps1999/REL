import { NextResponse } from 'next/server';

// Rate limiting storage (in-memory for MVP)
const rateLimitMap = new Map();

export default function proxy(request) {
  const response = NextResponse.next();
  
  // 1. Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // 2. Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com https://www.sandbox.paypal.com https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: http: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://www.paypal.com https://api.paypal.com https://www.sandbox.paypal.com https://api.sandbox.paypal.com https://c.paypal.com https://res.cloudinary.com",
    "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://www.youtube.com",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // 3. Rate Limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // 100 requests per minute
    
    const userRequests = rateLimitMap.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return NextResponse.json(
        { error: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.' },
        { status: 429 }
      );
    }
    
    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
    
    // Clean up old entries every 5 minutes
    if (Math.random() < 0.01) {
      for (const [key, times] of rateLimitMap.entries()) {
        const validTimes = times.filter(time => now - time < windowMs);
        if (validTimes.length === 0) {
          rateLimitMap.delete(key);
        } else {
          rateLimitMap.set(key, validTimes);
        }
      }
    }
  }
  
  // 4. HTTPS Redirect (in production)
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
