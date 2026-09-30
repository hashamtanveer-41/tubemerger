/**
 * Telemetry Error Classifier & Sanitizer
 * Port of src/tubemerger/apps/telemetry/classifier.py.
 * Strips personal paths and categorizes errors into sanitized codes.
 */

export function categorizeError(raw: string): string {
  const msg = raw.toLowerCase();

  if (msg.includes('http error 429') || msg.includes('too many requests')) {
    return 'rate_limited_429';
  }
  if (msg.includes('bot verification') || msg.includes('not a bot')) {
    return 'bot_detection';
  }
  if (msg.includes('not available in your') || msg.includes('geo-restricted')) {
    return 'geo_restricted';
  }
  if (msg.includes('copyright') || msg.includes('account terminated')) {
    return 'copyright_takedown';
  }
  if (msg.includes('age-restricted') || msg.includes('sign in to confirm')) {
    return 'age_restricted';
  }
  if (msg.includes('live event') || msg.includes('live stream')) {
    return 'live_stream';
  }
  if (msg.includes('ffmpeg not found') || msg.includes('ffprobe not found')) {
    return 'missing_ffmpeg_binary';
  }
  if (msg.includes('format not available') || msg.includes('no video formats')) {
    return 'format_not_available';
  }
  if (msg.includes('private video') || msg.includes('video unavailable')) {
    return 'video_unavailable';
  }
  if (
    msg.includes('timed out') ||
    msg.includes('socket timeout') ||
    msg.includes('network is unreachable')
  ) {
    return 'network_timeout';
  }
  if (msg.includes('no space left') || msg.includes('disk full')) {
    return 'disk_full';
  }
  if (msg.includes('permission denied') || msg.includes('access is denied')) {
    return 'permission_denied';
  }

  // Sanitize: strip local user paths, truncate, slug-ify
  const clean = raw
    .replace(/\/(home|Users|data|storage)\/[^\s/]+/g, '[PATH]')
    .replace(/['",:;[\]{}()\\/]/g, ' ')
    .trim()
    .slice(0, 40)
    .replace(/\s+/g, '_')
    .replace(/^_|_$/g, '');

  return clean ? `other_${clean}` : 'other_unknown';
}

export function isResolvable(subtype: string): boolean {
  const resolvableCategories = [
    'rate_limited_429',
    'network_timeout',
    'bot_detection',
    'circuit_breaker_rate_limit',
    'all_downloads_failed',
    'other_unknown',
  ];

  return resolvableCategories.includes(subtype) || subtype.startsWith('other_');
}
