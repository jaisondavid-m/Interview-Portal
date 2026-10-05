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
  AlertCircle,
  ChevronRight,
  FlaskConical,
  BookOpen,
  Filter,
  SlidersHorizontal,
  Plus,
  FileCode2,
  ShieldCheck,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import api from '../../api/axios';
import LabStudentAnalyticsDrawer from '../../Components/AdminLabs/LabStudentAnalyticsDrawer';

export default function AdminLabDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Analytics Payload State
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('STUDENT_MATRIX'); // 'STUDENT_MATRIX' | 'COURSE_MATRIX' | 'FACULTY_DIRECTORY'

  // Filter States
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Deep-Dive Student Drawer State
  const [selectedStudentDrawer, setSelectedStudentDrawer] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [selectedFaculty, selectedCourse, selectedSection]);

  const fetchDashboardAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (selectedFaculty !== 'ALL') params.append('faculty_id', selectedFaculty);
      if (selectedCourse !== 'ALL') params.append('course_id', selectedCourse);
      if (selectedSection !== 'ALL') params.append('section', selectedSection);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/admin/labs/dashboard-analytics?${params.toString()}`);
      setAnalytics(res);
    } catch {
      setError('Failed to load administrative lab analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDashboardAnalytics();
  };

  // Export CSV Matrix
  const handleExportCSV = () => {
    if (!analytics?.student_matrix || analytics.student_matrix.length === 0) {
      showToast('No student analytics data available to export.', 'error');
      return;
    }

    const exps = analytics.experiments || [];
    const expHeaders = exps.map((e) => `Ex ${e.experiment_no} (${e.title})`);
    const headers = ['Roll No', 'Name', 'Section', 'Department', 'Email', 'Completed Labs', 'Total Marks', 'Score %', ...expHeaders];

    const rows = analytics.student_matrix.map((st) => {
      const expStatuses = st.experiments.map((e) => `${e.status} (Marks: ${e.marks})`);
      return [
        `"${st.roll_no || ''}"`,
        `"${st.name || ''}"`,
        `"${st.section || ''}"`,
        `"${st.department || ''}"`,
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
    link.setAttribute('download', `Admin_Lab_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getStatusPill = (status, marks) => {
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
            <Clock className="w-3 h-3" /> Viva Queue
          </span>
        );
      case 'TEST_PASSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/30">
            Code Passed
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
            In Progress
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30">
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

  // Filtered Student Matrix for local search typing
  const filteredStudents = (analytics?.student_matrix || []).filter((st) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      st.name?.toLowerCase().includes(q) ||
      st.roll_no?.toLowerCase().includes(q) ||
      st.section?.toLowerCase().includes(q) ||
      st.email?.toLowerCase().includes(q)
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
      <div className="pb-4 border-b border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <span>Admin Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-primary)] font-semibold">Laboratory Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
            Admin Laboratory Control & Analytics Dashboard
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            System-wide practical lab course oversight, faculty assignments, batch progress tracking, and student completion matrices.
          </p>
        </div>

        {/* Quick Admin Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/admin/labs/mapping')}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            Faculty Mappings
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/labs/courses')}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            Manage Courses
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/labs/config')}
            className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lab Config & Release Windows
          </button>
        </div>
      </div>

      {/* Flexible Multi-Dimensional Filter Bar */}
      <div className="panel-card p-5 space-y-4 rounded-2xl border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--accent)]" />
            Flexible Laboratory Filters
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedFaculty('ALL');
              setSelectedCourse('ALL');
              setSelectedSection('ALL');
              setSearchQuery('');
            }}
            className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reset Filters
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Faculty Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Handling Faculty
            </label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="ALL">ALL Faculty Members</option>
              {(analytics?.faculty || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.department || 'Faculty'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Course Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Practical Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="ALL">ALL Practical Courses</option>
              {(analytics?.courses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Batch / Section Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Batch / Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="ALL">ALL Batches & Sections</option>
              {(analytics?.sections || ['A', 'B', 'C']).map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Student Search Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Student Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or roll no..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </form>
      </div>

      {/* High-Level KPI Dashboard Summary */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" /> Active Courses
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-[var(--text-primary)]">
              {analytics.summary?.total_courses || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Configured practical labs
            </span>
          </div>

          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" /> Mapped Faculty
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-500">
              {analytics.summary?.mapped_faculty_count || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Assigned lab incharges
            </span>
          </div>

          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Enrolled Students
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-500">
              {analytics.summary?.total_students || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Across target sections
            </span>
          </div>

          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Completion Rate
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
              {analytics.summary?.avg_completion_pct || 0}%
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              {analytics.summary?.approved_submissions || 0} verified labs
            </span>
          </div>

          <div className="panel-card p-4 space-y-1 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Viva Voce Queue
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-500">
              {analytics.summary?.pending_reviews || 0}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              Pending oral evaluation
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs for Views */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('STUDENT_MATRIX')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'STUDENT_MATRIX'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Global Student Matrix ({filteredStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COURSE_MATRIX')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'COURSE_MATRIX'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Courses & Faculty Overview ({(analytics?.courses || []).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FACULTY_DIRECTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'FACULTY_DIRECTORY'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Faculty Assignments ({(analytics?.faculty || []).length})
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV Report
        </button>
      </div>

      {/* Loading Analytics State */}
      {loading && (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] space-y-3">
          <Clock className="w-7 h-7 animate-spin mx-auto text-[var(--accent)]" />
          <p className="font-semibold text-sm">Loading comprehensive laboratory analytics...</p>
        </div>
      )}

      {/* TAB 1: GLOBAL STUDENT PROGRESS MATRIX */}
      {!loading && activeTab === 'STUDENT_MATRIX' && (
        <div className="panel-card p-6 space-y-4 rounded-2xl border border-[var(--border)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                Global Student Experiment Completion Matrix
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Click any student row to view individual experiment audit history, submission attempts, and manual override controls.
              </p>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
              No student records match your active filters.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[180px]">Student</th>
                    <th className="py-3 px-3 text-center">Sec</th>
                    <th className="py-3 px-3 text-center">Department</th>
                    <th className="py-3 px-3 text-center">Progress</th>
                    <th className="py-3 px-3 text-center">Total Marks</th>
                    <th className="py-3 px-3 text-center">Score %</th>
                    {(analytics?.experiments || []).map((exp) => (
                      <th key={exp.id} className="py-3 px-2 text-center font-mono" title={exp.title}>
                        Ex {exp.experiment_no}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredStudents.map((st) => (
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
                      <td className="py-3 px-3 text-center text-[11px] text-[var(--text-muted)]">
                        {st.department || 'N/A'}
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
                          {getStatusPill(exp.status, exp.marks)}
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
                          title="View student deep-dive & window overrides"
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
      )}

      {/* TAB 2: COURSES & FACULTY MAPPING OVERVIEW */}
      {!loading && activeTab === 'COURSE_MATRIX' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(analytics?.courses || []).map((course) => (
            <div key={course.id} className="panel-card p-5 space-y-4 rounded-2xl border border-[var(--border)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                      {course.course_code}
                    </span>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mt-1 leading-tight">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/admin/labs/courses/${course.id}/experiments`)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
                >
                  Experiments &rarr;
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Mapped Faculty Incharges:</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {course.assigned_faculty?.length > 0 ? course.assigned_faculty.join(', ') : 'None Mapped'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Assigned Batches / Sections:</span>
                  <span className="font-bold text-emerald-600">
                    {course.assigned_sections?.length > 0 ? course.assigned_sections.join(', ') : 'ALL Sections'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>Total Experiments Configured:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {course.total_experiments || 7} Experiments
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Class Avg Completion Rate:</span>
                <span className="font-mono font-bold text-[var(--accent)]">
                  {course.avg_completion_pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: FACULTY ASSIGNMENTS DIRECTORY */}
      {!loading && activeTab === 'FACULTY_DIRECTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(analytics?.faculty || []).map((fac) => {
            const facMappings = (analytics?.faculty_mappings || []).filter((m) => m.faculty_id === fac.id);

            return (
              <div key={fac.id} className="panel-card p-5 space-y-4 rounded-2xl border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] flex items-center justify-center font-bold text-sm">
                    {fac.name?.charAt(0) || 'F'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{fac.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">{fac.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                    Assigned Courses ({facMappings.length})
                  </span>
                  {facMappings.length === 0 ? (
                    <span className="text-[11px] text-[var(--text-muted)] italic">No lab courses assigned yet.</span>
                  ) : (
                    <div className="space-y-1.5">
                      {facMappings.map((m) => (
                        <div key={m.id} className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-[var(--text-primary)] block">
                              {m.course?.course_code || `Course #${m.course_id}`}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] block">
                              {m.course?.title}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Sec {m.section}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Department:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{fac.department || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Deep-Dive Analytics Drawer */}
      {selectedStudentDrawer && (
        <LabStudentAnalyticsDrawer
          isOpen={!!selectedStudentDrawer}
          onClose={() => setSelectedStudentDrawer(null)}
          studentData={selectedStudentDrawer}
          onOpenScheduleOverride={() => {
            navigate('/admin/labs/config');
          }}
        />
      )}
    </div>
  );
}
