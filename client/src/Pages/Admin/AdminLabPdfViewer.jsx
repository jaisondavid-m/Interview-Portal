import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Columns2,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  BookOpen,
  FileText
} from 'lucide-react';
import api from '../../api/axios';
import LabRecordDocument from '../../Components/Labs/LabRecordDocument';

export default function AdminLabPdfViewer() {
  const { courseId: paramCourseId } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(paramCourseId || '');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isDuplex, setIsDuplex] = useState(true);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState('');
  const [zoomScale, setZoomScale] = useState(1);
  const [viewMode, setViewMode] = useState('all');
  const [showSignatures, setShowSignatures] = useState(true);
  const [showRubrics, setShowRubrics] = useState(true);
  const [showOutputs, setShowOutputs] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseTemplate(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
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
      setError('');

      // Fetch course PDF template
      const tRes = await api.get(`/admin/labs/courses/${cId}/pdf-template`);
      const courseTemplate = tRes?.template || {
        course_id: cId,
        institution_name: 'BANNARI AMMAN INSTITUTE OF TECHNOLOGY',
        institution_sub: 'An Autonomous Institution Affiliated to Anna University Chennai',
        department: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE',
        degree: 'B.Tech',
        semester: 'Semester III',
        academic_year: '2025-2026',
        student_name: 'STUDENT RECORD COPY',
        roll_no: '7376222AD145',
        register_no: '7376222AD145',
        branch_section: 'AIDS - A',
        verification_id: 'MOCKMATE-AUDIT-OFFICIAL',
        staff_incharge: 'Staff Incharge',
        head_of_department: 'Head of Department',
        experiments: []
      };

      setTemplate(courseTemplate);
    } catch (err) {
      setError('Failed to load laboratory record template from server.');
      showToast('Failed to load template data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleZoom = (delta) => {
    setZoomScale((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(Math.max(next, 0.5), 1.6);
    });
  };

  const experiments = template?.experiments || [];

  return (
    <div className="space-y-4">
      {/* Top Navigation & Controls - Screen Only */}
      <div className="no-print pb-3 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/labs/config')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back to Config
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1">
              <ShieldCheck className="w-3 h-3" />
              Live Academic PDF Audit Engine
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
              {template?.course_code ? `${template.course_code} — ${template.course_title}` : 'Student Lab PDF Audit'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Selector Dropdown */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Section Selector */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            disabled={loading || !template}
            className="px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            <option value="all">📖 All Pages (Continuous Record)</option>
            <option value="spread">📑 Facing Book Spread (2-Page View)</option>
            <option value="flyleaf">📄 Page 1: Blank Flyleaf</option>
            <option value="cover">📄 Page 2: Title & Cover Page</option>
            <option value="certificate">📜 Page 3: Bonafide Certificate</option>
            <option value="index">📑 Page 4: Index Sheet</option>
            {experiments.map((exp, idx) => {
              const expNo = exp.experiment_no || idx + 1;
              return (
                <React.Fragment key={idx}>
                  <option value={`exp_${expNo}_left`}>
                    🔬 Ex {expNo} [Left Page]: Program & Output
                  </option>
                  <option value={`exp_${expNo}_right`}>
                    🔬 Ex {expNo} [Right Page]: Aim, Algorithm & Result
                  </option>
                </React.Fragment>
              );
            })}
          </select>

          {/* Duplex Margins Toggle */}
          <button
            onClick={() => setIsDuplex(!isDuplex)}
            title="Toggle alternating inside binding gutter margins for double-sided booklet printing"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all cursor-pointer ${
              isDuplex
                ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDuplex ? 'Duplex: ON' : 'Duplex: OFF'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="hidden sm:inline-flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden">
            <button
              onClick={() => handleZoom(-0.1)}
              disabled={zoomScale <= 0.6}
              title="Zoom Out"
              className="px-2 py-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1)}
              title="Reset Zoom to 100%"
              className="px-2 py-1 text-[11px] font-mono font-bold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer border-x border-[var(--border)]"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={() => handleZoom(0.1)}
              disabled={zoomScale >= 1.5}
              title="Zoom In"
              className="px-2 py-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Display Options */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all cursor-pointer ${
                showSettings
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Toggle formatting options"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Options</span>
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-1.5 w-56 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-2xl z-30 space-y-2 text-xs">
                <div className="font-bold text-[var(--text-primary)] pb-1.5 border-b border-[var(--border)]">
                  Display & Print Options
                </div>
                <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>Official Signature Blocks</span>
                </label>
                <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRubrics}
                    onChange={(e) => setShowRubrics(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>Evaluation Rubric Tables</span>
                </label>
                <label className="flex items-center gap-2 text-[var(--text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOutputs}
                    onChange={(e) => setShowOutputs(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span>Execution Output Logs</span>
                </label>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => selectedCourseId && loadCourseTemplate(selectedCourseId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Reload template data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Print PDF Button */}
          <button
            onClick={handlePrint}
            disabled={loading || !template}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-[var(--accent)] text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Viewport Container */}
      {loading ? (
        <div className="p-20 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Compiling Multi-Page Laboratory Manual...</p>
          <p className="text-xs text-[var(--text-muted)]">Formatting verified source code, execution logs, algorithms, and evaluation rubrics.</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Failed to Load PDF Preview</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">{error}</p>
          <button
            onClick={() => selectedCourseId && loadCourseTemplate(selectedCourseId)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Compilation
          </button>
        </div>
      ) : template ? (
        <div className="w-full bg-[#383b40] rounded-[var(--radius-lg)] py-8 px-2 sm:px-6 border border-[var(--border)] shadow-2xl overflow-x-auto min-h-[80vh] flex flex-col items-center">
          <div className="w-full max-w-full flex justify-center">
            <LabRecordDocument
              data={template}
              isDuplex={isDuplex}
              viewMode={viewMode}
              scale={zoomScale}
              showSignatures={showSignatures}
              showRubrics={showRubrics}
              showOutputs={showOutputs}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

