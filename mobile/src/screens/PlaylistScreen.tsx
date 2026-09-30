/**
 * TubeMerger Mobile - PlaylistScreen
 * Pixel-perfect match for Screenshot 4 + Interactive Quality Modal & Dynamic Size Calculation:
 * - Header: Back arrow + "Select Videos" + "{X} videos selected" + "Clear All" pill
 * - Playlist summary card with thumbnail, channel, dynamic duration, dynamic size, and count badge
 * - Segmented format pill tabs: [MP4 Video] (active red) | [MP3 Audio]
 * - Quality dropdown row: "Quality" ... "1080p Full HD (~350 MB) ⌵" -> Opens Quality Dropdown Modal
 * - Section header: "VIDEOS IN PLAYLIST" in red + "Select All" toggle
 * - Clip list with red checkboxes, HD badges, metadata, and "01", "02" index badges
 * - Bottom floating button: "Merge Selected ({X} Videos • {Size})"
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Image,
  StatusBar,
  Modal,
  StyleSheet,
  Animated,
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
  X,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { ClipItem } from '../components';
import { playlistService } from '../services/engine';
import { Playlist, VideoClip } from '../shared/types';
import { OutputFormat, VideoQuality } from '../components';
import { notificationService } from '../services/notification';
import { ErrorClassifier } from '../services/errors';
import { useTheme } from '../theme';
import { estimateVideoSizeBytes, formatBytes, formatDuration } from '../shared/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Playlist'>;

interface QualityOption {
  label: string;
  value: VideoQuality;
  desc: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  { label: '1080p Full HD', value: '1080p', desc: 'Crisp 1920x1080 resolution' },
  { label: '720p HD', value: '720p', desc: 'Standard 1280x720 resolution' },
  { label: '480p SD', value: '480p', desc: 'Faster download, compact size' },
  { label: '360p', value: '360p', desc: 'Minimal data usage' },
];

export function PlaylistScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
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
  const [qualityModalVisible, setQualityModalVisible] = useState<boolean>(false);

  // Animations for quality modal
  const modalScale = useRef(new Animated.Value(0.88)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalBackdrop = useRef(new Animated.Value(0)).current;

  const openQualityModal = () => {
    modalScale.setValue(0.88);
    modalOpacity.setValue(0);
    modalBackdrop.setValue(0);
    setQualityModalVisible(true);

    Animated.parallel([
      Animated.timing(modalBackdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(modalScale, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }),
    ]).start();
  };

  const closeQualityModal = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(modalBackdrop, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(modalScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setQualityModalVisible(false);
      if (onDone) onDone();
    });
  };

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

  // Dynamic duration calculation strictly for selected clips
  const selectedDurationSecs = useMemo(() => {
    return selectedClips.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  }, [selectedClips]);

  const selectedDurationStr = useMemo(() => {
    return formatDuration(selectedDurationSecs);
  }, [selectedDurationSecs]);

  // Dynamic size calculation responding to quality, format, and clip selection
  const estimatedSizeBytes = useMemo(() => {
    const qualityOrFormat = selectedFormat === 'mp3' ? 'mp3' : selectedQuality;
    return estimateVideoSizeBytes(selectedDurationSecs, qualityOrFormat);
  }, [selectedDurationSecs, selectedFormat, selectedQuality]);

  const estimatedSizeFormatted = useMemo(() => {
    return formatBytes(estimatedSizeBytes);
  }, [estimatedSizeBytes]);

  const qualityLabel = useMemo(() => {
    switch (selectedQuality) {
      case '1080p':
        return '1080p Full HD';
      case '720p':
        return '720p HD';
      case '480p':
        return '480p SD';
      case '360p':
        return '360p';
      default:
        return '1080p Full HD';
    }
  }, [selectedQuality]);

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
        estimated_size_mb: Math.round(estimatedSizeBytes / (1024 * 1024)),
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
              <View style={{ marginBottom: 12 }}>
                {/* Playlist Summary Card */}
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 20,
                    padding: 14,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {/* Thumbnail with overlay */}
                  <View
                    style={{
                      width: 68,
                      height: 50,
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
                      {selectedClips.length} of {playlist.video_count} videos • {selectedDurationStr}
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
                        {selectedClips.length} selected • ~{estimatedSizeFormatted}
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

                {/* Quality Row (if MP4) -> Opens Quality Picker Dropdown */}
                {selectedFormat === 'mp4' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 }}>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Video Quality
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                        Estimated size: {estimatedSizeFormatted}
                      </Text>
                    </View>
                    <Pressable
                      onPress={openQualityModal}
                      style={({ pressed }) => ({
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginRight: 6 }}>
                        {qualityLabel}
                      </Text>
                      <ChevronDown size={14} color={colors.brandRed} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 }}>
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                        Audio Fidelity
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                        Estimated size: {estimatedSizeFormatted}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                        320 kbps Extreme MP3
                      </Text>
                    </View>
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
                Merge Selected ({selectedClips.length} Videos • {estimatedSizeFormatted})
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Quality Picker Modal */}
      <Modal
        visible={qualityModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeQualityModal()}
      >
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
              opacity: modalBackdrop,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.pickerCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.pickerHeader, { borderBottomColor: colors.divider }]}>
              <View>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose Video Quality</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Selected clips: {selectedDurationStr}
                </Text>
              </View>
              <Pressable
                onPress={() => closeQualityModal()}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Quality Options */}
            <View>
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = selectedQuality === opt.value;
                const estBytes = estimateVideoSizeBytes(selectedDurationSecs, opt.value);
                const estFormatted = formatBytes(estBytes);

                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setSelectedQuality(opt.value);
                      closeQualityModal();
                      notificationService.toast(`Video Quality set to ${opt.value}`, 'success');
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      marginBottom: 6,
                      backgroundColor: isSelected ? colors.cardSelectedBg : pressed ? colors.inputBg : 'transparent',
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: colors.cardSelectedBorder,
                    })}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: isSelected ? colors.brandRed : colors.text,
                          }}
                        >
                          {opt.label}
                        </Text>
                        <View
                          style={{
                            marginLeft: 8,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                            backgroundColor: colors.inputBg,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
                            ~{estFormatted}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                        {opt.desc}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: colors.brandRed,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
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
    maxWidth: 360,
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
