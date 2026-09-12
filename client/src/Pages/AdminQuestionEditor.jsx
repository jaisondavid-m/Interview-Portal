import React, { useState, useEffect, useMemo } from 'react';
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
  FileCode,
  Check,
  RotateCcw,
  Copy,
  Terminal,
  ChevronRight
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

import api from '../api/axios';
import ConfirmModal from '../Components/ConfirmModal';
import { getStarterTemplate } from '../utils/starterTemplates';

const CODE_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node.js)', extension: () => javascript({ jsx: true }) },
  { id: 'python', label: 'Python 3', extension: () => python() },
  { id: 'cpp', label: 'C++ (g++ 17)', extension: () => cpp() },
  { id: 'java', label: 'Java (OpenJDK 17)', extension: () => java() },
];

export default function AdminQuestionEditor() {
  const { trackId, levelId, questionId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(questionId && questionId !== 'new');

  const [track, setTrack] = useState(null);
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Active Code Language Tab in Editor
  const [activeLang, setActiveLang] = useState('javascript');

  // Form State
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [type, setType] = useState('coding');

  // Multi-Language Starter Templates
  const [starterTemplates, setStarterTemplates] = useState({
    javascript: '',
    python: '',
    cpp: '',
    java: '',
  });

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

            // Load multi-language templates (from relational templates table first, then payload)
            const relationalTemplates = {};
            if (Array.isArray(qData.templates) && qData.templates.length > 0) {
              qData.templates.forEach((t) => {
                if (t.language && t.starter_code) {
                  relationalTemplates[t.language] = t.starter_code;
                }
              });
            }

            const defaultTemplates = {
              javascript: relationalTemplates.javascript || getStarterTemplate({ title: qData.title, payload, templates: qData.templates }, 'javascript'),
              python: relationalTemplates.python || getStarterTemplate({ title: qData.title, payload, templates: qData.templates }, 'python'),
              cpp: relationalTemplates.cpp || getStarterTemplate({ title: qData.title, payload, templates: qData.templates }, 'cpp'),
              java: relationalTemplates.java || getStarterTemplate({ title: qData.title, payload, templates: qData.templates }, 'java'),
            };

            if (Object.keys(relationalTemplates).length > 0) {
              setStarterTemplates({
                javascript: relationalTemplates.javascript || defaultTemplates.javascript,
                python: relationalTemplates.python || defaultTemplates.python,
                cpp: relationalTemplates.cpp || defaultTemplates.cpp,
                java: relationalTemplates.java || defaultTemplates.java,
              });
            } else if (payload.starter_templates) {
              setStarterTemplates({
                javascript: payload.starter_templates.javascript || defaultTemplates.javascript,
                python: payload.starter_templates.python || defaultTemplates.python,
                cpp: payload.starter_templates.cpp || defaultTemplates.cpp,
                java: payload.starter_templates.java || defaultTemplates.java,
              });
            } else if (payload.starter_code) {
              setStarterTemplates({
                ...defaultTemplates,
                javascript: payload.starter_code,
              });
            } else {
              setStarterTemplates(defaultTemplates);
            }

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

            // MCQ Options (from relational table first, then payload)
            if (Array.isArray(qData.mcq_options) && qData.mcq_options.length > 0) {
              setMcqOptions(qData.mcq_options.map((opt) => ({ id: opt.option_key, text: opt.option_text })));
            } else if (payload.options && payload.options.length > 0) {
              setMcqOptions(payload.options);
            }
          }
        } else {
          // Initialize new question boilerplate
          setStarterTemplates({
            javascript: getStarterTemplate({ title: 'New Question' }, 'javascript'),
            python: getStarterTemplate({ title: 'New Question' }, 'python'),
            cpp: getStarterTemplate({ title: 'New Question' }, 'cpp'),
            java: getStarterTemplate({ title: 'New Question' }, 'java'),
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load configuration data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [trackId, levelId, questionId, isEditing]);

  // CodeMirror Extension for current selected language
  const selectedExtension = useMemo(() => {
    const langObj = CODE_LANGUAGES.find((l) => l.id === activeLang);
    return langObj ? [langObj.extension()] : [javascript()];
  }, [activeLang]);

  // Update specific language template
  const handleTemplateChange = (val) => {
    setStarterTemplates((prev) => ({
      ...prev,
      [activeLang]: val,
    }));
  };

  // Reset template for active language
  const handleResetActiveTemplate = () => {
    const defaultTemplate = getStarterTemplate({ title }, activeLang);
    setStarterTemplates((prev) => ({
      ...prev,
      [activeLang]: defaultTemplate,
    }));
  };

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
      let payloadObj = {};

      if (type === 'coding') {
        const cleanedOpenCases = openTestCases.filter((tc) => tc.input.trim() || tc.output.trim());
        const cleanedHiddenCases = hiddenTestCases.filter((tc) => tc.input.trim() || tc.output.trim());
        const cleanedHints = hints.filter((h) => h.trim());
        const cleanedTips = interviewTips.filter((t) => t.trim());

        payloadObj = {
          starter_code: starterTemplates.javascript || starterTemplates[activeLang] || '',
          starter_templates: starterTemplates,
          constraints: constraints.trim(),
          open_test_cases: cleanedOpenCases,
          hidden_test_cases: cleanedHiddenCases,
          test_cases: cleanedOpenCases,
          hints: cleanedHints,
          expected_approach: expectedApproach.trim(),
          expected_complexity: expectedComplexity.trim(),
          interview_tips: cleanedTips,
        };
      } else if (type === 'verbal_qa') {
        payloadObj = {
          ideal_answer: idealAnswer.trim(),
          rubrics: rubrics.filter((r) => r.trim()),
          interview_tips: interviewTips.filter((t) => t.trim()),
        };
      } else if (type === 'mcq') {
        payloadObj = {
          options: mcqOptions,
          correct_option: correctOption,
          explanation: explanation.trim(),
          interview_tips: interviewTips.filter((t) => t.trim()),
        };
      } else if (type === 'discussion') {
        payloadObj = {
          scenario: scenario.trim(),
          talking_points: talkingPoints.filter((tp) => tp.trim()),
          tradeoffs: tradeoffs.filter((tr) => tr.trim()),
          interview_tips: interviewTips.filter((t) => t.trim()),
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

      const templates = Object.entries(starterTemplates).map(([lang, code]) => ({
        language: lang,
        starter_code: code || '',
      }));

      const cleanedOpenCases = openTestCases
        .filter((tc) => tc.input.trim() || tc.output.trim())
        .map((tc, idx) => ({
          input: tc.input.trim(),
          expected_output: tc.output.trim(),
          is_hidden: false,
          order_index: idx + 1,
        }));

      const cleanedHiddenCases = hiddenTestCases
        .filter((tc) => tc.input.trim() || tc.output.trim())
        .map((tc, idx) => ({
          input: tc.input.trim(),
          expected_output: tc.output.trim(),
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

      const requestBody = {
        level_id: Number(levelId),
        title: title.trim(),
        prompt: prompt.trim(),
        difficulty,
        type,
        detail,
        templates,
        test_cases: testCases,
        hints: hintsList,
        mcq_options: mcqOptionsList,
      };

      if (isEditing) {
        await api.put(`/admin/interviews/questions/${questionId}`, requestBody);
      } else {
        await api.post(`/admin/interviews/levels/${levelId}/questions`, requestBody);
      }

      setModalConfig({
        isOpen: true,
        title: isEditing ? 'Question Updated' : 'Question Created',
        message: `Assessment question "${title}" was successfully saved into Level ${level?.level_number || 1}.`,
        variant: 'primary',
        showCancel: false,
        confirmText: 'Return to Questions Bank',
        onConfirm: () => {
          closeModal();
          navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`);
        },
      });
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: 'Save Failed',
        message: err.response?.data?.message || err.message || 'Failed to save question configuration.',
        variant: 'danger',
        showCancel: false,
        confirmText: 'OK',
        onConfirm: closeModal,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="panel-card p-16 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
        <p className="text-[14px] text-[var(--text-muted)] font-medium">Loading question workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Header Toolbar */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1 flex-wrap">
            <button
              onClick={() => navigate('/admin/interviews')}
              className="hover:text-[var(--text-primary)] transition"
            >
              Interview Config
            </button>
            <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
            <button
              onClick={() => navigate(`/admin/interviews/${trackId}/levels`)}
              className="hover:text-[var(--text-primary)] transition"
            >
              {track?.title || 'Domain'}
            </button>
            <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
            <button
              onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
              className="hover:text-[var(--text-primary)] transition font-bold text-[var(--accent)]"
            >
              Level {level?.level_number || 1}
            </button>
            <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{isEditing ? 'Edit Question' : 'New Question'}</span>
          </div>

          <h1 className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
            {isEditing ? `Configure: ${title || 'Question'}` : 'New Assessment Question'}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Define question prompt, multi-language starter templates, sample/hidden test cases, hints, and assessor rubrics.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
            disabled={saving}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-[var(--shadow-sm)]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Question Configuration'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Spec Panel + Right Code & Rubrics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Metadata, Statement, Constraints, Hints */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 1: Core Metadata */}
          <div className="panel-card p-5 border border-[var(--border)] space-y-4">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Core Specification</span>
            </h3>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Question Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Two Sum with Target Index Lookup"
                className="w-full custom-input text-[13px] font-medium"
                required
              />
            </div>

            {/* Difficulty & Mode Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Easy', 'Medium', 'Hard'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-1.5 text-xs font-mono font-bold rounded border transition ${
                        difficulty === d
                          ? d === 'Easy'
                            ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/50 shadow-sm'
                            : d === 'Hard'
                            ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/50 shadow-sm'
                            : 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/50 shadow-sm'
                          : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Assessment Mode
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full custom-input text-[13px] font-mono capitalize"
                >
                  <option value="coding">Coding (Live Workspace)</option>
                  <option value="verbal_qa">Verbal Q&A</option>
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="discussion">System Discussion</option>
                </select>
              </div>
            </div>

            {/* Problem Statement */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Problem Statement / Prompt *
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Detailed description of the problem, input definitions, edge conditions..."
                rows={5}
                className="w-full custom-input text-[13px] leading-relaxed resize-y"
                required
              />
            </div>

            {/* Constraints */}
            {type === 'coding' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Constraints & Limits
                </label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g.&#10;2 <= nums.length <= 10^4&#10;-10^9 <= nums[i] <= 10^9"
                  rows={3}
                  className="w-full custom-input text-[12px] font-mono leading-relaxed resize-y"
                />
              </div>
            )}
          </div>

          {/* Card 2: Hints & Tips */}
          <div className="panel-card p-5 border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Hints & Assessor Guidance</span>
              </h3>
              <button
                type="button"
                onClick={() => handleArrayAdd(setHints, hints)}
                className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3" />
                <span>Add Hint</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {hints.map((hint, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] mt-2 w-14 shrink-0">
                    Hint {i + 1}:
                  </span>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => handleArrayChange(setHints, hints, i, e.target.value)}
                    placeholder="e.g. Consider using a hash map to achieve O(1) lookups in a single pass."
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

            {/* Interviewer Tips */}
            <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Interviewer Assessment Tips
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
        {/* RIGHT COLUMN: Multi-Language Code Editor, Test Cases, Solutions */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 space-y-6">
          {/* CODING MODE: Multi-Language Starter Code Editor */}
          {type === 'coding' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[var(--accent)]" />
                    <span>Multi-Language Starter Code Boilerplate</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                    Configure starter function signatures for each language. Candidates receive these templates live.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetActiveTemplate}
                  className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 self-start sm:self-auto font-mono text-amber-500"
                  title="Auto-generate standard function template for selected language"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Auto-Boilerplate</span>
                </button>
              </div>

              {/* Language Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1.5 bg-[#21252b] rounded-[var(--radius-sm)] border border-[#181a1f] overflow-x-auto select-none">
                {CODE_LANGUAGES.map((lang) => {
                  const isSelected = activeLang === lang.id;
                  const hasCustom = Boolean(starterTemplates[lang.id]?.trim());
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setActiveLang(lang.id)}
                      className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#282c34] text-white shadow-sm border border-white/20'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />}
                    </button>
                  );
                })}
              </div>

              {/* CodeMirror Editor Box */}
              <div className="h-[280px] rounded-[var(--radius-md)] border border-[#3e4451] overflow-hidden bg-[#282c34]">
                <CodeMirror
                  value={starterTemplates[activeLang] || ''}
                  height="100%"
                  minHeight="280px"
                  theme={oneDark}
                  extensions={selectedExtension}
                  onChange={handleTemplateChange}
                  className="text-[13px] font-mono h-full"
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    foldGutter: true,
                    syntaxHighlighting: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                  }}
                />
              </div>
            </div>
          )}

          {/* CODING MODE: Sample & Hidden Test Cases */}
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
                        <input
                          type="text"
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(setOpenTestCases, openTestCases, idx, 'input', e.target.value)}
                          placeholder="Input: e.g. nums = [2,7,11,15], target = 9"
                          className="custom-input text-[12px] font-mono"
                        />
                        <input
                          type="text"
                          value={tc.output}
                          onChange={(e) => handleTestCaseChange(setOpenTestCases, openTestCases, idx, 'output', e.target.value)}
                          placeholder="Expected Output: e.g. [0,1]"
                          className="custom-input text-[12px] font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Hidden Verification Test Cases */}
              <div className="pt-4 border-t border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--accent)] flex items-center gap-1.5">
                      <span>Hidden Grading Test Cases ({hiddenTestCases.length})</span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Evaluated on code submission. Hidden from candidate during interview.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestCaseAdd(setHiddenTestCases, hiddenTestCases)}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono text-[var(--accent)]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Hidden Case</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {hiddenTestCases.map((tc, idx) => (
                    <div key={idx} className="p-3 bg-[var(--accent-dim)] rounded-[var(--radius-sm)] border border-[var(--border-accent)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[var(--accent)]">
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
                        <input
                          type="text"
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(setHiddenTestCases, hiddenTestCases, idx, 'input', e.target.value)}
                          placeholder="Input: e.g. nums = [-1,-2,-3,-4,-5], target = -8"
                          className="custom-input text-[12px] font-mono bg-[var(--bg-card)]"
                        />
                        <input
                          type="text"
                          value={tc.output}
                          onChange={(e) => handleTestCaseChange(setHiddenTestCases, hiddenTestCases, idx, 'output', e.target.value)}
                          placeholder="Expected Output: e.g. [2,4]"
                          className="custom-input text-[12px] font-mono bg-[var(--bg-card)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CODING MODE: Expected Solution & Complexity */}
          {type === 'coding' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
                <span>Optimal Solution & Complexity Rubrics</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Expected Optimal Approach (for Assessor)
                </label>
                <textarea
                  value={expectedApproach}
                  onChange={(e) => setExpectedApproach(e.target.value)}
                  placeholder="e.g. Single-pass Hash Map: Store seen values with index. As you iterate, check complement = target - nums[i] in O(1) time."
                  rows={4}
                  className="w-full custom-input text-[12px] leading-relaxed resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Expected Complexity (Time & Space)
                </label>
                <textarea
                  value={expectedComplexity}
                  onChange={(e) => setExpectedComplexity(e.target.value)}
                  placeholder="e.g. Time Complexity: O(N) linear pass&#10;Space Complexity: O(N) hash map storage"
                  rows={2}
                  className="w-full custom-input text-[12px] font-mono leading-relaxed resize-y"
                />
              </div>
            </div>
          )}

          {/* VERBAL Q&A SPECIFIC FIELDS */}
          {type === 'verbal_qa' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                Verbal Q&A Model Answer & Rubrics
              </h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Model / Ideal Answer
                </label>
                <textarea
                  value={idealAnswer}
                  onChange={(e) => setIdealAnswer(e.target.value)}
                  placeholder="Comprehensive ideal answer with key terminology..."
                  rows={5}
                  className="w-full custom-input text-[13px] leading-relaxed resize-y"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                    Evaluation Rubrics Criteria
                  </label>
                  <button
                    type="button"
                    onClick={() => handleArrayAdd(setRubrics, rubrics)}
                    className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Rubric</span>
                  </button>
                </div>
                {rubrics.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={r}
                      onChange={(e) => handleArrayChange(setRubrics, rubrics, idx, e.target.value)}
                      placeholder="e.g. Mentions user-space M:N scheduler vs kernel thread context switch."
                      className="flex-1 custom-input text-[12px]"
                    />
                    {rubrics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleArrayRemove(setRubrics, rubrics, idx)}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MCQ SPECIFIC FIELDS */}
          {type === 'mcq' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                MCQ Options & Answer Key
              </h3>
              <div className="space-y-3">
                {mcqOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[var(--bg-raised)] border border-[var(--border)] text-[12px] font-mono font-bold flex items-center justify-center shrink-0">
                      {opt.id}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...mcqOptions];
                        updated[idx].text = e.target.value;
                        setMcqOptions(updated);
                      }}
                      placeholder={`Option ${opt.id} text...`}
                      className="flex-1 custom-input text-[12px]"
                    />
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctOption === opt.id}
                      onChange={() => setCorrectOption(opt.id)}
                      className="w-4 h-4 text-[var(--green)]"
                      title="Mark as correct answer"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Explanation & Reference
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Detailed explanation of why the correct option is right..."
                  rows={3}
                  className="w-full custom-input text-[12px]"
                />
              </div>
            </div>
          )}

          {/* DISCUSSION SPECIFIC FIELDS */}
          {type === 'discussion' && (
            <div className="panel-card p-5 border border-[var(--border)] space-y-4">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                System Discussion Scenario & Tradeoffs
              </h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  Scenario Overview
                </label>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="High-scale scenario requirements..."
                  rows={3}
                  className="w-full custom-input text-[12px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating / Sticky Save Bar */}
      <div className="sticky bottom-4 z-20 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)]/90 backdrop-blur-md shadow-xl flex items-center justify-between gap-4">
        <div className="text-xs text-[var(--text-secondary)] font-mono hidden sm:block">
          Assessment Mode: <strong className="uppercase text-[var(--text-primary)]">{type}</strong> • Difficulty: <strong className="text-[var(--text-primary)]">{difficulty}</strong>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          <button
            type="button"
            onClick={() => navigate(`/admin/interviews/${trackId}/levels/${levelId}/questions`)}
            disabled={saving}
            className="btn btn-secondary text-xs py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 font-bold shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Question Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation & Notice Modal */}
      <ConfirmModal {...modalConfig} onClose={closeModal} />
    </div>
  );
}
