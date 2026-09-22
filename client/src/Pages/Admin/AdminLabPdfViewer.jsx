import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Save,
  Download,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Code2,
  Terminal,
  Award,
  RefreshCw,
  ExternalLink,
  Edit3,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Hash,
  Columns2,
  FileSpreadsheet,
  HelpCircle,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import api from '../../api/axios';

export default function AdminLabPdfViewer() {
  const { courseId: paramCourseId } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(paramCourseId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);

  // View mode: 'book_spread' (2-Page Left & Right) | 'designer' (Single Page Focus) | 'scroll' (Continuous All Pages)
  const [viewMode, setViewMode] = useState('book_spread');
  // In single page focus: 'cover' | 'index' | number (index into experiments array)
  const [activePageIndex, setActivePageIndex] = useState('cover');
  // In 2-page book spread: active spread index (0 = Spread 1 [Cover], 1 = Spread 2 [Index + Ex 1], 2 = Spread 3 [Ex 2 + Ex 3], etc.)
  const [activeSpread, setActiveSpread] = useState(1);

  // Duplex / Booklet Printing Setting
  const [isDuplex, setIsDuplex] = useState(true);

  // Full editable template structure
  const [template, setTemplate] = useState({
    institution_name: 'BANNARI AMMAN INSTITUTE OF TECHNOLOGY',
    institution_sub: 'An Autonomous Institution Affiliated to Anna University Chennai',
    department: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE',
    degree: 'B.Tech',
    semester: 'Semester III',
    academic_year: '2025-2026',
    course_code: '22AI304',
    course_title: 'PRINCIPLES OF PROGRAMMING LABORATORY',
    student_name: 'JAISON DAVID M',
    roll_no: '7376222AD145',
    register_no: '7376222AD145',
    branch_section: 'AIDS - A',
    verification_id: 'MOCKMATE-REC-OFFICIAL',
    certificate_text: '',
    staff_incharge: 'Staff Incharge',
    head_of_department: 'Head of Department',
    is_duplex: true,
    experiments: []
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchInitialCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseTemplate(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchInitialCourses = async () => {
    try {
      const res = await api.get('/admin/labs/data');
      const list = res.courses || [];
      setCourses(list);
      if (!selectedCourseId && list.length > 0) {
        setSelectedCourseId(list[0].id);
      }
    } catch {
      showToast('Failed to load courses', 'error');
    }
  };

  const loadCourseTemplate = async (cId) => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/labs/courses/${cId}/pdf-template`);
      if (res?.template) {
        setTemplate({
          ...res.template,
          is_duplex: res.template.is_duplex ?? true
        });
      }
    } catch {
      showToast('Failed to load PDF template for this course', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedCourseId) return;
    try {
      setSaving(true);
      const payload = { ...template, is_duplex: isDuplex };
      const res = await api.post(`/admin/labs/courses/${selectedCourseId}/pdf-template`, payload);
      showToast(res?.message || 'Course template saved successfully for all experiments!');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const payload = { ...template, is_duplex: isDuplex };
      const response = await api.post('/admin/labs/record-pdf/custom', payload, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data || response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${template.course_code}_Official_LabRecord_Manual.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Full multi-page PDF generated & downloaded!');
    } catch {
      showToast('Failed to generate PDF download', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Helper to update root template fields
  const updateTemplateField = (field, val) => {
    setTemplate(prev => ({ ...prev, [field]: val }));
  };

  // Helper to update specific experiment fields
  const updateExperimentField = (expIndex, field, val) => {
    setTemplate(prev => {
      const updated = [...prev.experiments];
      if (updated[expIndex]) {
        updated[expIndex] = { ...updated[expIndex], [field]: val };
      }
      return { ...prev, experiments: updated };
    });
  };

  // -------------------------------------------------------------
  // PAGE REORDERING & FLEXIBLE OPERATIONS
  // -------------------------------------------------------------

  const moveExperiment = (fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= template.experiments.length) return;
    if (toIndex < 0 || toIndex >= template.experiments.length) return;
    setTemplate(prev => {
      const updated = [...prev.experiments];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      // Auto renumber
      const renumbered = updated.map((item, idx) => ({
        ...item,
        experiment_no: idx + 1
      }));
      return { ...prev, experiments: renumbered };
    });
    if (typeof activePageIndex === 'number') {
      setActivePageIndex(toIndex);
    }
    showToast(`Page moved to position ${toIndex + 1}`);
  };

  const moveExpToFirst = (idx) => moveExperiment(idx, 0);
  const moveExpToLast = (idx) => moveExperiment(idx, template.experiments.length - 1);
  const moveExpUp = (idx) => moveExperiment(idx, idx - 1);
  const moveExpDown = (idx) => moveExperiment(idx, idx + 1);

  const handleAddCustomPage = (pageType = 'experiment') => {
    const nextNo = template.experiments.length + 1;
    let newPage = {
      experiment_no: nextNo,
      page_type: pageType,
      title: `Experiment ${nextNo}: Custom Task`,
      aim: `To develop and test a program for task ${nextNo}.`,
      procedure: '1. Initialize data structures.\n2. Implement processing logic.\n3. Verify output assertions.',
      language: 'python',
      submitted_code: `# Solution for Experiment ${nextNo}\n\ndef main():\n    print("Experiment ${nextNo} executed successfully")\n\nif __name__ == '__main__':\n    main()`,
      execution_output: `[PASS] All test cases validated for Experiment ${nextNo}.`,
      pass_count: 3,
      total_test_cases: 3,
      marks: 10,
      status: 'APPROVED',
      date: '22-09-2026',
      result_text: `Thus the program was successfully developed, executed, and evaluated.`,
      notes: ''
    };

    if (pageType === 'observation') {
      newPage.title = `Rough Work & Calculation Sheet`;
      newPage.notes = `Use this page for manual dry run observations and algorithm trace tables.`;
    } else if (pageType === 'viva') {
      newPage.title = `Viva Voce Questions & Evaluation`;
      newPage.notes = `1. Explain the time and space complexity of your algorithm.\n2. What data structure is most optimal here and why?\n3. How do you handle boundary edge conditions?`;
    } else if (pageType === 'notes') {
      newPage.title = `Appendix & Reference Manual`;
      newPage.notes = `Additional reference notes and syntax guidelines.`;
    }

    setTemplate(prev => ({
      ...prev,
      experiments: [...prev.experiments, newPage]
    }));
    setActivePageIndex(template.experiments.length);
    showToast(`New ${pageType} sheet added to curriculum!`);
  };

  const handleDeletePage = (idx) => {
    if (!window.confirm(`Are you sure you want to delete Page ${idx + 1}?`)) return;
    setTemplate(prev => {
      const updated = prev.experiments.filter((_, i) => i !== idx).map((item, i) => ({
        ...item,
        experiment_no: i + 1
      }));
      return { ...prev, experiments: updated };
    });
    setActivePageIndex('cover');
    showToast('Page deleted and sequence renumbered.');
  };

  const handleDuplicatePage = (idx) => {
    const itemToDup = template.experiments[idx];
    if (!itemToDup) return;
    const duplicated = {
      ...itemToDup,
      title: `${itemToDup.title} (Copy)`,
      experiment_no: template.experiments.length + 1
    };
    setTemplate(prev => ({
      ...prev,
      experiments: [...prev.experiments, duplicated]
    }));
    setActivePageIndex(template.experiments.length);
    showToast('Page duplicated successfully!');
  };

  const handleRenumberAll = () => {
    setTemplate(prev => ({
      ...prev,
      experiments: prev.experiments.map((item, i) => ({
        ...item,
        experiment_no: i + 1
      }))
    }));
    showToast('All experiments renumbered sequentially (1 to N)!');
  };

  // Build list of all pages for booklet rendering
  // Page 1: Cover (Odd/Right)
  // Page 2: Index (Even/Left)
  // Page 3..N: Experiments (Alternating Odd/Right & Even/Left)
  const allBookPages = [
    { type: 'cover', title: 'Cover & Bonafide Certificate', pageNum: 1 },
    { type: 'index', title: 'Index / Table of Contents', pageNum: 2 },
    ...template.experiments.map((exp, idx) => ({
      type: 'exp',
      expData: exp,
      expIndex: idx,
      title: `Ex ${exp.experiment_no}: ${exp.title}`,
      pageNum: idx + 3
    }))
  ];

  // Group pages into 2-page book spreads:
  // Spread 0: [Empty Left Page] + [Page 1: Cover (Right)]
  // Spread 1: [Page 2: Index (Left)] + [Page 3: Exp 01 (Right)]
  // Spread 2: [Page 4: Exp 02 (Left)] + [Page 5: Exp 03 (Right)]
  const totalSpreads = Math.ceil(allBookPages.length / 2);
  const getSpreadPages = (spreadIdx) => {
    if (spreadIdx === 0) {
      return { left: null, right: allBookPages[0] }; // Front Cover is right/odd page
    }
    const leftPage = allBookPages[spreadIdx * 2 - 1] || null;
    const rightPage = allBookPages[spreadIdx * 2] || null;
    return { left: leftPage, right: rightPage };
  };

  const inputClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-all font-sans";
  const textareaClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-all resize-y";

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold shadow-2xl transition-all animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'error'
              ? 'bg-rose-500/90 text-white'
              : 'bg-emerald-500/90 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(selectedCourseId ? `/admin/labs/courses/${selectedCourseId}/experiments` : '/admin/labs/config')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back to Experiments
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1">
              <Sparkles className="w-3 h-3" />
              Fully Flexible Record Manual Studio
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--accent)]" />
              Lab Record PDF Designer & Booklet Print Manager
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Review, reorder pages, add custom observation/viva sheets, and preview 2-page Left & Right printout spreads.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] shadow-[var(--shadow-sm)] cursor-pointer"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.course_code} — {c.title}
              </option>
            ))}
          </select>

          {/* Duplex Gutter Toggle */}
          <button
            onClick={() => setIsDuplex(!isDuplex)}
            title="Toggle alternating inside binding gutter margins for double-sided booklet printing"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all cursor-pointer ${
              isDuplex
                ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            {isDuplex ? 'Duplex Margins: ON' : 'Duplex Margins: OFF'}
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-md)]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save for Course
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" /> : <Download className="w-4 h-4 text-[var(--accent)]" />}
            Download Sample PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Loading course manual sheets & experiments...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TOP TOOLBAR: VIEW MODE & PAGE OPERATIONS */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3.5 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
              <button
                onClick={() => setViewMode('book_spread')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'book_spread'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                📖 2-Page Book Spread (Left & Right)
              </button>
              <button
                onClick={() => setViewMode('designer')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'designer'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                📄 Single Page Focus & Editor
              </button>
              <button
                onClick={() => setViewMode('scroll')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'scroll'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                📜 Continuous Scroll View
              </button>
            </div>

            {/* Quick Add Custom Pages Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
                Insert Page:
              </span>
              <button
                onClick={() => handleAddCustomPage('experiment')}
                className="px-2.5 py-1.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                + Experiment
              </button>
              <button
                onClick={() => handleAddCustomPage('observation')}
                className="px-2.5 py-1.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                + Observation Sheet
              </button>
              <button
                onClick={() => handleAddCustomPage('viva')}
                className="px-2.5 py-1.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                + Viva Voce
              </button>
              <button
                onClick={handleRenumberAll}
                title="Renumber all experiments sequentially"
                className="px-2.5 py-1.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Hash className="w-3.5 h-3.5 text-[var(--accent)]" />
                Renumber 1..N
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW MODE 1: TWO-PAGE BOOKLET SPREAD (LEFT & RIGHT PAGES) */}
          {/* ========================================================= */}
          {viewMode === 'book_spread' && (
            <div className="space-y-6">
              {/* Spread Navigator Controls */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSpread(prev => Math.max(0, prev - 1))}
                    disabled={activeSpread === 0}
                    className="px-3 py-1.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--border-accent)] disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Spread
                  </button>

                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                    Spread {activeSpread + 1} of {totalSpreads}
                  </span>

                  <button
                    onClick={() => setActiveSpread(prev => Math.min(totalSpreads - 1, prev + 1))}
                    disabled={activeSpread >= totalSpreads - 1}
                    className="px-3 py-1.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--border-accent)] disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    Next Spread
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Spread Jump Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                  {Array.from({ length: totalSpreads }).map((_, sIdx) => {
                    const { left, right } = getSpreadPages(sIdx);
                    const label = sIdx === 0 ? 'Cover' : `P${left?.pageNum || ''}-P${right?.pageNum || ''}`;
                    return (
                      <button
                        key={sIdx}
                        onClick={() => setActiveSpread(sIdx)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          activeSpread === sIdx
                            ? 'bg-[var(--accent)] text-white shadow-sm'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TWO-PAGE SPREAD DISPLAY WITH REALISTIC BINDING GUTTER */}
              <div className="bg-slate-900/90 p-4 sm:p-8 rounded-[var(--radius-xl)] shadow-2xl border border-slate-700/50">
                <div className="flex flex-col xl:flex-row items-center justify-center gap-0 max-w-[1550px] mx-auto relative">
                  {(() => {
                    const { left, right } = getSpreadPages(activeSpread);
                    return (
                      <>
                        {/* LEFT PAGE (EVEN / VERSO) */}
                        <div className="w-full xl:w-1/2 flex justify-end">
                          {left ? (
                            <div className="w-full max-w-[700px] relative shadow-2xl origin-right">
                              {/* Left Page Binding Shadow along right border */}
                              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/20 to-transparent pointer-events-none z-10" />
                              <div className="absolute top-2 left-4 text-[10px] font-mono font-bold text-slate-400 select-none">
                                📖 Left Page (Even · P{left.pageNum})
                              </div>
                              {left.type === 'cover' && <A4CoverPage template={template} isLeft={true} />}
                              {left.type === 'index' && <A4IndexPage template={template} isLeft={true} />}
                              {left.type === 'exp' && (
                                <A4ExperimentPage exp={left.expData} template={template} isLeft={true} />
                              )}
                            </div>
                          ) : (
                            // Blank Inside Cover / Hardcover Backing
                            <div className="w-full max-w-[700px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-sm p-12 min-h-[950px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3" style={{ aspectRatio: '1 / 1.414' }}>
                              <BookOpen className="w-12 h-12 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                Outer Hardcover Binding (Front)
                              </h4>
                              <p className="text-xs text-slate-500 max-w-xs">
                                Physical manual begins on the right page. Flip forward to view the Table of Contents & Experiment Sheets.
                              </p>
                              <button
                                onClick={() => setActiveSpread(1)}
                                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
                              >
                                Open to Index & Experiments →
                              </button>
                            </div>
                          )}
                        </div>

                        {/* CENTER BINDING SEAM (GUTTER EFFECT) */}
                        <div className="hidden xl:flex flex-col items-center justify-center w-6 h-[950px] relative z-20 select-none">
                          <div className="w-2 h-full bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 shadow-inner rounded-full" />
                          <div className="absolute text-[9px] font-mono uppercase tracking-widest text-slate-500 rotate-90 whitespace-nowrap">
                            Binding Gutter
                          </div>
                        </div>

                        {/* RIGHT PAGE (ODD / RECTO) */}
                        <div className="w-full xl:w-1/2 flex justify-start">
                          {right ? (
                            <div className="w-full max-w-[700px] relative shadow-2xl origin-left">
                              {/* Right Page Binding Shadow along left border */}
                              <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-slate-900/20 to-transparent pointer-events-none z-10" />
                              <div className="absolute top-2 right-4 text-[10px] font-mono font-bold text-slate-400 select-none">
                                📖 Right Page (Odd · P{right.pageNum})
                              </div>
                              {right.type === 'cover' && <A4CoverPage template={template} isLeft={false} />}
                              {right.type === 'index' && <A4IndexPage template={template} isLeft={false} />}
                              {right.type === 'exp' && (
                                <A4ExperimentPage exp={right.expData} template={template} isLeft={false} />
                              )}
                            </div>
                          ) : (
                            <div className="w-full max-w-[700px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-sm p-12 min-h-[950px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3" style={{ aspectRatio: '1 / 1.414' }}>
                              <Award className="w-12 h-12 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                End of Curriculum Manual
                              </h4>
                              <p className="text-xs text-slate-500 max-w-xs">
                                All {template.experiments?.length} experiments and official certification sheets are complete.
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW MODE 2: SINGLE PAGE FOCUS & LIVE INSPECTOR EDITOR   */}
          {/* ========================================================= */}
          {viewMode === 'designer' && (
            <div className="space-y-6">
              {/* Page Navigator Tabs with Reorder & Move Controls */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setActivePageIndex('cover')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePageIndex === 'cover'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Cover Page
                  </button>

                  <button
                    onClick={() => setActivePageIndex('index')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activePageIndex === 'index'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Index Table
                  </button>

                  {template.experiments?.map((exp, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePageIndex(idx)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePageIndex === idx
                          ? 'bg-[var(--accent)] text-white shadow-sm'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                      }`}
                    >
                      <span className="font-mono text-[10px]">
                        {exp.page_type === 'observation' ? 'Rough' : exp.page_type === 'viva' ? 'Viva' : `Ex ${String(exp.experiment_no).padStart(2, '0')}`}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected Experiment Position Controls */}
                {typeof activePageIndex === 'number' && (
                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] p-1 rounded border border-[var(--border)]">
                    <button
                      onClick={() => moveExpToFirst(activePageIndex)}
                      title="Move this experiment to the very first position (Top)"
                      className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExpUp(activePageIndex)}
                      disabled={activePageIndex === 0}
                      title="Move this experiment one step up"
                      className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-30 transition-all cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExpDown(activePageIndex)}
                      disabled={activePageIndex === template.experiments.length - 1}
                      title="Move this experiment one step down"
                      className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-30 transition-all cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExpToLast(activePageIndex)}
                      title="Move this experiment to the very last position (Bottom)"
                      className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-[var(--border)] mx-1" />
                    <button
                      onClick={() => handleDuplicatePage(activePageIndex)}
                      title="Duplicate this page"
                      className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-blue-500 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePage(activePageIndex)}
                      title="Delete this page"
                      className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-rose-500 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 2-Column Split (Left: Focused A4 Sheet, Right: Inspector Controls) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  {activePageIndex === 'cover' && <A4CoverPage template={template} />}
                  {activePageIndex === 'index' && <A4IndexPage template={template} />}
                  {typeof activePageIndex === 'number' && template.experiments[activePageIndex] && (
                    <A4ExperimentPage exp={template.experiments[activePageIndex]} template={template} />
                  )}
                </div>

                <div className="lg:col-span-5 space-y-5">
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                        {activePageIndex === 'cover' && 'Cover & Certificate Editor'}
                        {activePageIndex === 'index' && 'Index Table Settings'}
                        {typeof activePageIndex === 'number' && `Experiment ${template.experiments[activePageIndex]?.experiment_no} Inspector`}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]">
                        LIVE SYNC
                      </span>
                    </div>

                    {/* COVER EDITOR */}
                    {activePageIndex === 'cover' && (
                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[11px] font-bold text-[var(--text-secondary)]">Department Header</label>
                          <input
                            type="text"
                            value={template.department}
                            onChange={(e) => updateTemplateField('department', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-[var(--text-secondary)]">Degree</label>
                            <input
                              type="text"
                              value={template.degree}
                              onChange={(e) => updateTemplateField('degree', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[var(--text-secondary)]">Semester</label>
                            <input
                              type="text"
                              value={template.semester}
                              onChange={(e) => updateTemplateField('semester', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-[var(--text-secondary)]">Academic Year</label>
                            <input
                              type="text"
                              value={template.academic_year}
                              onChange={(e) => updateTemplateField('academic_year', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[var(--text-secondary)]">Course Code</label>
                            <input
                              type="text"
                              value={template.course_code}
                              onChange={(e) => updateTemplateField('course_code', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[var(--text-secondary)]">Course Title</label>
                          <input
                            type="text"
                            value={template.course_title}
                            onChange={(e) => updateTemplateField('course_title', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[var(--text-secondary)]">Custom Bonafide Statement</label>
                          <textarea
                            rows={3}
                            value={template.certificate_text}
                            placeholder="Leave blank for auto-generated standard bonafide text..."
                            onChange={(e) => updateTemplateField('certificate_text', e.target.value)}
                            className={textareaClass}
                          />
                        </div>
                      </div>
                    )}

                    {/* INDEX EDITOR */}
                    {activePageIndex === 'index' && (
                      <div className="space-y-4">
                        <p className="text-xs text-[var(--text-secondary)]">
                          Table of Contents lists all {template.experiments?.length} curriculum tasks with evaluations. Use the move arrows above to reorder:
                        </p>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {template.experiments?.map((exp, idx) => (
                            <div key={idx} className="p-2.5 rounded bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-bold text-[var(--accent)]">Ex {exp.experiment_no}: </span>
                                <span className="font-semibold text-[var(--text-primary)]">{exp.title}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => moveExpUp(idx)}
                                  disabled={idx === 0}
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-20"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveExpDown(idx)}
                                  disabled={idx === template.experiments.length - 1}
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-20"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EXPERIMENT & CUSTOM SHEET INSPECTOR */}
                    {typeof activePageIndex === 'number' && template.experiments[activePageIndex] && (
                      <div className="space-y-3.5">
                        {(() => {
                          const exp = template.experiments[activePageIndex];
                          const idx = activePageIndex;
                          return (
                            <>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-1">
                                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">Ex No</label>
                                  <input
                                    type="number"
                                    value={exp.experiment_no}
                                    onChange={(e) => updateExperimentField(idx, 'experiment_no', parseInt(e.target.value) || 1)}
                                    className={inputClass}
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">Sheet Title</label>
                                  <input
                                    type="text"
                                    value={exp.title}
                                    onChange={(e) => updateExperimentField(idx, 'title', e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                              </div>

                              {exp.page_type === 'observation' || exp.page_type === 'viva' || exp.page_type === 'notes' ? (
                                <div>
                                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">Sheet Content / Notes</label>
                                  <textarea
                                    rows={8}
                                    value={exp.notes}
                                    onChange={(e) => updateExperimentField(idx, 'notes', e.target.value)}
                                    className={textareaClass}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">Aim / Objective</label>
                                    <textarea
                                      rows={2}
                                      value={exp.aim}
                                      onChange={(e) => updateExperimentField(idx, 'aim', e.target.value)}
                                      className={textareaClass}
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">Procedure / Algorithm</label>
                                    <textarea
                                      rows={3}
                                      value={exp.procedure}
                                      onChange={(e) => updateExperimentField(idx, 'procedure', e.target.value)}
                                      className={textareaClass}
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[11px] font-bold text-[var(--text-secondary)]">Reference Solution Code</label>
                                      <span className="text-[10px] text-[var(--text-muted)] font-mono">Python 3</span>
                                    </div>
                                    <textarea
                                      rows={5}
                                      value={exp.submitted_code}
                                      onChange={(e) => updateExperimentField(idx, 'submitted_code', e.target.value)}
                                      className="w-full bg-slate-900 text-slate-100 font-mono text-[11px] p-2.5 rounded border border-slate-700 focus:outline-none focus:border-[var(--accent)] resize-y"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold text-[var(--text-secondary)]">Execution Console Output</label>
                                    <textarea
                                      rows={2}
                                      value={exp.execution_output}
                                      onChange={(e) => updateExperimentField(idx, 'execution_output', e.target.value)}
                                      className="w-full bg-slate-900 text-emerald-400 font-mono text-[11px] p-2.5 rounded border border-slate-700 focus:outline-none focus:border-[var(--accent)] resize-y"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <div className="pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={handleSaveTemplate}
                        disabled={saving}
                        className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[var(--shadow-sm)]"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Official Template for Course
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW MODE 3: CONTINUOUS SCROLL VIEW OF ALL PAGES          */}
          {/* ========================================================= */}
          {viewMode === 'scroll' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <div className="p-2 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Full Laboratory Record Document Layout ({template.experiments?.length + 2} Total Sheets)
              </div>
              <A4CoverPage template={template} />
              <A4IndexPage template={template} />
              {template.experiments?.map((exp, idx) => (
                <A4ExperimentPage key={idx} exp={exp} template={template} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// VISUAL A4 SUB-COMPONENTS WITH REALISTIC PRINT MARGINS
// -------------------------------------------------------------

function A4CoverPage({ template, isLeft = false }) {
  const deptStr = template.department?.toUpperCase() || 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE';
  const certText = template.certificate_text || `Certified that this is the bonafide record of practical work done by Mr./Ms. ${template.student_name || 'STUDENT NAME'} (Roll No: ${template.roll_no || '7376222AD145'}) of ${template.semester || 'Semester III'} in the ${template.course_title || 'Principles of Programming Laboratory'} (${template.course_code || '22AI304'}) Laboratory of Bannari Amman Institute of Technology during the academic year ${template.academic_year || '2025-2026'}.`;

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between">
        {/* Header Block */}
        <div className="text-center space-y-2">
          <img src="/BITlogo.png" alt="Bannari Amman Institute of Technology" className="max-h-16 mx-auto object-contain" />
          <div className="h-0.5 bg-slate-800 w-full my-2" />
          <h2 className="text-[13px] font-black tracking-wider text-slate-800">
            {deptStr}
          </h2>
          <div className="bg-slate-100 border border-slate-300 py-1 px-4 my-2 text-center">
            <h3 className="text-[14px] font-black tracking-widest text-slate-900">
              LABORATORY RECORD NOTEBOOK
            </h3>
          </div>
          <p className="text-[13px] font-bold text-slate-900">
            {template.course_code} — {template.course_title?.toUpperCase()}
          </p>
          <p className="text-[11px] text-slate-600 font-medium italic">
            {template.degree} | {template.semester} | Academic Year: {template.academic_year}
          </p>
        </div>

        {/* Student Profile Box */}
        <div className="bg-slate-50 border border-slate-300 p-4 rounded text-[12px] space-y-1.5 my-4">
          <div className="grid grid-cols-12">
            <span className="col-span-4 font-bold text-slate-700">STUDENT NAME</span>
            <span className="col-span-8 font-semibold text-slate-900">: {template.student_name}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 font-bold text-slate-700">ROLL / REG NO</span>
            <span className="col-span-8 font-mono font-bold text-slate-900">: {template.roll_no}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 font-bold text-slate-700">BRANCH / SECTION</span>
            <span className="col-span-8 text-slate-900">: {template.branch_section || 'AIDS - A'}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 font-bold text-slate-700">SEMESTER & YEAR</span>
            <span className="col-span-8 text-slate-900">: {template.semester} | {template.academic_year}</span>
          </div>
          <div className="grid grid-cols-12">
            <span className="col-span-4 font-bold text-slate-700">VERIFICATION ID</span>
            <span className="col-span-8 font-mono font-bold text-emerald-700">: {template.verification_id}</span>
          </div>
        </div>

        {/* Bonafide Certificate */}
        <div className="space-y-3 text-center my-4">
          <h4 className="text-[13px] font-black tracking-widest text-slate-900 border-b border-slate-300 pb-1 inline-block">
            BONAFIDE CERTIFICATE
          </h4>
          <p className="text-[12px] text-slate-700 text-justify leading-relaxed">
            {certText}
          </p>
        </div>

        {/* Signatures Grid */}
        <div className="pt-8 grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-800">
          <div>
            <div className="border-t border-slate-400 pt-1">{template.staff_incharge || 'Staff Incharge'}</div>
            <div className="text-[9px] text-slate-500 font-normal italic">(Digital Sign-off)</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1">{template.head_of_department || 'Head of Department'}</div>
            <div className="text-[9px] text-slate-500 font-normal italic">(Department Seal)</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1">Internal Examiner</div>
            <div className="text-[9px] text-slate-500 font-normal italic">(Evaluation)</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1">External Examiner</div>
            <div className="text-[9px] text-slate-500 font-normal italic">(Evaluation)</div>
          </div>
        </div>

        {/* Page Footer */}
        <div className={`text-[9px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between`}>
          <span>Bannari Amman Institute of Technology</span>
          <span>Page 1 of {template.experiments?.length + 2}</span>
        </div>
      </div>
    </div>
  );
}

function A4IndexPage({ template, isLeft = true }) {
  const totalMarks = template.experiments?.reduce((acc, curr) => acc + (curr.marks || 10), 0) || 0;
  const avg = template.experiments?.length > 0 ? (totalMarks / template.experiments.length).toFixed(1) : '10.0';

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</span>
            <span>{template.course_code} — PRACTICAL LAB RECORD</span>
          </div>
          <div className="text-center py-2">
            <h3 className="text-[14px] font-black tracking-widest text-slate-900">
              INDEX OF EXPERIMENTS
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Curriculum Task List & Evaluation Roster
            </p>
          </div>

          <table className="w-full border-collapse text-[11px] border border-slate-400 mt-3">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                <th className="p-2 text-center border-r border-slate-400 w-12">EX</th>
                <th className="p-2 text-center border-r border-slate-400 w-24">DATE</th>
                <th className="p-2 text-left border-r border-slate-400">TITLE OF THE EXPERIMENT</th>
                <th className="p-2 text-center border-r border-slate-400 w-20">MARKS</th>
                <th className="p-2 text-center w-24">SIGN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {template.experiments?.map((exp, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                    {String(exp.experiment_no || idx + 1).padStart(2, '0')}
                  </td>
                  <td className="p-2 text-center text-slate-600 border-r border-slate-300">
                    {exp.date || '22-09-2026'}
                  </td>
                  <td className="p-2 font-medium text-slate-900 border-r border-slate-300">
                    {exp.title}
                  </td>
                  <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-300">
                    {exp.marks || 10} / 10
                  </td>
                  <td className="p-2 text-center font-bold text-emerald-700 text-[10px]">
                    VERIFIED
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="p-2 text-right border-r border-slate-400 uppercase text-[10px]">
                  Total Evaluated Average Score :
                </td>
                <td className="p-2 text-center text-slate-900 border-r border-slate-400 font-black">
                  {avg} / 10
                </td>
                <td className="p-2 text-center text-slate-600 font-mono text-[10px]">
                  SEALED
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={`text-[9px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between`}>
          <span>Bannari Amman Institute of Technology</span>
          <span>Page 2 of {template.experiments?.length + 2}</span>
        </div>
      </div>
    </div>
  );
}

function A4ExperimentPage({ exp, template, isLeft = false }) {
  const codeLines = (exp.submitted_code || '').split('\n');
  const pType = exp.page_type || 'experiment';

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span>BIT — {template.course_code}</span>
            <span>Student: {template.student_name} ({template.roll_no})</span>
          </div>

          {pType === 'observation' ? (
            <div className="space-y-3">
              <div className="bg-slate-100 border border-slate-400 p-2 text-left font-black text-[12px] text-slate-900">
                ROUGH WORK & OBSERVATION SHEET — EX {String(exp.experiment_no).padStart(2, '0')}
              </div>
              {exp.notes && (
                <p className="text-xs text-slate-600 p-2 bg-slate-50 border border-slate-200 rounded">
                  {exp.notes}
                </p>
              )}
              {/* Lined Notebook Grid */}
              <div className="space-y-6 pt-4">
                {Array.from({ length: 18 }).map((_, lIdx) => (
                  <div key={lIdx} className="border-b border-slate-200 h-2" />
                ))}
              </div>
            </div>
          ) : pType === 'viva' ? (
            <div className="space-y-3">
              <div className="bg-slate-100 border border-slate-400 p-2 text-left font-black text-[12px] text-slate-900">
                VIVA VOCE QUESTIONS & EVALUATION — EX {String(exp.experiment_no).padStart(2, '0')}: {exp.title}
              </div>
              <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3 text-xs text-slate-800">
                <p className="whitespace-pre-line leading-relaxed">
                  {exp.notes || `1. What is the fundamental logic of ${exp.title}?\n2. What are the key edge test cases?\n3. Explain the time and space complexity.`}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Experiment Title Bar */}
              <div className="bg-slate-100 border border-slate-400 p-2 text-left font-black text-[12px] text-slate-900 flex items-center justify-between">
                <span>EX NO: {String(exp.experiment_no).padStart(2, '0')} — {exp.title?.toUpperCase()}</span>
                <span className="text-[10px] font-normal font-mono text-slate-600">{exp.date || '22-09-2026'}</span>
              </div>

              {/* 1. AIM */}
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">AIM:</h5>
                <p className="text-[11px] text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-400">
                  {exp.aim || `To design and implement a program for ${exp.title}.`}
                </p>
              </div>

              {/* 2. PROCEDURE */}
              {exp.procedure && (
                <div className="space-y-1">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">PROCEDURE / ALGORITHM:</h5>
                  <p className="text-[10.5px] text-slate-700 whitespace-pre-line leading-relaxed pl-2 border-l-2 border-slate-400">
                    {exp.procedure}
                  </p>
                </div>
              )}

              {/* 3. SOURCE CODE */}
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  VERIFIED SOURCE CODE ({exp.language?.toUpperCase() || 'PYTHON 3'}):
                </h5>
                <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[10px] leading-snug overflow-x-auto border border-slate-700">
                  {codeLines.map((line, lIdx) => (
                    <div key={lIdx} className="flex">
                      <span className="text-slate-500 w-8 select-none text-right pr-2">{lIdx + 1}</span>
                      <span className="text-slate-200">{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. EXECUTION OUTPUT */}
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  EXECUTION OUTPUT & TEST VERIFICATION:
                </h5>
                <div className="bg-emerald-50 border border-emerald-300 p-2 rounded text-[10px] font-mono text-emerald-900 space-y-1">
                  <div className="font-bold text-emerald-800">
                    ✓ [PASS] Status: VERIFIED | Hidden Test Cases: {exp.pass_count || 3} / {exp.total_test_cases || 3} | Marks: {exp.marks || 10} / 10
                  </div>
                  <div className="text-slate-700 pl-2 border-l-2 border-emerald-400">
                    [CONSOLE]: {exp.execution_output || `All test cases passed for '${exp.title}'.`}
                  </div>
                </div>
              </div>

              {/* 5. RESULT */}
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">RESULT:</h5>
                <p className="text-[11px] text-slate-700 italic pl-2 border-l-2 border-slate-400">
                  {exp.result_text || `Thus the program for '${exp.title}' was successfully developed, executed, tested against all verification test cases, and evaluated.`}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Evaluation Sign Footer */}
        <div>
          <div className="grid grid-cols-3 gap-3 border border-slate-400 p-2 text-center text-[10px] font-bold bg-slate-50">
            <div>Date: {exp.date || '22-09-2026'}</div>
            <div>Marks: {exp.marks || 10} / 10</div>
            <div className="text-emerald-700">Staff Sign: VERIFIED [DIGITAL]</div>
          </div>
          <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200 mt-2">
            Experiment {exp.experiment_no} · Bannari Amman Institute of Technology
          </div>
        </div>
      </div>
    </div>
  );
}
