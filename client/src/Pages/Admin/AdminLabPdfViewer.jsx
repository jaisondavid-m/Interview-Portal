import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Eye,
  Download,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';

export default function AdminLabPdfViewer() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/labs/data');
      setStudents(res.students || []);
      setCourses(res.courses || []);
      if (res.students?.length > 0) setSelectedStudent(res.students[0].id);
      if (res.courses?.length > 0) setSelectedCourse(res.courses[0].id);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!selectedStudent || !selectedCourse) return;
    setGenerating(true);
    const url = `/api/v1/admin/labs/pdf-preview/${selectedCourse}/student/${selectedStudent}`;
    setPdfUrl(url);
    setTimeout(() => setGenerating(false), 800);
  };

  const inputClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-all";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-[var(--accent)]" />
          Student Lab Record PDF Audit
        </h1>
        <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
          Preview and audit the official server-generated PDF lab manual for any enrolled student for college audit compliance.
        </p>
      </div>

      {/* Selector Panel */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] space-y-5">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--accent)]" />
          Select Student & Lab Course to Audit
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Student</label>
            {loading ? (
              <div className="flex items-center gap-2 py-2.5 px-3 text-[var(--text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                Loading...
              </div>
            ) : (
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className={inputClass}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roll_no || `ID: ${s.id}`})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Lab Course</label>
            {loading ? (
              <div className="flex items-center gap-2 py-2.5 px-3 text-[var(--text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                Loading...
              </div>
            ) : (
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={inputClass}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-end">
            <button
              onClick={handlePreview}
              disabled={loading || generating || !selectedStudent || !selectedCourse}
              className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-[var(--shadow-sm)]"
            >
              {generating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Eye className="w-4 h-4" />
              }
              Generate & Inspect PDF
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      {pdfUrl && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
              <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-mono">{pdfUrl}</span>
            </div>
            <a
              href={pdfUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              Download Copy
            </a>
          </div>
          <iframe
            src={pdfUrl}
            title="Student Lab Record PDF Audit"
            className="w-full border-0"
            style={{ height: '700px' }}
          />
        </div>
      )}

      {!pdfUrl && !loading && (
        <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--text-muted)] space-y-2">
          <Eye className="w-8 h-8 mx-auto text-[var(--accent)]/30" />
          <p className="text-sm">Select a student and course above, then click <strong>Generate & Inspect PDF</strong> to preview their lab record.</p>
        </div>
      )}
    </div>
  );
}
