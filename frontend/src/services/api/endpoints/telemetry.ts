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
        body: JSON.stringify({ event_name: eventName, props: props || {} }),
        keepalive: true,
      });
    } catch {
      // Telemetry dispatch failures must always remain silent
    }
  }

  trackScreenTime(screenName: string, durationSeconds: number): void {
    if (durationSeconds <= 0) return;
    this.sendBeaconEvent('screen_time', {
      screen_name: screenName,
      duration_seconds: Math.round(durationSeconds),
      platform: 'desktop',
    });
  }

  flushScreenTimes(screenTimes: Record<string, number>): void {
    for (const [screenName, duration] of Object.entries(screenTimes)) {
      if (duration >= 1) {
        this.trackScreenTime(screenName, duration);
      }
    }
  }

  sendBeaconEvent(eventName: string, props?: Record<string, any>): void {
    try {
      const url = `${this.http.baseUrl}/api/telemetry/event`;
      const payload = JSON.stringify({ event_name: eventName, props: props || {} });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        const queued = navigator.sendBeacon(url, blob);
        if (queued) return;
      }
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Telemetry dispatch failures must always remain silent
    }
  }
}
