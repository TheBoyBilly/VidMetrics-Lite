type LimitEntry = { count: number; windowStart: number };

const limits = new Map<string, LimitEntry>();

/**
 * Extract client IP from request headers
 * Checks multiple headers since IP can come from proxies
 */
export function extractClientIp(headers: { get(key: string): string | null }): string {
  // Try x-forwarded-for first (most common with proxies)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Take only the first IP if there are multiple
    return forwarded.split(",")[0].trim();
  }

  // Try other common headers
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  return "unknown";
}

/**
 * Check rate limit for an IP
 * Default: 20 requests per 60 seconds
 */
export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  // Sanitize key to prevent poisoning
  const safeKey = key.replace(/[^a-zA-Z0-9.:]/g, "");
  if (!safeKey) return { allowed: false, retryAfterSec: 60 };

  const now = Date.now();
  const existing = limits.get(safeKey);

  // No entry or window expired - start new window
  if (!existing || now - existing.windowStart > windowMs) {
    limits.set(safeKey, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  // At or over limit
  if (existing.count >= maxRequests) {
    const retryAfterMs = windowMs - (now - existing.windowStart);
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  // Under limit - increment
  existing.count += 1;
  limits.set(safeKey, existing);
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Cleanup old entries periodically
 * Call this from a scheduled job to prevent memory leaks
 */
export function cleanupRateLimit() {
  const now = Date.now();
  const maxWindowMs = 60_000;

  for (const [key, entry] of limits.entries()) {
    if (now - entry.windowStart > maxWindowMs * 2) {
      limits.delete(key);
    }
  }
}

