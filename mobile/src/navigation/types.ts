/**
 * TubeMerger Mobile - Navigation Types
 * Type-safe navigation parameters for Phase 2 Core UI Screens
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { Playlist, MergeJobPayload } from '../shared/types';

export type MainTabParamList = {
  HomeTab: undefined;
  DownloadsTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Home: undefined;
  Playlist: {
    url: string;
    preloadedPlaylist?: Playlist;
    format?: 'mp4' | 'mp3';
  };
  Progress: {
    payload: MergeJobPayload;
    playlistTitle: string;
    totalClips: number;
  };
  Success: {
    outputFilePath: string;
    fileName: string;
    fileSizeBytes?: number;
    durationSeconds?: number;
    format: 'mp4' | 'mp3';
    clipCount: number;
    playlistTitle: string;
  };
  History: undefined;
  Settings: undefined;
  Support: undefined;
};
