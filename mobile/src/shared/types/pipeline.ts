/**
 * TubeMerger Domain Types - Pipeline & Progress Definitions
 */

export type PipelineStatus =
  | 'idle'
  | 'fetching'
  | 'downloading'
  | 'paused'
  | 'normalizing'
  | 'stitching'
  | 'embedding_chapters'
  | 'done'
  | 'error'
  | 'cancelled';

export interface ProgressEvent {
  status: PipelineStatus;
  current_item: number;
  total_items: number;
  current_video_title: string;
  overall_percent: number;
  message: string;
  speed?: string;
  eta?: string;
  output_file?: string;
  error?: string;
  error_subtype?: string;
  is_resolvable?: boolean;
}

export interface MergeJobPayload {
  url?: string;
  selected_indices?: number[];
  clips?: any[];
  playlist_title?: string;
  output_filename?: string;
  merge_videos?: boolean;
  quality?: string;
  canvas_preset?: string;
  format?: 'mp4' | 'mp3';
  estimated_size_mb?: number;
}
