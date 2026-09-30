/**
 * TubeMerger Mobile - MergeScreen (Tab 2)
 * Pixel-perfect match for Screenshot 3:
 * - "Merge Playlist" Header
 * - URL Input with Search icon and Clear button
 * - Full-width vibrant red Inspect button
 * - "Supported Formats" card: MP4 Video (up to 4K) & MP3 Audio (320kbps)
 * - Info notice card: YouTube history / saved playlists tip
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  Play,
  Download,
  Music,
  Info,
  ChevronLeft,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { playlistService } from '../services/engine';
import { telemetryService } from '../services/analytics';
import { ErrorClassifier } from '../services/errors';
import { notificationService } from '../services/notification';

export function MergeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInspect = async () => {
    const clean = url.trim();
    if (!clean) {
      setValidationError('Please enter or paste a YouTube URL.');
      return;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      setValidationError('URL must start with https://');
      return;
    }

    setLoading(true);
    setValidationError(null);

    try {
      const data = await playlistService.fetchPlaylist(clean);
      telemetryService.trackPlaylistInspected(data.video_count, data.estimated_size_mb);
      navigation.navigate('Playlist', {
        url: clean,
        preloadedPlaylist: data,
      });
    } catch (err: any) {
      const classified = ErrorClassifier.classify(err.message);
      setValidationError(classified.userMessage);
      notificationService.error(
        classified.userTitle,
        `${classified.userMessage}\n\n${classified.recommendation}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#08080A]">
      {/* Header */}
      <View className="pt-12 pb-4 px-5 border-b border-[#181820] flex-row items-center">
        <Pressable
          onPress={() => navigation.navigate('Main', { screen: 'HomeTab' })}
          className="mr-3 p-1 -ml-1 active:opacity-70"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-extrabold text-white tracking-tight">
          Merge Playlist
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search & URL Input Bar */}
        <View className="bg-[#141418] border border-[#262632] rounded-2xl px-4 py-3.5 flex-row items-center mb-3">
          <View style={{ marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
            <Search size={18} color="#71717A" />
          </View>
          <TextInput
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              if (validationError) setValidationError(null);
            }}
            placeholder="Paste YouTube Playlist or Video URL..."
            placeholderTextColor="#666675"
            className="flex-1 text-sm text-white py-0 font-medium"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {url.length > 0 && (
            <Pressable
              onPress={() => {
                setUrl('');
                setValidationError(null);
              }}
              className="bg-[#22222C] px-2.5 py-1 rounded-lg"
            >
              <Text className="text-[11px] font-semibold text-[#A0A0AA]">Clear</Text>
            </Pressable>
          )}
        </View>

        {validationError && (
          <View className="p-3 mb-3 bg-[#1A0A0A] border border-[#FF1E1E]/60 rounded-xl">
            <Text className="text-xs text-[#FF4D4D]">{validationError}</Text>
          </View>
        )}

        {/* Big Full-Width Inspect Button */}
        <Pressable
          onPress={handleInspect}
          disabled={loading}
          className="w-full bg-[#FF1E1E] py-4 rounded-2xl flex-row items-center justify-center active:bg-[#D91818] mb-6 shadow-md shadow-brand-red/20"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View className="flex-row items-center justify-center">
              <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Play size={18} fill="#FFFFFF" color="#FFFFFF" />
              </View>
              <Text className="text-base font-bold text-white tracking-wide">
                Inspect
              </Text>
            </View>
          )}
        </Pressable>

        {/* Supported Formats Section */}
        <Text className="text-xs font-bold text-[#8E8E98] uppercase tracking-wider mb-2.5 px-1">
          Supported Formats
        </Text>

        <View className="bg-[#141418] border border-[#22222C] rounded-2xl p-4 mb-4">
          {/* Format 1: MP4 */}
          <View className="flex-row items-center py-1">
            <View className="w-8 h-8 rounded-lg bg-[#1E1E26] items-center justify-center mr-3">
              <Download size={18} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">
                MP4 Video (up to 4K)
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-[#22222C] my-3" />

          {/* Format 2: MP3 */}
          <View className="flex-row items-center py-1">
            <View className="w-8 h-8 rounded-lg bg-[#1E1E26] items-center justify-center mr-3">
              <Music size={18} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">
                MP3 Audio (320kbps)
              </Text>
            </View>
          </View>
        </View>

        {/* Info Tip Card */}
        <View className="bg-[#141418] border border-[#22222C] rounded-2xl p-4 flex-row items-start mb-8">
          <Info size={18} color="#8E8E98" className="mr-3 mt-0.5" />
          <Text className="flex-1 text-xs text-[#8E8E98] leading-5">
            You can also select from your YouTube history or saved playlists.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
