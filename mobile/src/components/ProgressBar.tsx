/**
 * TubeMerger Mobile - ProgressBar Component
 * SOLID Principles: Single Responsibility (reusable visual progress indicator)
 */

import React from 'react';
import { View, Text } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  statusLabel?: string;
  className?: string;
}

export function ProgressBar({
  progress,
  showLabel = true,
  statusLabel,
  className = '',
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <View className={`w-full ${className}`}>
      {(showLabel || statusLabel) && (
        <View className="flex-row justify-between items-center mb-1.5">
          <Text className="text-xs font-medium text-content-secondary" numberOfLines={1}>
            {statusLabel || 'Progress'}
          </Text>
          {showLabel && (
            <Text className="text-xs font-bold text-content-primary">
              {clampedProgress}%
            </Text>
          )}
        </View>
      )}
      <View className="w-full h-2.5 bg-theme-panel rounded-full overflow-hidden border border-stroke-subtle">
        <View
          className="h-full bg-brand-red rounded-full"
          style={{ width: `${clampedProgress}%` }}
        />
      </View>
    </View>
  );
}
