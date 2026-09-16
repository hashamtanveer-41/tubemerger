/**
 * ProfileView coordinator managing user account preferences and tab navigation.
 */

import React, { useState } from 'react';
import { UserProfile, LicenseInfo, UsageMetrics, ActiveDevice } from '@/types';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import {
  ArrowLeft,
  BadgeCheck,
  KeyRound,
  Activity,
  Check,
  Sparkles,
  Calendar,
  LogOut,
  LogIn,
  ShieldAlert,
} from 'lucide-react';
import { ProfileOverviewTab } from '@/components/profile/ProfileOverviewTab';
import { ProfileLicenseTab } from '@/components/profile/ProfileLicenseTab';
import { ProfileUsageTab } from '@/components/profile/ProfileUsageTab';

interface ProfileViewProps {
  profile: UserProfile | null;
  license: LicenseInfo;
  usage: UsageMetrics;
  activeDevices?: ActiveDevice[];
  onActivateKey: (key: string) => Promise<boolean>;
  onDeactivateKey: () => Promise<boolean>;
  onDeactivateDevice?: (hwid: string) => Promise<void>;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
  onNavigateToAdmin?: () => void;
  onBackToMerge: () => void;
  showToast: (message: string, type: 'error' | 'success' | 'info') => void;
}

const ENABLE_ADMIN = import.meta.env.VITE_ENABLE_ADMIN === 'true';

export function ProfileView({
  profile,
  license,
  usage,
  activeDevices = [],
  onActivateKey,
  onDeactivateDevice,
  onSignInClick,
  onSignOutClick,
  onNavigateToAdmin,
  onBackToMerge,
  showToast,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'license' | 'usage'>('overview');
  const [licenseInput, setLicenseInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (planTier: string) => {
    if (!profile) {
      showToast('Please sign in or create an account first to link your purchase.', 'info');
      if (onSignInClick) onSignInClick();
      return;
    }

    setCheckoutLoading(planTier);
    try {
      const session = await api.createCheckoutSession(planTier);
      if (session.checkout_url) {
        if (session.checkout_url.includes('simulated=true')) {
          showToast(`Test Mode: Account upgraded to ${session.plan_tier}! Refreshing...`, 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          showToast('Opening secure Stripe checkout…', 'info');
          window.open(session.checkout_url, '_blank');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize checkout', 'error');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(license.hardware_id);
    setCopiedHwid(true);
    showToast('Hardware ID copied to clipboard', 'info');
    setTimeout(() => setCopiedHwid(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    setActivating(true);
    try {
      const success = await onActivateKey(licenseInput.trim());
      if (success) {
        setLicenseInput('');
        showToast('License activated successfully!', 'success');
      } else {
        showToast('Invalid or expired license key.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Activation failed.', 'error');
    } finally {
      setActivating(false);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.email === 'admin@tubemerger.com';
  const isPro =
    (license.status === 'active' &&
      (license.plan_tier === 'PRO' ||
       license.plan_tier === 'CREATOR_PRO' ||
       license.plan_tier === 'LIFETIME' ||
       license.plan_tier === 'STUDIO')) ||
    profile?.tier === 'LIFETIME' ||
    profile?.tier === 'CREATOR_PRO' ||
    isAdmin;
  const quotaPercent = Math.min(100, Math.round((usage.requests_today / usage.daily_quota) * 100));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 select-none animate-in fade-in duration-150">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToMerge}
          className="inline-flex items-center gap-2 text-xs text-content-secondary hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Merging</span>
        </button>

        <span className="text-xs text-content-dim font-medium">
          Channel & Account Settings
        </span>
      </div>

      {/* YouTube-Style Channel Profile Header */}
      <div className="rounded-2xl border border-[#282828] bg-[#181818] overflow-hidden shadow-lg">
        <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-[#161616]">
          <img
            src="/assets/banner.jpg"
            alt="TubeMerger"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-[#303030] bg-[#242424] flex items-center justify-center text-white shrink-0 shadow-md relative overflow-hidden">
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {profile ? (profile.full_name || profile.name || 'C').charAt(0).toUpperCase() : 'G'}
                </span>
                {isPro && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#181818] flex items-center justify-center text-white" title="Verified License">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                    {profile ? (profile.full_name || profile.name) : 'Guest Creator'}
                  </h1>
                  {isPro && (
                    <span title="Active Entitlement" className="flex items-center shrink-0">
                      <BadgeCheck className="w-5 h-5 text-emerald-400" />
                    </span>
                  )}
                  {isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-brand-red text-white uppercase shadow-sm">
                      ADMIN
                    </span>
                  )}
                  {!isAdmin && isPro && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase shadow-sm">
                      {profile?.tier === 'LIFETIME' || license.plan_tier === 'LIFETIME' ? 'LIFETIME' : 'PRO'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#888888]">
                  <span>{profile ? profile.handle : '@guest.tubemerger'}</span>
                  <span className="text-[#555555]">·</span>
                  <span>{profile ? profile.email : 'Unregistered Workstation'}</span>
                  <span className="text-[#555555]">·</span>
                  <span className="flex items-center gap-1 text-[#666666]">
                    <Calendar className="w-3 h-3" />
                    Joined {profile ? profile.created_at : 'Sep 2026'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {ENABLE_ADMIN && isAdmin && onNavigateToAdmin && (
                <Button
                  size="default"
                  variant="default"
                  onClick={onNavigateToAdmin}
                  icon={ShieldAlert}
                  className="text-xs h-10 px-4 font-semibold bg-brand-red hover:bg-red-600 shadow-md shadow-red-950/40"
                >
                  Admin Console
                </Button>
              )}
              {isPro && !isAdmin && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{license.plan_tier === 'LIFETIME' || profile?.tier === 'LIFETIME' ? 'Lifetime Hero' : 'Creator Pro Active'}</span>
                </div>
              )}
              {!isPro && (
                <Button
                  size="default"
                  variant="default"
                  onClick={() => setActiveTab('license')}
                  icon={Sparkles}
                  className="text-xs h-10 px-5 font-semibold shadow-md shadow-red-950/30"
                >
                  Upgrade to Pro
                </Button>
              )}
              {profile ? (
                <Button
                  size="default"
                  variant="outline"
                  onClick={onSignOutClick}
                  icon={LogOut}
                  className="text-xs h-10 px-4 font-semibold border-[#333333] hover:border-red-500/50 hover:text-red-400"
                >
                  Sign Out
                </Button>
              ) : (
                <Button
                  size="default"
                  variant="outline"
                  onClick={onSignInClick}
                  icon={LogIn}
                  className="text-xs h-10 px-4 font-semibold border-blue-500/60 text-blue-400 hover:bg-blue-500/10"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 border-t border-[#242424] mt-6 pt-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 text-sm font-medium transition-colors relative cursor-pointer ${
                activeTab === 'overview' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('license')}
              className={`pb-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'license' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              License & Plan
              {activeTab === 'license' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('usage')}
              className={`pb-2.5 text-sm font-medium transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'usage' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Usage Analytics
              {activeTab === 'usage' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <ProfileOverviewTab
          usage={usage}
          quotaPercent={quotaPercent}
          isPro={isPro}
        />
      )}

      {activeTab === 'license' && (
        <ProfileLicenseTab
          license={license}
          isPro={isPro}
          activeDevices={activeDevices}
          checkoutLoading={checkoutLoading}
          licenseInput={licenseInput}
          activating={activating}
          copiedHwid={copiedHwid}
          onCheckout={handleCheckout}
          onLicenseInputChange={setLicenseInput}
          onActivate={handleActivate}
          onCopyHwid={handleCopyHwid}
          onDeactivateDevice={onDeactivateDevice}
        />
      )}

      {activeTab === 'usage' && (
        <ProfileUsageTab
          usage={usage}
          quotaPercent={quotaPercent}
        />
      )}
    </div>
  );
}
