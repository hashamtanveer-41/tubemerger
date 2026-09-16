/**
 * Storage abstractions with cookie and in-memory fallbacks for sandboxed webviews.
 */

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

export function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(0).toUTCString();
    document.cookie = `${name}=; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

export class SafeStorage {
  private memoryStore: Record<string, string> = {};

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) return val;
      }
    } catch {
      // WebKitGTK / Sandboxed webview fallback
    }
    const cookieVal = getCookie(key);
    if (cookieVal) return cookieVal;
    return this.memoryStore[key] || null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // WebKitGTK fallback
    }
    setCookie(key, value);
    this.memoryStore[key] = value;
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // WebKitGTK fallback
    }
    removeCookie(key);
    delete this.memoryStore[key];
  }
}

export const safeStorage = new SafeStorage();

const TOKEN_KEY = 'tubemerger_auth_token';
const LEGACY_TOKEN_KEY = 'tubemerge_auth_token';

export function getAuthToken(): string | null {
  return safeStorage.getItem(TOKEN_KEY) || safeStorage.getItem(LEGACY_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  safeStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  safeStorage.removeItem(TOKEN_KEY);
  safeStorage.removeItem(LEGACY_TOKEN_KEY);
}
