import {
  HealthStatus,
  Playlist,
  ProgressEvent,
  LicenseInfo,
  UserProfile,
  UsageMetrics,
  HistoryItem,
  QueueItem,
  AuthResponse,
  ActiveDevice,
  AdminStats,
  AdminUser,
  AdminLicense,
  AdminUsageEvent,
  UpdateInfo,
} from '../types';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // Ignore
  }
}

class SafeStorage {
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

const safeStorage = new SafeStorage();

export class ApiClient {
  private baseUrl = '';

  getToken(): string | null {
    return safeStorage.getItem('tubemerger_auth_token') || safeStorage.getItem('tubemerge_auth_token');
  }

  setToken(token: string): void {
    safeStorage.setItem('tubemerger_auth_token', token);
  }

  clearToken(): void {
    safeStorage.removeItem('tubemerger_auth_token');
    safeStorage.removeItem('tubemerge_auth_token');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${this.baseUrl}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  async fetchPlaylist(url: string): Promise<Playlist> {
    const res = await fetch(`${this.baseUrl}/api/fetch-playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) {
      let errMsg = 'Failed to fetch playlist.';
      let errTitle = 'Action Error';

      if (data.detail && typeof data.detail === 'object') {
        errMsg = data.detail.error || data.detail.message || JSON.stringify(data.detail);
        errTitle = data.detail.title || 'Action Error';
      } else if (typeof data.detail === 'string') {
        errMsg = data.detail;
      } else if (data.error) {
        errMsg = data.error;
      }

      // Clean up any double/nested prefixes
      errMsg = errMsg.replace(/^(Failed to fetch playlist:\s*)+/i, '').trim();
      const err = new Error(errMsg);
      (err as any).title = errTitle;
      throw err;
    }
    return data;
  }

  async startMerge(payload: {
    url: string;
    selected_indices: number[];
    output_filename?: string;
    merge_videos?: boolean;
    quality?: string;
    canvas_preset?: string;
    format?: 'mp4' | 'mp3';
  }): Promise<{ status: string; job_id: string }> {
    const res = await fetch(`${this.baseUrl}/api/start-merge`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = (data.detail && (data.detail.error || data.detail)) || data.error || 'Failed to start merge';
      throw new Error(errMsg);
    }
    return data;
  }

  async pauseMerge(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/pause`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail?.error || data.message || `Failed to pause download (${res.status})`);
    }
    return res.json();
  }

  async resumeMerge(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/resume`, { method: 'POST', headers: this.getAuthHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail?.error || data.message || `Failed to resume download (${res.status})`);
    }
    return res.json();
  }

  async cancelMerge(): Promise<void> {
    await fetch(`${this.baseUrl}/api/cancel`, { method: 'POST', headers: this.getAuthHeaders() });
  }

  async openFile(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/open-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('Could not open file in media player');
  }

  async openFolder(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('Could not open folder in system file manager');
  }

  async openUrl(url: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/open-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async getLicenseStatus(): Promise<LicenseInfo> {
    const res = await fetch(`${this.baseUrl}/api/license/status`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch license status');
    return res.json();
  }

  async activateLicense(license_key: string): Promise<LicenseInfo> {
    const res = await fetch(`${this.baseUrl}/api/license/activate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ license_key }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail || 'License activation failed';
      throw new Error(msg);
    }
    return data;
  }

  async deactivateLicense(): Promise<LicenseInfo> {
    const res = await fetch(`${this.baseUrl}/api/license/deactivate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to deactivate license');
    return res.json();
  }

  async getUserProfile(): Promise<UserProfile> {
    const res = await fetch(`${this.baseUrl}/api/account/profile`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  }

  async getAccountUsage(): Promise<UsageMetrics> {
    const res = await fetch(`${this.baseUrl}/api/account/usage`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch usage metrics');
    return res.json();
  }

  async getHistory(): Promise<HistoryItem[]> {
    const res = await fetch(`${this.baseUrl}/api/history`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  }

  async deleteHistoryItem(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/history/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete history item');
  }

  async clearAllHistory(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/history`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to clear history');
  }

  async getQueues(): Promise<QueueItem[]> {
    const res = await fetch(`${this.baseUrl}/api/queues`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch queues');
    return res.json();
  }

  async enqueuePlaylist(item: {
    playlist_url: string;
    playlist_title?: string;
    channel_name?: string;
    video_count?: number;
    canvas_preset?: string;
  }): Promise<QueueItem> {
    const res = await fetch(`${this.baseUrl}/api/queues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) {
      let errMsg = 'Failed to enqueue playlist.';
      let errTitle = 'Queue Error';
      if (data.detail && typeof data.detail === 'object') {
        errMsg = data.detail.error || data.detail.message || JSON.stringify(data.detail);
        errTitle = data.detail.title || errTitle;
      } else if (typeof data.detail === 'string') {
        errMsg = data.detail;
      }
      errMsg = errMsg.replace(/^(Failed to add to queue:\s*)+/i, '').trim();
      const err = new Error(errMsg);
      (err as any).title = errTitle;
      throw err;
    }
    return data;
  }

  async deleteQueueItem(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/queues/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete queue item');
  }

  async register(email: string, password: string, full_name: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = (data.detail && (data.detail.error || data.detail)) || 'Registration failed';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = (data.detail && (data.detail.error || data.detail.message || data.detail)) || 'Login failed';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getAuthMe(): Promise<AuthResponse | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        this.clearToken();
        return null;
      }
      return res.json();
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } finally {
      this.clearToken();
    }
  }

  async deactivateDevice(hardware_id: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/auth/deactivate-device`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ hardware_id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to deactivate device');
    }
    return data;
  }

  // ---------------------------------------------------------------------------
  // Administrator Subsystem APIs
  // ---------------------------------------------------------------------------
  async adminGetStats(): Promise<AdminStats> {
    const res = await fetch(`${this.baseUrl}/api/admin/stats`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin statistics');
    return res.json();
  }

  async adminGetUsers(search?: string): Promise<AdminUser[]> {
    let url = `${this.baseUrl}/api/admin/users`;
    if (search && search.trim()) {
      url += `?search=${encodeURIComponent(search.trim())}`;
    }
    const res = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch users list');
    return res.json();
  }

  async adminUpdateUserTier(userId: string, tier: string, role?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/admin/users/${userId}/tier`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ tier, role }),
    });
    if (!res.ok) throw new Error('Failed to update user tier');
    return res.json();
  }

  async adminResetDevices(userId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/admin/users/${userId}/reset-devices`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset user workstations');
    return res.json();
  }

  async adminGetLicenses(): Promise<AdminLicense[]> {
    const res = await fetch(`${this.baseUrl}/api/admin/licenses`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch licenses inventory');
    return res.json();
  }

  async adminGenerateLicense(payload: {
    tier: string;
    max_devices: number;
    user_email?: string;
    notes?: string;
  }): Promise<AdminLicense> {
    const res = await fetch(`${this.baseUrl}/api/admin/licenses/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate license key');
    return res.json();
  }

  async adminRevokeLicense(licenseKey: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/admin/licenses/${encodeURIComponent(licenseKey)}/revoke`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to revoke license');
    return res.json();
  }

  async adminGetAuditLog(limit = 50): Promise<AdminUsageEvent[]> {
    const res = await fetch(`${this.baseUrl}/api/admin/audit-log?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch billing audit log');
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Cloud Billing & Payments
  // ---------------------------------------------------------------------------
  async getBillingPlans(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/billing/plans`);
    if (!res.ok) throw new Error('Failed to load plans');
    return res.json();
  }

  async createCheckoutSession(planTier: string): Promise<{ checkout_url: string; session_id: string; plan_tier: string }> {
    const res = await fetch(`${this.baseUrl}/api/billing/create-checkout-session`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ plan_tier: planTier }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create checkout session');
    return data;
  }

  connectProgress(
    onMessage: (event: ProgressEvent) => void,
    onError?: (err: any) => void
  ): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/api/progress`);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error('Failed to parse SSE JSON payload:', err);
      }
    };

    eventSource.onerror = (e) => {
      // In browsers, EventSource auto-reconnects on transient connection drops (readyState === CONNECTING).
      // Only invoke onError and tear down if the connection was permanently closed.
      if (eventSource.readyState === EventSource.CLOSED) {
        if (onError) onError(e);
      }
    };

    return () => {
      eventSource.close();
    };
  }

  async getSettings(): Promise<{ tour_completed?: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/settings`);
      if (!res.ok) throw new Error('Failed to get settings');
      return await res.json();
    } catch {
      return { tour_completed: false };
    }
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch {
      // Best effort
    }
  }
}

export const api = new ApiClient();

// ---------------------------------------------------------------------------
// Update / Connectivity helpers (module-level, no auth required)
// ---------------------------------------------------------------------------
export async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch('/api/updates/connectivity');
    if (!res.ok) return false;
    const data = await res.json();
    return data.online === true;
  } catch {
    return false;
  }
}

export interface UpdateCheckResult {
  online: boolean;
  update_info: UpdateInfo | null;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const res = await fetch('/api/updates/check');
    if (!res.ok) return { online: false, update_info: null };
    return res.json();
  } catch {
    return { online: false, update_info: null };
  }
}

export async function quitApp(): Promise<void> {
  try {
    await fetch('/api/system/quit', { method: 'POST' });
  } catch {
    // Process will exit anyway
  }
}
