/**
 * TubeMerger Mobile - MainTabs
 * Bottom Tab Navigator:
 * - 3 Visible Tabs: Home, Downloads, Settings
 * - Merges Downloads & History into a unified Downloads Tab
 * - Live active download indicator badge on Downloads icon
 * - Pure AMOLED dark bar (#0A0A0D) with brand red active highlight
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Download, Settings } from 'lucide-react-native';
import { MainTabParamList } from './types';
import {
  HomeScreen,
  DownloadsScreen,
  SettingsScreen,
} from '../screens';
import { useTheme } from '../theme';
import { mergeService } from '../services/engine';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useTheme();
  const [hasActiveJob, setHasActiveJob] = useState<boolean>(() => {
    const job = mergeService.getActiveJob ? mergeService.getActiveJob() : null;
    return Boolean(job && job.progress?.status !== 'done' && job.progress?.status !== 'error');
  });

  useEffect(() => {
    if (mergeService.subscribeActiveJob) {
      return mergeService.subscribeActiveJob((job) => {
        setHasActiveJob(Boolean(job && job.progress?.status !== 'done' && job.progress?.status !== 'error'));
      });
    }
  }, []);

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
              <View style={styles.iconWrapper}>
                <Download size={20} color={focused ? colors.brandRed : colors.tabBarInactive} />
                {hasActiveJob && <View style={styles.downloadActiveBadge} />}
              </View>
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

      {/* Hidden legacy HistoryTab redirecting directly to unified DownloadsScreen */}
      <Tab.Screen
        name="HistoryTab"
        component={DownloadsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
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
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadActiveBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF1E1E',
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
