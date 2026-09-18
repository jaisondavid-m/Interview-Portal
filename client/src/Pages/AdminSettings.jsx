import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Zap,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Users,
  ShieldCheck,
  GraduationCap,
  Terminal,
  Database,
  Lock,
  Globe,
  Radio,
  Server
} from 'lucide-react';
import api from '../api/axios';

const DEMO_ACCOUNTS_PREVIEW = [
  {
    title: 'Admin (Staff)',
    email: 'admin@mockmate.ai',
    icon: ShieldCheck,
    role: 'Admin',
    badge: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    title: 'Developer',
    email: 'developer@mockmate.ai',
    icon: Terminal,
    role: 'Developer',
    badge: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    title: 'Student 1',
    email: 'jaisondavidm.cs25@bitsathy.ac.in',
    icon: GraduationCap,
    role: 'Student',
    badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    title: 'Student 2',
    email: 'jagaprasanths.cs25@bitsathy.ac.in',
    icon: GraduationCap,
    role: 'Student',
    badge: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
];

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/system/settings');
      const data = res?.data || res;
      if (data?.data?.settings_map) {
        setQuickLoginEnabled(Boolean(data.data.settings_map.quick_login_enabled));
      } else if (Array.isArray(data?.data?.settings)) {
        const ql = data.data.settings.find((s) => s.key === 'quick_login_enabled');
        if (ql) {
          const val = String(ql.value).toLowerCase().trim();
          setQuickLoginEnabled(val === 'true' || val === '1' || val === 'yes' || val === 'on');
        }
      }
    } catch (err) {
      console.error('Failed to load system settings', err);
      showToast(err.response?.data?.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleQuickLogin = async (e) => {
    const nextVal = !quickLoginEnabled;
    // Optimistic UI update
    setQuickLoginEnabled(nextVal);
    try {
      setUpdating(true);
      await api.post('/system/settings', {
        key: 'quick_login_enabled',
        value: String(nextVal),
      });
      showToast(
        nextVal
          ? 'Quick 1-Click Login enabled on the login page.'
          : 'Quick 1-Click Login disabled. Demo accounts hidden on login page.',
        'success'
      );
    } catch (err) {
      // Revert on error
      setQuickLoginEnabled(!nextVal);
      showToast(err.response?.data?.message || 'Failed to update setting.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border text-xs font-mono font-bold shadow-xl animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-rose-500 text-white border-rose-600'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--accent)] uppercase tracking-wider font-bold mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
            System & Feature Settings
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Manage global platform toggles, authentication options, and environment parameters
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading || updating}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold cursor-pointer"
            title="Refresh system settings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel-card p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-[13px] text-[var(--text-muted)] font-medium">
            Loading system configurations...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Authentication & Quick Login Setting Card */}
            <div className="panel-card p-6 border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
                        Quick 1-Click Demo Login
                      </h2>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                          quickLoginEnabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'
                        }`}
                      >
                        {quickLoginEnabled ? 'Enabled (Active)' : 'Disabled (Hidden)'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
                      Toggle whether the 1-click quick demo login buttons appear on the login page. When turned off, demo accounts are completely hidden from all users, requiring regular credentials or Google Sign-In.
                    </p>
                  </div>
                </div>

                {/* Modern Interactive Switch */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">
                    {quickLoginEnabled ? 'ON' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={quickLoginEnabled}
                    disabled={updating}
                    onClick={handleToggleQuickLogin}
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed ${
                      quickLoginEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        quickLoginEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div
                className={`p-3.5 rounded-[var(--radius-sm)] border text-xs flex items-start gap-2.5 ${
                  quickLoginEnabled
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-[var(--text-secondary)]'
                    : 'bg-amber-500/5 border-amber-500/20 text-[var(--text-secondary)]'
                }`}
              >
                {quickLoginEnabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <strong className="text-[var(--text-primary)] block">
                    {quickLoginEnabled
                      ? 'Live on Login Page'
                      : 'Hidden from Login Page'}
                  </strong>
                  <p className="text-[11px] leading-relaxed">
                    {quickLoginEnabled
                      ? 'Students, faculty, and assessors visiting /login will see 1-click test cards below the main login form.'
                      : 'The Quick Demo Accounts section is hidden from /login. Users must authenticate with their registered email/password or Google account.'}
                  </p>
                </div>
              </div>

              {/* Demo Accounts Overview Grid */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-bold">
                    Demo Accounts Configured ({DEMO_ACCOUNTS_PREVIEW.length})
                  </span>
                  <a
                    href="/login"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <span>View Login Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_ACCOUNTS_PREVIEW.map((acc) => {
                    const Icon = acc.icon;
                    return (
                      <div
                        key={acc.email}
                        className={`p-3 rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] flex items-center justify-between gap-3 transition-opacity ${
                          quickLoginEnabled ? 'opacity-100' : 'opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-full border shrink-0 ${acc.badge}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[12px] font-bold text-[var(--text-primary)] block truncate">
                              {acc.title}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                              {acc.email}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] shrink-0">
                          {acc.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* System Overview & Diagnostics Sidebar */}
          <div className="space-y-6">
            {/* System Status Panel */}
            <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[12px] font-mono font-bold text-[var(--text-primary)]">
                <Server className="w-4 h-4 text-[var(--accent)]" />
                <span>System Health & Status</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">Database Cluster</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">Audit Logging</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">WebRTC Signaling</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" />
                    Live
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">Quick Logins Mode</span>
                  <span className={`font-bold ${quickLoginEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                    {quickLoginEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Permission Scope Notice */}
            <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-mono font-bold text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                <span>Access Management</span>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                This page is accessible to both <strong className="text-[var(--text-primary)]">Admin</strong> and <strong className="text-[var(--text-primary)]">Developer</strong> roles as configured in the dynamic database page permissions catalog.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
