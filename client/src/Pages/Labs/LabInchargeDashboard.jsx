import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  CheckCheck,
  FileText,
  Search,
  Loader2,
  AlertCircle,
  Code2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import api from '../../api/axios';

export default function LabInchargeDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [expandedCode, setExpandedCode] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchQueue(); }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-incharge/queue');
      setSubmissions(res.data?.submissions || []);
      setMappings(res.data?.mappings || []);
    } catch {
      setError('Could not load student lab submissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySingle = async (subId, status, marks = 10) => {
    try {
      await api.post('/lab-incharge/verify-single', {
        submission_id: subId,
        status,
        marks,
        faculty_notes: status === 'APPROVED' ? 'Verified by Lab Incharge' : 'Revision required'
      });
      showToast('Experiment status updated successfully.', 'success');
      fetchQueue();
    } catch {
      showToast('Failed to update submission status.', 'error');
    }
  };

  const handleVerifySemester = async (studentId, courseId = 1) => {
    try {
      await api.post('/lab-incharge/verify-semester', {
        student_id: studentId,
        course_id: courseId
      });
      showToast('Entire semester record approved!', 'success');
      fetchQueue();
    } catch {
      showToast('Failed to approve semester record.', 'error');
    }
  };

  const studentGroups = submissions.reduce((acc, sub) => {
    const sId = sub.student_id;
    if (!acc[sId]) acc[sId] = { student: sub.student, submissions: [] };
    acc[sId].submissions.push(sub);
    return acc;
  }, {});

  const filteredSubmissions = submissions.filter((sub) => {
    const term = search.toLowerCase();
    return (
      sub.student?.name?.toLowerCase().includes(term) ||
      sub.student?.roll_no?.toLowerCase().includes(term) ||
      sub.experiment?.title?.toLowerCase().includes(term)
    );
  });

  const TABS = [
    { key: 'single', label: 'Individual Experiments' },
    { key: 'semester', label: 'Semester Batch Review' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
          toast.type === 'error'
            ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
            : 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
        }`}>
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />
          }
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-[var(--accent)]" />
            Lab Incharge Verification
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Review student code submissions and test case results. Approve individual experiments or sign off the entire semester record in one click.
          </p>
        </div>
      </div>

      {/* Mode Tab Selector */}
      <div className="border-b border-[var(--border)] flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.key === 'single' ? <FileText className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by student name, roll number, or experiment..."
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-10 pr-4 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)] gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading verification queue...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Single Experiment Mode */}
      {!loading && !error && activeTab === 'single' && (
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--text-muted)]">
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
          </p>

          {filteredSubmissions.length === 0 ? (
            <div className="p-10 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--text-muted)] text-sm">
              No submissions to review yet.
            </div>
          ) : (
            filteredSubmissions.map((sub) => (
              <div key={sub.id} className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 transition-all space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[var(--text-primary)]">
                        {sub.student?.name || 'Unknown Student'}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        ({sub.student?.roll_no || '—'})
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--accent)] font-medium mt-0.5">
                      Ex {sub.experiment?.experiment_no}: {sub.experiment?.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      sub.status === 'APPROVED'
                        ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
                        : 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/30'
                    }`}>
                      {sub.status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : null}
                      {sub.status}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {sub.pass_count}/{sub.total_test_cases} cases passed
                    </span>
                    <button
                      onClick={() => handleVerifySingle(sub.id, 'APPROVED', 10)}
                      className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30 text-xs font-semibold hover:bg-[var(--green)]/15 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve (10/10)
                    </button>
                    <button
                      onClick={() => handleVerifySingle(sub.id, 'REVISION_REQUIRED', 0)}
                      className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30 text-xs font-semibold hover:bg-[var(--red)]/15 transition-all cursor-pointer"
                    >
                      Revision
                    </button>
                  </div>
                </div>

                {/* Code Preview Toggle */}
                <button
                  onClick={() => setExpandedCode(expandedCode === sub.id ? null : sub.id)}
                  className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-all"
                >
                  <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {expandedCode === sub.id ? 'Collapse' : 'View'} Submitted Code
                  {expandedCode === sub.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>

                {expandedCode === sub.id && (
                  <pre className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-raised)] p-3 rounded-[var(--radius-md)] border border-[var(--border)] max-h-52 overflow-y-auto whitespace-pre-wrap">
                    {sub.submitted_code}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Semester Batch Mode */}
      {!loading && !error && activeTab === 'semester' && (
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--text-muted)]">
            {Object.keys(studentGroups).length} student portfolio{Object.keys(studentGroups).length !== 1 ? 's' : ''} loaded
          </p>

          {Object.keys(studentGroups).length === 0 ? (
            <div className="p-10 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--text-muted)] text-sm">
              No student submissions found.
            </div>
          ) : (
            Object.entries(studentGroups).map(([sId, group]) => (
              <div key={sId} className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-6 transition-all space-y-4">
                {/* Student Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                  <div>
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                      {group.student?.name || 'Unknown Student'}
                    </h3>
                    <p className="text-[12px] text-[var(--text-secondary)] font-mono">
                      Roll No: {group.student?.roll_no || '—'} · {group.student?.department || 'AI & DS'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {group.submissions.filter(s => s.status === 'APPROVED').length} / {group.submissions.length} experiments approved
                    </p>
                  </div>

                  <button
                    onClick={() => handleVerifySemester(sId)}
                    className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 flex items-center gap-2 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Approve Entire Semester Record
                  </button>
                </div>

                {/* Experiment Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-3 rounded-[var(--radius-md)] border text-[11px] space-y-1 ${
                        sub.status === 'APPROVED'
                          ? 'bg-[var(--green-bg)] border-[var(--green)]/30'
                          : 'bg-[var(--bg-raised)] border-[var(--border)]'
                      }`}
                    >
                      <div className="font-bold text-[var(--text-primary)] leading-tight">
                        Ex {sub.experiment?.experiment_no}: {sub.experiment?.title}
                      </div>
                      <div className={`font-semibold ${sub.status === 'APPROVED' ? 'text-[var(--green)]' : 'text-[var(--amber)]'}`}>
                        {sub.marks}/10 marks · {sub.pass_count}/{sub.total_test_cases} passed
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
