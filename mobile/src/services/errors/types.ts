/**
 * TubeMerger Mobile - Error Classification Types
 * Aligned with desktop error categorization and telemetry taxonomy.
 * Architecture: SOLID principles - Single Responsibility & Open/Closed
 */

export type ErrorSubtype =
  | 'bot_detection'
  | 'rate_limited_429'
  | 'age_restricted'
  | 'geo_restricted'
  | 'network_timeout'
  | 'disk_full'
  | 'private_video'
  | 'video_unavailable'
  | 'format_not_available'
  | 'copyright_takedown'
  | 'missing_ffmpeg_binary'
  | 'circuit_breaker_rate_limit'
  | 'all_downloads_failed'
  | 'permission_denied'
  | 'live_stream'
  | 'sabr_streaming'
  | 'unsupported_url'
  | 'generic_pipeline_error';

export interface ClassifiedError {
  subtype: ErrorSubtype;
  badge: string;
  userTitle: string;
  userMessage: string;
  explanation?: string;
  recommendation: string;
  isResolvable: boolean;
  rawError: string;
  sanitizedError: string;
}
