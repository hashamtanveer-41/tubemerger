/**
 * TubeMerger Mobile - SupportScreen
 * Premium Support & Community page:
 * - Direct link from header Heart icon
 * - Open Source & Community mission
 * - Interactive FAQs
 * - In-app System Diagnostics integration
 * - Issue reporting guidance
 * - 100% dynamic theme switching (Light <-> Dark)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Heart,
  HelpCircle,
  Code2,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { notificationService } from '../services/notification';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Why are only YouTube playlists supported?',
    answer:
      'Subscription music services (Spotify, Apple Music, Tidal) enforce Widevine/FairPlay DRM encryption that prevents local video extraction. TubeMerger is strictly optimized for public YouTube playlists and videos with native yt-dlp and FFmpeg engines.',
  },
  {
    question: 'Where are my merged videos saved?',
    answer:
      'All merged videos and MP3 audio files are saved directly to your device storage under Movies/TubeMerger or Music/TubeMerger. You can also view and share them anytime from the Downloads tab.',
  },
  {
    question: 'How do I choose between 1080p and 720p?',
    answer:
      'Navigate to the Settings tab, tap Video Quality, and select your preferred output resolution (1080p Full HD, 720p HD, 480p, or 360p). You can also configure 60 FPS frame rates.',
  },
  {
    question: 'Does TubeMerger collect any personal data?',
    answer:
      'No. TubeMerger runs locally on your Android device. Video extraction and FFmpeg concatenation occur directly on your hardware without external proxy servers.',
  },
];

export function SupportScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleOpenGithub = () => {
    Linking.openURL('https://github.com/hashamtanveer-41/tubemerger').catch(() => {
      notificationService.toast('Could not open browser', 'error');
    });
  };

  const handleOpenGumroad = () => {
    Linking.openURL('https://hashamtanvr.gumroad.com/l/support-tubemerger').catch(() => {
      notificationService.toast('Could not open browser', 'error');
    });
  };

  const handleSendFeedback = () => {
    notificationService.alert(
      'Community Feedback',
      'We welcome your suggestions and bug reports!\n\nEmail: support@tubemerger.app\nGitHub: github.com/tubemerger'
    );
  };

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
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginRight: 12, padding: 4, marginLeft: -4 }}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
          Help & Support
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Support Card */}
        <View
          style={{
            backgroundColor: isDark ? '#141418' : '#FFFFFF',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 24,
            padding: 22,
            marginBottom: 22,
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.4 : 0.08,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(255, 30, 30, 0.16)' : '#FEE2E2',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(255, 30, 30, 0.4)' : '#FECACA',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Heart size={28} color="#FF1E1E" fill="#FF1E1E" />
          </View>

          <Text
            style={{
              fontSize: 19,
              fontWeight: '900',
              color: colors.text,
              textAlign: 'center',
              letterSpacing: -0.3,
              marginBottom: 6,
            }}
          >
            Thank You for Using TubeMerger
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
              paddingHorizontal: 8,
            }}
          >
            Crafted for seamless YouTube video compilation with speed, privacy, and zero ads.
          </Text>
        </View>

        {/* 2. Quick Actions */}
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
          Tools & Diagnostics
        </Text>

        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 20,
            padding: 16,
            marginBottom: 24,
          }}
        >
          {/* Action 1: Support Development */}
          <Pressable
            onPress={handleOpenGumroad}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(255, 30, 30, 0.14)' : '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Heart size={18} color="#FF1E1E" fill="#FF1E1E" />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                Support on Gumroad
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                Tip or fund ongoing feature development
              </Text>
            </View>
          </View>
          <Sparkles size={16} color={colors.iconMuted} />
        </Pressable>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Action 2: Community & GitHub */}
          <Pressable
            onPress={handleOpenGithub}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Code2 size={18} color={colors.text} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  Source Code & GitHub
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Star the repo or inspect open source code
                </Text>
              </View>
            </View>
          </Pressable>

          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

          {/* Action 3: Report an Issue */}
          <Pressable
            onPress={handleSendFeedback}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Mail size={18} color={colors.text} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  Send Feedback
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Request features or report issues
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* 3. Frequently Asked Questions */}
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
          Frequently Asked Questions
        </Text>

        <View style={{ marginBottom: 20 }}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;

            return (
              <Pressable
                key={`faq-${index}`}
                onPress={() => setExpandedFaq(isExpanded ? null : index)}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: isExpanded ? colors.brandRed : colors.cardBorder,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <HelpCircle size={16} color={isExpanded ? colors.brandRed : colors.iconMuted} style={{ marginRight: 10 }} />
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: isExpanded ? colors.brandRed : colors.text,
                        flex: 1,
                      }}
                    >
                      {faq.question}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={16} color={colors.brandRed} />
                  ) : (
                    <ChevronDown size={16} color={colors.iconMuted} />
                  )}
                </View>

                {isExpanded && (
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: colors.textSecondary,
                      lineHeight: 19,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colors.divider,
                    }}
                  >
                    {faq.answer}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Footer Version Info */}
        <Text
          style={{
            fontSize: 11,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          TubeMerger v1.0.0 • yt-dlp & FFmpeg NDK
        </Text>
      </ScrollView>
    </View>
  );
}
