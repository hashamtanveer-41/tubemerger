/**
 * Anonymous telemetry event dispatcher endpoints.
 */

import { HttpClient } from '../client';

export class TelemetryEndpoints {
  constructor(private http: HttpClient) {}

  async trackEvent(eventName: string, props?: Record<string, any>): Promise<void> {
    try {
      await fetch(`${this.http.baseUrl}/api/telemetry/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: eventName, properties: props || {} }),
      });
    } catch {
      // Telemetry dispatch failures must always remain silent
    }
  }
}
