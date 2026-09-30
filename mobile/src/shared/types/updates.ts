/**
 * TubeMerger Domain Types - Update Information
 */

export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  is_major: boolean;
  is_force_update: boolean;
  release_name?: string;
  release_notes?: string;
  published_at?: string;
  download_url?: string;
  website_download_url: string;
}
