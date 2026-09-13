import React, { useState, useEffect } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Send,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Users,
  Clock,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Check
} from 'lucide-react';
import api from '../api/axios';

export default function PeerFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  peerUser,
  roundNumber = 1,
  isCompleted = false,
  onSubmitted,
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [question_id]: { selected_option_id, answer_value } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Status state from backend
  const [statusData, setStatusData] = useState(null);
  const [activeScorecardTab, setActiveScorecardTab] = useState('received'); // 'received' | 'given'

  const loadQuestionsAndStatus = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch active evaluation questions
      const qRes = await api.get('/interviews/feedback/questions');
      const qList = Array.isArray(qRes) ? qRes : (qRes?.data || []);
      setQuestions(qList);

      // Pre-populate empty answers object
      const initialAnswers = {};
      qList.forEach((q) => {
        initialAnswers[q.id] = {
          selected_option_id: null,
          answer_value: '',
        };
      });
      setAnswers(initialAnswers);

      // 2. Check session feedback status (both participants)
      try {
        const sRes = await api.get(`/interviews/sessions/${sessionId}/feedback`);
        const sData = sRes?.data || sRes;
        setStatusData(sData);

        if (sData?.has_submitted) {
          setSuccess(true);
        }
      } catch (e) {
        // ignore status check failure
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load evaluation questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    loadQuestionsAndStatus();
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleSelectOption = (questionId, option) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected_option_id: option.id,
        answer_value: option.option_text,
      },
    }));
  };

  const handleSelectYesNo = (questionId, value, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected_option_id: optionId || null,
        answer_value: value,
      },
    }));
  };

  const handleTextChange = (questionId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected_option_id: null,
        answer_value: text,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    for (const q of questions) {
      if (q.is_required) {
        const ans = answers[q.id];
        if (!ans || !ans.answer_value || !ans.answer_value.trim()) {
          setError(`Please answer required question: "${q.question_text}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payloadAnswers = Object.keys(answers).map((qIdStr) => {
        const qId = parseInt(qIdStr, 10);
        const ans = answers[qId];
        return {
          question_id: qId,
          selected_option_id: ans.selected_option_id || null,
          answer_value: ans.answer_value || '',
        };
      });

      await api.post(`/interviews/sessions/${sessionId}/feedback`, {
        answers: payloadAnswers,
      });

      setSuccess(true);
      if (onSubmitted) {
        onSubmitted();
      }

      // Re-fetch mutual status
      const sRes = await api.get(`/interviews/sessions/${sessionId}/feedback`);
      setStatusData(sRes?.data || sRes);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const peerDisplayName = peerUser?.name || statusData?.peer?.name || 'Peer Candidate';
  const peerDisplayRoll = peerUser?.roll_no || statusData?.peer?.roll_no || peerUser?.email || 'STUDENT';

  const myFeedback = statusData?.my_feedback || statusData?.feedback;
  const peerFeedback = statusData?.peer_feedback;
  const bothSubmitted = statusData?.both_submitted;
  const peerHasSubmitted = statusData?.peer_has_submitted;

  const getScoreBadge = (pct) => {
    if (pct >= 85) {
      return { label: 'Outstanding (A+)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (pct >= 70) {
      return { label: 'Proficient (B)', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
    }
    if (pct >= 50) {
      return { label: 'Average (C)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    }
    return { label: 'Needs Practice', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="panel-card w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider font-bold">
                <span className="px-2 py-0.5 rounded bg-[var(--accent)] text-white">
                  Round {roundNumber} Interviewer
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--accent)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Candidate Evaluation
                </span>
              </div>
              <h2 className="text-[17px] font-bold text-[var(--text-primary)] mt-1">
                {bothSubmitted
                  ? 'Mutual Scorecard Results'
                  : success
                  ? 'Evaluation Submitted'
                  : `Evaluate Round ${roundNumber} Candidate: ${peerDisplayName}`}
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Candidate Assessed: <strong className="text-[var(--text-primary)]">{peerDisplayName}</strong> ({peerDisplayRoll})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Dismiss popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
              <p className="text-[13px] text-[var(--text-muted)]">Loading peer evaluation & scores...</p>
            </div>
          ) : success ? (
            /* ============================================================ */
            /* VIEW 1: POST-SUBMISSION / MUTUAL SCORECARDS */
            /* ============================================================ */
            <div className="space-y-5">
              {/* Mutual Completion Status Banner */}
              {bothSubmitted ? (
                <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                        Mutual Peer Reviews Completed!
                      </h4>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        Both participants have submitted reviews. Your official scorecards are revealed below.
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30">
                    2 / 2 Reviews In
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-[var(--accent)] shrink-0 animate-pulse" />
                    <div>
                      <h4 className="text-[14px] font-bold text-[var(--accent)]">
                        Your Feedback Submitted!
                      </h4>
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        Waiting for <strong>{peerDisplayName}</strong> to submit their review to unlock mutual scorecards.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={loadQuestionsAndStatus}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Check Status</span>
                  </button>
                </div>
              )}

              {/* Tab Selector: Score Received vs Score Given */}
              <div className="flex bg-[var(--bg-raised)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setActiveScorecardTab('received')}
                  className={`flex-1 py-2 rounded-[var(--radius-xs)] text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    activeScorecardTab === 'received'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Score Received From Peer</span>
                  {peerHasSubmitted && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScorecardTab('given')}
                  className={`flex-1 py-2 rounded-[var(--radius-xs)] text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    activeScorecardTab === 'given'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Review Given to Peer</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </button>
              </div>

              {/* TAB CONTENT: RECEIVED SCORECARD */}
              {activeScorecardTab === 'received' && (
                <div className="space-y-4">
                  {!peerHasSubmitted ? (
                    <div className="panel-card p-8 text-center space-y-2 border-dashed border border-[var(--border)]">
                      <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                      <h4 className="text-[14px] font-bold text-[var(--text-primary)]">
                        Peer Review Pending
                      </h4>
                      <p className="text-[12px] text-[var(--text-muted)] max-w-sm mx-auto">
                        <strong>{peerDisplayName}</strong> has not submitted their evaluation yet. As soon as they complete it, your score and breakdown will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Overall Score Banner */}
                      {(() => {
                        const total = peerFeedback?.total_score || 0;
                        const max = peerFeedback?.max_score || 0;
                        const pct = Math.round(peerFeedback?.score_percentage || 0);
                        const badge = getScoreBadge(pct);

                        return (
                          <div className="p-5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="space-y-1 text-center sm:text-left">
                              <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                                Total Evaluated Score
                              </span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-[32px] font-extrabold text-[var(--text-primary)] font-mono">
                                  {total}
                                </span>
                                <span className="text-[16px] text-[var(--text-muted)] font-mono">
                                  / {max} pts
                                </span>
                                <span className="text-[18px] font-bold text-[var(--accent)] font-mono ml-2">
                                  ({pct}%)
                                </span>
                              </div>
                            </div>

                            <div className={`px-3 py-1.5 rounded-full border text-xs font-bold font-mono ${badge.color}`}>
                              {badge.label}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Question Breakdown */}
                      <div className="space-y-2.5">
                        <h5 className="text-[12px] font-bold text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                          Evaluation Breakdown By Question
                        </h5>
                        {(peerFeedback?.responses || []).map((resp) => {
                          const q = resp.question || {};
                          return (
                            <div
                              key={resp.id}
                              className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug">
                                  {q.question_text || `Question #${resp.question_id}`}
                                </p>
                                {resp.max_marks > 0 && (
                                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                    +{resp.awarded_marks} / {resp.max_marks} pts
                                  </span>
                                )}
                              </div>
                              <p className="text-[13px] font-bold text-[var(--accent)] font-mono">
                                {resp.answer_value || '—'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: GIVEN SCORECARD */}
              {activeScorecardTab === 'given' && (
                <div className="space-y-4">
                  {(() => {
                    const total = myFeedback?.total_score || 0;
                    const max = myFeedback?.max_score || 0;
                    const pct = Math.round(myFeedback?.score_percentage || 0);

                    return (
                      <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                            Score Awarded To Peer
                          </span>
                          <div className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
                            {total} / {max} pts ({pct}%)
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-bold">
                          Submitted
                        </span>
                      </div>
                    );
                  })()}

                  <div className="space-y-2.5">
                    <h5 className="text-[12px] font-bold text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                      Your Responses
                    </h5>
                    {(myFeedback?.responses || []).map((resp) => {
                      const q = resp.question || {};
                      return (
                        <div
                          key={resp.id}
                          className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug">
                              {q.question_text || `Question #${resp.question_id}`}
                            </p>
                            {resp.max_marks > 0 && (
                              <span className="text-[11px] font-mono font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded border border-[var(--border-accent)] shrink-0">
                                +{resp.awarded_marks} / {resp.max_marks} pts
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-bold text-[var(--text-primary)] font-mono">
                            {resp.answer_value || '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* VIEW 2: FEEDBACK FORM WITH MARKS VISIBLE */
            /* ============================================================ */
            <form id="peer-feedback-form" onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2.5 text-[12px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-5">
                {questions.map((q, idx) => {
                  const currentAns = answers[q.id] || {};
                  const isMCQ = q.question_type === 'mcq';
                  const isYesNo = q.question_type === 'yes_no';
                  const isText = q.question_type === 'text';

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-3 shadow-xs"
                    >
                      {/* Question Label with Max Weightage */}
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-[13px] font-bold text-[var(--text-primary)] flex items-start gap-1.5 leading-snug">
                          <span className="text-[var(--accent)] font-mono">{idx + 1}.</span>
                          <span>{q.question_text}</span>
                          {q.is_required && (
                            <span className="text-[var(--red)] font-bold ml-0.5">*</span>
                          )}
                        </label>

                        {q.max_marks > 0 && (
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            Max: {q.max_marks} pts
                          </span>
                        )}
                      </div>

                      {/* Render MCQ Option Chips / Buttons */}
                      {isMCQ && (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {(q.options || []).map((opt) => {
                            const isSelected =
                              currentAns.selected_option_id === opt.id ||
                              currentAns.answer_value === opt.option_text;

                            return (
                              <button
                                type="button"
                                key={opt.id}
                                onClick={() => handleSelectOption(q.id, opt)}
                                className={`px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_2px_8px_rgba(110,86,207,0.35)] scale-102'
                                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <span>{opt.option_text}</span>
                                {opt.marks !== undefined && (
                                  <span className={`text-[10px] font-bold opacity-80 ${isSelected ? 'text-white/90' : 'text-[var(--text-muted)]'}`}>
                                    ({opt.marks} pts)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Yes / No Binary Selection */}
                      {isYesNo && (
                        <div className="flex items-center gap-3 pt-1">
                          {(q.options && q.options.length === 2 ? q.options : [
                            { id: null, option_text: 'Yes', marks: 5 },
                            { id: null, option_text: 'No', marks: 0 },
                          ]).map((opt) => {
                            const val = opt.option_text;
                            const isSelected = currentAns.answer_value === val || currentAns.selected_option_id === opt.id;
                            const isYes = val.toLowerCase() === 'yes';

                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={() => handleSelectYesNo(q.id, val, opt.id)}
                                className={`flex-1 py-2 px-4 rounded-[var(--radius-sm)] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                                  isSelected
                                    ? isYes
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                      : 'bg-rose-600 text-white border-rose-600 shadow-md'
                                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                {isYes ? <ThumbsUp className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                                <span>{val}</span>
                                <span className="text-[10px] opacity-80">({opt.marks ?? (isYes ? 5 : 0)} pts)</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Text Comments Input */}
                      {isText && (
                        <div className="pt-1">
                          <textarea
                            rows={3}
                            value={currentAns.answer_value || ''}
                            onChange={(e) => handleTextChange(q.id, e.target.value)}
                            placeholder="Share constructive feedback on technical approach, problem-solving, or communication..."
                            className="custom-input text-xs w-full py-2 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between gap-3">
          {success ? (
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary text-xs py-2 px-6 font-bold shadow-sm"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-[12px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
              >
                Skip / Dismiss
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="peer-feedback-form"
                  disabled={submitting}
                  className="btn btn-primary text-xs py-2 px-5 font-bold flex items-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {roundNumber === 1
                      ? isCompleted
                        ? 'Submit Round 1 Feedback'
                        : 'Submit Round 1 Feedback & Continue'
                      : 'Submit Round 2 Feedback & View Scores'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
