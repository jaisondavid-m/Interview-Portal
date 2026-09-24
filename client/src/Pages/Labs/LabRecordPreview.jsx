import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  Loader2,
  FileText,
  AlertCircle,
  RefreshCw,
  Columns2
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function LabRecordPreview() {
  const { courseId = 1 } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [error, setError] = useState('');
  const [isDuplex, setIsDuplex] = useState(true);
  const [courseInfo, setCourseInfo] = useState(null);

  useEffect(() => {
    generateAndLoadPDF();
    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [courseId, isDuplex]);

  const generateAndLoadPDF = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch template metadata
      const tRes = await api.get(`/labs/courses/${courseId}/pdf-template`);
      const template = tRes?.template || {};
      setCourseInfo(template);

      // 2. Fetch the compiled PDF stream directly from backend
      const payload = {
        ...template,
        is_duplex: isDuplex,
        student_name: user?.name || template.student_name,
        roll_no: user?.roll_no || template.roll_no,
      };

      const pdfRes = await api.post('/labs/record-pdf/custom', payload, {
        responseType: 'blob',
      });

      const blob = new Blob([pdfRes.data || pdfRes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      setError('Failed to compile laboratory record PDF preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlobUrl) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    const fileName = `${user?.roll_no || courseInfo?.roll_no || 'Student'}_${courseInfo?.course_code || 'Lab'}_LabRecord.pdf`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="pb-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              Verified Laboratory Record Manual
            </div>
            <h1 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
              {courseInfo?.course_code ? `${courseInfo.course_code} — ${courseInfo.course_title}` : 'Laboratory Record Manual'}
            </h1>
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
            onClick={generateAndLoadPDF}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading || !pdfBlobUrl}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-md)]"
          >
            <Download className="w-4 h-4" />
            Download Complete PDF
          </button>
        </div>
      </div>

      {/* PDF Viewport */}
      {loading ? (
        <div className="p-20 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Compiling laboratory record document...</p>
          <p className="text-xs text-[var(--text-muted)]">Formatting verified source code, execution logs, algorithms, and evaluation rubrics.</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
          <button
            onClick={generateAndLoadPDF}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : pdfBlobUrl ? (
        <div className="w-full bg-slate-900 rounded-[var(--radius-lg)] p-1 border border-[var(--border)] shadow-2xl overflow-hidden">
          <iframe
            src={`${pdfBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
            className="w-full h-[82vh] rounded-[calc(var(--radius-lg)-4px)] border-none"
            title="Laboratory Record PDF Preview"
          />
        </div>
      ) : null}
    </div>
  );
}
