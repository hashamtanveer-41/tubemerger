/**
 * TubeMerger Mobile - Header Component
 * SOLID Principles: Single Responsibility
 * Clean, minimal header with Lucide icons
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}: HeaderProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {showBack && (
            <Pressable
              onPress={onBack}
              style={{ marginRight: 12, padding: 8, marginLeft: -8, borderRadius: 8 }}
            >
              <ArrowLeft size={20} color={colors.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            {title ? (
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
                Tube<Text style={{ color: colors.brandRed }}>Merger</Text>
              </Text>
            )}
            {subtitle && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightAction && <View style={{ marginLeft: 12 }}>{rightAction}</View>}
      </View>
    </SafeAreaView>
  );
}
