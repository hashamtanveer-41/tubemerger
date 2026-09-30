/**
 * Playlist Inspection Service Interface (SOLID - ISP & DIP)
 */

import { Playlist } from '../../shared/types/playlist';

export interface IPlaylistService {
  fetchPlaylist(url: string): Promise<Playlist>;
}
