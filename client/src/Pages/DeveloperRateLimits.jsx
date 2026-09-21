import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Sliders,
  RotateCcw,
  Check,
  Server,
  Users,
  Key,
  ShieldCheck,
  Database,
  Terminal,
  Lock
} from 'lucide-react';
import api from '../api/axios';

export default function DeveloperRateLimits() {
  const [loading, setLoading] = useState(true);
  const [redisStatus, setRedisStatus] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Reset counters state
  const [resetting, setResetting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/developer/rate-limits');
      const data = res?.data || res;
      setRedisStatus(data.redis || null);
      setConfigs(Array.isArray(data.configs) ? data.configs : []);
      setTotalBlocked(data.total_blocked || 0);
    } catch (err) {
      console.error('Failed to load rate limit configs:', err);
      showToast(err.response?.data?.message || 'Failed to fetch rate limiting configurations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      requests_per_minute: item.requests_per_minute,
      burst_limit: item.burst_limit,
      window_seconds: item.window_seconds,
      enabled: item.enabled,
      action_on_exceed: item.action_on_exceed,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveConfig = async (id) => {
    try {
      setSavingId(id);
      const res = await api.put(`/developer/rate-limits/${id}`, editForm);
      showToast(res.message || 'Rate limit rule updated successfully!');
      setEditingId(null);
      fetchConfigs();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update rate limit configuration', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleEnable = async (item) => {
    try {
      setSavingId(item.id);
      const res = await api.put(`/developer/rate-limits/${item.id}`, {
        enabled: !item.enabled,
      });
      showToast(`Rate limit for '${item.scope}' ${!item.enabled ? 'enabled' : 'disabled'}`);
      fetchConfigs();
    } catch (err) {
      showToast('Failed to toggle rate limit status', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetCounters = async () => {
    if (!window.confirm('Are you sure you want to flush all active Redis rate limit window keys and counters?')) return;
    try {
      setResetting(true);
      const res = await api.post('/developer/rate-limits/reset-counters');
      showToast(res.message || 'Redis rate limit counters reset successfully!');
      fetchConfigs();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset Redis rate limit counters', 'error');
    } finally {
      setResetting(false);
    }
  };

  const getScopeBadgeStyle = (scope) => {
    switch (scope) {
      case 'no_auth':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'student':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/30';
      case 'faculty':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'admin':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'developer':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'no_auth':
        return <Lock className="w-4 h-4 text-rose-500" />;
      case 'student':
        return <Users className="w-4 h-4 text-sky-500" />;
      case 'faculty':
        return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <Key className="w-4 h-4 text-purple-500" />;
      case 'developer':
        return <Terminal className="w-4 h-4 text-emerald-500" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slideUp ${
          toast.type === 'error' ? 'bg-rose-500 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase">
              DEVELOPER SYSTEM INFRASTRUCTURE
            </span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Rate Limiting & Traffic Throttling Engine</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-2xl">
            Configure Redis-backed sliding window rate limit rules by user role (Student, Faculty, Admin, Developer) and unauthenticated endpoints (Login, Register).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCounters}
            disabled={resetting || !redisStatus?.available}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Flush Redis Counters</span>
          </button>

          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats & Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Redis Connection Status */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Redis Cache & Engine</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${redisStatus?.available ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <span className="text-base font-bold text-[var(--text-primary)] font-mono">
              {redisStatus?.available ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">
            {redisStatus?.available
              ? `${redisStatus.host}:${redisStatus.port} • Ping: ${redisStatus.ping_ms}ms`
              : redisStatus?.error_message || 'Fail-open mode active'}
          </p>
        </div>

        {/* Total Throttled Requests */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Blocked Requests</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-500 font-mono">
            {totalBlocked.toLocaleString()}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            HTTP 429 Too Many Requests issued
          </p>
        </div>

        {/* Configured Rules */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Active Limit Rules</span>
            <Sliders className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            {configs.filter(c => c.enabled).length} / {configs.length}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Active role & unauthenticated scopes
          </p>
        </div>

        {/* Engine Algorithm */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Limiting Algorithm</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-sm font-bold text-purple-500 font-mono">
            Sliding Window
          </p>
          <p className="text-[11px] text-[var(--text-muted)] font-mono">
            Atomic Redis Sorted Set (ZSET)
          </p>
        </div>
      </div>

      {/* Configured Rate Limit Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase font-mono tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--accent)]" />
            <span>Configured Scope Rate Limit Rules</span>
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            Changes apply dynamically without server restart
          </span>
        </div>

        {configs.map((item) => {
          const isEditing = editingId === item.id;
          const isSaving = savingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-5 bg-[var(--bg-card)] border rounded-2xl shadow-xs transition-all space-y-4 ${
                !item.enabled
                  ? 'opacity-60 border-[var(--border)]'
                  : item.scope === 'no_auth'
                  ? 'border-rose-500/30 hover:border-rose-500/60'
                  : 'border-[var(--border)] hover:border-[var(--accent)]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] shrink-0">
                    {getScopeIcon(item.scope)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {item.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getScopeBadgeStyle(item.scope)}`}>
                        {item.scope}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggleEnable(item)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    item.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      item.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Edit Form vs View Mode */}
              {isEditing ? (
                <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                        Requests / Minute (RPM)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={editForm.requests_per_minute}
                        onChange={(e) => setEditForm({ ...editForm, requests_per_minute: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                        Burst Capacity Tokens
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2000"
                        value={editForm.burst_limit}
                        onChange={(e) => setEditForm({ ...editForm, burst_limit: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                        Window Duration (Seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={editForm.window_seconds}
                        onChange={(e) => setEditForm({ ...editForm, window_seconds: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Exceed Enforcement Action
                    </label>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name={`action_${item.id}`}
                          value="block"
                          checked={editForm.action_on_exceed === 'block'}
                          onChange={(e) => setEditForm({ ...editForm, action_on_exceed: e.target.value })}
                          className="text-rose-500 focus:ring-rose-500"
                        />
                        <span>Block Request (HTTP 429 Too Many Requests)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name={`action_${item.id}`}
                          value="log_only"
                          checked={editForm.action_on_exceed === 'log_only'}
                          onChange={(e) => setEditForm({ ...editForm, action_on_exceed: e.target.value })}
                          className="text-amber-500 focus:ring-amber-500"
                        />
                        <span>Log Only (Monitor & Audit)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveConfig(item.id)}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save Rule</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 font-mono">
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase">RPM Limit</span>
                      <span className="font-bold text-[var(--text-primary)] text-sm">{item.requests_per_minute} req/min</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase">Burst Tokens</span>
                      <span className="font-bold text-sky-500 text-sm">+{item.burst_limit} burst</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase">Time Window</span>
                      <span className="font-bold text-[var(--text-primary)] text-sm">{item.window_seconds}s</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase">Enforcement</span>
                      <span className={`font-bold text-xs uppercase px-1.5 py-0.5 rounded ${
                        item.action_on_exceed === 'block' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {item.action_on_exceed}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartEdit(item)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer shrink-0 self-end sm:self-center"
                  >
                    Edit Rule
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

