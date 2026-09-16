/**
 * Playlist inspection and metadata extraction endpoints.
 */

import { Playlist } from '@/types';
import { HttpClient } from '../client';

export class PlaylistEndpoints {
  constructor(private http: HttpClient) {}

  async fetchPlaylist(url: string): Promise<Playlist> {
    const res = await fetch(`${this.http.baseUrl}/api/fetch-playlist`, {
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
      }

      const err: any = new Error(errMsg);
      err.title = errTitle;
      err.status = res.status;
      throw err;
    }
    return data;
  }
}
