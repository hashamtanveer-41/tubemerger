/**
 * TubeMerger Mobile - FormatSelector Component
 * SOLID Principles: Single Responsibility (reusable format toggle)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type OutputFormat = 'mp4' | 'mp3';

interface FormatSelectorProps {
  selectedFormat: OutputFormat;
  onSelectFormat: (format: OutputFormat) => void;
  className?: string;
}

export function FormatSelector({
  selectedFormat,
  onSelectFormat,
  className = '',
}: FormatSelectorProps) {
  return (
    <View className={`flex-row p-1 rounded-xl bg-theme-panel border border-stroke-card ${className}`}>
      <Pressable
        onPress={() => onSelectFormat('mp4')}
        className={`flex-1 py-2 rounded-lg items-center justify-center ${
          selectedFormat === 'mp4'
            ? 'bg-brand-red'
            : 'active:bg-theme-card'
        }`}
      >
        <Text
          className={`text-xs font-bold ${
            selectedFormat === 'mp4' ? 'text-content-primary' : 'text-content-secondary'
          }`}
        >
          MP4 Video
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onSelectFormat('mp3')}
        className={`flex-1 py-2 rounded-lg items-center justify-center ${
          selectedFormat === 'mp3'
            ? 'bg-brand-red'
            : 'active:bg-theme-card'
        }`}
      >
        <Text
          className={`text-xs font-bold ${
            selectedFormat === 'mp3' ? 'text-content-primary' : 'text-content-secondary'
          }`}
        >
          MP3 Audio
        </Text>
      </Pressable>
    </View>
  );
}
