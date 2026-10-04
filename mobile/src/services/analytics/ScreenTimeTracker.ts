/**
 * TubeMerger Mobile - ScreenTimeTracker
 * Measures and reports active time spent on each screen.
 *
 * Rules:
 * 1. On minimizing / backgrounding, time is NOT calculated.
 * 2. When reopened / resumed, time calculation resumes.
 * 3. When closed / backgrounded, accumulated screen times are sent back to Aptabase.
 */

import { AppState, AppStateStatus } from 'react-native';
import { telemetryService } from './AptabaseService';

export class ScreenTimeTracker {
  private static instance: ScreenTimeTracker;
  private currentScreen: string = 'Splash';
  private durations: Record<string, number> = {};
  private activeSegmentStart: number | null = Date.now();
  private appState: AppStateStatus =
    AppState.currentState === 'background' || AppState.currentState === 'inactive'
      ? AppState.currentState
      : 'active';
  private isListening = false;

  private constructor() {
    this.initAppStateListener();
  }

  static getInstance(): ScreenTimeTracker {
    if (!ScreenTimeTracker.instance) {
      ScreenTimeTracker.instance = new ScreenTimeTracker();
    }
    return ScreenTimeTracker.instance;
  }

  private initAppStateListener(): void {
    if (this.isListening) return;
    this.isListening = true;

    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      this.handleAppStateChange(nextAppState);
    });
  }

  handleAppStateChange(nextAppState: AppStateStatus): void {
    const wasActive = this.appState === 'active';
    const isNowActive = nextAppState === 'active';
    this.appState = nextAppState;

    if (wasActive && !isNowActive) {
      // App minimized or sent to background:
      // 1. On minimizing the time is not calculated: stop timer and commit time up to now
      this.commitElapsed();
      // 2. When closed / backgrounded, send times back to Aptabase
      this.flushToAptabase();
    } else if (!wasActive && isNowActive) {
      // App restored / un-minimized: resume calculating time
      this.activeSegmentStart = Date.now();
    }
  }

  setCurrentScreen(screenName: string): void {
    if (!screenName || this.currentScreen === screenName) return;
    // Commit elapsed time for previous screen
    this.commitElapsed();
    this.currentScreen = screenName;
    // If currently active, start new segment for the new screen
    if (this.appState === 'active') {
      this.activeSegmentStart = Date.now();
    }
  }

  getCurrentScreen(): string {
    return this.currentScreen;
  }

  getRecordedDurations(): Record<string, number> {
    return { ...this.durations };
  }

  commitElapsed(): void {
    if (this.activeSegmentStart !== null) {
      const elapsed = (Date.now() - this.activeSegmentStart) / 1000;
      if (elapsed > 0) {
        const screen = this.currentScreen;
        this.durations[screen] = (this.durations[screen] || 0) + elapsed;
      }
      this.activeSegmentStart = null;
    }
  }

  flushToAptabase(): void {
    this.commitElapsed();
    const toSend = { ...this.durations };
    this.durations = {};
    telemetryService.trackSessionScreenTime(toSend, 'android');
  }

  resetForTesting(initialScreen = 'Splash'): void {
    this.durations = {};
    this.currentScreen = initialScreen;
    this.appState = 'active';
    this.activeSegmentStart = Date.now();
  }
}

export const screenTimeTracker = ScreenTimeTracker.getInstance();
