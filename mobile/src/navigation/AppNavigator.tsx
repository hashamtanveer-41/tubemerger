/**
 * TubeMerger Mobile - AppNavigator
 * Navigation container managing stack transitions across Splash, MainTabs, and Core UI Screens
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import {
  SplashScreen,
  HomeScreen,
  PlaylistScreen,
  ProgressScreen,
  SuccessScreen,
  HistoryScreen,
  SettingsScreen,
  SupportScreen,
} from '../screens';
import { useTheme } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Playlist"
          component={PlaylistScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ animation: 'slide_from_right', gestureEnabled: false }}
        />
        <Stack.Screen
          name="Success"
          component={SuccessScreen}
          options={{ animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Support"
          component={SupportScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
