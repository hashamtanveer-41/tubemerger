/**
 * TubeMerger Domain Types - Video & Quality Definitions
 */

export type VideoQuality = '4k' | '1080p' | '720p' | '480p' | '360p' | 'auto';

export interface VideoClip {
  id: string;
  title: string;
  url: string;
  duration_seconds: number;
  duration_formatted: string;
  thumbnail_url?: string;
  thumbnail?: string;
  width: number;
  height: number;
  fps: number;
  resolution_label: string;
}
