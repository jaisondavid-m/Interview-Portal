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
  Columns2,
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
  const [activePageIndex, setActivePageIndex] = useState(0);
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

  // Build full academic page sequence:
  // Page 1: Cover (Right)
  // Page 2: Index (Left)
  // For each experiment:
  // - Part 1: Source Code & Output (Left Page)
  // - Part 2: Title, Aim, Algorithm (Right Page)
  // - Part 3: Marks Table first, then Result (Last Page)
  const allBookPages = [
    { type: 'cover', title: 'Cover & Bonafide Certificate', pageNum: 1, isLeft: false },
    { type: 'index', title: 'Index / Table of Contents', pageNum: 2, isLeft: true },
  ];

  let curPageNum = 3;
  template.experiments?.forEach((exp) => {
    // 1. Left page: Code & Output
    allBookPages.push({
      type: 'exp_code_output',
      expData: exp,
      title: `Ex ${exp.experiment_no}: Verified Code & Output`,
      pageNum: curPageNum++,
      isLeft: true,
    });
    // 2. Right page: Aim & Algorithm
    allBookPages.push({
      type: 'exp_aim_algorithm',
      expData: exp,
      title: `Ex ${exp.experiment_no}: Specification & Algorithm`,
      pageNum: curPageNum++,
      isLeft: false,
    });
    // 3. Last page: Marks Table first, then Result
    allBookPages.push({
      type: 'exp_rubric_result',
      expData: exp,
      title: `Ex ${exp.experiment_no}: Rubric & Result`,
      pageNum: curPageNum++,
      isLeft: false,
    });
  });

  const totalSpreads = Math.ceil(allBookPages.length / 2);
  const getSpreadPages = (spreadIdx) => {
    if (spreadIdx === 0) {
      return { left: null, right: allBookPages[0] };
    }
    const leftPage = allBookPages[spreadIdx * 2 - 1] || null;
    const rightPage = allBookPages[spreadIdx * 2] || null;
    return { left: leftPage, right: rightPage };
  };

  const renderPageContent = (page) => {
    if (!page) return null;
    if (page.type === 'cover') return <StudentA4CoverPage template={template} isLeft={page.isLeft} />;
    if (page.type === 'index') return <StudentA4IndexPage template={template} isLeft={page.isLeft} />;
    if (page.type === 'exp_code_output') return <StudentA4CodeOutputPage exp={page.expData} template={template} isLeft={page.isLeft} pageNum={page.pageNum} totalPages={allBookPages.length} />;
    if (page.type === 'exp_aim_algorithm') return <StudentA4AimAlgoPage exp={page.expData} template={template} isLeft={page.isLeft} pageNum={page.pageNum} totalPages={allBookPages.length} />;
    if (page.type === 'exp_rubric_result') return <StudentA4RubricResultPage exp={page.expData} template={template} isLeft={page.isLeft} pageNum={page.pageNum} totalPages={allBookPages.length} />;
    return null;
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
            Download Complete PDF ({allBookPages.length} Pages)
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
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-xl custom-scrollbar">
                {allBookPages.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePageIndex(idx)}
                    className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                      activePageIndex === idx
                        ? 'bg-[var(--accent)] text-white font-bold'
                        : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                    }`}
                  >
                    P{p.pageNum}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TWO PAGE BOOK SPREAD VIEW */}
          {viewMode === 'book_spread' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Columns2 className="w-4 h-4 text-[var(--accent)]" />
                  Spread {activeSpread} of {totalSpreads - 1 || 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeSpread <= 1}
                    onClick={() => setActiveSpread((s) => Math.max(1, s - 1))}
                    className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold hover:border-[var(--border-accent)] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    &larr; Previous Spread
                  </button>
                  <button
                    disabled={activeSpread >= totalSpreads - 1}
                    onClick={() => setActiveSpread((s) => Math.min(totalSpreads - 1, s + 1))}
                    className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold hover:border-[var(--border-accent)] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    Next Spread &rarr;
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-[var(--radius-lg)] p-6 shadow-2xl border border-slate-700/60 overflow-x-auto">
                <div className="min-w-[1250px] flex items-stretch justify-center gap-5">
                  {(() => {
                    const { left, right } = getSpreadPages(activeSpread);
                    return (
                      <>
                        {/* Left Page */}
                        <div className="w-1/2 flex flex-col items-center">
                          <div className="text-[11px] font-mono font-bold text-slate-400 mb-2">
                            {left ? `📘 Left Page (P${left.pageNum}) — ${left.title}` : '📘 Left Page'}
                          </div>
                          {left ? renderPageContent(left) : (
                            <div className="w-full max-w-[700px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-sm p-12 min-h-[950px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3" style={{ aspectRatio: '1 / 1.414' }}>
                              <BookOpen className="w-12 h-12 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Inside Front Cover</h4>
                            </div>
                          )}
                        </div>

                        {/* Right Page */}
                        <div className="w-1/2 flex flex-col items-center">
                          <div className="text-[11px] font-mono font-bold text-slate-400 mb-2">
                            {right ? `📖 Right Page (P${right.pageNum}) — ${right.title}` : '📖 Right Page'}
                          </div>
                          {right ? renderPageContent(right) : (
                            <div className="w-full max-w-[700px] bg-slate-800 border-2 border-dashed border-slate-700 rounded-sm p-12 min-h-[950px] flex flex-col items-center justify-center text-center text-slate-500 space-y-3" style={{ aspectRatio: '1 / 1.414' }}>
                              <Award className="w-12 h-12 text-slate-600" />
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">End of Record Notebook</h4>
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
              {renderPageContent(allBookPages[activePageIndex])}
            </div>
          )}

          {/* CONTINUOUS SCROLL VIEW */}
          {viewMode === 'scroll' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              {allBookPages.map((page, idx) => (
                <div key={idx}>
                  {renderPageContent(page)}
                </div>
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
          <span>Page 1</span>
        </div>
      </div>
    </div>
  );
}

function StudentA4IndexPage({ template, isLeft = true }) {
  const totalMarks = template.experiments?.reduce((acc, curr) => acc + (curr.marks || 100), 0) || 0;
  const avg = template.experiments?.length > 0 ? (totalMarks / template.experiments.length).toFixed(1) : '100.0';

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
                    {exp.marks || 100} / 100
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
                  {avg} / 100
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
          <span>Page 2</span>
        </div>
      </div>
    </div>
  );
}

// 1. LEFT PAGE: STRICTLY CODE & EXECUTION OUTPUT ONLY (Full code without scrollbars)
function StudentA4CodeOutputPage({ exp, template, isLeft = true, pageNum, totalPages }) {
  const codeLines = (exp.submitted_code || '').split('\n');

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span>EX NO: {String(exp.experiment_no).padStart(2, '0')} — VERIFIED SOURCE CODE & EXECUTION</span>
            <span>Student: {template.student_name} ({template.roll_no})</span>
          </div>

          {/* 1. SOURCE CODE (Full Lines Displayed Without Scrollbars) */}
          <div className="space-y-1.5">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              VERIFIED SOURCE CODE ({exp.language?.toUpperCase() || 'PYTHON'}):
            </h5>
            <div className="bg-slate-50 text-slate-900 p-3 rounded font-mono text-[10px] leading-relaxed border border-slate-300">
              {codeLines.map((line, lIdx) => (
                <div key={lIdx} className="flex leading-normal">
                  <span className="text-slate-400 w-8 select-none text-right pr-3 shrink-0 font-semibold">{lIdx + 1} |</span>
                  <span className="text-slate-900 whitespace-pre-wrap break-all">{line || ' '}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. EXECUTION OUTPUT & TEST VERIFICATION */}
          <div className="space-y-1.5 pt-2">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              EXECUTION OUTPUT & TEST VERIFICATION:
            </h5>
            <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded text-[10.5px] font-mono text-emerald-900 space-y-1.5">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <span>✓ [PASS] Status: {exp.status || 'VERIFIED'}</span>
                <span>| Hidden Benchmark Cases: {exp.pass_count || 2} / {exp.total_test_cases || 2} Passed</span>
              </div>
              <div className="text-slate-800 pl-2 border-l-2 border-emerald-400 bg-white/70 p-1.5 rounded">
                [CONSOLE]: {exp.execution_output || `All benchmark test cases executed with 0 runtime errors. Solution verified.`}
              </div>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
          <span>Bannari Amman Institute of Technology</span>
          <span>Page {pageNum} of {totalPages}</span>
        </div>
      </div>
    </div>
  );
}

// 2. RIGHT PAGE: SPECIFICATION, AIM & ALGORITHM
function StudentA4AimAlgoPage({ exp, template, isLeft = false, pageNum, totalPages }) {
  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span>BIT — {template.course_code}</span>
            <span>Student: {template.student_name} ({template.roll_no})</span>
          </div>

          <div className="bg-slate-100 border border-slate-400 p-2.5 text-left font-black text-[12px] text-slate-900 flex items-center justify-between">
            <span>EX NO: {String(exp.experiment_no).padStart(2, '0')} — {exp.title?.toUpperCase()}</span>
            <span className="text-[10px] font-normal font-mono text-slate-600">{exp.date || '22-09-2026'}</span>
          </div>

          {/* 1. AIM */}
          <div className="space-y-1.5">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">AIM:</h5>
            <p className="text-[11px] text-slate-700 leading-relaxed pl-3 border-l-2 border-slate-400">
              {exp.aim || `To design, develop, and implement an algorithmic solution in ${exp.language || 'Python'} for '${exp.title}' and verify against benchmark test cases.`}
            </p>
          </div>

          {/* 2. PROCEDURE / ALGORITHM */}
          <div className="space-y-1.5 pt-2">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">ALGORITHM / STEP-BY-STEP PROCEDURE:</h5>
            <div className="text-[10.5px] text-slate-700 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-slate-400 bg-slate-50/50 p-3 rounded">
              {exp.procedure || `Step 1: Start the program execution.\n\nStep 2: Read and parse required input parameters according to the specification.\n\nStep 3: Process the core algorithm logic and handle boundary edge cases.\n\nStep 4: Execute the logic and format output correctly.\n\nStep 5: Verify execution against benchmark test cases and terminate successfully.`}
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
          <span>Bannari Amman Institute of Technology</span>
          <span>Page {pageNum} of {totalPages}</span>
        </div>
      </div>
    </div>
  );
}

// 3. LAST PAGE: MARKS TABLE FIRST, THEN RESULT SECTION
function StudentA4RubricResultPage({ exp, template, isLeft = false, pageNum, totalPages }) {
  const totalExpMarks = exp.marks || 100;
  const ratio = totalExpMarks / 100;
  const algoMarks = Math.round(20 * ratio);
  const codeMarks = Math.round(40 * ratio);
  const testMarks = Math.round(20 * ratio);
  const vivaMarks = totalExpMarks - (algoMarks + codeMarks + testMarks);

  return (
    <div className={`bg-white text-slate-900 border-2 border-slate-800 rounded-sm shadow-2xl p-7 max-w-[800px] mx-auto min-h-[1050px] relative font-[system-ui] flex flex-col justify-between ${isLeft ? 'pr-9 pl-5' : 'pl-9 pr-5'}`} style={{ aspectRatio: '1 / 1.414' }}>
      <div className="border border-slate-400 p-6 h-full flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-b border-slate-200 pb-1">
            <span>BIT — {template.course_code} | EVALUATION REPORT</span>
            <span>Student: {template.student_name} ({template.roll_no})</span>
          </div>

          <div className="bg-slate-100 border border-slate-400 p-2 text-left font-black text-[12px] text-slate-900">
            EX NO: {String(exp.experiment_no).padStart(2, '0')} EVALUATION REPORT — {exp.title?.toUpperCase()}
          </div>

          {/* 1. FIRST: TABULAR MARKS RUBRIC COLUMN */}
          <div className="space-y-1.5">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              EVALUATION & MARKS BREAKDOWN RUBRIC:
            </h5>
            <table className="w-full border-collapse text-[11px] border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                  <th className="p-2 text-center border-r border-slate-400 w-12">S.NO</th>
                  <th className="p-2 text-left border-r border-slate-400">ASSESSMENT COMPONENT / CRITERIA</th>
                  <th className="p-2 text-center border-r border-slate-400 w-24">MAX MARKS</th>
                  <th className="p-2 text-center border-r border-slate-400 w-24">MARKS SCORED</th>
                  <th className="p-2 text-center w-24">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                <tr>
                  <td className="p-2 text-center font-mono border-r border-slate-300">1</td>
                  <td className="p-2 font-medium border-r border-slate-300">Algorithm & Logic Formulation</td>
                  <td className="p-2 text-center border-r border-slate-300">20</td>
                  <td className="p-2 text-center font-bold border-r border-slate-300">{algoMarks}</td>
                  <td className="p-2 text-center font-bold text-emerald-700 text-[10px]">VERIFIED</td>
                </tr>
                <tr>
                  <td className="p-2 text-center font-mono border-r border-slate-300">2</td>
                  <td className="p-2 font-medium border-r border-slate-300">Source Code & Implementation Syntax</td>
                  <td className="p-2 text-center border-r border-slate-300">40</td>
                  <td className="p-2 text-center font-bold border-r border-slate-300">{codeMarks}</td>
                  <td className="p-2 text-center font-bold text-emerald-700 text-[10px]">VERIFIED</td>
                </tr>
                <tr>
                  <td className="p-2 text-center font-mono border-r border-slate-300">3</td>
                  <td className="p-2 font-medium border-r border-slate-300">Benchmark Test Case Validation</td>
                  <td className="p-2 text-center border-r border-slate-300">20</td>
                  <td className="p-2 text-center font-bold border-r border-slate-300">{testMarks}</td>
                  <td className="p-2 text-center font-bold text-emerald-700 text-[10px]">PASSED</td>
                </tr>
                <tr>
                  <td className="p-2 text-center font-mono border-r border-slate-300">4</td>
                  <td className="p-2 font-medium border-r border-slate-300">Viva Voce & Oral Defense</td>
                  <td className="p-2 text-center border-r border-slate-300">20</td>
                  <td className="p-2 text-center font-bold border-r border-slate-300">{vivaMarks}</td>
                  <td className="p-2 text-center font-bold text-emerald-700 text-[10px]">COMPLETED</td>
                </tr>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                  <td colSpan={2} className="p-2 text-right border-r border-slate-400 uppercase text-[10px]">
                    Total Evaluated Score :
                  </td>
                  <td className="p-2 text-center border-r border-slate-400 font-bold">100</td>
                  <td className="p-2 text-center text-slate-900 border-r border-slate-400 font-black">
                    {totalExpMarks} / 100
                  </td>
                  <td className="p-2 text-center text-emerald-700 font-bold text-[10px]">
                    APPROVED
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. AFTER THAT: RESULT SECTION */}
          <div className="space-y-1.5 pt-2">
            <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">RESULT:</h5>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded text-[11px] text-emerald-950 italic leading-relaxed">
              {exp.result_text || `Thus the program for '${exp.title}' was successfully developed, executed, tested against all verification benchmark cases, and evaluated with required oral viva voce.`}
            </div>
          </div>
        </div>

        {/* 3. SIGN-OFF FOOTER */}
        <div>
          <div className="grid grid-cols-3 gap-3 border border-slate-400 p-2 text-center text-[10px] font-bold bg-slate-50">
            <div>Date: {exp.date || '22-09-2026'}</div>
            <div>Score: {totalExpMarks} / 100</div>
            <div className="text-emerald-700">Staff Sign: VERIFIED [DIGITAL]</div>
          </div>
          <div className="text-[9px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between mt-2">
            <span>Bannari Amman Institute of Technology</span>
            <span>Page {pageNum} of {totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
