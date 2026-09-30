/**
 * TubeMerger Mobile - PlaylistScreen
 * Pixel-perfect match for Screenshot 4:
 * - Header: Back arrow + "Select Videos" + "4 videos selected" + "Clear All" pill
 * - Playlist summary card with thumbnail, channel, red pill count badge, and three-dots menu
 * - Segmented format pill tabs: [MP4 Video] (active red) | [MP3 Audio]
 * - Quality dropdown row: "Quality" ... "1080p Full HD ⌵"
 * - Section header: "VIDEOS IN PLAYLIST" in red + "Select All" toggle
 * - Clip list with red checkboxes, HD badges, metadata, and "01", "02" index badges
 * - Bottom floating button: "Merge Selected (X Videos)"
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Image,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  MoreVertical,
  Film,
  Music,
  ChevronDown,
  Check,
  Play,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { ClipItem } from '../components';
import { playlistService } from '../services/engine';
import { Playlist, VideoClip } from '../shared/types';
import { OutputFormat, VideoQuality } from '../components';
import { notificationService } from '../services/notification';
import { ErrorClassifier } from '../services/errors';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Playlist'>;

export function PlaylistScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { url, preloadedPlaylist, format: initialFormat } = route.params;

  const [playlist, setPlaylist] = useState<Playlist | null>(preloadedPlaylist || null);
  const [loading, setLoading] = useState<boolean>(!preloadedPlaylist);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => {
    if (preloadedPlaylist) {
      return new Set(preloadedPlaylist.entries.map((_, i) => i));
    }
    return new Set();
  });
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>(initialFormat || 'mp4');
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>('1080p');

  useEffect(() => {
    if (!preloadedPlaylist) {
      let isMounted = true;
      const load = async () => {
        try {
          const data = await playlistService.fetchPlaylist(url);
          if (isMounted) {
            setPlaylist(data);
            setSelectedIndices(new Set(data.entries.map((_, i) => i)));
          }
        } catch (err: any) {
          const classified = ErrorClassifier.classify(err.message);
          notificationService.error(
            classified.userTitle,
            `${classified.userMessage}\n\n${classified.recommendation}`,
            () => {
              navigation.goBack();
            }
          );
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }
  }, [url, preloadedPlaylist, navigation]);

  const toggleClip = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!playlist) return;
    setSelectedIndices(new Set(playlist.entries.map((_, i) => i)));
  }, [playlist]);

  const handleClearAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const isAllSelected = useMemo(() => {
    if (!playlist || playlist.entries.length === 0) return false;
    return selectedIndices.size === playlist.entries.length;
  }, [playlist, selectedIndices]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      handleClearAll();
    } else {
      handleSelectAll();
    }
  }, [isAllSelected, handleClearAll, handleSelectAll]);

  const selectedClips: VideoClip[] = useMemo(() => {
    if (!playlist) return [];
    return playlist.entries.filter((_, i) => selectedIndices.has(i));
  }, [playlist, selectedIndices]);

  const totalDurationStr = useMemo(() => {
    if (!playlist) return '0m 00s';
    const totalSecs = playlist.entries.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }, [playlist]);

  const handleStartMerge = () => {
    if (!playlist || selectedClips.length === 0) {
      notificationService.alert('No Clips Selected', 'Please select at least one clip to merge.');
      return;
    }

    navigation.navigate('Progress', {
      payload: {
        playlist_title: playlist.title,
        clips: selectedClips,
        format: selectedFormat,
        quality: selectedQuality,
        selected_indices: Array.from(selectedIndices),
      },
      playlistTitle: playlist.title,
      totalClips: selectedClips.length,
    });
  };

  const renderClipItem = useCallback(
    ({ item, index }: { item: VideoClip; index: number }) => (
      <ClipItem
        clip={item}
        index={index}
        isSelected={selectedIndices.has(index)}
        onToggle={toggleClip}
      />
    ),
    [selectedIndices, toggleClip]
  );

  const keyExtractor = useCallback(
    (item: VideoClip, index: number) => item.id || `clip-${index}`,
    []
  );

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
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ marginRight: 12, padding: 4, marginLeft: -4 }}
          >
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
              Select Videos
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>
              {selectedClips.length} video{selectedClips.length === 1 ? '' : 's'} selected
            </Text>
          </View>
        </View>

        {/* Clear All Pill Button */}
        <Pressable
          onPress={handleClearAll}
          style={{
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 9999,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Clear All</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ActivityIndicator color={colors.brandRed} size="large" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12 }}>
            Loading Videos...
          </Text>
        </View>
      ) : playlist ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={playlist.entries}
            keyExtractor={keyExtractor}
            renderItem={renderClipItem}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListHeaderComponent={
              <View style={{ marginBottom: 16 }}>
                {/* Playlist Summary Card */}
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 18,
                    padding: 14,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {/* Thumbnail with overlay */}
                  <View
                    style={{
                      width: 64,
                      height: 48,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: colors.inputBg,
                      marginRight: 12,
                      position: 'relative',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {playlist.entries[0]?.thumbnail ? (
                      <Image
                        source={{ uri: playlist.entries[0].thumbnail }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Film size={20} color={colors.iconMuted} />
                    )}
                    <View style={{ position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 4, borderRadius: 3 }}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFFFFF' }}>
                        {playlist.video_count} vids
                      </Text>
                    </View>
                  </View>

                  {/* Playlist Info */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }} numberOfLines={1}>
                      {playlist.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                      {playlist.channel || 'YouTube'} • {playlist.video_count} videos • {totalDurationStr}
                    </Text>
                    <View
                      style={{
                        marginTop: 6,
                        alignSelf: 'flex-start',
                        backgroundColor: colors.cardSelectedBg,
                        borderWidth: 1,
                        borderColor: colors.cardSelectedBorder,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 9999,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brandRed }}>
                        {playlist.video_count} videos
                      </Text>
                    </View>
                  </View>

                  {/* More Menu */}
                  <Pressable style={{ padding: 4 }}>
                    <MoreVertical size={18} color={colors.iconMuted} />
                  </Pressable>
                </View>

                {/* Segmented Control: MP4 Video vs MP3 Audio */}
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 18,
                    padding: 4,
                    flexDirection: 'row',
                    marginBottom: 12,
                  }}
                >
                  <Pressable
                    onPress={() => setSelectedFormat('mp4')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedFormat === 'mp4' ? colors.brandRed : 'transparent',
                    }}
                  >
                    <View style={{ marginRight: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <Film size={15} color={selectedFormat === 'mp4' ? '#FFFFFF' : colors.iconMuted} />
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: selectedFormat === 'mp4' ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: selectedFormat === 'mp4' ? '700' : '600',
                      }}
                    >
                      MP4 Video
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setSelectedFormat('mp3')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedFormat === 'mp3' ? colors.brandRed : 'transparent',
                    }}
                  >
                    <View style={{ marginRight: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={15} color={selectedFormat === 'mp3' ? '#FFFFFF' : colors.iconMuted} />
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: selectedFormat === 'mp3' ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: selectedFormat === 'mp3' ? '700' : '600',
                      }}
                    >
                      MP3 Audio
                    </Text>
                  </Pressable>
                </View>

                {/* Quality Row (if MP4) */}
                {selectedFormat === 'mp4' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                      Quality
                    </Text>
                    <Pressable
                      onPress={() => {
                        const qualities: VideoQuality[] = ['1080p', '720p', '480p', '360p'];
                        const nextIdx = (qualities.indexOf(selectedQuality) + 1) % qualities.length;
                        setSelectedQuality(qualities[nextIdx]);
                      }}
                      style={{
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginRight: 6 }}>
                        {selectedQuality === '1080p'
                          ? '1080p Full HD'
                          : selectedQuality === '720p'
                          ? '720p HD'
                          : selectedQuality === '480p'
                          ? '480p SD'
                          : '360p'}
                      </Text>
                      <ChevronDown size={14} color={colors.iconMuted} />
                    </Pressable>
                  </View>
                )}

                {/* Section Header: VIDEOS IN PLAYLIST + Select All */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8, paddingHorizontal: 4 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: colors.brandRed, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      VIDEOS IN PLAYLIST
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      Select the videos you want to include.
                    </Text>
                  </View>

                  <Pressable
                    onPress={toggleSelectAll}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6 }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6,
                        backgroundColor: isAllSelected ? colors.brandRed : colors.inputBg,
                        borderWidth: isAllSelected ? 0 : 1,
                        borderColor: colors.inputBorder,
                      }}
                    >
                      {isAllSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Select All</Text>
                  </Pressable>
                </View>
              </View>
            }
          />

          {/* Bottom Floating Action Button */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Pressable
              onPress={handleStartMerge}
              disabled={selectedClips.length === 0}
              style={{
                width: '100%',
                paddingVertical: 15,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectedClips.length > 0 ? colors.brandRed : colors.inputBorder,
                opacity: selectedClips.length > 0 ? 1 : 0.6,
              }}
            >
              <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Play size={16} fill="#FFFFFF" color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 }}>
                Merge Selected ({selectedClips.length} Videos)
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
