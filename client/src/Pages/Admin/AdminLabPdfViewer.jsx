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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  GripVertical
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

  // View mode: 'book_spread' | 'designer' | 'scroll'
  const [viewMode, setViewMode] = useState('book_spread');
  const [activePageIndex, setActivePageIndex] = useState('cover');
  const [activeSpread, setActiveSpread] = useState(1);
  const [isDuplex, setIsDuplex] = useState(true);

  // Zoom scale for book spread view: 'fit' | '0.6' | '0.75' | '1.0'
  const [zoomScale, setZoomScale] = useState('fit');

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
        const exps = (res.template.experiments || []).map(exp => ({
          ...exp,
          section_order: exp.section_order && exp.section_order.length > 0
            ? exp.section_order
            : ['aim', 'procedure', 'code', 'output', 'result', 'signature']
        }));

        setTemplate({
          ...res.template,
          experiments: exps,
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

  const updateTemplateField = (field, val) => {
    setTemplate(prev => ({ ...prev, [field]: val }));
  };

  const updateExperimentField = (expIndex, field, val) => {
    setTemplate(prev => {
      const updated = [...prev.experiments];
      if (updated[expIndex]) {
        updated[expIndex] = { ...updated[expIndex], [field]: val };
      }
      return { ...prev, experiments: updated };
    });
  };

  // Drag and Drop state for inside-page sections
  const [draggedItem, setDraggedItem] = useState(null); // { expIndex, secName }
  const [dragOverItem, setDragOverItem] = useState(null); // { expIndex, secName }

  const handleDropSection = (expIndex, sourceSec, targetSec) => {
    if (!sourceSec || !targetSec || sourceSec === targetSec) return;
    setTemplate(prev => {
      const updated = [...prev.experiments];
      const exp = { ...updated[expIndex] };
      const order = [...(exp.section_order || ['aim', 'procedure', 'code', 'output', 'result', 'signature'])];
      const srcIdx = order.indexOf(sourceSec);
      const tgtIdx = order.indexOf(targetSec);
      if (srcIdx === -1 || tgtIdx === -1) return prev;

      // Remove from source position
      const [moved] = order.splice(srcIdx, 1);
      // Insert at target position
      order.splice(tgtIdx, 0, moved);

      exp.section_order = order;
      updated[expIndex] = exp;
      return { ...prev, experiments: updated };
    });
    showToast(`Placed "${sourceSec.toUpperCase()}" before "${targetSec.toUpperCase()}"!`);
  };

  const moveSectionWithinExp = (expIndex, secName, direction) => {
    setTemplate(prev => {
      const updated = [...prev.experiments];
      const exp = { ...updated[expIndex] };
      const order = [...(exp.section_order || ['aim', 'procedure', 'code', 'output', 'result', 'signature'])];
      const currIdx = order.indexOf(secName);
      if (currIdx === -1) return prev;

      if (direction === 'up' && currIdx > 0) {
        const [item] = order.splice(currIdx, 1);
        order.splice(currIdx - 1, 0, item);
      } else if (direction === 'down' && currIdx < order.length - 1) {
        const [item] = order.splice(currIdx, 1);
        order.splice(currIdx + 1, 0, item);
      } else if (direction === 'first') {
        const [item] = order.splice(currIdx, 1);
        order.unshift(item);
      } else if (direction === 'last') {
        const [item] = order.splice(currIdx, 1);
        order.push(item);
      }

      exp.section_order = order;
      updated[expIndex] = exp;
      return { ...prev, experiments: updated };
    });
    showToast(`Moved "${secName.toUpperCase()}" block ${direction}`);
  };

  const deleteSectionWithinExp = (expIndex, secName) => {
    if (!window.confirm(`Delete the "${secName.toUpperCase()}" block from this page?`)) return;
    setTemplate(prev => {
      const updated = [...prev.experiments];
      const exp = { ...updated[expIndex] };
      exp.section_order = (exp.section_order || ['aim', 'procedure', 'code', 'output', 'result', 'signature']).filter(s => s !== secName);
      updated[expIndex] = exp;
      return { ...prev, experiments: updated };
    });
    showToast(`Removed "${secName.toUpperCase()}" block from page.`);
  };

  const addSectionToExp = (expIndex, secName) => {
    setTemplate(prev => {
      const updated = [...prev.experiments];
      const exp = { ...updated[expIndex] };
      const order = [...(exp.section_order || ['aim', 'procedure', 'code', 'output', 'result', 'signature'])];
      if (!order.includes(secName)) {
        order.push(secName);
      }
      exp.section_order = order;
      updated[expIndex] = exp;
      return { ...prev, experiments: updated };
    });
    showToast(`Added "${secName.toUpperCase()}" block to page.`);
  };

  // -------------------------------------------------------------
  // FULL PAGE OPERATIONS
  // -------------------------------------------------------------

  const moveExperiment = (fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= template.experiments.length) return;
    if (toIndex < 0 || toIndex >= template.experiments.length) return;
    setTemplate(prev => {
      const updated = [...prev.experiments];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
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
      notes: '',
      section_order: ['aim', 'procedure', 'code', 'output', 'result', 'signature']
    };

    if (pageType === 'observation') {
      newPage.title = `Rough Work & Calculation Sheet`;
      newPage.notes = `Use this page for manual dry run observations and algorithm trace tables.`;
    } else if (pageType === 'viva') {
      newPage.title = `Viva Voce Questions & Evaluation`;
      newPage.notes = `1. Explain the time and space complexity of your algorithm.\n2. What data structure is most optimal here and why?\n3. How do you handle boundary edge conditions?`;
    }

    setTemplate(prev => ({
      ...prev,
      experiments: [...prev.experiments, newPage]
    }));
    setActivePageIndex(template.experiments.length);
    showToast(`New ${pageType} sheet added to manual!`);
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
    showToast('Page deleted successfully.');
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

  // Build page sequence for booklet spreads
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

  const totalSpreads = Math.ceil(allBookPages.length / 2);
  const getSpreadPages = (spreadIdx) => {
    if (spreadIdx === 0) {
      return { left: null, right: allBookPages[0] };
    }
    const leftPage = allBookPages[spreadIdx * 2 - 1] || null;
    const rightPage = allBookPages[spreadIdx * 2] || null;
    return { left: leftPage, right: rightPage };
  };

  const inputClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-all font-sans";
  const textareaClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-all resize-y";

  return (
    <div className="space-y-5">
      {/* Toast */}
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

      {/* Top Header */}
      <div className="pb-3 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(selectedCourseId ? `/admin/labs/courses/${selectedCourseId}/experiments` : '/admin/labs/config')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-0.5">
              <Sparkles className="w-3 h-3" />
              Full-Flexibility Layout & Component Studio
            </div>
            <h1 className="text-[17px] sm:text-[20px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--accent)]" />
              Lab Record PDF Designer & Booklet Manager
            </h1>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] shadow-[var(--shadow-sm)] cursor-pointer"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.course_code} — {c.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsDuplex(!isDuplex)}
            title="Toggle alternating inside binding gutter margins for double-sided printing"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all cursor-pointer ${
              isDuplex
                ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            {isDuplex ? 'Duplex: ON' : 'Duplex: OFF'}
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save for Course
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold hover:border-[var(--border-accent)] hover:text-[var(--accent)] transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" /> : <Download className="w-3.5 h-3.5 text-[var(--accent)]" />}
            Download Sample PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Loading manual sheets...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* VIEW SWITCHER & PAGE INSERTION STRIP */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-2.5 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
              <button
                onClick={() => setViewMode('book_spread')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'book_spread'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                📖 2-Page Book Spread
              </button>
              <button
                onClick={() => setViewMode('designer')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'scroll'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                📜 Continuous Scroll
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
                Insert Page:
              </span>
              <button
                onClick={() => handleAddCustomPage('experiment')}
                className="px-2.5 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3 h-3 text-[var(--accent)]" />
                + Experiment
              </button>
              <button
                onClick={() => handleAddCustomPage('observation')}
                className="px-2.5 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3 h-3 text-blue-500" />
                + Observation
              </button>
              <button
                onClick={() => handleAddCustomPage('viva')}
                className="px-2.5 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3 h-3 text-emerald-500" />
                + Viva Voce
              </button>
              <button
                onClick={handleRenumberAll}
                className="px-2.5 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Hash className="w-3 h-3 text-[var(--accent)]" />
                Renumber 1..N
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* VIEW 1: RESPONSIVE TWO-PAGE BOOKLET SPREAD                */}
          {/* ========================================================= */}
          {viewMode === 'book_spread' && (
            <div className="space-y-4">
              {/* Spread Controls & Zoom Slider */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSpread(prev => Math.max(0, prev - 1))}
                    disabled={activeSpread === 0}
                    className="px-3 py-1 rounded bg-[var(--bg-input)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--border-accent)] disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                    Spread {activeSpread + 1} / {totalSpreads}
                  </span>
                  <button
                    onClick={() => setActiveSpread(prev => Math.min(totalSpreads - 1, prev + 1))}
                    disabled={activeSpread >= totalSpreads - 1}
                    className="px-3 py-1 rounded bg-[var(--bg-input)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--border-accent)] disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Spread Buttons Strip */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5">
                  {Array.from({ length: totalSpreads }).map((_, sIdx) => {
                    const { left, right } = getSpreadPages(sIdx);
                    const label = sIdx === 0 ? 'Cover' : `P${left?.pageNum || ''}-P${right?.pageNum || ''}`;
                    return (
                      <button
                        key={sIdx}
                        onClick={() => setActiveSpread(sIdx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
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

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Zoom:</span>
                  <button
                    onClick={() => setZoomScale('fit')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${zoomScale === 'fit' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                  >
                    Fit Screen
                  </button>
                  <button
                    onClick={() => setZoomScale('0.75')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${zoomScale === '0.75' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setZoomScale('1.0')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${zoomScale === '1.0' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* SPREAD CONTAINER */}
              <div className="bg-slate-950/95 p-3 sm:p-6 rounded-[var(--radius-xl)] shadow-2xl border border-slate-800 overflow-x-auto">
                <div className={`flex flex-row items-stretch justify-center gap-2 sm:gap-4 mx-auto ${zoomScale === 'fit' ? 'max-w-6xl' : zoomScale === '0.75' ? 'max-w-4xl scale-90' : 'max-w-full'}`}>
                  {(() => {
                    const { left, right } = getSpreadPages(activeSpread);
                    return (
                      <>
                        {/* LEFT PAGE */}
                        <div className="w-1/2 flex justify-end">
                          {left ? (
                            <div className="w-full relative shadow-2xl max-w-[560px]">
                              <div className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-slate-400 select-none z-20">
                                📖 Left (P{left.pageNum})
                              </div>
                              {left.type === 'cover' && <InteractiveA4Sheet pageType="cover" template={template} setTemplate={setTemplate} isLeft={true} />}
                              {left.type === 'index' && <InteractiveA4Sheet pageType="index" template={template} setTemplate={setTemplate} isLeft={true} />}
                              {left.type === 'exp' && (
                                <InteractiveA4Sheet
                                  pageType="exp"
                                  exp={left.expData}
                                  expIndex={left.expIndex}
                                  template={template}
                                  setTemplate={setTemplate}
                                  isLeft={true}
                                  onMoveSection={moveSectionWithinExp}
                                  onDeleteSection={deleteSectionWithinExp}
                                  onAddSection={addSectionToExp}
                                  onDeletePage={handleDeletePage}
                                  onDropSection={handleDropSection}
                                  draggedItem={draggedItem}
                                  setDraggedItem={setDraggedItem}
                                  dragOverItem={dragOverItem}
                                  setDragOverItem={setDragOverItem}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-full bg-slate-900 border-2 border-dashed border-slate-800 rounded p-8 min-h-[500px] flex flex-col items-center justify-center text-center text-slate-500 space-y-2 max-w-[560px]" style={{ aspectRatio: '1 / 1.414' }}>
                              <BookOpen className="w-10 h-10 text-slate-700" />
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Front Hardcover Backing</h4>
                              <p className="text-[11px] text-slate-600 max-w-xs">Front cover page starts on the right page.</p>
                            </div>
                          )}
                        </div>

                        {/* CENTER BINDING SEAM */}
                        <div className="flex flex-col items-center justify-center w-3 select-none">
                          <div className="w-1.5 h-full bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 rounded-full" />
                        </div>

                        {/* RIGHT PAGE */}
                        <div className="w-1/2 flex justify-start">
                          {right ? (
                            <div className="w-full relative shadow-2xl max-w-[560px]">
                              <div className="absolute top-1.5 right-2 text-[9px] font-mono font-bold text-slate-400 select-none z-20">
                                📖 Right (P{right.pageNum})
                              </div>
                              {right.type === 'cover' && <InteractiveA4Sheet pageType="cover" template={template} setTemplate={setTemplate} isLeft={false} />}
                              {right.type === 'index' && <InteractiveA4Sheet pageType="index" template={template} setTemplate={setTemplate} isLeft={false} />}
                              {right.type === 'exp' && (
                                <InteractiveA4Sheet
                                  pageType="exp"
                                  exp={right.expData}
                                  expIndex={right.expIndex}
                                  template={template}
                                  setTemplate={setTemplate}
                                  isLeft={false}
                                  onMoveSection={moveSectionWithinExp}
                                  onDeleteSection={deleteSectionWithinExp}
                                  onAddSection={addSectionToExp}
                                  onDeletePage={handleDeletePage}
                                  onDropSection={handleDropSection}
                                  draggedItem={draggedItem}
                                  setDraggedItem={setDraggedItem}
                                  dragOverItem={dragOverItem}
                                  setDragOverItem={setDragOverItem}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-full bg-slate-900 border-2 border-dashed border-slate-800 rounded p-8 min-h-[500px] flex flex-col items-center justify-center text-center text-slate-500 space-y-2 max-w-[560px]" style={{ aspectRatio: '1 / 1.414' }}>
                              <Award className="w-10 h-10 text-slate-700" />
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">End of Document</h4>
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
          {/* VIEW 2: SINGLE PAGE FOCUS & SIDE-BY-SIDE EDITOR          */}
          {/* ========================================================= */}
          {viewMode === 'designer' && (
            <div className="space-y-4">
              {/* Single Page Tab Strip with Page Reorder / Delete */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-2.5 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setActivePageIndex('cover')}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${activePageIndex === 'cover' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                  >
                    Cover
                  </button>
                  <button
                    onClick={() => setActivePageIndex('index')}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${activePageIndex === 'index' ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                  >
                    Index
                  </button>
                  {template.experiments?.map((exp, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePageIndex(idx)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap cursor-pointer ${activePageIndex === idx ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                    >
                      <span className="font-mono text-[10px]">
                        {exp.page_type === 'observation' ? 'Rough' : exp.page_type === 'viva' ? 'Viva' : `Ex ${String(exp.experiment_no).padStart(2, '0')}`}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Page Position & Delete Controls */}
                {typeof activePageIndex === 'number' && (
                  <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded border border-[var(--border)]">
                    <button
                      onClick={() => moveExperiment(activePageIndex, 0)}
                      title="Move page to First (Top)"
                      className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <ArrowUpToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExperiment(activePageIndex, activePageIndex - 1)}
                      disabled={activePageIndex === 0}
                      title="Move page Up"
                      className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExperiment(activePageIndex, activePageIndex + 1)}
                      disabled={activePageIndex === template.experiments.length - 1}
                      title="Move page Down"
                      className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveExperiment(activePageIndex, template.experiments.length - 1)}
                      title="Move page to Last (End)"
                      className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-[var(--border)] mx-1" />
                    <button
                      onClick={() => handleDeletePage(activePageIndex)}
                      title="Delete this entire page"
                      className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Page
                    </button>
                  </div>
                )}
              </div>

              {/* 2-Column Split: Sheet Preview on Left & Inspector on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-[620px] shadow-2xl">
                    {activePageIndex === 'cover' && <InteractiveA4Sheet pageType="cover" template={template} setTemplate={setTemplate} isLeft={false} />}
                    {activePageIndex === 'index' && <InteractiveA4Sheet pageType="index" template={template} setTemplate={setTemplate} isLeft={false} />}
                    {typeof activePageIndex === 'number' && template.experiments[activePageIndex] && (
                      <InteractiveA4Sheet
                        pageType="exp"
                        exp={template.experiments[activePageIndex]}
                        expIndex={activePageIndex}
                        template={template}
                        setTemplate={setTemplate}
                        isLeft={false}
                        onMoveSection={moveSectionWithinExp}
                        onDeleteSection={deleteSectionWithinExp}
                        onAddSection={addSectionToExp}
                        onDeletePage={handleDeletePage}
                        onDropSection={handleDropSection}
                        draggedItem={draggedItem}
                        setDraggedItem={setDraggedItem}
                        dragOverItem={dragOverItem}
                        setDragOverItem={setDragOverItem}
                      />
                    )}
                  </div>
                </div>

                {/* Right Inspector Controls */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)]">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                        {activePageIndex === 'cover' && 'Cover & Certificate Details'}
                        {activePageIndex === 'index' && 'Table of Contents Settings'}
                        {typeof activePageIndex === 'number' && `Page ${activePageIndex + 1} Section Reordering`}
                      </h3>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]">
                        LIVE SYNC
                      </span>
                    </div>

                    {activePageIndex === 'cover' && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-bold text-[var(--text-secondary)]">Department</label>
                          <input
                            type="text"
                            value={template.department}
                            onChange={(e) => updateTemplateField('department', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-[var(--text-secondary)]">Semester</label>
                            <input
                              type="text"
                              value={template.semester}
                              onChange={(e) => updateTemplateField('semester', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="font-bold text-[var(--text-secondary)]">Academic Year</label>
                            <input
                              type="text"
                              value={template.academic_year}
                              onChange={(e) => updateTemplateField('academic_year', e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-bold text-[var(--text-secondary)]">Bonafide Certificate Statement</label>
                          <textarea
                            rows={3}
                            value={template.certificate_text}
                            placeholder="Leave blank for auto-generated standard text..."
                            onChange={(e) => updateTemplateField('certificate_text', e.target.value)}
                            className={textareaClass}
                          />
                        </div>
                      </div>
                    )}

                    {typeof activePageIndex === 'number' && template.experiments[activePageIndex] && (
                      <div className="space-y-3">
                        <div className="p-2.5 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold">Drag & Drop Any Component:</strong>
                            Grab the handles directly on the A4 page preview, or use the list controls below to reorder / send to last.
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {(template.experiments[activePageIndex].section_order || ['aim', 'procedure', 'code', 'output', 'result', 'signature']).map((sec, sIdx, arr) => (
                            <div key={sec} className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-between text-xs hover:border-[var(--border-strong)] transition-all">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3 h-3 text-[var(--text-muted)] cursor-grab" />
                                <span className="font-bold text-[var(--text-primary)] uppercase font-mono text-[11px]">
                                  {sIdx + 1}. {sec}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => moveSectionWithinExp(activePageIndex, sec, 'up')}
                                  disabled={sIdx === 0}
                                  title="Move block Up"
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-20 cursor-pointer"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveSectionWithinExp(activePageIndex, sec, 'down')}
                                  disabled={sIdx === arr.length - 1}
                                  title="Move block Down"
                                  className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-20 cursor-pointer"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveSectionWithinExp(activePageIndex, sec, 'last')}
                                  title="Move this block to the very LAST position"
                                  className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer text-[10px] font-mono"
                                >
                                  to-last
                                </button>
                                <button
                                  onClick={() => deleteSectionWithinExp(activePageIndex, sec)}
                                  title="Delete this block"
                                  className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Missing Block Dropdown */}
                        <div className="pt-2 border-t border-[var(--border)]">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">Add Block to Page:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {['aim', 'procedure', 'code', 'output', 'result', 'signature'].map(blockName => {
                              const existing = (template.experiments[activePageIndex].section_order || []).includes(blockName);
                              if (existing) return null;
                              return (
                                <button
                                  key={blockName}
                                  onClick={() => addSectionToExp(activePageIndex, blockName)}
                                  className="px-2 py-0.5 rounded bg-[var(--bg-input)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] border border-[var(--border)] text-[10px] font-bold uppercase cursor-pointer"
                                >
                                  + {blockName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 3: CONTINUOUS SCROLL VIEW                           */}
          {/* ========================================================= */}
          {viewMode === 'scroll' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <InteractiveA4Sheet pageType="cover" template={template} setTemplate={setTemplate} isLeft={false} />
              <InteractiveA4Sheet pageType="index" template={template} setTemplate={setTemplate} isLeft={false} />
              {template.experiments?.map((exp, idx) => (
                <InteractiveA4Sheet
                  key={idx}
                  pageType="exp"
                  exp={exp}
                  expIndex={idx}
                  template={template}
                  setTemplate={setTemplate}
                  isLeft={false}
                  onMoveSection={moveSectionWithinExp}
                  onDeleteSection={deleteSectionWithinExp}
                  onAddSection={addSectionToExp}
                  onDeletePage={handleDeletePage}
                  onDropSection={handleDropSection}
                  draggedItem={draggedItem}
                  setDraggedItem={setDraggedItem}
                  dragOverItem={dragOverItem}
                  setDragOverItem={setDragOverItem}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// INTERACTIVE A4 SHEET WITH COMPONENT TOOLBARS & INLINE EDITING
// -------------------------------------------------------------

function InteractiveA4Sheet({
  pageType,
  exp,
  expIndex,
  template,
  setTemplate,
  isLeft = false,
  onMoveSection,
  onDeleteSection,
  onAddSection,
  onDeletePage,
  onDropSection,
  draggedItem,
  setDraggedItem,
  dragOverItem,
  setDragOverItem
}) {
  // 1. Cover Page
  if (pageType === 'cover') {
    const deptStr = template.department?.toUpperCase() || 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE';
    const certText = template.certificate_text || `Certified that this is the bonafide record of practical work done by Mr./Ms. ${template.student_name || 'STUDENT NAME'} (Roll No: ${template.roll_no || '7376222AD145'}) of ${template.semester || 'Semester III'} in the ${template.course_title || 'Principles of Programming Laboratory'} (${template.course_code || '22AI304'}) Laboratory of Bannari Amman Institute of Technology during the academic year ${template.academic_year || '2025-2026'}.`;

    return (
      <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-xl p-5 sm:p-7 w-full relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-7 pl-4' : 'pl-7 pr-4'}`} style={{ aspectRatio: '1 / 1.414' }}>
        <div className="border border-slate-400 p-4 sm:p-6 h-full flex flex-col justify-between">
          <div className="text-center space-y-1.5">
            <img src="/BITlogo.png" alt="BIT Logo" className="max-h-12 mx-auto object-contain" />
            <div className="h-0.5 bg-slate-800 w-full my-1.5" />
            <h2 className="text-[11px] sm:text-[12px] font-black tracking-wider text-slate-800">{deptStr}</h2>
            <div className="bg-slate-100 border border-slate-300 py-0.5 px-3 my-1.5 text-center">
              <h3 className="text-[12px] sm:text-[13px] font-black tracking-widest text-slate-900">LABORATORY RECORD NOTEBOOK</h3>
            </div>
            <p className="text-[11px] sm:text-[12px] font-bold text-slate-900">{template.course_code} — {template.course_title?.toUpperCase()}</p>
            <p className="text-[10px] text-slate-600 font-medium italic">{template.degree} | {template.semester} | Academic Year: {template.academic_year}</p>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-3 rounded text-[11px] space-y-1 my-2">
            <div className="grid grid-cols-12"><span className="col-span-4 font-bold text-slate-700">STUDENT NAME</span><span className="col-span-8 font-semibold text-slate-900">: {template.student_name}</span></div>
            <div className="grid grid-cols-12"><span className="col-span-4 font-bold text-slate-700">ROLL / REG NO</span><span className="col-span-8 font-mono font-bold text-slate-900">: {template.roll_no}</span></div>
            <div className="grid grid-cols-12"><span className="col-span-4 font-bold text-slate-700">BRANCH / SECTION</span><span className="col-span-8 text-slate-900">: {template.branch_section || 'AIDS - A'}</span></div>
            <div className="grid grid-cols-12"><span className="col-span-4 font-bold text-slate-700">VERIFICATION ID</span><span className="col-span-8 font-mono font-bold text-emerald-700">: {template.verification_id}</span></div>
          </div>

          <div className="space-y-1.5 text-center my-2">
            <h4 className="text-[11px] sm:text-[12px] font-black tracking-widest text-slate-900 border-b border-slate-300 pb-0.5 inline-block">BONAFIDE CERTIFICATE</h4>
            <p className="text-[10.5px] sm:text-[11px] text-slate-700 text-justify leading-relaxed">{certText}</p>
          </div>

          <div className="pt-4 grid grid-cols-4 gap-1 text-center text-[9px] sm:text-[10px] font-bold text-slate-800">
            <div><div className="border-t border-slate-400 pt-0.5">{template.staff_incharge || 'Staff Incharge'}</div><div className="text-[8px] text-slate-500 italic">(Sign-off)</div></div>
            <div><div className="border-t border-slate-400 pt-0.5">{template.head_of_department || 'HOD'}</div><div className="text-[8px] text-slate-500 italic">(Seal)</div></div>
            <div><div className="border-t border-slate-400 pt-0.5">Internal</div><div className="text-[8px] text-slate-500 italic">(Eval)</div></div>
            <div><div className="border-t border-slate-400 pt-0.5">External</div><div className="text-[8px] text-slate-500 italic">(Eval)</div></div>
          </div>

          <div className="text-[8px] sm:text-[9px] text-slate-400 pt-1.5 border-t border-slate-200 flex justify-between">
            <span>Bannari Amman Institute of Technology</span>
            <span>Page 1 of {template.experiments?.length + 2}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Index Table Page
  if (pageType === 'index') {
    const totalMarks = template.experiments?.reduce((acc, curr) => acc + (curr.marks || 10), 0) || 0;
    const avg = template.experiments?.length > 0 ? (totalMarks / template.experiments.length).toFixed(1) : '10.0';

    return (
      <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-xl p-5 sm:p-7 w-full relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-7 pl-4' : 'pl-7 pr-4'}`} style={{ aspectRatio: '1 / 1.414' }}>
        <div className="border border-slate-400 p-4 sm:p-6 h-full flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold border-b border-slate-200 pb-0.5">
              <span>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</span>
              <span>{template.course_code} — PRACTICAL LAB RECORD</span>
            </div>
            <div className="text-center py-1">
              <h3 className="text-[12px] sm:text-[13px] font-black tracking-widest text-slate-900">INDEX OF EXPERIMENTS</h3>
              <p className="text-[10px] text-slate-500 font-medium">Curriculum Task List & Evaluation Roster</p>
            </div>

            <table className="w-full border-collapse text-[10px] sm:text-[10.5px] border border-slate-400 mt-2">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                  <th className="p-1.5 text-center border-r border-slate-400 w-10">EX</th>
                  <th className="p-1.5 text-center border-r border-slate-400 w-20">DATE</th>
                  <th className="p-1.5 text-left border-r border-slate-400">TITLE OF THE EXPERIMENT</th>
                  <th className="p-1.5 text-center border-r border-slate-400 w-16">MARKS</th>
                  <th className="p-1.5 text-center w-20">SIGN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {template.experiments?.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-300">
                      {String(e.experiment_no || idx + 1).padStart(2, '0')}
                    </td>
                    <td className="p-1.5 text-center text-slate-600 border-r border-slate-300">{e.date || '22-09-2026'}</td>
                    <td className="p-1.5 font-medium text-slate-900 border-r border-slate-300">{e.title}</td>
                    <td className="p-1.5 text-center font-bold text-slate-900 border-r border-slate-300">{e.marks || 10} / 10</td>
                    <td className="p-1.5 text-center font-bold text-emerald-700 text-[9px]">VERIFIED</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                  <td colSpan={3} className="p-1.5 text-right border-r border-slate-400 uppercase text-[9px]">Total Average Score :</td>
                  <td className="p-1.5 text-center text-slate-900 border-r border-slate-400 font-black">{avg} / 10</td>
                  <td className="p-1.5 text-center text-slate-600 font-mono text-[9px]">SEALED</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[8px] sm:text-[9px] text-slate-400 pt-1.5 border-t border-slate-200 flex justify-between">
            <span>Bannari Amman Institute of Technology</span>
            <span>Page 2 of {template.experiments?.length + 2}</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Experiment / Custom Page with Component Level Controls & Drag Drop
  const codeLines = (exp.submitted_code || '').split('\n');
  const pType = exp.page_type || 'experiment';
  const order = exp.section_order || ['aim', 'procedure', 'code', 'output', 'result', 'signature'];

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-xl p-5 sm:p-7 w-full relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-7 pl-4' : 'pl-7 pr-4'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-4 sm:p-6 h-full flex flex-col justify-between space-y-2.5">
        <div className="space-y-2">
          {/* Header & Delete Page Button */}
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold border-b border-slate-200 pb-0.5">
            <span>BIT — {template.course_code}</span>
            <div className="flex items-center gap-2">
              <span>Student: {template.student_name} ({template.roll_no})</span>
              {onDeletePage && (
                <button
                  onClick={() => onDeletePage(expIndex)}
                  title="Delete this sheet from manual"
                  className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-[8px] font-bold cursor-pointer transition-all"
                >
                  Delete Page
                </button>
              )}
            </div>
          </div>

          {/* Title Bar */}
          <div className="bg-slate-100 border border-slate-400 p-1.5 text-left font-black text-[11px] sm:text-[11.5px] text-slate-900 flex items-center justify-between">
            <span>EX NO: {String(exp.experiment_no).padStart(2, '0')} — {exp.title?.toUpperCase()}</span>
            <span className="text-[9px] font-normal font-mono text-slate-600">{exp.date || '22-09-2026'}</span>
          </div>

          {/* OBSERVATION OR VIVA SHEET */}
          {pType === 'observation' ? (
            <div className="space-y-2">
              {exp.notes && <p className="text-[10px] text-slate-600 p-1.5 bg-slate-50 border border-slate-200 rounded">{exp.notes}</p>}
              <div className="space-y-4 pt-2">
                {Array.from({ length: 14 }).map((_, lIdx) => (
                  <div key={lIdx} className="border-b border-slate-200 h-1.5" />
                ))}
              </div>
            </div>
          ) : pType === 'viva' ? (
            <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-2 text-[10.5px] text-slate-800">
              <p className="whitespace-pre-line leading-relaxed">{exp.notes || '1. Explain your algorithm logic.\n2. What are the key edge test cases?'}</p>
            </div>
          ) : (
            /* MODULAR COMPONENT BLOCKS ACCORDING TO SECTION ORDER */
            <div className="space-y-1.5">
              {order.map((secName) => {
                const commonProps = {
                  expIndex,
                  secName,
                  onMove: onMoveSection,
                  onDelete: onDeleteSection,
                  onDropSection,
                  draggedItem,
                  setDraggedItem,
                  dragOverItem,
                  setDragOverItem
                };

                switch (secName) {
                  case 'aim':
                    return (
                      <ComponentBlockWrapper
                        key="aim"
                        title="AIM"
                        {...commonProps}
                      >
                        <p className="text-[10px] sm:text-[10.5px] text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-400">
                          {exp.aim || `To design and implement a program for ${exp.title}.`}
                        </p>
                      </ComponentBlockWrapper>
                    );
                  case 'procedure':
                    return exp.procedure ? (
                      <ComponentBlockWrapper
                        key="procedure"
                        title="PROCEDURE / ALGORITHM"
                        {...commonProps}
                      >
                        <p className="text-[9.5px] sm:text-[10px] text-slate-700 whitespace-pre-line leading-relaxed pl-2 border-l-2 border-slate-400">
                          {exp.procedure}
                        </p>
                      </ComponentBlockWrapper>
                    ) : null;
                  case 'code':
                    return (
                      <ComponentBlockWrapper
                        key="code"
                        title={`VERIFIED SOURCE CODE (${exp.language?.toUpperCase() || 'PYTHON 3'})`}
                        {...commonProps}
                      >
                        <div className="bg-slate-900 text-slate-100 p-2 rounded font-mono text-[9px] sm:text-[9.5px] leading-snug overflow-x-auto border border-slate-700 max-h-48">
                          {codeLines.map((line, lIdx) => (
                            <div key={lIdx} className="flex">
                              <span className="text-slate-500 w-6 select-none text-right pr-2">{lIdx + 1}</span>
                              <span className="text-slate-200">{line}</span>
                            </div>
                          ))}
                        </div>
                      </ComponentBlockWrapper>
                    );
                  case 'output':
                    return (
                      <ComponentBlockWrapper
                        key="output"
                        title="EXECUTION OUTPUT & TEST VERIFICATION"
                        {...commonProps}
                      >
                        <div className="bg-emerald-50 border border-emerald-300 p-1.5 rounded text-[9.5px] font-mono text-emerald-900 space-y-0.5">
                          <div className="font-bold text-emerald-800">
                            ✓ [PASS] Status: VERIFIED | Hidden Test Cases: {exp.pass_count || 3} / {exp.total_test_cases || 3} | Marks: {exp.marks || 10} / 10
                          </div>
                          <div className="text-slate-700 pl-1.5 border-l-2 border-emerald-400 text-[9px]">
                            [CONSOLE]: {exp.execution_output || `All test cases passed for '${exp.title}'.`}
                          </div>
                        </div>
                      </ComponentBlockWrapper>
                    );
                  case 'result':
                    return (
                      <ComponentBlockWrapper
                        key="result"
                        title="RESULT"
                        {...commonProps}
                      >
                        <p className="text-[10px] sm:text-[10.5px] text-slate-700 italic pl-2 border-l-2 border-slate-400">
                          {exp.result_text || `Thus the program for '${exp.title}' was successfully developed, executed, tested against all verification test cases, and evaluated.`}
                        </p>
                      </ComponentBlockWrapper>
                    );
                  case 'signature':
                    return (
                      <ComponentBlockWrapper
                        key="signature"
                        title="STAFF SIGNATURE & EVALUATION"
                        {...commonProps}
                      >
                        <div className="grid grid-cols-3 gap-2 border border-slate-400 p-1.5 text-center text-[9px] sm:text-[9.5px] font-bold bg-slate-50">
                          <div>Date: {exp.date || '22-09-2026'}</div>
                          <div>Marks: {exp.marks || 10} / 10</div>
                          <div className="text-emerald-700">Staff Sign: VERIFIED [DIGITAL]</div>
                        </div>
                      </ComponentBlockWrapper>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>

        <div className="text-center text-[8px] sm:text-[9px] text-slate-400 pt-1 border-t border-slate-200">
          Experiment {exp.experiment_no} · Bannari Amman Institute of Technology
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENT BLOCK WRAPPER WITH FLUID DRAG & DROP + HOVER ACTIONS
// -------------------------------------------------------------

function ComponentBlockWrapper({
  title,
  expIndex,
  secName,
  onMove,
  onDelete,
  onDropSection,
  draggedItem,
  setDraggedItem,
  dragOverItem,
  setDragOverItem,
  children
}) {
  const isDragging = draggedItem?.expIndex === expIndex && draggedItem?.secName === secName;
  const isDragOver = dragOverItem?.expIndex === expIndex && dragOverItem?.secName === secName && !isDragging;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ expIndex, secName }));
    e.dataTransfer.effectAllowed = 'move';
    if (setDraggedItem) {
      setDraggedItem({ expIndex, secName });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (setDragOverItem && draggedItem && (draggedItem.secName !== secName || draggedItem.expIndex !== expIndex)) {
      setDragOverItem({ expIndex, secName });
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (onDropSection && draggedItem) {
      onDropSection(expIndex, draggedItem.secName, secName);
    }
    if (setDraggedItem) setDraggedItem(null);
    if (setDragOverItem) setDragOverItem(null);
  };

  const handleDragEnd = () => {
    if (setDraggedItem) setDraggedItem(null);
    if (setDragOverItem) setDragOverItem(null);
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`group relative rounded p-1 transition-all duration-150 select-none ${
        isDragging
          ? 'opacity-40 border-2 border-dashed border-indigo-500 bg-indigo-50/50 scale-[0.98]'
          : isDragOver
          ? 'border-2 border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-400/60 shadow-lg -translate-y-0.5'
          : 'border border-transparent hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      {/* Drop indicator bar */}
      {isDragOver && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-indigo-600 rounded-full shadow z-30 animate-pulse" />
      )}

      {/* Title Bar & Drag Handle */}
      <div className="flex items-center justify-between mb-0.5 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1">
          <span
            title="Drag and drop to place this section anywhere"
            className="text-slate-400 group-hover:text-indigo-600 transition-colors cursor-grab active:cursor-grabbing p-0.5"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <h5 className="text-[10px] sm:text-[10.5px] font-bold text-slate-800 uppercase tracking-wider">
            {title}
          </h5>
        </div>

        {/* Action Controls on Hover */}
        {onMove && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] transition-all z-20 shadow-sm">
            <button
              onClick={(e) => { e.stopPropagation(); onMove(expIndex, secName, 'up'); }}
              title="Move this block UP"
              className="hover:text-[var(--accent)] p-0.5 cursor-pointer"
            >
              <ArrowUp className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMove(expIndex, secName, 'down'); }}
              title="Move this block DOWN"
              className="hover:text-[var(--accent)] p-0.5 cursor-pointer"
            >
              <ArrowDown className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMove(expIndex, secName, 'last'); }}
              title="Move this block to the very LAST position of the page"
              className="hover:text-[var(--accent)] p-0.5 cursor-pointer text-[8px] font-mono"
            >
              to-last
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(expIndex, secName); }}
                title="Delete this block"
                className="hover:text-rose-400 p-0.5 cursor-pointer"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="cursor-default select-text">
        {children}
      </div>
    </div>
  );
}

