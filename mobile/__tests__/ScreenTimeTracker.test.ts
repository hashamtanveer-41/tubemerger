import { screenTimeTracker } from '../src/services/analytics/ScreenTimeTracker';
import { telemetryService } from '../src/services/analytics/AptabaseService';

// Mock @aptabase/react-native
jest.mock('@aptabase/react-native', () => ({
  init: jest.fn(),
  trackEvent: jest.fn(),
}));

import { trackEvent as aptabaseTrackEvent } from '@aptabase/react-native';

describe('ScreenTimeTracker & Aptabase Screen Duration Reporting', () => {
  let dateNowSpy: jest.SpyInstance;
  let currentTime = 1000000;

  beforeEach(() => {
    jest.clearAllMocks();
    telemetryService.init();

    // Mock Date.now() for deterministic timing
    currentTime = 1000000;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    screenTimeTracker.resetForTesting('Splash');
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('tracks time spent on screens and switches screens accurately', () => {
    screenTimeTracker.setCurrentScreen('HomeTab');

    // Advance time by 15 seconds on HomeTab
    currentTime += 15000;

    // Switch to DownloadsTab
    screenTimeTracker.setCurrentScreen('DownloadsTab');

    // Advance time by 20 seconds on DownloadsTab
    currentTime += 20000;

    const recorded = screenTimeTracker.getRecordedDurations();
    expect(recorded['HomeTab']).toBe(15);
  });

  it('does NOT calculate time while minimized, and flushes times to Aptabase when closed/backgrounded', () => {
    // Start on Playlist screen
    screenTimeTracker.setCurrentScreen('Playlist');

    // Active for 10 seconds
    currentTime += 10000;

    // User minimizes the app (or puts in background)
    screenTimeTracker.handleAppStateChange('background');

    // When minimized/closed, time should be sent to Aptabase
    expect(aptabaseTrackEvent).toHaveBeenCalledWith('screen_time', {
      screen_name: 'Playlist',
      duration_seconds: 10,
      platform: 'android',
    });

    // App remains in background for 5 minutes (300,000 ms)
    currentTime += 300000;

    // User restores the app
    screenTimeTracker.handleAppStateChange('active');

    // User stays on Playlist for another 5 seconds after restoring
    currentTime += 5000;

    // User minimizes/closes app again
    screenTimeTracker.handleAppStateChange('background');

    // Only the 5 active seconds should be recorded (the 300s in background must NOT be calculated!)
    expect(aptabaseTrackEvent).toHaveBeenCalledWith('screen_time', {
      screen_name: 'Playlist',
      duration_seconds: 5,
      platform: 'android',
    });
  });
});
