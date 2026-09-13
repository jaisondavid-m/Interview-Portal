import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Star,
  Users,
  MessageSquareQuote,
  FileText,
  Award,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import api from '../api/axios';

export default function History() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interviews/feedback/history');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setFeedbacks(list);
    } catch (err) {
      console.warn('Failed to load live feedback history:', err);
      setError('Could not load real-time feedback archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="badge-kicker">Peer Review & Scorecard Archive</span>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
            Peer Feedback & Evaluation Scorecards
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Review your calculated marks, percentages, and constructive notes given by fellow student interviewers.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="btn btn-secondary text-xs py-2 px-3.5 self-start sm:self-auto flex items-center gap-1.5 font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="panel-card p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-[13px] text-[var(--text-muted)]">Loading peer feedback scorecards...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="panel-card p-12 text-center space-y-3 border-dashed border border-[var(--border)] rounded-[var(--radius-md)]">
          <Award className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
            No peer feedback records yet
          </h3>
          <p className="text-[13px] text-[var(--text-muted)] max-w-md mx-auto">
            Complete a 1-on-1 mock interview session and submit mutual peer reviews to see your official scorecards here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((item) => {
            const reviewer = item.reviewer || {};
            const reviewee = item.reviewee || {};
            const session = item.session || {};
            const track = session.track || {};
            const level = session.level || {};
            const responses = item.responses || [];
            const pct = Math.round(item.score_percentage || 0);

            // Extract text feedback notes if any
            const textResponse = responses.find((r) => r.question?.question_type === 'text' || (!r.selected_option_id && r.answer_value.length > 20));

            return (
              <div
                key={item.id}
                className="data-card data-card-interactive p-6 flex flex-col md:flex-row gap-5 items-start"
              >
                <div className="card-avatar shrink-0 font-bold">
                  {(reviewer.name || 'P').slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0 space-y-3.5 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border-accent)]">
                          Session #{item.session_id}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          Evaluator: <strong className="text-[var(--text-primary)]">{reviewer.name}</strong> ({reviewer.roll_no || reviewer.email})
                        </span>
                      </div>
                      <h3 className="card-title text-[16px] font-bold mt-1">
                        {track.title || 'Technical Mock Interview'}{level.name ? ` — ${level.name}` : ''}
                      </h3>
                    </div>

                    {/* Total Score Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-emerald-500/20" />
                      <span>Score: {item.total_score} / {item.max_score} pts ({pct}%)</span>
                    </div>
                  </div>

                  {/* Question Responses Breakdown Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {responses
                      .filter((r) => r !== textResponse)
                      .map((resp) => {
                        const q = resp.question || {};
                        return (
                          <div
                            key={resp.id}
                            className="p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs flex items-center justify-between gap-2"
                          >
                            <span className="text-[var(--text-secondary)] truncate">
                              {q.question_text || `Q#${resp.question_id}`}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-bold text-[var(--text-primary)] font-mono">
                                {resp.answer_value}
                              </span>
                              {resp.max_marks > 0 && (
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  +{resp.awarded_marks}m
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Written Peer Feedback Quote Box */}
                  {textResponse && textResponse.answer_value && (
                    <div className="p-3.5 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--accent)] text-[11px] uppercase tracking-wider block mb-1">
                        Peer Review Notes:
                      </span>
                      "{textResponse.answer_value}"
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="card-footer-meta pt-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{formatDateTime(item.created_at)}</span>
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      Candidate: <strong>{reviewee.name}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
