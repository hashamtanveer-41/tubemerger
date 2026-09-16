/**
 * Admin creators directory table with user search and tier cycle controls.
 */

import React from 'react';
import { Search, Cpu } from 'lucide-react';
import { AdminUser } from '@/types';

interface AdminUsersTableProps {
  users: AdminUser[];
  userSearch: string;
  onUserSearchChange: (search: string) => void;
  onUpdateTier: (userId: string, currentTier: string) => void;
  onResetDevices: (userId: string) => void;
}

export function AdminUsersTable({
  users,
  userSearch,
  onUserSearchChange,
  onUpdateTier,
  onResetDevices,
}: AdminUsersTableProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => onUserSearchChange(e.target.value)}
            placeholder="Search creators by email, name, or handle..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#161616] border border-[#282828] text-xs text-white placeholder-[#666666] focus:outline-none focus:border-brand-red"
          />
        </div>
        <div className="text-xs text-[#666666]">
          Showing <span className="text-white font-medium">{users.length}</span> creators
        </div>
      </div>

      <div className="border border-[#262626] rounded-2xl bg-[#161616] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1C1C1C] border-b border-[#262626] text-[#888888] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Creator / Account</th>
                <th className="py-3.5 px-4">Subscription Tier</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Merges</th>
                <th className="py-3.5 px-4">Workstations</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#666666]">
                    No creators match your query.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1D1D1D] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{u.full_name || 'Creator'}</div>
                      <div className="text-[11px] text-[#888888] font-mono">{u.email}</div>
                      <div className="text-[10px] text-[#555555]">{u.handle}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.tier === 'LIFETIME'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : u.tier === 'CREATOR_PRO' || u.tier === 'PRO'
                            ? 'bg-brand-red/15 text-brand-red border border-brand-red/30'
                            : 'bg-[#262626] text-[#AAAAAA] border border-[#333333]'
                        }`}
                      >
                        {u.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          u.role === 'admin'
                            ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                            : 'bg-[#222222] text-[#888888]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white font-medium">
                      {u.merge_count}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-[#666666]" />
                        <span className="font-mono text-white">{u.active_devices_count}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#777777]">{u.created_at}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onUpdateTier(u.id, u.tier)}
                          className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-white text-[11px] font-medium border border-[#333333] transition-colors cursor-pointer"
                          title="Rotate through Community -> Pro -> Lifetime"
                        >
                          Cycle Tier
                        </button>
                        <button
                          onClick={() => onResetDevices(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-red-400 text-[11px] font-medium border border-red-900/30 transition-colors cursor-pointer"
                          title="Clear all bound hardware IDs for this creator"
                        >
                          Reset Slots
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
