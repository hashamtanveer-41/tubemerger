/**
 * System and desktop OS integration endpoints.
 */

import { HealthStatus } from '@/types';
import { HttpClient } from '../client';

export class SystemEndpoints {
  constructor(private http: HttpClient) {}

  async getHealth(): Promise<HealthStatus> {
    return this.http.get<HealthStatus>('/api/health');
  }

  async openFile(path: string): Promise<void> {
    const res = await fetch(`${this.http.baseUrl}/api/open-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('Could not open file in media player');
  }

  async openFolder(path: string): Promise<void> {
    const res = await fetch(`${this.http.baseUrl}/api/open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('Could not open folder in system file manager');
  }

  async openUrl(url: string): Promise<void> {
    try {
      await fetch(`${this.http.baseUrl}/api/open-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async getSettings(): Promise<{ tour_completed?: boolean }> {
    try {
      const res = await fetch(`${this.http.baseUrl}/api/settings`);
      if (res.ok) {
        return res.json();
      }
      return { tour_completed: false };
    } catch {
      return { tour_completed: false };
    }
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      await fetch(`${this.http.baseUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch {
      // Best effort
    }
  }

  async quitApp(): Promise<void> {
    try {
      await fetch(`${this.http.baseUrl}/api/system/quit`, { method: 'POST' });
    } catch {
      // Process will exit anyway
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const res = await fetch(`${this.http.baseUrl}/api/updates/connectivity`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.online === true;
    } catch {
      return false;
    }
  }
}
