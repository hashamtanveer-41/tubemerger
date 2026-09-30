import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className: _className = '',
  style,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.brandRed,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: colors.inputBg,
          borderColor: colors.inputBorder,
          borderWidth: 1,
        };
      case 'danger':
        return {
          backgroundColor: '#EF4444',
          borderWidth: 0,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.brandRed,
          borderWidth: 0,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.text;
      case 'ghost':
        return colors.textSecondary;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 14,
          opacity: disabled ? 0.5 : 1,
        },
        getButtonStyles(),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={{ fontSize: 14, fontWeight: '700', textAlign: 'center', color: getTextColor() }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
