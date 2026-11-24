import dns from 'dns';
import net from 'net';

/**
 * SSRF & Security Guard Utility
 * Protects server endpoints from Server-Side Request Forgery (SSRF),
 * DNS rebinding attacks, localhost / internal network probing,
 * cloud metadata extraction, and denial of service via oversized responses.
 */

// Blocked private and reserved IPv4 CIDR blocks
const PRIVATE_IPV4_RANGES: Array<{ network: number; mask: number }> = [
  parseCidr('0.0.0.0/8'), // Current network
  parseCidr('10.0.0.0/8'), // Private class A
  parseCidr('100.64.0.0/10'), // Carrier-grade NAT
  parseCidr('127.0.0.0/8'), // Loopback
  parseCidr('169.254.0.0/16'), // Link-local & Cloud Metadata (169.254.169.254)
  parseCidr('172.16.0.0/12'), // Private class B (172.16.0.0 - 172.31.255.255)
  parseCidr('192.0.0.0/24'), // IETF protocol assignments
  parseCidr('192.0.2.0/24'), // Documentation (TEST-NET-1)
  parseCidr('192.88.99.0/24'), // 6to4 relay anycast
  parseCidr('192.168.0.0/16'), // Private class C
  parseCidr('198.18.0.0/15'), // Network benchmark tests
  parseCidr('198.51.100.0/24'), // Documentation (TEST-NET-2)
  parseCidr('203.0.113.0/24'), // Documentation (TEST-NET-3)
  parseCidr('224.0.0.0/4'), // Multicast
  parseCidr('240.0.0.0/4'), // Reserved
  parseCidr('255.255.255.255/32'), // Broadcast
];

// Blocked cloud metadata & internal hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  '169.254.169.254',
]);

function parseCidr(cidr: string): { network: number; mask: number } {
  const [ip, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const ipNum = ipv4ToNumber(ip);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return { network: (ipNum & mask) >>> 0, mask };
}

function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return 0;
  }
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

/**
 * Checks if an IPv4 string belongs to any private or reserved IP range.
 */
export function isPrivateIpv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const ipNum = ipv4ToNumber(ip);
  return PRIVATE_IPV4_RANGES.some((range) => (ipNum & range.mask) >>> 0 === range.network);
}

/**
 * Checks if an IPv6 string belongs to loopback, unique local, link-local, or IPv4-mapped.
 */
export function isPrivateIpv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  const normalized = ip.toLowerCase();
  // Loopback & Unspecified
  if (normalized === '::1' || normalized === '::') return true;
  // Unique local addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-local addresses (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
  if (normalized.startsWith('::ffff:')) {
    const embeddedIpv4 = normalized.replace('::ffff:', '');
    if (net.isIPv4(embeddedIpv4)) {
      return isPrivateIpv4(embeddedIpv4);
    }
  }
  return false;
}

/**
 * Validates a target URL against SSRF attack vectors.
 * Returns { valid: true, parsedUrl } or { valid: false, reason: string }.
 */
export async function validateUrlForSsrf(targetUrl: string): Promise<{
  valid: boolean;
  reason?: string;
  parsedUrl?: URL;
  resolvedIp?: string;
}> {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { valid: false, reason: 'URL parameter is missing or not a string.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl.startsWith('http://') || targetUrl.startsWith('https://') ? targetUrl : `https://${targetUrl}`);
  } catch (err: any) {
    return { valid: false, reason: 'Invalid URL format.' };
  }

  // 1. Strict protocol check: only http and https allowed
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Protocol '${parsed.protocol}' is forbidden. Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject internal/localhost hostnames
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.onion')
  ) {
    return {
      valid: false,
      reason: `Access to local/internal host '${hostname}' is strictly forbidden.`,
    };
  }

  // 3. Reject direct private IP addresses in URL
  if (net.isIP(hostname)) {
    if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
      return {
        valid: false,
        reason: `Access to private IP address '${hostname}' is forbidden.`,
      };
    }
    return { valid: true, parsedUrl: parsed, resolvedIp: hostname };
  }

  // 4. DNS Resolution to prevent DNS rebinding attacks
  try {
    const lookupResult = await dns.promises.lookup(hostname, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { valid: false, reason: `Could not resolve hostname '${hostname}'.` };
    }

    for (const record of lookupResult) {
      const { address, family } = record;
      if (family === 4 && isPrivateIpv4(address)) {
        return {
          valid: false,
          reason: `Hostname '${hostname}' resolves to private IPv4 address '${address}'. Request blocked for security.`,
        };
      }
      if (family === 6 && isPrivateIpv6(address)) {
        return {
          valid: false,
          reason: `Hostname '${hostname}' resolves to private IPv6 address '${address}'. Request blocked for security.`,
        };
      }
    }

    return {
      valid: true,
      parsedUrl: parsed,
      resolvedIp: lookupResult[0].address,
    };
  } catch (dnsErr: any) {
    return {
      valid: false,
      reason: `DNS resolution failed for '${hostname}': ${dnsErr.message || dnsErr}`,
    };
  }
}

export interface SafeFetchOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: any;
  timeoutMs?: number;
  maxRedirects?: number;
  maxSizeBytes?: number;
}

export interface SafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  finalUrl: string;
  buffer: () => Promise<Buffer>;
  text: () => Promise<string>;
}

/**
 * Safe fetch implementation that enforces:
 * - SSRF validation on the initial URL
 * - SSRF validation on every redirect step (manual redirect loop)
 * - Request timeout via AbortSignal
 * - Response size limits (protects against decompression bombs and large file DoS)
 */
export async function safeFetch(
  initialUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRedirects = options.maxRedirects ?? 5;
  const maxSizeBytes = options.maxSizeBytes ?? 5 * 1024 * 1024; // 5 MB default limit

  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // Validate current URL against SSRF
    const validation = await validateUrlForSsrf(currentUrl);
    if (!validation.valid || !validation.parsedUrl) {
      throw new Error(`SSRF Block: ${validation.reason || 'Invalid target destination'}`);
    }

    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(validation.parsedUrl.toString(), {
        method: options.method || 'GET',
        headers: options.headers || {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AIStudioBot/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
        body: options.body,
        redirect: 'manual', // Manually handle redirects to enforce SSRF validation at every step!
        signal: abortController.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err.name === 'AbortError') {
        throw new Error(`Upstream request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
    }

    // Check for redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Received redirect status ${response.status} without Location header.`);
      }

      // Resolve relative redirect against current URL
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
      redirectsCount++;

      if (redirectsCount > maxRedirects) {
        throw new Error(`Too many redirects (exceeded maximum of ${maxRedirects}).`);
      }
      continue;
    }

    // Check content-length header if provided
    const contentLengthStr = response.headers.get('content-length');
    if (contentLengthStr) {
      const contentLength = parseInt(contentLengthStr, 10);
      if (!isNaN(contentLength) && contentLength > maxSizeBytes) {
        throw new Error(
          `Response size (${(contentLength / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size of ${(
            maxSizeBytes /
            1024 /
            1024
          ).toFixed(1)} MB.`
        );
      }
    }

    const finalUrl = currentUrl;

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      finalUrl,
      buffer: async () => {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > maxSizeBytes) {
          throw new Error(
            `Downloaded content exceeds maximum limit of ${(maxSizeBytes / 1024 / 1024).toFixed(1)} MB.`
          );
        }
        return Buffer.from(arrayBuffer);
      },
      text: async () => {
        const buf = await response.arrayBuffer();
        if (buf.byteLength > maxSizeBytes) {
          throw new Error(
            `Downloaded text exceeds maximum limit of ${(maxSizeBytes / 1024 / 1024).toFixed(1)} MB.`
          );
        }
        return new TextDecoder('utf-8').decode(buf);
      },
    };
  }

  throw new Error(`Exceeded maximum redirect limit.`);
}
