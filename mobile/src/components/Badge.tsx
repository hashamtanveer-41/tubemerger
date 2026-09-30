import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface BadgeProps {
  label: string;
  variant?: 'brand' | 'neutral' | 'subtle';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  label,
  variant = 'neutral',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const { colors, isDark } = useTheme();

  const getBadgeColors = () => {
    switch (variant) {
      case 'brand':
        return {
          bg: isDark ? 'rgba(255, 30, 30, 0.16)' : '#FEE2E2',
          border: isDark ? 'rgba(255, 30, 30, 0.45)' : '#FECACA',
          text: isDark ? '#FF3B30' : '#DC2626',
        };
      case 'subtle':
        return {
          bg: colors.inputBg,
          border: colors.inputBorder,
          text: colors.textSecondary,
        };
      case 'neutral':
      default:
        return {
          bg: colors.card,
          border: colors.cardBorder,
          text: colors.text,
        };
    }
  };

  const badgeColors = getBadgeColors();
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColors.bg,
          borderColor: badgeColors.border,
          paddingHorizontal: isMd ? 10 : 8,
          paddingVertical: isMd ? 4 : 2,
        },
      ]}
      className={className}
    >
      <Text
        style={[
          styles.label,
          {
            color: badgeColors.text,
            fontSize: isMd ? 12 : 11,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
