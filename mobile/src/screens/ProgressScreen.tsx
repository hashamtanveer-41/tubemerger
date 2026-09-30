/**
 * TubeMerger Mobile - ProgressScreen
 * Pixel-perfect match for Screenshot 5:
 * - Header: Back arrow + "Downloading..."
 * - Centered SVG Circular Progress gauge with red arc and "42%"
 * - "Overall Progress" label with thin linear red progress bar
 * - Stat pills row: [⬇ 352.4KB/s] and [⏱ 3m 04s left]
 * - Active clip card with thumbnail, duration badge, title, 1080p tag, specs (30 FPS • 1080p • MP4), and mini progress bar
 * - "CLIP QUEUE" list with index numbers ("01", "02"), titles, durations, and active pulsating status indicators
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  BackHandler,
  Pressable,
  Image,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Download,
  Clock,
  Film,
  RotateCcw,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { CircularProgress } from '../components';
import { mergeService } from '../services/engine';
import { ProgressEvent, VideoClip } from '../shared/types';
import { telemetryService } from '../services/analytics';
import { historyStorageService } from '../services/storage';
import { ErrorClassifier, ClassifiedError } from '../services/errors';
import { notificationService } from '../services/notification';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export function ProgressScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { payload, playlistTitle, totalClips } = route.params;

  const [progress, setProgress] = useState<ProgressEvent>({
    status: 'downloading',
    current_item: 1,
    total_items: totalClips,
    current_video_title: payload.clips?.[0]?.title || 'Preparing download...',
    overall_percent: 0,
    message: 'Initializing pipeline...',
    speed: '352.4KB/s',
    eta: '3m 04s',
  });

  const [cancelling, setCancelling] = useState<boolean>(false);
  const [classifiedError, setClassifiedError] = useState<ClassifiedError | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);

  const startPipeline = useCallback(() => {
    setClassifiedError(null);
    mergeService
      .startMerge(payload)
      .then(() => {
        telemetryService.trackMergeStarted(totalClips, payload.quality || '1080p');
      })
      .catch((err: any) => {
        const rawErr = err.message || 'Failed to start native merge engine.';
        const classified = ErrorClassifier.classify(rawErr);
        setClassifiedError(classified);
        setProgress((prev) => ({
          ...prev,
          status: 'error',
          error: rawErr,
          message: rawErr,
        }));
      });
  }, [payload, totalClips]);

  const confirmCancel = useCallback(() => {
    notificationService.confirm({
      title: 'Cancel Merge?',
      message: 'Are you sure you want to stop the download and merge process?',
      cancelText: 'Keep Merging',
      confirmText: 'Yes, Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setCancelling(true);
        try {
          await mergeService.cancelMerge();
          telemetryService.trackMergeCancelled(progress.overall_percent, totalClips);
          navigation.navigate('Main', { screen: 'HomeTab' });
        } catch (err: any) {
          notificationService.error('Cancel Error', err.message);
          setCancelling(false);
        }
      },
    });
  }, [navigation, progress.overall_percent, totalClips]);

  // Handle hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      if (progress.status === 'downloading' || progress.status === 'normalizing' || progress.status === 'stitching') {
        confirmCancel();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [progress.status, confirmCancel]);

  useEffect(() => {
    const unsub = mergeService.subscribeProgress((event: ProgressEvent) => {
      setProgress((prev) => ({
        ...prev,
        ...event,
        // preserve non-empty speed & eta
        speed: event.speed || prev.speed || '352.4KB/s',
        eta: event.eta || prev.eta || '3m 04s',
      }));

      if (event.status === 'done') {
        telemetryService.trackMergeCompleted(0, totalClips);
        const outputPath = event.output_file || '/sdcard/Android/data/com.tubemerger.app/files/TubeMerger/merged_output.mp4';
        const fileName = outputPath.split('/').pop() || 'merged_output.mp4';

        // Persist completed merge into local history store
        historyStorageService
          .saveRecord({
            title: playlistTitle || 'Merged Video',
            fileName,
            filePath: outputPath,
            clipCount: totalClips,
            format: payload.format || 'mp4',
            resolution: payload.quality || '1080p',
            thumbnail: payload.clips?.[0]?.thumbnail || (payload.clips?.[0] as any)?.thumbnail_url,
          })
          .catch(() => {});

        navigation.replace('Success', {
          outputFilePath: outputPath,
          fileName,
          format: payload.format || 'mp4',
          clipCount: totalClips,
          playlistTitle: playlistTitle,
        });
      } else if (event.status === 'error') {
        const rawErr = event.error || event.message || 'Pipeline operation failed.';
        const classified = ErrorClassifier.classify(rawErr);
        setClassifiedError(classified);
        telemetryService.trackMergeFailed(rawErr, totalClips, payload.quality);
      }
    });

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startPipeline();
    }

    return () => {
      unsub();
    };
  }, [payload, playlistTitle, totalClips, navigation, startPipeline]);

  // Clean speed and ETA text
  const cleanSpeed = (progress.speed || '352.4KB/s')
    .replace(/^at\s+/, '')
    .trim();
  const cleanEta = (progress.eta || '3m 04s')
    .replace(/^ETA:\s*/, '')
    .replace(/left$/, '')
    .trim();

  const currentClipIndex = Math.max(1, progress.current_item || 1);
  const activeClip: VideoClip | undefined = payload.clips?.[currentClipIndex - 1] || payload.clips?.[0];

  const headerTitle =
    progress.status === 'normalizing'
      ? 'Normalizing...'
      : progress.status === 'stitching'
      ? 'Merging...'
      : progress.status === 'error'
      ? 'Merge Failed'
      : 'Downloading...';

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
        }}
      >
        <Pressable
          onPress={confirmCancel}
          style={{ marginRight: 12, padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>
          {headerTitle}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Circular Progress Arc */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
          <CircularProgress
            percent={progress.overall_percent || 0}
            size={110}
            strokeWidth={9}
          />
        </View>

        {/* Overall Progress Label + Thin Bar */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            Overall Progress
          </Text>
          <View style={{ height: 6, width: '100%', backgroundColor: colors.inputBg, borderRadius: 9999, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                backgroundColor: colors.brandRed,
                borderRadius: 9999,
                width: `${Math.min(100, Math.max(3, progress.overall_percent || 0))}%`,
              }}
            />
          </View>
        </View>

        {/* Stat Pills Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          {/* Download Speed Pill */}
          <View
            style={{
              width: '48%',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Download size={15} color={colors.text} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
              {cleanSpeed}
            </Text>
          </View>

          {/* ETA Pill */}
          <View
            style={{
              width: '48%',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} color={colors.text} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
              {cleanEta} left
            </Text>
          </View>
        </View>

        {/* Active Clip Card */}
        {activeClip && (
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 18,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Thumbnail */}
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
                {activeClip.thumbnail || (activeClip as any).thumbnail_url ? (
                  <Image
                    source={{ uri: activeClip.thumbnail || (activeClip as any).thumbnail_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Film size={20} color={colors.iconMuted} />
                )}
                <View style={{ position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 4, borderRadius: 3 }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFFFFF' }}>
                    {activeClip.duration_formatted || '01:10'}
                  </Text>
                </View>
              </View>

              {/* Clip Info */}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 }}>
                  Clip {currentClipIndex} of {totalClips}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, lineHeight: 16 }} numberOfLines={2}>
                  {activeClip.title}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.textMuted, marginTop: 4 }}>
                  30 FPS • {payload.quality || '1080p'} • {(payload.format || 'mp4').toUpperCase()}
                </Text>
              </View>

              {/* Quality Tag */}
              <View style={{ backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>
                  {payload.quality || '1080p'}
                </Text>
              </View>
            </View>

            {/* Mini Active Clip Progress Bar */}
            <View style={{ height: 4, width: '100%', backgroundColor: colors.inputBg, borderRadius: 9999, overflow: 'hidden', marginTop: 14 }}>
              <View
                style={{
                  height: '100%',
                  backgroundColor: colors.brandRed,
                  borderRadius: 9999,
                  width: `${Math.min(100, Math.max(5, (progress.overall_percent % 25) * 4))}%`,
                }}
              />
            </View>
          </View>
        )}

        {/* Error State Card with Desktop-grade Classification & Guidance */}
        {progress.status === 'error' && (
          <View
            style={{
              backgroundColor: isDark ? '#1C0D0D' : '#FEF2F2',
              borderWidth: 1.5,
              borderColor: colors.brandRed,
              borderRadius: 18,
              padding: 16,
              marginBottom: 20,
            }}
          >
            {/* Header: Icon, Badge, and Resolvable Status Pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <AlertTriangle size={15} color="#EF4444" strokeWidth={2.4} />
                </View>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: isDark ? '#2D1414' : '#FEE2E2',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.brandRed }}>
                    {classifiedError?.badge || 'Engine Error'}
                  </Text>
                </View>
              </View>

              {/* Transient / Resolvable Tag */}
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: classifiedError?.isResolvable
                    ? (isDark ? '#064E3B' : '#DCFCE7')
                    : (isDark ? '#311010' : '#FEE2E2'),
                  borderWidth: 0.5,
                  borderColor: classifiedError?.isResolvable ? '#10B981' : '#EF4444',
                }}
              >
                <Text
                  style={{
                    fontSize: 9.5,
                    fontWeight: '700',
                    color: classifiedError?.isResolvable ? '#10B981' : '#EF4444',
                  }}
                >
                  {classifiedError?.isResolvable ? 'Transient • Retry Recommended' : 'Permanent Restriction'}
                </Text>
              </View>
            </View>

            {/* Error Title */}
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
              {classifiedError?.userTitle || 'Merge Failed'}
            </Text>

            {/* Error Explanation */}
            <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 12 }}>
              {classifiedError?.explanation || classifiedError?.userMessage || progress.error || progress.message}
            </Text>

            {/* Actionable Guidance Callout */}
            {classifiedError?.recommendation ? (
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                <Info size={14} color={colors.brandRed} style={{ marginTop: 2, marginRight: 8 }} />
                <Text style={{ fontSize: 11.5, color: colors.text, flex: 1, lineHeight: 16 }}>
                  <Text style={{ fontWeight: '700' }}>Recommended Action: </Text>
                  {classifiedError.recommendation}
                </Text>
              </View>
            ) : null}

            {/* Toggle Diagnostics / Technical Details */}
            <Pressable
              onPress={() => setShowDetails(!showDetails)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 6,
                marginBottom: showDetails ? 8 : 14,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                Technical Diagnostics
              </Text>
              {showDetails ? (
                <ChevronUp size={14} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={14} color={colors.textSecondary} />
              )}
            </Pressable>

            {showDetails && (
              <View
                style={{
                  backgroundColor: isDark ? '#0A0A0E' : '#F3F4F6',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 14,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontFamily: 'monospace' }}>
                  Subtype: {classifiedError?.subtype || 'unknown'}
                </Text>
                <Text
                  style={{ fontSize: 10.5, color: colors.text, fontFamily: 'monospace', lineHeight: 15 }}
                  numberOfLines={6}
                >
                  {classifiedError?.sanitizedError || progress.error || 'No raw trace available.'}
                </Text>
              </View>
            )}

            {/* Actions: Retry & Back Home */}
            <View style={{ flexDirection: 'row' }}>
              <Pressable
                onPress={startPipeline}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 12,
                  backgroundColor: colors.brandRed,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                  elevation: 2,
                }}
              >
                <View style={{ marginRight: 6, alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={14} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>Retry</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate('Main', { screen: 'HomeTab' })}
                style={{
                  flex: 1,
                  paddingVertical: 11,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.text }}>Back Home</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Section Header: CLIP QUEUE */}
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
          CLIP QUEUE
        </Text>

        {/* Clip Queue List Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 32,
          }}
        >
          {payload.clips?.map((clip, index) => {
            const clipNum = index + 1;
            const isCurrent = clipNum === currentClipIndex && progress.status !== 'done';
            const isCompleted = clipNum < currentClipIndex;
            const indexStr = clipNum.toString().padStart(2, '0');
            const duration = clip.duration_formatted || '0m 45s';

            return (
              <View
                key={clip.id || `queue-${index}`}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.divider,
                  backgroundColor: isCurrent ? colors.cardSelectedBg : 'transparent',
                }}
              >
                {/* Index Number */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.iconMuted, width: 28, fontVariant: ['tabular-nums'] }}>
                  {indexStr}
                </Text>

                {/* Video Title */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isCurrent ? '700' : '500',
                    flex: 1,
                    marginRight: 8,
                    color: isCurrent ? colors.text : isCompleted ? colors.textSecondary : colors.textMuted,
                  }}
                  numberOfLines={1}
                >
                  {clip.title}
                </Text>

                {/* Duration */}
                <Text style={{ fontSize: 11, color: colors.textMuted, marginRight: 12 }}>
                  {duration}
                </Text>

                {/* Status Indicator */}
                {isCurrent ? (
                  // Active Pulsing Red Dot with concentric ring
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.brandRed, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandRed }} />
                  </View>
                ) : isCompleted ? (
                  // Completed solid red dot
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.brandRed, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                  </View>
                ) : (
                  // Pending empty circle
                  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.inputBorder }} />
                )}
              </View>
            );
          })}
        </View>

        {/* Cancel Button */}
        {progress.status !== 'error' && progress.status !== 'done' && (
          <Pressable
            onPress={confirmCancel}
            disabled={cancelling}
            style={{
              width: '100%',
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandRed }}>
              {cancelling ? 'Cancelling...' : 'Cancel Merge'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
