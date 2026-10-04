/**
 * Anonymous telemetry event dispatcher endpoints.
 */

import { HttpClient } from '../client';

export function formatDurationHuman(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  if (rounded === 0) return '0 secs';

  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} sec${seconds === 1 ? '' : 's'}`);
  }

  return parts.join(' ');
}

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

  trackSessionScreenTime(screenTimes: Record<string, number>, platform = 'desktop'): void {
    const validEntries = Object.entries(screenTimes).filter(([_, sec]) => sec >= 1);
    if (validEntries.length === 0) return;

    let totalSeconds = 0;
    const props: Record<string, any> = { platform };
    const visitedNames: string[] = [];

    for (const [screen, duration] of validEntries) {
      const rounded = Math.round(duration);
      totalSeconds += rounded;
      const cleanKey = screen.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      props[`${cleanKey}_time`] = formatDurationHuman(rounded);
      props[`${cleanKey}_seconds`] = rounded;
      visitedNames.push(screen);
    }

    props.session_duration = formatDurationHuman(totalSeconds);
    props.session_duration_seconds = totalSeconds;
    props.screens_visited = visitedNames.join(', ');
    props.screens_count = visitedNames.length;

    this.sendBeaconEvent('session_screen_time', props);
  }

  flushScreenTimes(screenTimes: Record<string, number>): void {
    this.trackSessionScreenTime(screenTimes, 'desktop');
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
