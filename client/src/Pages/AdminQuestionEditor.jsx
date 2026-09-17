import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code,
  Layers,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  Check,
  Copy,
  Terminal,
  ChevronRight
} from 'lucide-react';

import api from '../api/axios';
import ConfirmModal from '../Components/ConfirmModal';

export default function AdminQuestionEditor() {
  const { trackId, levelId, questionId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(questionId && questionId !== 'new');

  const [track, setTrack] = useState(null);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [type, setType] = useState('coding');

  // Coding Payload Fields
  const [constraints, setConstraints] = useState('');
  const [openTestCases, setOpenTestCases] = useState([{ input: '', output: '' }]);
  const [hiddenTestCases, setHiddenTestCases] = useState([{ input: '', output: '' }]);
  const [hints, setHints] = useState(['']);
  const [expectedApproach, setExpectedApproach] = useState('');
  const [expectedComplexity, setExpectedComplexity] = useState('');
  const [interviewTips, setInterviewTips] = useState(['']);

  // Non-coding payloads
  const [idealAnswer, setIdealAnswer] = useState('');
  const [rubrics, setRubrics] = useState(['']);
  const [mcqOptions, setMcqOptions] = useState([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [correctOption, setCorrectOption] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [scenario, setScenario] = useState('');
  const [talkingPoints, setTalkingPoints] = useState(['']);
  const [tradeoffs, setTradeoffs] = useState(['']);
  const [starterCode, setStarterCode] = useState('');
  const [seedData, setSeedData] = useState('');

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    variant: 'primary',
    showCancel: false,
    onConfirm: null,
  });

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }));

  // Load track, level, and existing question if editing
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [trackRes, levelRes] = await Promise.all([
          api.get(`/admin/interviews/tracks/${trackId}`),
          api.get(`/admin/interviews/levels/${levelId}`),
        ]);
        setTrack(trackRes?.data || trackRes);
        const lvl = levelRes?.data || levelRes;
        setLevel(lvl);
        setType(lvl?.mode || 'coding');

        if (isEditing) {
          const qRes = await api.get(`/admin/interviews/questions/${questionId}`);
          const qData = qRes?.data || qRes;
          if (qData) {
            setTitle(qData.title || '');
            setPrompt(qData.prompt || '');
            setDifficulty(qData.difficulty || 'Medium');
            setType(qData.type || lvl?.mode || 'coding');

            // Parse relational detail
            const detail = qData.detail || {};
            const payload = qData.payload || {};

            // Constraints & Approach
            setConstraints(detail.constraints || payload.constraints || '');
            setExpectedApproach(detail.expected_approach || payload.expected_approach || '');
            setExpectedComplexity(detail.expected_complexity || payload.expected_complexity || '');

            // Test Cases (from relational table first, then payload)
            if (Array.isArray(qData.test_cases) && qData.test_cases.length > 0) {
              const relOpen = qData.test_cases
                .filter((tc) => !tc.is_hidden)
                .map((tc) => ({ input: tc.input || '', output: tc.expected_output || tc.output || '' }));
              const relHidden = qData.test_cases
                .filter((tc) => tc.is_hidden)
                .map((tc) => ({ input: tc.input || '', output: tc.expected_output || tc.output || '' }));

              if (relOpen.length > 0) setOpenTestCases(relOpen);
              if (relHidden.length > 0) setHiddenTestCases(relHidden);
            } else {
              if (payload.open_test_cases && payload.open_test_cases.length > 0) {
                setOpenTestCases(payload.open_test_cases);
              } else if (payload.test_cases && payload.test_cases.length > 0) {
                setOpenTestCases(payload.test_cases);
              }
              if (payload.hidden_test_cases && payload.hidden_test_cases.length > 0) {
                setHiddenTestCases(payload.hidden_test_cases);
              }
            }

            // Hints & Interview Tips (from relational hints table first, then payload)
            if (Array.isArray(qData.hints) && qData.hints.length > 0) {
              const relHints = qData.hints.filter((h) => h.type === 'hint').map((h) => h.content);
              const relTips = qData.hints.filter((h) => h.type === 'interview_tip').map((h) => h.content);
              const relRubrics = qData.hints.filter((h) => h.type === 'rubric').map((h) => h.content);
              const relTalking = qData.hints.filter((h) => h.type === 'talking_point').map((h) => h.content);
              const relTradeoffs = qData.hints.filter((h) => h.type === 'tradeoff').map((h) => h.content);

              if (relHints.length > 0) setHints(relHints);
              if (relTips.length > 0) setInterviewTips(relTips);
              if (relRubrics.length > 0) setRubrics(relRubrics);
              if (relTalking.length > 0) setTalkingPoints(relTalking);
              if (relTradeoffs.length > 0) setTradeoffs(relTradeoffs);
            } else {
              if (payload.hints && payload.hints.length > 0) setHints(payload.hints);
              if (payload.interview_tips && payload.interview_tips.length > 0) setInterviewTips(payload.interview_tips);
              if (payload.rubrics && payload.rubrics.length > 0) setRubrics(payload.rubrics);
              if (payload.talking_points && payload.talking_points.length > 0) setTalkingPoints(payload.talking_points);
              if (payload.tradeoffs && payload.tradeoffs.length > 0) setTradeoffs(payload.tradeoffs);
            }

            // Non-coding fields
            setIdealAnswer(detail.ideal_answer || payload.ideal_answer || '');
            setScenario(detail.scenario || payload.scenario || '');
            setExplanation(detail.explanation || payload.explanation || '');
            setCorrectOption(detail.correct_option || payload.correct_option || 'A');
            const foundTmpl = Array.isArray(qData.templates) ? qData.templates.find((t) => t.starter_code) : null;
            setStarterCode(foundTmpl?.starter_code || payload.starter_code || '');
            setSeedData(payload.seed_data || '');

            // MCQ Options (from relational table first, then payload)
            if (Array.isArray(qData.mcq_options) && qData.mcq_options.length > 0) {
              setMcqOptions(qData.mcq_options.map((opt) => ({ id: opt.option_key, text: opt.option_text })));
            } else if (payload.options && payload.options.length > 0) {
              setMcqOptions(payload.options);
            }
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load configuration data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [trackId, levelId, questionId, isEditing]);

  // Dynamic Array Helper handlers
  const handleArrayChange = (setter, list, index, value) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const handleArrayAdd = (setter, list, defaultValue = '') => {
    setter([...list, defaultValue]);
  };

  const handleArrayRemove = (setter, list, index) => {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  };

  // Test Case Helper handlers
  const handleTestCaseChange = (setter, list, index, field, value) => {
    const updated = [...list];
    updated[index] = { ...updated[index], [field]: value };
    setter(updated);
  };

  const handleTestCaseAdd = (setter, list) => {
    setter([...list, { input: '', output: '' }]);
  };

  const handleTestCaseRemove = (setter, list, index) => {
    if (list.length <= 1) return;
    setter(list.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async (e) => {
    e && e.preventDefault();
    if (!title.trim()) {
      setModalConfig({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please provide a clear title for the question.',
        variant: 'warning',
        showCancel: false,
        confirmText: 'Fix',
        onConfirm: closeModal,
      });
      return;
    }

    if (!prompt.trim()) {
      setModalConfig({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please enter the problem statement description / prompt.',
        variant: 'warning',
        showCancel: false,
        confirmText: 'Fix',
        onConfirm: closeModal,
      });
      return;
    }

    setSaving(true);
    try {
      const payloadOpenCases = openTestCases.filter((tc) => tc.input.trim() || tc.output.trim());
      const payloadHiddenCases = hiddenTestCases.filter((tc) => tc.input.trim() || tc.output.trim());
      const cleanedHints = hints.filter((h) => h.trim());
      const cleanedTips = interviewTips.filter((t) => t.trim());

      let payloadObj = {};

      if (type === 'coding' || type === 'backend') {
        payloadObj = {
          constraints: constraints.trim(),
          open_test_cases: payloadOpenCases,
          hidden_test_cases: payloadHiddenCases,
          test_cases: payloadOpenCases,
          hints: cleanedHints,
          expected_approach: expectedApproach.trim(),
          expected_complexity: expectedComplexity.trim(),
          interview_tips: cleanedTips,
        };
      } else if (type === 'verbal_qa') {
        payloadObj = {
          ideal_answer: idealAnswer.trim(),
          rubrics: rubrics.filter((r) => r.trim()),
          interview_tips: cleanedTips,
        };
      } else if (type === 'mcq') {
        payloadObj = {
          options: mcqOptions,
          correct_option: correctOption,
          explanation: explanation.trim(),
          interview_tips: cleanedTips,
        };
      } else if (type === 'whiteboard' || type === 'discussion') {
        payloadObj = {
          scenario: scenario.trim(),
          talking_points: talkingPoints.filter((tp) => tp.trim()),
          tradeoffs: tradeoffs.filter((tr) => tr.trim()),
          interview_tips: cleanedTips,
        };
      } else if (type === 'frontend') {
        payloadObj = {
          starter_code: starterCode.trim(),
          scenario: scenario.trim(),
          constraints: constraints.trim(),
          hints: cleanedHints,
          expected_approach: expectedApproach.trim(),
          interview_tips: cleanedTips,
        };
      } else if (type === 'database') {
        payloadObj = {
          starter_code: starterCode.trim(),
          schema_ddl: starterCode.trim(),
          seed_data: seedData.trim(),
          scenario: scenario.trim(),
          constraints: constraints.trim(),
          hints: cleanedHints,
          expected_approach: expectedApproach.trim(),
          interview_tips: cleanedTips,
        };
      }

      // Build relational child entities
      const detail = {
        constraints: constraints.trim(),
        expected_approach: expectedApproach.trim(),
        expected_complexity: expectedComplexity.trim(),
        ideal_answer: idealAnswer.trim(),
        scenario: scenario.trim(),
        correct_option: correctOption,
        explanation: explanation.trim(),
      };

      const cleanedOpenCases = openTestCases
        .filter((tc) => (tc.input !== '' && tc.input !== undefined) || (tc.output !== '' && tc.output !== undefined))
        .map((tc, idx) => ({
          input: tc.input ?? '',
          expected_output: tc.output ?? '',
          is_hidden: false,
          order_index: idx + 1,
        }));

      const cleanedHiddenCases = hiddenTestCases
        .filter((tc) => (tc.input !== '' && tc.input !== undefined) || (tc.output !== '' && tc.output !== undefined))
        .map((tc, idx) => ({
          input: tc.input ?? '',
          expected_output: tc.output ?? '',
          is_hidden: true,
          order_index: cleanedOpenCases.length + idx + 1,
        }));


      const testCases = [...cleanedOpenCases, ...cleanedHiddenCases];

      const hintsList = [
        ...hints.filter((h) => h.trim()).map((h, i) => ({ type: 'hint', content: h.trim(), order_index: i + 1 })),
        ...interviewTips.filter((t) => t.trim()).map((t, i) => ({ type: 'interview_tip', content: t.trim(), order_index: i + 1 })),
        ...rubrics.filter((r) => r.trim()).map((r, i) => ({ type: 'rubric', content: r.trim(), order_index: i + 1 })),
        ...talkingPoints.filter((tp) => tp.trim()).map((tp, i) => ({ type: 'talking_point', content: tp.trim(), order_index: i + 1 })),
        ...tradeoffs.filter((tr) => tr.trim()).map((tr, i) => ({ type: 'tradeoff', content: tr.trim(), order_index: i + 1 })),
      ];

      const mcqOptionsList = mcqOptions.map((opt) => ({
        option_key: opt.id,
        option_text: opt.text.trim(),
        is_correct: opt.id === correctOption,
      }));

      const templatesList = starterCode.trim()
        ? [{ language: 'javascript', starter_code: starterCode.trim() }]
        : [];

      const requestBody = {
        level_id: Number(levelId),
        title: title.trim(),
        prompt: prompt.trim(),
        difficulty,
        type,
        detail,
        templates: templatesList,
        test_cases: testCases,
        hints: hintsList,
        mcq_options: mcqOptionsList,
      };

      if (isEditing) {
        await api.put(`/admin/interviews/questions/${questionId}`, requestBody);
      } else {
        await api.post(`/admin/interviews/levels/${levelId}/questions`, requestBody);
      }

      const returnUrl = trackId && levelId
        ? `/admin/interviews/${trackId}/levels/${levelId}/questions`
        : '/admin/interviews';

      setModalConfig({
        isOpen: true,
        title: 'Success',
        message: `Question "${title}" saved successfully.`,
        variant: 'primary',
        showCancel: false,
        confirmText: 'Back to Questions',
        onConfirm: () => navigate(returnUrl),
      });
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: 'Save Failed',
        message: err.response?.data?.message || err.message || 'Failed to save question.',
        variant: 'danger',
        showCancel: false,
        confirmText: 'Close',
        onConfirm: closeModal,
      });
    } finally {
      setSaving(false);
    }
  };

  const returnUrl = trackId && levelId
    ? `/admin/interviews/${trackId}/levels/${levelId}/questions`
    : '/admin/interviews';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[var(--text-muted)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading Question Editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => navigate(returnUrl)}
              className="hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Questions</span>
            </button>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <span className="text-[var(--accent)] font-bold">{track?.title || 'Track'}</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
            <span>Level {level?.level_number}: {level?.name}</span>
          </div>

          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">
            {isEditing ? `Edit Question: ${title || 'Untitled'}` : `Create Level ${level?.level_number} Question`}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Configure problem statement, constraints, stdin/stdout test cases, and assessor hints.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate(returnUrl)}
            className="btn btn-secondary text-xs py-2 px-3.5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Question'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Workspace Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Problem Definition, Constraints, Hints */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card: Problem Basics */}
          <div className="panel-card p-5 border border-[var(--border)] space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              <span>Problem Identification</span>
            </h3>

            {/* Question Title */}
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                Question Title <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reverse Linked List / Group Anagrams / LRU Cache"
                className="custom-input text-[13px] font-bold"
                required
              />
            </div>

            {/* Difficulty & Type Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="custom-input text-[12px] cursor-pointer"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Evaluation Format
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="custom-input text-[12px] cursor-pointer"
                >
                  <option value="coding">Live Coding (STDIN/STDOUT Tests)</option>
                  <option value="backend">Backend Service & APIs (Go, Java, Node.js, Python)</option>
                  <option value="database">Database (ER Diagram & SQL Query)</option>
                  <option value="verbal_qa">Verbal Q&A / Conceptual</option>
                  <option value="mcq">Multiple Choice Assessment</option>
                  <option value="whiteboard">System Design & Architecture Whiteboard</option>
                  <option value="frontend">Frontend (React Live Preview & Responsive)</option>
                </select>
              </div>
            </div>

            {/* Problem Statement / Prompt */}
            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                Problem Description & Statement <span className="text-[var(--red)]">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Detail the problem statement, context, input format, output format, and rules for the candidate."
                rows={7}
                className="custom-input text-[13px] leading-relaxed resize-y font-sans"
                required
              />
            </div>
          </div>

          {/* CODING / BACKEND MODE: Problem Constraints & Details */}
          {(type === 'coding' || type === 'backend') && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                <span>Technical Specifications & Constraints</span>
              </h3>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Input / Output Constraints
                </label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. 1 <= nums.length <= 10^5&#10;-10^9 <= nums[i] <= 10^9&#10;Time Limit: 2.0s, Memory Limit: 256MB"
                  rows={4}
                  className="custom-input text-[12px] font-mono resize-y"
                />
              </div>

              {type === 'backend' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)]">
                      Backend Starter Code Template (Optional)
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">Default Node.js/Go router provided if empty</span>
                  </div>
                  <textarea
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    placeholder="// Optional custom handler template for candidate code editor..."
                    rows={6}
                    className="custom-input text-[12px] font-mono bg-[#282c34] text-cyan-300 border-[#3e4451]"
                  />
                </div>
              )}
            </div>
          )}

          {/* NON-CODING FORMATS: MCQ, Verbal QA, Discussion */}
          {type === 'mcq' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                MCQ Options & Verification
              </h3>

              <div className="space-y-3">
                {mcqOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCorrectOption(opt.id)}
                      className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center transition ${
                        correctOption === opt.id
                          ? 'bg-[var(--green)] text-white ring-2 ring-[var(--green)]/30'
                          : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                      title="Mark as correct answer"
                    >
                      {opt.id}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updated = mcqOptions.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o));
                        setMcqOptions(updated);
                      }}
                      placeholder={`Option ${opt.id} text`}
                      className="flex-1 custom-input text-[12px]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Explanation for Correct Option
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why the selected option is correct."
                  rows={3}
                  className="custom-input text-[12px]"
                />
              </div>
            </div>
          )}

          {type === 'verbal_qa' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                Assessor Evaluation Benchmark
              </h3>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Exemplary / Model Answer
                </label>
                <textarea
                  value={idealAnswer}
                  onChange={(e) => setIdealAnswer(e.target.value)}
                  placeholder="Provide key points, nuances, and structure the assessor should expect."
                  rows={5}
                  className="custom-input text-[12px]"
                />
              </div>
            </div>
          )}

          {(type === 'whiteboard' || type === 'discussion') && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                System Architecture & Whiteboard Requirements
              </h3>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Practical Scenario Breakdown
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Describe scale, bottlenecks, and expected throughput requirements."
                  rows={4}
                  className="custom-input text-[12px]"
                />
              </div>
            </div>
          )}

          {type === 'frontend' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-cyan-600 dark:text-cyan-400">
                Frontend (React) Design & Breakpoint Specifications
              </h3>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Layout & Component Requirements
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. Build a responsive card list with real-time search, mobile drawer menu, and interactive counter."
                  rows={3}
                  className="custom-input text-[12px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Responsive Breakpoint Targets
                </label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. Mobile (<640px): 1 col stacked; Tablet (640px-1024px): 2 cols; Desktop (>1024px): 3 cols with sidebar."
                  rows={2}
                  className="custom-input text-[12px] font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Starter React Component (JSX)
                </label>
                <textarea
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  placeholder={`import React, { useState } from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-4 bg-slate-900 text-white">\n      <h1 className="text-xl font-bold">Hello World</h1>\n    </div>\n  );\n}`}
                  rows={6}
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-cyan-300 border-[#3e4451]"
                />
              </div>
            </div>
          )}

          {type === 'database' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-blue-600 dark:text-blue-400">
                Database Schema, ER Model & SQL Specifications
              </h3>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Schema Scenario & Problem Context
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. Design a normalized e-commerce database with users, orders, and products. Write a query to find the top 5 customers by revenue."
                  rows={3}
                  className="custom-input text-[12px]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Pre-Seeded Schema DDL (CREATE TABLE statements)
                </label>
                <textarea
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  placeholder={`CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  username VARCHAR(100) NOT NULL,\n  email VARCHAR(255) NOT NULL\n);`}
                  rows={5}
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-cyan-300 border-[#3e4451]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                  Initial Seed Records (INSERT INTO statements)
                </label>
                <textarea
                  value={seedData}
                  onChange={(e) => setSeedData(e.target.value)}
                  placeholder={`INSERT INTO users (id, username, email) VALUES\n(1, 'jaison_dev', 'jaison@example.com'),\n(2, 'sarah_tech', 'sarah@example.com');`}
                  rows={4}
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-emerald-300 border-[#3e4451]"
                />
              </div>
            </div>
          )}

          {/* Assessor Hints & Interview Tips */}
          <div className="panel-card p-5 border border-[var(--border)] space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Assessor Guidance & Tiered Hints</span>
            </h3>

            {/* Incremental Hints */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)]">
                  Progressive Hints (Unlocked by Assessor)
                </label>
                <button
                  type="button"
                  onClick={() => handleArrayAdd(setHints, hints)}
                  className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Hint</span>
                </button>
              </div>

              {hints.map((hint, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] pt-2 w-5">
                    H{i + 1}
                  </span>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => handleArrayChange(setHints, hints, i, e.target.value)}
                    placeholder={`Hint tier ${i + 1} (e.g. Try using a HashMap to store complements)`}
                    className="flex-1 custom-input text-[12px]"
                  />
                  {hints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleArrayRemove(setHints, hints, i)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded transition"
                      title="Remove Hint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Assessor Probing Tips */}
            <div className="space-y-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)]">
                  Interviewer Probing Tips
                </label>
                <button
                  type="button"
                  onClick={() => handleArrayAdd(setInterviewTips, interviewTips)}
                  className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tip</span>
                </button>
              </div>

              {interviewTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => handleArrayChange(setInterviewTips, interviewTips, i, e.target.value)}
                    placeholder="e.g. Probe the candidate on memory tradeoffs between sorting and hashing."
                    className="flex-1 custom-input text-[12px]"
                  />
                  {interviewTips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleArrayRemove(setInterviewTips, interviewTips, i)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded transition"
                      title="Remove Tip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: STDIN/STDOUT Test Cases & Solution Benchmark */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6">
          {/* BACKEND MODE: Interactive Mini API Tester Notice */}
          {type === 'backend' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-[14px] font-bold text-[var(--text-primary)]">
                  Interactive API Assessment Enabled
                </h4>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                In Backend mode, questions run as live microservice servers. Interviewers test HTTP routes and examine response payloads manually using the built-in <strong>Mini API Tester (Postman)</strong> during the interview. Automated test cases are not required.
              </p>
            </div>
          )}

          {/* CODING MODE: Standard STDIN / STDOUT Test Cases */}
          {type === 'coding' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-5">
              {/* 1. Open Sample Test Cases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--text-primary)]">
                      Sample / Open Test Cases ({openTestCases.length})
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Visible to candidate in problem statement & runner console.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestCaseAdd(setOpenTestCases, openTestCases)}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Sample Case</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {openTestCases.map((tc, idx) => (
                    <div key={idx} className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[var(--text-muted)]">
                        <span>Sample Case #{idx + 1}</span>
                        {openTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleTestCaseRemove(setOpenTestCases, openTestCases, idx)}
                            className="text-[var(--red)] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-0.5">
                            Standard Input (stdin)
                          </label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(setOpenTestCases, openTestCases, idx, 'input', e.target.value)}
                            placeholder="Input piped to stdin (e.g. 5 7 or anagram nagaram)"
                            rows={2}
                            className="custom-input text-[12px] font-mono resize-none w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-0.5">
                            Expected Output (stdout)
                          </label>
                          <textarea
                            value={tc.output}
                            onChange={(e) => handleTestCaseChange(setOpenTestCases, openTestCases, idx, 'output', e.target.value)}
                            placeholder="Exact stdout output (e.g. 12 or true)"
                            rows={2}
                            className="custom-input text-[12px] font-mono resize-none w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Hidden Verification Test Cases */}
              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--text-primary)]">
                      Hidden Grading Test Cases ({hiddenTestCases.length})
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Executed upon final submission to prevent hardcoding.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestCaseAdd(setHiddenTestCases, hiddenTestCases)}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Hidden Case</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {hiddenTestCases.map((tc, idx) => (
                    <div key={idx} className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[var(--text-muted)]">
                        <span>Hidden Case #{idx + 1}</span>
                        {hiddenTestCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleTestCaseRemove(setHiddenTestCases, hiddenTestCases, idx)}
                            className="text-[var(--red)] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-0.5">
                            Standard Input (stdin)
                          </label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange(setHiddenTestCases, hiddenTestCases, idx, 'input', e.target.value)}
                            placeholder="Input piped to stdin (edge case, large n)"
                            rows={2}
                            className="custom-input text-[12px] font-mono resize-none w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-0.5">
                            Expected Output (stdout)
                          </label>
                          <textarea
                            value={tc.output}
                            onChange={(e) => handleTestCaseChange(setHiddenTestCases, hiddenTestCases, idx, 'output', e.target.value)}
                            placeholder="Expected stdout output"
                            rows={2}
                            className="custom-input text-[12px] font-mono resize-none w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Solution Benchmark & Complexity Expectations */}
          <div className="panel-card p-5 border border-[var(--border)] space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Assessor Solution Benchmark</span>
            </h3>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                Optimal Approach & Algorithm Breakdown
              </label>
              <textarea
                value={expectedApproach}
                onChange={(e) => setExpectedApproach(e.target.value)}
                placeholder="Explain the optimal algorithmic technique (e.g. Sliding Window with Frequency Map, Two-Pointers, BFS/DFS, DP)."
                rows={4}
                className="custom-input text-[12px] font-sans resize-y"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block mb-1">
                Target Time & Space Complexity
              </label>
              <textarea
                value={expectedComplexity}
                onChange={(e) => setExpectedComplexity(e.target.value)}
                placeholder="e.g. Time: O(N)&#10;Space: O(1) auxiliary"
                rows={3}
                className="custom-input text-[12px] font-mono resize-y"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        variant={modalConfig.variant}
        showCancel={modalConfig.showCancel}
        onConfirm={modalConfig.onConfirm || closeModal}
        onClose={closeModal}
      />
    </div>
  );
}
