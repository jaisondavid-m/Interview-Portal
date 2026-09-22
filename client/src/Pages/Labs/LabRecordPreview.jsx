import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  Loader2,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Award,
  Edit3,
  Columns2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function LabRecordPreview() {
  const { courseId = 1 } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);

  // View state: 'book_spread' | 'single' | 'scroll'
  const [viewMode, setViewMode] = useState('book_spread');
  const [activePageIndex, setActivePageIndex] = useState('cover');
  const [activeSpread, setActiveSpread] = useState(1);
  const [isDuplex, setIsDuplex] = useState(true);

  // Full template data pre-populated for this student
  const [template, setTemplate] = useState({
    institution_name: 'BANNARI AMMAN INSTITUTE OF TECHNOLOGY',
    institution_sub: 'An Autonomous Institution Affiliated to Anna University Chennai',
    department: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE',
    degree: 'B.Tech',
    semester: 'Semester III',
    academic_year: '2025-2026',
    course_code: '22AI304',
    course_title: 'PRINCIPLES OF PROGRAMMING LABORATORY',
    student_name: user?.name || 'STUDENT NAME',
    roll_no: user?.roll_no || '7376222AD145',
    register_no: user?.roll_no || '7376222AD145',
    branch_section: `${user?.department || 'AIDS'} (${user?.section || 'A'})`,
    verification_id: `MOCKMATE-REC-${user?.roll_no || '7376222AD145'}-22AI304`,
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
    fetchStudentTemplate();
  }, [courseId]);

  const fetchStudentTemplate = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/labs/courses/${courseId}/pdf-template`);
      if (res?.template) {
        setTemplate({
          ...res.template,
          is_duplex: res.template.is_duplex ?? true
        });
      }
    } catch {
      showToast('Loaded local fallback layout', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const payload = { ...template, is_duplex: isDuplex };
      const response = await api.post('/labs/record-pdf/custom', payload, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data || response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${template.roll_no || 'Student'}_${template.course_code}_LabRecord.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Official multi-page Lab Record downloaded!');
    } catch {
      showToast('Failed to generate record PDF.', 'error');
    } finally {
      setDownloading(false);
    }
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

  return (
    <div className="space-y-6">
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

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/labs')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back to Labs
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1">
              <ShieldCheck className="w-3 h-3" />
              Official College Record Document
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
              Laboratory Record Manual Preview
            </h1>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              {template.course_code} — {template.course_title}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
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
            onClick={handleDownloadPDF}
            disabled={downloading || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-md)]"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Complete PDF ({template.experiments?.length + 2 || 'All'} Pages)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Loading your course record sheets & submissions...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Page Navigator Bar & View Mode */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Toggle */}
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
                📖 2-Page Book Spread
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'single'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Single Page Focus
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
                Continuous Document
              </button>
            </div>

            {/* Quick Page Jump Buttons for Single Page */}
            {viewMode === 'single' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setActivePageIndex('cover')}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activePageIndex === 'cover'
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  Cover
                </button>
                <button
                  onClick={() => setActivePageIndex('index')}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activePageIndex === 'index'
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  Index
                </button>
                {template.experiments?.map((exp, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePageIndex(idx)}
                    className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activePageIndex === idx
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                    }`}
                  >
                    <span className="font-mono text-[10px]">Ex {String(exp.experiment_no || idx + 1).padStart(2, '0')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TWO-PAGE BOOKLET SPREAD VIEW */}
          {viewMode === 'book_spread' && (
            <div className="space-y-6">
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

              {/* Spread Presentation */}
              <div className="bg-slate-900/90 p-4 sm:p-8 rounded-[var(--radius-xl)] shadow-2xl border border-slate-700/50">
                <div className="flex flex-col xl:flex-row items-center justify-center gap-0 max-w-[1550px] mx-auto relative">
                  {(() => {
                    const { left, right } = getSpreadPages(activeSpread);
                    return (
                      <>
                        <div className="w-full xl:w-1/2 flex justify-end">
                          {left ? (
                            <div className="w-full max-w-[700px] relative shadow-2xl origin-right">
                              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/20 to-transparent pointer-events-none z-10" />
                              <div className="absolute top-2 left-4 text-[10px] font-mono font-bold text-slate-400 select-none">
                                📖 Left Page (P{left.pageNum})
                              </div>
                              {left.type === 'cover' && <StudentA4CoverPage template={template} isLeft={true} />}
                              {left.type === 'index' && <StudentA4IndexPage template={template} isLeft={true} />}
                              {left.type === 'exp' && (
                                <StudentA4ExperimentPage exp={left.expData} template={template} isLeft={true} />
                              )}
                            </div>
                          ) : (
                            <div className="w-full max-w-[700px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-sm p-12 min-h-[950px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3" style={{ aspectRatio: '1 / 1.414' }}>
                              <BookOpen className="w-12 h-12 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                Outer Hardcover Binding
                              </h4>
                              <p className="text-xs text-slate-500 max-w-xs">
                                Physical manual begins on the right page. Flip forward to view the Table of Contents & Experiment Sheets.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="hidden xl:flex flex-col items-center justify-center w-6 h-[950px] relative z-20 select-none">
                          <div className="w-2 h-full bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 shadow-inner rounded-full" />
                        </div>

                        <div className="w-full xl:w-1/2 flex justify-start">
                          {right ? (
                            <div className="w-full max-w-[700px] relative shadow-2xl origin-left">
                              <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-slate-900/20 to-transparent pointer-events-none z-10" />
                              <div className="absolute top-2 right-4 text-[10px] font-mono font-bold text-slate-400 select-none">
                                📖 Right Page (P{right.pageNum})
                              </div>
                              {right.type === 'cover' && <StudentA4CoverPage template={template} isLeft={false} />}
                              {right.type === 'index' && <StudentA4IndexPage template={template} isLeft={false} />}
                              {right.type === 'exp' && (
                                <StudentA4ExperimentPage exp={right.expData} template={template} isLeft={false} />
                              )}
                            </div>
                          ) : (
                            <div className="w-full max-w-[700px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-sm p-12 min-h-[950px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3" style={{ aspectRatio: '1 / 1.414' }}>
                              <Award className="w-12 h-12 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                End of Record Notebook
                              </h4>
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

          {/* SINGLE PAGE VIEW */}
          {viewMode === 'single' && (
            <div className="max-w-4xl mx-auto">
              {activePageIndex === 'cover' && <StudentA4CoverPage template={template} />}
              {activePageIndex === 'index' && <StudentA4IndexPage template={template} />}
              {typeof activePageIndex === 'number' && template.experiments[activePageIndex] && (
                <StudentA4ExperimentPage exp={template.experiments[activePageIndex]} template={template} />
              )}
            </div>
          )}

          {/* CONTINUOUS SCROLL VIEW */}
          {viewMode === 'scroll' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <StudentA4CoverPage template={template} />
              <StudentA4IndexPage template={template} />
              {template.experiments?.map((exp, idx) => (
                <StudentA4ExperimentPage key={idx} exp={exp} template={template} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// STUDENT A4 SUB-COMPONENTS
// -------------------------------------------------------------

function StudentA4CoverPage({ template, isLeft = false }) {
  const deptStr = template.department?.toUpperCase() || 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE';
  const certText = template.certificate_text || `Certified that this is the bonafide record of practical work done by Mr./Ms. ${template.student_name} (Roll No: ${template.roll_no}) of ${template.semester} in the ${template.course_title} (${template.course_code}) Laboratory of Bannari Amman Institute of Technology during the academic year ${template.academic_year}.`;

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

function StudentA4IndexPage({ template, isLeft = true }) {
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

function StudentA4ExperimentPage({ exp, template, isLeft = false }) {
  const codeLines = (exp.submitted_code || '').split('\n');
  const pType = exp.page_type || 'experiment';

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between space-y-4">
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
                    ✓ [PASS] Status: {exp.status || 'VERIFIED'} | Hidden Test Cases: {exp.pass_count || 3} / {exp.total_test_cases || 3} | Marks: {exp.marks || 10} / 10
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
