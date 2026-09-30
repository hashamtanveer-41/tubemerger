/**
 * TubeMerger Mobile - MainTabs
 * Bottom Tab Navigator:
 * - 4 Tabs: Home, Downloads, History, Settings
 * - Pure AMOLED dark bar (#0A0A0D)
 * - Brand red active highlight with subtle underline indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Download, History, Settings } from 'lucide-react-native';
import { MainTabParamList } from './types';
import {
  HomeScreen,
  DownloadsScreen,
  HistoryScreen,
  SettingsScreen,
} from '../screens';
import { useTheme } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Home size={20} color={focused ? colors.brandRed : colors.tabBarInactive} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: focused ? colors.brandRed : colors.tabBarInactive,
                    fontWeight: focused ? '700' : '500',
                  },
                ]}
              >
                Home
              </Text>
              {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.brandRed }]} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="DownloadsTab"
        component={DownloadsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Download size={20} color={focused ? colors.brandRed : colors.tabBarInactive} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: focused ? colors.brandRed : colors.tabBarInactive,
                    fontWeight: focused ? '700' : '500',
                  },
                ]}
              >
                Downloads
              </Text>
              {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.brandRed }]} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <History size={20} color={focused ? colors.brandRed : colors.tabBarInactive} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: focused ? colors.brandRed : colors.tabBarInactive,
                    fontWeight: focused ? '700' : '500',
                  },
                ]}
              >
                History
              </Text>
              {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.brandRed }]} />}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabItem}>
              <Settings size={20} color={focused ? colors.brandRed : colors.tabBarInactive} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: focused ? colors.brandRed : colors.tabBarInactive,
                    fontWeight: focused ? '700' : '500',
                  },
                ]}
              >
                Settings
              </Text>
              {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.brandRed }]} />}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    position: 'relative',
    width: 68,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 32,
    height: 2,
    backgroundColor: '#FF1E1E',
    borderRadius: 2,
    shadowColor: '#FF1E1E',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
});
