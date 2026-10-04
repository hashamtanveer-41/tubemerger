import { Appearance, NativeModules, Platform } from 'react-native';

describe('SettingsService & Theme Persistence', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('initializes with system theme when no theme is persisted', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    NativeModules.TubeMergerModule = {
      getConstants: () => ({ savedTheme: '', savedSettings: '{}' }),
      saveSetting: jest.fn().mockResolvedValue(true),
      saveAllSettings: jest.fn().mockResolvedValue(true),
      getAllSettings: jest.fn().mockResolvedValue('{}'),
    };

    const { settingsService } = require('../src/services/settings');
    const settings = settingsService.getSettings();
    expect(settings.theme).toBe('dark');
  });

  it('restores persisted theme over system theme if previously saved', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    NativeModules.TubeMergerModule = {
      getConstants: () => ({ savedTheme: 'light', savedSettings: JSON.stringify({ theme: 'light' }) }),
      saveSetting: jest.fn().mockResolvedValue(true),
      saveAllSettings: jest.fn().mockResolvedValue(true),
      getAllSettings: jest.fn().mockResolvedValue(JSON.stringify({ theme: 'light' })),
    };

    const { settingsService } = require('../src/services/settings');
    const settings = settingsService.getSettings();
    expect(settings.theme).toBe('light');
  });

  it('persists theme to native TubeMergerModule when updated', () => {
    const saveSettingMock = jest.fn().mockResolvedValue(true);
    const saveAllSettingsMock = jest.fn().mockResolvedValue(true);

    NativeModules.TubeMergerModule = {
      getConstants: () => ({ savedTheme: 'light', savedSettings: '{}' }),
      saveSetting: saveSettingMock,
      saveAllSettings: saveAllSettingsMock,
    };

    const { settingsService } = require('../src/services/settings');
    settingsService.updateSettings({ theme: 'dark' });

    expect(settingsService.getSettings().theme).toBe('dark');
    expect(saveSettingMock).toHaveBeenCalledWith('theme', 'dark');
    expect(saveAllSettingsMock).toHaveBeenCalled();
  });

  it('notifies subscribers upon settings change', () => {
    NativeModules.TubeMergerModule = {
      getConstants: () => ({ savedTheme: 'light', savedSettings: '{}' }),
      saveSetting: jest.fn().mockResolvedValue(true),
      saveAllSettings: jest.fn().mockResolvedValue(true),
    };

    const { settingsService } = require('../src/services/settings');
    const listener = jest.fn();
    const unsub = settingsService.subscribe(listener);

    settingsService.updateSettings({ videoQuality: '720p' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(settingsService.getSettings().videoQuality).toBe('720p');

    unsub();
    settingsService.updateSettings({ videoQuality: '1080p' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
