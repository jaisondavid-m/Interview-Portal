import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Users,
  Shield,
  Award,
  Clock,
  Repeat,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Loader2,
  Calendar,
  Filter,
  Eye,
  GraduationCap
} from 'lucide-react';
import api from '../api/axios';

export default function AdminInterviewHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'in_progress' | 'completed'
  const [selectedSession, setSelectedSession] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [detailedSession, setDetailedSession] = useState(null);

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

  const openSessionDetail = async (session) => {
    setSelectedSession(session);
    setModalLoading(true);
    try {
      const res = await api.get(`/admin/interviews/sessions/${session.id}`);
      const data = res?.data || res;
      setDetailedSession(data);
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const closeSessionDetail = () => {
    setSelectedSession(null);
    setDetailedSession(null);
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
            View all peer-to-peer interview sessions, student participant identities, durations, and role switch history.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 self-start md:self-auto"
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
              className={`text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] transition-all ${
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
                  <th className="py-3 px-4">Switches</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started / Duration</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[13px]">
                {filteredSessions.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openSessionDetail(s)}
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

                      {/* Role Switches */}
                      <td className="py-3.5 px-4 font-mono text-[12px]">
                        {s.switch_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)] font-bold">
                            <Repeat className="w-3 h-3" />
                            <span>{s.switch_count}x</span>
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
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
                      </td>

                      {/* Started / Duration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px] font-mono">
                          <p className="text-[var(--text-primary)]">{formatDateTime(s.started_at)}</p>
                          <p className="text-[var(--text-muted)]">
                            ⏱ {calculateDuration(s.started_at, s.ended_at)}
                          </p>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSessionDetail(s);
                          }}
                          className="btn btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SESSION INSPECTION DETAIL MODAL */}
      {/* ============================================================ */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="panel-card w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-xl)] rounded-[var(--radius-lg)] p-6 space-y-6 animate-fadeIn custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  <span>Room Inspection</span>
                  <span>•</span>
                  <span className="font-bold text-[var(--accent)]">Session #{selectedSession.id}</span>
                </div>
                <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                  {selectedSession.track_title}
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Level {selectedSession.level_number}: {selectedSession.level_name} ({selectedSession.level_mode?.toUpperCase()} Mode)
                </p>
              </div>

              <button
                onClick={closeSessionDetail}
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
                <p className="text-[13px] text-[var(--text-muted)]">Loading meeting breakdown...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Meeting Metadata Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--bg-raised)] p-3 rounded-[var(--radius-sm)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Status</span>
                    <span className={`text-[12px] font-bold font-mono ${selectedSession.status === 'in_progress' ? 'text-[var(--green)]' : 'text-[var(--text-primary)]'}`}>
                      {selectedSession.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-[var(--bg-raised)] p-3 rounded-[var(--radius-sm)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Total Duration</span>
                    <span className="text-[12px] font-bold font-mono text-[var(--text-primary)]">
                      {calculateDuration(selectedSession.started_at, selectedSession.ended_at)}
                    </span>
                  </div>

                  <div className="bg-[var(--bg-raised)] p-3 rounded-[var(--radius-sm)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Role Switches</span>
                    <span className="text-[12px] font-bold font-mono text-[var(--accent)]">
                      {selectedSession.switch_count || 0} times
                    </span>
                  </div>

                  <div className="bg-[var(--bg-raised)] p-3 rounded-[var(--radius-sm)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Category</span>
                    <span className="text-[12px] font-bold text-[var(--text-primary)]">
                      {selectedSession.track_category || 'Technical'}
                    </span>
                  </div>
                </div>

                {/* Participant Details Comparison */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                    <span>Meeting Student Participants</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student A */}
                    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-accent)] bg-[var(--accent-dim)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Student A</span>
                        </span>
                        <span className="text-[10px] font-mono bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border)] font-bold">
                          Peer 1
                        </span>
                      </div>

                      {selectedSession.interviewer ? (
                        <div className="space-y-1">
                          <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                            {selectedSession.interviewer.name}
                          </h4>
                          <p className="text-[12px] font-mono text-[var(--text-secondary)]">
                            📧 {selectedSession.interviewer.email}
                          </p>
                          <p className="text-[12px] font-mono text-[var(--text-secondary)]">
                            🆔 Roll: {selectedSession.interviewer.roll_no || 'N/A'}
                          </p>
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            🏛 Dept: {selectedSession.interviewer.department || 'Not specified'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[13px] text-[var(--text-muted)] italic">No student profile.</p>
                      )}
                    </div>

                    {/* Student B */}
                    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--green)]/30 bg-[var(--green-bg)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--green)]">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Student B</span>
                        </span>
                        <span className="text-[10px] font-mono bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border)] font-bold">
                          Peer 2
                        </span>
                      </div>

                      {selectedSession.interviewee ? (
                        <div className="space-y-1">
                          <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                            {selectedSession.interviewee.name}
                          </h4>
                          <p className="text-[12px] font-mono text-[var(--text-secondary)]">
                            📧 {selectedSession.interviewee.email}
                          </p>
                          <p className="text-[12px] font-mono text-[var(--text-secondary)]">
                            🆔 Roll: {selectedSession.interviewee.roll_no || 'N/A'}
                          </p>
                          <p className="text-[12px] text-[var(--text-secondary)]">
                            🏛 Dept: {selectedSession.interviewee.department || 'Not specified'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[13px] text-[var(--text-muted)] italic">No student profile.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mutual Peer Feedback Section */}
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Award className="w-4 h-4 text-[var(--accent)]" />
                      <span>Mutual Peer Reviews & Feedback</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {(detailedSession?.feedbacks || []).length} / 2 Submitted
                    </span>
                  </div>

                  {(!detailedSession?.feedbacks || detailedSession.feedbacks.length === 0) ? (
                    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
                      No peer feedback submitted for this session yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {detailedSession.feedbacks.map((fb) => {
                        const rev = fb.reviewer || {};
                        const target = fb.reviewee || {};
                        const responses = fb.responses || [];

                        return (
                          <div
                            key={fb.id}
                            className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-3"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-bold text-[var(--text-primary)]">
                                  {rev.name}
                                </span>
                                <span className="text-[var(--text-muted)] font-mono">evaluated</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">
                                  {target.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                {formatDateTime(fb.created_at)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              {responses.map((resp) => {
                                const q = resp.question || {};
                                return (
                                  <div
                                    key={resp.id}
                                    className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] space-y-1"
                                  >
                                    <p className="text-[var(--text-muted)] font-medium text-[11px]">
                                      {q.question_text || `Question #${resp.question_id}`}
                                    </p>
                                    <p className="font-bold font-mono text-[var(--text-primary)] text-[12px]">
                                      {resp.answer_value || '—'}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] flex-wrap gap-2">
                  <span>Started: {formatDateTime(selectedSession.started_at)}</span>
                  <span>Ended: {formatDateTime(selectedSession.ended_at)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
