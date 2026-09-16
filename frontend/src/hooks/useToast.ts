/**
 * Hook managing toast notifications.
 */

import { useState } from 'react';
import { ToastData } from '@/components/ui/toast';

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error', title?: string) => {
    setToast({ message, type, title });
  };

  const dismissToast = () => {
    setToast(null);
  };

  return {
    toast,
    setToast,
    showToast,
    dismissToast,
  };
}
