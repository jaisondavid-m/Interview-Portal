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
  Pencil,
  Eye,
  Sliders,
  Upload,
  Lock,
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';
import LabBulkModal from '../../Components/AdminLabs/LabBulkModal';
import ConfirmModal from '../../Components/ConfirmModal';

export default function AdminLabCourseExperiments() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Core Data
  const [course, setCourse] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Bulk Upload Modal: { isOpen: boolean, mode: 'experiments' | 'variants' }
  const [bulkModal, setBulkModal] = useState({ isOpen: false, mode: 'experiments' });

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'experiment' | 'variant'
    data: null,
    loading: false,
  });

  // View Mode: 'experiments' | 'variants' | 'studio'
  const [currentView, setCurrentView] = useState('experiments');
  const [selectedExp, setSelectedExp] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  // Searches
  const [expSearch, setExpSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');

  // Experiment Modal (Add / Edit Experiment)
  const [expModal, setExpModal] = useState(null); // null | 'create' | 'edit'
  const [editingExp, setEditingExp] = useState(null);
  const emptyExp = {
    experiment_no: 1,
    language: 'python',
    title: '',
    aim: '',
    max_marks: 100,
    is_active: true,
  };
  const [expForm, setExpForm] = useState(emptyExp);
  const [expSubmitting, setExpSubmitting] = useState(false);

  // Active Variant Studio State
  const [activeStudioTab, setActiveStudioTab] = useState('details'); // 'details' | 'algo' | 'solution' | 'testcases' | 'viva'
  const [testingSolution, setTestingSolution] = useState(false);
  const [solutionTestResult, setSolutionTestResult] = useState(null);
  const [sampleMode, setSampleMode] = useState('visual'); // 'visual' | 'json'
  const [hiddenMode, setHiddenMode] = useState('visual'); // 'visual' | 'json'

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
    max_marks: 100,
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
    } catch {
      showToast('Failed to load course experiments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openExperimentVariants = async (exp) => {
    setSelectedExp(exp);
    setCurrentView('variants');
    setVariantsLoading(true);
    try {
      const res = await api.get(`/admin/labs/experiments/${exp.id}/variants`);
      const varList = res?.variants || [];
      if (varList.length > 0) {
        setVariants(varList);
      } else {
        // Fallback default variant based on experiment info
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
          max_marks: exp.max_marks || 100,
        };
        setVariants([defaultVar]);
      }
    } catch {
      showToast('Could not load question variants.', 'error');
    } finally {
      setVariantsLoading(false);
    }
  };

  const openVariantStudio = (variant, index) => {
    setSelectedVariantIndex(index);
    loadVariantIntoForm(variant, selectedExp);
    setSolutionTestResult(null);
    setCurrentView('studio');
    setActiveStudioTab('details');
  };

  const loadVariantIntoForm = (v, parentExp) => {
    let algoText = v.reference_algorithm || '';
    if (algoText && !algoText.startsWith('[') && !algoText.startsWith('{')) {
      const lines = algoText.split('\n').filter((l) => l.trim().length > 0);
      algoText = JSON.stringify(lines, null, 2);
    }

    setFormData({
      id: v.id || 0,
      experiment_id: v.experiment_id || parentExp?.id,
      course_id: v.course_id || Number(courseId),
      question_code: v.question_code || `EX${parentExp?.experiment_no || 1}_VAR_A`,
      title: v.title || parentExp?.title || '',
      aim: v.aim || parentExp?.aim || '',
      reference_algorithm: algoText || emptyVariant.reference_algorithm,
      solution_code: v.solution_code || emptyVariant.solution_code,
      language: v.language || parentExp?.language || 'python',
      sample_test_cases: v.sample_test_cases || emptyVariant.sample_test_cases,
      hidden_test_cases: v.hidden_test_cases || emptyVariant.hidden_test_cases,
      max_marks: v.max_marks || parentExp?.max_marks || 100,
      viva_questions_count: v.viva_questions_count || 5,
      is_active: v.is_active !== false,
      viva_questions: v.viva_questions || emptyVariant.viva_questions,
    });
  };

  // ─── Experiment CRUD Handlers ──────────────────────────────────────────────
  const openCreateExpModal = () => {
    setExpForm({
      ...emptyExp,
      experiment_no: (experiments?.length || 0) + 1,
      is_active: true,
    });
    setEditingExp(null);
    setExpModal('create');
  };

  const openEditExpModal = (exp) => {
    setExpForm({
      experiment_no: exp.experiment_no,
      language: exp.language || 'python',
      title: exp.title,
      aim: exp.aim,
      max_marks: exp.max_marks || 100,
      is_active: exp.is_active !== false,
    });
    setEditingExp(exp);
    setExpModal('edit');
  };

  const handleToggleExperimentActive = async (expId, currentActive, e) => {
    if (e) e.stopPropagation();
    const nextActive = !currentActive;
    // Optimistic UI update
    setExperiments((prev) =>
      prev.map((exp) => (exp.id === expId ? { ...exp, is_active: nextActive } : exp))
    );
    try {
      await api.patch(`/admin/labs/experiments/${expId}/status`, { is_active: nextActive });
      showToast(`Experiment #${expId} ${nextActive ? 'activated' : 'deactivated'} successfully!`, 'success');
    } catch (err) {
      // Revert on error
      setExperiments((prev) =>
        prev.map((exp) => (exp.id === expId ? { ...exp, is_active: currentActive } : exp))
      );
      showToast(err?.response?.data?.error || 'Failed to update experiment status.', 'error');
    }
  };

  const handleSaveExpModal = async (e) => {
    e.preventDefault();
    if (!expForm.title?.trim() || !expForm.aim?.trim()) {
      showToast('Experiment Title and Aim are required.', 'error');
      return;
    }
    try {
      setExpSubmitting(true);
      if (expModal === 'edit' && editingExp?.id) {
        await api.put(`/admin/labs/experiments/${editingExp.id}`, expForm);
        showToast('Experiment updated successfully!', 'success');
      } else {
        await api.post(`/admin/labs/courses/${courseId}/experiments`, expForm);
        showToast('Experiment created successfully!', 'success');
      }
      setExpModal(null);
      setEditingExp(null);
      fetchCourseData();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save experiment.', 'error');
    } finally {
      setExpSubmitting(false);
    }
  };

  const openDeleteExpModal = (exp) => {
    setDeleteModal({
      isOpen: true,
      type: 'experiment',
      data: { expId: exp.id, expNo: exp.experiment_no, title: exp.title },
      loading: false,
    });
  };

  // ─── Variant CRUD Handlers ────────────────────────────────────────────────
  const handleAddNewVariant = () => {
    const nextChar = String.fromCharCode(65 + variants.length); // A, B, C, D...
    const newVar = {
      ...emptyVariant,
      id: 0,
      experiment_id: selectedExp?.id,
      course_id: Number(courseId),
      question_code: `EX${selectedExp?.experiment_no || 1}_VAR_${nextChar}`,
      title: `${selectedExp?.title || 'Experiment'} - Variant ${nextChar}`,
      aim: selectedExp?.aim || '',
      max_marks: selectedExp?.max_marks || 100,
    };
    const updated = [...variants, newVar];
    setVariants(updated);
    openVariantStudio(newVar, updated.length - 1);
  };

  const openDeleteVariantModal = (v, idx) => {
    if (variants.length <= 1) {
      showToast('Each experiment must have at least one question variant.', 'error');
      return;
    }
    setDeleteModal({
      isOpen: true,
      type: 'variant',
      data: { variant: v, index: idx, title: v.title, code: v.question_code },
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.data) return;

    if (deleteModal.type === 'variant') {
      const { variant: v, index: idx } = deleteModal.data;
      if (variants.length <= 1) {
        showToast('Each experiment must have at least one question variant.', 'error');
        setDeleteModal({ isOpen: false, type: null, data: null, loading: false });
        return;
      }
      try {
        setDeleteModal((prev) => ({ ...prev, loading: true }));
        if (v.id > 0) {
          await api.delete(`/admin/labs/experiments/variants/${v.id}`);
        }
        showToast('Question variant removed.', 'success');
        setVariants((prev) => prev.filter((_, i) => i !== idx));
        setDeleteModal({ isOpen: false, type: null, data: null, loading: false });
      } catch {
        showToast('Failed to delete question variant.', 'error');
        setDeleteModal((prev) => ({ ...prev, loading: false }));
      }
    } else if (deleteModal.type === 'experiment') {
      const { expId, expNo } = deleteModal.data;
      try {
        setDeleteModal((prev) => ({ ...prev, loading: true }));
        await api.delete(`/admin/labs/experiments/${expId}`);
        showToast(`Experiment ${expNo} deleted successfully.`, 'success');
        fetchCourseData();
        setDeleteModal({ isOpen: false, type: null, data: null, loading: false });
      } catch {
        showToast('Failed to delete experiment.', 'error');
        setDeleteModal((prev) => ({ ...prev, loading: false }));
      }
    }
  };

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
        experiment_id: selectedExp?.id,
        course_id: Number(courseId),
      };
      const res = await api.post(`/admin/labs/experiments/${selectedExp?.id}/variants`, payload);
      showToast('Question variant & viva pool saved successfully!', 'success');

      // Refresh variants
      const updatedVariantsRes = await api.get(`/admin/labs/experiments/${selectedExp?.id}/variants`);
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
  const handleTestRunSolution = async (dataOverride = null) => {
    const data = dataOverride || formData;
    if (!data.solution_code?.trim()) {
      showToast('Please enter solution code to test.', 'error');
      return;
    }
    try {
      setTestingSolution(true);
      setSolutionTestResult(null);
      const res = await api.post('/admin/labs/solution-test', {
        code: data.solution_code,
        language: data.language || 'c',
        sample_test_cases: data.sample_test_cases,
        hidden_test_cases: data.hidden_test_cases,
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

  // Filtered experiments
  const filteredExperiments = experiments.filter(
    (e) =>
      e.title?.toLowerCase().includes(expSearch.toLowerCase()) ||
      e.aim?.toLowerCase().includes(expSearch.toLowerCase()) ||
      String(e.experiment_no).includes(expSearch)
  );

  // Filtered variants
  const filteredVariants = variants.filter(
    (v) =>
      v.title?.toLowerCase().includes(variantSearch.toLowerCase()) ||
      v.question_code?.toLowerCase().includes(variantSearch.toLowerCase()) ||
      v.aim?.toLowerCase().includes(variantSearch.toLowerCase())
  );

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

      {/* ================================================================ */}
      {/* TOP INTERACTIVE BREADCRUMBS                                      */}
      {/* ================================================================ */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1 flex-wrap">
        <button
          onClick={() => navigate('/admin/labs')}
          className="hover:text-[var(--accent)] transition cursor-pointer"
        >
          Lab Configuration
        </button>
        <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
        <button
          onClick={() => setCurrentView('experiments')}
          className={`hover:text-[var(--accent)] transition cursor-pointer ${
            currentView === 'experiments' ? 'font-bold text-[var(--accent)]' : ''
          }`}
        >
          {course?.course_code || 'LAB'} · {course?.title || 'Experiments'}
        </button>

        {selectedExp && currentView !== 'experiments' && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <button
              onClick={() => setCurrentView('variants')}
              className={`hover:text-[var(--accent)] transition cursor-pointer ${
                currentView === 'variants' ? 'font-bold text-[var(--accent)]' : ''
              }`}
            >
              Exp {selectedExp.experiment_no}: {selectedExp.title}
            </button>
          </>
        )}

        {currentView === 'studio' && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <span className="font-bold text-[var(--accent)]">
              {formData.question_code || 'Variant Studio'}
            </span>
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* VIEW 1: EXPERIMENTS CARDS GRID (LevelListView equivalent)        */}
      {/* ================================================================ */}
      {currentView === 'experiments' && (
        <div className="space-y-6">
          {/* Course Summary Banner */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  {course?.course_code || 'LAB'}
                </span>
                {course?.semester && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                    {course?.semester}
                  </span>
                )}
                {(course?.regulation || course?.academic_year) && (
                  <span className="text-[10px] font-mono text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                    {course?.regulation ? (course.regulation.toLowerCase().includes('regulation') ? course.regulation : `Regulation ${course.regulation.replace(/^r/i, '')}`) : 'Regulation 2022'}
                  </span>
                )}
              </div>
              <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)]">
                {course?.title || 'Laboratory Course Workspace'}
              </h1>
              <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)]">
                {course?.department || 'Curriculum experiments and multi-question variant assessments.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-6 shrink-0 flex-wrap">
              <div className="text-center pr-2">
                <p className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
                  {experiments?.length || 0}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Experiments</p>
              </div>

              <button
                onClick={() => navigate(`/admin/labs/courses/${courseId}/pdf-designer`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-xs)]"
              >
                <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                PDF Designer
              </button>

              <button
                onClick={() => setBulkModal({ isOpen: true, mode: 'experiments' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-xs)]"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                Bulk Upload
              </button>

              <button
                onClick={openCreateExpModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
              >
                <Plus className="w-4 h-4" />
                Add Experiment
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="panel-card p-4">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={expSearch}
                onChange={(e) => setExpSearch(e.target.value)}
                placeholder="Search experiments by title, aim, or number..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {expSearch && (
                <button
                  type="button"
                  onClick={() => setExpSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Experiments Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm">Loading course experiments...</span>
            </div>
          ) : filteredExperiments.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <FlaskConical className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {expSearch ? 'No experiments matching your search.' : 'No experiments created yet.'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                {expSearch
                  ? 'Try modifying your search criteria.'
                  : 'Add practical experiments to this course with test cases and viva voce questions.'}
              </p>
              {!expSearch && (
                <button
                  onClick={openCreateExpModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add First Experiment
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredExperiments.map((exp) => {
                const isActive = exp.is_active !== false;
                return (
                  <div
                    key={exp.id}
                    className={`data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer transition-all ${
                      !isActive ? 'border-dashed border-[var(--border)] opacity-85 hover:opacity-100 bg-[var(--bg-card)]/60' : ''
                    }`}
                    onClick={() => openExperimentVariants(exp)}
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Exp Badge + Status Toggle + Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[12px] px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            Exp {exp.experiment_no}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] uppercase">
                            {exp.language || 'python'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Active / Inactive Toggle Switch Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleExperimentActive(exp.id, isActive, e)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                            title={isActive ? 'Click to deactivate experiment' : 'Click to activate experiment'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
                              }`}
                            />
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditExpModal(exp);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                            title="Edit Experiment"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteExpModal(exp);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] rounded hover:bg-[var(--red-bg)] transition cursor-pointer"
                            title="Delete Experiment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Aim */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {exp.title}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {exp.aim || 'No problem statement configured for this experiment.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-primary)] font-semibold">
                          {exp.max_marks || 100} Marks
                        </span>
                      </div>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Question Variants &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 2: QUESTION VARIANTS CARDS (QuestionListView equivalent)    */}
      {/* ================================================================ */}
      {currentView === 'variants' && selectedExp && (
        <div className="space-y-6">
          {/* Experiment Summary Banner */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  Experiment {selectedExp.experiment_no}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] uppercase">
                  {selectedExp.language || 'python'}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                  {selectedExp.max_marks || 100} Max Marks
                </span>
              </div>
              <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)]">
                {selectedExp.title}
              </h1>
              <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] line-clamp-2">
                {selectedExp.aim || 'Configure randomized question variants, algorithms, reference solutions, and viva questions.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-6 shrink-0 flex-wrap">
              <div className="text-center pr-2">
                <p className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
                  {variants?.length || 0}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Variants</p>
              </div>

              <button
                onClick={() => setCurrentView('experiments')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All Experiments
              </button>

              <button
                onClick={() => setBulkModal({ isOpen: true, mode: 'variants' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-xs)]"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                Bulk Upload
              </button>

              <button
                onClick={handleAddNewVariant}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
              >
                <Plus className="w-4 h-4" />
                Add Question Variant
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="panel-card p-4">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                placeholder="Search question variants by code, title, or aim..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {variantSearch && (
                <button
                  type="button"
                  onClick={() => setVariantSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Variants Grid */}
          {variantsLoading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm">Loading question variants...</span>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                No question variants found.
              </p>
              <button
                onClick={handleAddNewVariant}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] mt-2"
              >
                <Plus className="w-4 h-4" />
                Create First Variant
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVariants.map((v, idx) => {
                const sampleCount = getParsedCases(v.sample_test_cases).length;
                const hiddenCount = getParsedCases(v.hidden_test_cases).length;
                const vivaCount = v.viva_questions?.length || 0;

                return (
                  <div
                    key={v.id || idx}
                    className="data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer transition-all"
                    onClick={() => openVariantStudio(v, idx)}
                  >
                    <div className="space-y-3.5">
                      {/* Header row: Variant Code Badge & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[12px] px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            {v.question_code || `Variant ${idx + 1}`}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                            {v.language || 'python'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openVariantStudio(v, idx);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                            title="Edit in Studio"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteVariantModal(v, idx);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] rounded hover:bg-[var(--red-bg)] transition cursor-pointer"
                            title="Delete Variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Aim */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {v.title || `Variant ${String.fromCharCode(65 + idx)}`}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {v.aim || 'No specific objective provided.'}
                        </p>
                      </div>

                      {/* Feature Badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-1">
                          <Code2 className="w-3 h-3 text-[var(--accent)]" />
                          {sampleCount + hiddenCount} Test Cases
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-1">
                          <MessageSquareCheck className="w-3 h-3 text-indigo-500" />
                          {vivaCount} Viva Qns
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <span className="text-[var(--text-secondary)] font-semibold">
                        {v.max_marks || 100} Marks
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 3: QUESTION VARIANT STUDIO & EDITOR (Full Page Cockpit)     */}
      {/* ================================================================ */}
      {currentView === 'studio' && (
        <div className="space-y-6">
          {/* Studio Action Bar */}
          <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-[12px] px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  {formData.question_code || 'VARIANT'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Exp {selectedExp?.experiment_no}: {selectedExp?.title}
                </span>
              </div>
              <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)]">
                {formData.title || 'Question Variant Studio'}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentView('variants')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-all shadow-[var(--shadow-xs)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Variants
              </button>

              <button
                type="button"
                onClick={handleSaveVariant}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Variant
              </button>
            </div>
          </div>

          {/* Studio Tabs Navigation */}
          <div className="border-b border-[var(--border)] flex items-center gap-1 overflow-x-auto pb-px">
            {[
              { key: 'details', label: '1. Problem Statement & Aim', icon: FileText },
              { key: 'algo', label: `2. Algorithm Steps (${algoSteps.length})`, icon: ListPlus },
              { key: 'solution', label: '3. Reference Solution Code', icon: Code2 },
              { key: 'testcases', label: `4. Test Cases (${parsedSampleCount + parsedHiddenCount})`, icon: Terminal },
              { key: 'viva', label: `5. Oral Viva Bank (${vivaList.length})`, icon: MessageSquareCheck },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveStudioTab(key);
                  if (key === 'solution' && formData.solution_code?.trim()) {
                    handleTestRunSolution();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-[13px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeStudioTab === key
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]/30'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* TAB 1: Problem Statement & Aim */}
          {activeStudioTab === 'details' && (
            <div className="panel-card p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)]">
                    Variant Code Identifier <span className="text-[var(--red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.question_code}
                    onChange={(e) => setFormData((p) => ({ ...p, question_code: e.target.value }))}
                    placeholder="e.g. EX1_VAR_A"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)]">Language Engine</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData((p) => ({ ...p, language: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--border-accent)]"
                  >
                    <option value="python">Python 3 (GCC / PyPy)</option>
                    <option value="c">C (GCC 11)</option>
                    <option value="cpp">C++ (G++ 17)</option>
                    <option value="java">Java 17 (OpenJDK)</option>
                    <option value="sql">SQL (PostgreSQL / SQLite)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)]">Max Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.max_marks}
                    onChange={(e) => setFormData((p) => ({ ...p, max_marks: parseInt(e.target.value) || 100 }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[var(--text-secondary)]">
                  Question Title <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Online Shopping Cart & Dynamic Bill Generator"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--border-accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)]">
                    Aim & Problem Statement <span className="text-[var(--red)]">*</span>
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">Printed in student semester PDF record</span>
                </div>
                <textarea
                  value={formData.aim}
                  onChange={(e) => setFormData((p) => ({ ...p, aim: e.target.value }))}
                  rows={4}
                  placeholder="Detailed problem statement and objectives..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-accent)] resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Algorithm Steps Builder */}
          {activeStudioTab === 'algo' && (
            <div className="panel-card p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ListPlus className="w-4 h-4 text-[var(--accent)]" />
                    Reference Algorithm Steps
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Define the canonical reference steps. Faculty will compare student written algorithm with these steps during evaluation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAlgoStep}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              <div className="space-y-3">
                {algoSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] group focus-within:border-[var(--border-accent)] transition-all"
                  >
                    <span className="w-7 h-7 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleEditAlgoStep(idx, e.target.value)}
                      className="flex-1 bg-transparent text-xs text-[var(--text-primary)] focus:outline-none font-medium"
                      placeholder={`Step ${idx + 1} operation...`}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteAlgoStep(idx)}
                      className="text-[var(--text-muted)] hover:text-[var(--red)] p-1 rounded cursor-pointer transition-colors"
                      title="Delete step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Reference Solution Code & Runner */}
          {activeStudioTab === 'solution' && (
            <div className="panel-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[var(--accent)]" />
                    Faculty Reference Solution Code
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Write and test the standard solution against sample and hidden test cases.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestRunSolution}
                  disabled={testingSolution}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {testingSolution ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  Run Test Suite Against Solution
                </button>
              </div>

              <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden h-[340px]">
                <CodeEditor
                  code={formData.solution_code || ''}
                  value={formData.solution_code || ''}
                  onChange={(val) => setFormData((p) => ({ ...p, solution_code: val }))}
                  language={formData.language || 'c'}
                  onLanguageChange={(lang) => setFormData((p) => ({ ...p, language: lang }))}
                  height="340px"
                />
              </div>

              {/* Test Suite Verification Results & Test Cases */}
              <div className="space-y-4 pt-2">
                {testingSolution ? (
                  <div className="p-8 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] flex flex-col items-center justify-center gap-3 text-center animate-in fade-in">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        Executing reference solution against sandbox test cases...
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Evaluating sample and hidden test cases with standard I/O streams
                      </p>
                    </div>
                  </div>
                ) : solutionTestResult ? (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Overview Banner */}
                    <div
                      className={`p-4 rounded-[var(--radius-md)] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        solutionTestResult.pass_count === solutionTestResult.total_test_cases
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {solutionTestResult.pass_count === solutionTestResult.total_test_cases ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)]">
                            {solutionTestResult.pass_count === solutionTestResult.total_test_cases
                              ? 'All Test Cases Verified & Passed!'
                              : `Test Verification Issues (${solutionTestResult.total_test_cases - solutionTestResult.pass_count} Failed)`}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            {solutionTestResult.pass_count} of {solutionTestResult.total_test_cases} test cases passed (
                            {solutionTestResult.results?.filter((r) => !r.is_hidden && r.passed).length || 0}/
                            {solutionTestResult.results?.filter((r) => !r.is_hidden).length || 0} Sample,{' '}
                            {solutionTestResult.results?.filter((r) => r.is_hidden && r.passed).length || 0}/
                            {solutionTestResult.results?.filter((r) => r.is_hidden).length || 0} Hidden)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`font-mono text-xs font-bold px-3 py-1 rounded-full border ${
                            solutionTestResult.pass_count === solutionTestResult.total_test_cases
                              ? 'bg-emerald-500 text-white border-emerald-400'
                              : 'bg-rose-500 text-white border-rose-400'
                          }`}
                        >
                          {solutionTestResult.pass_count} / {solutionTestResult.total_test_cases} Passed
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTestRunSolution()}
                          className="px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-hover)] text-[var(--text-primary)] cursor-pointer transition flex items-center gap-1.5"
                        >
                          <Play className="w-3 h-3 fill-current text-[var(--accent)]" />
                          Re-run
                        </button>
                      </div>
                    </div>

                    {/* Individual Test Cases List */}
                    <div className="space-y-3">
                      <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Test Cases Breakdown ({solutionTestResult.results?.length || 0})
                      </h4>

                      <div className="grid grid-cols-1 gap-3">
                        {(solutionTestResult.results || []).map((r, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-[var(--radius-md)] border transition-all ${
                              r.passed
                                ? 'bg-[var(--bg-raised)]/60 border-emerald-500/30'
                                : 'bg-rose-500/5 border-rose-500/30'
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded font-mono border ${
                                    r.is_hidden
                                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                  }`}
                                >
                                  {r.is_hidden ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  {r.is_hidden ? `Hidden Case #${r.index || idx + 1}` : `Sample Case #${r.index || idx + 1}`}
                                </span>
                                <span className="text-[12px] font-bold text-[var(--text-primary)]">
                                  {r.name || `Case ${idx + 1}`}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {r.execution_ms !== undefined && (
                                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                    {r.execution_ms} ms
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                                    r.passed
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  }`}
                                >
                                  {r.passed ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                  {r.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                            </div>

                            {/* 3-Column Input / Expected / Actual breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                              {/* Input */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                  Input (stdin)
                                </span>
                                <pre className="mt-1 p-2.5 rounded bg-black/70 border border-white/5 font-mono text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-32">
                                  {r.input?.trim() ? r.input : <span className="text-gray-500 italic">No input</span>}
                                </pre>
                              </div>

                              {/* Expected Output */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                  Expected Output
                                </span>
                                <pre className="mt-1 p-2.5 rounded bg-black/70 border border-white/5 font-mono text-[11px] text-gray-200 overflow-x-auto whitespace-pre-wrap max-h-32">
                                  {r.expected?.trim() ? r.expected : <span className="text-gray-500 italic">Empty output</span>}
                                </pre>
                              </div>

                              {/* Actual Output */}
                              <div>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                  Actual Output
                                </span>
                                <pre
                                  className={`mt-1 p-2.5 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-32 border ${
                                    r.passed
                                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                                      : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                                  }`}
                                >
                                  {r.actual?.trim() ? r.actual : <span className="text-gray-500 italic">No output</span>}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Configured Test Cases (Pre-Execution View) */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Configured Test Cases ({parsedSampleCount + parsedHiddenCount})
                      </h4>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {parsedSampleCount} Sample, {parsedHiddenCount} Hidden
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Sample cases */}
                      {getParsedCases(formData.sample_test_cases).map((tc, idx) => (
                        <div
                          key={`sample-${idx}`}
                          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/60 border border-[var(--border)] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              <Eye className="w-3 h-3" />
                              Sample Case #{idx + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] font-bold">Input:</span>
                              <pre className="mt-0.5 p-2 rounded bg-black/60 font-mono text-[10px] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-20">
                                {tc.input || <span className="text-gray-500 italic">None</span>}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] font-bold">Expected Output:</span>
                              <pre className="mt-0.5 p-2 rounded bg-black/60 font-mono text-[10px] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-20">
                                {tc.expected_output || tc.expected || <span className="text-gray-500 italic">None</span>}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Hidden cases */}
                      {getParsedCases(formData.hidden_test_cases).map((tc, idx) => (
                        <div
                          key={`hidden-${idx}`}
                          className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/60 border border-[var(--border)] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              <Lock className="w-3 h-3" />
                              Hidden Case #{idx + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] font-bold">Input:</span>
                              <pre className="mt-0.5 p-2 rounded bg-black/60 font-mono text-[10px] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-20">
                                {tc.input || <span className="text-gray-500 italic">None</span>}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[10px] text-[var(--text-muted)] font-bold">Expected Output:</span>
                              <pre className="mt-0.5 p-2 rounded bg-black/60 font-mono text-[10px] text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-20">
                                {tc.expected_output || tc.expected || <span className="text-gray-500 italic">None</span>}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Test Cases Manager */}
          {activeStudioTab === 'testcases' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sample Test Cases */}
              <div className="panel-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[var(--accent)]" />
                      Sample Test Cases (Visible to Student)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSampleMode(sampleMode === 'visual' ? 'json' : 'visual')}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {sampleMode === 'visual' ? 'Raw JSON' : 'Visual Table'}
                    </button>
                    {sampleMode === 'visual' && (
                      <button
                        type="button"
                        onClick={() => addVisualTestCase(true)}
                        className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-[11px] font-bold cursor-pointer hover:opacity-90"
                      >
                        + Add Case
                      </button>
                    )}
                  </div>
                </div>

                {sampleMode === 'visual' ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {getParsedCases(formData.sample_test_cases).map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                          <span>Sample #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => deleteVisualTestCase(true, idx)}
                            className="text-[var(--red)] hover:opacity-80 cursor-pointer p-1 rounded hover:bg-[var(--bg-card)] transition-colors"
                            title="Delete Case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Standard Input (stdin)
                          </label>
                          <textarea
                            rows={2}
                            value={tc.input || ''}
                            onChange={(e) => editVisualTestCase(true, idx, 'input', e.target.value)}
                            placeholder="Standard Input (stdin) - press Enter for newline..."
                            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] resize-y focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Expected Output (stdout)
                          </label>
                          <textarea
                            rows={3}
                            value={tc.expected_output || ''}
                            onChange={(e) => editVisualTestCase(true, idx, 'expected_output', e.target.value)}
                            placeholder="Expected Output (stdout) - supports multiline text and tables..."
                            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] resize-y focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] whitespace-pre"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={formData.sample_test_cases}
                    onChange={(e) => setFormData((p) => ({ ...p, sample_test_cases: e.target.value }))}
                    rows={10}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-3 font-mono text-xs text-[var(--text-primary)] resize-none"
                  />
                )}
              </div>

              {/* Hidden Test Cases */}
              <div className="panel-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-rose-500" />
                      Hidden Test Cases (Secret for Evaluation)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHiddenMode(hiddenMode === 'visual' ? 'json' : 'visual')}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {hiddenMode === 'visual' ? 'Raw JSON' : 'Visual Table'}
                    </button>
                    {hiddenMode === 'visual' && (
                      <button
                        type="button"
                        onClick={() => addVisualTestCase(false)}
                        className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-[11px] font-bold cursor-pointer hover:opacity-90"
                      >
                        + Add Case
                      </button>
                    )}
                  </div>
                </div>

                {hiddenMode === 'visual' ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {getParsedCases(formData.hidden_test_cases).map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                          <span>Hidden #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => deleteVisualTestCase(false, idx)}
                            className="text-[var(--red)] hover:opacity-80 cursor-pointer p-1 rounded hover:bg-[var(--bg-card)] transition-colors"
                            title="Delete Case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Standard Input (stdin)
                          </label>
                          <textarea
                            rows={2}
                            value={tc.input || ''}
                            onChange={(e) => editVisualTestCase(false, idx, 'input', e.target.value)}
                            placeholder="Standard Input (stdin) - press Enter for newline..."
                            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] resize-y focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Expected Output (stdout)
                          </label>
                          <textarea
                            rows={3}
                            value={tc.expected_output || ''}
                            onChange={(e) => editVisualTestCase(false, idx, 'expected_output', e.target.value)}
                            placeholder="Expected Output (stdout) - supports multiline text and tables..."
                            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] resize-y focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] whitespace-pre"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={formData.hidden_test_cases}
                    onChange={(e) => setFormData((p) => ({ ...p, hidden_test_cases: e.target.value }))}
                    rows={10}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-3 font-mono text-xs text-[var(--text-primary)] resize-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Oral Viva Voce Question Bank */}
          {activeStudioTab === 'viva' && (
            <div className="panel-card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <MessageSquareCheck className="w-4 h-4 text-[var(--accent)]" />
                    Oral Viva Voce Question Bank ({vivaList.length})
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Upload viva questions and model answers. When a student submits an experiment, the system randomly selects a subset for faculty oral questioning.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    <span>Ask Count:</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.viva_questions_count || 5}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          viva_questions_count: parseInt(e.target.value) || 5,
                        }))
                      }
                      className="w-14 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-center font-mono font-bold text-[var(--text-primary)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVivaQuestion}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Viva Question
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {vivaList.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] space-y-2.5 transition-all focus-within:border-[var(--border-accent)]"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--accent)]">
                      <span>Oral Viva Question #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVivaQuestion(idx)}
                        className="text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={v.question || ''}
                      onChange={(e) => handleEditVivaQuestion(idx, 'question', e.target.value)}
                      placeholder="e.g. What is the difference between an algorithm and a program?"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                    />

                    <textarea
                      value={v.answer || ''}
                      onChange={(e) => handleEditVivaQuestion(idx, 'answer', e.target.value)}
                      rows={2}
                      placeholder="Model answer for faculty reference..."
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Create / Edit Experiment                                  */}
      {/* ================================================================ */}
      {expModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[var(--accent)]" />
                {expModal === 'edit' ? `Edit Experiment #${editingExp?.experiment_no}` : 'Add New Experiment'}
              </h3>
              <button
                onClick={() => setExpModal(null)}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpModal} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                    Experiment Number <span className="text-[var(--red)]">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={expForm.experiment_no}
                    onChange={(e) =>
                      setExpForm((p) => ({ ...p, experiment_no: parseInt(e.target.value) || 1 }))
                    }
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                    Language Engine
                  </label>
                  <select
                    value={expForm.language}
                    onChange={(e) => setExpForm((p) => ({ ...p, language: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--border-accent)]"
                  >
                    <option value="python">Python 3</option>
                    <option value="c">C (GCC)</option>
                    <option value="cpp">C++ (G++)</option>
                    <option value="java">Java 17</option>
                    <option value="sql">SQL Sandbox</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Experiment Title <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  type="text"
                  value={expForm.title}
                  onChange={(e) => setExpForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Online Shopping Cart & Bill Generator"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--border-accent)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Aim of Experiment <span className="text-[var(--red)]">*</span>
                </label>
                <textarea
                  value={expForm.aim}
                  onChange={(e) => setExpForm((p) => ({ ...p, aim: e.target.value }))}
                  rows={3}
                  placeholder="Aim and problem statement..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-accent)] resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                  Max Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={expForm.max_marks}
                  onChange={(e) =>
                    setExpForm((p) => ({ ...p, max_marks: parseInt(e.target.value) || 100 }))
                  }
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                />
              </div>

              {/* Active / Inactive Status Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                <div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    Experiment Status
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        expForm.is_active !== false
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {expForm.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {expForm.is_active !== false
                      ? 'Experiment is accessible to students and faculty.'
                      : 'Deactivated: Skipped in student prerequisite chains & hidden from execution.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpForm((p) => ({ ...p, is_active: p.is_active === false }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                    expForm.is_active !== false ? 'bg-[var(--accent)]' : 'bg-[var(--bg-input)] border border-[var(--border)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      expForm.is_active !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={expSubmitting}
                  className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {expSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {expModal === 'edit' ? 'Update Experiment' : 'Create Experiment'}
                </button>
                <button
                  type="button"
                  onClick={() => setExpModal(null)}
                  className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal (Experiments & Question Variants) */}
      {bulkModal.isOpen && (
        <LabBulkModal
          isOpen={bulkModal.isOpen}
          onClose={() => setBulkModal({ isOpen: false, mode: 'experiments' })}
          mode={bulkModal.mode}
          targetId={bulkModal.mode === 'experiments' ? courseId : selectedExp?.id}
          targetMetadata={{
            courseCode: course?.course_code,
            expNo: selectedExp?.experiment_no,
            title: selectedExp?.title,
          }}
          onSuccess={(res) => {
            if (bulkModal.mode === 'experiments') {
              fetchCourseData();
              showToast(res?.message || 'Experiments imported successfully!');
            } else {
              if (selectedExp) openExperimentVariants(selectedExp);
              showToast(res?.message || 'Question variants imported successfully!');
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.type === 'variant' ? 'Delete Question Variant' : 'Delete Experiment'}
        message={
          deleteModal.type === 'variant'
            ? `Are you sure you want to delete question variant "${deleteModal.data?.code || deleteModal.data?.title || 'Variant'}"? This action cannot be undone.`
            : `Are you sure you want to delete Experiment ${deleteModal.data?.expNo || ''} ("${deleteModal.data?.title || ''}")? This will permanently remove all associated question variants and submissions.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isDanger={true}
        loading={deleteModal.loading}
      />
    </div>
  );
}
