/**
 * SQLite download queues management endpoints.
 */

import { QueueItem } from '@/types';
import { HttpClient } from '../client';

export class QueueEndpoints {
  constructor(private http: HttpClient) {}

  async getQueues(): Promise<QueueItem[]> {
    return this.http.get<QueueItem[]>('/api/queues');
  }

  async enqueuePlaylist(item: {
    playlist_url: string;
    playlist_title?: string;
    channel_name?: string;
    video_count?: number;
    canvas_preset?: string;
  }): Promise<QueueItem> {
    const res = await fetch(`${this.http.baseUrl}/api/queues`, {
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
    const res = await fetch(`${this.http.baseUrl}/api/queues/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete queue item');
  }
}
