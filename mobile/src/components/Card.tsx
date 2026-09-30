import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'panel' | 'elevated' | 'interactive';
  className?: string;
}

export function Card({
  children,
  variant: _variant = 'default',
  className: _className = '',
  style,
  ...props
}: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderWidth: 1,
          borderRadius: 18,
          padding: 16,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
