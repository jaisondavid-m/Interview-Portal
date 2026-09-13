import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquareCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Check,
  Award,
  Sliders,
  Star,
  MessageSquare,
  ShieldCheck,
  Hash,
  Trophy
} from 'lucide-react';
import api from '../api/axios';

const PRESETS = [
  {
    name: '1 to 5 Rating (1–5 pts)',
    options: [
      { option_text: '1', marks: 1 },
      { option_text: '2', marks: 2 },
      { option_text: '3', marks: 3 },
      { option_text: '4', marks: 4 },
      { option_text: '5', marks: 5 },
    ],
  },
  {
    name: 'Excellent / Good / Avg / Poor',
    options: [
      { option_text: 'Excellent', marks: 10 },
      { option_text: 'Good', marks: 7 },
      { option_text: 'Average', marks: 4 },
      { option_text: 'Poor', marks: 1 },
    ],
  },
  {
    name: 'Agreement Scale (10/7/4/0)',
    options: [
      { option_text: 'Strongly Agree', marks: 10 },
      { option_text: 'Agree', marks: 7 },
      { option_text: 'Neutral', marks: 4 },
      { option_text: 'Disagree', marks: 0 },
    ],
  },
  {
    name: 'High / Medium / Low (10/5/0)',
    options: [
      { option_text: 'High', marks: 10 },
      { option_text: 'Medium', marks: 5 },
      { option_text: 'Low', marks: 0 },
    ],
  },
];

export default function AdminFeedbackConfig() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq', // 'mcq' | 'yes_no' | 'text'
    is_required: true,
    max_marks: 5,
    order_index: 1,
    is_active: true,
    options: [
      { option_text: '1', marks: 1 },
      { option_text: '2', marks: 2 },
      { option_text: '3', marks: 3 },
      { option_text: '4', marks: 4 },
      { option_text: '5', marks: 5 },
    ],
  });
  const [customOptionText, setCustomOptionText] = useState('');
  const [customOptionMarks, setCustomOptionMarks] = useState(5);

  // Fetch configured feedback questions
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/feedback/questions');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setQuestions(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch peer feedback questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const openCreateModal = () => {
    setEditingQuestion(null);
    const nextOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.order_index || 0)) + 1 : 1;
    setFormData({
      question_text: '',
      question_type: 'mcq',
      is_required: true,
      max_marks: 5,
      order_index: nextOrder,
      is_active: true,
      options: [
        { option_text: '1', marks: 1 },
        { option_text: '2', marks: 2 },
        { option_text: '3', marks: 3 },
        { option_text: '4', marks: 4 },
        { option_text: '5', marks: 5 },
      ],
    });
    setCustomOptionText('');
    setCustomOptionMarks('');
    setShowModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    const existingOpts = (q.options || []).map((o) => ({
      id: o.id,
      option_text: o.option_text,
      marks: o.marks ?? 0,
    }));

    let defaultOpts = existingOpts;
    if (defaultOpts.length === 0) {
      if (q.question_type === 'yes_no') {
        defaultOpts = [
          { option_text: 'Yes', marks: 5 },
          { option_text: 'No', marks: 0 },
        ];
      } else if (q.question_type === 'mcq') {
        defaultOpts = [
          { option_text: '1', marks: 1 },
          { option_text: '2', marks: 2 },
          { option_text: '3', marks: 3 },
          { option_text: '4', marks: 4 },
          { option_text: '5', marks: 5 },
        ];
      }
    }

    setFormData({
      question_text: q.question_text || '',
      question_type: q.question_type || 'mcq',
      is_required: q.is_required ?? true,
      max_marks: q.max_marks ?? 5,
      order_index: q.order_index || 1,
      is_active: q.is_active ?? true,
      options: defaultOpts,
    });
    setCustomOptionText('');
    setCustomOptionMarks('');
    setShowModal(true);
  };

  const handleAddOption = () => {
    const trimmed = customOptionText.trim();
    if (trimmed && !formData.options.some((o) => o.option_text === trimmed)) {
      setFormData((prev) => {
        const parsedMarks = customOptionMarks === '' ? 0 : (parseFloat(customOptionMarks) || 0);
        const nextOpts = [
          ...prev.options,
          { option_text: trimmed, marks: parsedMarks },
        ];
        const validMarks = nextOpts.map((o) => (o.marks === '' ? 0 : parseFloat(o.marks) || 0));
        const computedMax = validMarks.length > 0 ? Math.max(...validMarks) : 0;
        return {
          ...prev,
          options: nextOpts,
          max_marks: computedMax > 0 ? computedMax : prev.max_marks,
        };
      });
      setCustomOptionText('');
      setCustomOptionMarks(5);
    }
  };

  const handleRemoveOption = (indexToRemove) => {
    setFormData((prev) => {
      const nextOpts = prev.options.filter((_, idx) => idx !== indexToRemove);
      const validMarks = nextOpts.map((o) => (o.marks === '' ? 0 : parseFloat(o.marks) || 0));
      const computedMax = validMarks.length > 0 ? Math.max(...validMarks) : 0;
      return {
        ...prev,
        options: nextOpts,
        max_marks: computedMax > 0 ? computedMax : prev.max_marks,
      };
    });
  };

  const handleUpdateOptionMarks = (index, newMarks) => {
    setFormData((prev) => {
      const nextOpts = prev.options.map((opt, idx) =>
        idx === index ? { ...opt, marks: newMarks } : opt
      );
      const validMarks = nextOpts.map((o) => (o.marks === '' ? 0 : parseFloat(o.marks) || 0));
      const computedMax = validMarks.length > 0 ? Math.max(...validMarks) : 0;
      return {
        ...prev,
        options: nextOpts,
        max_marks: computedMax > 0 ? computedMax : prev.max_marks,
      };
    });
  };

  const handleApplyPreset = (presetOptions) => {
    const validMarks = presetOptions.map((o) => (o.marks === '' ? 0 : parseFloat(o.marks) || 0));
    const computedMax = validMarks.length > 0 ? Math.max(...validMarks) : 0;
    setFormData((prev) => ({
      ...prev,
      options: [...presetOptions],
      max_marks: computedMax > 0 ? computedMax : prev.max_marks,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.question_text.trim()) {
      alert('Please enter the question text.');
      return;
    }

    if (formData.question_type === 'mcq' && formData.options.length < 2) {
      alert('MCQ questions require at least two answer options.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      let optionsPayload = [];
      if (formData.question_type === 'mcq') {
        optionsPayload = formData.options.map((o) => ({
          id: o.id || undefined,
          option_text: o.option_text,
          marks: o.marks === '' ? 0 : (parseFloat(o.marks) || 0),
        }));
      } else if (formData.question_type === 'yes_no') {
        const raw = formData.options.length === 2 ? formData.options : [
          { option_text: 'Yes', marks: 5 },
          { option_text: 'No', marks: 0 },
        ];
        optionsPayload = raw.map((o) => ({
          id: o.id || undefined,
          option_text: o.option_text,
          marks: o.marks === '' ? 0 : (parseFloat(o.marks) || 0),
        }));
      }

      const computedMax = optionsPayload.length > 0
        ? Math.max(...optionsPayload.map((o) => o.marks || 0), parseFloat(formData.max_marks) || 0)
        : (parseFloat(formData.max_marks) || 0);

      const payload = {
        question_text: formData.question_text.trim(),
        question_type: formData.question_type,
        is_required: formData.is_required,
        max_marks: computedMax,
        order_index: parseInt(formData.order_index, 10) || 1,
        is_active: formData.is_active,
        options: optionsPayload,
      };

      if (editingQuestion) {
        await api.put(`/admin/feedback/questions/${editingQuestion.id}`, payload);
        setSuccessMsg('Feedback question & mark weightage updated successfully.');
      } else {
        await api.post('/admin/feedback/questions', payload);
        setSuccessMsg('Feedback question created successfully with mark weightage.');
      }

      setShowModal(false);
      await fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;
    setSaving(true);
    try {
      await api.delete(`/admin/feedback/questions/${questionToDelete.id}`);
      setSuccessMsg('Question deleted successfully.');
      setShowDeleteModal(false);
      setQuestionToDelete(null);
      await fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete question.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (q) => {
    try {
      const updatedActive = !q.is_active;
      const opts = (q.options || []).map((o) => ({
        option_text: o.option_text,
        marks: o.marks ?? 0,
      }));
      await api.put(`/admin/feedback/questions/${q.id}`, {
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: q.is_required,
        max_marks: q.max_marks ?? 0,
        order_index: q.order_index,
        is_active: updatedActive,
        options: opts,
      });
      fetchQuestions();
    } catch (err) {
      console.error('Failed to toggle question status:', err);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <MessageSquareCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Admin Configuration Portal</span>
          </div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            Peer Feedback Questions & Mark Weightage
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Set up evaluation questions, mark weightage per option, and review mutual scorecards calculated for students.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/admin/leaderboard')}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
            title="Open Student Score Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2.5 text-[13px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5 text-[13px]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Questions Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Questions List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="panel-card p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
              <p className="text-[13px] text-[var(--text-muted)]">Loading peer feedback questions & marks...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3 border-dashed">
              <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">No feedback questions configured</h3>
              <p className="text-[13px] text-[var(--text-muted)] max-w-md mx-auto">
                Create structured peer review rubrics and mark weightages that students will use during their mock interviews.
              </p>
              <button
                onClick={openCreateModal}
                className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Question</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`panel-card p-5 border transition-all ${
                    q.is_active
                      ? 'border-[var(--border)] bg-[var(--bg-card)]'
                      : 'border-[var(--border)] bg-[var(--bg-raised)] opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Badge bar */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-[var(--text-secondary)]">
                          #{q.order_index || idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold uppercase border border-[var(--border-accent)]">
                          {q.question_type}
                        </span>
                        {q.max_marks > 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                            Max {q.max_marks} pts
                          </span>
                        )}
                        {q.is_required ? (
                          <span className="text-[var(--red)] font-semibold text-[11px]">
                            * Required
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[11px]">
                            Optional
                          </span>
                        )}
                        {!q.is_active && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                        {q.question_text}
                      </h3>

                      {/* MCQ / Options Display */}
                      {q.options && q.options.length > 0 && (
                        <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                          <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                            Scored Options & Mark Weightage:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className="flex items-center justify-between px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono"
                              >
                                <span className="text-[var(--text-primary)] font-medium">
                                  {opt.option_text}
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  +{opt.marks ?? 0} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(q)}
                        className={`p-1.5 rounded-[var(--radius-xs)] border transition-all ${
                          q.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20'
                        }`}
                        title={q.is_active ? 'Deactivate Question' : 'Activate Question'}
                      >
                        {q.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(q)}
                        className="p-1.5 rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                        title="Edit Question & Marks"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuestionToDelete(q);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 rounded-[var(--radius-xs)] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-all"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Live Student Modal Preview */}
        <div className="space-y-4">
          <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] sticky top-20 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-[13px] font-bold text-[var(--text-primary)] font-ui">
                  Student Evaluation Dialog Preview
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                Live View
              </span>
            </div>

            {/* Mock Student Dialog */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] p-4 space-y-4">
              <div className="pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--accent)] font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <span>MUTUAL PEER EVALUATION</span>
                </div>
                <h4 className="text-[14px] font-bold text-[var(--text-primary)] mt-0.5">
                  Evaluate Peer: Jaison David (7376251CS221)
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Ratings calculate official mock interview leaderboard marks.
                </p>
              </div>

              {/* Render active questions list */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {questions.filter((q) => q.is_active).length === 0 ? (
                  <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
                    No active questions to display.
                  </p>
                ) : (
                  questions
                    .filter((q) => q.is_active)
                    .map((q, idx) => (
                      <div key={q.id} className="space-y-1.5 text-left">
                        <label className="text-[12px] font-semibold text-[var(--text-primary)] flex items-baseline justify-between gap-1">
                          <span>{idx + 1}. {q.question_text} {q.is_required && <span className="text-[var(--red)]">*</span>}</span>
                          {q.max_marks > 0 && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              {q.max_marks} pts
                            </span>
                          )}
                        </label>

                        {q.question_type === 'mcq' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(q.options || []).map((opt) => (
                              <span
                                key={opt.id}
                                className="text-[11px] font-mono px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] shadow-xs"
                              >
                                {opt.option_text}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.question_type === 'yes_no' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono px-3 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                              Yes
                            </span>
                            <span className="text-[11px] font-mono px-3 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                              No
                            </span>
                          </div>
                        )}

                        {q.question_type === 'text' && (
                          <div className="w-full h-14 rounded bg-[var(--bg-card)] border border-[var(--border)] p-2 text-[11px] text-[var(--text-muted)]">
                            Write constructive comments...
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                <div className="btn btn-primary text-[11px] py-1 px-3 opacity-80 cursor-default">
                  Submit Peer Feedback
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ADD / EDIT QUESTION MODAL */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="panel-card w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                  {editingQuestion ? 'Edit Feedback Question & Marks' : 'Add New Feedback Question & Marks'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Question Text <span className="text-[var(--red)]">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="e.g. How would you rate the candidate's algorithm problem-solving?"
                  className="custom-input text-xs w-full py-2 resize-none"
                  required
                />
              </div>

              {/* Question Type */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Answer Format / Type <span className="text-[var(--red)]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mcq', label: 'MCQ (Select One)', desc: 'Custom options with weightage marks' },
                    { id: 'yes_no', label: 'Yes / No', desc: 'Binary choice with marks' },
                    { id: 'text', label: 'Written Text', desc: 'Optional qualitative comment' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        let newOpts = formData.options;
                        if (t.id === 'yes_no' && formData.options.length !== 2) {
                          newOpts = [
                            { option_text: 'Yes', marks: 5 },
                            { option_text: 'No', marks: 0 },
                          ];
                        }
                        setFormData({
                          ...formData,
                          question_type: t.id,
                          options: newOpts,
                        });
                      }}
                      className={`p-2.5 rounded-[var(--radius-sm)] border text-left transition-all ${
                        formData.question_type === t.id
                          ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)] font-bold'
                          : 'border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Builder for MCQ */}
              {formData.question_type === 'mcq' && (
                <div className="space-y-3 p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-[var(--text-primary)]">
                      MCQ Options & Marks Weightage
                    </label>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {formData.options.length} options configured
                    </span>
                  </div>

                  {/* Preset quick picks */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                      Quick Presets:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESETS.map((preset) => (
                        <button
                          type="button"
                          key={preset.name}
                          onClick={() => handleApplyPreset(preset.options)}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] transition-all cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active options list with marks inputs */}
                  <div className="space-y-2 pt-1">
                    {formData.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-[var(--bg-card)] border border-[var(--border)] shadow-xs"
                      >
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] flex-1">
                          {opt.option_text}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">Marks:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={opt.marks ?? ''}
                            onChange={(e) => handleUpdateOptionMarks(idx, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            className="custom-input text-xs py-1 px-2 w-16 text-center font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="text-[var(--text-muted)] hover:text-[var(--red)] p-1 ml-1"
                            title="Remove option"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Option Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                    <input
                      type="text"
                      value={customOptionText}
                      onChange={(e) => setCustomOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="Option label (e.g. Mastered)..."
                      className="custom-input text-xs py-1.5 flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">Pts:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={customOptionMarks ?? ''}
                        onChange={(e) => setCustomOptionMarks(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="5"
                        className="custom-input text-xs py-1.5 w-16 text-center font-mono font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="btn btn-secondary text-xs py-1.5 px-3 font-semibold"
                    >
                      Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Options Builder for Yes/No */}
              {formData.question_type === 'yes_no' && (
                <div className="space-y-3 p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)]">
                  <label className="text-[12px] font-semibold text-[var(--text-primary)]">
                    Yes / No Mark Weightage
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {formData.options.map((opt, idx) => {
                      const isYes = opt.option_text.toLowerCase() === 'yes';
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded bg-[var(--bg-card)] border border-[var(--border)] space-y-1.5"
                        >
                          <span className={`text-xs font-bold font-mono ${isYes ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {opt.option_text} Option Marks:
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={opt.marks ?? ''}
                            onChange={(e) => handleUpdateOptionMarks(idx, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder={isYes ? '5' : '0'}
                            className="custom-input text-xs py-1 px-2 w-full font-mono font-bold"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order index, Max Marks & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] font-mono">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.max_marks ?? ''}
                    onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    placeholder="5"
                    className="custom-input text-xs py-1.5 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] font-mono">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.order_index ?? ''}
                    onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="custom-input text-xs py-1.5 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-raised)] border border-[var(--border)] self-end">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">Required</span>
                  <input
                    type="checkbox"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-raised)] border border-[var(--border)] self-end">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">Active</span>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingQuestion ? 'Update Question & Marks' : 'Create Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="panel-card w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-4 shadow-2xl animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-[var(--red)] flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                Delete Feedback Question?
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                Are you sure you want to delete <strong className="text-[var(--text-primary)]">"{questionToDelete?.question_text}"</strong>? This will remove its relational child options and mark weightages.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="btn btn-danger text-xs py-2 px-4 font-bold shadow-sm flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
