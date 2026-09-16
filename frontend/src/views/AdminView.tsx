/**
 * Administrator Console coordinator view.
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Users, Key, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { AdminStats, AdminUser, AdminLicense, AdminUsageEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { AdminStatCards } from '@/components/admin/AdminStatCards';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';
import { AdminLicensesTable } from '@/components/admin/AdminLicensesTable';
import { AdminAuditLogTable } from '@/components/admin/AdminAuditLogTable';

interface AdminViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function AdminView({ showToast }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'creators' | 'licenses' | 'billing'>('creators');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminUsageEvent[]>([]);

  // Filter & search states
  const [userSearch, setUserSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Key Generator form state
  const [genTier, setGenTier] = useState('CREATOR_PRO');
  const [genMaxDevices, setGenMaxDevices] = useState(2);
  const [genUserEmail, setGenUserEmail] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      const [statsData, usersData, licensesData, auditData] = await Promise.all([
        api.adminGetStats().catch(() => null),
        api.adminGetUsers(userSearch).catch(() => []),
        api.adminGetLicenses().catch(() => []),
        api.adminGetAuditLog(50).catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setUsers(usersData);
      setLicenses(licensesData);
      setAuditLogs(auditData);
    } catch {
      showToast('Failed to fetch administrator data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userSearch]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingKey(true);
    try {
      const created = await api.adminGenerateLicense({
        tier: genTier,
        max_devices: genMaxDevices,
        user_email: genUserEmail.trim() || undefined,
      });
      showToast(`Key generated: ${created.license_key}`, 'success');
      setGenUserEmail('');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Key generation failed', 'error');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleUpdateTier = async (userId: string, currentTier: string) => {
    const nextTier =
      currentTier === 'FREE' ? 'CREATOR_PRO' : currentTier === 'CREATOR_PRO' ? 'LIFETIME' : 'FREE';
    try {
      await api.adminUpdateUserTier(userId, nextTier);
      showToast(`User upgraded to ${nextTier}`, 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user tier', 'error');
    }
  };

  const handleResetDevices = async (userId: string) => {
    if (!confirm('Reset all workstation nodes for this user?')) return;
    try {
      await api.adminResetDevices(userId);
      showToast('Workstation nodes reset successfully', 'success');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset workstations', 'error');
    }
  };

  const handleRevokeKey = async (licenseKey: string) => {
    if (!confirm(`Revoke license key ${licenseKey}? Bound workstations will lose access.`)) return;
    try {
      await api.adminRevokeLicense(licenseKey);
      showToast(`License ${licenseKey} revoked`, 'info');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke license', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#1A0A0A] to-[#141414] border border-[#2D1616] p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Administrator Console</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-brand-red text-white uppercase shadow-sm">
              Admin Portal
            </span>
          </div>
          <p className="text-xs text-[#888888]">
            Master controls for accounts, license key generation, node-lock device slots, and billing audits.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAllData}
          loading={refreshing}
          icon={RefreshCw}
          className="shrink-0 text-xs border-[#333333] hover:border-white/40 hover:bg-[#202020]"
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* Top 4 System Metrics */}
      <AdminStatCards stats={stats} />

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#262626] gap-2">
        <button
          onClick={() => setActiveTab('creators')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'creators'
              ? 'border-brand-red text-white'
              : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Creators & Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('licenses')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'licenses'
              ? 'border-brand-red text-white'
              : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>License Keys & Generator ({licenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'border-brand-red text-white'
              : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Live Billing & Request Audit</span>
        </button>
      </div>

      {/* Tab 1: Creators & Accounts */}
      {activeTab === 'creators' && (
        <AdminUsersTable
          users={users}
          userSearch={userSearch}
          onUserSearchChange={setUserSearch}
          onUpdateTier={handleUpdateTier}
          onResetDevices={handleResetDevices}
        />
      )}

      {/* Tab 2: Licenses & Key Generator */}
      {activeTab === 'licenses' && (
        <AdminLicensesTable
          licenses={licenses}
          genTier={genTier}
          genMaxDevices={genMaxDevices}
          genUserEmail={genUserEmail}
          generatingKey={generatingKey}
          copiedKey={copiedKey}
          onGenTierChange={setGenTier}
          onGenMaxDevicesChange={setGenMaxDevices}
          onGenUserEmailChange={setGenUserEmail}
          onGenerateKey={handleGenerateKey}
          onCopyKey={handleCopy}
          onRevokeKey={handleRevokeKey}
        />
      )}

      {/* Tab 3: Live Billing & Request Audit */}
      {activeTab === 'billing' && (
        <AdminAuditLogTable auditLogs={auditLogs} />
      )}
    </div>
  );
}
