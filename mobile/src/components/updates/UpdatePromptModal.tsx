/**
 * TubeMerger Mobile - UpdatePromptModal
 * Displays modern AMOLED update dialogue:
 * - Forced Major Update: Non-dismissible, blocking modal enforcing update
 * - Minor/Patch Update: Dismissible modal shown once per version
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Download, AlertTriangle, Sparkles, X, ArrowUpRight } from 'lucide-react-native';
import { UpdateInfo } from '../../services/updates';
import { useTheme } from '../../theme';

interface UpdatePromptModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdatePromptModal({
  visible,
  updateInfo,
  onUpdate,
  onDismiss,
}: UpdatePromptModalProps) {
  const { colors, isDark } = useTheme();

  if (!updateInfo || !visible) return null;

  const isForce = updateInfo.isForceUpdate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForce) {
          onDismiss();
        }
      }}
    >
      <View style={styles.backdrop}>
        {!isForce && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityLabel="Close update dialog"
          />
        )}

        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: isForce ? '#FF1E1E' : colors.border,
            },
          ]}
        >
          {/* Header Badge */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isForce
                    ? isDark
                      ? 'rgba(255, 30, 30, 0.18)'
                      : '#FEE2E2'
                    : isDark
                    ? 'rgba(59, 130, 246, 0.18)'
                    : '#EFF6FF',
                  borderColor: isForce ? '#EF4444' : '#3B82F6',
                },
              ]}
            >
              {isForce ? (
                <AlertTriangle size={14} color="#EF4444" strokeWidth={2.4} />
              ) : (
                <Sparkles size={14} color="#3B82F6" strokeWidth={2.4} />
              )}
              <Text
                style={[
                  styles.badgeText,
                  { color: isForce ? '#EF4444' : '#3B82F6' },
                ]}
              >
                {isForce ? 'MANDATORY MAJOR UPDATE' : 'NEW VERSION AVAILABLE'}
              </Text>
            </View>

            {!isForce && (
              <Pressable
                onPress={onDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isForce ? 'Major Update Required' : 'Update Available'}
          </Text>

          {/* Version Comparison Subtitle */}
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>
              v{updateInfo.currentVersion}
            </Text>
            <Text style={[styles.versionArrow, { color: colors.textMuted }]}>
              {' → '}
            </Text>
            <View style={[styles.newVersionPill, { backgroundColor: isDark ? '#1C1C24' : '#E5E7EB' }]}>
              <Text style={[styles.newVersionText, { color: colors.brandRed }]}>
                v{updateInfo.latestVersion}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {isForce
              ? 'This major update includes critical YouTube decryption and pipeline fixes required for merging to continue working. You must install this update to proceed.'
              : 'A new version of TubeMerger is ready with engine performance improvements and bug fixes.'}
          </Text>

          {/* Release Notes Preview */}
          {updateInfo.releaseNotes ? (
            <View style={[styles.notesContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Text style={[styles.notesHeader, { color: colors.textSecondary }]}>
                What&apos;s New:
              </Text>
              <ScrollView style={styles.notesScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                <Text style={[styles.notesText, { color: colors.text }]}>
                  {updateInfo.releaseNotes.trim()}
                </Text>
              </ScrollView>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {!isForce && (
              <Pressable
                onPress={onDismiss}
                style={[
                  styles.dismissBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
                <Text style={[styles.dismissBtnText, { color: colors.textSecondary }]}>
                  Later
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onUpdate}
              style={[
                styles.updateBtn,
                {
                  backgroundColor: colors.brandRed,
                  flex: isForce ? 1 : 1.5,
                },
              ]}
            >
              <Download size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
              <Text style={styles.updateBtnText}>
                {isForce ? 'Update Now (Required)' : 'Download Update'}
              </Text>
              <ArrowUpRight size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  versionArrow: {
    fontSize: 12,
  },
  newVersionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newVersionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  notesContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  notesHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 110,
  },
  notesText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  updateBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
