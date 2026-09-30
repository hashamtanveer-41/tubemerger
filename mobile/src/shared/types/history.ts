/**
 * TubeMerger Domain Types - Merge History Item
 */

export interface HistoryItem {
  id: number;
  job_id: string;
  playlist_title: string;
  playlist_url: string;
  channel_name: string;
  video_count: number;
  duration_seconds: number;
  duration_formatted: string;
  resolution: string;
  output_path: string;
  file_size_bytes: number;
  file_size_formatted: string;
  status: string;
  created_at: string;
  file_exists: boolean;
}
