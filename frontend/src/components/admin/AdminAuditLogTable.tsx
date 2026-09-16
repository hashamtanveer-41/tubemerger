/**
 * Admin live billing and request audit log table.
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { AdminUsageEvent } from '@/types';

interface AdminAuditLogTableProps {
  auditLogs: AdminUsageEvent[];
}

export function AdminAuditLogTable({ auditLogs }: AdminAuditLogTableProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="rounded-2xl border border-[#282828] bg-[#161616] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-xs text-[#888888]">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Metered billing events stream directly from Supabase <code className="text-white font-mono">public.user_requests</code>.
          </span>
        </div>
        <div className="text-xs text-[#666666]">
          Audit window: <span className="text-white font-medium">Last 50 Jobs</span>
        </div>
      </div>

      <div className="border border-[#262626] rounded-2xl bg-[#161616] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1C1C1C] border-b border-[#262626] text-[#888888] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Creator Email</th>
                <th className="py-3.5 px-4">Request Type</th>
                <th className="py-3.5 px-4">Videos Merged</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Workstation HWID</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#666666]">
                    No billable merge requests recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1D1D1D] transition-colors">
                    <td className="py-3.5 px-4 text-[#AAAAAA] whitespace-nowrap">{log.created_at}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{log.user_email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#222222] text-amber-300">
                        {log.request_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white">{log.video_count} clips</td>
                    <td className="py-3.5 px-4 font-mono text-[#888888]">
                      {log.duration_seconds > 0 ? `${Math.round(log.duration_seconds / 60)} min` : '< 1 min'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-[#666666]">
                      {log.hardware_id ? `${log.hardware_id.slice(0, 16)}…` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        {log.status}
                      </span>
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
