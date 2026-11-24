/**
 * Client-side Gmail API Service
 * Uses OAuth Bearer token cached in memory via Firebase GoogleAuthProvider.
 * Supports UTF-8 Bengali & English subjects/bodies via RFC 2822 MIME + Base64URL.
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailComposePayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  from?: string;
}

export interface GmailSendResult {
  id: string;
  threadId?: string;
  labelIds?: string[];
  to: string;
  subject: string;
}

export interface GmailDraftResult {
  id: string;
  messageId?: string;
  to: string;
  subject: string;
}

/**
 * Encodes UTF-8 text into Base64 safely (supports Bengali script & emojis).
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Encodes UTF-8 string into URL-safe Base64 (RFC 4648) without padding for Gmail API `raw`.
 */
function utf8ToBase64Url(str: string): string {
  return utf8ToBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Encodes email header values using RFC 2047 UTF-8 Base64 if non-ASCII characters are present.
 */
function encodeMimeHeader(value: string): string {
  const sanitized = value.replace(/[\r\n]+/g, ' ').trim();
  if (!sanitized) return '';
  // Check if pure printable ASCII
  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }
  return `=?UTF-8?B?${utf8ToBase64(sanitized)}?=`;
}

/**
 * Parses a comma/newline/semicolon-separated string into validated email addresses.
 */
export function parseEmailRecipients(rawInput: string): string[] {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  const parts = rawInput
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = new Set<string>();
  for (const part of parts) {
    // Handle "Name <email@domain.com>" format cleanly if present
    const angleMatch = part.match(/<([^<>]+)>/);
    const candidate = (angleMatch ? angleMatch[1] : part).trim();
    if (emailRegex.test(candidate)) {
      unique.add(part);
    }
  }
  return Array.from(unique);
}

/**
 * Builds an RFC 2822 compliant UTF-8 MIME message and encodes it as Base64URL.
 */
export function buildRawMimeMessage(payload: GmailComposePayload): string {
  const headers: string[] = [
    'MIME-Version: 1.0',
    ...(payload.from ? [`From: ${payload.from.replace(/[\r\n]+/g, ' ').trim()}`] : []),
    `To: ${payload.to.replace(/[\r\n]+/g, ' ').trim()}`,
    ...(payload.cc && payload.cc.trim() ? [`Cc: ${payload.cc.replace(/[\r\n]+/g, ' ').trim()}`] : []),
    ...(payload.bcc && payload.bcc.trim() ? [`Bcc: ${payload.bcc.replace(/[\r\n]+/g, ' ').trim()}`] : []),
    `Subject: ${encodeMimeHeader(payload.subject || '(No Subject)')}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];

  // Wrap base64 body at 76 chars per RFC 2045
  const encodedBody = utf8ToBase64(payload.body || '');
  const wrappedBody = encodedBody.match(/.{1,76}/g)?.join('\r\n') || '';

  const mimeMessage = `${headers.join('\r\n')}\r\n\r\n${wrappedBody}`;
  return utf8ToBase64Url(mimeMessage);
}

function parseGmailApiError(status: number, errData: any): string {
  const rawMsg = errData?.error?.message || '';
  if (status === 401) {
    return 'Gmail সেশন বা টোকেনের মেয়াদ শেষ হয়েছে (401)। অনুগ্রহ করে পুনরায় Google দিয়ে সাইন ইন করে পাঠান।';
  }
  if (status === 403) {
    if (rawMsg.toLowerCase().includes('insufficient') || rawMsg.toLowerCase().includes('scope')) {
      return 'Gmail পাঠানোর অনুমতি (Scope) অনুমোদিত হয়নি। অনুগ্রহ করে আবার Sign in with Google বাটনে ক্লিক করে অনুমতি দিন।';
    }
    return `Gmail API অনুমতি ত্রুটি (403): ${rawMsg || 'অ্যাক্সেস প্রত্যাখ্যাত হয়েছে।'}`;
  }
  if (status === 400) {
    return `ইমেইল ফরম্যাট বা প্রাপক ঠিকানায় ত্রুটি (400): ${rawMsg || 'অনুগ্রহ করে প্রাপকের ইমেইল যাচাই করুন।'}`;
  }
  return rawMsg || `Gmail API ত্রুটি (${status})`;
}

/**
 * Sends an email directly through the user's Gmail account via Gmail API.
 */
export async function sendGmailMessage(
  accessToken: string,
  payload: GmailComposePayload
): Promise<GmailSendResult> {
  if (!accessToken) {
    throw new Error('Gmail এক্সেস টোকেন পাওয়া যায়নি।');
  }
  if (!payload.to || !payload.to.trim()) {
    throw new Error('প্রাপকের ইমেইল ঠিকানা (To) অবশ্যই দিতে হবে।');
  }

  const raw = buildRawMimeMessage(payload);
  const res = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseGmailApiError(res.status, data));
  }

  return {
    id: data.id || '',
    threadId: data.threadId,
    labelIds: data.labelIds,
    to: payload.to,
    subject: payload.subject,
  };
}

/**
 * Saves an email as a real Draft inside the user's Gmail account via Gmail API.
 */
export async function createGmailDraft(
  accessToken: string,
  payload: GmailComposePayload
): Promise<GmailDraftResult> {
  if (!accessToken) {
    throw new Error('Gmail এক্সেস টোকেন পাওয়া যায়নি।');
  }

  const raw = buildRawMimeMessage({
    ...payload,
    to: payload.to?.trim() || '',
  });

  const res = await fetch(`${GMAIL_API_BASE}/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseGmailApiError(res.status, data));
  }

  return {
    id: data.id || '',
    messageId: data.message?.id,
    to: payload.to,
    subject: payload.subject,
  };
}
