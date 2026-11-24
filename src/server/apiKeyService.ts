import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';

export interface ApiKeyRecord {
  id: string;
  userId: string;
  keyName: string;
  keyHash: string;
  keyPrefix: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'revoked';
  rateLimit: number; // requests per minute
  monthlyQuota: number; // max requests per month
  usageCount: number; // total successful/serviced requests
  lastUsedAt?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface ApiRequestLog {
  id: string;
  keyId: string;
  keyPrefix: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
  ip?: string;
}

// In-memory + file-backed storage to guarantee persistence across server restarts
const DATA_DIR = path.join(process.cwd(), '.aistudio', 'data');
const STORE_FILE = path.join(DATA_DIR, 'api_keys_store.json');
const LOGS_FILE = path.join(DATA_DIR, 'api_request_logs.json');

// Memory caches
let keysCache: Map<string, ApiKeyRecord> = new Map(); // keyHash -> ApiKeyRecord
let logsCache: ApiRequestLog[] = [];
// Sliding window rate limit tracker: keyHash -> array of timestamps (ms) in the current minute
const rateLimitTracker: Map<string, number[]> = new Map();

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to ensure data dir for API keys:', err);
  }
}

function loadStore() {
  ensureDataDir();
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const list: ApiKeyRecord[] = JSON.parse(raw);
      keysCache.clear();
      for (const k of list) {
        keysCache.set(k.keyHash, k);
      }
    }
    if (fs.existsSync(LOGS_FILE)) {
      const rawLogs = fs.readFileSync(LOGS_FILE, 'utf8');
      logsCache = JSON.parse(rawLogs);
    }
  } catch (err) {
    console.warn('Could not read API keys store, initializing fresh:', err);
  }

  // Pre-seed a default active demo developer key if none exists
  if (keysCache.size === 0) {
    seedDemoKey();
  }
}

function saveStore() {
  ensureDataDir();
  try {
    const list = Array.from(keysCache.values());
    fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), 'utf8');
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logsCache.slice(-200), null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist API keys store:', err);
  }
}

function seedDemoKey() {
  const demoRawKey = 'sk_live_demo_remix_ai_developer_key_2026';
  const hashed = hashApiKey(demoRawKey);
  const demoRecord: ApiKeyRecord = {
    id: 'key_demo_default_01',
    userId: 'default_developer',
    keyName: 'Default Starter Key (ডেমো ডেভেলপার কী)',
    keyHash: hashed,
    keyPrefix: demoRawKey.substring(0, 14) + '...',
    tier: 'free',
    status: 'active',
    rateLimit: 60,
    monthlyQuota: 5000,
    usageCount: 14,
    lastUsedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  keysCache.set(hashed, demoRecord);

  // Add initial sample logs
  const endpoints = ['/api/v1/ai/chat', '/api/v1/youtube/search', '/api/v1/tts', '/api/v1/usage'];
  for (let i = 0; i < 5; i++) {
    logsCache.unshift({
      id: 'log_' + Date.now() + '_' + i,
      keyId: demoRecord.id,
      keyPrefix: demoRecord.keyPrefix,
      endpoint: endpoints[i % endpoints.length],
      method: i % 2 === 0 ? 'POST' : 'GET',
      statusCode: 200,
      responseTimeMs: Math.floor(Math.random() * 180) + 45,
      timestamp: new Date(Date.now() - i * 180000).toISOString(),
    });
  }
  saveStore();
}

// SHA-256 hash
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

// Generate new cryptographically secure API Key
export function generateApiKey(
  keyName: string,
  userId: string = 'developer_default',
  tier: 'free' | 'pro' | 'enterprise' = 'free'
): { rawKey: string; keyRecord: ApiKeyRecord } {
  const prefix = 'sk_live_';
  // 24 random cryptographic bytes = 48 hex chars
  const randomHex = crypto.randomBytes(24).toString('hex');
  const rawKey = `${prefix}${randomHex}`;
  const hashed = hashApiKey(rawKey);

  const rateLimit = tier === 'enterprise' ? 600 : tier === 'pro' ? 300 : 60;
  const monthlyQuota = tier === 'enterprise' ? 1000000 : tier === 'pro' ? 100000 : 1000;

  const keyRecord: ApiKeyRecord = {
    id: 'key_' + crypto.randomUUID().slice(0, 8),
    userId,
    keyName: keyName.trim() || 'Production API Key',
    keyHash: hashed,
    keyPrefix: rawKey.substring(0, 14) + '...',
    tier,
    status: 'active',
    rateLimit,
    monthlyQuota,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  };

  keysCache.set(hashed, keyRecord);
  saveStore();

  const { keyHash: _, ...safeKeyRecord } = keyRecord;
  return { rawKey, keyRecord: safeKeyRecord as any };
}

// List all keys for developer dashboard (NEVER exposes raw keys or full hashes)
export function listApiKeys(userId?: string): Omit<ApiKeyRecord, 'keyHash'>[] {
  loadStore();
  const all = Array.from(keysCache.values()).map((k) => {
    const { keyHash, ...safe } = k;
    return safe;
  });
  // Sort newest first
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Revoke key
export function revokeApiKey(keyId: string): boolean {
  loadStore();
  for (const [hash, record] of keysCache.entries()) {
    if (record.id === keyId) {
      record.status = 'revoked';
      saveStore();
      return true;
    }
  }
  return false;
}

// Delete key
export function deleteApiKey(keyId: string): boolean {
  loadStore();
  for (const [hash, record] of keysCache.entries()) {
    if (record.id === keyId) {
      keysCache.delete(hash);
      rateLimitTracker.delete(hash);
      saveStore();
      return true;
    }
  }
  return false;
}

// Record an API request log
export function recordApiLog(
  keyRecord: ApiKeyRecord,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ip?: string
) {
  const log: ApiRequestLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    keyId: keyRecord.id,
    keyPrefix: keyRecord.keyPrefix,
    endpoint,
    method,
    statusCode,
    responseTimeMs,
    timestamp: new Date().toISOString(),
    ip,
  };
  logsCache.unshift(log);
  if (logsCache.length > 200) {
    logsCache = logsCache.slice(0, 200);
  }
  saveStore();
}

// Get developer dashboard analytics
export function getDeveloperAnalytics() {
  loadStore();
  const keys = Array.from(keysCache.values());
  const totalCalls = keys.reduce((acc, k) => acc + (k.usageCount || 0), 0);
  const activeKeysCount = keys.filter((k) => k.status === 'active').length;

  const recentLogs = logsCache.slice(0, 50);
  const successCount = recentLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 400).length;
  const successRate = recentLogs.length > 0 ? Math.round((successCount / recentLogs.length) * 100) : 100;

  const totalTime = recentLogs.reduce((acc, l) => acc + (l.responseTimeMs || 0), 0);
  const avgLatency = recentLogs.length > 0 ? Math.round(totalTime / recentLogs.length) : 85;

  return {
    totalCalls,
    activeKeysCount,
    totalKeysCount: keys.length,
    successRate,
    avgLatency,
    recentLogs,
    keys: keys.map((k) => ({
      id: k.id,
      keyName: k.keyName,
      keyPrefix: k.keyPrefix,
      tier: k.tier,
      status: k.status,
      rateLimit: k.rateLimit,
      monthlyQuota: k.monthlyQuota,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  };
}

// Express Middleware: validateApiKey
export function createApiKeyMiddleware() {
  // Initial load
  loadStore();

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // 1. Extract API Key from x-api-key header or Authorization: Bearer <key>
    const headerKey = req.headers['x-api-key'] as string | undefined;
    const authHeader = req.headers['authorization'] as string | undefined;
    let apiKey = headerKey;

    if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7).trim();
    }

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key প্রয়োজন। রিকোয়েস্টে "x-api-key" হেডার অথবা "Authorization: Bearer <API_KEY>" প্রদান করুন।',
        docsUrl: '/api/v1/docs',
      });
    }

    // 2. Hash incoming raw key to match against database
    const incomingHash = hashApiKey(apiKey);
    const keyData = keysCache.get(incomingHash);

    if (!keyData) {
      return res.status(403).json({
        success: false,
        error: 'অবৈধ বা অস্তিত্বহীন API Key! ড্যাশবোর্ড থেকে সঠিক কী কপি করে ব্যবহার করুন।',
      });
    }

    // 3. Status check
    if (keyData.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'এই API Key-টি নিষ্ক্রিয় বা বাতিল (Revoked) করা হয়েছে। ড্যাশবোর্ড থেকে নতুন কী তৈরি করুন।',
      });
    }

    // 4. Monthly Quota check
    if (keyData.usageCount >= keyData.monthlyQuota) {
      return res.status(429).json({
        success: false,
        error: `আপনার মাসিক API কোটা (${keyData.monthlyQuota.toLocaleString()} রিকোয়েস্ট) শেষ হয়ে গেছে। উচ্চতর প্ল্যানে আপগ্রেড করুন।`,
        quotaExceeded: true,
        currentUsage: keyData.usageCount,
        monthlyQuota: keyData.monthlyQuota,
      });
    }

    // 5. Rate Limiting Check (Sliding 60-second window)
    const now = Date.now();
    const windowStart = now - 60000;
    let timestamps = rateLimitTracker.get(incomingHash) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= keyData.rateLimit) {
      const oldestInWindow = timestamps[0] || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + 60000 - now) / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', keyData.rateLimit);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil((oldestInWindow + 60000) / 1000));

      recordApiLog(keyData, req.path, req.method, 429, Date.now() - startTime, req.ip);

      return res.status(429).json({
        success: false,
        error: `রেট লিমিট অতিক্রম করেছে! আপনি প্রতি মিনিটে সর্বোচ্চ ${keyData.rateLimit}টি রিকোয়েস্ট পাঠাতে পারেন।`,
        rateLimit: keyData.rateLimit,
        retryAfterSeconds,
      });
    }

    // Add current timestamp to rate window
    timestamps.push(now);
    rateLimitTracker.set(incomingHash, timestamps);

    // Rate Limit standard response headers
    res.setHeader('X-RateLimit-Limit', keyData.rateLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, keyData.rateLimit - timestamps.length));
    res.setHeader('X-RateLimit-Reset', Math.ceil((timestamps[0] + 60000) / 1000));

    // 6. Usage count increment & update record
    keyData.usageCount += 1;
    keyData.lastUsedAt = new Date().toISOString();
    saveStore();

    // Attach developer user info to request
    (req as any).developerUser = {
      keyId: keyData.id,
      keyName: keyData.keyName,
      userId: keyData.userId,
      tier: keyData.tier,
      keyPrefix: keyData.keyPrefix,
    };

    // Log after response finishes
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      recordApiLog(keyData, req.path, req.method, res.statusCode, responseTime, req.ip);
    });

    next();
  };
}

/**
 * Directly validates a raw API key string without sending response
 */
export function validateApiKeyDirect(rawKey: string): {
  valid: boolean;
  statusCode?: number;
  error?: string;
  keyRecord?: ApiKeyRecord;
} {
  loadStore();
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, statusCode: 401, error: 'API key is required.' };
  }

  const hash = hashApiKey(rawKey);
  const keyData = keysCache.get(hash);

  if (!keyData) {
    return { valid: false, statusCode: 403, error: 'Invalid API key.' };
  }

  if (keyData.status !== 'active') {
    return { valid: false, statusCode: 403, error: 'API key has been revoked.' };
  }

  if (keyData.usageCount >= keyData.monthlyQuota) {
    return { valid: false, statusCode: 429, error: 'Monthly API quota exceeded.' };
  }

  // Increment usage count and update lastUsedAt
  keyData.usageCount += 1;
  keyData.lastUsedAt = new Date().toISOString();
  saveStore();

  return { valid: true, keyRecord: keyData };
}

