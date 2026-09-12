import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Users,
  Shield,
  ShieldAlert,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  Filter
} from 'lucide-react';
import api from '../api/axios';

export default function AdminInterviewHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'in_progress' | 'completed'

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/interviews/sessions');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSessions(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch interview history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRowClick = (sessionId) => {
    navigate(`/admin/history/${sessionId}`);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startStr, endStr) => {
    if (!startStr) return '—';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();
    const diffSecs = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesStatus =
      statusFilter === 'ALL' ? true : s.status === statusFilter;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      s.track_title?.toLowerCase().includes(query) ||
      s.level_name?.toLowerCase().includes(query) ||
      s.interviewer?.name?.toLowerCase().includes(query) ||
      s.interviewer?.roll_no?.toLowerCase().includes(query) ||
      s.interviewer?.email?.toLowerCase().includes(query) ||
      s.interviewee?.name?.toLowerCase().includes(query) ||
      s.interviewee?.roll_no?.toLowerCase().includes(query) ||
      s.interviewee?.email?.toLowerCase().includes(query) ||
      String(s.id).includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <History className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Audit & Monitoring Portal</span>
          </div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            Interview History & Pairing Records
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            View all peer-to-peer interview sessions, student participant identities, durations, and role switch history. Click any row to view full details.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="panel-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, email, or domain..."
            className="custom-input search-input text-[12px] py-2"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-raised)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)] self-start md:self-auto">
          {[
            { id: 'ALL', label: 'All Sessions' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-bold shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[13px] font-medium">{error}</p>
        </div>
      )}

      {/* Sessions Table */}
      {loading ? (
        <div className="panel-card p-14 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-[13px] text-[var(--text-muted)]">Loading interview session records...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="panel-card p-12 text-center space-y-2">
          <History className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">No interview sessions found</h3>
          <p className="text-[13px] text-[var(--text-muted)]">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try changing your search query or filter.'
              : 'Students have not started any peer mock interviews yet.'}
          </p>
        </div>
      ) : (
        <div className="panel-card overflow-hidden border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-3 px-4">Room #</th>
                  <th className="py-3 px-4">Domain & Mode</th>
                  <th className="py-3 px-4">Student A</th>
                  <th className="py-3 px-4">Student B</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started / Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[13px]">
                {filteredSessions.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleRowClick(s.id)}
                      className="hover:bg-[var(--bg-hover)]/70 transition-colors cursor-pointer group"
                    >
                      {/* Session ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--accent)]">
                        #{s.id}
                      </td>

                      {/* Domain & Level Mode */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {s.track_title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                              {s.level_mode}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                              L{s.level_number}: {s.level_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Student A */}
                      <td className="py-3.5 px-4">
                        {s.interviewer ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-[9px] font-bold font-mono flex items-center justify-center shrink-0">
                                A
                              </span>
                              <span className="font-semibold text-[var(--text-primary)]">
                                {s.interviewer.name}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-[var(--text-muted)]">
                              {s.interviewer.roll_no ? `${s.interviewer.roll_no} • ` : ''}{s.interviewer.department || s.interviewer.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Student B */}
                      <td className="py-3.5 px-4">
                        {s.interviewee ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[var(--green-bg)] border border-[var(--green)]/30 text-[var(--green)] text-[9px] font-bold font-mono flex items-center justify-center shrink-0">
                                B
                              </span>
                              <span className="font-semibold text-[var(--text-primary)]">
                                {s.interviewee.name}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-[var(--text-muted)]">
                              {s.interviewee.roll_no ? `${s.interviewee.roll_no} • ` : ''}{s.interviewee.department || s.interviewee.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded ${
                            s.status === 'in_progress'
                              ? 'bg-[var(--green-bg)] text-[var(--green)]'
                              : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
                          }`}>
                            {s.status === 'in_progress' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                            )}
                            <span>{s.status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED'}</span>
                          </span>

                          {s.has_security_report && (
                            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3" />
                              <span>IDENTITY SOLICITED</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Started / Duration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px] font-mono">
                          <p className="text-[var(--text-primary)]">{formatDateTime(s.started_at)}</p>
                          <p className="text-[var(--text-muted)]">
                            Duration: {calculateDuration(s.started_at, s.ended_at)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
