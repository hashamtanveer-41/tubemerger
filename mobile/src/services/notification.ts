/**
 * TubeMerger Mobile - Custom Notification & Popup Service
 * Replaces default OS dialogs (Alert.alert) with custom AMOLED dark-red themed modals and toasts.
 */

type Listener = () => void;

export type PopupType = 'info' | 'error' | 'warning' | 'confirm' | 'success';

export interface PopupButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface PopupState {
  visible: boolean;
  title: string;
  message?: string;
  type: PopupType;
  buttons: PopupButton[];
}

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

class NotificationService {
  private popupState: PopupState = {
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  };

  private toastState: ToastState = {
    visible: false,
    message: '',
    type: 'info',
  };

  private listeners: Set<Listener> = new Set();
  private toastTimer: any = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getPopupState(): PopupState {
    return this.popupState;
  }

  getToastState(): ToastState {
    return this.toastState;
  }

  show(options: {
    title: string;
    message?: string;
    type?: PopupType;
    buttons?: PopupButton[];
  }) {
    this.popupState = {
      visible: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      buttons: options.buttons || [
        {
          text: 'Okay',
          style: 'default',
        },
      ],
    };
    this.notify();
  }

  alert(title: string, message?: string, onDismiss?: () => void) {
    this.show({
      title,
      message,
      type: 'info',
      buttons: [
        {
          text: 'Got it',
          style: 'default',
          onPress: onDismiss,
        },
      ],
    });
  }

  error(title: string, message?: string, onDismiss?: () => void) {
    this.show({
      title,
      message,
      type: 'error',
      buttons: [
        {
          text: 'Okay',
          style: 'destructive',
          onPress: onDismiss,
        },
      ],
    });
  }

  confirm(options: {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) {
    this.show({
      title: options.title,
      message: options.message,
      type: options.isDestructive ? 'warning' : 'confirm',
      buttons: [
        {
          text: options.cancelText || 'Cancel',
          style: 'cancel',
          onPress: options.onCancel,
        },
        {
          text: options.confirmText || 'Confirm',
          style: options.isDestructive ? 'destructive' : 'default',
          onPress: options.onConfirm,
        },
      ],
    });
  }

  hidePopup() {
    this.popupState = { ...this.popupState, visible: false };
    this.notify();
  }

  toast(message: string, type: ToastType = 'info', durationMs = 2800) {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastState = {
      visible: true,
      message,
      type,
    };
    this.notify();

    this.toastTimer = setTimeout(() => {
      this.toastState = { ...this.toastState, visible: false };
      this.notify();
    }, durationMs);
  }

  hideToast() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastState = { ...this.toastState, visible: false };
    this.notify();
  }
}

export const notificationService = new NotificationService();
