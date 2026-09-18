import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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
  BookOpen,
  Lock,
  ShieldCheck
} from 'lucide-react';
import api from '../api/axios';

export default function PeerFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  peerUser,
  roundNumber = 1,
  isCompleted = false,
  allowSkip = true,
  onSubmitted,
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [question_id]: { selected_option_id, answer_value } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [statusData, setStatusData] = useState(null);

  const loadQuestionsAndStatus = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch active evaluation questions
      const qRes = await api.get('/interviews/feedback/questions');
      const qList = Array.isArray(qRes) ? qRes : (qRes?.data || []);
      setQuestions(qList);

      // Initialize answer map
      const initialAnswers = {};
      qList.forEach((q) => {
        initialAnswers[q.id] = {
          selected_option_id: null,
          answer_value: '',
        };
      });
      setAnswers(initialAnswers);

      // 2. Fetch mutual submission status
      if (sessionId) {
        const sRes = await api.get(`/interviews/sessions/${sessionId}/feedback`);
        const sData = sRes?.data || sRes;
        setStatusData(sData);

        if (sData?.has_submitted) {
          if (onClose) onClose();
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load feedback setup:', err);
      setError('Could not load feedback questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      setSuccess(false);
      setError('');
      loadQuestionsAndStatus();
    }
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

  const handleSelectYesNo = (questionId, val, optionId = null) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected_option_id: optionId,
        answer_value: val,
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

    // Client-side validation: Check required questions
    for (const q of questions) {
      if (q.is_required) {
        const ans = answers[q.id];
        if (!ans || (!ans.selected_option_id && !ans.answer_value?.trim())) {
          setError(`Please answer required question #${questions.indexOf(q) + 1}: "${q.question_text}"`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const payloadAnswers = Object.keys(answers).map((qIdStr) => {
        const qId = parseInt(qIdStr, 10);
        const ans = answers[qId] || {};
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
      setTimeout(() => {
        if (onClose) onClose();
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const peerDisplayName = 'Anonymous Peer';

  return (
    <div 
      onClick={allowSkip ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="panel-card w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider font-bold">
                <span className="px-2 py-0.5 rounded bg-[var(--accent)] text-white">
                  Round {roundNumber} Peer Feedback
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--accent)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Candidate Evaluation
                </span>
              </div>
              <h2 className="text-[17px] font-bold text-[var(--text-primary)] mt-1">
                Evaluate Round {roundNumber} Candidate
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Target Candidate: <strong className="text-[var(--text-primary)]">{peerDisplayName}</strong> (Feedback scores will be available in Interview History after completion)
              </p>
            </div>
          </div>

          {allowSkip && (
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Dismiss popup"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {success ? (
            <div className="py-12 text-center space-y-3.5 flex flex-col items-center justify-center animate-fadeIn">
              <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto flex items-center justify-center">
                <DotLottieReact
                  src="/lotties/success_tick.lottie"
                  loop={false}
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                  Feedback Submitted!
                </h3>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  Your peer evaluation ratings and rubric marks have been submitted successfully.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
              <p className="text-[13px] text-[var(--text-muted)]">Loading peer evaluation questions...</p>
            </div>
          ) : (
            /* ============================================================ */
            /* PEER FEEDBACK EVALUATION FORM */
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
                      {/* Question Label */}
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-[13px] font-bold text-[var(--text-primary)] flex items-start gap-1.5 leading-snug">
                          <span className="text-[var(--accent)] font-mono">{idx + 1}.</span>
                          <span>{q.question_text}</span>
                          {q.is_required && (
                            <span className="text-[var(--red)] font-bold ml-0.5">*</span>
                          )}
                        </label>
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
                                className={`px-4 py-2 rounded-[var(--radius-sm)] text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center justify-center min-w-[48px] ${
                                  isSelected
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_2px_8px_rgba(110,86,207,0.35)] scale-102 font-bold'
                                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <span>{opt.option_text}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Yes / No Binary Selection */}
                      {isYesNo && (
                        <div className="flex items-center gap-3 pt-1">
                          {(q.options && q.options.length === 2 ? q.options : [
                            { id: null, option_text: 'Yes' },
                            { id: null, option_text: 'No' },
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
                className="btn btn-primary text-xs py-2 px-6 font-bold shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 w-full">
              {allowSkip ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[12px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
                >
                  Skip / Dismiss
                </button>
              ) : (
                <span className="text-[11px] font-mono text-amber-500 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Mandatory Peer Feedback
                </span>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                {allowSkip && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  form="peer-feedback-form"
                  disabled={submitting}
                  className="btn btn-primary text-xs py-2 px-5 font-bold flex items-center gap-2 shadow-sm cursor-pointer"
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
                      : 'Submit Round 2 Feedback'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
