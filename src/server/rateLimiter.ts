import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs?: number; // e.g. 60,000 ms (1 minute)
  maxRequests?: number; // e.g. 30 requests per windowMs
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * In-memory sliding window rate limiter
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60 * 1000;
  const maxRequests = options.maxRequests ?? 60;
  const message =
    options.message ??
    'অনেক বেশি রিকোয়েস্ট পাঠানো হয়েছে (Too Many Requests - 429)। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।';

  const store = new Map<string, RateLimitEntry>();

  // Periodic garbage collection every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 2 * 60 * 1000);

  // Prevent interval from blocking node process shutdown
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const defaultKeyGen = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  };

  const keyGen = options.keyGenerator || defaultKeyGen;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const key = keyGen(req);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Filter out timestamps older than the sliding window
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

    const currentCount = entry.timestamps.length;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const resetTime = Math.ceil(
      (entry.timestamps[0] ? entry.timestamps[0] + windowMs - now : windowMs) / 1000
    );

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetTime);

    if (currentCount >= maxRequests) {
      res.setHeader('Retry-After', resetTime);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message,
        retryAfterSeconds: resetTime,
      });
    }

    entry.timestamps.push(now);
    next();
  };
}
