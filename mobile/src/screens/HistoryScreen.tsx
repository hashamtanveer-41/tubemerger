import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { History, Share2, Trash2 } from 'lucide-react-native';
import { Header, Button, Card, VideoThumbnail } from '../components';
import { historyStorageService, HistoryRecord } from '../services/storage';
import { notificationService } from '../services/notification';
import { useTheme } from '../theme';

const { TubeMergerModule } = NativeModules;

export function HistoryScreen({ navigation }: { navigation?: any }) {
  const { colors } = useTheme();
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const records = await historyStorageService.getHistory();
      const seen = new Set<string>();
      const deduped = records.filter((r) => {
        const key = r.filePath || r.fileName;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setHistoryItems(deduped);
    } catch {
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
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

  const handleDeleteItem = (item: HistoryRecord) => {
    notificationService.confirm({
      title: 'Delete from History',
      message: `Delete "${item.title}" from your merge history?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        await historyStorageService.deleteRecord(item.id);
        notificationService.toast('Deleted from history', 'info');
        loadHistory();
      },
    });
  };

  const handleClearHistory = () => {
    notificationService.confirm({
      title: 'Clear History',
      message: 'Are you sure you want to clear your merge history list?',
      confirmText: 'Delete All',
      isDestructive: true,
      onConfirm: async () => {
        await historyStorageService.clearHistory();
        setHistoryItems([]);
        notificationService.toast('History cleared', 'info');
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <Header
        title="Merge History"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          historyItems.length > 0 ? (
            <Pressable
              onPress={handleClearHistory}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: colors.inputBg,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
            >
              <Trash2 size={12} color="#EF4444" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', marginLeft: 4 }}>
                Clear
              </Text>
            </Pressable>
          ) : null
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ActivityIndicator color={colors.brandRed} size="large" />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 12 }}>
            Loading merge history...
          </Text>
        </View>
      ) : historyItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <History size={26} color={colors.iconMuted} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
            No Merges Yet
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 24, maxWidth: 260 }}>
            Completed merge files will appear here.
          </Text>
          <Button
            label="Start New Merge"
            onPress={() => navigation.navigate('Home')}
            variant="primary"
          />
        </View>
      ) : (
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
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
                  onPress={() => handleDeleteItem(item)}
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
