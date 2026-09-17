import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Server,
  HardDrive,
  Layers,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  FileCode2,
  Sliders,
  Terminal,
  Activity,
  ArrowDownToLine,
  Table as TableIcon
} from 'lucide-react';
import api from '../api/axios';

export default function AdminBackup() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [message, setMessage] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/backup/stats');
      if (res.data?.data) {
        setStats(res.data.data);
        // Default select all tables
        if (res.data.data.tables) {
          setSelectedTables(res.data.data.tables.map(t => t.name));
        }
      }
    } catch (err) {
      console.error('Failed to fetch DB stats:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to fetch database stats.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownload = async (isFull = true) => {
    setDownloading(true);
    setMessage(null);
    try {
      let url = '/admin/backup/dump';
      if (!isFull && selectedTables.length > 0) {
        url += `?tables=${selectedTables.join(',')}`;
      }

      const response = await api.get(url, {
        responseType: 'blob',
      });

      // Extract filename or fallback
      let filename = `mockmate_backup_${new Date().toISOString().slice(0,10)}.sql`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Trigger browser download
      const blob = new Blob([response.data], { type: 'application/sql' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setMessage({
        type: 'success',
        text: `Successfully downloaded SQL backup: ${filename}`
      });
    } catch (err) {
      console.error('Download error:', err);
      setMessage({
        type: 'error',
        text: 'Failed to generate and download SQL dump.'
      });
    } finally {
      setDownloading(false);
    }
  };

  const toggleTable = (tableName) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const toggleAllTables = () => {
    if (!stats?.tables) return;
    if (selectedTables.length === stats.tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(stats.tables.map(t => t.name));
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredTables = stats?.tables?.filter(t =>
    t.name.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  const cliSnippets = [
    {
      title: 'Full Docker mysqldump (WSL / Linux Host)',
      cmd: 'docker exec mockmate-mysql-primary mysqldump -uroot -pjaison --routines --triggers --single-transaction mock_mate > ./mockmate_backup_$(date +%Y%m%d_%H%M%S).sql',
      desc: 'Creates a clean, consistent snapshot dump directly on the host machine.'
    },
    {
      title: 'Restore Database from .sql Dump File',
      cmd: 'docker exec -i mockmate-mysql-primary mysql -uroot -pjaison mock_mate < ./mockmate_backup.sql',
      desc: 'Restores the database state from an existing backup dump file.'
    },
    {
      title: 'Monitor Failover Manager & Replica Cluster Health',
      cmd: 'docker logs mockmate-failover-manager --tail 25 -f',
      desc: 'Streams real-time heartbeat and replication topology status.'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[var(--accent-dim)] rounded-xl border border-[var(--border-accent)] text-[var(--accent)] shadow-inner">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Database Backup & SQL Dump
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Live database metrics, cluster health monitoring, and one-click instant SQL dump backups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-hover)] text-sm font-medium text-[var(--text-primary)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleDownload(true)}
            disabled={downloading || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? 'Exporting SQL...' : 'Download Full SQL Dump'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3 text-sm font-medium">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Database Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Database Name & Engine */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
              Active Database
            </span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {stats?.database || 'mock_mate'}
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 mt-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              MySQL 8.0 Cluster
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
            <Server className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Tables */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
              Total Tables
            </span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {loading ? '...' : stats?.total_tables || 0}
            </h3>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">
              Relational schemas
            </span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Records */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
              Total Records
            </span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {loading ? '...' : (stats?.total_rows ?? 0).toLocaleString()}
            </h3>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">
              Live table rows
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Estimated Storage Size */}
        <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
              Data Storage Size
            </span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {loading ? '...' : stats?.data_size_human || '0 B'}
            </h3>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">
              Data & Index length
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Cluster Nodes & Replication Architecture Info */}
      <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            High-Availability 3-Node Cluster Topology
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Primary Node (Master)</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">RW (Writes)</span>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)] mt-2">
              Container: <span className="font-bold text-[var(--text-primary)]">mockmate-mysql-primary</span> (Port 3306)
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Real-time binary log replication source with auto-failover daemon monitoring.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Replica Node 1</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">RO (Reads)</span>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)] mt-2">
              Container: <span className="font-bold text-[var(--text-primary)]">mockmate-mysql-replica-1</span> (Port 3307)
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Synchronized via GTID. Candidate node for instant master promotion on failover.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-purple-600 dark:text-purple-400">Replica Node 2</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500 text-white">RO (Reads)</span>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)] mt-2">
              Container: <span className="font-bold text-[var(--text-primary)]">mockmate-mysql-replica-2</span> (Port 3308)
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Secondary read replica balancing query loads and redundant cluster parity.
            </p>
          </div>
        </div>
      </div>

      {/* Selective Table Export Section */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-[var(--accent)]" />
              Selective Table Export
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Choose specific database tables to include in your customized SQL dump
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search tables..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={toggleAllTables}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
            >
              {selectedTables.length === stats?.tables?.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => handleDownload(false)}
              disabled={downloading || selectedTables.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent)] hover:opacity-90 text-white disabled:opacity-40 shadow-sm"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Export Selected ({selectedTables.length})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/50 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={stats?.tables && selectedTables.length === stats.tables.length}
                    onChange={toggleAllTables}
                    className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Table Name</th>
                <th className="py-3 px-4 text-right">Row Count</th>
                <th className="py-3 px-4 text-right">Approx. Size</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs font-ui">
              {filteredTables.map((table) => {
                const isSelected = selectedTables.includes(table.name);
                return (
                  <tr
                    key={table.name}
                    onClick={() => toggleTable(table.name)}
                    className={`hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent-dim)]/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTable(table.name)}
                        className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--text-primary)]">
                      {table.name}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--text-primary)]">
                      {table.row_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {(table.size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Ready
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredTables.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No matching database tables found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLI Disaster Recovery Snippets */}
      <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Command-Line & Disaster Recovery Reference
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          You can also run backup and restoration commands directly in WSL or Docker host terminal:
        </p>

        <div className="space-y-3">
          {cliSnippets.map((snippet, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] relative group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {snippet.title}
                </span>
                <button
                  onClick={() => copyToClipboard(snippet.cmd, idx)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{snippet.desc}</p>
              <pre className="font-mono text-xs p-3 rounded-lg bg-[var(--bg-card)] text-amber-500 overflow-x-auto border border-[var(--border)]">
                {snippet.cmd}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
