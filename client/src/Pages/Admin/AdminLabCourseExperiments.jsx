import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Code2,
  FileText,
  Play,
  Save,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Layers,
  ChevronRight,
  BookOpen,
  Hash,
  Award,
  Terminal,
  Braces,
  ListPlus,
  X,
  MessageSquareCheck,
  Zap,
  Copy,
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';

export default function AdminLabCourseExperiments() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Selected experiment & question variant
  const [selectedExpId, setSelectedExpId] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeEditorTab, setActiveEditorTab] = useState('details'); // 'details' | 'algo' | 'solution' | 'testcases' | 'viva'
  const [testingSolution, setTestingSolution] = useState(false);
  const [solutionTestResult, setSolutionTestResult] = useState(null);

  // Form data for active variant
  const emptyVariant = {
    id: 0,
    experiment_id: 0,
    course_id: Number(courseId) || 1,
    question_code: 'EX1_VAR_A',
    title: '',
    aim: '',
    reference_algorithm: JSON.stringify([
      'Initialize necessary variables and data structures.',
      'Accept input from user or test runner.',
      'Apply computational logic and process the dataset.',
      'Return or display formatted expected result.',
    ], null, 2),
    solution_code: '# Reference Solution for Faculty\n\ndef solution(data):\n    # Process data and return output\n    return data\n\nif __name__ == "__main__":\n    import sys\n    input_data = sys.stdin.read().strip()\n    print(solution(input_data))\n',
    language: 'python',
    sample_test_cases: JSON.stringify([{ input: 'sample_input_1', expected_output: 'sample_output_1' }], null, 2),
    hidden_test_cases: JSON.stringify([{ input: 'hidden_input_1', expected_output: 'hidden_output_1' }], null, 2),
    max_marks: 10,
    viva_questions_count: 5,
    is_active: true,
    viva_questions: [
      {
        question: 'What is the algorithmic time and space complexity of your solution?',
        answer: 'Time complexity is O(N); Space complexity is O(1) auxiliary memory.',
        order_index: 1,
      },
      {
        question: 'How does your implementation handle edge cases such as empty or invalid inputs?',
        answer: 'Input validation guards check for boundary values at function entry.',
        order_index: 2,
      },
    ],
  };

  const [formData, setFormData] = useState(emptyVariant);
  const [sampleMode, setSampleMode] = useState('visual'); // 'visual' | 'json'
  const [hiddenMode, setHiddenMode] = useState('visual'); // 'visual' | 'json'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/labs/courses/${courseId}/experiments`);
      setCourse(res?.course || null);
      const list = res?.experiments || [];
      setExperiments(list);

      if (list.length > 0) {
        const initialExp = selectedExpId ? list.find((e) => e.id === selectedExpId) || list[0] : list[0];
        selectExperiment(initialExp);
      }
    } catch (err) {
      showToast('Failed to load course experiments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectExperiment = async (exp) => {
    setSelectedExpId(exp.id);
    setSolutionTestResult(null);
    try {
      const res = await api.get(`/admin/labs/experiments/${exp.id}/variants`);
      const varList = res?.variants || [];
      if (varList.length > 0) {
        setVariants(varList);
        setSelectedVariantIndex(0);
        loadVariantIntoForm(varList[0], exp);
      } else {
        // Create initial default variant locally
        const defaultVar = {
          ...emptyVariant,
          experiment_id: exp.id,
          course_id: exp.course_id,
          question_code: `EX${exp.experiment_no}_VAR_A`,
          title: exp.title,
          aim: exp.aim,
          reference_algorithm: exp.procedure || emptyVariant.reference_algorithm,
          solution_code: exp.starter_code || emptyVariant.solution_code,
          language: exp.language || 'python',
          sample_test_cases: exp.sample_test_cases || emptyVariant.sample_test_cases,
          hidden_test_cases: exp.hidden_test_cases || emptyVariant.hidden_test_cases,
          max_marks: exp.max_marks || 10,
        };
        setVariants([defaultVar]);
        setSelectedVariantIndex(0);
        setFormData(defaultVar);
      }
    } catch {
      showToast('Could not load question variants.', 'error');
    }
  };

  const loadVariantIntoForm = (v, parentExp) => {
    let algoText = v.reference_algorithm || '';
    if (algoText && !algoText.startsWith('[') && !algoText.startsWith('{')) {
      // Convert plain text procedure to JSON array of lines
      const lines = algoText.split('\n').filter((l) => l.trim().length > 0);
      algoText = JSON.stringify(lines, null, 2);
    }

    setFormData({
      id: v.id || 0,
      experiment_id: v.experiment_id || parentExp?.id || selectedExpId,
      course_id: v.course_id || Number(courseId),
      question_code: v.question_code || `EX_VAR_${variants.length + 1}`,
      title: v.title || parentExp?.title || '',
      aim: v.aim || parentExp?.aim || '',
      reference_algorithm: algoText || emptyVariant.reference_algorithm,
      solution_code: v.solution_code || emptyVariant.solution_code,
      language: v.language || 'python',
      sample_test_cases: v.sample_test_cases || emptyVariant.sample_test_cases,
      hidden_test_cases: v.hidden_test_cases || emptyVariant.hidden_test_cases,
      max_marks: v.max_marks || 10,
      viva_questions_count: v.viva_questions_count || 5,
      is_active: v.is_active !== false,
      viva_questions: v.viva_questions || emptyVariant.viva_questions,
    });
  };

  const handleAddNewVariant = () => {
    const nextChar = String.fromCharCode(65 + variants.length); // A, B, C, D...
    const currentExp = experiments.find((e) => e.id === selectedExpId);
    const newVar = {
      ...emptyVariant,
      id: 0,
      experiment_id: selectedExpId,
      course_id: Number(courseId),
      question_code: `EX${currentExp?.experiment_no || 1}_VAR_${nextChar}`,
      title: `${currentExp?.title || 'Experiment'} - Variant ${nextChar}`,
      aim: currentExp?.aim || '',
      max_marks: currentExp?.max_marks || 10,
    };
    const updated = [...variants, newVar];
    setVariants(updated);
    setSelectedVariantIndex(updated.length - 1);
    setFormData(newVar);
    setActiveEditorTab('details');
    showToast(`Added Question Variant ${nextChar}. Configure and save.`, 'success');
  };

  const handleSwitchVariant = (idx) => {
    setSelectedVariantIndex(idx);
    const currentExp = experiments.find((e) => e.id === selectedExpId);
    loadVariantIntoForm(variants[idx], currentExp);
    setSolutionTestResult(null);
  };

  // ── Algorithm Procedure Builder Helpers ─────────────────────────────────────
  const getAlgoSteps = () => {
    try {
      const parsed = JSON.parse(formData.reference_algorithm || '[]');
      return Array.isArray(parsed) ? parsed : [formData.reference_algorithm];
    } catch {
      return formData.reference_algorithm
        ? formData.reference_algorithm.split('\n').filter((l) => l.trim())
        : [];
    }
  };

  const updateAlgoSteps = (steps) => {
    setFormData((prev) => ({
      ...prev,
      reference_algorithm: JSON.stringify(steps, null, 2),
    }));
  };

  const handleAddAlgoStep = () => {
    const current = getAlgoSteps();
    updateAlgoSteps([...current, `Step ${current.length + 1}: Describe execution operation`]);
  };

  const handleEditAlgoStep = (index, value) => {
    const current = [...getAlgoSteps()];
    current[index] = value;
    updateAlgoSteps(current);
  };

  const handleDeleteAlgoStep = (index) => {
    const current = getAlgoSteps().filter((_, i) => i !== index);
    updateAlgoSteps(current);
  };

  // ── Viva Question Pool Helpers ──────────────────────────────────────────────
  const handleAddVivaQuestion = () => {
    const current = formData.viva_questions || [];
    setFormData((prev) => ({
      ...prev,
      viva_questions: [
        ...current,
        {
          question: '',
          answer: '',
          order_index: current.length + 1,
        },
      ],
    }));
  };

  const handleEditVivaQuestion = (index, field, value) => {
    const current = [...(formData.viva_questions || [])];
    if (current[index]) {
      current[index] = { ...current[index], [field]: value };
      setFormData((prev) => ({ ...prev, viva_questions: current }));
    }
  };

  const handleDeleteVivaQuestion = (index) => {
    const current = (formData.viva_questions || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, viva_questions: current }));
  };

  // ── Test Cases Helpers ──────────────────────────────────────────────────────
  const getParsedCases = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const updateSampleCases = (newCases) => {
    setFormData((prev) => ({
      ...prev,
      sample_test_cases: JSON.stringify(newCases, null, 2),
    }));
  };

  const updateHiddenCases = (newCases) => {
    setFormData((prev) => ({
      ...prev,
      hidden_test_cases: JSON.stringify(newCases, null, 2),
    }));
  };

  const addVisualTestCase = (isSample) => {
    if (isSample) {
      const current = getParsedCases(formData.sample_test_cases);
      updateSampleCases([...current, { input: '', expected_output: '' }]);
    } else {
      const current = getParsedCases(formData.hidden_test_cases);
      updateHiddenCases([...current, { input: '', expected_output: '' }]);
    }
  };

  const editVisualTestCase = (isSample, index, field, value) => {
    if (isSample) {
      const current = [...getParsedCases(formData.sample_test_cases)];
      if (current[index]) {
        current[index] = { ...current[index], [field]: value };
        updateSampleCases(current);
      }
    } else {
      const current = [...getParsedCases(formData.hidden_test_cases)];
      if (current[index]) {
        current[index] = { ...current[index], [field]: value };
        updateHiddenCases(current);
      }
    }
  };

  const deleteVisualTestCase = (isSample, index) => {
    if (isSample) {
      const current = getParsedCases(formData.sample_test_cases).filter((_, i) => i !== index);
      updateSampleCases(current);
    } else {
      const current = getParsedCases(formData.hidden_test_cases).filter((_, i) => i !== index);
      updateHiddenCases(current);
    }
  };

  // ── Test Run Solution Code ──────────────────────────────────────────────────
  const handleTestRunSolution = async () => {
    if (!formData.solution_code?.trim()) {
      showToast('Please enter solution code to test.', 'error');
      return;
    }
    try {
      setTestingSolution(true);
      setSolutionTestResult(null);
      const res = await api.post('/admin/labs/solution-test', {
        code: formData.solution_code,
        language: formData.language || 'python',
        sample_test_cases: formData.sample_test_cases,
        hidden_test_cases: formData.hidden_test_cases,
      });
      setSolutionTestResult(res);
      showToast(
        `Solution test executed: ${res.pass_count}/${res.total_test_cases} test cases passed!`,
        res.pass_count === res.total_test_cases ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to execute solution code.', 'error');
    } finally {
      setTestingSolution(false);
    }
  };

  // ── Save / Delete Handlers ──────────────────────────────────────────────────
  const handleSaveVariant = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title?.trim() || !formData.aim?.trim()) {
      showToast('Question Title and Aim are required.', 'error');
      return;
    }

    try {
      JSON.parse(formData.sample_test_cases || '[]');
      JSON.parse(formData.hidden_test_cases || '[]');
    } catch {
      showToast('Test cases JSON contains syntax errors. Please correct it.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        experiment_id: selectedExpId,
        course_id: Number(courseId),
      };
      const res = await api.post(`/admin/labs/experiments/${selectedExpId}/variants`, payload);
      showToast('Question variant & viva pool saved successfully!', 'success');

      // Refresh variants
      const updatedVariantsRes = await api.get(`/admin/labs/experiments/${selectedExpId}/variants`);
      const varList = updatedVariantsRes?.variants || [];
      setVariants(varList);
      if (res?.variant?.id) {
        const foundIdx = varList.findIndex((v) => v.id === res.variant.id);
        if (foundIdx >= 0) setSelectedVariantIndex(foundIdx);
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save question variant.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async () => {
    if (variants.length <= 1) {
      showToast('Each experiment must have at least one question variant.', 'error');
      return;
    }
    const currentVar = variants[selectedVariantIndex];
    if (!window.confirm(`Delete question variant ${currentVar.question_code || 'Variant'}?`)) return;

    try {
      if (currentVar.id > 0) {
        await api.delete(`/admin/labs/experiments/variants/${currentVar.id}`);
      }
      showToast('Question variant removed.', 'success');
      const updated = variants.filter((_, i) => i !== selectedVariantIndex);
      setVariants(updated);
      const newIdx = Math.max(0, selectedVariantIndex - 1);
      setSelectedVariantIndex(newIdx);
      const currentExp = experiments.find((e) => e.id === selectedExpId);
      loadVariantIntoForm(updated[newIdx], currentExp);
    } catch {
      showToast('Failed to delete question variant.', 'error');
    }
  };

  const filteredExperiments = experiments.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.aim?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.experiment_no).includes(search)
  );

  const currentExp = experiments.find((e) => e.id === selectedExpId);
  const parsedSampleCount = getParsedCases(formData.sample_test_cases).length;
  const parsedHiddenCount = getParsedCases(formData.hidden_test_cases).length;
  const algoSteps = getAlgoSteps();
  const vivaList = formData.viva_questions || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
              : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/labs/config')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent)]" />
            Back to Courses
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                {course?.course_code || 'LAB'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                {course?.degree} · {course?.semester}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                {course?.academic_year}
              </span>
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight mt-1 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[var(--accent)]" />
              {course?.title || 'Laboratory Course & Question Pool Manager'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => navigate(`/admin/labs/courses/${courseId}/pdf-designer`)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            PDF Designer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading course workspace & question variants...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT SIDEBAR: Experiments List (lg:col-span-4)                 */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                Curriculum Experiments ({experiments.length})
              </h2>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search experiments..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredExperiments.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                  No experiments found.
                </div>
              ) : (
                filteredExperiments.map((exp) => {
                  const isSelected = selectedExpId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      onClick={() => selectExperiment(exp)}
                      className={`p-3.5 rounded-[var(--radius-md)] border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[var(--accent-dim)]/40 border-[var(--border-accent)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--accent)]/30'
                          : 'bg-[var(--bg-raised)]/60 border-[var(--border)] hover:border-[var(--border-accent)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                : 'bg-[var(--bg-input)] text-[var(--accent)] border-[var(--border)]'
                            }`}
                          >
                            Ex {exp.experiment_no}
                          </span>
                          <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                            {exp.title}
                          </h3>
                        </div>
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            isSelected ? 'text-[var(--accent)] translate-x-0.5' : 'text-[var(--text-muted)]'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-1.5 leading-relaxed">
                        {exp.aim || 'No problem statement configured.'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT MAIN PANE: Question Variant Studio (lg:col-span-8)       */}
          {/* ============================================================== */}
          <div className="lg:col-span-8 space-y-4">
            {/* Experiment Title Banner & Variants Selector */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                    Experiment #{currentExp?.experiment_no || 1}
                  </span>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {currentExp?.title || 'Experiment Details'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewVariant}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question Variant
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVariant}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Variant
                  </button>
                </div>
              </div>

              {/* Question Variants Pills Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Question Variants Pool ({variants.length}) — Randomly assigned to students
                  </span>
                  {variants.length > 1 && (
                    <button
                      onClick={handleDeleteVariant}
                      className="text-[11px] text-[var(--red)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Delete Variant
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {variants.map((v, idx) => {
                    const isSelected = selectedVariantIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSwitchVariant(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-accent)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{v.question_code || `Variant ${idx + 1}`}</span>
                        {v.viva_questions && v.viva_questions.length > 0 && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-raised)] text-[var(--text-muted)]'
                            }`}
                          >
                            {v.viva_questions.length} viva
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editor Tabs Navigation */}
              <div className="flex items-center gap-1 border-b border-[var(--border)] pt-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('details')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeEditorTab === 'details'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Problem Statement & Aim
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('algo')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeEditorTab === 'algo'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  Reference Algorithm Steps ({algoSteps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('solution')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeEditorTab === 'solution'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Reference Solution Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('testcases')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeEditorTab === 'testcases'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Test Cases ({parsedSampleCount + parsedHiddenCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('viva')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeEditorTab === 'viva'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <MessageSquareCheck className="w-3.5 h-3.5" />
                  Viva Voce Pool ({vivaList.length})
                </button>
              </div>

              {/* TAB 1: Problem Statement & Aim */}
              {activeEditorTab === 'details' && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Question Code
                      </label>
                      <input
                        type="text"
                        value={formData.question_code}
                        onChange={(e) => setFormData({ ...formData, question_code: e.target.value })}
                        placeholder="e.g. EX1_VAR_A"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Question Variant Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Online Shopping Cart with Tiered Discounts"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Problem Statement & Aim
                    </label>
                    <textarea
                      rows={4}
                      value={formData.aim}
                      onChange={(e) => setFormData({ ...formData, aim: e.target.value })}
                      placeholder="Detailed aim, business problem, and expected functional behaviour..."
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Programming Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] cursor-pointer"
                      >
                        <option value="python">Python 3</option>
                        <option value="c">C Language</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Total Maximum Marks
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.max_marks}
                        onChange={(e) => setFormData({ ...formData, max_marks: Number(e.target.value) || 10 })}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Viva Questions to Ask
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.viva_questions_count}
                        onChange={(e) => setFormData({ ...formData, viva_questions_count: Number(e.target.value) || 5 })}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Reference Algorithm Steps */}
              {activeEditorTab === 'algo' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        Faculty Reference Algorithm / Procedure Steps
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        These steps will be shown to faculty side-by-side during viva review to evaluate student's submitted algorithm.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAlgoStep}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {algoSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]"
                      >
                        <span className="font-mono text-xs font-bold text-[var(--accent)] px-2 py-1 rounded bg-[var(--bg-input)] shrink-0 border border-[var(--border)]">
                          Step {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => handleEditAlgoStep(idx, e.target.value)}
                          placeholder="Describe algorithm step..."
                          className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteAlgoStep(idx)}
                          className="text-[var(--text-muted)] hover:text-[var(--red)] p-1.5 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Reference Solution Code */}
              {activeEditorTab === 'solution' && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-[var(--accent)]" />
                        Master Reference Solution Code (Faculty Reference)
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Students do NOT see this code. Faculty uses this reference code to compare student logic during viva review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestRunSolution}
                      disabled={testingSolution}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {testingSolution ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      Test Run Solution Against All Cases
                    </button>
                  </div>

                  {solutionTestResult && (
                    <div
                      className={`p-3 rounded-[var(--radius-md)] border text-xs font-mono space-y-1.5 ${
                        solutionTestResult.pass_count === solutionTestResult.total_test_cases
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Execution Verdict: {solutionTestResult.pass_count} / {solutionTestResult.total_test_cases} Test Cases Passed
                      </div>
                      <div className="text-[11px] opacity-80 max-h-32 overflow-y-auto space-y-1">
                        {solutionTestResult.results?.map((r, i) => (
                          <div key={i}>
                            {r.passed ? '✓' : '✗'} {r.name}: {r.passed ? 'Passed' : `Expected '${r.expected}', got '${r.actual}'`} ({r.execution_ms}ms)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="h-96 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)]">
                    <CodeEditor
                      code={formData.solution_code}
                      language={formData.language || 'python'}
                      onChange={(val) => setFormData({ ...formData, solution_code: val })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: Test Cases */}
              {activeEditorTab === 'testcases' && (
                <div className="space-y-6 pt-2">
                  {/* Sample Test Cases (Visible to student) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Sample Test Cases (Visible to Students during 'Run Code')
                        </h4>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Used for instant sandbox feedback.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSampleMode(sampleMode === 'visual' ? 'json' : 'visual')}
                          className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          {sampleMode === 'visual' ? 'Raw JSON' : 'Visual Builder'}
                        </button>
                        {sampleMode === 'visual' && (
                          <button
                            type="button"
                            onClick={() => addVisualTestCase(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Case
                          </button>
                        )}
                      </div>
                    </div>

                    {sampleMode === 'visual' ? (
                      <div className="space-y-2">
                        {getParsedCases(formData.sample_test_cases).map((tc, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3 relative"
                          >
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                                Input #{idx + 1}
                              </label>
                              <textarea
                                rows={2}
                                value={tc.input}
                                onChange={(e) => editVisualTestCase(true, idx, 'input', e.target.value)}
                                placeholder="stdin / parameter input"
                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                                Expected Output
                              </label>
                              <textarea
                                rows={2}
                                value={tc.expected_output || tc.expected || ''}
                                onChange={(e) => editVisualTestCase(true, idx, 'expected_output', e.target.value)}
                                placeholder="exact expected stdout"
                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteVisualTestCase(true, idx)}
                              className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--red)] p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={5}
                        value={formData.sample_test_cases}
                        onChange={(e) => setFormData({ ...formData, sample_test_cases: e.target.value })}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                      />
                    )}
                  </div>

                  {/* Hidden Test Cases (Grading only) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          Hidden Benchmark Test Cases (Grading / Submit Code)
                        </h4>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Executed during 'Submit Code'. Never exposed directly in student browser.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHiddenMode(hiddenMode === 'visual' ? 'json' : 'visual')}
                          className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          {hiddenMode === 'visual' ? 'Raw JSON' : 'Visual Builder'}
                        </button>
                        {hiddenMode === 'visual' && (
                          <button
                            type="button"
                            onClick={() => addVisualTestCase(false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Case
                          </button>
                        )}
                      </div>
                    </div>

                    {hiddenMode === 'visual' ? (
                      <div className="space-y-2">
                        {getParsedCases(formData.hidden_test_cases).map((tc, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3 relative"
                          >
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                                Hidden Input #{idx + 1}
                              </label>
                              <textarea
                                rows={2}
                                value={tc.input}
                                onChange={(e) => editVisualTestCase(false, idx, 'input', e.target.value)}
                                placeholder="edge case / benchmark input"
                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">
                                Expected Output
                              </label>
                              <textarea
                                rows={2}
                                value={tc.expected_output || tc.expected || ''}
                                onChange={(e) => editVisualTestCase(false, idx, 'expected_output', e.target.value)}
                                placeholder="exact expected stdout"
                                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteVisualTestCase(false, idx)}
                              className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--red)] p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={5}
                        value={formData.hidden_test_cases}
                        onChange={(e) => setFormData({ ...formData, hidden_test_cases: e.target.value })}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Viva Voce Pool */}
              {activeEditorTab === 'viva' && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <MessageSquareCheck className="w-4 h-4 text-[var(--accent)]" />
                        Oral Viva Voce Questions Pool ({vivaList.length} Uploaded)
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        When a student finishes the experiment, exactly{' '}
                        <strong>{formData.viva_questions_count || 5} random questions</strong> from this pool will be presented on the faculty incharge screen for oral questioning.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVivaQuestion}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Viva Question
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                    {vivaList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[var(--text-muted)] italic border border-dashed border-[var(--border)] rounded-[var(--radius-md)]">
                        No viva questions in pool yet. Click "+ Add Viva Question" to upload oral questions and answers.
                      </div>
                    ) : (
                      vivaList.map((vq, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                              Viva Question #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteVivaQuestion(idx)}
                              className="text-[var(--text-muted)] hover:text-[var(--red)] p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                              Oral Question Prompt
                            </label>
                            <input
                              type="text"
                              value={vq.question}
                              onChange={(e) => handleEditVivaQuestion(idx, 'question', e.target.value)}
                              placeholder="e.g. What is the time complexity and how can you optimize inner loops?"
                              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                              Model Answer / Key Concepts for Faculty
                            </label>
                            <textarea
                              rows={2}
                              value={vq.answer}
                              onChange={(e) => handleEditVivaQuestion(idx, 'answer', e.target.value)}
                              placeholder="Key points faculty should look for in student's verbal response..."
                              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-accent)]"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
