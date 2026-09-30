/**
 * TubeMerger Mobile - VideoThumbnail Component
 * Displays rich video thumbnail with center play button, format/quality badges,
 * and an offline-resilient cinematic vector backdrop.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, NativeModules, Platform } from 'react-native';
import { Play } from 'lucide-react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';
import { HistoryRecord } from '../services/storage';

const { TubeMergerModule } = NativeModules;

interface VideoThumbnailProps {
  item: HistoryRecord;
  onPlay: () => void;
}

function extractYouTubeId(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();

  // 1. Exact 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // 2. Basename without extension (e.g. aqz-KE-bpKQ.mp4 -> aqz-KE-bpKQ)
  const baseName = clean.split(/[/\\]/).pop() || '';
  const withoutExt = baseName.replace(/\.[^/.]+$/, '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(withoutExt)) {
    return withoutExt;
  }

  // 3. Normalized prefix (norm_aqz-KE-bpKQ.mp4 -> aqz-KE-bpKQ)
  const withoutNorm = withoutExt.replace(/^norm_/, '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(withoutNorm)) {
    return withoutNorm;
  }

  // 4. YouTube URL patterns
  const urlMatch = clean.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // 5. Delimited brackets / underscores / parentheses
  const bracketMatch = clean.match(/[\[\(_]([a-zA-Z0-9_-]{11})[\]\)_]/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }

  return null;
}

export function VideoThumbnail({ item, onPlay }: VideoThumbnailProps) {
  const isAudio = item.format === 'mp3';
  const [imageLoaded, setImageLoaded] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [nativeThumb, setNativeThumb] = useState<string | null>(null);

  // Compute prioritized candidate thumbnail URIs
  const candidates = useMemo(() => {
    const list: string[] = [];

    // 1. Check for YouTube ID (gives vibrant official cover)
    const ytId =
      extractYouTubeId(item.fileName || '') ||
      extractYouTubeId(item.title || '') ||
      extractYouTubeId(item.id || '') ||
      extractYouTubeId((item as any).url || '');

    if (ytId) {
      list.push(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`);
      list.push(`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`);
    }

    // 2. Check remote thumbnail from item.thumbnail or item.thumbnail_url
    if (item.thumbnail && typeof item.thumbnail === 'string') {
      const t = item.thumbnail.trim();
      if (t.startsWith('http://') || t.startsWith('https://')) {
        list.push(t);
      }
    }
    const rawThumb = (item as any)?.thumbnail_url;
    if (rawThumb && typeof rawThumb === 'string' && rawThumb.startsWith('http')) {
      list.push(rawThumb.trim());
    }

    // 3. Check local thumbnail file from item.thumbnail
    if (item.thumbnail && typeof item.thumbnail === 'string') {
      const t = item.thumbnail.trim();
      if (t.startsWith('file://')) {
        list.push(t);
      } else if (t.startsWith('/')) {
        list.push(`file://${t}`);
      }
    }

    // 4. Candidate local thumbnail path beside video file
    if (item.filePath && typeof item.filePath === 'string' && item.filePath.includes('.')) {
      const clean = item.filePath.startsWith('file://') ? item.filePath.replace('file://', '') : item.filePath;
      const candidate = clean.replace(/\.[^/.]+$/, '_thumb.jpg');
      list.push(`file://${candidate}`);
    }

    return Array.from(new Set(list));
  }, [item]);

  // Request native bridge to extract or generate frame in background
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'android' && TubeMergerModule?.getVideoThumbnail && item.filePath) {
      TubeMergerModule.getVideoThumbnail(item.filePath)
        .then((thumb: string | null) => {
          if (active && thumb) {
            setNativeThumb(thumb);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [item.filePath]);

  // Determine current active URI to render
  const currentUri =
    candidateIndex < candidates.length
      ? candidates[candidateIndex]
      : nativeThumb;

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    }
  };

  return (
    <Pressable
      onPress={onPlay}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.22)' }}
      style={{
        width: '100%',
        height: 168,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#0D0E15',
        marginBottom: 12,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 1. Underlying Cinematic Vector Backdrop (Always rendered, immune to offline/403) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 360 168">
          <Defs>
            <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#141522" />
              <Stop offset="50%" stopColor="#181A2A" />
              <Stop offset="100%" stopColor="#0F1018" />
            </LinearGradient>
            <RadialGradient id="centerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#E50914" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#E50914" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#E50914" stopOpacity="0" />
              <Stop offset="50%" stopColor="#E50914" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#E50914" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Background fill */}
          <Rect x="0" y="0" width="360" height="168" fill="url(#bgGrad)" />

          {/* Center ambient glow */}
          <Circle cx="180" cy="84" r="80" fill="url(#centerGlow)" />

          {/* Film strip perforations along top edge */}
          <G fill="#25283B" opacity="0.6">
            <Rect x="8" y="6" width="10" height="7" rx="1.5" />
            <Rect x="28" y="6" width="10" height="7" rx="1.5" />
            <Rect x="48" y="6" width="10" height="7" rx="1.5" />
            <Rect x="68" y="6" width="10" height="7" rx="1.5" />
            <Rect x="88" y="6" width="10" height="7" rx="1.5" />
            <Rect x="108" y="6" width="10" height="7" rx="1.5" />
            <Rect x="128" y="6" width="10" height="7" rx="1.5" />
            <Rect x="148" y="6" width="10" height="7" rx="1.5" />
            <Rect x="168" y="6" width="10" height="7" rx="1.5" />
            <Rect x="188" y="6" width="10" height="7" rx="1.5" />
            <Rect x="208" y="6" width="10" height="7" rx="1.5" />
            <Rect x="228" y="6" width="10" height="7" rx="1.5" />
            <Rect x="248" y="6" width="10" height="7" rx="1.5" />
            <Rect x="268" y="6" width="10" height="7" rx="1.5" />
            <Rect x="288" y="6" width="10" height="7" rx="1.5" />
            <Rect x="308" y="6" width="10" height="7" rx="1.5" />
            <Rect x="328" y="6" width="10" height="7" rx="1.5" />
            <Rect x="348" y="6" width="10" height="7" rx="1.5" />
          </G>

          {/* Decorative cinematic camera lines / soundwave */}
          {isAudio ? (
            // Audio soundwave equalizer bars
            <G fill="#E50914" opacity="0.18">
              <Rect x="110" y="70" width="3" height="28" rx="1.5" />
              <Rect x="120" y="60" width="3" height="48" rx="1.5" />
              <Rect x="130" y="75" width="3" height="18" rx="1.5" />
              <Rect x="140" y="55" width="3" height="58" rx="1.5" />
              <Rect x="217" y="55" width="3" height="58" rx="1.5" />
              <Rect x="227" y="75" width="3" height="18" rx="1.5" />
              <Rect x="237" y="60" width="3" height="48" rx="1.5" />
              <Rect x="247" y="70" width="3" height="28" rx="1.5" />
            </G>
          ) : (
            // Cinematic frame guide brackets
            <G stroke="#3F4462" strokeWidth="1.2" opacity="0.35" fill="none">
              <Path d="M 40 38 L 24 38 L 24 54" />
              <Path d="M 320 38 L 336 38 L 336 54" />
              <Path d="M 40 130 L 24 130 L 24 114" />
              <Path d="M 320 130 L 336 130 L 336 114" />
            </G>
          )}

          {/* Film strip perforations along bottom edge */}
          <G fill="#25283B" opacity="0.6">
            <Rect x="8" y="155" width="10" height="7" rx="1.5" />
            <Rect x="28" y="155" width="10" height="7" rx="1.5" />
            <Rect x="48" y="155" width="10" height="7" rx="1.5" />
            <Rect x="68" y="155" width="10" height="7" rx="1.5" />
            <Rect x="88" y="155" width="10" height="7" rx="1.5" />
            <Rect x="108" y="155" width="10" height="7" rx="1.5" />
            <Rect x="128" y="155" width="10" height="7" rx="1.5" />
            <Rect x="148" y="155" width="10" height="7" rx="1.5" />
            <Rect x="168" y="155" width="10" height="7" rx="1.5" />
            <Rect x="188" y="155" width="10" height="7" rx="1.5" />
            <Rect x="208" y="155" width="10" height="7" rx="1.5" />
            <Rect x="228" y="155" width="10" height="7" rx="1.5" />
            <Rect x="248" y="155" width="10" height="7" rx="1.5" />
            <Rect x="268" y="155" width="10" height="7" rx="1.5" />
            <Rect x="288" y="155" width="10" height="7" rx="1.5" />
            <Rect x="308" y="155" width="10" height="7" rx="1.5" />
            <Rect x="328" y="155" width="10" height="7" rx="1.5" />
            <Rect x="348" y="155" width="10" height="7" rx="1.5" />
          </G>

          {/* Subtle bottom separator line */}
          <Rect x="0" y="166" width="360" height="2" fill="url(#accentLine)" />
        </Svg>
      </View>

      {/* 2. Image layer (Overlays backdrop when available) */}
      {currentUri ? (
        <Image
          source={{ uri: currentUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
      ) : null}

      {/* 3. Subtle contrast overlay */}
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: imageLoaded ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Play Icon in the Middle of the Thumbnail */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: 'rgba(0, 0, 0, 0.76)',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.92)',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 6,
          }}
        >
          <Play size={22} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
        </View>
      </View>

      {/* Format Badge (Top Right) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          backgroundColor: 'rgba(10, 10, 15, 0.85)',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: 'rgba(229, 9, 20, 0.65)',
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
          {(item.format || 'mp4').toUpperCase()}
        </Text>
      </View>

      {/* Resolution / Type Badge (Bottom Right) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          backgroundColor: 'rgba(10, 10, 15, 0.85)',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          borderWidth: 0.5,
          borderColor: 'rgba(255, 255, 255, 0.3)',
        }}
      >
        <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#FFFFFF' }}>
          {isAudio ? 'AUDIO' : (item.resolution || '1080p')}
        </Text>
      </View>

      {/* Title Watermark (Bottom Left) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          maxWidth: '55%',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#D4D4D8' }} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
    </Pressable>
  );
}
