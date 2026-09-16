/**
 * Profile Usage Tab displaying daily quota metrics and reset intervals.
 */

import React from 'react';
import { UsageMetrics } from '@/types';

interface ProfileUsageTabProps {
  usage: UsageMetrics;
  quotaPercent: number;
}

export function ProfileUsageTab({ usage, quotaPercent }: ProfileUsageTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="rounded-2xl border border-[#282828] bg-[#181818] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {usage.quota_period === 'week' ? 'Weekly Playlist Limit (3 / Week)' : 'Daily Merging Limit'}
          </h3>
          <span className="text-xs text-[#777777]">
            Resets in{' '}
            {usage.quota_period === 'week'
              ? `${Math.max(1, Math.ceil(usage.quota_reset_in_hours / 24))} days`
              : `${usage.quota_reset_in_hours} hours`}
          </span>
        </div>

        {/* Quota Progress Meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-[#888888]">
              {usage.quota_period === 'week' ? 'Playlists Merged This Week' : 'Requests Used Today'}
            </span>
            <span className="text-white font-semibold">
              {usage.requests_today} / {usage.daily_quota} ({quotaPercent}%)
            </span>
          </div>
          <div className="w-full bg-[#121212] rounded-full h-2.5 overflow-hidden border border-[#242424]">
            <div
              className="bg-brand-red h-full rounded-full transition-all duration-300"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
