import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Activity,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  Layers,
  ChevronRight,
  Eye,
  Copy,
  Check,
  X,
  Trash2,
  Shield,
  User,
  Globe,
  Sliders,
  Calendar,
  Code2,
  Database,
  ArrowUpDown,
  Download,
  Flame,
  Radio
} from 'lucide-react';
import api from '../api/axios';

const HTTP_METHODS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const STATUS_FILTERS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: '2xx Success', value: '2xx' },
  { label: '4xx Client Error', value: '4xx' },
  { label: '5xx Server Error', value: '5xx' },
];

const ROLE_FILTERS = [
  { label: 'All Roles', value: 'ALL' },
  { label: 'Student', value: 'student' },
  { label: 'Admin', value: 'admin' },
  { label: 'Developer', value: 'developer' },
];

export default function DeveloperAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Live Auto-Refresh (5s)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Slide-over inspection drawer
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Clear modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDays, setClearDays] = useState('0');
  const [clearing, setClearing] = useState(false);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/developer/audit-logs/stats');
      if (res && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('[AuditLogs] Stats fetch warning:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.append('search', search.trim());
      if (selectedMethod !== 'ALL') params.append('method', selectedMethod);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await api.get(`/developer/audit-logs?${params.toString()}`);
      if (res && res.logs) {
        setLogs(res.logs || []);
        setTotalLogs(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('[AuditLogs] Fetch logs error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [page, limit, search, selectedMethod, selectedStatus, selectedRole, fromDate, toDate]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  // Auto-refresh interval (5s)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs(true);
      fetchStats();
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs, fetchStats]);

  // Copy helper
  const handleCopy = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      setClearing(true);
      await api.delete(`/developer/audit-logs/clear?older_than_days=${clearDays}`);
      setShowClearModal(false);
      fetchStats();
      fetchLogs();
    } catch (err) {
      alert('Failed to clear logs: ' + (err.response?.data?.message || err.message));
    } finally {
      setClearing(false);
    }
  };

  // Inspect specific log
  const handleInspectLog = (log) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const formatJson = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(val);
    }
  };

  const getMethodBadgeStyle = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'POST':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadgeStyle = (code) => {
    if (code >= 200 && code < 300) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    } else if (code >= 300 && code < 400) {
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
    } else if (code >= 400 && code < 500) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    } else if (code >= 500) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  };

  const getLatencyStyle = (ms) => {
    if (ms < 100) return 'text-emerald-500';
    if (ms < 400) return 'text-blue-500';
    if (ms < 1000) return 'text-amber-500';
    return 'text-rose-500 font-bold';
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & TELEMETRY CONTROLS */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Developer Audit Logs & API Telemetry
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Stream
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Real-time capture of all HTTP methods, request payloads, responses, queries, callers, and latency.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Live Toggle, Refresh, Clear Logs */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Live Auto-Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle 5-second automatic telemetry polling"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-500' : ''}`} />
            <span>{autoRefresh ? 'Auto 5s ON' : 'Auto Paused'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => {
              fetchStats();
              fetchLogs();
            }}
            disabled={loading}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Clear Logs Button */}
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="btn text-xs py-1.5 px-3 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer shadow-xs font-bold"
            title="Clear or prune old audit logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Logs</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. REAL-TIME KPI ANALYTICS METRICS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Requests */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Captured</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {stats?.total_requests !== undefined ? Number(stats.total_requests).toLocaleString() : '—'}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            {totalLogs} filtered results
          </p>
        </div>

        {/* Card 2: 2xx Success */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-emerald-500">2xx Successes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats?.success_count !== undefined ? Number(stats.success_count).toLocaleString() : '—'}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            {stats?.total_requests ? `${Math.round((stats.success_count / stats.total_requests) * 100)}% reliability` : '100%'}
          </p>
        </div>

        {/* Card 3: 4xx Client Errors */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-500">4xx Client Errors</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {stats?.client_errors !== undefined ? Number(stats.client_errors).toLocaleString() : '—'}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            Validation / 404 / 401
          </p>
        </div>

        {/* Card 4: 5xx Server Failures */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-rose-500">5xx Server Failures</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {stats?.server_errors !== undefined ? Number(stats.server_errors).toLocaleString() : '—'}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            Exceptions & 500s
          </p>
        </div>

        {/* Card 5: Average Latency */}
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-purple-500">Avg Latency</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {stats?.avg_latency_ms !== undefined ? `${Math.round(stats.avg_latency_ms)} ms` : '—'}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-muted)]">
            HTTP response timing
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SEARCH & ADVANCED MULTI-DIMENSIONAL FILTERS */}
      {/* ============================================================ */}
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-3.5">
        {/* Row 1: Search Input & Date Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by endpoint path, query parameter, user email, caller IP, payload..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value} className="bg-[var(--bg-card)]">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Role Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {ROLE_FILTERS.map((r) => (
                <option key={r.value} value={r.value} className="bg-[var(--bg-card)]">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Method Filter Chips */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase mr-1">Method:</span>
            {HTTP_METHODS.map((method) => {
              const isSelected = selectedMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  {method}
                </button>
              );
            })}
          </div>

          {/* Result counter and auto-sync badge */}
          <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2">
            <span>Showing {logs.length} of {totalLogs} logs</span>
            <span>•</span>
            <span>Refreshed: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. AUDIT LOGS INTERACTIVE TABLE */}
      {/* ============================================================ */}
      <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-3 font-bold">Method</th>
                <th className="py-3 px-3 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Endpoint Path & Query</th>
                <th className="py-3 px-3 font-bold">Latency</th>
                <th className="py-3 px-4 font-bold">Caller / Identity</th>
                <th className="py-3 px-3 font-bold">Client IP</th>
                <th className="py-3 px-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono text-[12px]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-[var(--text-muted)]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--accent)]" />
                    <span>Loading HTTP audit trail...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-[var(--text-muted)] space-y-2">
                    <Terminal className="w-8 h-8 mx-auto opacity-30 text-[var(--accent)]" />
                    <p className="font-bold text-[var(--text-primary)]">No Audit Logs Found</p>
                    <p className="text-xs max-w-sm mx-auto">
                      No incoming HTTP requests match your current filters or query criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const methodBadge = getMethodBadgeStyle(log.method);
                  const statusBadge = getStatusBadgeStyle(log.status_code);
                  const latencyStyle = getLatencyStyle(log.latency_ms);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => handleInspectLog(log)}
                      className="hover:bg-[var(--bg-raised)]/70 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap text-[11px]">
                        {formatTimestamp(log.created_at)}
                      </td>

                      {/* Method Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${methodBadge}`}>
                          {log.method}
                        </span>
                      </td>

                      {/* Status Code */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge}`}>
                          {log.status_code}
                        </span>
                      </td>

                      {/* Path & Query */}
                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)] max-w-xs sm:max-w-md truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate group-hover:text-[var(--accent)] transition-colors">
                            {log.path}
                          </span>
                          {log.query && (
                            <span className="text-[10px] text-[var(--text-muted)] truncate">
                              ?{log.query}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Latency */}
                      <td className={`py-3 px-3 whitespace-nowrap font-bold text-[11px] ${latencyStyle}`}>
                        {log.latency_ms} ms
                      </td>

                      {/* Caller / Identity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.user_email ? (
                          <div className="space-y-0.5">
                            <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[160px]">
                              {log.user_email}
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)] uppercase font-bold">
                              {log.user_role || 'user'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)] italic">
                            Anonymous / Public
                          </span>
                        )}
                      </td>

                      {/* Client IP */}
                      <td className="py-3 px-3 text-[var(--text-muted)] whitespace-nowrap text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* Action / Inspect */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectLog(log);
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--bg-raised)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3 text-xs font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-0.5 text-xs text-[var(--text-primary)] cursor-pointer"
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 cursor-pointer font-bold"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 cursor-pointer font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. SLIDE-OVER INSPECTION DRAWER (REQUEST & RESPONSE PAYLOADS) */}
      {/* ============================================================ */}
      {drawerOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border-l border-[var(--border)] h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getMethodBadgeStyle(selectedLog.method)}`}>
                  {selectedLog.method}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getStatusBadgeStyle(selectedLog.status_code)}`}>
                  HTTP {selectedLog.status_code}
                </span>
                <span className="font-mono font-bold text-sm text-[var(--text-primary)] truncate">
                  {selectedLog.path}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 font-mono text-xs">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg-raised)]/60 border border-[var(--border)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Execution Latency</span>
                  <div className={`text-sm font-bold ${getLatencyStyle(selectedLog.latency_ms)}`}>
                    {selectedLog.latency_ms} milliseconds
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Captured Timestamp</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {formatFullDate(selectedLog.created_at)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Client IP Address</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {selectedLog.ip_address || '127.0.0.1'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Caller Account</span>
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {selectedLog.user_email || 'Anonymous Public'} {selectedLog.user_role ? `(${selectedLog.user_role})` : ''}
                  </div>
                </div>
              </div>

              {/* Full Request URL & Query Parameters */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Target Endpoint & Query Params
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('url', selectedLog.query ? `${selectedLog.path}?${selectedLog.query}` : selectedLog.path)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'url' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-primary)] break-all select-all">
                  <span className="font-bold">{selectedLog.method}</span> {selectedLog.path}
                  {selectedLog.query && <span className="text-blue-500">?{selectedLog.query}</span>}
                </div>
              </div>

              {/* Request Body Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Request Body Payload
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                      {selectedLog.request_body ? `${selectedLog.request_body.length} chars` : 'Empty'}
                    </span>
                  </div>
                  {selectedLog.request_body && (
                    <button
                      type="button"
                      onClick={() => handleCopy('req', selectedLog.request_body)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'req' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'req' ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  )}
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] overflow-x-auto max-h-56 select-all shadow-xs">
                  <pre className="text-[11px] font-mono leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-all">
                    {selectedLog.request_body ? (
                      formatJson(selectedLog.request_body)
                    ) : (
                      <span className="text-[var(--text-muted)] italic font-mono">// No request payload (GET / Empty body)</span>
                    )}
                  </pre>
                </div>
              </div>

              {/* Response Body Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Response Body Output
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                      {selectedLog.response_body ? `${selectedLog.response_body.length} chars` : 'Empty'}
                    </span>
                  </div>
                  {selectedLog.response_body && (
                    <button
                      type="button"
                      onClick={() => handleCopy('resp', selectedLog.response_body)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'resp' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'resp' ? 'Copied' : 'Copy Output'}</span>
                    </button>
                  )}
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] overflow-x-auto max-h-64 select-all shadow-xs">
                  <pre className="text-[11px] font-mono leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-all">
                    {selectedLog.response_body ? (
                      formatJson(selectedLog.response_body)
                    ) : (
                      <span className="text-[var(--text-muted)] italic font-mono">// Empty response body</span>
                    )}
                  </pre>
                </div>
              </div>

              {/* Error Message banner if any */}
              {selectedLog.error_message && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
                  <span className="font-bold uppercase text-[10px]">Server Context Error</span>
                  <p className="text-[11px] break-all">{selectedLog.error_message}</p>
                </div>
              )}

              {/* User Agent */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">User-Agent Header</span>
                <p className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-raised)] p-2 rounded border border-[var(--border)] break-all">
                  {selectedLog.user_agent || 'Unknown / cURL / Fetch'}
                </p>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-[var(--bg-raised)] border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="btn btn-secondary text-xs py-1.5 px-4 font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. PURGE LOGS MODAL */}
      {/* ============================================================ */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-4 font-sans">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Purge Audit Log History</h3>
                <p className="text-xs text-[var(--text-muted)]">Remove stored HTTP audit trail from database</p>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <label className="text-[var(--text-secondary)] font-bold">Purge Criteria:</label>
              <select
                value={clearDays}
                onChange={(e) => setClearDays(e.target.value)}
                className="w-full p-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs text-[var(--text-primary)] cursor-pointer"
              >
                <option value="0">Purge ALL Logs Completely</option>
                <option value="1">Purge Logs older than 24 hours</option>
                <option value="7">Purge Logs older than 7 days</option>
                <option value="30">Purge Logs older than 30 days</option>
              </select>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              ⚠️ This operation permanently removes historical telemetry records. Live logging will continue uninterrupted.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="btn btn-secondary text-xs py-1.5 px-3.5 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={clearing}
                className="btn text-xs py-1.5 px-4 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {clearing ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
