/**
 * TubeMerger Mobile - SplashScreen
 * Pixel-perfect match for Screenshot 1:
 * - Pure dark AMOLED background with ambient red wave
 * - Official TubeMerger logo, brand title, and open source subtitle
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

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
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
    <View className="flex-1 bg-[#060608] justify-between items-center py-16">
      <StatusBar barStyle="light-content" />

      {/* Ambient Red Wave in Background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" className="items-center justify-center">
        <Image
          source={require('../assets/ambient_wave.png')}
          style={{ width: '120%', height: '100%', opacity: 0.28, resizeMode: 'cover' }}
        />
      </View>

      {/* Top spacer */}
      <View />

      {/* Center Branding Content */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        {/* Official Logo */}
        <View className="mb-4 shadow-lg shadow-brand-red/30">
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 84, height: 84, resizeMode: 'contain' }}
          />
        </View>

        {/* Brand Title */}
        <View className="flex-row items-center mb-1">
          <Text className="text-3xl font-extrabold text-white tracking-tight">Tube</Text>
          <Text className="text-3xl font-extrabold text-[#FF1E1E] tracking-tight">Merger</Text>
        </View>

        {/* Tagline / Subtitle */}
        <Text className="text-[10px] font-bold text-[#8E8E98] tracking-[3px] uppercase mb-8">
          FREE & OPEN SOURCE
        </Text>

        {/* Circular Red Loading Ring */}
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Svg width={38} height={38}>
            <Circle
              cx={19}
              cy={19}
              r={15}
              stroke="#2A0B0B"
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
        <Text className="text-xs text-[#8E8E98] text-center leading-5 font-medium">
          Your YouTube playlists,{'\n'}merged seamlessly.
        </Text>
      </Animated.View>
    </View>
  );
}
