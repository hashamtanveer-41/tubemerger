/**
 * TubeMerger Mobile - SettingsScreen
 * Pixel-perfect match for user's Image 1:
 * - Header: Back arrow + "Settings"
 * - "Output Settings" card:
 *   - Video Quality ("1080p Full HD ⌵") with proper popup picker
 *   - Frame Rate ("30 FPS ⌵") with proper popup picker
 *   - Audio Quality (MP3) ("320kbps ⌵") with proper popup picker
 * - "General" card:
 *   - Auto-open after merge (toggle switch)
 *   - Save to History (toggle switch with red active color)
 *   - Show notifications (toggle switch with red active color)
 *   - About (with > chevron) - triggers custom popup dialog
 *   - Help & Support (with > chevron) - opens Diagnostics
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  StatusBar,
  StyleSheet,
  Animated,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
  Bell,
  Info,
  HelpCircle,
  Check,
  X,
  Moon,
  Sun,
} from 'lucide-react-native';
import { settingsService, AppSettings } from '../services/settings';
import { notificationService } from '../services/notification';
import { useTheme } from '../theme';

interface PickerState {
  visible: boolean;
  title: string;
  options: { label: string; value: string; desc?: string }[];
  currentValue: string;
  onSelect: (val: any) => void;
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark, toggleTheme, colors } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());
  const [picker, setPicker] = useState<PickerState>({
    visible: false,
    title: '',
    options: [],
    currentValue: '',
    onSelect: () => {},
  });

  const pickerScale = useRef(new Animated.Value(0.88)).current;
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  const pickerBackdrop = useRef(new Animated.Value(0)).current;

  const openPicker = (config: Omit<PickerState, 'visible'>) => {
    pickerScale.setValue(0.88);
    pickerOpacity.setValue(0);
    pickerBackdrop.setValue(0);
    setPicker({ ...config, visible: true });

    Animated.parallel([
      Animated.timing(pickerBackdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(pickerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(pickerScale, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }),
    ]).start();
  };

  const closePicker = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(pickerBackdrop, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(pickerScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setPicker((prev) => ({ ...prev, visible: false }));
      if (onDone) onDone();
    });
  };

  const handleSelectQuality = () => {
    openPicker({
      title: 'Video Quality',
      currentValue: settings.videoQuality,
      options: [
        { label: '1080p Full HD', value: '1080p', desc: 'Crisp 1920x1080 resolution' },
        { label: '720p HD', value: '720p', desc: 'Standard 1280x720 resolution' },
        { label: '480p SD', value: '480p', desc: 'Faster download, compact size' },
        { label: '360p', value: '360p', desc: 'Minimal data usage' },
      ],
      onSelect: (val: AppSettings['videoQuality']) => {
        const updated = settingsService.updateSettings({ videoQuality: val });
        setSettings(updated);
        closePicker();
        notificationService.toast(`Video Quality set to ${val}`, 'success');
      },
    });
  };

  const handleSelectFps = () => {
    openPicker({
      title: 'Frame Rate',
      currentValue: settings.frameRate,
      options: [
        { label: '30 FPS', value: '30 FPS', desc: 'Standard television frame rate' },
        { label: '60 FPS', value: '60 FPS', desc: 'Silky smooth high motion rate' },
      ],
      onSelect: (val: AppSettings['frameRate']) => {
        const updated = settingsService.updateSettings({ frameRate: val });
        setSettings(updated);
        closePicker();
        notificationService.toast(`Frame Rate set to ${val}`, 'success');
      },
    });
  };

  const handleSelectAudioBitrate = () => {
    openPicker({
      title: 'Audio Quality (MP3)',
      currentValue: settings.audioQuality,
      options: [
        { label: '320 kbps', value: '320kbps', desc: 'Audiophile studio master fidelity' },
        { label: '256 kbps', value: '256kbps', desc: 'High fidelity audio stream' },
        { label: '192 kbps', value: '192kbps', desc: 'Balanced audio quality' },
        { label: '128 kbps', value: '128kbps', desc: 'Compact file size' },
      ],
      onSelect: (val: AppSettings['audioQuality']) => {
        const updated = settingsService.updateSettings({ audioQuality: val });
        setSettings(updated);
        closePicker();
        notificationService.toast(`Audio Quality set to ${val}`, 'success');
      },
    });
  };

  const handleToggle = (key: 'autoOpen' | 'saveToHistory' | 'showNotifications', value: boolean) => {
    const updated = settingsService.updateSettings({ [key]: value });
    setSettings(updated);

    const labels: Record<string, string> = {
      autoOpen: 'Auto-open after merge',
      saveToHistory: 'Save to History',
      showNotifications: 'Notifications',
    };
    notificationService.toast(
      `${labels[key]} ${value ? 'enabled' : 'disabled'}`,
      'info'
    );
  };

  const qualityLabel =
    settings.videoQuality === '1080p'
      ? '1080p Full HD'
      : settings.videoQuality === '720p'
      ? '720p HD'
      : settings.videoQuality === '480p'
      ? '480p SD'
      : '360p';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} />

      {/* Top Header */}
      <View
        style={{
          paddingTop: 48,
          paddingBottom: 14,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginRight: 12, padding: 4, marginLeft: -4 }}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
          Settings
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 0: Appearance (Theme Mode Toggle) */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          Appearance
        </Text>

        <Pressable
          onPress={() => toggleTheme(!isDark)}
          style={({ pressed }) => ({
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={{ width: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                {isDark ? (
                  <Sun size={20} color="#FFB800" />
                ) : (
                  <Moon size={20} color="#333333" />
                )}
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  Dark Mode
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  {isDark ? 'AMOLED dark theme enabled' : 'Clean light theme enabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => toggleTheme(val)}
              trackColor={{ false: isDark ? '#262632' : '#D1D5DB', true: colors.brandRed }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Pressable>

        {/* Section 1: Output Settings */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          Output Settings
        </Text>

        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
          }}
        >
          {/* Row 1: Video Quality */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Video Quality</Text>
            <Pressable
              onPress={handleSelectQuality}
              style={{
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginRight: 6 }}>
                {qualityLabel}
              </Text>
              <ChevronDown size={14} color={colors.iconMuted} />
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Row 2: Frame Rate */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Frame Rate</Text>
            <Pressable
              onPress={handleSelectFps}
              style={{
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginRight: 6 }}>
                {settings.frameRate}
              </Text>
              <ChevronDown size={14} color={colors.iconMuted} />
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Row 3: Audio Quality (MP3) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Audio Quality (MP3)</Text>
            <Pressable
              onPress={handleSelectAudioBitrate}
              style={{
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginRight: 6 }}>
                {settings.audioQuality}
              </Text>
              <ChevronDown size={14} color={colors.iconMuted} />
            </Pressable>
          </View>
        </View>

        {/* Section 2: General */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          General
        </Text>

        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 18,
            padding: 16,
            marginBottom: 24,
          }}
        >
          {/* Row 1: Auto-open after merge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={{ width: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                <ExternalLink size={18} color={colors.iconMuted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                Auto-open after merge
              </Text>
            </View>
            <Switch
              value={settings.autoOpen}
              onValueChange={(val) => handleToggle('autoOpen', val)}
              trackColor={{ false: isDark ? '#262632' : '#D1D5DB', true: colors.brandRed }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Row 2: Save to History */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={{ width: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                <History size={18} color={colors.iconMuted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                Save to History
              </Text>
            </View>
            <Switch
              value={settings.saveToHistory}
              onValueChange={(val) => handleToggle('saveToHistory', val)}
              trackColor={{ false: isDark ? '#262632' : '#D1D5DB', true: colors.brandRed }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Row 3: Show notifications */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={{ width: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={18} color={colors.iconMuted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                Show notifications
              </Text>
            </View>
            <Switch
              value={settings.showNotifications}
              onValueChange={(val) => handleToggle('showNotifications', val)}
              trackColor={{ false: isDark ? '#262632' : '#D1D5DB', true: colors.brandRed }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Row 4: About */}
          <Pressable
            onPress={() => {
              Linking.openURL('https://github.com/hashamtanveer-41/tubemerger').catch(() => {
                notificationService.toast('Unable to open GitHub repository', 'warning');
              });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Info size={18} color={colors.iconMuted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>About</Text>
            </View>
            <ChevronRight size={18} color={colors.iconMuted} />
          </Pressable>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Row 5: Help & Support */}
          <Pressable
            onPress={() => {
              Linking.openURL('https://hashamtanvr.gumroad.com/l/support-tubemerger').catch(() => {
                notificationService.toast('Unable to open support link', 'warning');
              });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={18} color={colors.iconMuted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={colors.iconMuted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Dynamic Dropdown Selection Popup Modal with smooth animation */}
      <Modal
        visible={picker.visible}
        transparent
        animationType="none"
        onRequestClose={() => closePicker()}
      >
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: colors.modalBackdrop,
              opacity: pickerBackdrop,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closePicker()} />

          <Animated.View
            style={[
              styles.pickerCard,
              {
                backgroundColor: colors.modalBg,
                borderColor: colors.modalBorder,
                opacity: pickerOpacity,
                transform: [{ scale: pickerScale }],
              },
            ]}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{picker.title}</Text>
              <Pressable onPress={() => closePicker()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.closeBtn}>
                <X size={18} color={colors.iconMuted} />
              </Pressable>
            </View>

            <View style={{ marginTop: 4 }}>
              {picker.options.map((opt, idx) => {
                const isSelected = opt.value === picker.currentValue;

                return (
                  <Pressable
                    key={`opt-${idx}`}
                    onPress={() => closePicker(() => picker.onSelect(opt.value))}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      marginBottom: 10,
                      borderRadius: 16,
                      borderWidth: 1,
                      backgroundColor: isSelected ? colors.cardSelectedBg : colors.inputBg,
                      borderColor: isSelected ? colors.cardSelectedBorder : colors.inputBorder,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: isSelected ? colors.brandRed : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                      {opt.desc ? (
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                          {opt.desc}
                        </Text>
                      ) : null}
                    </View>

                    {isSelected ? (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: colors.brandRed,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.inputBorder,
                        }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
});
