/**
 * Creator license verification, activation, and usage telemetry endpoints.
 */

import { LicenseInfo, UsageMetrics } from '@/types';
import { HttpClient } from '../client';

export class LicenseEndpoints {
  constructor(private http: HttpClient) {}

  async getLicenseStatus(): Promise<LicenseInfo> {
    return this.http.get<LicenseInfo>('/api/license/status');
  }

  async activateLicense(license_key: string): Promise<LicenseInfo> {
    const res = await fetch(`${this.http.baseUrl}/api/license/activate`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
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
    const res = await fetch(`${this.http.baseUrl}/api/license/deactivate`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to deactivate license');
    return res.json();
  }

  async getAccountUsage(): Promise<UsageMetrics> {
    return this.http.get<UsageMetrics>('/api/account/usage');
  }

  async getBillingPlans(): Promise<any[]> {
    return this.http.get<any[]>('/api/billing/plans');
  }

  async createCheckoutSession(planTier: string): Promise<{ checkout_url: string; session_id: string; plan_tier: string }> {
    const res = await fetch(`${this.http.baseUrl}/api/billing/create-checkout-session`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
      body: JSON.stringify({ plan_tier: planTier }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create checkout session');
    return data;
  }
}
