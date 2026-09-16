/**
 * Onboarding spotlight tour state and auto-trigger hook.
 *
 * Ensures the onboarding guide only shows once upon first installation/launch,
 * and subsequently only by explicit user action.
 */

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { StartupState } from './useStartupCheck';

export function useTourManager(startupState: StartupState) {
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    if (startupState !== 'ready') return;

    let cancelled = false;

    const checkAndTriggerTour = async () => {
      try {
        const localSeen =
          localStorage.getItem('tubemerger_tour_v1') === 'true' ||
          localStorage.getItem('tubemerger_tour_completed') === 'true';

        if (localSeen) return;

        // Check persistent settings on backend disk
        const remoteSettings = await api.getSettings();
        if (remoteSettings?.tour_completed) {
          localStorage.setItem('tubemerger_tour_v1', 'true');
          return;
        }

        if (cancelled) return;

        // First ever launch: Record completion to prevent repeated automatic triggers
        localStorage.setItem('tubemerger_tour_v1', 'true');
        localStorage.setItem('tubemerger_tour_completed', 'true');
        api.saveSettings({ tour_completed: true });

        // Show the initial onboarding tour once
        setIsTourOpen(true);
      } catch {
        // Storage access blocked or network unavailable
      }
    };

    const timer = setTimeout(checkAndTriggerTour, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startupState]);

  return {
    isTourOpen,
    setIsTourOpen,
  };
}
