import { NativeModules, Platform } from 'react-native';

describe('UpdateService & Update Enforcement', () => {
  let originalFetch: any;

  beforeEach(() => {
    jest.resetModules();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('correctly detects major version update and sets isMajorUpdate and isForceUpdate', async () => {
    NativeModules.TubeMergerModule = {
      getSetting: jest.fn().mockResolvedValue(''),
      saveSetting: jest.fn().mockResolvedValue(true),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: 'v1.0.0',
        name: 'TubeMerger v1.0.0 Release',
        body: 'Major upgrade with redesigned architecture.',
        published_at: '2026-10-04T12:00:00Z',
        assets: [
          {
            name: 'tubemerger-v1.0.0.apk',
            browser_download_url: 'https://github.com/hashamtanveer/tubemerger/releases/download/v1.0.0/tubemerger-v1.0.0.apk',
          },
        ],
      }),
    });

    const { updateService } = require('../src/services/updates/UpdateService');
    const info = await updateService.checkForUpdates();

    expect(info.hasUpdate).toBe(true);
    expect(info.latestVersion).toBe('1.0.0');
    expect(info.isMajorUpdate).toBe(true);
    expect(info.isForceUpdate).toBe(true);
    expect(info.downloadUrl).toBe(
      'https://github.com/hashamtanveer/tubemerger/releases/download/v1.0.0/tubemerger-v1.0.0.apk'
    );

    // Major updates must always be prompted, even if attempted to dismiss
    const shouldPrompt = await updateService.shouldPromptUpdate(info);
    expect(shouldPrompt).toBe(true);
  });

  it('detects forced update tags in release body even for minor versions', async () => {
    NativeModules.TubeMergerModule = {
      getSetting: jest.fn().mockResolvedValue(''),
      saveSetting: jest.fn().mockResolvedValue(true),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: 'v0.0.5',
        name: 'TubeMerger v0.0.5 Hotfix',
        body: '[force_update] Critical YouTube cipher fix required for all users.',
        assets: [],
      }),
    });

    const { updateService } = require('../src/services/updates/UpdateService');
    const info = await updateService.checkForUpdates();

    expect(info.hasUpdate).toBe(true);
    expect(info.latestVersion).toBe('0.0.5');
    expect(info.isMajorUpdate).toBe(false);
    expect(info.isForceUpdate).toBe(true);

    const shouldPrompt = await updateService.shouldPromptUpdate(info);
    expect(shouldPrompt).toBe(true);
  });

  it('prompts minor/patch updates once, then suppresses subsequent prompts once dismissed', async () => {
    let persistedDismissed = '';
    NativeModules.TubeMergerModule = {
      getSetting: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === 'dismissed_update_version') return Promise.resolve(persistedDismissed);
        return Promise.resolve(defaultValue);
      }),
      saveSetting: jest.fn().mockImplementation((key, value) => {
        if (key === 'dismissed_update_version') persistedDismissed = value;
        return Promise.resolve(true);
      }),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: 'v0.0.2',
        name: 'TubeMerger v0.0.2 Minor Improvements',
        body: 'General speed and UI polish.',
        assets: [],
      }),
    });

    const { updateService } = require('../src/services/updates/UpdateService');
    const info = await updateService.checkForUpdates();

    expect(info.hasUpdate).toBe(true);
    expect(info.isMajorUpdate).toBe(false);
    expect(info.isForceUpdate).toBe(false);

    // First time: should prompt
    let shouldPrompt = await updateService.shouldPromptUpdate(info);
    expect(shouldPrompt).toBe(true);

    // User dismisses modal
    await updateService.markUpdateDismissed('0.0.2');
    expect(persistedDismissed).toBe('0.0.2');

    // Second time: dismissed version matches, so do not prompt
    shouldPrompt = await updateService.shouldPromptUpdate(info);
    expect(shouldPrompt).toBe(false);
  });
});
