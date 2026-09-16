/**
 * Merge pipeline control and real-time SSE progress streaming.
 */

import { ProgressEvent } from '@/types';
import { HttpClient } from '../client';

export class MergerEndpoints {
  constructor(private http: HttpClient) {}

  async startMerge(payload: {
    url: string;
    selected_indices: number[];
    output_filename?: string;
    merge_videos?: boolean;
    quality?: string;
    canvas_preset?: string;
    format?: 'mp4' | 'mp3';
    estimated_size_mb?: number;
  }): Promise<{ status: string; job_id: string }> {
    const res = await fetch(`${this.http.baseUrl}/api/start-merge`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
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
    const res = await fetch(`${this.http.baseUrl}/api/pause`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail?.error || data.message || `Failed to pause download (${res.status})`);
    }
    return res.json();
  }

  async resumeMerge(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${this.http.baseUrl}/api/resume`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail?.error || data.message || `Failed to resume download (${res.status})`);
    }
    return res.json();
  }

  async cancelMerge(): Promise<void> {
    await fetch(`${this.http.baseUrl}/api/cancel`, {
      method: 'POST',
      headers: this.http.getAuthHeaders(),
    });
  }

  connectProgress(
    onMessage: (event: ProgressEvent) => void,
    onError?: (err: any) => void
  ): () => void {
    const eventSource = new EventSource(`${this.http.baseUrl}/api/progress`);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error('Failed to parse SSE JSON payload:', err);
      }
    };

    eventSource.onerror = (e) => {
      if (eventSource.readyState === EventSource.CLOSED) {
        if (onError) onError(e);
      }
    };

    return () => {
      eventSource.close();
    };
  }
}
