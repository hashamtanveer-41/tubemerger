/**
 * Profile License Tab displaying tier comparison, connected nodes, key activation, and HWID.
 */

import React from 'react';
import { ActiveDevice, LicenseInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Check, X, Sparkles, Cpu, ShieldCheck, Copy } from 'lucide-react';

interface ProfileLicenseTabProps {
  license: LicenseInfo;
  isPro: boolean;
  activeDevices?: ActiveDevice[];
  checkoutLoading: string | null;
  licenseInput: string;
  activating: boolean;
  copiedHwid: boolean;
  onCheckout: (planTier: string) => void;
  onLicenseInputChange: (val: string) => void;
  onActivate: (e: React.FormEvent) => void;
  onCopyHwid: () => void;
  onDeactivateDevice?: (hwid: string) => Promise<void>;
}

export function ProfileLicenseTab({
  license,
  isPro,
  activeDevices = [],
  checkoutLoading,
  licenseInput,
  activating,
  copiedHwid,
  onCheckout,
  onLicenseInputChange,
  onActivate,
  onCopyHwid,
  onDeactivateDevice,
}: ProfileLicenseTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Buying & Plan Comparison (3 Tiers: Free, Pass, Lifetime Hero Offer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tier 1: Free Community */}
        <div className="rounded-2xl border border-[#333333] bg-[#1A1A1A] p-6 space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start pb-3 border-b border-[#2A2A2A] mb-4">
              <div>
                <h4 className="text-base font-bold text-white">Free Community</h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">$0</span>
                  <span className="text-xs text-[#888888]">/ forever</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#AAAAAA] bg-[#242424] border border-[#333333] px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2.5 text-[#E0E0E0]">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Automated chapter generation</span>
              </li>
              <li className="flex items-center gap-2.5 text-[#888888]">
                <X className="w-3.5 h-3.5 text-red-400 shrink-0 stroke-[2.5]" />
                <span>3 playlists / week limit</span>
              </li>
              <li className="flex items-center gap-2.5 text-[#888888]">
                <X className="w-3.5 h-3.5 text-red-400 shrink-0 stroke-[2.5]" />
                <span>1080p max resolution cap</span>
              </li>
              <li className="flex items-center gap-2.5 text-[#888888]">
                <X className="w-3.5 h-3.5 text-red-400 shrink-0 stroke-[2.5]" />
                <span>Standard CPU encoding</span>
              </li>
              <li className="flex items-center gap-2.5 text-[#888888]">
                <X className="w-3.5 h-3.5 text-red-400 shrink-0 stroke-[2.5]" />
                <span>Single-threaded engine</span>
              </li>
              <li className="flex items-center gap-2.5 text-[#888888]">
                <X className="w-3.5 h-3.5 text-red-400 shrink-0 stroke-[2.5]" />
                <span>1 workstation limit</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#262626]">
            <span className="text-xs text-[#666666] block text-center font-medium">
              Free Acquisition Tier
            </span>
          </div>
        </div>

        {/* Tier 2: Creator Pro (Pass) */}
        <div className="rounded-2xl border border-[#3A3A3A] bg-[#1E1E1E] p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start pb-3 border-b border-[#2C2C2C] mb-4">
              <div>
                <h4 className="text-base font-bold text-white">Creator Pro (Pass)</h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">$4.99</span>
                  <span className="text-xs text-[#AAAAAA]">/ mo or $29/yr</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-zinc-300 bg-[#2C2C2C] px-2 py-0.5 rounded-full">
                Flex Pass
              </span>
            </div>

            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Automated chapter generation</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Unlimited daily merge requests</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>4K 60FPS & 8K master rendering</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Hardware GPU acceleration</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Multi-threaded download engine</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>2 authorized workstations</span>
              </li>
            </ul>
          </div>

          {!isPro && (
            <div className="pt-4 border-t border-[#2A2A2A]">
              <Button
                variant="outline"
                size="default"
                loading={checkoutLoading === 'CREATOR_PRO_MONTHLY'}
                onClick={() => onCheckout('CREATOR_PRO_MONTHLY')}
                className="w-full h-10 font-semibold text-xs border-[#404040] hover:border-white text-white"
              >
                Get Pro Pass - $9/mo
              </Button>
            </div>
          )}
        </div>

        {/* Tier 3: Pro Lifetime (Hero Offer) */}
        <div className="rounded-2xl border-2 border-brand-red bg-[#231718] p-6 space-y-4 shadow-2xl shadow-red-950/40 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start pb-3 border-b border-brand-red/30 mb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-red" /> Pro Lifetime
                </h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">$49</span>
                  <span className="text-xs text-red-200/80 font-semibold">One-Time</span>
                </div>
              </div>
              <span className="text-[10px] font-black tracking-wide text-white bg-brand-red px-2.5 py-0.5 rounded-full shadow-sm uppercase">
                Hero Offer
              </span>
            </div>

            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Pay once, own forever (No churn)</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Unlimited daily merges (Uncapped)</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>4K 60FPS & 8K master rendering</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Full GPU acceleration (NVENC/QuickSync)</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Priority multi-threaded processing</span>
              </li>
              <li className="flex items-center gap-2.5 text-white font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>3 workstations + Lifetime updates</span>
              </li>
            </ul>
          </div>

          {!isPro && (
            <div className="pt-4 border-t border-brand-red/20">
              <Button
                variant="default"
                size="default"
                loading={checkoutLoading === 'LIFETIME'}
                onClick={() => onCheckout('LIFETIME')}
                icon={Sparkles}
                className="w-full h-11 font-black text-xs shadow-lg shadow-red-950/50"
              >
                Unlock Lifetime Access - $49
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Connected Workstations */}
      {activeDevices && activeDevices.length > 0 && (
        <div className="rounded-2xl border border-[#2E2E2E] bg-[#181818] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-red" />
              <span>Connected Workstations ({activeDevices.length} / 2 Slots Used)</span>
            </h4>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-0.5 rounded-full">
              Supabase Node-Locked
            </span>
          </div>

          <div className="space-y-2">
            {activeDevices.map((dev) => (
              <div
                key={dev.hardware_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#121212] border border-[#262626] text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{dev.device_name}</span>
                    {dev.is_current && (
                      <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                        Current Machine
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[#666666] truncate max-w-md">
                    HWID: {dev.hardware_id} · Activated {dev.activated_at}
                  </p>
                </div>

                {!dev.is_current && onDeactivateDevice && (
                  <button
                    type="button"
                    onClick={() => onDeactivateDevice(dev.hardware_id)}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 rounded-lg border border-red-900/40 hover:bg-red-950/40 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    Deactivate Slot
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* License Activation Form */}
      <div className="rounded-2xl border border-[#2E2E2E] bg-[#181818] p-5 space-y-3">
        <h4 className="text-sm font-semibold text-white">Activate Product Key</h4>
        <form onSubmit={onActivate} className="flex flex-col sm:flex-row gap-3">
          <input
            id="licenseKeyInput"
            type="text"
            value={licenseInput}
            onChange={(e) => onLicenseInputChange(e.target.value.toUpperCase())}
            placeholder="TM-XXXX-XXXX-XXXX"
            disabled={activating}
            className="flex-1 h-11 px-4 rounded-xl bg-[#121212] border border-[#2E2E2E] text-sm text-white placeholder-[#555555] focus:outline-none focus:border-brand-red font-mono"
          />
          <Button
            type="submit"
            variant="default"
            size="default"
            loading={activating}
            disabled={!licenseInput.trim()}
            icon={ShieldCheck}
            className="h-11 px-6 font-semibold text-xs shrink-0"
          >
            Activate Key
          </Button>
        </form>
      </div>

      {/* Minimal Hardware ID Row */}
      <div className="rounded-2xl border border-[#262626] bg-[#161616] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-[#888888] font-medium min-w-0">
          <Cpu className="w-4 h-4 shrink-0 text-[#666666]" />
          <span className="shrink-0">Hardware ID:</span>
          <span className="font-mono text-[#CCCCCC] truncate text-xs">{license.hardware_id}</span>
        </div>
        <button
          onClick={onCopyHwid}
          className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors cursor-pointer shrink-0"
        >
          {copiedHwid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedHwid ? 'Copied' : 'Copy HWID'}</span>
        </button>
      </div>
    </div>
  );
}
