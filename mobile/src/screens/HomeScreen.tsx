/**
 * TubeMerger Mobile - HomeScreen
 * Pixel-perfect implementation of User Design:
 * - Dynamic theme switching: Whole app changes from black to white and vice-versa
 * - Top bar with TubeMerger brand, dynamic Sun/Moon mode toggle, and Menu icon
 * - Giant rounded gradient hero card (Deep Purple #431E54 to Crimson Red #A81C26)
 * - Top white squiggle wave doodle
 * - "Your Ultimate" in italic + bold "Video Merger"
 * - Descriptive copy with bold TubeMerger
 * - Glassmorphic oval search pill with Search icon
 * - Dual Paste Link (#71737E) and Inspect (#FF1E1E) action buttons with exact spacing
 * - "Supported Services: YouTube" (Vimeo removed per user request)
 * - Hand-drawn downward curlicue arrow doodle
 * - "Free [Free] Video Content Merger"
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  ClipboardPaste,
  Play,
  Download,
  X,
  Moon,
  Sun,
  Heart,
  AlertTriangle,
  RotateCw,
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootStackParamList } from '../navigation/types';
import { playlistService } from '../services/engine';
import { telemetryService } from '../services/analytics';
import { ErrorClassifier, ClassifiedError } from '../services/errors';
import { updateService, UpdateInfo } from '../services/updates';
import { getNativeClipboard } from '../services/clipboard';
import { notificationService } from '../services/notification';
import { useTheme } from '../theme';
import { UpdatePromptModal } from '../components';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark, toggleTheme, colors } = useTheme();
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<ClassifiedError | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [cardLayout, setCardLayout] = useState<{ width: number; height: number } | null>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    updateService
      .checkForUpdates()
      .then(async (info) => {
        if (info.hasUpdate) {
          setUpdateInfo(info);
          const shouldPrompt = await updateService.shouldPromptUpdate(info);
          if (shouldPrompt) {
            setShowUpdateModal(true);
          }
        }
      })
      .catch(() => { });
  }, []);

  const handleDismissUpdate = async () => {
    if (updateInfo && !updateInfo.isForceUpdate) {
      await updateService.markUpdateDismissed(updateInfo.latestVersion);
      setShowUpdateModal(false);
    }
  };

  const handlePerformUpdate = async () => {
    if (updateInfo?.downloadUrl) {
      await updateService.openDownloadPage(updateInfo.downloadUrl);
      if (!updateInfo.isForceUpdate) {
        await updateService.markUpdateDismissed(updateInfo.latestVersion);
        setShowUpdateModal(false);
      }
    }
  };

  const handlePaste = async () => {
    const text = await getNativeClipboard();
    if (text) {
      setUrl(text);
      setValidationError(null);
      setActiveError(null);
      notificationService.toast('Pasted from clipboard', 'success');
    } else {
      notificationService.toast('Clipboard is empty. Copy a YouTube URL first.', 'warning');
    }
  };

  const validateUrl = (input: string): boolean => {
    const clean = input.trim();
    if (!clean) {
      setValidationError('Please enter or paste a YouTube link.');
      setActiveError(null);
      return false;
    }
    const lower = clean.toLowerCase();
    if (lower.includes('spotify.com') || lower.includes('apple.com') || lower.includes('tidal.com')) {
      setValidationError('Subscription streaming platforms are DRM protected. Provide a YouTube link.');
      setActiveError(null);
      return false;
    }
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      setValidationError('URL must start with https://');
      setActiveError(null);
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleInspect = async (overrideUrl?: string, defaultFormat?: 'mp4' | 'mp3') => {
    const targetUrl = (overrideUrl || url).trim();
    if (!validateUrl(targetUrl)) return;

    setLoading(true);
    setValidationError(null);
    setActiveError(null);

    try {
      const data = await playlistService.fetchPlaylist(targetUrl);
      telemetryService.trackPlaylistInspected(data.video_count, data.estimated_size_mb);
      navigation.navigate('Playlist', {
        url: targetUrl,
        preloadedPlaylist: data,
        format: defaultFormat || 'mp4',
      });
    } catch (err: any) {
      const classified = ErrorClassifier.classify(err.message);
      setActiveError(classified);
      notificationService.error(
        classified.userTitle,
        `${classified.userMessage}\n\n${classified.recommendation}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTheme = () => {
    toggleTheme();
    notificationService.toast(`Switched to ${isDark ? 'Light' : 'Dark'} mode`, 'info');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Header Bar */}
      <View
        style={{
          paddingTop: 44,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo & Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 28, height: 28, resizeMode: 'contain', marginRight: 8 }}
          />
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>
            Tube
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#FF1E1E', letterSpacing: -0.5 }}>
            Merger
          </Text>
        </View>

        {/* Header Right Actions: Sun/Moon Theme Toggle and Hamburger Menu */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={handleToggleTheme}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
            style={{ padding: 8, marginRight: 4 }}
            accessibilityLabel="Toggle Theme"
          >
            {isDark ? (
              <Sun size={22} color="#FFB800" strokeWidth={2.2} />
            ) : (
              <Moon size={22} color="#222222" strokeWidth={2.2} />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Linking.openURL('https://hashamtanvr.gumroad.com/l/support-tubemerger').catch(() => {
                notificationService.toast('Unable to open support link', 'warning');
              });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            style={{ padding: 8 }}
            accessibilityLabel="Support TubeMerger"
          >
            <Heart size={22} color="#FF1E1E" fill="#FF1E1E" strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Release Update Banner (if available) */}
        {updateInfo && (
          <Pressable
            onPress={() => updateService.openDownloadPage(updateInfo.downloadUrl)}
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              marginBottom: 4,
              padding: 12,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
              v{updateInfo.latestVersion} available
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF1E1E' }}>Update</Text>
          </Pressable>
        )}

        {/* 1. Giant Purple-to-Red Rounded Hero Card */}
        <View
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setCardLayout({ width, height });
            }
          }}
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 32,
            overflow: 'hidden',
            backgroundColor: '#A81C26',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.5 : 0.22,
            shadowRadius: 18,
            elevation: 10,
          }}
        >
          {/* Background Gradient */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg
              width={cardLayout ? cardLayout.width : '100%'}
              height={cardLayout ? cardLayout.height : '100%'}
            >
              <Defs>
                <LinearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="85%">
                  <Stop offset="0%" stopColor="#431E54" />
                  <Stop offset="30%" stopColor="#4F1D4B" />
                  <Stop offset="65%" stopColor="#7E1A33" />
                  <Stop offset="100%" stopColor="#A81C26" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#heroGradient)" />
            </Svg>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 28, alignItems: 'center' }}>
            {/* Top Squiggle Wave Doodle */}
            <View style={{ marginBottom: 16 }}>
              <Svg width={140} height={20} viewBox="0 0 140 20">
                <Path
                  d="M 5 12 Q 13 4, 21 11 T 37 11 T 53 11 T 69 11 T 85 11 T 101 11 T 117 11 Q 125 15, 134 11"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.88}
                />
              </Svg>
            </View>

            {/* Hero Title */}
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontStyle: 'italic', fontWeight: '500', textAlign: 'center', letterSpacing: -0.3 }}>
              Your Ultimate
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 }}>
              Video Merger
            </Text>

            {/* Description Subtitle */}
            <Text style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 20, marginBottom: 20, paddingHorizontal: 4 }}>
              <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>TubeMerger</Text> lets you combine video playlists and videos instantly with speed and ease. No hassle, just seamless video curation at your fingertips!
            </Text>

            {/* Glassmorphic Oval Search Pill */}
            <View
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.22)',
                borderRadius: 9999,
                paddingLeft: 16,
                paddingRight: 12,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <TextInput
                ref={inputRef}
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (validationError) setValidationError(null);
                  if (activeError) setActiveError(null);
                }}
                placeholder="Paste YouTube Playlist or Video URL..."
                placeholderTextColor="rgba(255, 255, 255, 0.65)"
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: '#FFFFFF',
                  paddingVertical: 8,
                  fontWeight: '500',
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {url.length > 0 && (
                <Pressable
                  onPress={() => {
                    setUrl('');
                    setValidationError(null);
                    setActiveError(null);
                  }}
                  style={{ padding: 6, marginRight: 4 }}
                >
                  <X size={15} color="rgba(255, 255, 255, 0.75)" />
                </Pressable>
              )}

              <Pressable
                onPress={() => handleInspect()}
                disabled={loading}
                style={{ padding: 6 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Search size={18} color="rgba(255, 255, 255, 0.88)" strokeWidth={2.2} />
                )}
              </Pressable>
            </View>

            {/* Validation Notice Banner */}
            {validationError && (
              <View
                style={{
                  width: '100%',
                  padding: 12,
                  marginBottom: 12,
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 30, 30, 0.8)',
                  borderRadius: 14,
                }}
              >
                <Text style={{ fontSize: 12, color: '#FF6666', textAlign: 'center', fontWeight: '600' }}>
                  {validationError}
                </Text>
              </View>
            )}

            {/* Desktop-grade Classified Error Card */}
            {activeError && (
              <View
                style={{
                  width: '100%',
                  padding: 14,
                  marginBottom: 14,
                  backgroundColor: 'rgba(20, 10, 15, 0.88)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 60, 60, 0.7)',
                  borderRadius: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: 'rgba(255, 30, 30, 0.3)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 30, 30, 0.6)',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFAAAA', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {activeError.badge}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: activeError.isResolvable ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: activeError.isResolvable ? '#4ADE80' : '#FBBF24',
                        }}
                      >
                        {activeError.isResolvable ? 'Transient' : 'Action Required'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setActiveError(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 2 }}
                  >
                    <X size={15} color="rgba(255, 255, 255, 0.7)" />
                  </Pressable>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 }}>
                  {activeError.userTitle}
                </Text>

                <Text style={{ fontSize: 11.5, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 17, marginBottom: 8 }}>
                  {activeError.userMessage}
                </Text>

                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    padding: 9,
                    borderLeftWidth: 3,
                    borderLeftColor: '#FF6666',
                    marginBottom: activeError.isResolvable ? 10 : 0,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '500', lineHeight: 16 }}>
                    💡 {activeError.recommendation}
                  </Text>
                </View>

                {activeError.isResolvable && (
                  <Pressable
                    onPress={() => handleInspect()}
                    style={{
                      marginTop: 4,
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 30, 30, 0.35)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 60, 60, 0.5)',
                    }}
                  >
                    <RotateCw size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Retry Inspection</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Dual Action Buttons: Paste Link & Download */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Pressable
                onPress={handlePaste}
                style={{
                  width: '48%',
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: '#606470',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardPaste size={16} color="#FFFFFF" strokeWidth={2.2} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Paste Link</Text>
              </Pressable>

              <Pressable
                onPress={() => handleInspect()}
                disabled={loading}
                style={{
                  width: '48%',
                  paddingVertical: 14,
                  borderRadius: 16,
                  backgroundColor: '#FF1E1E',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <Download size={16} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Download</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* 2. Lower Section: Supported Services & Branding (Vimeo removed per request) */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 }}>
            Supported Services:
          </Text>

          {/* Services Row: YouTube only */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={[
                  styles.ytIconBadge,
                  { borderColor: isDark ? '#7E7E8E' : '#4E4E5A' },
                ]}
              >
                <Play size={8} fill={isDark ? '#7E7E8E' : '#4E4E5A'} color={isDark ? '#7E7E8E' : '#4E4E5A'} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                YouTube
              </Text>
            </View>
          </View>

          {/* Hand-drawn Downward Curlicue Arrow Doodle */}
          <View style={{ marginVertical: 4 }}>
            <Svg width={44} height={44} viewBox="0 0 44 44">
              <Path
                d="M 32 4 C 25 2, 16 7, 18 16 C 20 25, 30 21, 28 14 C 26 8, 16 19, 13 32"
                stroke={isDark ? '#5A5A6A' : '#9A9AA8'}
                strokeWidth={1.8}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M 8 26 L 13 33 L 20 29"
                stroke={isDark ? '#5A5A6A' : '#9A9AA8'}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>

          {/* Free Badge & Title */}
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <View style={{ marginBottom: 6 }}>
              <View style={{ backgroundColor: '#FF1E1E', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 }}>Free</Text>
              </View>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.4 }}>
              Video Content Merger
            </Text>
          </View>
        </View>
      </ScrollView>

      <UpdatePromptModal
        visible={showUpdateModal}
        updateInfo={updateInfo}
        onDismiss={handleDismissUpdate}
        onUpdate={handlePerformUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ytIconBadge: {
    width: 22,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
});
