/**
 * TubeMerger Mobile - Formatting and Size Estimation Utilities
 */

/**
 * Formats bytes into clean human-readable units (e.g., "450 KB", "24.5 MB", "1.4 GB").
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

/**
 * Formats duration in seconds into "Xm Ys" or "Xh Ym Zs".
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m 00s';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s.toString().padStart(2, '0')}s`;
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * Accurately estimates download and merged file size based on duration and format/quality.
 * YouTube standard average stream bitrates:
 * - 1080p: ~3.0 Mbps (~375 KB/s ≈ 22.5 MB/min ≈ 1.35 GB/hr)
 * - 720p:  ~1.8 Mbps (~225 KB/s ≈ 13.5 MB/min ≈ 810 MB/hr)
 * - 480p:  ~0.9 Mbps (~112 KB/s ≈ 6.7 MB/min)
 * - 360p:  ~0.45 Mbps (~56 KB/s ≈ 3.4 MB/min)
 * - MP3:   ~192 kbps - 320 kbps (~24 - 40 KB/s)
 */
export function estimateVideoSizeBytes(
  durationSeconds: number,
  qualityOrResolution: string = '1080p'
): number {
  const dur = (!durationSeconds || durationSeconds <= 0) ? 240 : durationSeconds;
  const label = (qualityOrResolution || '').toLowerCase().trim();

  // Audio bitrates (MP3 / Audio / explicit bitrate strings)
  const isAudio =
    label.includes('mp3') ||
    label.includes('audio') ||
    label.includes('320k') ||
    label.includes('256k') ||
    label.includes('192k') ||
    label.includes('128k') ||
    label === '320' ||
    label === '256' ||
    label === '192' ||
    label === '128';

  if (isAudio) {
    if (label.includes('128')) {
      return dur * (16 * 1024); // 128 kbps = 16 KB/s
    } else if (label.includes('192')) {
      return dur * (24 * 1024); // 192 kbps = 24 KB/s
    } else if (label.includes('256')) {
      return dur * (32 * 1024); // 256 kbps = 32 KB/s
    } else {
      return dur * (40 * 1024); // 320 kbps = 40 KB/s
    }
  }

  let bytesPerSec = 375 * 1024; // 1080p (~3.0 Mbps)
  if (label.includes('4k') || label.includes('2160') || label.includes('1440')) {
    bytesPerSec = 812 * 1024; // 4K (~6.5 Mbps)
  } else if (label.includes('720')) {
    bytesPerSec = 225 * 1024; // 720p (~1.8 Mbps)
  } else if (label.includes('480')) {
    bytesPerSec = 112 * 1024; // 480p (~0.9 Mbps)
  } else if (label.includes('360')) {
    bytesPerSec = 56 * 1024;  // 360p (~0.45 Mbps)
  }

  return dur * bytesPerSec;
}
