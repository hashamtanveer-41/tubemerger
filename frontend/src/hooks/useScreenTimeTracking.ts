/**
 * Hook for tracking active time spent on each screen in Desktop App.
 *
 * Rules:
 * 1. On minimizing / window blur / hidden tab, time is NOT calculated.
 * 2. When restored / un-minimized, time calculation resumes.
 * 3. When closed (beforeunload / pagehide), accumulated screen times are sent to Aptabase.
 */

import { useEffect, useRef } from 'react';
import { api } from '@/services/api';

export function useScreenTimeTracking(currentScreen: string) {
  const currentScreenRef = useRef<string>(currentScreen);
  const durationsRef = useRef<Record<string, number>>({});
  const lastActiveTimestampRef = useRef<number | null>(
    typeof document !== 'undefined' && !document.hidden ? Date.now() : null
  );

  // Commit elapsed active time to the current screen
  const commitElapsed = () => {
    if (lastActiveTimestampRef.current !== null) {
      const elapsed = (Date.now() - lastActiveTimestampRef.current) / 1000;
      if (elapsed > 0) {
        const screen = currentScreenRef.current;
        durationsRef.current[screen] = (durationsRef.current[screen] || 0) + elapsed;
      }
      lastActiveTimestampRef.current = null;
    }
  };

  // Resume active timer if currently visible
  const resumeTimer = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      if (lastActiveTimestampRef.current === null) {
        lastActiveTimestampRef.current = Date.now();
      }
    }
  };

  // Send accumulated screen times to Aptabase
  const flushToAptabase = () => {
    commitElapsed();
    const toSend = { ...durationsRef.current };
    durationsRef.current = {};
    api.flushScreenTimes(toSend);
  };

  // Track screen transitions
  useEffect(() => {
    if (currentScreenRef.current !== currentScreen) {
      commitElapsed();
      currentScreenRef.current = currentScreen;
      resumeTimer();
    }
  }, [currentScreen]);

  // Window minimizing, tab visibility, and close event listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App minimized or tab hidden -> stop calculating time
        commitElapsed();
      } else {
        // App restored / un-minimized -> resume calculating time
        resumeTimer();
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus / minimized
      commitElapsed();
    };

    const handleWindowFocus = () => {
      // Window regained focus
      resumeTimer();
    };

    const handleWindowClose = () => {
      // App closing -> send accumulated times back to Aptabase
      flushToAptabase();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleWindowClose);
    window.addEventListener('pagehide', handleWindowClose);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleWindowClose);
      window.removeEventListener('pagehide', handleWindowClose);
      flushToAptabase();
    };
  }, []);
}
