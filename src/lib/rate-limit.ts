/**
 * Simple in-memory rate limiter
 * 
 * Created: Jan 20, 2026
 * 
 * For production, replace with Redis-based solution.
 * This is suitable for single-instance deployments.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (per-instance, resets on restart)
const store = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60 * 1000) // Clean every minute

interface RateLimitConfig {
  limit: number      // Max requests
  windowMs: number   // Time window in milliseconds
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  
  let entry = store.get(key)
  
  // If no entry or expired, create new one
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
  }
  
  // Increment count
  entry.count++
  store.set(key, entry)
  
  const remaining = Math.max(0, config.limit - entry.count)
  const success = entry.count <= config.limit
  
  return {
    success,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if behind proxy, falls back to IP
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take first IP if multiple
    return forwarded.split(',')[0].trim()
  }
  
  // Fallback - in development this might just be "::1" or "127.0.0.1"
  return 'unknown'
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  }
}

// Preset configurations
export const RATE_LIMITS = {
  // Free endpoints - generous limits
  FREE: {
    limit: 60,         // 60 requests
    windowMs: 60_000,  // per minute
  },
  // Paid endpoints - more restricted
  PAID: {
    limit: 20,         // 20 requests
    windowMs: 60_000,  // per minute
  },
  // Very strict - for expensive operations
  STRICT: {
    limit: 5,          // 5 requests
    windowMs: 60_000,  // per minute
  },
} as const
