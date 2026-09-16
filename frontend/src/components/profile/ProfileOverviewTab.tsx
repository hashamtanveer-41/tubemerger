/**
 * Profile Overview Tab displaying usage meters, lifetime stats, and canvas resolution.
 */

import React from 'react';
import { Activity, Layers, Clock, Zap } from 'lucide-react';
import { UsageMetrics } from '@/types';

interface ProfileOverviewTabProps {
  usage: UsageMetrics;
  quotaPercent: number;
  isPro: boolean;
}

export function ProfileOverviewTab({ usage, quotaPercent, isPro }: ProfileOverviewTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="rounded-2xl border border-[#282828] bg-[#181818] p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#282828]">
          {/* Stat 1: Requests */}
          <div className="space-y-1 pr-4">
            <div className="flex items-center justify-between text-xs text-[#888888]">
              <span>{usage.quota_period === 'week' ? 'Weekly Playlists' : 'Daily Requests'}</span>
              <Activity className="w-3.5 h-3.5 text-brand-red" />
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-bold text-white">{usage.requests_today}</span>
              <span className="text-xs text-[#666666]">
                / {usage.daily_quota} {usage.quota_period === 'week' ? 'this week' : 'today'}
              </span>
            </div>
            <div className="w-full bg-[#242424] rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-brand-red h-full rounded-full"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>

          {/* Stat 2: Lifetime Merges */}
          <div className="space-y-1 pt-4 md:pt-0 md:px-6">
            <div className="flex items-center justify-between text-xs text-[#888888]">
              <span>Lifetime Merges</span>
              <Layers className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white pt-1">
              {usage.total_lifetime_merges}
            </div>
            <p className="text-[11px] text-[#666666]">Completed jobs</p>
          </div>

          {/* Stat 3: Render Duration */}
          <div className="space-y-1 pt-4 md:pt-0 md:px-6">
            <div className="flex items-center justify-between text-xs text-[#888888]">
              <span>Video Rendered</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white pt-1">
              {usage.total_minutes_processed}m
            </div>
            <p className="text-[11px] text-[#666666]">Total duration stitched</p>
          </div>

          {/* Stat 4: Resolution */}
          <div className="space-y-1 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between text-xs text-[#888888]">
              <span>Canvas Resolution</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white pt-1">
              {isPro ? '4K 60FPS' : '1080p'}
            </div>
            <p className="text-[11px] text-[#666666]">
              {isPro ? 'Hardware accelerated' : 'Standard encoding'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
