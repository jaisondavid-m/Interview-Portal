import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Calendar,
  Clock,
  Star,
  Users,
  Video,
  Award,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../api/axios';
import { Skeleton } from '../Components/Skeleton';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSessions, setExpandedSessions] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_records: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interviews/history', {
        params: { page, limit }
      });
      const list = res?.data || (Array.isArray(res) ? res : []);
      setHistory(list);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.warn('Failed to load live interview history:', err);
      setError('Could not load real-time interview history archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, limit]);

  const toggleExpand = (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
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

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-12">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
            My Interview History
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Review all mock interview domains, difficulty levels attended, evaluation scorecards, and peer review notes.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="btn btn-secondary text-xs py-2 px-3.5 self-start sm:self-auto flex items-center gap-1.5 font-mono shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-4 animate-fadeIn">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="panel-card p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-40 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-24 rounded-[var(--radius-sm)]" />
                  <Skeleton className="h-8 w-20 rounded-[var(--radius-sm)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-[var(--red)] space-y-2">
          <p className="text-sm font-bold">{error}</p>
          <button onClick={fetchHistory} className="btn btn-secondary text-xs py-1 px-3">
            Try Again
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="panel-card p-10 sm:p-14 text-center space-y-4 border-dashed border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] shadow-xs">
          <div className="w-44 h-44 sm:w-52 sm:h-52 mx-auto flex items-center justify-center">
            <DotLottieReact
              src="/lotties/document-empty.lottie"
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
              No interview history found
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)]">
              You haven't participated in any mock interview sessions yet. Join matchmaking or start an interview to begin practicing.
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={() => navigate('/interviews')}
              className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 font-bold shadow-sm"
            >
              <Video className="w-4 h-4" />
              <span>Join Mock Interview</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((sess) => {
            const isExpanded = Boolean(expandedSessions[sess.session_id]);
            const responses = sess.responses || [];
            const pct = Math.round(sess.score_percentage || 0);

            return (
              <div
                key={sess.session_id}
                className="panel-card p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs hover:border-[var(--border-strong)] transition-all space-y-4"
              >
                {/* Header Card Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Badges Bar: Level, Track, Mode, Session ID */}
                    <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                      <span className="px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold border border-[var(--border-accent)]">
                        Level {sess.level_number}: {sess.level_name || 'Level'}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] font-semibold uppercase border border-[var(--border)]">
                        {sess.level_mode || 'coding'}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                        Session #{sess.session_id}
                      </span>

                      <span className={`px-2 py-0.5 rounded font-bold capitalize border ${
                        sess.status === 'completed'
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]'
                          : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)]'
                      }`}>
                        {sess.status}
                      </span>
                    </div>

                    {/* Track Title */}
                    <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                      {sess.track_title}
                    </h3>

                    {/* Metadata: When it happened, Duration */}
                    <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)] flex-wrap pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <strong className="text-[var(--text-secondary)] font-medium">
                          {formatDateTime(sess.started_at || sess.created_at)}
                        </strong>
                      </span>

                      {sess.duration_seconds > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Duration: {formatDuration(sess.duration_seconds)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Score & Toggle Section */}
                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                    {sess.has_scorecard ? (
                      <div className="text-right font-mono bg-[var(--accent-dim)] px-3.5 py-2 rounded-[var(--radius-md)] border border-[var(--border-strong)]">
                        <div className="flex items-center gap-1 text-[15px] font-bold text-[var(--accent)]">
                          <Star className="w-4 h-4 fill-[var(--accent)]/20" />
                          <span>+{sess.total_score} / {sess.max_score} pts</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-semibold">
                          {pct}% mark achieved
                        </div>
                      </div>
                    ) : (
                      <div className="text-right font-mono bg-[var(--bg-raised)] px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                        Scorecard Pending
                      </div>
                    )}

                    {sess.has_scorecard && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(sess.session_id)}
                        className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1 font-mono cursor-pointer"
                        title="Toggle Scorecard Breakdown"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Scorecard' : 'View Scorecard'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Evaluation Scorecard Breakdown */}
                {isExpanded && sess.has_scorecard && (
                  <div className="pt-4 border-t border-[var(--border)] space-y-3.5 bg-[var(--bg-raised)] p-4 rounded-[var(--radius-md)] animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] flex-wrap gap-2 text-xs font-mono">
                      <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                        Evaluation Scorecard Breakdown:
                      </span>
                      <span className="text-[var(--accent)] font-bold">
                        Score: {sess.total_score} of {sess.max_score} Total Points ({pct}%)
                      </span>
                    </div>

                    {/* Question by question scores */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {responses.map((resp) => {
                        const q = resp.question || {};
                        return (
                          <div
                            key={resp.id}
                            className="p-3 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[var(--text-muted)] text-[11px] font-medium truncate">
                                {q.question_text || `Question #${resp.question_id}`}
                              </span>
                              {resp.max_marks > 0 && (
                                <span className="text-[10px] font-mono text-[var(--accent)] font-bold bg-[var(--accent-dim)] px-1.5 py-0.5 rounded border border-[var(--border-strong)] shrink-0">
                                  +{resp.awarded_marks} / {resp.max_marks} pts
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-[var(--text-primary)] font-mono">
                              {resp.answer_value || '—'}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Written Feedback Notes */}
                    {sess.review_notes && (
                      <div className="p-3 bg-[var(--bg-card)] rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
                        <span className="font-bold text-[var(--accent)] uppercase font-mono text-[10px] block">
                          Peer Feedback Note:
                        </span>
                        <p className="italic leading-relaxed">
                          "{sess.review_notes}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.total_records > 0 && (
        <div className="panel-card px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-[var(--text-primary)] font-mono">{((page - 1) * limit) + 1}</strong> to{' '}
              <strong className="text-[var(--text-primary)] font-mono">
                {Math.min(page * limit, pagination.total_records)}
              </strong>{' '}
              of <strong className="text-[var(--text-primary)] font-mono">{pagination.total_records}</strong> sessions
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.has_prev || loading}
              className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded font-semibold text-[var(--text-primary)]">
              Page {page} of {pagination.total_pages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages || 1, p + 1))}
              disabled={!pagination.has_next || loading}
              className="px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
