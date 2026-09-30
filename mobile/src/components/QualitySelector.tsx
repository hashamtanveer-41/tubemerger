/**
 * TubeMerger Mobile - QualitySelector Component
 * SOLID Principles: Single Responsibility (reusable video quality resolution picker)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type VideoQuality = '1080p' | '720p' | '480p' | '360p';

interface QualitySelectorProps {
  selectedQuality: VideoQuality;
  onSelectQuality: (quality: VideoQuality) => void;
  disabled?: boolean;
  className?: string;
}

const QUALITIES: VideoQuality[] = ['1080p', '720p', '480p', '360p'];

export function QualitySelector({
  selectedQuality,
  onSelectQuality,
  disabled = false,
  className = '',
}: QualitySelectorProps) {
  return (
    <View
      className={`flex-row space-x-2 ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      {QUALITIES.map((q) => {
        const isSelected = selectedQuality === q;
        return (
          <Pressable
            key={q}
            disabled={disabled}
            onPress={() => onSelectQuality(q)}
            className={`flex-1 py-2 px-1 rounded-xl items-center justify-center border ${
              isSelected
                ? 'bg-brand-red/15 border-brand-red'
                : 'bg-theme-card border-stroke-card active:bg-theme-hover'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isSelected ? 'text-brand-red' : 'text-content-secondary'
              }`}
            >
              {q}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
