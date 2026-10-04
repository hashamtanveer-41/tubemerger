import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Share,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle2, Share2, RotateCcw, Download } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { Header, Button, Card, Badge } from '../components';
import { notificationService } from '../services/notification';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Success'>;

export function SuccessScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { outputFilePath, fileName, format, clipCount, playlistTitle } = route.params;

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'TubeMerger Video',
        message: `Merged playlist "${playlistTitle}" (${clipCount} clips) via TubeMerger Android! Output: ${fileName}`,
        url: `file://${outputFilePath}`,
      });
    } catch (err: any) {
      notificationService.error('Share Failed', err.message || 'Could not share output file.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <Header title="Merge Complete" />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
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
            <CheckCircle2 size={28} color={colors.brandRed} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            Successfully Merged
          </Text>
        </View>

        {/* Output File Card */}
        <Card style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Output File
            </Text>
            <Badge label={format.toUpperCase()} variant="brand" />
          </View>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 }} numberOfLines={2}>
            {fileName}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
            From playlist: {playlistTitle}
          </Text>

          <View
            style={{
              padding: 12,
              borderRadius: 14,
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Total Clips:</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                {clipCount} clip{clipCount > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Resolution:</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                1080p (CFR 30fps)
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Audio:</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                Stereo AAC 192k
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 10, color: colors.textMuted }} numberOfLines={2}>
            Location: {outputFilePath}
          </Text>
        </Card>

        {/* Action Buttons */}
        <View style={{ marginBottom: 24 }}>
          <Button
            label="Share Output File"
            onPress={handleShare}
            variant="primary"
            style={{ marginBottom: 10 }}
            icon={<Share2 size={16} color="#FFFFFF" />}
          />

          <Button
            label="Merge Another Playlist"
            onPress={() => navigation.navigate('Home')}
            variant="secondary"
            style={{ marginBottom: 10 }}
            icon={<RotateCcw size={16} color={colors.text} />}
          />

          <Button
            label="View Downloads"
            onPress={() => navigation.navigate('History')}
            variant="ghost"
            icon={<Download size={16} color={colors.textSecondary} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}
