import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCw,
  ExternalLink,
  X,
  FileCode2,
  HardDrive,
  Film,
  Layers,
} from 'lucide-react';
import { FailureInfo } from '@/types';
import { api } from '@/services/api';
import packageJson from '../../../package.json';

const GITHUB_REPO = 'hashamtanveer-41/tubemerger';

interface ReportIssueModalProps {
  failureInfo: FailureInfo | null;
  onClose: () => void;
  onRetry: () => void;
}

interface SubtypeMetadata {
  title: string;
  badge: string;
  explanation: string;
  recommendedAction: string;
}

function getSubtypeMetadata(subtype: string): SubtypeMetadata {
  switch (subtype) {
    case 'rate_limited_429':
      return {
        title: 'YouTube Rate Limit Throttling',
        badge: 'HTTP 429 Rate Limited',
        explanation:
          'YouTube temporarily throttled downloads from your network IP because multiple streams were requested in rapid succession.',
        recommendedAction:
          'Wait 30-60 seconds and retry. TubeMerger includes built-in request pacing and backoff retries.',
      };
    case 'bot_detection':
      return {
        title: 'Automated Bot Verification',
        badge: 'Bot Detection',
        explanation:
          'YouTube requested bot verification or sign-in for this stream.',
        recommendedAction:
          'Retrying often succeeds as the challenge is typically temporary.',
      };
    case 'video_unavailable':
      return {
        title: 'Video Removed or Private',
        badge: 'Unavailable Stream',
        explanation:
          'One or more videos in this playlist have been set to private, deleted, or removed by YouTube.',
        recommendedAction:
          'TubeMerger automatically attempts to skip missing clips and merge the rest. You can also uncheck unavailable videos.',
      };
    case 'missing_ffmpeg_binary':
      return {
        title: 'Encoder Binary Missing',
        badge: 'FFmpeg Missing',
        explanation:
          'The FFmpeg multimedia engine is required to combine or encode video and audio files, but was not detected.',
        recommendedAction:
          'Verify FFmpeg is installed and accessible in your system PATH.',
      };
    case 'network_timeout':
      return {
        title: 'Network Connection Timeout',
        badge: 'Timeout Error',
        explanation:
          'The connection to the media streaming servers timed out before receiving the required video chunks.',
        recommendedAction:
          'Check your internet connection and retry. Individual video fragments will resume downloading.',
      };
    case 'format_not_available':
      return {
        title: 'Requested Format Unavailable',
        badge: 'Format Error',
        explanation:
          'YouTube does not offer the requested resolution or audio stream for one of the clips.',
        recommendedAction:
          'Try selecting another resolution preset (e.g. 720p or 1080p) or download as MP3 audio.',
      };
    case 'geo_restricted':
      return {
        title: 'Geographically Restricted',
        badge: 'Region Locked',
        explanation:
          'The content publisher restricted viewing in your geographic country or region.',
        recommendedAction:
          'This video cannot be downloaded from your current location due to regional licensing.',
      };
    case 'copyright_takedown':
      return {
        title: 'Copyright Notice',
        badge: 'Copyright Blocked',
        explanation:
          'This video stream was blocked due to a copyright takedown request on YouTube.',
        recommendedAction:
          'This specific clip cannot be accessed due to copyright restrictions.',
      };
    case 'age_restricted':
      return {
        title: 'Age-Restricted Video',
        badge: 'Age Restricted',
        explanation:
          'YouTube requires an authenticated age-verified account to stream this video.',
        recommendedAction:
          'Deselect this clip from the list to download the rest of the playlist.',
      };
    case 'circuit_breaker_rate_limit':
      return {
        title: 'Connection Protection Activated',
        badge: 'Circuit Breaker Tripped',
        explanation:
          'YouTube blocked multiple consecutive download attempts. TubeMerger stopped early to protect your connection and automatically scheduled a core engine update.',
        recommendedAction:
          'Wait 30-60 seconds and click Retry. Download progress is saved and completed clips will be skipped.',
      };
    case 'all_downloads_failed':
      return {
        title: 'Playlist Downloads Interrupted',
        badge: 'Downloads Failed',
        explanation:
          'None of the requested clips could be retrieved due to YouTube stream encryption or network rate limiting. An automated background engine refresh has been initiated.',
        recommendedAction:
          'Wait 30-60 seconds for the engine to refresh, then click Retry Download.',
      };
    case 'disk_full':
      return {
        title: 'Disk Storage Full',
        badge: 'Disk Full',
        explanation:
          'Your hard drive or destination folder does not have enough remaining free space.',
        recommendedAction:
          'Free up disk space on your drive and try the download again.',
      };
    default:
      return {
        title: 'Download Pipeline Interrupted',
        badge: subtype || 'Engine Error',
        explanation:
          'The media extraction engine encountered an error while downloading or processing this playlist.',
        recommendedAction:
          'You can retry the download or submit a quick report to help us improve stability.',
      };
  }
}

function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'Unknown error occurred.';
  return msg
    .replace(/[a-zA-Z]:\\[^\s"']+/g, '[local_path]')
    .replace(/\/(?:home|Users|tmp|var)[^\s"']+/g, '[local_path]')
    .replace(/--output\s+[^\s]+/g, '--output [redacted]')
    .trim();
}

function getPlatformName(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Desktop';
}

export function ReportIssueModal({
  failureInfo,
  onClose,
  onRetry,
}: ReportIssueModalProps) {
  const [userNotes, setUserNotes] = useState('');
  const [showRawDetails, setShowRawDetails] = useState(false);

  useEffect(() => {
    if (!failureInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [failureInfo, onClose]);

  if (!failureInfo) return null;

  const metadata = getSubtypeMetadata(failureInfo.errorSubtype);
  const sanitizedError = sanitizeErrorMessage(failureInfo.error);
  const platform = getPlatformName();

  const buildDiagnosticLog = (): string => {
    return [
      '### TubeMerger Diagnostic Report',
      `- **App Version**: ${packageJson.version}`,
      `- **Platform**: ${platform}`,
      `- **Subtype**: \`${failureInfo.errorSubtype}\``,
      `- **Is Resolvable**: ${failureInfo.isResolvable ? 'Yes (Transient)' : 'No (Permanent restriction)'}`,
      `- **Item Count**: ${failureInfo.clipCount} clips`,
      `- **Est. Size**: ${failureInfo.playlistSize || 'Unknown'}`,
      `- **Preset**: ${failureInfo.preset}`,
      ...(failureInfo.playlistUrl ? [`- **Source URL**: \`${failureInfo.playlistUrl}\``] : []),
      ...(userNotes.trim() ? [`- **User Notes**: ${userNotes.trim()}`] : []),
      '',
      '#### Sanitized Error Log',
      '```',
      sanitizedError,
      '```',
    ].join('\n');
  };

  const handleReportGitHub = async () => {
    const title = `[Bug]: ${failureInfo.errorSubtype} - ${failureInfo.clipCount} items`;
    const body = buildDiagnosticLog();
    const issueUrl = `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

    api.trackEvent('issue_report_opened', {
      error_subtype: failureInfo.errorSubtype,
      clip_count: failureInfo.clipCount,
    });

    try {
      await api.openUrl(issueUrl);
    } catch {
      window.open(issueUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] max-h-[90vh] flex flex-col bg-[#141414] border border-[#2B2B2B] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#222222]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1E1E1E] border border-[#2E2E2E] text-brand-red shadow-sm">
              <AlertTriangle className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {metadata.title}
              </h3>
              <p className="text-xs text-[#888888]">
                Diagnostic & Resolution Assistant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto text-left custom-scrollbar">
          {/* Subtype Badge & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1C1C1C] border border-[#2E2E2E] text-[#EEEEEE]">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
              {metadata.badge}
            </span>

            {failureInfo.isResolvable ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1C1C1C] border border-[#2E2E2E] text-[#CCCCCC]">
                <RotateCw className="w-3 h-3 text-[#888888]" />
                Transient • Retrying May Resolve
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1C1C1C] border border-[#2E2E2E] text-[#CCCCCC]">
                Action Required
              </span>
            )}
          </div>

          {/* User-friendly explanation */}
          <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#262626] space-y-1.5">
            <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed">
              {metadata.explanation}
            </p>
            <p className="text-xs text-[#999999] leading-relaxed">
              <strong className="text-white font-medium">Suggestion: </strong>
              {metadata.recommendedAction}
            </p>
          </div>

          {/* Diagnostic Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#181818] border border-[#242424]">
              <span className="text-[#777777] block text-[10px] uppercase font-semibold tracking-wider mb-0.5 flex items-center gap-1">
                <Film className="w-3 h-3 text-[#888888]" /> Items
              </span>
              <span className="text-white font-bold">{failureInfo.clipCount} clips</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#181818] border border-[#242424]">
              <span className="text-[#777777] block text-[10px] uppercase font-semibold tracking-wider mb-0.5 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-[#888888]" /> Est. Size
              </span>
              <span className="text-white font-bold">{failureInfo.playlistSize || 'N/A'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#181818] border border-[#242424]">
              <span className="text-[#777777] block text-[10px] uppercase font-semibold tracking-wider mb-0.5 flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#888888]" /> Preset
              </span>
              <span className="text-white font-bold">{failureInfo.preset}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#181818] border border-[#242424]">
              <span className="text-[#777777] block text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                Version & OS
              </span>
              <span className="text-white font-bold truncate block">v{packageJson.version} · {platform}</span>
            </div>
          </div>

          {/* User Notes Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#AAAAAA] flex items-center justify-between">
              <span>What happened? (Optional context)</span>
              <span className="text-[10px] text-[#666666]">Included in report</span>
            </label>
            <textarea
              rows={2}
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="e.g. Failed at 80% mark, or video #12 seems region blocked..."
              className="w-full px-3 py-2 text-xs bg-[#1A1A1A] border border-[#282828] focus:border-[#444444] rounded-xl text-white placeholder-[#666666] outline-none transition-colors resize-none"
            />
          </div>

          {/* Raw Log Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowRawDetails(!showRawDetails)}
              className="inline-flex items-center gap-1 text-[11px] text-[#777777] hover:text-[#BBBBBB] transition-colors cursor-pointer"
            >
              <FileCode2 className="w-3 h-3" />
              <span>{showRawDetails ? 'Hide technical log' : 'Show technical log'}</span>
            </button>

            {showRawDetails && (
              <pre className="mt-2 p-3 bg-[#101010] border border-[#222222] rounded-xl text-[10px] font-mono text-[#AAAAAA] overflow-x-auto max-h-32 whitespace-pre-wrap select-all">
                {sanitizedError}
              </pre>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-[#111111] border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div>
            {/* GitHub Report Button */}
            <button
              type="button"
              onClick={handleReportGitHub}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] active:scale-[0.98] text-[#CCCCCC] hover:text-white border border-[#2C2C2C] text-xs font-medium transition-all cursor-pointer whitespace-nowrap group"
              title="Open pre-filled issue report on GitHub"
            >
              <span>Report on GitHub</span>
              <ExternalLink className="w-3 h-3 text-[#777777] group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center h-10 px-4 rounded-xl bg-transparent hover:bg-[#1C1C1C] text-[#888888] hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Dismiss
            </button>

            {/* Retry Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-gradient-to-r from-[#D90412] via-[#F00A18] to-[#FF1E27] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-brand-red/25 transition-all cursor-pointer whitespace-nowrap"
            >
              <RotateCw className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Retry Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
