/**
 * User review and cancellation complaint feedback endpoints.
 */

import { HttpClient } from '../client';
import { ReviewPayload, CancellationComplaintPayload } from '@/types';

export interface FeedbackResponse {
  status: string;
  github_url?: string;
  mailto_url?: string;
  gmail_url?: string;
  target_email?: string;
}

export class FeedbackEndpoints {
  constructor(private http: HttpClient) {}

  async submitReview(payload: ReviewPayload): Promise<FeedbackResponse> {
    try {
      const res = await fetch(`${this.http.baseUrl}/api/feedback/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { status: 'error' };
    }
  }

  async submitCancellationComplaint(
    payload: CancellationComplaintPayload
  ): Promise<FeedbackResponse> {
    try {
      const res = await fetch(`${this.http.baseUrl}/api/feedback/cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { status: 'error' };
    }
  }
}
