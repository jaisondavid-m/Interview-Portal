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

  // Active view mode: 'designer' | 'preview_all'
  const [viewMode, setViewMode] = useState('designer');
  // Active page focused in designer: 'cover' | 'index' | number (1..N)
  const [activePage, setActivePage] = useState('cover');

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
        setTemplate(res.template);
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
      const res = await api.post(`/admin/labs/courses/${selectedCourseId}/pdf-template`, template);
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
      const response = await api.post('/admin/labs/record-pdf/custom', template, {
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
    } catch (err) {
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
              Official Curriculum Blueprint
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--accent)]" />
              Lab Record PDF Designer & Template Manager
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Review and customize the full multi-page visual layout covering all experiments for this lab course.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Course Selector Dropdown */}
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
          {/* Navigation Bar for Pages */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">
                Pages:
              </span>

              {/* Cover Button */}
              <button
                onClick={() => { setActivePage('cover'); setViewMode('designer'); }}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePage === 'cover' && viewMode === 'designer'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Cover & Bonafide
              </button>

              {/* Index Button */}
              <button
                onClick={() => { setActivePage('index'); setViewMode('designer'); }}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePage === 'index' && viewMode === 'designer'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Table of Contents (Index)
              </button>

              {/* Experiment Pages Buttons */}
              {template.experiments?.map((exp, idx) => (
                <button
                  key={exp.experiment_no || idx}
                  onClick={() => { setActivePage(idx); setViewMode('designer'); }}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePage === idx && viewMode === 'designer'
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  <span className="font-mono text-[10px]">Ex {String(exp.experiment_no || idx + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
              <button
                onClick={() => setViewMode('designer')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'designer'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Page Focus View
              </button>
              <button
                onClick={() => setViewMode('preview_all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'preview_all'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                View All Sheets (Scroll)
              </button>
            </div>
          </div>

          {/* MAIN WORKSPACE: 2-Column Split (Left: Live Visual A4 Sheet, Right: Editor Controls) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Visual A4 Sheet Preview (Span 7) */}
            <div className={`${viewMode === 'preview_all' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
              {/* RENDER SHEET CONTENT */}
              {viewMode === 'preview_all' ? (
                // Continuous Scroll View of All Sheets
                <div className="space-y-8">
                  <div className="p-2 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Full Laboratory Record Manual Layout ({template.experiments?.length + 2} Total Pages)
                  </div>
                  <A4CoverPage template={template} />
                  <A4IndexPage template={template} />
                  {template.experiments?.map((exp, idx) => (
                    <A4ExperimentPage key={idx} exp={exp} template={template} />
                  ))}
                </div>
              ) : (
                // Focused Single Page View
                <div>
                  {activePage === 'cover' && <A4CoverPage template={template} />}
                  {activePage === 'index' && <A4IndexPage template={template} />}
                  {typeof activePage === 'number' && template.experiments[activePage] && (
                    <A4ExperimentPage exp={template.experiments[activePage]} template={template} />
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Interactive Editor & Inspector Panel (Span 5) */}
            {viewMode === 'designer' && (
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                      {activePage === 'cover' && 'Cover & Certificate Editor'}
                      {activePage === 'index' && 'Index Table Settings'}
                      {typeof activePage === 'number' && `Experiment ${template.experiments[activePage]?.experiment_no} Content`}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]">
                      LIVE SYNC
                    </span>
                  </div>

                  {/* 1. COVER PAGE EDITOR */}
                  {activePage === 'cover' && (
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
                        <label className="text-[11px] font-bold text-[var(--text-secondary)]">Custom Bonafide Certificate Text</label>
                        <textarea
                          rows={4}
                          value={template.certificate_text}
                          placeholder="Leave blank for auto-generated standard text..."
                          onChange={(e) => updateTemplateField('certificate_text', e.target.value)}
                          className={textareaClass}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-[var(--text-secondary)]">Staff Incharge Title</label>
                          <input
                            type="text"
                            value={template.staff_incharge}
                            onChange={(e) => updateTemplateField('staff_incharge', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[var(--text-secondary)]">HOD Title</label>
                          <input
                            type="text"
                            value={template.head_of_department}
                            onChange={(e) => updateTemplateField('head_of_department', e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. INDEX TABLE EDITOR */}
                  {activePage === 'index' && (
                    <div className="space-y-4">
                      <p className="text-xs text-[var(--text-secondary)]">
                        The Index page automatically enumerates all {template.experiments?.length} experiments in the curriculum with standard dates and marks evaluation:
                      </p>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {template.experiments?.map((exp, idx) => (
                          <div key={idx} className="p-2.5 rounded bg-[var(--bg-input)] border border-[var(--border)] space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-[var(--accent)] font-mono">Ex {exp.experiment_no}</span>
                              <span className="text-[var(--text-muted)] text-[11px]">{exp.marks || 10} Marks</span>
                            </div>
                            <input
                              type="text"
                              value={exp.title}
                              onChange={(e) => updateExperimentField(idx, 'title', e.target.value)}
                              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] font-semibold"
                            />
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <label className="text-[10px] text-[var(--text-muted)]">Default Date</label>
                                <input
                                  type="text"
                                  value={exp.date || ''}
                                  placeholder="DD-MM-YYYY"
                                  onChange={(e) => updateExperimentField(idx, 'date', e.target.value)}
                                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--text-muted)]">Max Marks</label>
                                <input
                                  type="number"
                                  value={exp.marks || 10}
                                  onChange={(e) => updateExperimentField(idx, 'marks', parseInt(e.target.value) || 10)}
                                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. PER-EXPERIMENT EDITOR */}
                  {typeof activePage === 'number' && template.experiments[activePage] && (
                    <div className="space-y-3.5">
                      {(() => {
                        const exp = template.experiments[activePage];
                        const idx = activePage;
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
                                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Experiment Title</label>
                                <input
                                  type="text"
                                  value={exp.title}
                                  onChange={(e) => updateExperimentField(idx, 'title', e.target.value)}
                                  className={inputClass}
                                />
                              </div>
                            </div>

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
                              <label className="text-[11px] font-bold text-[var(--text-secondary)]">Procedure / Step-by-step Algorithm</label>
                              <textarea
                                rows={3}
                                value={exp.procedure}
                                onChange={(e) => updateExperimentField(idx, 'procedure', e.target.value)}
                                className={textareaClass}
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Default Solution Code</label>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">Python 3</span>
                              </div>
                              <textarea
                                rows={6}
                                value={exp.submitted_code}
                                onChange={(e) => updateExperimentField(idx, 'submitted_code', e.target.value)}
                                className="w-full bg-slate-900 text-slate-100 font-mono text-[11px] p-2.5 rounded border border-slate-700 focus:outline-none focus:border-[var(--accent)] resize-y"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-[var(--text-secondary)]">Expected Execution Output</label>
                              <textarea
                                rows={2}
                                value={exp.execution_output}
                                onChange={(e) => updateExperimentField(idx, 'execution_output', e.target.value)}
                                className="w-full bg-slate-900 text-emerald-400 font-mono text-[11px] p-2.5 rounded border border-slate-700 focus:outline-none focus:border-[var(--accent)] resize-y"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-[var(--text-secondary)]">Result Conclusion Statement</label>
                              <textarea
                                rows={2}
                                value={exp.result_text}
                                onChange={(e) => updateExperimentField(idx, 'result_text', e.target.value)}
                                className={textareaClass}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Save Button in Panel */}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// VISUAL A4 SHEET SUB-COMPONENTS (REALISTIC UNIVERSITY STYLING)
// -------------------------------------------------------------

function A4CoverPage({ template }) {
  const deptStr = template.department?.toUpperCase() || 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE';
  const certText = template.certificate_text || `Certified that this is the bonafide record of practical work done by Mr./Ms. ${template.student_name || 'STUDENT NAME'} (Roll No: ${template.roll_no || '7376222AD145'}) of ${template.semester || 'Semester III'} in the ${template.course_title || 'Principles of Programming Laboratory'} (${template.course_code || '22AI304'}) Laboratory of Bannari Amman Institute of Technology during the academic year ${template.academic_year || '2025-2026'}.`;

  return (
    <div className="bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-8 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between" style={{ aspectRatio: '1 / 1.414' }}>
      {/* Outer Inner Double Border */}
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
        <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200">
          Page 1 of {template.experiments?.length + 2} · Bannari Amman Institute of Technology
        </div>
      </div>
    </div>
  );
}

function A4IndexPage({ template }) {
  const totalMarks = template.experiments?.reduce((acc, curr) => acc + (curr.marks || 10), 0) || 0;
  const avg = template.experiments?.length > 0 ? (totalMarks / template.experiments.length).toFixed(1) : '10.0';

  return (
    <div className="bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-8 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between" style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between">
        {/* Header */}
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

          {/* Table */}
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
              {/* Summary Row */}
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

        {/* Page Footer */}
        <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200">
          Page 2 of {template.experiments?.length + 2} · Bannari Amman Institute of Technology
        </div>
      </div>
    </div>
  );
}

function A4ExperimentPage({ exp, template }) {
  const codeLines = (exp.submitted_code || '').split('\n');

  return (
    <div className="bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-8 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between" style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span>BIT — {template.course_code}</span>
            <span>Student: {template.student_name} ({template.roll_no})</span>
          </div>

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
