import React, { useState, useEffect, useRef } from 'react';
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
  Maximize2,
  SlidersHorizontal,
  CheckCircle2,
  BookOpen,
  FileText
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LabRecordDocument from '../../Components/Labs/LabRecordDocument';
import { exportDomToPdf } from '../../utils/pdfExport';

export default function LabRecordPreview() {
  const { courseId = 1 } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templateData, setTemplateData] = useState(null);
  const [isDuplex, setIsDuplex] = useState(true);
  const [zoomScale, setZoomScale] = useState(1);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'cover', 'certificate', 'index', or experiment_no
  const [showSignatures, setShowSignatures] = useState(true);
  const [showRubrics, setShowRubrics] = useState(true);
  const [showOutputs, setShowOutputs] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const documentRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScale, setAutoScale] = useState(1);

  useEffect(() => {
    fetchLabRecordData();
  }, [courseId]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth - 48;
      if (availableWidth <= 0) return;

      // 2-page spread width (420mm + gap = ~1620px) vs single page (210mm = ~810px)
      const docWidth = isDuplex ? 1620 : 810;
      const fitRatio = Math.min(availableWidth / docWidth, 1.0);
      setAutoScale(Math.round(fitRatio * 100) / 100);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isDuplex, templateData]);

  const fetchLabRecordData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch template metadata and populated student experiment submissions
      const res = await api.get(`/labs/courses/${courseId}/pdf-template`);
      const template = res?.template || {};

      // Enrich template with student credentials if needed
      const enriched = {
        ...template,
        student_name: user?.name || template.student_name || 'STUDENT RECORD COPY',
        roll_no: user?.roll_no || template.roll_no || '7376222CS101',
        register_no: user?.roll_no || template.register_no || '7376222CS101',
        department: template.department || user?.department || 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING'
      };

      setTemplateData(enriched);
    } catch (err) {
      console.error('Error loading lab record template:', err);
      setError('Failed to load laboratory record document data from server.');
    } finally {
      setLoading(false);
    }
  };

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  const handleDownloadPdf = async () => {
    if (!templateData) return;
    try {
      setDownloading(true);
      setDownloadProgress({ current: 1, total: templateData?.experiments?.length ? templateData.experiments.length * 4 + 6 : 1 });

      const prevMode = viewMode;
      if (prevMode !== 'all') {
        setViewMode('all');
        await new Promise((r) => setTimeout(r, 200));
      }

      const fileName = `${templateData.roll_no || 'StudentRecord'}_${templateData.course_code || 'Lab'}.pdf`;
      const targetEl = documentRef.current || containerRef.current || document.querySelector('.lab-record-wrapper');

      await exportDomToPdf(targetEl, fileName, (current, total) => {
        setDownloadProgress({ current, total });
      });

      if (prevMode !== 'all') {
        setViewMode(prevMode);
      }
    } catch (err) {
      console.error('DOM PDF export error:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const handleZoom = (delta) => {
    setZoomScale((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(Math.max(next, 0.5), 1.6);
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  const experiments = templateData?.experiments || [];

  return (
    <div className="space-y-4">
      {/* Top Bar Navigation & Actions - Screen Only */}
      <div className="no-print pb-3 border-b border-[var(--border)] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
              Verified Laboratory Manual PDF
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
              {templateData?.course_code ? `${templateData.course_code} — ${templateData.course_title}` : 'Laboratory Record Manual'}
            </h1>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Section Selector */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            disabled={loading || !templateData}
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
                  <option value={`exp_${expNo}_aim_left`}>
                    📄 Ex {expNo} [Left Page]: Blank Page (Observation)
                  </option>
                  <option value={`exp_${expNo}_aim_right`}>
                    🎯 Ex {expNo} [Right Page]: Aim & Algorithm
                  </option>
                  <option value={`exp_${expNo}_out_left`}>
                    🖥️ Ex {expNo} [Left Page]: Program Output
                  </option>
                  <option value={`exp_${expNo}_code_right`}>
                    💻 Ex {expNo} [Right Page]: Program Source Code
                  </option>
                  <option value={`exp_${expNo}_eval_left`}>
                    📄 Ex {expNo} [Left Page]: Blank Page (Notes)
                  </option>
                  <option value={`exp_${expNo}_eval_right`}>
                    📊 Ex {expNo} [Right Page]: Rubrics & Result
                  </option>
                </React.Fragment>
              );
            })}
          </select>

          {/* Duplex Toggle */}
          <button
            onClick={() => setIsDuplex(!isDuplex)}
            title="Toggle 2-Page Spread View (Duplex ON) vs Single Page View (Duplex OFF)"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all cursor-pointer ${
              isDuplex
                ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDuplex ? 'Duplex: ON (2-Page View)' : 'Duplex: OFF (Single Page)'}</span>
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
              onClick={handleResetZoom}
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

          {/* Options Dropdown / Toggle */}
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
            onClick={fetchLabRecordData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
            title="Reload backend data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Direct PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={loading || downloading || !templateData}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-md)]"
            title="Download full laboratory record PDF directly"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Viewport Content */}
      {loading ? (
        <div className="p-20 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Loading verified laboratory data...</p>
          <p className="text-xs text-[var(--text-muted)]">Formatting student submissions, algorithm procedures, source code, and rubrics.</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
          <button
            onClick={fetchLabRecordData}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : templateData ? (
        <div ref={containerRef} className="w-full bg-[#383b40] rounded-[var(--radius-lg)] py-8 px-2 sm:px-6 border border-[var(--border)] shadow-2xl overflow-x-auto min-h-[80vh] flex flex-col items-center">
          <div ref={documentRef} className="w-full max-w-full flex justify-center">
            <LabRecordDocument
              data={templateData}
              isDuplex={isDuplex}
              viewMode={viewMode}
              scale={autoScale * zoomScale}
              showSignatures={showSignatures}
              showRubrics={showRubrics}
              showOutputs={showOutputs}
            />
          </div>
        </div>
      ) : null}

      {/* High-Fidelity PDF Generation Progress Modal */}
      {downloading && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
              <Download className="w-7 h-7 animate-bounce text-[var(--accent)]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Generating Laboratory Record PDF
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Compiling high-resolution pages, signatures, source code, and rubrics.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[var(--text-primary)]">
                  Page {downloadProgress.current} of {downloadProgress.total || '...'}
                </span>
                <span className="text-[var(--accent)]">
                  {downloadProgress.total > 0
                    ? `${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%`
                    : 'Processing...'}
                </span>
              </div>

              <div className="w-full h-3 bg-[var(--bg-input)] rounded-full border border-[var(--border)] overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-indigo-500 rounded-full transition-all duration-150 ease-out"
                  style={{
                    width: `${
                      downloadProgress.total > 0
                        ? Math.min(100, Math.round((downloadProgress.current / downloadProgress.total) * 100))
                        : 5
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center gap-2.5 text-[11px] text-[var(--text-muted)] font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)] shrink-0" />
              <span>Please keep this window open while downloading...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

