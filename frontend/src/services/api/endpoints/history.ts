/**
 * Merge and download history logging endpoints.
 */

import { HistoryItem } from '@/types';
import { HttpClient } from '../client';

export class HistoryEndpoints {
  constructor(private http: HttpClient) {}

  async getHistory(): Promise<HistoryItem[]> {
    return this.http.get<HistoryItem[]>('/api/history');
  }

  async deleteHistoryItem(id: number): Promise<void> {
    await this.http.delete<void>(`/api/history/${id}`);
  }

  async clearAllHistory(): Promise<void> {
    await this.http.delete<void>('/api/history');
  }
}
