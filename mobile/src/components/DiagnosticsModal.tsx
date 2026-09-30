import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { X, Cpu, HardDrive, Smartphone, Film } from 'lucide-react-native';
import { diagnosticService, DiagnosticResult } from '../services/diagnostics';
import { Button } from './Button';
import { Card } from './Card';
import { useTheme } from '../theme';

interface DiagnosticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DiagnosticsModal({ visible, onClose }: DiagnosticsModalProps) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [diag, setDiag] = useState<DiagnosticResult | null>(null);
  const [modalRendered, setModalRendered] = useState<boolean>(visible);

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setModalRendered(false);
      closingRef.current = false;
      onClose();
    });
  }, [backdropAnim, opacityAnim, scaleAnim, onClose]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setModalRendered(true);
      setLoading(true);
      diagnosticService
        .runDiagnostics()
        .then((result) => setDiag(result))
        .catch(() => setDiag(null))
        .finally(() => setLoading(false));

      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 65, useNativeDriver: true }),
      ]).start();
    } else if (modalRendered && !closingRef.current) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!modalRendered) return null;

  return (
    <Modal visible={modalRendered} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { backgroundColor: colors.modalBackdrop, opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.modalBg,
              borderColor: colors.modalBorder,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
              Diagnostics
            </Text>
            <Pressable onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
              <X size={18} color={colors.iconMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.brandRed} size="small" />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 10 }}>
                Running engine checks...
              </Text>
            </View>
          ) : diag ? (
            <View style={{ marginBottom: 18 }}>
              {/* yt-dlp Status */}
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(255, 30, 30, 0.16)' : '#FEE2E2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Film size={17} color="#FF1E1E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    yt-dlp Core
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    v{diag.yt_dlp_version}
                  </Text>
                </View>
                <View style={{ backgroundColor: isDark ? 'rgba(48, 209, 88, 0.16)' : '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#30D158' : '#16A34A' }}>
                    Ready
                  </Text>
                </View>
              </Card>

              {/* FFmpeg Status */}
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#DBEAFE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Cpu size={17} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    FFmpeg NDK
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                    {diag.ffmpeg_version}
                  </Text>
                </View>
                <View style={{ backgroundColor: isDark ? 'rgba(48, 209, 88, 0.16)' : '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#30D158' : '#16A34A' }}>
                    Ready
                  </Text>
                </View>
              </Card>

              {/* Storage Space */}
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <HardDrive size={17} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    Storage
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {diag.free_storage_mb > 1024
                      ? `${(diag.free_storage_mb / 1024).toFixed(1)} GB Available`
                      : `${Math.round(diag.free_storage_mb)} MB Available`}
                  </Text>
                </View>
              </Card>

              {/* Device Spec */}
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.16)' : '#EDE9FE',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Smartphone size={17} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    {diag.device_model}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {diag.android_version}
                  </Text>
                </View>
              </Card>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
              Unable to read diagnostic parameters.
            </Text>
          )}

          <Button label="Close" onPress={handleClose} variant="primary" />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
});
