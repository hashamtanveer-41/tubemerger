/**
 * Native Clipboard Helper for TubeMerger Mobile
 * Connects directly to TubeMergerModule.getClipboardText() on Android
 */

import { NativeModules, Platform } from 'react-native';

const { TubeMergerModule } = NativeModules;

export async function getNativeClipboard(): Promise<string> {
  if (Platform.OS === 'android' && TubeMergerModule?.getClipboardText) {
    try {
      const text = await TubeMergerModule.getClipboardText();
      return typeof text === 'string' ? text.trim() : '';
    } catch {
      return '';
    }
  }
  return '';
}
