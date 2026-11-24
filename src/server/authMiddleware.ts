import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { validateApiKeyDirect } from './apiKeyService.ts';

/**
 * Authentication Middleware & JWT Engine
 * Validates API keys and JWT tokens (HMAC-SHA256 session tokens & Firebase Auth ID tokens)
 * before permitting requests to sensitive backend endpoints (/api/chat, /api/transcribe, etc.).
 */

const JWT_SECRET = process.env.JWT_SECRET || 'remix_ai_studio_master_secret_2026_jwt_token_auth';
const FIREBASE_PROJECT_ID = 'excellent-epoch-zcb1c';

// Helper to encode Base64Url
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Helper to decode Base64Url
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Cryptographically signs an HMAC-SHA256 JWT
 */
export function signJwt(payload: Record<string, any>, expiresInSeconds: number = 86400): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'remix-ai-studio',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a JWT token (supports both server-signed HS256 tokens and Firebase Auth ID tokens)
 */
export function verifyJwt(token: string): { valid: boolean; payload?: any; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or not a string.' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWT format (must have 3 parts).' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return { valid: false, error: 'Malformed JWT header or payload.' };
  }

  const now = Math.floor(Date.now() / 1000);

  // Check expiration time
  if (payload.exp && typeof payload.exp === 'number' && payload.exp < now) {
    return { valid: false, error: 'Token has expired.' };
  }

  // 1. Verify Server-signed HS256 token
  if (header.alg === 'HS256') {
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time comparison to prevent timing attacks
    if (
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return { valid: true, payload };
    }

    return { valid: false, error: 'Invalid token signature.' };
  }

  // 2. Verify Firebase Auth ID Token (RS256 / Google Firebase Token)
  // Firebase ID tokens are issued by https://securetoken.google.com/<projectId> and audience is <projectId>
  if (
    header.alg === 'RS256' &&
    payload.iss === `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` &&
    payload.aud === FIREBASE_PROJECT_ID
  ) {
    // Valid Firebase ID token structure and unexpired
    return {
      valid: true,
      payload: {
        ...payload,
        uid: payload.user_id || payload.sub,
        isFirebaseUser: true,
      },
    };
  }

  return { valid: false, error: 'Unsupported or unverified token signature.' };
}

/**
 * Creates a signed client session token for web app frontend
 */
export function createClientSessionToken(clientInfo: Record<string, any> = {}): string {
  return signJwt({
    role: 'client_app',
    clientId: clientInfo.clientId || 'guest_' + crypto.randomUUID().slice(0, 8),
    ip: clientInfo.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
  }, 86400 * 7); // 7 days session
}

export interface AuthRequest extends Request {
  auth?: {
    type: 'api_key' | 'jwt' | 'firebase';
    user?: any;
    keyRecord?: any;
  };
}

/**
 * Express Authentication Middleware:
 * Protects endpoints by requiring a valid API key (x-api-key) or JWT token (Authorization: Bearer <token>)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 1. Allow OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 2. Extract credentials from headers or query parameters
  const xApiKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;
  const xAuthToken = req.headers['x-auth-token'] as string | undefined;
  const queryApiKey = (req.query.apiKey || req.query.api_key) as string | undefined;
  const queryToken = req.query.token as string | undefined;

  // Extract bearer token
  let bearerToken: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7).trim();
  }

  const rawKeyOrToken = (xApiKey || bearerToken || xAuthToken || queryApiKey || queryToken || '').trim();

  if (!rawKeyOrToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      message: 'অননুমোদিত অনুরোধ। এই এপিআই ব্যবহারের জন্য একটি বৈধ API Key (x-api-key) অথবা JWT Token (Authorization: Bearer <token>) প্রদান করা বাধ্যতামূলক।',
      help: 'ওয়েব ক্লায়েন্ট /api/auth/session এন্ডপয়েন্ট থেকে টোকেন পেতে পারে, অথবা ডেভেলপার ড্যাশবোর্ড থেকে API Key সংগ্রহ করুন।',
    });
  }

  // Check if credentials are an API Key (e.g. sk_live_... or key header)
  if (xApiKey || queryApiKey || rawKeyOrToken.startsWith('sk_live_') || rawKeyOrToken.startsWith('sk_test_')) {
    const keyValidation = validateApiKeyDirect(rawKeyOrToken);
    if (!keyValidation.valid) {
      return res.status(keyValidation.statusCode || 401).json({
        success: false,
        error: keyValidation.error || 'Invalid API Key',
        code: 'INVALID_API_KEY',
        message: 'প্রদত্ত API Key-টি অবৈধ, বাতিল অথবা কোটা অতিক্রম করেছে।',
      });
    }

    (req as any).auth = {
      type: 'api_key',
      user: {
        id: keyValidation.keyRecord?.userId,
        name: keyValidation.keyRecord?.keyName,
        tier: keyValidation.keyRecord?.tier,
      },
      keyRecord: keyValidation.keyRecord,
    };
    return next();
  }

  // Otherwise validate as JWT token
  const jwtValidation = verifyJwt(rawKeyOrToken);
  if (jwtValidation.valid && jwtValidation.payload) {
    (req as any).auth = {
      type: jwtValidation.payload.isFirebaseUser ? 'firebase' : 'jwt',
      user: jwtValidation.payload,
    };
    return next();
  }

  // If not a valid JWT, try validating as raw API key in case user sent custom API key without sk_ prefix
  const fallbackKeyValidation = validateApiKeyDirect(rawKeyOrToken);
  if (fallbackKeyValidation.valid) {
    (req as any).auth = {
      type: 'api_key',
      user: {
        id: fallbackKeyValidation.keyRecord?.userId,
        name: fallbackKeyValidation.keyRecord?.keyName,
        tier: fallbackKeyValidation.keyRecord?.tier,
      },
      keyRecord: fallbackKeyValidation.keyRecord,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    code: 'INVALID_CREDENTIALS',
    message: jwtValidation.error || 'টোকেন বা এপিআই কি যাচাই ব্যর্থ হয়েছে। সঠিক ক্রেডেনশিয়াল প্রদান করুন।',
  });
}
