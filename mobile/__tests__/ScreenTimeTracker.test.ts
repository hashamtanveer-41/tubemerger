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

    // When minimized/closed, a single consolidated session event should be sent to Aptabase
    expect(aptabaseTrackEvent).toHaveBeenCalledWith('session_screen_time', {
      session_duration: '10 secs',
      session_duration_seconds: 10,
      playlist_time: '10 secs',
      playlist_seconds: 10,
      screens_visited: 'Playlist',
      screens_count: 1,
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
    expect(aptabaseTrackEvent).toHaveBeenCalledWith('session_screen_time', {
      session_duration: '5 secs',
      session_duration_seconds: 5,
      playlist_time: '5 secs',
      playlist_seconds: 5,
      screens_visited: 'Playlist',
      screens_count: 1,
      platform: 'android',
    });
  });

  it('formats complex multi-screen session times into human readable strings (hr min secs)', () => {
    // 1 hr 34 min 34 secs on Downloads (5674 seconds)
    screenTimeTracker.setCurrentScreen('Downloads');
    currentTime += 5674000;

    // 1 min 45 secs on Home (105 seconds)
    screenTimeTracker.setCurrentScreen('Home');
    currentTime += 105000;

    // App backgrounded
    screenTimeTracker.handleAppStateChange('background');

    expect(aptabaseTrackEvent).toHaveBeenCalledWith('session_screen_time', {
      session_duration: '1 hr 36 min 19 secs',
      session_duration_seconds: 5779,
      downloads_time: '1 hr 34 min 34 secs',
      downloads_seconds: 5674,
      home_time: '1 min 45 secs',
      home_seconds: 105,
      screens_visited: 'Downloads, Home',
      screens_count: 2,
      platform: 'android',
    });
  });
});
