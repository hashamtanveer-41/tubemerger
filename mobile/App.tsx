/**
 * TubeMerger Mobile - Application Entry Point
 * Phase 2 Core UI & Navigation Architecture
 * SOLID: Entry point delegates navigation & telemetry, maintains clean root hierarchy
 */

import './global.css';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { telemetryService } from './src/services/analytics';
import { NotificationModal } from './src/components';
import { ThemeProvider } from './src/theme';

LogBox.ignoreAllLogs(true);

export default function App() {
  useEffect(() => {
    // Initialize privacy-friendly telemetry on cold launch
    telemetryService.init('A-EU-1063594697');
    telemetryService.trackAppStarted();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
        <NotificationModal />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
