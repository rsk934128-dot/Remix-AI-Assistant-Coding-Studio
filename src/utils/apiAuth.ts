import { auth } from '../lib/firebase';

const SESSION_TOKEN_KEY = 'remix_auth_session_token';
const API_KEY_STORAGE = 'remix_developer_api_key';

let inMemoryToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Retrieves valid authentication headers for backend API requests.
 * Automatically selects:
 * 1. Logged-in Firebase User JWT ID Token (highest priority)
 * 2. Developer API Key if configured in storage
 * 3. Verified Client Session JWT token from /api/auth/session
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // 1. If user is signed in with Firebase / Google Auth, obtain their fresh ID token
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        return {
          Authorization: `Bearer ${idToken}`,
        };
      }
    }
  } catch (err) {
    console.warn('Could not retrieve Firebase ID token:', err);
  }

  // 2. If a developer API key is saved in localStorage
  try {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedApiKey && savedApiKey.startsWith('sk_')) {
      return {
        'x-api-key': savedApiKey,
      };
    }
  } catch {}

  // 3. Fallback: Retrieve or refresh valid client session token
  const sessionToken = await getOrFetchSessionToken();
  if (sessionToken) {
    return {
      Authorization: `Bearer ${sessionToken}`,
    };
  }

  return {};
}

/**
 * Fetches and caches a signed client session token from the backend
 */
export async function getOrFetchSessionToken(forceRefresh: boolean = false): Promise<string | null> {
  const now = Date.now();

  if (!forceRefresh && inMemoryToken && tokenExpiryTime > now + 60000) {
    return inMemoryToken;
  }

  if (!forceRefresh) {
    try {
      const stored = sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(SESSION_TOKEN_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.expiresAt > now + 60000) {
          inMemoryToken = parsed.token;
          tokenExpiryTime = parsed.expiresAt;
          return inMemoryToken;
        }
      }
    } catch {}
  }

  // Fetch a new session token from the server
  try {
    const res = await fetch('/api/auth/session');
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        inMemoryToken = data.token;
        tokenExpiryTime = now + (data.expiresIn || 86400) * 1000;
        const record = JSON.stringify({
          token: inMemoryToken,
          expiresAt: tokenExpiryTime,
        });
        try {
          sessionStorage.setItem(SESSION_TOKEN_KEY, record);
        } catch {}
        return inMemoryToken;
      }
    }
  } catch (err) {
    console.warn('Failed to obtain client session token:', err);
  }

  return inMemoryToken;
}

/**
 * Drop-in wrapper around window.fetch that automatically injects
 * API Key / JWT authentication headers and handles transparent token refresh on 401.
 */
export async function authenticatedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const headers = new Headers(init?.headers || {});

  Object.entries(authHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  const response = await fetch(url, {
    ...init,
    headers,
  });

  // If 401 Unauthorized received, clear cache, obtain fresh session token, and retry once
  if (response.status === 401) {
    inMemoryToken = null;
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {}

    const freshHeaders = await getAuthHeaders();
    const retryHeaders = new Headers(init?.headers || {});
    Object.entries(freshHeaders).forEach(([k, v]) => {
      retryHeaders.set(k, v);
    });

    return fetch(url, {
      ...init,
      headers: retryHeaders,
    });
  }

  return response;
}
