import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats raw bytes into human-readable string (e.g. 850 MB, 1.4 GB).
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
 * Accurately estimates download size based on video duration and resolution.
 * YouTube standard average stream bitrates (Video + AAC audio):
 * - 1080p: ~3.0 Mbps (~375 KB/s ≈ 22.5 MB/min ≈ 1.35 GB/hr)
 * - 720p:  ~1.8 Mbps (~225 KB/s ≈ 13.5 MB/min ≈ 810 MB/hr)
 * - 480p:  ~1.0 Mbps (~125 KB/s ≈ 7.5 MB/min)
 * - 4K/2160p: ~6.5 Mbps (~812 KB/s)
 */
export function estimateVideoSizeBytes(durationSeconds: number, qualityOrResolution: string = '1080p'): number {
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
      return dur * (16 * 1024); // 128 kbps = 16 KB/s (~0.96 MB/min)
    } else if (label.includes('192')) {
      return dur * (24 * 1024); // 192 kbps = 24 KB/s (~1.44 MB/min)
    } else if (label.includes('256')) {
      return dur * (32 * 1024); // 256 kbps = 32 KB/s (~1.92 MB/min)
    } else {
      // 320k or default extreme-HQ MP3
      return dur * (40 * 1024); // 320 kbps = 40 KB/s (~2.40 MB/min)
    }
  }
  
  let bytesPerSec = 375 * 1024; // 1080p (~3.0 Mbps)
  if (label.includes('4k') || label.includes('2160') || label.includes('1440')) {
    bytesPerSec = 812 * 1024; // 4K (~6.5 Mbps)
  } else if (label.includes('720')) {
    bytesPerSec = 225 * 1024; // 720p (~1.8 Mbps)
  } else if (label.includes('480')) {
    bytesPerSec = 100 * 1024; // 480p (~0.8 Mbps)
  } else if (label.includes('360')) {
    bytesPerSec = 56 * 1024;  // 360p (~0.45 Mbps)
  }
  return dur * bytesPerSec;
}
