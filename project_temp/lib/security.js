// Security utilities for the application

// Rate limiting map (in-memory for MVP)
const rateLimitMap = new Map();

/**
 * Simple rate limiter
 * @param {string} identifier - IP address or user ID
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if rate limit exceeded
 */
export function isRateLimited(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(identifier) || [];
  
  // Filter out old requests outside the time window
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return true;
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);
  
  return false;
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate WhatsApp number
 * @param {string} number 
 * @returns {boolean}
 */
export function isValidWhatsApp(number) {
  // Should be digits only, 8-15 characters
  const phoneRegex = /^\d{8,15}$/;
  return phoneRegex.test(number.replace(/\s/g, ''));
}

/**
 * Security headers for API responses
 * @returns {Object} - Headers object
 */
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

/**
 * Clean MongoDB query to prevent injection
 * @param {Object} query 
 * @returns {Object}
 */
export function sanitizeMongoQuery(query) {
  if (typeof query !== 'object' || query === null) return {};
  
  const cleaned = {};
  for (const [key, value] of Object.entries(query)) {
    // Skip keys that start with $
    if (key.startsWith('$')) continue;
    
    // Recursively clean nested objects
    if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeMongoQuery(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Generate a random token
 * @param {number} length 
 * @returns {string}
 */
export function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
