import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Zap,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  Terminal,
  Radio,
  Server,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  User,
} from 'lucide-react';
import api from '../api/axios';

// Role → icon mapping for preview cards
const ROLE_META = {
  admin:     { icon: ShieldCheck, badge: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  developer: { icon: Terminal,    badge: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  student:   { icon: GraduationCap, badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  faculty:   { icon: GraduationCap, badge: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
};
const FALLBACK_META = { icon: User, badge: 'text-zinc-600 bg-zinc-500/10 border-zinc-500/20' };

const BLANK_ACCOUNT = { title: '', email: '', password: '', role: 'student' };

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(false);
  const [quickAccounts, setQuickAccounts] = useState([]);
  const [toast, setToast] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', index: number|null, form: {...} }
  const [modalSaving, setModalSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // index to delete

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/system/settings');
      // axios interceptor already unwraps response.data → res IS the body
      const body = res?.data ?? res;
      const d = body?.data ?? body;

      if (d?.settings_map) {
        // Prefer the settings_map since it already has correct types
        if (typeof d.settings_map.quick_login_enabled === 'boolean') {
          setQuickLoginEnabled(d.settings_map.quick_login_enabled);
        }
        if (Array.isArray(d.settings_map.quick_accounts)) {
          setQuickAccounts(d.settings_map.quick_accounts);
        }
      } else if (Array.isArray(d?.settings)) {
        // Fallback: parse from raw settings array
        for (const s of d.settings) {
          if (s.key === 'quick_login_enabled') {
            const val = String(s.value).toLowerCase().trim();
            setQuickLoginEnabled(val === 'true' || val === '1' || val === 'yes' || val === 'on');
          }
          if (s.key === 'quick_accounts') {
            try {
              const parsed = JSON.parse(s.value);
              if (Array.isArray(parsed)) setQuickAccounts(parsed);
            } catch (_) { /* ignore malformed JSON */ }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load system settings', err);
      showToast(err.response?.data?.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Toggle quick login ─────────────────────────────────────────────────────
  const handleToggleQuickLogin = async () => {
    const nextVal = !quickLoginEnabled;
    setQuickLoginEnabled(nextVal); // optimistic
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
      setQuickLoginEnabled(!nextVal); // revert
      showToast(err.response?.data?.message || 'Failed to update setting.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // ── Save the full accounts array to backend ────────────────────────────────
  const saveAccounts = async (updatedAccounts) => {
    await api.post('/system/settings', {
      key: 'quick_accounts',
      value: updatedAccounts,
    });
    setQuickAccounts(updatedAccounts);
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = () => setModal({ mode: 'add', index: null, form: { ...BLANK_ACCOUNT } });
  const openEdit = (idx) => setModal({ mode: 'edit', index: idx, form: { ...quickAccounts[idx] } });
  const closeModal = () => { if (!modalSaving) setModal(null); };

  const handleFormChange = (field, value) => {
    setModal((prev) => ({ ...prev, form: { ...prev.form, [field]: value } }));
  };

  const handleModalSave = async () => {
    const { mode, index, form } = modal;
    if (!form.title.trim() || !form.email.trim() || !form.password.trim()) {
      showToast('Title, email and password are required.', 'error');
      return;
    }
    try {
      setModalSaving(true);
      let updated;
      if (mode === 'add') {
        updated = [...quickAccounts, { title: form.title.trim(), email: form.email.trim(), password: form.password.trim(), role: form.role }];
      } else {
        updated = quickAccounts.map((a, i) =>
          i === index ? { title: form.title.trim(), email: form.email.trim(), password: form.password.trim(), role: form.role } : a
        );
      }
      await saveAccounts(updated);
      showToast(mode === 'add' ? 'Account added successfully.' : 'Account updated successfully.', 'success');
      setModal(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save account.', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (idx) => {
    try {
      setUpdating(true);
      const updated = quickAccounts.filter((_, i) => i !== idx);
      await saveAccounts(updated);
      showToast('Account removed.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account.', 'error');
    } finally {
      setUpdating(false);
      setDeleteConfirm(null);
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

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                  {modal.mode === 'add' ? 'Add Quick Login Account' : 'Edit Quick Login Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={modalSaving}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={modal.form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="e.g. Admin, Student 1"
                  className="custom-input w-full"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                  Email *
                </label>
                <input
                  type="email"
                  value={modal.form.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="e.g. admin@bitsathy.ac.in"
                  className="custom-input w-full"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                  Password *
                </label>
                <input
                  type="text"
                  value={modal.form.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  placeholder="e.g. password"
                  className="custom-input w-full"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                  Role
                </label>
                <select
                  value={modal.form.role}
                  onChange={(e) => handleFormChange('role', e.target.value)}
                  className="custom-input w-full"
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 p-5 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={closeModal}
                disabled={modalSaving}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSave}
                disabled={modalSaving}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
              >
                {modalSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{modalSaving ? 'Saving...' : 'Save Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[var(--text-primary)]">Remove Account</p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Remove <strong>{quickAccounts[deleteConfirm]?.title}</strong> from quick logins?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="btn text-xs py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white border border-rose-600 rounded-[var(--radius-sm)] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
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
            System &amp; Feature Settings
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
            {/* Quick Login Toggle Card */}
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

                {/* Toggle Switch */}
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
                    {quickLoginEnabled ? 'Live on Login Page' : 'Hidden from Login Page'}
                  </strong>
                  <p className="text-[11px] leading-relaxed">
                    {quickLoginEnabled
                      ? 'Students, faculty, and assessors visiting /login will see 1-click test cards below the main login form.'
                      : 'The Quick Demo Accounts section is hidden from /login. Users must authenticate with their registered email/password or Google account.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Accounts CRUD Card */}
            <div className="panel-card p-6 border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-sm space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Shield className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      Quick Login Accounts
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-muted)]">
                      {quickAccounts.length} configured
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Add, edit or remove accounts shown in the quick 1-click login section.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/login"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <span>View Login</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={openAdd}
                    disabled={updating}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Account</span>
                  </button>
                </div>
              </div>

              {/* Accounts Grid */}
              {quickAccounts.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-[var(--border)] rounded-[var(--radius-sm)]">
                  <Zap className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                  <p className="text-[12px] text-[var(--text-muted)]">No quick login accounts configured.</p>
                  <button
                    type="button"
                    onClick={openAdd}
                    className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    + Add your first account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickAccounts.map((acc, idx) => {
                    const role = (acc.role || '').toLowerCase();
                    const { icon: Icon, badge } = ROLE_META[role] || FALLBACK_META;
                    return (
                      <div
                        key={`${acc.email}-${idx}`}
                        className={`p-3 rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] flex items-center justify-between gap-3 transition-opacity group ${
                          quickLoginEnabled ? 'opacity-100' : 'opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-full border shrink-0 ${badge}`}>
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                            {acc.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEdit(idx)}
                            title="Edit account"
                            className="p-1.5 rounded hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(idx)}
                            title="Remove account"
                            className="p-1.5 rounded hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-[var(--text-muted)] hover:text-rose-500 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* System Overview Sidebar */}
          <div className="space-y-6">
            {/* System Status Panel */}
            <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[12px] font-mono font-bold text-[var(--text-primary)]">
                <Server className="w-4 h-4 text-[var(--accent)]" />
                <span>System Health &amp; Status</span>
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

                <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">Quick Accounts</span>
                  <span className="text-[var(--text-primary)] font-bold">{quickAccounts.length} accounts</span>
                </div>
              </div>
            </div>

            {/* Permission Scope Notice */}
            <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-mono font-bold text-[var(--text-primary)]">
                <Shield className="w-4 h-4 text-[var(--accent)]" />
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
