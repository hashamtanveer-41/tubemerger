/**
 * TubeMerger Mobile - NotificationModal & Toast Component
 * Ultra-premium, theme-aware popup modals and sliding top toasts with butter-smooth animations.
 * Replaces all built-in default OS dialogs (Alert.alert) across the app.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';
import {
  notificationService,
  PopupState,
  ToastState,
} from '../services/notification';
import { useTheme } from '../theme';

export function NotificationModal() {
  const { colors, isDark } = useTheme();
  const [popup, setPopup] = useState<PopupState>(notificationService.getPopupState());
  const [toast, setToast] = useState<ToastState>(notificationService.getToastState());
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const modalVisibleRef = useRef<boolean>(false);
  const toastVisibleRef = useRef<boolean>(false);

  // Animations for popup
  const popupScale = useRef(new Animated.Value(0.88)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animations for toast
  const toastTranslateY = useRef(new Animated.Value(-60)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const closePopupWithAnimation = useCallback((onFinished?: () => void) => {
    modalVisibleRef.current = false;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(popupOpacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(popupScale, {
        toValue: 0.9,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      notificationService.hidePopup();
      if (onFinished) onFinished();
    });
  }, [backdropOpacity, popupOpacity, popupScale]);

  useEffect(() => {
    const unsub = notificationService.subscribe(() => {
      const nextPopup = notificationService.getPopupState();
      const nextToast = notificationService.getToastState();

      if (nextPopup.visible && !modalVisibleRef.current) {
        modalVisibleRef.current = true;
        setPopup(nextPopup);
        setModalVisible(true);
        popupScale.setValue(0.88);
        popupOpacity.setValue(0);
        backdropOpacity.setValue(0);

        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(popupOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(popupScale, {
            toValue: 1,
            friction: 7,
            tension: 65,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (!nextPopup.visible && modalVisibleRef.current) {
        closePopupWithAnimation();
      } else if (nextPopup.visible) {
        setPopup(nextPopup);
      }

      if (nextToast.visible && !toastVisibleRef.current) {
        toastVisibleRef.current = true;
        setToast(nextToast);
        toastTranslateY.setValue(-50);
        toastOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(toastTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (!nextToast.visible && toastVisibleRef.current) {
        toastVisibleRef.current = false;
        Animated.parallel([
          Animated.timing(toastTranslateY, {
            toValue: -50,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setToast(nextToast);
        });
      } else {
        setToast(nextToast);
      }
    });

    return unsub;
  }, [backdropOpacity, closePopupWithAnimation, popupOpacity, popupScale, toastOpacity, toastTranslateY]);

  const getPopupIconConfig = () => {
    if (isDark) {
      switch (popup.type) {
        case 'error':
          return {
            icon: <AlertCircle size={28} color="#FF1E1E" strokeWidth={2.3} />,
            bgColor: 'rgba(255, 30, 30, 0.16)',
            borderColor: 'rgba(255, 30, 30, 0.45)',
          };
        case 'warning':
        case 'confirm':
          return {
            icon: <AlertTriangle size={28} color="#FF1E1E" strokeWidth={2.3} />,
            bgColor: 'rgba(255, 30, 30, 0.16)',
            borderColor: 'rgba(255, 30, 30, 0.45)',
          };
        case 'success':
          return {
            icon: <CheckCircle2 size={28} color="#30D158" strokeWidth={2.3} />,
            bgColor: 'rgba(48, 209, 88, 0.16)',
            borderColor: 'rgba(48, 209, 88, 0.45)',
          };
        default:
          return {
            icon: <Info size={28} color="#FF1E1E" strokeWidth={2.3} />,
            bgColor: 'rgba(255, 30, 30, 0.16)',
            borderColor: 'rgba(255, 30, 30, 0.45)',
          };
      }
    } else {
      // Light Mode: Clean, vibrant pastel backgrounds with matching borders and colored icons
      switch (popup.type) {
        case 'error':
          return {
            icon: <AlertCircle size={28} color="#DC2626" strokeWidth={2.3} />,
            bgColor: '#FEE2E2',
            borderColor: '#FECACA',
          };
        case 'warning':
        case 'confirm':
          return {
            icon: <AlertTriangle size={28} color="#DC2626" strokeWidth={2.3} />,
            bgColor: '#FEE2E2',
            borderColor: '#FECACA',
          };
        case 'success':
          return {
            icon: <CheckCircle2 size={28} color="#16A34A" strokeWidth={2.3} />,
            bgColor: '#DCFCE7',
            borderColor: '#BBF7D0',
          };
        default:
          return {
            icon: <Info size={28} color="#DC2626" strokeWidth={2.3} />,
            bgColor: '#FEE2E2',
            borderColor: '#FECACA',
          };
      }
    }
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle size={18} color="#FF1E1E" style={{ marginRight: 8 }} />;
      case 'success':
        return <CheckCircle2 size={18} color="#30D158" style={{ marginRight: 8 }} />;
      case 'warning':
        return <AlertTriangle size={18} color="#FF1E1E" style={{ marginRight: 8 }} />;
      default:
        return <Info size={18} color={isDark ? '#FF453A' : '#FF1E1E'} style={{ marginRight: 8 }} />;
    }
  };

  const iconConfig = getPopupIconConfig();

  return (
    <>
      {/* 1. Modal Popup Dialog with smooth entrance and graceful exit */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closePopupWithAnimation()}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.modalBackdrop,
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => closePopupWithAnimation()}
          />

          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.modalBg,
                borderColor: colors.modalBorder,
                opacity: popupOpacity,
                transform: [{ scale: popupScale }],
              },
            ]}
          >
            {/* Top Glowing Squircle Icon */}
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: iconConfig.bgColor,
                  borderColor: iconConfig.borderColor,
                },
              ]}
            >
              {iconConfig.icon}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>{popup.title}</Text>

            {/* Message Body */}
            {popup.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{popup.message}</Text>
            ) : null}

            {/* Action Buttons Row */}
            <View style={styles.buttonRow}>
              {popup.buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';

                return (
                  <Pressable
                    key={`btn-${index}`}
                    onPress={() => {
                      closePopupWithAnimation(btn.onPress);
                    }}
                    style={{
                      flex: popup.buttons.length > 1 ? 1 : undefined,
                      width: popup.buttons.length === 1 ? '100%' : undefined,
                      marginLeft: index > 0 ? 10 : 0,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCancel
                        ? colors.inputBg
                        : '#DC2626',
                      borderWidth: isCancel ? 1 : 0,
                      borderColor: isCancel ? colors.inputBorder : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: '700',
                        color: isCancel ? colors.text : '#FFFFFF',
                      }}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* 2. Top Floating Toast Banner */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.toastPill,
              {
                backgroundColor: colors.toastBg,
                borderColor: colors.toastBorder,
              },
            ]}
          >
            {getToastIcon()}
            <Text style={[styles.toastText, { color: colors.text }]} numberOfLines={2}>
              {toast.message}
            </Text>
            <Pressable
              onPress={() => notificationService.hideToast()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.toastCloseBtn}
            >
              <X size={15} color={colors.iconMuted} />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1.5,
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  toastPill: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '92%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  toastCloseBtn: {
    marginLeft: 10,
    padding: 3,
  },
});
