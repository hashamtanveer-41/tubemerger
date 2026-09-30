/**
 * TubeMerger Mobile - Settings Service
 * Manages user preferences for theme (light/dark), video quality, framerate, audio bitrate, and toggles.
 */

export interface AppSettings {
  theme: 'light' | 'dark';
  videoQuality: '1080p' | '720p' | '480p' | '360p';
  frameRate: '30 FPS' | '60 FPS';
  audioQuality: '320kbps' | '256kbps' | '192kbps' | '128kbps';
  autoOpen: boolean;
  saveToHistory: boolean;
  showNotifications: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  videoQuality: '1080p',
  frameRate: '30 FPS',
  audioQuality: '320kbps',
  autoOpen: false,
  saveToHistory: true,
  showNotifications: true,
};

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };
const listeners: Set<() => void> = new Set();

export const settingsService = {
  getSettings(): AppSettings {
    return { ...currentSettings };
  },

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    currentSettings = { ...currentSettings, ...partial };
    listeners.forEach((fn) => fn());
    return { ...currentSettings };
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
