import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  Pencil,
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

  // Selected experiment for editing (or null for creating new)
  const [selectedExpId, setSelectedExpId] = useState(null); // ID or 'NEW'
  const [activeEditorTab, setActiveEditorTab] = useState('details'); // 'details' | 'starter' | 'testcases'

  const emptyExp = {
    experiment_no: 1,
    title: '',
    aim: '',
    procedure: '',
    language: 'python',
    starter_code: '# Write your code below\n\n',
    sample_test_cases: '[\n  {\n    "input": "",\n    "expected_output": ""\n  }\n]',
    hidden_test_cases: '[\n  {\n    "input": "",\n    "expected_output": ""\n  }\n]',
    max_marks: 10,
  };

  const [formData, setFormData] = useState(emptyExp);

  // Test case builder modes (visual vs raw JSON)
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

      if (list.length > 0 && selectedExpId === null) {
        selectExperiment(list[0]);
      } else if (list.length === 0) {
        startNewExperiment(1);
      }
    } catch (err) {
      showToast('Failed to load course experiments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectExperiment = (exp) => {
    setSelectedExpId(exp.id);
    setFormData({
      experiment_no: exp.experiment_no || 1,
      title: exp.title || '',
      aim: exp.aim || '',
      procedure: exp.procedure || '',
      language: exp.language || 'python',
      starter_code: exp.starter_code || '# Write your code below\n\n',
      sample_test_cases: exp.sample_test_cases || '[]',
      hidden_test_cases: exp.hidden_test_cases || '[]',
      max_marks: exp.max_marks || 10,
    });
  };

  const startNewExperiment = (defaultNo) => {
    const nextNo =
      defaultNo ||
      (experiments.length > 0
        ? Math.max(...experiments.map((e) => e.experiment_no)) + 1
        : 1);
    setSelectedExpId('NEW');
    setFormData({
      ...emptyExp,
      experiment_no: nextNo,
    });
    setActiveEditorTab('details');
  };

  // ── Helper functions for visual test case builder ───────────────────────────
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

  // ── Save / Delete Handlers ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title?.trim() || !formData.aim?.trim()) {
      showToast('Experiment title and aim are required.', 'error');
      return;
    }

    // Validate JSON
    try {
      JSON.parse(formData.sample_test_cases || '[]');
    } catch {
      showToast('Sample Test Cases has invalid JSON format.', 'error');
      setActiveEditorTab('testcases');
      return;
    }
    try {
      JSON.parse(formData.hidden_test_cases || '[]');
    } catch {
      showToast('Hidden Test Cases has invalid JSON format.', 'error');
      setActiveEditorTab('testcases');
      return;
    }

    try {
      setSaving(true);
      if (selectedExpId === 'NEW') {
        const res = await api.post(`/admin/labs/courses/${courseId}/experiments`, formData);
        showToast('Experiment created successfully!', 'success');
        await fetchCourseData();
        if (res?.experiment?.id) {
          setSelectedExpId(res.experiment.id);
        }
      } else {
        await api.put(`/admin/labs/experiments/${selectedExpId}`, formData);
        showToast('Experiment updated successfully!', 'success');
        await fetchCourseData();
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save experiment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expId, expNo) => {
    if (!window.confirm(`Delete Experiment ${expNo}? This will remove all associated submissions.`)) return;
    try {
      await api.delete(`/admin/labs/experiments/${expId}`);
      showToast(`Experiment ${expNo} deleted.`, 'success');
      const updatedList = experiments.filter((e) => e.id !== expId);
      setExperiments(updatedList);
      if (selectedExpId === expId) {
        if (updatedList.length > 0) {
          selectExperiment(updatedList[0]);
        } else {
          startNewExperiment(1);
        }
      }
    } catch {
      showToast('Failed to delete experiment.', 'error');
    }
  };

  const filteredExperiments = experiments.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.aim?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.experiment_no).includes(search)
  );

  const parsedSampleCount = getParsedCases(formData.sample_test_cases).length;
  const parsedHiddenCount = getParsedCases(formData.hidden_test_cases).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
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

      {/* Top Header & Breadcrumbs */}
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
              {course?.title || 'Lab Course Experiments'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[var(--text-muted)] font-mono hidden md:inline">
            {experiments.length} Experiment{experiments.length !== 1 ? 's' : ''} Configured
          </span>
          <button
            onClick={() => startNewExperiment()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <Plus className="w-4 h-4" />
            Add New Experiment
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-[var(--text-muted)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading course workspace...</span>
        </div>
      ) : (
        /* Master-Detail Full View Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT SIDEBAR: Experiments List (lg:col-span-4)                 */}
          {/* ============================================================== */}
          <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                Course Curriculum
              </h2>
              <button
                onClick={() => startNewExperiment()}
                className="text-[11px] text-[var(--accent)] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New
              </button>
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
                  No experiments match your search.
                </div>
              ) : (
                filteredExperiments.map((exp) => {
                  const isSelected = selectedExpId === exp.id;
                  let sampleCount = 0;
                  let hiddenCount = 0;
                  try {
                    sampleCount = JSON.parse(exp.sample_test_cases || '[]').length;
                  } catch {}
                  try {
                    hiddenCount = JSON.parse(exp.hidden_test_cases || '[]').length;
                  } catch {}

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
                                : 'bg-[var(--bg-card)] text-[var(--accent)] border-[var(--border)]'
                            }`}
                          >
                            Ex {exp.experiment_no}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]">
                            {exp.language || 'python'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(exp.id, exp.experiment_no);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--red-bg)] text-[var(--text-muted)] hover:text-[var(--red)] transition-all cursor-pointer"
                          title="Delete experiment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[13px] font-bold text-[var(--text-primary)] mt-2 line-clamp-1">
                        {exp.title}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-relaxed">
                        {exp.aim}
                      </div>

                      <div className="flex items-center gap-3 pt-2 mt-2 border-t border-[var(--border)]/60 text-[10px] font-mono text-[var(--text-muted)]">
                        <span className="text-emerald-600 font-semibold">{sampleCount} Sample Cases</span>
                        <span>·</span>
                        <span className="text-indigo-600 font-semibold">{hiddenCount} Hidden Cases</span>
                        <span className="ml-auto font-bold text-[var(--text-primary)]">
                          {exp.max_marks || 10} M
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT MAIN EDITOR (lg:col-span-8)                             */}
          {/* ============================================================== */}
          <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-6 shadow-[var(--shadow-sm)]">
            {/* Editor Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                    {selectedExpId === 'NEW'
                      ? 'NEW EXPERIMENT'
                      : `EXPERIMENT ${formData.experiment_no}`}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {selectedExpId === 'NEW' ? 'Creating Experiment Draft' : 'Active Editor'}
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mt-1">
                  {formData.title || 'Untitled Experiment'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {selectedExpId === 'NEW' ? 'Create Experiment' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Navigation Tabs for Editor */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
              {[
                { key: 'details', label: '1. Problem & Aim', icon: BookOpen },
                { key: 'starter', label: '2. Starter Code Template', icon: Code2 },
                {
                  key: 'testcases',
                  label: `3. Test Cases (${parsedSampleCount} Sample / ${parsedHiddenCount} Hidden)`,
                  icon: ShieldCheck,
                },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveEditorTab(key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeEditorTab === key
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* TAB 1: PROBLEM DETAILS */}
            {activeEditorTab === 'details' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Experiment Number <span className="text-[var(--red)]">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.experiment_no}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, experiment_no: parseInt(e.target.value) || 1 }))
                      }
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Language Engine
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData((p) => ({ ...p, language: e.target.value }))}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] cursor-pointer"
                    >
                      <option value="python">Python 3 (GCC / PyPy)</option>
                      <option value="javascript">JavaScript (Node.js)</option>
                      <option value="c">C (GCC)</option>
                      <option value="cpp">C++ (g++ 17)</option>
                      <option value="java">Java (OpenJDK 17)</option>
                      <option value="go">Go (Golang)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Max Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.max_marks}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, max_marks: parseInt(e.target.value) || 10 }))
                      }
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                    Experiment Title <span className="text-[var(--red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Security Controls, Cryptographic Hashing & SHA-256 Signature Verification"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] font-semibold placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                    <span>Aim of Experiment <span className="text-[var(--red)]">*</span></span>
                    <span className="text-[11px] font-normal text-[var(--text-muted)]">
                      Official objective printed on student PDF record
                    </span>
                  </label>
                  <textarea
                    value={formData.aim}
                    onChange={(e) => setFormData((p) => ({ ...p, aim: e.target.value }))}
                    placeholder="To design and implement a secure hashing verification program using standard algorithmic libraries..."
                    rows={3}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] resize-y leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                    <span>Step-by-Step Algorithm (Procedure)</span>
                    <span className="text-[11px] font-normal text-[var(--text-muted)]">
                      Displayed on the left pane of the student workspace
                    </span>
                  </label>
                  <textarea
                    value={formData.procedure}
                    onChange={(e) => setFormData((p) => ({ ...p, procedure: e.target.value }))}
                    placeholder={'1. Initialize the system input reader\n2. Compute hash digest\n3. Print formatted output to stdout'}
                    rows={6}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] resize-y leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: STARTER CODE */}
            {activeEditorTab === 'starter' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[13px] font-bold text-[var(--text-primary)]">
                      Initial Boilerplate Starter Code
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      This template is pre-loaded into the student code editor when they open the experiment workspace.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)] uppercase font-bold">
                    {formData.language}
                  </span>
                </div>

                <div className="h-96 rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)]">
                  <CodeEditor
                    code={formData.starter_code}
                    onChange={(val) => setFormData((p) => ({ ...p, starter_code: val }))}
                    language={formData.language}
                    onLanguageChange={(lang) => setFormData((p) => ({ ...p, language: lang }))}
                    isEditable={true}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: TEST CASES BUILDER */}
            {activeEditorTab === 'testcases' && (
              <div className="space-y-6">
                {/* 1. SAMPLE TEST CASES */}
                <div className="bg-[var(--bg-raised)]/50 border border-[var(--border)] rounded-[var(--radius-md)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 text-emerald-600" />
                        Sample Test Cases ({parsedSampleCount})
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Visible to students and evaluated immediately when they click <strong>Run Code</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-0.5 rounded-[var(--radius-sm)] flex text-[10px] font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => setSampleMode('visual')}
                          className={`px-2 py-1 rounded cursor-pointer ${
                            sampleMode === 'visual'
                              ? 'bg-[var(--accent)] text-white'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          Visual Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setSampleMode('json')}
                          className={`px-2 py-1 rounded cursor-pointer ${
                            sampleMode === 'json'
                              ? 'bg-[var(--accent)] text-white'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          Raw JSON
                        </button>
                      </div>

                      {sampleMode === 'visual' && (
                        <button
                          type="button"
                          onClick={() => addVisualTestCase(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Case
                        </button>
                      )}
                    </div>
                  </div>

                  {sampleMode === 'visual' ? (
                    <div className="space-y-2 pt-1">
                      {getParsedCases(formData.sample_test_cases).length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--text-muted)] italic bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)]">
                          No sample test cases added yet. Click "Add Case" to add one.
                        </div>
                      ) : (
                        getParsedCases(formData.sample_test_cases).map((tc, idx) => (
                          <div
                            key={idx}
                            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                              <span className="font-bold text-[var(--accent)]">Sample Case #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => deleteVisualTestCase(true, idx)}
                                className="text-[var(--red)] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-[var(--text-muted)] block mb-1">
                                  Standard Input (stdin)
                                </span>
                                <textarea
                                  value={tc.input || ''}
                                  onChange={(e) =>
                                    editVisualTestCase(true, idx, 'input', e.target.value)
                                  }
                                  placeholder="e.g. 5 10"
                                  rows={2}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--text-muted)] block mb-1">
                                  Expected Output (stdout)
                                </span>
                                <textarea
                                  value={tc.expected_output || tc.expected || ''}
                                  onChange={(e) =>
                                    editVisualTestCase(true, idx, 'expected_output', e.target.value)
                                  }
                                  placeholder="e.g. 15"
                                  rows={2}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] font-bold text-[var(--green)]"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={formData.sample_test_cases}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, sample_test_cases: e.target.value }))
                      }
                      rows={5}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] leading-relaxed"
                    />
                  )}
                </div>

                {/* 2. HIDDEN TEST CASES */}
                <div className="bg-[var(--bg-raised)]/50 border border-[var(--border)] rounded-[var(--radius-md)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Hidden Grading Test Cases ({parsedHiddenCount})
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Hidden from student views and evaluated during <strong>Submit Solution</strong> to calculate final marks.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-0.5 rounded-[var(--radius-sm)] flex text-[10px] font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => setHiddenMode('visual')}
                          className={`px-2 py-1 rounded cursor-pointer ${
                            hiddenMode === 'visual'
                              ? 'bg-[var(--accent)] text-white'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          Visual Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setHiddenMode('json')}
                          className={`px-2 py-1 rounded cursor-pointer ${
                            hiddenMode === 'json'
                              ? 'bg-[var(--accent)] text-white'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          Raw JSON
                        </button>
                      </div>

                      {hiddenMode === 'visual' && (
                        <button
                          type="button"
                          onClick={() => addVisualTestCase(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Hidden Case
                        </button>
                      )}
                    </div>
                  </div>

                  {hiddenMode === 'visual' ? (
                    <div className="space-y-2 pt-1">
                      {getParsedCases(formData.hidden_test_cases).length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--text-muted)] italic bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)]">
                          No hidden test cases added yet. Click "Add Hidden Case" to configure grading benchmarks.
                        </div>
                      ) : (
                        getParsedCases(formData.hidden_test_cases).map((tc, idx) => (
                          <div
                            key={idx}
                            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                              <span className="font-bold text-indigo-600">Hidden Benchmark #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => deleteVisualTestCase(false, idx)}
                                className="text-[var(--red)] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                              <div>
                                <span className="text-[10px] text-[var(--text-muted)] block mb-1">
                                  Standard Input (stdin)
                                </span>
                                <textarea
                                  value={tc.input || ''}
                                  onChange={(e) =>
                                    editVisualTestCase(false, idx, 'input', e.target.value)
                                  }
                                  placeholder="e.g. 50 100"
                                  rows={2}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)]"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-[var(--text-muted)] block mb-1">
                                  Expected Benchmark Output (stdout)
                                </span>
                                <textarea
                                  value={tc.expected_output || tc.expected || ''}
                                  onChange={(e) =>
                                    editVisualTestCase(false, idx, 'expected_output', e.target.value)
                                  }
                                  placeholder="e.g. 150"
                                  rows={2}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] font-bold text-[var(--green)]"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={formData.hidden_test_cases}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, hidden_test_cases: e.target.value }))
                      }
                      rows={5}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] leading-relaxed"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Bottom Save Action Bar */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {selectedExpId === 'NEW'
                  ? 'Ready to publish new experiment to curriculum'
                  : `Editing Experiment ${formData.experiment_no}`}
              </span>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {selectedExpId === 'NEW' ? 'Create Experiment' : 'Save Experiment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
