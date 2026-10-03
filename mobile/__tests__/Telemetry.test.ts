import { bucketClips, bucketDuration, bucketSize } from '../src/services/analytics/bucketing';
import { categorizeError } from '../src/services/analytics/classifier';
import { AptabaseService, DEFAULT_TELEMETRY_APP_KEY } from '../src/services/analytics/AptabaseService';

// Mock @aptabase/react-native
jest.mock('@aptabase/react-native', () => ({
  init: jest.fn(),
  trackEvent: jest.fn(),
}));

import { init as aptabaseInit, trackEvent as aptabaseTrackEvent } from '@aptabase/react-native';

describe('Telemetry Service & Analytics Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bucketing Algorithms', () => {
    test('bucketClips accurately clusters clip counts', () => {
      expect(bucketClips(1)).toBe('1-5');
      expect(bucketClips(5)).toBe('1-5');
      expect(bucketClips(6)).toBe('6-15');
      expect(bucketClips(15)).toBe('6-15');
      expect(bucketClips(16)).toBe('16-30');
      expect(bucketClips(30)).toBe('16-30');
      expect(bucketClips(31)).toBe('31-50');
      expect(bucketClips(50)).toBe('31-50');
      expect(bucketClips(51)).toBe('50+');
      expect(bucketClips(100)).toBe('50+');
    });

    test('bucketDuration accurately categorizes execution time', () => {
      expect(bucketDuration(30)).toBe('<1m');
      expect(bucketDuration(59)).toBe('<1m');
      expect(bucketDuration(60)).toBe('1-5m');
      expect(bucketDuration(299)).toBe('1-5m');
      expect(bucketDuration(300)).toBe('5-15m');
      expect(bucketDuration(899)).toBe('5-15m');
      expect(bucketDuration(900)).toBe('15m+');
      expect(bucketDuration(3600)).toBe('15m+');
    });

    test('bucketSize accurately clusters payload size', () => {
      expect(bucketSize(50)).toBe('<100MB');
      expect(bucketSize(250)).toBe('100-500MB');
      expect(bucketSize(750)).toBe('500MB-1GB');
      expect(bucketSize(2500)).toBe('1-5GB');
      expect(bucketSize(7000)).toBe('5GB+');
    });
  });

  describe('Error Classification & Sanitization', () => {
    test('categorizes known YouTube / yt-dlp error patterns', () => {
      expect(categorizeError('HTTP Error 429: Too Many Requests')).toBe('rate_limited_429');
      expect(categorizeError('Sign in to confirm you’re not a bot')).toBe('bot_detection');
      expect(categorizeError('This video is not available in your country')).toBe('geo_restricted');
      expect(categorizeError('blocked on copyright grounds')).toBe('copyright_takedown');
      expect(categorizeError('ffmpeg not found in system path')).toBe('missing_ffmpeg_binary');
      expect(categorizeError('Read timed out on socket')).toBe('network_timeout');
      expect(categorizeError('No space left on device')).toBe('disk_full');
      expect(categorizeError('Permission denied opening directory')).toBe('permission_denied');
    });

    test('sanitizes user paths from unclassified errors', () => {
      const sanitized = categorizeError('Crash at /home/user123/downloads/file.mp4 failure');
      expect(sanitized).not.toContain('/home/user123');
      expect(sanitized).toContain('PATH');
    });
  });

  describe('AptabaseService Integration', () => {
    test('initializes with production key by default', () => {
      const service = AptabaseService.getInstance();
      service.init();
      expect(aptabaseInit).toHaveBeenCalledWith(DEFAULT_TELEMETRY_APP_KEY, {
        enableCrashReporting: true,
      });
    });

    test('tracks app started event', () => {
      const service = AptabaseService.getInstance();
      service.init();
      service.trackAppStarted();
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('app_started', { platform: 'android' });
    });

    test('tracks playlist inspected with bucketing', () => {
      const service = AptabaseService.getInstance();
      service.init();
      service.trackPlaylistInspected(12, 350.45);
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('playlist_inspected', {
        clip_count: 12,
        clip_count_bucket: '6-15',
        playlist_size_mb: 350.5,
        playlist_size_bucket: '100-500MB',
      });
    });

    test('tracks merge lifecycle events', () => {
      const service = AptabaseService.getInstance();
      service.init();

      service.trackMergeStarted(8, '1080p', 450);
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('playlist_merge_started', {
        clip_count: 8,
        clip_count_bucket: '6-15',
        preset: '1080p',
        playlist_size_mb: 450,
        playlist_size_bucket: '100-500MB',
      });

      service.trackMergeCompleted(120, 8);
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('playlist_merge_completed', {
        duration_seconds: 120,
        duration_bucket: '1-5m',
        clip_count: 8,
        clip_count_bucket: '6-15',
      });

      service.trackMergeCancelled(45, 8);
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('playlist_merge_cancelled', {
        overall_percent: 45,
        clip_count: 8,
      });

      service.trackMergeFailed('HTTP Error 429: Too Many Requests', 8, '1080p');
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('playlist_merge_failed', {
        error_type: 'pipeline_error',
        error_subtype: 'rate_limited_429',
        is_resolvable: true,
        clip_count: 8,
        clip_count_bucket: '6-15',
        selected_preset: '1080p',
      });
    });

    test('tracks update available', () => {
      const service = AptabaseService.getInstance();
      service.init();
      service.trackUpdateAvailable('v1.2.0');
      expect(aptabaseTrackEvent).toHaveBeenCalledWith('update_available', {
        latest_version: 'v1.2.0',
      });
    });
  });
});
