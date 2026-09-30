/**
 * TubeMerger Mobile - ErrorClassifier
 * Maps raw engine / network exceptions to actionable user solutions
 * Architectural Parity: Directly aligned with Desktop Classifier & ReportIssueModal taxonomy
 * Architecture: SOLID principles - Single Responsibility & Strategy Pattern
 */

import { ClassifiedError } from './types';

export class ErrorClassifier {
  /**
   * Strips sensitive personal local file paths and raw parameters to protect privacy.
   */
  public static sanitize(raw: string | undefined | null): string {
    if (!raw) return 'Unknown error occurred.';
    return raw
      .replace(/\/data\/user\/[0-9]+\/[^\s"']+/g, '[app_private_storage]')
      .replace(/\/storage\/emulated\/[0-9]+\/[^\s"']+/g, '[user_storage]')
      .replace(/[a-zA-Z]:\\[^\s"']+/g, '[local_path]')
      .replace(/\/(?:home|Users|tmp|var)[^\s"']+/g, '[system_path]')
      .replace(/--output\s+[^\s]+/g, '--output [redacted]')
      .trim();
  }

  public static classify(raw: string | undefined | null): ClassifiedError {
    const rawStr = raw || 'An unknown error occurred.';
    const sanitized = this.sanitize(rawStr);
    const msg = rawStr.toLowerCase().replace(/[’`]/g, "'");

    if (
      msg.includes('bot verification') ||
      msg.includes('not a bot') ||
      msg.includes('automated queries') ||
      msg.includes("prove you're human") ||
      (msg.includes('bot') && msg.includes('sign in'))
    ) {
      return {
        subtype: 'bot_detection',
        badge: 'Bot Detection',
        userTitle: 'Automated Bot Verification',
        userMessage: 'YouTube triggered a temporary bot verification check for your network IP.',
        explanation: 'YouTube requested automated challenge verification or sign-in for this stream.',
        recommendation: 'Wait 1–2 minutes and retry, or switch between Wi-Fi and mobile data.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('http error 429') || msg.includes('too many requests')) {
      return {
        subtype: 'rate_limited_429',
        badge: 'HTTP 429 Rate Limited',
        userTitle: 'YouTube Rate Limit Throttling',
        userMessage: 'YouTube temporarily throttled downloads because multiple requests were sent in rapid succession.',
        explanation: 'Your IP address exceeded YouTube concurrent request thresholds.',
        recommendation: 'Wait 30–60 seconds and retry. Completed clips are safely cached.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('circuit breaker') || msg.includes('circuit breaker tripped')) {
      return {
        subtype: 'circuit_breaker_rate_limit',
        badge: 'Circuit Breaker Tripped',
        userTitle: 'Connection Protection Activated',
        userMessage: 'YouTube blocked multiple consecutive download attempts. The safety circuit breaker paused the queue.',
        explanation: 'Automated safety cutoff tripped to prevent network IP banning.',
        recommendation: 'Wait 30–60 seconds and tap Retry. Completed clips will be preserved.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('http error 403') || msg.includes('forbidden') || msg.includes('sabr')) {
      return {
        subtype: 'sabr_streaming',
        badge: 'Stream Token Expired',
        userTitle: 'Stream URL Refresh Required (403)',
        userMessage: 'YouTube playback token expired or requires client re-negotiation.',
        explanation: 'Streaming signatures rotate dynamically to prevent direct URL caching.',
        recommendation: 'TubeMerger uses mobile extractor arguments to bypass stream throttling. Retry download.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('age-restricted') || msg.includes('sign in to confirm your age') || msg.includes('age confirmation')) {
      return {
        subtype: 'age_restricted',
        badge: 'Age Restricted',
        userTitle: 'Age-Restricted Video',
        userMessage: 'This video is flagged by YouTube as age-restricted and requires an authenticated adult account.',
        explanation: 'YouTube enforces server-side age verification login policies for this content.',
        recommendation: 'Deselect this clip from your playlist to merge the remaining videos.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('copyright') || msg.includes('account terminated') || msg.includes('takedown')) {
      return {
        subtype: 'copyright_takedown',
        badge: 'Copyright Blocked',
        userTitle: 'Copyright Takedown Notice',
        userMessage: 'This video stream was blocked due to a copyright takedown request on YouTube.',
        explanation: 'Content publisher or rights-holder removed this stream.',
        recommendation: 'Deselect this clip from the list to continue with the remaining videos.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (
      msg.includes('country') && (msg.includes('available') || msg.includes('blocked')) ||
      msg.includes('not available in your') ||
      msg.includes('geographic restriction') ||
      msg.includes('geo-restricted')
    ) {
      return {
        subtype: 'geo_restricted',
        badge: 'Region Locked',
        userTitle: 'Geographically Restricted',
        userMessage: 'The content publisher has restricted viewing in your geographic country or region.',
        explanation: 'Regional licensing constraints prevent retrieval from your current geographic IP.',
        recommendation: 'This clip cannot be downloaded without a VPN connected to the authorized region.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (
      msg.includes('timed out') ||
      msg.includes('socket timeout') ||
      msg.includes('network is unreachable') ||
      msg.includes('failed to connect') ||
      msg.includes('connection reset') ||
      msg.includes('remote end closed')
    ) {
      return {
        subtype: 'network_timeout',
        badge: 'Timeout Error',
        userTitle: 'Network Connection Timeout',
        userMessage: 'The media stream disconnected due to slow or interrupted connectivity.',
        explanation: 'Connection to YouTube streaming servers timed out before receiving required fragments.',
        recommendation: 'Check your internet connection and tap Retry. Fragments will resume.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('no files could be downloaded') || msg.includes('no files were successfully downloaded')) {
      return {
        subtype: 'all_downloads_failed',
        badge: 'Downloads Interrupted',
        userTitle: 'Playlist Downloads Interrupted',
        userMessage: 'None of the requested clips could be retrieved due to stream encryption or network rate limiting.',
        explanation: 'Network stream handshakes failed for all queued items.',
        recommendation: 'Wait 30–60 seconds for the engine to cool down, then tap Retry.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('no space left') || msg.includes('disk full') || msg.includes('enospc')) {
      return {
        subtype: 'disk_full',
        badge: 'Storage Full',
        userTitle: 'Device Storage Space Full',
        userMessage: 'Your phone does not have enough storage space remaining to write the video file.',
        explanation: 'File system reported insufficient disk space for merging.',
        recommendation: 'Free up storage space on your device or clear old merges from the History screen.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('permission denied') || msg.includes('access is denied')) {
      return {
        subtype: 'permission_denied',
        badge: 'Permission Denied',
        userTitle: 'Storage Permission Required',
        userMessage: 'TubeMerger was denied write access to save files in the designated directory.',
        explanation: 'Android system security prevented writing to the output directory.',
        recommendation: 'Ensure storage and media permissions are granted in Android Settings.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('live event will begin') || msg.includes('live stream recording is not available') || msg.includes('is a live stream')) {
      return {
        subtype: 'live_stream',
        badge: 'Live Stream',
        userTitle: 'Live Stream Recording Unavailable',
        userMessage: 'Live streams cannot be downloaded or merged while currently in progress.',
        explanation: 'YouTube stream manifests do not finalize until the live broadcast concludes.',
        recommendation: 'Wait until the live stream ends and YouTube completes on-demand processing.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (
      msg.includes('private video') ||
      msg.includes('this video is private') ||
      msg.includes('video unavailable') ||
      msg.includes('video is unavailable') ||
      msg.includes('this video is unavailable') ||
      msg.includes('this video has been removed') ||
      msg.includes('does not exist')
    ) {
      return {
        subtype: 'video_unavailable',
        badge: 'Unavailable Stream',
        userTitle: 'Video Removed or Private',
        userMessage: 'One or more clips in this playlist have been removed or set to private by YouTube.',
        explanation: 'The video ID is no longer accessible on YouTube.',
        recommendation: 'Deselect unavailable clips from the playlist to merge the remainder.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (
      msg.includes('format not available') ||
      msg.includes('no video formats found') ||
      msg.includes('no suitable format')
    ) {
      return {
        subtype: 'format_not_available',
        badge: 'Format Error',
        userTitle: 'Requested Format Unavailable',
        userMessage: 'The selected resolution is not available for one or more video streams.',
        explanation: 'YouTube encodes different videos at differing maximum resolutions.',
        recommendation: 'Try selecting 720p or download as MP3 audio.',
        isResolvable: true,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('ffmpeg not found') || msg.includes('missing ffmpeg') || msg.includes('encoder missing')) {
      return {
        subtype: 'missing_ffmpeg_binary',
        badge: 'Encoder Missing',
        userTitle: 'Multimedia Encoder Engine Missing',
        userMessage: 'The native FFmpeg multimedia engine could not be initialized.',
        explanation: 'NDK multimedia processing binaries failed to load.',
        recommendation: 'Restart TubeMerger to reload native library dependencies.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    if (msg.includes('unsupported url') || msg.includes('is not a valid url') || msg.includes('invalid url')) {
      return {
        subtype: 'unsupported_url',
        badge: 'Invalid Link',
        userTitle: 'Unsupported Media Link',
        userMessage: 'The provided URL is not a recognized YouTube video or playlist format.',
        explanation: 'yt-dlp could not find an extractor matching the structure of this URL.',
        recommendation: 'Check the URL format and make sure it is a valid YouTube link.',
        isResolvable: false,
        rawError: rawStr,
        sanitizedError: sanitized,
      };
    }

    return {
      subtype: 'generic_pipeline_error',
      badge: 'Pipeline Interrupted',
      userTitle: 'Download Pipeline Interrupted',
      userMessage: sanitized.length > 130 ? sanitized.substring(0, 130) + '...' : sanitized,
      explanation: 'The media extraction engine encountered an error while downloading or processing.',
      recommendation: 'Check your internet connection and tap Retry.',
      isResolvable: true,
      rawError: rawStr,
      sanitizedError: sanitized,
    };
  }
}
