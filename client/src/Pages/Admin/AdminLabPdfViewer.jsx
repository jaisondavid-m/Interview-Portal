import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Columns2,
  BookOpen,
  FileText
} from 'lucide-react';
import api from '../../api/axios';

export default function AdminLabPdfViewer() {
  const { courseId: paramCourseId } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(paramCourseId || '');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isDuplex, setIsDuplex] = useState(true);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseAndCompilePdf(selectedCourseId);
    }
  }, [selectedCourseId, isDuplex]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

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

  const loadCourseAndCompilePdf = async (cId) => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch course PDF template
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
        is_duplex: isDuplex,
        experiments: []
      };

      setTemplate(courseTemplate);

      // 2. Fetch live compiled PDF stream from backend generator
      const payload = {
        ...courseTemplate,
        is_duplex: isDuplex
      };

      const pdfRes = await api.post('/admin/labs/record-pdf/custom', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([pdfRes.data || pdfRes], { type: 'application/pdf' });
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      setError('Failed to compile live laboratory record PDF stream.');
      showToast('Failed to compile live PDF stream', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlobUrl) return;
    try {
      setDownloading(true);
      const link = document.createElement('a');
      link.href = pdfBlobUrl;
      const fileName = `${template?.course_code || 'Course'}_Official_LabRecord_Manual.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Live PDF downloaded successfully!');
    } catch {
      showToast('Failed to download PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation & Controls */}
      <div className="pb-3 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
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
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Course Selector Dropdown */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Duplex Margins Toggle */}
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

          {/* Refresh Button */}
          <button
            onClick={() => selectedCourseId && loadCourseAndCompilePdf(selectedCourseId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Recompile live PDF stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
            Refresh
          </button>

          {/* Download Complete PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={loading || !pdfBlobUrl || downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Download Complete PDF
              </>
            )}
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
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 min-h-[calc(100vh-180px)] flex flex-col items-center justify-center relative shadow-inner">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Compiling Multi-Page Laboratory Manual...</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
              Rendering institutional logos, code listings, execution verification, rubric marks, and result sheets directly via backend engine.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Failed to Load PDF Preview</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">{error}</p>
            <button
              onClick={() => selectedCourseId && loadCourseAndCompilePdf(selectedCourseId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Compilation
            </button>
          </div>
        ) : pdfBlobUrl ? (
          <div className="w-full h-[calc(100vh-210px)] flex flex-col rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border)] bg-[#525659]">
            <iframe
              src={`${pdfBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full border-0"
              title="Live Compiled Laboratory Record PDF"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
