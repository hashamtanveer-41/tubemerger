/**
 * Hook managing authentication, user profile, and active workstation slots.
 */

import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { ActiveDevice, AuthResponse, UserProfile } from '@/types';

export function useAuth(showToast: (msg: string, type?: 'error' | 'success' | 'info') => void) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeDevices, setActiveDevices] = useState<ActiveDevice[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const onAuthSuccess = useCallback((authData: AuthResponse) => {
    setProfile(authData.user);
    setActiveDevices(authData.active_devices);
    showToast(`Welcome, ${authData.user.full_name || authData.user.name}!`, 'success');
  }, [showToast]);

  const handleLogout = useCallback(async () => {
    await api.logout();
    setProfile(null);
    setActiveDevices([]);
    showToast('Signed out of Supabase cloud.', 'info');
  }, [showToast]);

  const handleDeactivateDevice = useCallback(async (hwid: string) => {
    try {
      const updated = await api.deactivateDevice(hwid);
      setActiveDevices(updated.active_devices);
      showToast('Workstation slot deactivated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate workstation.', 'error');
    }
  }, [showToast]);

  return {
    profile,
    setProfile,
    activeDevices,
    setActiveDevices,
    isAuthModalOpen,
    setIsAuthModalOpen,
    onAuthSuccess,
    handleLogout,
    handleDeactivateDevice,
  };
}
