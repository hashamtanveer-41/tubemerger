/**
 * Aptabase Telemetry Service Implementation (SOLID - Single Responsibility & DIP)
 * Privacy-preserving, fire-and-forget telemetry for TubeMerger Mobile.
 * Never throws, never interrupts user workflows.
 */

import { init, trackEvent } from '@aptabase/react-native';
import { ITelemetryService, TelemetryProps } from './ITelemetryService';
import { bucketClips, bucketDuration, bucketSize } from './bucketing';
import { categorizeError, isResolvable } from './classifier';

export const DEFAULT_TELEMETRY_APP_KEY = 'A-EU-1063594697';

export class AptabaseService implements ITelemetryService {
  private static instance: AptabaseService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AptabaseService {
    if (!AptabaseService.instance) {
      AptabaseService.instance = new AptabaseService();
    }
    return AptabaseService.instance;
  }

  init(appKey: string = DEFAULT_TELEMETRY_APP_KEY): void {
    if (this.isInitialized) {
      return;
    }

    const keyToUse = appKey || DEFAULT_TELEMETRY_APP_KEY;

    try {
      init(keyToUse, { enableCrashReporting: true });
      this.isInitialized = true;
    } catch {
      // Telemetry initialization must fail silently
    }
  }

  private track(eventName: string, props?: TelemetryProps): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      trackEvent(eventName, props);
    } catch {
      // Silent error handling for telemetry
    }
  }

  trackAppStarted(): void {
    this.track('app_started', { platform: 'android' });
  }

  trackPlaylistInspected(clipCount: number, playlistSizeMb?: number): void {
    const props: TelemetryProps = {
      clip_count: clipCount,
      clip_count_bucket: bucketClips(clipCount),
    };
    if (playlistSizeMb != null) {
      props.playlist_size_mb = Math.round(playlistSizeMb * 10) / 10;
      props.playlist_size_bucket = bucketSize(playlistSizeMb);
    }
    this.track('playlist_inspected', props);
  }

  trackMergeStarted(clipCount: number, preset: string, playlistSizeMb?: number): void {
    const props: TelemetryProps = {
      clip_count: clipCount,
      clip_count_bucket: bucketClips(clipCount),
      preset,
    };
    if (playlistSizeMb != null) {
      props.playlist_size_mb = Math.round(playlistSizeMb * 10) / 10;
      props.playlist_size_bucket = bucketSize(playlistSizeMb);
    }
    this.track('playlist_merge_started', props);
  }

  trackMergeCompleted(durationSeconds: number, clipCount: number): void {
    this.track('playlist_merge_completed', {
      duration_seconds: Math.round(durationSeconds),
      duration_bucket: bucketDuration(durationSeconds),
      clip_count: clipCount,
      clip_count_bucket: bucketClips(clipCount),
    });
  }

  trackMergeFailed(
    errorMessage: string,
    clipCount?: number,
    preset?: string,
    playlistSizeMb?: number
  ): void {
    const errorSubtype = categorizeError(errorMessage);
    const props: TelemetryProps = {
      error_type: 'pipeline_error',
      error_subtype: errorSubtype,
      is_resolvable: isResolvable(errorSubtype),
    };
    if (clipCount != null) {
      props.clip_count = clipCount;
      props.clip_count_bucket = bucketClips(clipCount);
    }
    if (preset) {
      props.selected_preset = preset;
    }
    if (playlistSizeMb != null) {
      props.playlist_size_mb = Math.round(playlistSizeMb * 10) / 10;
      props.playlist_size_bucket = bucketSize(playlistSizeMb);
    }
    this.track('playlist_merge_failed', props);
  }

  trackMergeCancelled(overallPercent: number, clipCount?: number): void {
    const props: TelemetryProps = {
      overall_percent: Math.round(overallPercent),
    };
    if (clipCount != null) {
      props.clip_count = clipCount;
    }
    this.track('playlist_merge_cancelled', props);
  }

  trackUpdateAvailable(latestVersion: string): void {
    this.track('update_available', { latest_version: latestVersion });
  }

  trackScreenTime(screenName: string, durationSeconds: number): void {
    if (durationSeconds <= 0) return;
    this.track('screen_time', {
      screen_name: screenName,
      duration_seconds: Math.round(durationSeconds),
      platform: 'android',
    });
  }

  trackCustomEvent(eventName: string, props?: TelemetryProps): void {
    this.track(eventName, props);
  }
}

export const telemetryService: ITelemetryService = AptabaseService.getInstance();
