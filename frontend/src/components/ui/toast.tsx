import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastData {
  id?: string;
  message: string;
  type?: 'error' | 'success' | 'info';
  title?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration ?? (toast.type === 'error' ? 7500 : 5000);
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const typeConfig = {
    error: {
      icon: AlertCircle,
      borderColor: 'border-red-900/80',
      iconColor: 'text-brand-red',
      bgGlow: 'shadow-red-950/20',
      title: 'Action Error',
    },
    success: {
      icon: CheckCircle2,
      borderColor: 'border-emerald-800/80',
      iconColor: 'text-emerald-400',
      bgGlow: 'shadow-emerald-950/20',
      title: 'Success',
    },
    info: {
      icon: Info,
      borderColor: 'border-stroke-hover',
      iconColor: 'text-content-secondary',
      bgGlow: 'shadow-black/40',
      title: 'Notice',
    },
  };

  const config = typeConfig[toast.type || 'error'];
  const Icon = config.icon;

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full select-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div
        className={cn(
          'rounded-2xl border bg-theme-panel/95 backdrop-blur-md p-4 shadow-2xl flex items-start gap-3.5',
          config.borderColor,
          config.bgGlow
        )}
      >
        <div className={cn('p-1 rounded-full bg-theme-base shrink-0 mt-0.5', config.iconColor)}>
          <Icon className="w-5 h-5 stroke-[2]" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-content-primary leading-none">
            {toast.title || config.title}
          </p>
          <p className="text-xs text-content-secondary mt-1 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-content-muted hover:text-content-primary transition-colors p-1 rounded-lg hover:bg-theme-elevated shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
