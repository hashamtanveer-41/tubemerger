/**
 * Top-level administrator system metrics cards.
 */

import React from 'react';
import { Users, Key, Video, Cpu } from 'lucide-react';
import { AdminStats } from '@/types';

interface AdminStatCardsProps {
  stats: AdminStats | null;
}

export function AdminStatCards({ stats }: AdminStatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Metric 1 */}
      <div className="rounded-xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-[#777777] font-medium">Registered Creators</div>
          <div className="text-2xl font-bold text-white leading-tight">
            {stats?.total_users ?? '—'}
          </div>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="rounded-xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-[#777777] font-medium">Active Licenses</div>
          <div className="text-2xl font-bold text-white leading-tight">
            {stats?.active_licenses ?? '—'}
          </div>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="rounded-xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
          <Video className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-[#777777] font-medium">Merges Processed</div>
          <div className="text-2xl font-bold text-white leading-tight">
            {stats?.total_merges ?? '—'}
          </div>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="rounded-xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-[#777777] font-medium">Bound Workstations</div>
          <div className="text-2xl font-bold text-white leading-tight">
            {stats?.active_workstations ?? '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
