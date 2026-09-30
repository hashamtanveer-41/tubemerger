/**
 * Telemetry Bucketing Algorithms
 * Port of src/tubemerger/apps/telemetry/bucketing.py.
 * Ensures consistent analytical dashboards across desktop and mobile.
 */

export function bucketClips(n: number): string {
  if (n <= 5) return '1-5';
  if (n <= 15) return '6-15';
  if (n <= 30) return '16-30';
  if (n <= 50) return '31-50';
  return '50+';
}

export function bucketDuration(seconds: number): string {
  if (seconds < 60) return '<1m';
  if (seconds < 300) return '1-5m';
  if (seconds < 900) return '5-15m';
  return '15m+';
}

export function bucketSize(mb: number): string {
  if (mb < 100) return '<100MB';
  if (mb < 500) return '100-500MB';
  if (mb < 1000) return '500MB-1GB';
  if (mb < 5000) return '1-5GB';
  return '5GB+';
}
