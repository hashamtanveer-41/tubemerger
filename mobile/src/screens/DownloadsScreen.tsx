/**
 * TubeMerger Mobile - DownloadsScreen
 * Unified Downloads & History Tab:
 * - Shows active in-progress download card at top with live percent, ETA, speed, and sub-status
 * - Tapping in-progress card navigates to full Progress screen
 * - Shows completed download history below with playback, share, and delete actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Share,
  ActivityIndicator,
  StatusBar,
  Linking,
  NativeModules,
  Platform,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Download,
  Share2,
  Trash2,
  ChevronRight,
  Clock,
  Radio,
  ChevronLeft,
  Sparkles,
} from 'lucide-react-native';
import { Card, VideoThumbnail, Button } from '../components';
import { historyStorageService, HistoryRecord } from '../services/storage';
import { notificationService } from '../services/notification';
import { mergeService, ActiveMergeJob } from '../services/engine';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme';

const { TubeMergerModule } = NativeModules;

interface DownloadsScreenProps {
  navigation?: any;
  showBack?: boolean;
}

export function DownloadsScreen({ navigation: propNav, showBack }: DownloadsScreenProps) {
  let contextNav: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  } catch {
    // Handled when rendered outside of NavigationContainer
  }
  const navigation = propNav || contextNav;
  const { colors, isDark } = useTheme();

  const [items, setItems] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeJob, setActiveJob] = useState<ActiveMergeJob | null>(() => {
    return mergeService.getActiveJob ? mergeService.getActiveJob() : null;
  });

  // Subscribe to real-time active job updates
  useEffect(() => {
    if (mergeService.subscribeActiveJob) {
      const unsub = mergeService.subscribeActiveJob((job) => {
        setActiveJob(job);
        if (!job || job.progress?.status === 'done') {
          loadDownloads(true);
        }
      });
      return () => unsub();
    }
  }, [loadDownloads]);

  const loadDownloads = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const records = await historyStorageService.getHistory();
      const seen = new Set<string>();
      const deduped = records.filter((r) => {
        const key = r.filePath || r.fileName;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setItems(deduped);
    } catch {
      setItems([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
      if (mergeService.getActiveJob) {
        setActiveJob(mergeService.getActiveJob());
      }
    }, [loadDownloads])
  );

  const handlePlay = async (item: HistoryRecord) => {
    notificationService.toast('Launching video player...', 'info');
    if (Platform.OS === 'android' && TubeMergerModule?.playMedia) {
      try {
        await TubeMergerModule.playMedia(item.filePath);
        return;
      } catch {
        // continue to fallback
      }
    }
    const fileUrl = item.filePath.startsWith('file://') ? item.filePath : `file://${item.filePath}`;
    try {
      await Linking.openURL(fileUrl);
    } catch {
      try {
        await Share.share({
          title: item.title,
          message: `Play: ${item.fileName}`,
          url: fileUrl,
        });
      } catch (err: any) {
        notificationService.error('Cannot Play Video', err.message || 'No video player app found.');
      }
    }
  };

  const handleShare = async (item: HistoryRecord) => {
    if (Platform.OS === 'android' && TubeMergerModule?.shareMedia) {
      try {
        await TubeMergerModule.shareMedia(item.filePath, item.title);
        return;
      } catch {
        // fallback
      }
    }
    const fileUrl = item.filePath.startsWith('file://') ? item.filePath : `file://${item.filePath}`;
    try {
      await Share.share({
        title: item.title,
        message: `Sharing ${item.title}: ${item.fileName}`,
        url: fileUrl,
      });
    } catch (err: any) {
      notificationService.error('Share Error', err.message);
    }
  };

  const handleDelete = (item: HistoryRecord) => {
    notificationService.confirm({
      title: 'Delete Download',
      message: `Remove "${item.title}" from downloads?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        await historyStorageService.deleteRecord(item.id);
        notificationService.toast('Download deleted', 'info');
        loadDownloads();
      },
    });
  };

  const handleClearAll = () => {
    notificationService.confirm({
      title: 'Clear Download History',
      message: 'Are you sure you want to clear your download history?',
      confirmText: 'Delete All',
      isDestructive: true,
      onConfirm: async () => {
        await historyStorageService.clearHistory();
        setItems([]);
        notificationService.toast('Download history cleared', 'info');
      },
    });
  };

  const handleOpenActiveProgress = () => {
    if (!activeJob) return;
    navigation.navigate('Progress', {
      payload: activeJob.payload,
      playlistTitle: activeJob.playlistTitle || activeJob.payload.playlist_title || 'Active Download',
      totalClips: activeJob.totalClips || activeJob.progress.total_items || 1,
    });
  };

  // Clean speed and ETA text
  const cleanSpeed = useMemo(() => {
    if (!activeJob?.progress?.speed || activeJob.progress.speed.includes('[') || activeJob.progress.speed.includes(']')) {
      return 'Downloading...';
    }
    return activeJob.progress.speed.replace(/^at\s+/, '').trim();
  }, [activeJob?.progress?.speed]);

  const cleanEta = useMemo(() => {
    if (!activeJob?.progress?.eta || activeJob.progress.eta.includes('[') || activeJob.progress.eta.includes(']')) {
      return 'Estimating...';
    }
    const sanitized = activeJob.progress.eta.replace(/^ETA:\s*/, '').replace(/left$/, '').trim();
    return sanitized.endsWith('left') ? sanitized : `${sanitized} left`;
  }, [activeJob?.progress?.eta]);

  const percent = Math.min(100, Math.max(0, Math.round(activeJob?.progress?.overall_percent || 0)));

  const statusLabel =
    activeJob?.progress?.status === 'normalizing'
      ? 'NORMALIZING AUDIO'
      : activeJob?.progress?.status === 'stitching'
      ? 'MERGING STREAMS'
      : activeJob?.progress?.status === 'embedding_chapters'
      ? 'WRITING METADATA'
      : activeJob?.progress?.status === 'error'
      ? 'MERGE ERROR'
      : 'DOWNLOADING NOW';

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
          {showBack && (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 10, padding: 4 }}
            >
              <ChevronLeft size={22} color={colors.text} />
            </Pressable>
          )}
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.4 }}>
            Downloads
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {items.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
            >
              <Trash2 size={12} color="#EF4444" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', marginLeft: 4 }}>
                Clear All
              </Text>
            </Pressable>
          )}

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
              {items.length} {items.length === 1 ? 'file' : 'files'}
            </Text>
          </View>
        </View>
      </View>

      {loading && !activeJob ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ActivityIndicator color={colors.brandRed} size="large" />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 12 }}>
            Loading downloads...
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              {/* Active In-Progress Download Card */}
              {activeJob && activeJob.progress?.status !== 'done' && (
                <Pressable
                  testID="in-progress-download-card"
                  onPress={handleOpenActiveProgress}
                  style={({ pressed }) => [
                    styles.activeCard,
                    {
                      backgroundColor: isDark ? '#14141B' : '#FFFFFF',
                      borderColor: activeJob.progress.status === 'error' ? '#EF4444' : '#FF1E1E',
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                  accessibilityLabel="In progress download card. Tap to view full progress"
                >
                  {/* Top Status & Percentage Row */}
                  <View style={styles.activeHeaderRow}>
                    <View style={styles.liveBadge}>
                      <View style={styles.pulsingDot}>
                        <View style={styles.pulsingInnerDot} />
                      </View>
                      <Text style={styles.liveBadgeText}>{statusLabel}</Text>
                    </View>

                    <Text style={styles.percentText}>{percent}%</Text>
                  </View>

                  {/* Title */}
                  <Text
                    style={[styles.activeTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {activeJob.playlistTitle || activeJob.payload.playlist_title || 'Active Download'}
                  </Text>

                  {/* Sub-status Message */}
                  <Text
                    style={[styles.activeMessage, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {activeJob.progress.sub_status || activeJob.progress.message || 'Processing video streams...'}
                  </Text>

                  {/* Progress Bar */}
                  <View style={[styles.progressBarBg, { backgroundColor: colors.inputBg }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(3, percent))}%`,
                          backgroundColor: colors.brandRed,
                        },
                      ]}
                    />
                  </View>

                  {/* Mini Stats Row */}
                  <View style={styles.miniStatsRow}>
                    <View style={styles.miniStatItem}>
                      <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>
                        Clip {activeJob.progress.current_item || 1} of {activeJob.totalClips || activeJob.progress.total_items || 1}
                      </Text>
                    </View>

                    <View style={styles.miniStatItem}>
                      <Download size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.miniStatText, { color: colors.textSecondary }]}>
                        {cleanSpeed}
                      </Text>
                    </View>

                    <View style={styles.miniStatItem}>
                      <Clock size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.miniStatText, { color: colors.textSecondary }]}>
                        {cleanEta}
                      </Text>
                    </View>
                  </View>

                  {/* Tap for More Details Banner */}
                  <View
                    style={[
                      styles.detailsBanner,
                      {
                        backgroundColor: colors.inputBg,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.detailsBannerText, { color: colors.brandRed }]}>
                      Tap to view live clip queue & details
                    </Text>
                    <ChevronRight size={14} color={colors.brandRed} />
                  </View>
                </Pressable>
              )}

              {/* Section Header: Completed Downloads */}
              {items.length > 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginTop: activeJob ? 10 : 0,
                    marginBottom: 10,
                  }}
                >
                  Completed Downloads
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !activeJob ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Download size={26} color={colors.iconMuted} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
                  No Downloads Yet
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20, maxWidth: 260 }}>
                  Merged playlists and downloaded media will appear here for fast offline access.
                </Text>
                <Button
                  label="Start New Download"
                  onPress={() => {
                    try {
                      navigation.navigate('HomeTab');
                    } catch {
                      navigation.navigate('Home');
                    }
                  }}
                  variant="primary"
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 14 }}>
              {/* Video Thumbnail with Play Button in the Center */}
              <VideoThumbnail item={item} onPlay={() => handlePlay(item)} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {item.dateFormatted} • {item.clipCount} clip{item.clipCount > 1 ? 's' : ''} • {item.resolution || '1080p'}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginBottom: 12 }} numberOfLines={1}>
                {item.fileName}
              </Text>

              {/* Action Buttons: Share & Delete */}
              <View style={{ flexDirection: 'row' }}>
                <Pressable
                  onPress={() => handleShare(item)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Share2 size={13} color={colors.text} />
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text, marginLeft: 6 }}>
                    Share
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDelete(item)}
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={13} color="#EF4444" />
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#EF4444', marginLeft: 6 }}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  activeCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF1E1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 30, 30, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 30, 30, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  pulsingInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF1E1E',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF1E1E',
    letterSpacing: 0.5,
  },
  percentText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF1E1E',
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
  },
  activeMessage: {
    fontSize: 11.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    marginHorizontal: 16,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStatLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  miniStatText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  detailsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  detailsBannerText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
