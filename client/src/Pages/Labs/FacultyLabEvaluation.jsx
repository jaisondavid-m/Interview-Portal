import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquareCheck,
  CheckCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  Clock,
  ArrowLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  Sliders,
  UserCheck,
  Lock,
  Unlock,
  FileText
} from 'lucide-react';
import api from '../../api/axios';

export default function FacultyLabEvaluation() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [semesterStudents, setSemesterStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'semester'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED_FOR_VERIFICATION' | 'APPROVED'
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-incharge/queue');
      setSubmissions(res?.submissions || []);
      setMappings(res?.mappings || []);
      setSemesterStudents(res?.semester_students || []);
    } catch (err) {
      console.error(err);
      setError('Could not load student lab submissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySemester = async (studentId, courseId = 1) => {
    try {
      await api.post('/lab-incharge/verify-semester', {
        student_id: studentId,
        course_id: courseId,
      });
      showToast('Entire semester record approved and signed!', 'success');
      fetchQueue();
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Failed to approve semester record.';
      showToast(errMsg, 'error');
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const term = search.toLowerCase();
    const matchesSearch =
      sub.student?.name?.toLowerCase().includes(term) ||
      sub.student?.roll_no?.toLowerCase().includes(term) ||
      sub.experiment?.title?.toLowerCase().includes(term) ||
      sub.question?.title?.toLowerCase().includes(term);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && sub.status === statusFilter;
  });

  const filteredSemesterStudents = semesterStudents.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.student?.name?.toLowerCase().includes(term) ||
      item.student?.roll_no?.toLowerCase().includes(term) ||
      item.section?.toLowerCase().includes(term) ||
      item.student?.section?.toLowerCase().includes(term) ||
      item.course_title?.toLowerCase().includes(term) ||
      item.course_code?.toLowerCase().includes(term)
    );
  });

  const pendingVivaCount = submissions.filter((s) => s.status === 'SUBMITTED_FOR_VERIFICATION').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Link to="/faculty/labs" className="hover:text-[var(--accent)] transition-colors">
              Lab Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-primary)] font-semibold">Lab Evaluation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <MessageSquareCheck className="w-6 h-6 text-[var(--accent)]" />
            Lab Evaluation & Viva Voce
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Review student experiment submissions, conduct in-person oral viva voce evaluations, and sign off semester records.
          </p>
        </div>

        {/* Quick Navigation Action Links */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/faculty/labs')}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Student Analytics
          </button>

          <button
            type="button"
            onClick={() => navigate('/faculty/labs/scheduling')}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Scheduling & Locks
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'queue'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquareCheck className="w-4 h-4" />
          Evaluation Queue & Viva Voce
          {pendingVivaCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-500 font-mono">
              {pendingVivaCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('semester')}
          className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'semester'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          Semester Batch Sign-Off
        </button>
      </div>

      {/* TAB 1: EVALUATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="panel-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student by name, roll no, or experiment title..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'SUBMITTED_FOR_VERIFICATION', 'APPROVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {status === 'ALL'
                    ? 'All Submissions'
                    : status === 'SUBMITTED_FOR_VERIFICATION'
                    ? 'Oral Viva Pending'
                    : 'Approved'}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List Cards */}
          {loading ? (
            <div className="panel-card p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
              <Clock className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
              <p>Loading submission queue...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {search ? 'No submissions match your search.' : 'All caught up! No submissions waiting for oral viva.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubmissions.map((sub) => {
                const isPendingViva = sub.status === 'SUBMITTED_FOR_VERIFICATION';
                return (
                  <div
                    key={sub.id}
                    className={`panel-card p-4 flex flex-col justify-between group cursor-pointer transition-all hover:border-[var(--accent)] rounded-2xl ${
                      isPendingViva ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : ''
                    }`}
                    onClick={() => navigate(`/faculty/labs/evaluate/${sub.id}`)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] font-bold font-mono text-xs">
                            {sub.student?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                              {sub.student?.name || 'Student'}
                            </h3>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {sub.student?.roll_no || '—'} · Sec {sub.student?.section || 'A'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : isPendingViva
                              ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 animate-pulse'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          }`}
                        >
                          {sub.status === 'APPROVED' ? (
                            <>
                              <Award className="w-3 h-3" />
                              {sub.marks}/100
                            </>
                          ) : isPendingViva ? (
                            <>
                              <MessageSquareCheck className="w-3 h-3" />
                              Viva Pending
                            </>
                          ) : (
                            sub.status
                          )}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            Exp {sub.experiment?.experiment_no || 1}
                          </span>
                          {sub.question?.question_code && (
                            <span className="font-mono text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                              {sub.question.question_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
                          {sub.question?.title || sub.experiment?.title}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[var(--text-secondary)] font-semibold">
                          {sub.pass_count}/{sub.total_test_cases} tests
                        </span>
                        {(sub.tab_switch_count || 0) > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.2 rounded text-[10px]" title={`${sub.tab_switch_count} tab switch infractions during assessment`}>
                            ⚠️ {sub.tab_switch_count} {sub.tab_switch_count === 1 ? 'switch' : 'switches'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/faculty/labs/evaluate/${sub.id}`);
                        }}
                        className="text-[var(--accent)] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
                      >
                        Evaluate &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEMESTER BATCH SIGN-OFF */}
      {activeTab === 'semester' && (
        <div className="panel-card p-6 space-y-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-[var(--accent)]" />
                Semester Final Lab Record Approvals
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                When all experiments for a student are completed, perform a final digital batch sign-off and issue their certified lab record.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-3">Section</th>
                  <th className="py-3 px-3">Course / Lab</th>
                  <th className="py-3 px-3">Completed Experiments</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredSemesterStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-[var(--text-muted)]">
                      {loading ? 'Loading student records...' : 'No student records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSemesterStudents.map((item, idx) => {
                    const total = item.total_experiments || 7;
                    const completed = item.completed_count || 0;
                    const pct = Math.min(100, Math.round((completed / total) * 100));
                    const remaining = Math.max(0, total - completed);
                    const isAllDone = item.all_finished || completed >= total;
                    const isSigned = item.is_semester_signed;

                    return (
                      <tr key={idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[var(--text-primary)]">{item.student?.name || 'Student'}</div>
                          <div className="text-[10px] font-mono text-[var(--text-muted)]">{item.student?.roll_no || '—'}</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[var(--text-secondary)]">
                          Sec: {item.section || item.student?.section || 'A'}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                            {item.course_title || 'Practical Laboratory'}
                          </div>
                          {item.course_code && (
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">{item.course_code}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                              {completed} / {total}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">({pct}%)</span>
                          </div>
                          <div className="w-28 bg-[var(--bg-raised)] h-1.5 rounded-full overflow-hidden mt-1 border border-[var(--border)]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isAllDone ? 'bg-emerald-500' : 'bg-[var(--accent)]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Signed & Certified
                            </span>
                          ) : isAllDone ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Record Sign
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" /> {remaining} Exp{remaining > 1 ? 's' : ''} Remaining
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isSigned ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                              </span>
                              <a
                                href={`/api/v1/lab-incharge/student-record/${item.student_id}/${item.course_id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-semibold inline-flex items-center gap-1 transition-all"
                                title="Download Certified Record PDF"
                              >
                                <FileText className="w-3.5 h-3.5 text-[var(--accent)]" /> PDF
                              </a>
                            </div>
                          ) : isAllDone ? (
                            <button
                              type="button"
                              onClick={() => handleVerifySemester(item.student_id, item.course_id)}
                              className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Sign & Certify Record
                            </button>
                          ) : (
                            <div className="relative group inline-block">
                              <button
                                type="button"
                                disabled
                                className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)] text-xs font-semibold cursor-not-allowed opacity-60 inline-flex items-center gap-1.5"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                Sign & Certify Record
                              </button>
                              <div className="hidden group-hover:block absolute right-0 bottom-full mb-1.5 z-20 w-52 p-2 text-[11px] leading-tight text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl pointer-events-none text-center">
                                Locked: Student must finish all {total} experiments ({completed}/{total} completed)
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
