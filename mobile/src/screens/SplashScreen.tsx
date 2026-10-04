/**
 * TubeMerger Mobile - SplashScreen
 * Dynamically theme-aware (Light & Dark mode):
 * - Light Mode: Clean white AMOLED/retina backdrop, light red ambient glow, dark brand typography, red accent, light loader track
 * - Dark Mode: Deep AMOLED background (#08080A), red ambient wave, white brand typography, red accent, dark loader track
 * - Smooth rotating red loading ring
 * - Bottom tagline: "Your YouTube playlists, merged seamlessly."
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const { isDark, colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Continuous spin
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Auto transition to main navigation
    const timer = setTimeout(() => {
      navigation.replace('Main');
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={{ backgroundColor: colors.bg }}
      className="flex-1 justify-between items-center py-16"
    >
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

      {/* Ambient Red Wave in Background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" className="items-center justify-center">
        <Image
          source={require('../assets/ambient_wave.png')}
          style={{
            width: '120%',
            height: '100%',
            opacity: isDark ? 0.28 : 0.12,
            resizeMode: 'cover',
          }}
        />
      </View>

      {/* Top spacer */}
      <View />

      {/* Center Branding Content */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        {/* Official Logo */}
        <View
          style={{
            shadowColor: '#FF1E1E',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.35 : 0.18,
            shadowRadius: 14,
            elevation: 8,
          }}
          className="mb-4"
        >
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 88, height: 88, resizeMode: 'contain' }}
          />
        </View>

        {/* Brand Title */}
        <View className="flex-row items-center mb-1">
          <Text
            style={{ color: colors.text }}
            className="text-3xl font-extrabold tracking-tight"
          >
            Tube
          </Text>
          <Text className="text-3xl font-extrabold text-[#FF1E1E] tracking-tight">
            Merger
          </Text>
        </View>

        {/* Tagline / Subtitle */}
        <Text
          style={{ color: colors.textMuted }}
          className="text-[10px] font-bold tracking-[3px] uppercase mb-8"
        >
          FREE & OPEN SOURCE
        </Text>

        {/* Circular Red Loading Ring */}
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Svg width={38} height={38}>
            <Circle
              cx={19}
              cy={19}
              r={15}
              stroke={isDark ? '#2A0B0B' : '#FEE2E2'}
              strokeWidth={3}
              fill="none"
            />
            <Circle
              cx={19}
              cy={19}
              r={15}
              stroke="#FF1E1E"
              strokeWidth={3}
              strokeDasharray="94"
              strokeDashoffset="65"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* Bottom Tagline */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text
          style={{ color: colors.textSecondary }}
          className="text-xs text-center leading-5 font-medium"
        >
          Your YouTube playlists,{'\n'}merged seamlessly.
        </Text>
      </Animated.View>
    </View>
  );
}
