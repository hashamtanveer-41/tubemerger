/**
 * TubeMerger Mobile - ClipItem Component
 * Pixel-perfect match for Screenshot 4:
 * - Red square checkbox with white check
 * - Video thumbnail with HD overlay
 * - Video title (white) + duration/size/resolution subtitle
 * - Two-digit index badge ("01", "02"...) on the right
 */

import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Check } from 'lucide-react-native';
import { VideoClip } from '../shared/types';
import { useTheme } from '../theme';

interface ClipItemProps {
  clip: VideoClip;
  index: number;
  isSelected: boolean;
  onToggle: (index: number) => void;
}

export const ClipItem = React.memo(function ClipItemComponent({
  clip,
  index,
  isSelected,
  onToggle,
}: ClipItemProps) {
  const { colors } = useTheme();
  const indexStr = (index + 1).toString().padStart(2, '0');
  const duration = clip.duration_formatted || '0m 00s';
  const estMb = Math.round((clip.duration_seconds || 60) * 0.35);
  const sizeMb = estMb > 0 ? `${estMb}MB` : '45MB';
  const resolution = clip.resolution_label || '1080p';

  return (
    <Pressable
      onPress={() => onToggle(index)}
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* Red Checkbox */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: isSelected ? colors.brandRed : colors.inputBg,
          borderWidth: isSelected ? 0 : 1,
          borderColor: colors.inputBorder,
        }}
      >
        {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>

      {/* Video Thumbnail with HD Overlay */}
      <View
        style={{
          width: 64,
          height: 44,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: colors.inputBg,
          marginRight: 12,
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {clip.thumbnail || clip.thumbnail_url ? (
          <Image
            source={{ uri: clip.thumbnail || clip.thumbnail_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.iconMuted }}>#{indexStr}</Text>
          </View>
        )}
        {/* HD Badge Overlay */}
        <View style={{ position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 3, borderRadius: 3 }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 }}>HD</Text>
        </View>
      </View>

      {/* Middle Video Metadata */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
            color: isSelected ? colors.text : colors.textSecondary,
          }}
          numberOfLines={2}
        >
          {clip.title}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
          {duration} • {sizeMb} • {resolution}
        </Text>
      </View>

      {/* Right Index Badge ("01", "02") */}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.iconMuted, fontVariant: ['tabular-nums'] }}>
        {indexStr}
      </Text>
    </Pressable>
  );
});
