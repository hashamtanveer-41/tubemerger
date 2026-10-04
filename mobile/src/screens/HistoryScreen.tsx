/**
 * TubeMerger Mobile - HistoryScreen
 * Backward-compatible wrapper delegating to the unified DownloadsScreen.
 */

import React from 'react';
import { DownloadsScreen } from './DownloadsScreen';

export function HistoryScreen({ navigation }: { navigation?: any }) {
  return <DownloadsScreen navigation={navigation} showBack={true} />;
}
