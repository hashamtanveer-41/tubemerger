/**
 * Hook managing license verification, quota telemetry, and activation.
 */

import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { LicenseInfo, UsageMetrics } from '@/types';

const DEFAULT_LICENSE: LicenseInfo = {
  status: 'unlicensed',
  plan_tier: 'FREE',
  license_key: null,
  expires_at: null,
  hardware_id: '',
  max_devices: 1,
  active_devices: 1,
};

const DEFAULT_USAGE: UsageMetrics = {
  requests_today: 0,
  daily_quota: 3,
  total_lifetime_merges: 0,
  total_minutes_processed: 0,
  quota_reset_in_hours: 24,
};

export function useLicense() {
  const [license, setLicense] = useState<LicenseInfo>(DEFAULT_LICENSE);
  const [usage, setUsage] = useState<UsageMetrics>(DEFAULT_USAGE);

  const recordRequest = useCallback(() => {
    setUsage((prev) => ({
      ...prev,
      requests_today: prev.requests_today + 1,
    }));
  }, []);

  const refreshUsage = useCallback(() => {
    api.getAccountUsage().then(setUsage).catch(() => {});
  }, []);

  const refreshLicense = useCallback(() => {
    api.getLicenseStatus().then(setLicense).catch(() => {});
  }, []);

  const activateLicense = useCallback(async (key: string): Promise<boolean> => {
    try {
      const updated = await api.activateLicense(key);
      setLicense(updated);
      const updatedUsage = await api.getAccountUsage();
      setUsage(updatedUsage);
      return true;
    } catch {
      return false;
    }
  }, []);

  const deactivateLicense = useCallback(async (): Promise<boolean> => {
    try {
      const updated = await api.deactivateLicense();
      setLicense(updated);
      const updatedUsage = await api.getAccountUsage();
      setUsage(updatedUsage);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    license,
    setLicense,
    usage,
    setUsage,
    recordRequest,
    refreshUsage,
    refreshLicense,
    activateLicense,
    deactivateLicense,
    DEFAULT_LICENSE,
    DEFAULT_USAGE,
  };
}
