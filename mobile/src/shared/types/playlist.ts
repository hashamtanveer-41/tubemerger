/**
 * TubeMerger Domain Types - Playlist Definitions
 */

import { VideoClip } from './video';

export interface Playlist {
  playlist_id: string;
  title: string;
  channel: string;
  webpage_url: string;
  total_duration_seconds: number;
  total_duration_formatted: string;
  thumbnail?: string;
  video_count: number;
  entries: VideoClip[];
  estimated_size_mb?: number;
  estimated_size_formatted?: string;
}

export interface PlaylistSelectionState {
  selectedIndices: Set<number>;
  format: 'mp4' | 'mp3';
  quality: string;
}
