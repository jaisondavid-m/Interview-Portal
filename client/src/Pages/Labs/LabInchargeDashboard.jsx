import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Search,
  Download,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  MessageSquareCheck,
  Award,
  AlertCircle,
  Sliders,
  ChevronRight,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import api from '../../api/axios';
import LabStudentAnalyticsDrawer from '../../Components/AdminLabs/LabStudentAnalyticsDrawer';

export default function LabInchargeDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Courses & Analytics State
  const [courses, setCourses] = useState([]);
  const [analyticsCourseId, setAnalyticsCourseId] = useState('');
  const [analyticsSection, setAnalyticsSection] = useState('ALL');
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Deep-Dive Drawer State
  const [selectedStudentDrawer, setSelectedStudentDrawer] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchInitialCourses();
  }, []);

  const fetchInitialCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-incharge/unlocks');
      const courseList = res?.courses || [];
      setCourses(courseList);

      if (courseList.length > 0) {
        const firstId = String(courseList[0].id);
        setAnalyticsCourseId(firstId);
        fetchAnalytics(firstId, 'ALL');
      }
    } catch {
      setError('Failed to load practical lab courses.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (courseId, section = 'ALL') => {
    if (!courseId) return;
    try {
      setLoadingAnalytics(true);
      const secParam = section && section !== 'ALL' ? `?section=${encodeURIComponent(section)}` : '';
      const res = await api.get(`/lab-incharge/analytics/${courseId}${secParam}`);
      setAnalyticsData(res);
    } catch {
      showToast('Failed to load course student analytics.', 'error');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleCourseChange = (newCourseId) => {
    setAnalyticsCourseId(newCourseId);
    fetchAnalytics(newCourseId, analyticsSection);
  };

  const handleSectionChange = (newSection) => {
    setAnalyticsSection(newSection);
    fetchAnalytics(analyticsCourseId, newSection);
  };

  // Export Student Progress Matrix to CSV
  const handleExportAnalyticsCSV = () => {
    if (!analyticsData?.student_matrix || analyticsData.student_matrix.length === 0) {
      showToast('No student data to export.', 'error');
      return;
    }

    const exps = analyticsData.experiments || [];
    const expHeaders = exps.map((e) => `Ex ${e.experiment_no} (${e.title})`);
    const headers = ['Roll No', 'Name', 'Section', 'Email', 'Completed Labs', 'Total Marks', 'Score %', ...expHeaders];

    const rows = analyticsData.student_matrix.map((st) => {
      const expStatuses = st.experiments.map((e) => `${e.status} (Marks: ${e.marks}, Attempts: ${e.attempt_count})`);
      return [
        `"${st.roll_no || ''}"`,
        `"${st.name || ''}"`,
        `"${st.section || ''}"`,
        `"${st.email || ''}"`,
        `"${st.completed_count}/${st.total_experiments}"`,
        st.total_marks,
        `${st.overall_pct}%`,
        ...expStatuses.map((s) => `"${s}"`),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${analyticsData.course?.course_code || 'Lab'}_Student_Progress_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getStatusPill = (status, attemptCount, marks) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> {marks > 0 ? `${marks}m` : 'Pass'}
          </span>
        );
      case 'SUBMITTED_FOR_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> Review
          </span>
        );
      case 'TEST_PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/30">
            Passed ({attemptCount} att)
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
            In Progress
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30">
            Revision
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)]">
            Not Started
          </span>
        );
    }
  };

  // Filtered Student Matrix
  const filteredStudentMatrix = (analyticsData?.student_matrix || []).filter((st) => {
    const q = analyticsSearch.toLowerCase();
    return (
      st.name?.toLowerCase().includes(q) ||
      st.roll_no?.toLowerCase().includes(q) ||
      st.section?.toLowerCase().includes(q)
    );
  });

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
            <span>Faculty Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-primary)] font-semibold">Lab Dashboard</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
            Student Progress & Analytics Dashboard
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Comprehensive real-time student experiment completion tracking, class score averages, and detailed student progress matrices.
          </p>
        </div>

        {/* Quick Navigation Action Links */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/faculty/labs/evaluation')}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-2"
          >
            <MessageSquareCheck className="w-4 h-4" />
            Evaluation Queue & Viva Voce &rarr;
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

      {/* Controls Bar: Course Selector, Section Filter, Search, Export */}
      <div className="panel-card p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-2xl">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="space-y-1 min-w-[240px]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Active Practical Course
            </label>
            <select
              value={analyticsCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Section Filter
            </label>
            <select
              value={analyticsSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="ALL">ALL Sections</option>
              {(analyticsData?.sections || ['A', 'B', 'C']).map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Search Enrolled Students
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={analyticsSearch}
                onChange={(e) => setAnalyticsSearch(e.target.value)}
                placeholder="Search by student name or roll number..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={handleExportAnalyticsCSV}
            className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Class CSV
          </button>
        </div>
      </div>

      {/* Course High-Level KPI Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--accent)]" /> Enrolled Students
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-[var(--text-primary)]">
              {analyticsData.summary?.total_students || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Across target section
            </span>
          </div>

          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Completion Rate
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
              {analyticsData.summary?.completion_rate_pct || 0}%
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              {analyticsData.summary?.completed_submissions || 0} experiments verified
            </span>
          </div>

          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-blue-500" /> Average Score
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-500">
              {analyticsData.summary?.avg_score_pct || 0}%
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Across all graded labs
            </span>
          </div>

          <div
            onClick={() => navigate('/faculty/labs/evaluation')}
            className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)] cursor-pointer hover:border-amber-500/50 transition-all group"
          >
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Oral Viva Pending
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 group-hover:underline">
              {analyticsData.summary?.pending_review_count || 0}
            </div>
            <span className="text-[10px] text-[var(--accent)] font-semibold block">
              View Viva Queue &rarr;
            </span>
          </div>
        </div>
      )}

      {/* Comprehensive Student Progress Matrix Table */}
      <div className="panel-card p-6 space-y-4 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
              Student Lab Completion Matrix
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Click any student row to open deep-dive experiment history, individual execution attempts, and rubric marks.
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Showing {filteredStudentMatrix.length} Students
          </span>
        </div>

        {loadingAnalytics ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-2">
            <Clock className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
            <p>Loading course student progress matrix...</p>
          </div>
        ) : filteredStudentMatrix.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
            No students found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[180px]">Student</th>
                  <th className="py-3 px-3 text-center">Sec</th>
                  <th className="py-3 px-3 text-center">Progress</th>
                  <th className="py-3 px-3 text-center">Total Marks</th>
                  <th className="py-3 px-3 text-center">Score %</th>
                  {(analyticsData?.experiments || []).map((exp) => (
                    <th key={exp.id} className="py-3 px-2 text-center font-mono" title={exp.title}>
                      Ex {exp.experiment_no}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredStudentMatrix.map((st) => (
                  <tr
                    key={st.student_id}
                    onClick={() => setSelectedStudentDrawer(st)}
                    className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {st.name}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">
                        {st.roll_no || `ID#${st.student_id}`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[var(--text-secondary)]">
                      {st.section || 'A'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[var(--accent)]">
                      {st.completed_count} / {st.total_experiments}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[var(--text-primary)]">
                      {st.total_marks}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-mono font-bold text-xs ${
                          st.overall_pct >= 80
                            ? 'text-emerald-500'
                            : st.overall_pct >= 50
                            ? 'text-blue-500'
                            : 'text-amber-500'
                        }`}
                      >
                        {st.overall_pct}%
                      </span>
                    </td>
                    {st.experiments.map((exp) => (
                      <td key={exp.experiment_id} className="py-3 px-2 text-center">
                        {getStatusPill(exp.status, exp.attempt_count, exp.marks)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentDrawer(st);
                        }}
                        className="p-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--accent)] transition cursor-pointer"
                        title="View detailed student audit & override"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Deep-Dive Analytics Drawer */}
      {selectedStudentDrawer && (
        <LabStudentAnalyticsDrawer
          isOpen={!!selectedStudentDrawer}
          onClose={() => setSelectedStudentDrawer(null)}
          studentData={selectedStudentDrawer}
          onOpenScheduleOverride={(studentId, expId) => {
            navigate('/faculty/labs/scheduling');
          }}
        />
      )}
    </div>
  );
}
