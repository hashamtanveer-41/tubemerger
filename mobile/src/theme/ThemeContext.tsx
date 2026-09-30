/**
 * TubeMerger Mobile - ThemeContext
 * Provides global theme switching (Light <-> Dark) across the entire application.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'react-native';
import { settingsService } from '../services/settings';

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  surface: string;
  card: string;
  cardBorder: string;
  cardSelectedBg: string;
  cardSelectedBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  iconMuted: string;
  divider: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarInactive: string;
  statusBarStyle: 'light-content' | 'dark-content';
  brandRed: string;
  brandRedHover: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  modalBackdrop: string;
  modalBg: string;
  modalBorder: string;
  toastBg: string;
  toastBorder: string;
}

export const lightColors: ThemeColors = {
  isDark: false,
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardSelectedBg: '#FFF1F2',
  cardSelectedBorder: '#FF1E1E',
  text: '#111111',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  iconMuted: '#6B7280',
  divider: '#E5E7EB',
  border: '#E5E7EB',
  inputBg: '#F0F1F3',
  inputBorder: '#DCDFE4',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabBarInactive: '#9CA3AF',
  statusBarStyle: 'dark-content',
  brandRed: '#FF1E1E',
  brandRedHover: '#D91818',
  buttonSecondaryBg: '#71737E',
  buttonSecondaryText: '#FFFFFF',
  modalBackdrop: 'rgba(0, 0, 0, 0.45)',
  modalBg: '#FFFFFF',
  modalBorder: '#E5E7EB',
  toastBg: '#FFFFFFF2',
  toastBorder: '#E5E7EB',
};

export const darkColors: ThemeColors = {
  isDark: true,
  bg: '#08080A',
  surface: '#141418',
  card: '#131317',
  cardBorder: '#242430',
  cardSelectedBg: '#2A0D0D',
  cardSelectedBorder: '#FF1E1E',
  text: '#FFFFFF',
  textSecondary: '#9E9EA8',
  textMuted: '#71717A',
  iconMuted: '#8E8E98',
  divider: '#1E1E26',
  border: '#1E1E26',
  inputBg: '#1C1C24',
  inputBorder: '#2A2A36',
  tabBarBg: '#0A0A0D',
  tabBarBorder: '#1A1A22',
  tabBarInactive: '#71717A',
  statusBarStyle: 'light-content',
  brandRed: '#FF1E1E',
  brandRedHover: '#D91818',
  buttonSecondaryBg: '#242430',
  buttonSecondaryText: '#FFFFFF',
  modalBackdrop: 'rgba(4, 4, 6, 0.82)',
  modalBg: '#131317',
  modalBorder: '#262632',
  toastBg: '#181820F2',
  toastBorder: '#2C2C3A',
};

interface ThemeContextType {
  theme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: (val?: boolean | any) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>(settingsService.getSettings().theme || 'light');

  useEffect(() => {
    const unsub = settingsService.subscribe(() => {
      const current = settingsService.getSettings().theme || 'light';
      setThemeState(current);
    });
    return unsub;
  }, []);

  const colors = useMemo(() => (theme === 'dark' ? darkColors : lightColors), [theme]);

  const setTheme = (nextTheme: 'light' | 'dark') => {
    settingsService.updateSettings({ theme: nextTheme });
    setThemeState(nextTheme);
  };

  const toggleTheme = (val?: boolean | any) => {
    if (typeof val === 'boolean') {
      setTheme(val ? 'dark' : 'light');
    } else {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        colors,
        toggleTheme,
        setTheme,
      }}
    >
      <StatusBar barStyle={colors.statusBarStyle} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
