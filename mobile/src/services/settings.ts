/**
 * TubeMerger Mobile - Settings Service
 * Manages user preferences for theme (light/dark), video quality, framerate, audio bitrate, and toggles.
 * Features persistent native SharedPreferences storage and automatic system theme detection on fresh launch.
 */

import { NativeModules, Platform, Appearance } from 'react-native';

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

const { TubeMergerModule } = NativeModules;

let hasUserSelectedTheme = false;

function initSettings(): AppSettings {
  const systemTheme: 'light' | 'dark' = Appearance?.getColorScheme() === 'dark' ? 'dark' : 'light';
  let initialTheme: 'light' | 'dark' = systemTheme;
  let parsedSettings: Partial<AppSettings> = {};

  if (TubeMergerModule) {
    try {
      const constants = TubeMergerModule.getConstants ? TubeMergerModule.getConstants() : {};
      const savedTheme = constants?.savedTheme;
      const savedSettingsRaw = constants?.savedSettings;

      if (savedTheme === 'light' || savedTheme === 'dark') {
        initialTheme = savedTheme;
        hasUserSelectedTheme = true;
      }

      if (savedSettingsRaw && savedSettingsRaw !== '{}') {
        parsedSettings = JSON.parse(savedSettingsRaw);
        if (parsedSettings.theme === 'light' || parsedSettings.theme === 'dark') {
          initialTheme = parsedSettings.theme;
          hasUserSelectedTheme = true;
        }
      }
    } catch {
      // Fallback to systemTheme
    }
  }

  return {
    ...DEFAULT_SETTINGS,
    ...parsedSettings,
    theme: initialTheme,
  };
}

let currentSettings: AppSettings = initSettings();
const listeners: Set<() => void> = new Set();

// Listen to system theme changes if user hasn't explicitly set a theme yet
Appearance?.addChangeListener?.(({ colorScheme }) => {
  if (!hasUserSelectedTheme) {
    const nextTheme: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';
    if (currentSettings.theme !== nextTheme) {
      currentSettings = { ...currentSettings, theme: nextTheme };
      listeners.forEach((fn) => fn());
    }
  }
});

export const settingsService = {
  getSettings(): AppSettings {
    return { ...currentSettings };
  },

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    if (partial.theme) {
      hasUserSelectedTheme = true;
    }

    currentSettings = { ...currentSettings, ...partial };
    listeners.forEach((fn) => fn());

    // Persist asynchronously to native storage
    if (TubeMergerModule) {
      if (partial.theme && TubeMergerModule.saveSetting) {
        TubeMergerModule.saveSetting('theme', partial.theme).catch(() => {});
      }
      if (TubeMergerModule.saveAllSettings) {
        TubeMergerModule.saveAllSettings(JSON.stringify(currentSettings)).catch(() => {});
      }
    }

    return { ...currentSettings };
  },

  async loadPersistedSettings(): Promise<AppSettings> {
    if (TubeMergerModule?.getAllSettings) {
      try {
        const raw = await TubeMergerModule.getAllSettings();
        if (raw && raw !== '{}') {
          const loaded = JSON.parse(raw);
          if (loaded.theme) {
            hasUserSelectedTheme = true;
          }
          currentSettings = { ...currentSettings, ...loaded };
          listeners.forEach((fn) => fn());
        }
      } catch {}
    }
    return { ...currentSettings };
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
