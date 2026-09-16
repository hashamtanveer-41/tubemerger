/**
 * Base HTTP client with authorization headers, error parsing, and JSON serialization.
 */

import { getAuthToken } from './storage';

export class HttpClient {
  readonly baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  getAuthHeaders(): Record<string, string> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    let data: any = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      try {
        data = await res.text();
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      let errMsg = 'Request failed';
      let errTitle = 'Action Error';

      if (data && typeof data === 'object' && data.detail) {
        if (typeof data.detail === 'object') {
          errMsg = data.detail.error || data.detail.message || JSON.stringify(data.detail);
          errTitle = data.detail.title || 'Action Error';
        } else if (typeof data.detail === 'string') {
          errMsg = data.detail;
        }
      } else if (typeof data === 'string' && data.length > 0) {
        errMsg = data;
      } else if (res.statusText) {
        errMsg = res.statusText;
      }

      const err: any = new Error(errMsg);
      err.status = res.status;
      err.title = errTitle;
      throw err;
    }

    return data as T;
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { method: 'GET', ...(options || {}) });
  }

  async post<T>(path: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(options || {}),
    });
  }

  async put<T>(path: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(options || {}),
    });
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', ...(options || {}) });
  }
}

export const httpClient = new HttpClient();
