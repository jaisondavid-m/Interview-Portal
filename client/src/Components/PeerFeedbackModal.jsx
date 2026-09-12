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
  HelpCircle,
  UserCheck
} from 'lucide-react';
import api from '../api/axios';

export default function PeerFeedbackModal({
  isOpen,
  onClose,
  sessionId,
  peerUser,
  onSubmitted,
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { [question_id]: { selected_option_id, answer_value } }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch active feedback questions & check if student already submitted
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let isMounted = true;
    const loadQuestionsAndStatus = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Fetch active questions
        const qRes = await api.get('/interviews/feedback/questions');
        const qList = Array.isArray(qRes) ? qRes : (qRes?.data || []);

        // 2. Check if already submitted
        try {
          const statusRes = await api.get(`/interviews/sessions/${sessionId}/feedback`);
          const statusData = statusRes?.data || statusRes;
          if (statusData?.has_submitted) {
            if (isMounted) {
              setSuccess(true);
              setLoading(false);
            }
            return;
          }
        } catch (e) {
          // ignore status check failure
        }

        if (isMounted) {
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
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load evaluation questions.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadQuestionsAndStatus();

    return () => {
      isMounted = false;
    };
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

  const handleSelectYesNo = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected_option_id: null,
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
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const peerDisplayName = peerUser?.name || 'Peer Candidate';
  const peerDisplayRoll = peerUser?.roll_no || peerUser?.email || 'STUDENT';

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
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--accent)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Peer Review & Evaluation</span>
              </div>
              <h2 className="text-[17px] font-bold text-[var(--text-primary)] mt-0.5">
                Evaluate Peer: {peerDisplayName}
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Candidate Roll No: <strong className="font-mono text-[var(--text-primary)]">{peerDisplayRoll}</strong>
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
              <p className="text-[13px] text-[var(--text-muted)]">Loading peer evaluation questions...</p>
            </div>
          ) : success ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                  Feedback Submitted!
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] max-w-md mx-auto">
                  Thank you for providing constructive peer feedback for <strong>{peerDisplayName}</strong>. Your evaluation has been saved.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="btn btn-primary text-xs py-2 px-5 font-bold shadow-sm"
                >
                  Close & Return
                </button>
              </div>
            </div>
          ) : (
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
                      <label className="text-[13px] font-bold text-[var(--text-primary)] flex items-start gap-1.5 leading-snug">
                        <span className="text-[var(--accent)] font-mono">{idx + 1}.</span>
                        <span>{q.question_text}</span>
                        {q.is_required && (
                          <span className="text-[var(--red)] font-bold ml-0.5">*</span>
                        )}
                      </label>

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
                                className={`px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-mono font-semibold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_2px_8px_rgba(110,86,207,0.35)] scale-102'
                                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                {opt.option_text}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Yes / No Binary Selection */}
                      {isYesNo && (
                        <div className="flex items-center gap-3 pt-1">
                          {['Yes', 'No'].map((val) => {
                            const isSelected = currentAns.answer_value === val;
                            const isYes = val === 'Yes';

                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={() => handleSelectYesNo(q.id, val)}
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
        {!success && !loading && (
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between gap-3">
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
                <span>Submit Feedback</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
