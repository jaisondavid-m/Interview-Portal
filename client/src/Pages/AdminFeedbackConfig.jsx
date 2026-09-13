import React, { useState, useEffect } from 'react';
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
  Hash
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
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active tab: 'config' or 'submissions'
  const [activeTab, setActiveTab] = useState('config');
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

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

  // Fetch recent peer feedback submissions
  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const res = await api.get('/admin/feedback/submissions');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSubmissions(list);
    } catch (err) {
      console.error('Failed to load feedback submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab]);

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
    setCustomOptionMarks(5);
    setShowModal(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    const existingOpts = (q.options || []).map((o) => ({
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
    setCustomOptionMarks(5);
    setShowModal(true);
  };

  const handleAddOption = () => {
    const trimmed = customOptionText.trim();
    if (trimmed && !formData.options.some((o) => o.option_text === trimmed)) {
      setFormData((prev) => {
        const nextOpts = [
          ...prev.options,
          { option_text: trimmed, marks: parseFloat(customOptionMarks) || 0 },
        ];
        const computedMax = Math.max(...nextOpts.map((o) => o.marks || 0), 0);
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
      const computedMax = nextOpts.length > 0 ? Math.max(...nextOpts.map((o) => o.marks || 0), 0) : 0;
      return {
        ...prev,
        options: nextOpts,
        max_marks: computedMax > 0 ? computedMax : prev.max_marks,
      };
    });
  };

  const handleUpdateOptionMarks = (index, newMarks) => {
    const numericMarks = parseFloat(newMarks) || 0;
    setFormData((prev) => {
      const nextOpts = prev.options.map((opt, idx) =>
        idx === index ? { ...opt, marks: numericMarks } : opt
      );
      const computedMax = Math.max(...nextOpts.map((o) => o.marks || 0), 0);
      return {
        ...prev,
        options: nextOpts,
        max_marks: computedMax > 0 ? computedMax : prev.max_marks,
      };
    });
  };

  const handleApplyPreset = (presetOptions) => {
    const computedMax = Math.max(...presetOptions.map((o) => o.marks || 0), 0);
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
        optionsPayload = formData.options;
      } else if (formData.question_type === 'yes_no') {
        optionsPayload = formData.options.length === 2 ? formData.options : [
          { option_text: 'Yes', marks: 5 },
          { option_text: 'No', marks: 0 },
        ];
      }

      const computedMax = optionsPayload.length > 0
        ? Math.max(...optionsPayload.map((o) => o.marks || 0), parseFloat(formData.max_marks) || 0)
        : parseFloat(formData.max_marks) || 0;

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

        {/* Tab Switcher & New Question Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--bg-raised)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-semibold font-ui transition-all ${
                activeTab === 'config'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Questions & Marks ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-semibold font-ui transition-all ${
                activeTab === 'submissions'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Audits & Scorecards
            </button>
          </div>

          {activeTab === 'config' && (
            <button
              onClick={openCreateModal}
              className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          )}
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

      {/* ============================================================ */}
      {/* TAB 1: QUESTIONS CONFIGURATION */}
      {/* ============================================================ */}
      {activeTab === 'config' && (
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
                  Add evaluation questions with mark weightage for students to complete after concluding mutual mock interviews.
                </p>
                <button
                  onClick={openCreateModal}
                  className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Question</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const opts = q.options || [];
                  const isMCQ = q.question_type === 'mcq';
                  const isYesNo = q.question_type === 'yes_no';
                  const isText = q.question_type === 'text';

                  return (
                    <div
                      key={q.id}
                      className={`panel-card p-5 border transition-all ${
                        q.is_active
                          ? 'border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]'
                          : 'border-[var(--border)]/60 bg-[var(--bg-raised)]/50 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 flex-1">
                          {/* Order Index Badge */}
                          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] font-mono text-xs font-bold shrink-0 mt-0.5">
                            #{q.order_index || idx + 1}
                          </div>

                          <div className="space-y-2 flex-1">
                            {/* Question Title & Type Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  isMCQ
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                    : isYesNo
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {isMCQ ? 'MCQ Choice' : isYesNo ? 'Yes / No' : 'Written Text'}
                              </span>

                              {/* Max Marks Pill */}
                              {q.max_marks > 0 && (
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-emerald-500/20 text-emerald-500" />
                                  Max: {q.max_marks} pts
                                </span>
                              )}

                              {q.is_required && (
                                <span className="text-[10px] font-mono text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded border border-[var(--border-accent)] font-semibold">
                                  Required
                                </span>
                              )}

                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  q.is_active
                                    ? 'bg-green-500/10 text-green-600 border-green-500/20 font-bold'
                                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                }`}
                              >
                                {q.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            <h3 className="text-[15px] font-bold text-[var(--text-primary)] leading-snug">
                              {q.question_text}
                            </h3>

                            {/* Render Options Preview with Marks */}
                            {isMCQ && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                <span className="text-[11px] font-mono text-[var(--text-muted)] mr-1">
                                  Options & Weightage:
                                </span>
                                {opts.map((opt) => (
                                  <span
                                    key={opt.id}
                                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-primary)] border border-[var(--border)] flex items-center gap-1"
                                  >
                                    <span>{opt.option_text}</span>
                                    <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-1 rounded">
                                      +{opt.marks ?? 0}m
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {isYesNo && (
                              <div className="flex items-center gap-2 pt-1">
                                {opts.map((opt) => {
                                  const isYes = opt.option_text.toLowerCase() === 'yes';
                                  return (
                                    <span
                                      key={opt.id}
                                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded font-bold border flex items-center gap-1.5 ${
                                        isYes
                                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                      }`}
                                    >
                                      <span>{opt.option_text}</span>
                                      <span className="text-[10px] opacity-80">({opt.marks ?? (isYes ? 5 : 0)} pts)</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {isText && (
                              <p className="text-[11px] font-mono text-[var(--text-muted)] italic pt-0.5">
                                Single or multi-line student qualitative text review
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleActive(q)}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            title={q.is_active ? 'Disable question' : 'Activate question'}
                          >
                            {q.is_active ? (
                              <ToggleRight className="w-5 h-5 text-[var(--accent)]" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(q)}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors"
                            title="Edit question and mark weightage"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setQuestionToDelete(q);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors"
                            title="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    Student Popup Preview
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
                    Your ratings calculate your peer's official mock interview score.
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
      )}

      {/* ============================================================ */}
      {/* TAB 2: AUDIT & SUBMISSIONS WITH SCORES */}
      {/* ============================================================ */}
      {activeTab === 'submissions' && (
        <div className="panel-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
                Peer Feedback & Evaluated Scorecards
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Audit mutual evaluations, calculated total marks, and score percentages configured by admin weightage.
              </p>
            </div>
            <button
              onClick={fetchSubmissions}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              Refresh
            </button>
          </div>

          {submissionsLoading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
              <p className="text-[13px] text-[var(--text-muted)]">Loading feedback records...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center space-y-2 border-dashed border border-[var(--border)] rounded-[var(--radius-md)]">
              <MessageSquareCheck className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
              <h4 className="text-[15px] font-bold text-[var(--text-primary)]">No feedback submissions found</h4>
              <p className="text-[13px] text-[var(--text-muted)]">
                When students complete peer mock sessions, their mutual evaluations and scorecards will be logged here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => {
                const reviewer = sub.reviewer || {};
                const reviewee = sub.reviewee || {};
                const responses = sub.responses || [];
                const pct = Math.round(sub.score_percentage || 0);

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-3 shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded border border-[var(--border-accent)]">
                          Session #{sub.session_id}
                        </span>
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          {reviewer.name} ({reviewer.roll_no || reviewer.email})
                        </span>
                        <span className="text-[12px] text-[var(--text-muted)] font-mono">evaluated</span>
                        <span className="text-[13px] font-bold text-purple-600 dark:text-purple-400">
                          {reviewee.name} ({reviewee.roll_no || reviewee.email})
                        </span>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                          <Star className="w-3.5 h-3.5 fill-emerald-500/20" />
                          <span>Score: {sub.total_score} / {sub.max_score} ({pct}%)</span>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {formatDateTime(sub.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Responses Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {responses.map((resp) => {
                        const question = resp.question || {};
                        return (
                          <div
                            key={resp.id}
                            className="p-3 rounded bg-[var(--bg-card)] border border-[var(--border)] space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[var(--text-muted)] font-medium text-[11px]">
                                {question.question_text || `Question #${resp.question_id}`}
                              </p>
                              {resp.max_marks > 0 && (
                                <span className="text-[10px] font-mono font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded shrink-0">
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
                );
              })}
            </div>
          )}
        </div>
      )}

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
                            value={opt.marks ?? 0}
                            onChange={(e) => handleUpdateOptionMarks(idx, e.target.value)}
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
                        value={customOptionMarks}
                        onChange={(e) => setCustomOptionMarks(e.target.value)}
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
                            value={opt.marks ?? (isYes ? 5 : 0)}
                            onChange={(e) => handleUpdateOptionMarks(idx, e.target.value)}
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
                    value={formData.max_marks}
                    onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
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
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
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
