/**
 * Administrator dashboard and license generator endpoints.
 */

import { AdminLicense, AdminStats, AdminUsageEvent, AdminUser } from '@/types';
import { HttpClient } from '../client';

export class AdminEndpoints {
  constructor(private http: HttpClient) {}

  async adminGetStats(): Promise<AdminStats> {
    return this.http.get<AdminStats>('/api/admin/stats');
  }

  async adminGetUsers(search?: string): Promise<AdminUser[]> {
    let url = '/api/admin/users';
    if (search && search.trim()) {
      url += `?search=${encodeURIComponent(search.trim())}`;
    }
    return this.http.get<AdminUser[]>(url);
  }

  async adminUpdateUserTier(userId: string, tier: string, role?: string): Promise<any> {
    return this.http.post<any>(`/api/admin/users/${userId}/tier`, { tier, role });
  }

  async adminResetDevices(userId: string): Promise<any> {
    return this.http.post<any>(`/api/admin/users/${userId}/reset-devices`);
  }

  async adminGetLicenses(): Promise<AdminLicense[]> {
    return this.http.get<AdminLicense[]>('/api/admin/licenses');
  }

  async adminGenerateLicense(payload: {
    tier: string;
    max_devices: number;
    user_email?: string;
    notes?: string;
  }): Promise<AdminLicense> {
    return this.http.post<AdminLicense>('/api/admin/licenses/generate', payload);
  }

  async adminRevokeLicense(licenseKey: string): Promise<any> {
    return this.http.post<any>(`/api/admin/licenses/${encodeURIComponent(licenseKey)}/revoke`);
  }

  async adminGetAuditLog(limit = 50): Promise<AdminUsageEvent[]> {
    return this.http.get<AdminUsageEvent[]>(`/api/admin/audit-log?limit=${limit}`);
  }
}
