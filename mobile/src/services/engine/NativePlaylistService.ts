/**
 * Native Playlist Service Implementation
 * Communicates with Kotlin TubeMergerModule and applies ExponentialBackoff retries.
 */

import { NativeModules, Platform } from 'react-native';
import { IPlaylistService } from './IPlaylistService';
import { Playlist } from '../../shared/types/playlist';
import { ExponentialBackoff } from '../../shared/dsa/ExponentialBackoff';

const { TubeMergerModule } = NativeModules;

export class NativePlaylistService implements IPlaylistService {
  private retryPolicy: ExponentialBackoff;

  constructor(retryPolicy?: ExponentialBackoff) {
    this.retryPolicy = retryPolicy ?? new ExponentialBackoff({ maxAttempts: 3, initialDelayMs: 800 });
  }

  async fetchPlaylist(url: string): Promise<Playlist> {
    return this.retryPolicy.execute(async (attempt) => {
      if (Platform.OS === 'android' && TubeMergerModule?.fetchPlaylist) {
        try {
          const raw = await TubeMergerModule.fetchPlaylist(url);
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (err: any) {
          throw new Error(err.message || `Native extraction failed (attempt ${attempt + 1})`);
        }
      }

      throw new Error('TubeMerger native extraction engine is not available on this platform.');
    });
  }
}

export const playlistService: IPlaylistService = new NativePlaylistService();
