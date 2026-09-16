/**
 * Startup connectivity and force-update check state machine hook.
 */

import { useState, useCallback, useEffect } from 'react';
import { checkForUpdates, UpdateCheckResult } from '@/services/api';
import { UpdateInfo } from '@/types';

export type StartupState =
  | 'checking'   // Running connectivity + update check
  | 'offline'    // No internet detected
  | 'update'     // Forced major update required
  | 'ready';     // All checks passed — show workspace

export function useStartupCheck() {
  const [startupState, setStartupState] = useState<StartupState>('checking');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const runChecks = useCallback(async (): Promise<boolean> => {
    setStartupState('checking');

    // 1. If OS network adapter is offline, report offline immediately
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStartupState('offline');
      return false;
    }

    // 2. Query backend connectivity & update service
    const result: UpdateCheckResult = await checkForUpdates();

    // 3. If backend probe failed, verify whether browser itself can reach the web
    if (!result.online) {
      let browserOnline = false;
      try {
        await fetch('https://www.google.com/generate_204', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(2500),
        });
        browserOnline = true;
      } catch {
        // Probe failed, device is truly offline
      }

      if (!browserOnline) {
        setStartupState('offline');
        return false;
      }
    }

    const info = result.update_info;
    setUpdateInfo(info);

    if (info?.is_force_update) {
      setStartupState('update');
      return false;
    }

    setStartupState('ready');
    return true;
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const handleRetry = useCallback(async (): Promise<boolean> => {
    return runChecks();
  }, [runChecks]);

  return {
    startupState,
    updateInfo,
    runChecks,
    handleRetry,
  };
}
