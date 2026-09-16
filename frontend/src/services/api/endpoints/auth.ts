/**
 * User authentication and workstation device management endpoints.
 */

import { AuthResponse, UserProfile } from '@/types';
import { HttpClient } from '../client';
import { clearAuthToken, getAuthToken, setAuthToken } from '../storage';

export class AuthEndpoints {
  constructor(private http: HttpClient) {}

  async register(email: string, password: string, full_name: string): Promise<AuthResponse> {
    const res = await fetch(`${this.http.baseUrl}/api/auth/register`, {
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
      setAuthToken(data.token);
    }
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.http.baseUrl}/api/auth/login`, {
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
      setAuthToken(data.token);
    }
    return data;
  }

  async getAuthMe(): Promise<AuthResponse | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.http.baseUrl}/api/auth/me`, {
        headers: this.http.getAuthHeaders(),
      });
      if (!res.ok) {
        clearAuthToken();
        return null;
      }
      return res.json();
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.http.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.http.getAuthHeaders(),
      });
    } finally {
      clearAuthToken();
    }
  }

  async deactivateDevice(hardware_id: string): Promise<AuthResponse> {
    const res = await fetch(`${this.http.baseUrl}/api/auth/deactivate-device`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
      body: JSON.stringify({ hardware_id }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to deactivate device');
    }
    return data;
  }

  async getUserProfile(): Promise<UserProfile> {
    return this.http.get<UserProfile>('/api/account/profile');
  }
}
