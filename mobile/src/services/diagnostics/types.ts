/**
 * TubeMerger Mobile - Diagnostics Types
 * Architecture: SOLID principles - Interface Segregation
 */

export interface DiagnosticResult {
  yt_dlp_ready: boolean;
  yt_dlp_version: string;
  ffmpeg_ready: boolean;
  ffmpeg_version: string;
  free_storage_mb: number;
  storage_path: string;
  device_model: string;
  android_version: string;
}

export interface IDiagnosticService {
  runDiagnostics(): Promise<DiagnosticResult>;
}
