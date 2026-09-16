/**
 * Software updates check endpoints.
 */

import { UpdateInfo } from '@/types';
import { HttpClient } from '../client';

export interface UpdateCheckResult {
  online: boolean;
  update_info: UpdateInfo | null;
}

export class UpdateEndpoints {
  constructor(private http: HttpClient) {}

  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      const res = await fetch(`${this.http.baseUrl}/api/updates/check`);
      if (!res.ok) return { online: false, update_info: null };
      return res.json();
    } catch {
      return { online: false, update_info: null };
    }
  }
}
