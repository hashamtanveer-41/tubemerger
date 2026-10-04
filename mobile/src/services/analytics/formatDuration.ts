/**
 * TubeMerger - Human Readable Duration Formatter
 * Formats duration in seconds into plain text:
 *   45 -> "45 secs"
 *   105 -> "1 min 45 secs"
 *   5674 -> "1 hr 34 min 34 secs"
 */

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
