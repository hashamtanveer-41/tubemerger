/**
 * Admin licenses inventory and cryptographic product key generator component.
 */

import React from 'react';
import { PlusCircle, Sparkles, Check, Copy } from 'lucide-react';
import { AdminLicense } from '@/types';
import { Button } from '@/components/ui/button';

interface AdminLicensesTableProps {
  licenses: AdminLicense[];
  genTier: string;
  genMaxDevices: number;
  genUserEmail: string;
  generatingKey: boolean;
  copiedKey: string | null;
  onGenTierChange: (tier: string) => void;
  onGenMaxDevicesChange: (devices: number) => void;
  onGenUserEmailChange: (email: string) => void;
  onGenerateKey: (e: React.FormEvent) => void;
  onCopyKey: (key: string) => void;
  onRevokeKey: (key: string) => void;
}

export function AdminLicensesTable({
  licenses,
  genTier,
  genMaxDevices,
  genUserEmail,
  generatingKey,
  copiedKey,
  onGenTierChange,
  onGenMaxDevicesChange,
  onGenUserEmailChange,
  onGenerateKey,
  onCopyKey,
  onRevokeKey,
}: AdminLicensesTableProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Key Generator Card */}
      <div className="rounded-2xl border border-[#2D1616] bg-gradient-to-br from-[#1A0D0D] to-[#161616] p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-brand-red" />
          <h3 className="text-base font-bold text-white">Generate Master License Key</h3>
        </div>
        <p className="text-xs text-[#888888]">
          Issue new cryptographic product keys for offline activations or direct creator binding.
        </p>

        <form onSubmit={onGenerateKey} className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-[#AAAAAA] mb-1.5 uppercase tracking-wider">
              Tier Entitlement
            </label>
            <select
              value={genTier}
              onChange={(e) => onGenTierChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#121212] border border-[#2E2E2E] text-xs text-white focus:outline-none focus:border-brand-red cursor-pointer"
            >
              <option value="CREATOR_PRO">Creator Pro (Uncapped)</option>
              <option value="LIFETIME">Lifetime Hero (Permanent)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#AAAAAA] mb-1.5 uppercase tracking-wider">
              Max Workstations
            </label>
            <select
              value={genMaxDevices}
              onChange={(e) => onGenMaxDevicesChange(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl bg-[#121212] border border-[#2E2E2E] text-xs text-white focus:outline-none focus:border-brand-red cursor-pointer"
            >
              <option value={1}>1 Workstation</option>
              <option value={2}>2 Workstations (Default)</option>
              <option value={3}>3 Workstations</option>
              <option value={5}>5 Workstations</option>
              <option value={100}>100 Workstations (Enterprise)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#AAAAAA] mb-1.5 uppercase tracking-wider">
              Assign User Email (Optional)
            </label>
            <input
              type="email"
              value={genUserEmail}
              onChange={(e) => onGenUserEmailChange(e.target.value)}
              placeholder="creator@email.com"
              className="w-full h-10 px-3 rounded-xl bg-[#121212] border border-[#2E2E2E] text-xs text-white placeholder-[#555555] focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              variant="default"
              size="default"
              loading={generatingKey}
              icon={Sparkles}
              className="w-full h-10 font-semibold text-xs"
            >
              Generate Key
            </Button>
          </div>
        </form>
      </div>

      {/* Licenses Inventory Table */}
      <div className="border border-[#262626] rounded-2xl bg-[#161616] overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#242424] flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">Issued Product Licenses</h4>
          <span className="text-xs text-[#777777]">{licenses.length} keys total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1C1C1C] border-b border-[#262626] text-[#888888] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">License Key</th>
                <th className="py-3.5 px-4">Assigned Creator</th>
                <th className="py-3.5 px-4">Tier</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Workstations Allocated</th>
                <th className="py-3.5 px-4">Issued At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {licenses.map((lic) => (
                <tr key={lic.id} className="hover:bg-[#1D1D1D] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <span>{lic.license_key}</span>
                      <button
                        onClick={() => onCopyKey(lic.license_key)}
                        className="text-[#666666] hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedKey === lic.license_key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#AAAAAA]">{lic.user_email || 'Unassigned'}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        lic.tier === 'LIFETIME'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-brand-red/15 text-brand-red border border-brand-red/30'
                      }`}
                    >
                      {lic.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        lic.status === 'active'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-red-950/60 text-red-400 border border-red-800/40'
                      }`}
                    >
                      {lic.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-white">
                      {lic.active_devices_count} / {lic.max_devices} slots
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#777777]">{lic.created_at}</td>
                  <td className="py-3.5 px-4 text-right">
                    {lic.status === 'active' && (
                      <button
                        onClick={() => onRevokeKey(lic.license_key)}
                        className="px-2 py-1 rounded bg-red-950/30 hover:bg-red-950/60 text-red-400 text-[11px] font-medium border border-red-900/30 transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
