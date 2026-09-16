import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Video,
  Clock,
  TrendingUp,
  Award,
  BookOpen,
  Layers,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  BarChart2,
  BarChart3,
  Calendar,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
  Activity,
  UserCheck,
  Zap,
  Target,
  FileText,
  Filter,
  GraduationCap,
  X,
  Search,
  Check
} from 'lucide-react';
import api from '../api/axios';
import { Skeleton, SkeletonStatsGrid, SkeletonTableRows } from '../Components/Skeleton';

// Searchable Dropdown Select Component
function SearchSelect({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  allLabel = 'All',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setQuery('');
        }}
        className={`w-full flex items-center justify-between gap-3 py-2 px-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border transition-all text-xs font-semibold cursor-pointer shadow-xs ${
          isOpen
            ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20 bg-[var(--bg-card)]'
            : value !== 'all'
            ? 'border-[var(--accent)]/60 bg-[var(--accent-dim)] text-[var(--accent)]'
            : 'border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-[var(--accent)] shrink-0" />}
          <span className="text-[var(--text-muted)] font-medium text-[11px] uppercase font-mono tracking-wider">
            {label}:
          </span>
          <span className="font-bold text-[13px] truncate">
            {selectedOption?.label || allLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--accent)]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-full min-w-[260px] z-50 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-lg)] py-1.5 animate-fadeIn">
          {/* Search Box */}
          <div className="px-2.5 pb-2 pt-1 border-b border-[var(--border)]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="w-full bg-[var(--bg-input)] pl-8 pr-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[var(--text-muted)] font-mono text-center">
                No matching results
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-bold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Department and Domain Filters for the Feedback Questions Bar Chart
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');

  const fetchAnalytics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const params = {};
      if (selectedDept && selectedDept !== 'all') {
        params.department = selectedDept;
      }
      if (selectedDomain && selectedDomain !== 'all') {
        params.domain = selectedDomain;
      }

      const res = await api.get('/admin/analytics/dashboard', { params });
      const payload = res?.data?.data || res?.data || null;
      if (payload) {
        setData(payload);
      } else {
        setError('No analytics data received.');
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
      setError(err?.response?.data?.message || 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch when department or domain filter changes
  useEffect(() => {
    fetchAnalytics();
  }, [selectedDept, selectedDomain]);

  const kpis = data?.kpis || {};
  const departments = data?.departments || [];
  const tracks = data?.tracks || [];
  const rawFeedbackList = data?.feedback_averages || data?.rubric_breakdown || [];
  const trackDistribution = data?.track_distribution || [];
  const gradeDistribution = data?.grade_distribution || {};
  const recentSessions = data?.recent_sessions || [];
  const topPerformers = data?.top_performers || [];

  // Options for Searchable Department and Domain Dropdowns
  const deptOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Departments' },
      ...departments.map((d) => ({ value: d, label: d })),
    ];
  }, [departments]);

  const domainOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Tracks / Domains' },
      ...tracks.map((t) => ({ value: String(t.id), label: t.title })),
    ];
  }, [tracks]);

  // Filter out text-only questions or comments
  const feedbackList = useMemo(() => {
    return rawFeedbackList.filter(
      (item) => item.question_type !== 'text' && !item.question_text?.toLowerCase().includes('additional feedback')
    );
  }, [rawFeedbackList]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasActiveFilters = selectedDept !== 'all' || selectedDomain !== 'all';

  const resetFilters = () => {
    setSelectedDept('all');
    setSelectedDomain('all');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
              Admin Analytics Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
              Live Overview
            </span>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Overall student feedback evaluation score averages, domain competencies, and mock interview performance.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-mono shadow-xs cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => navigate('/admin/leaderboard')}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            className="btn btn-secondary text-[11px] py-1 px-2.5 font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Executive KPI Cards Grid */}
      {loading && !data ? (
        <SkeletonStatsGrid count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Card 1: Total Registered Students */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Total Students</span>
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-[24px] font-bold text-[var(--text-primary)] font-mono leading-none">
                {kpis.total_students || 0}
              </span>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                Registered student cohort
              </p>
            </div>
          </div>

          {/* Card 2: Completed Interviews */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Mock Sessions</span>
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[var(--text-primary)] font-mono leading-none">
                  {kpis.completed_interviews || 0}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  / {kpis.total_interviews || 0}
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-semibold">
                {kpis.completion_rate || 0}% completion rate
              </p>
            </div>
          </div>

          {/* Card 3: Total Practice Hours */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Practice Clocked</span>
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-bold text-[var(--text-primary)] font-mono leading-none">
                  {kpis.total_practice_hours || 0}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">hrs</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                Cumulative practice time
              </p>
            </div>
          </div>

          {/* Card 4: Platform Average Score */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Overall Avg Score</span>
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[var(--text-primary)] font-mono leading-none">
                  {kpis.platform_avg_score ? `${kpis.platform_avg_score}%` : '—'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--accent)] font-mono mt-1 font-semibold">
                {kpis.platform_grade || 'Evaluated'}
              </p>
            </div>
          </div>

          {/* Card 5: Question Bank Size */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Question Bank</span>
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold text-[var(--text-primary)] font-mono leading-none">
                  {kpis.total_questions || 0}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  in {kpis.total_levels || 0} lvls
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                Across {kpis.total_tracks || 0} active tracks
              </p>
            </div>
          </div>

          {/* Card 6: Peer Reviews Evaluated */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Peer Feedbacks</span>
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-[24px] font-bold text-[var(--text-primary)] font-mono leading-none">
                {kpis.total_feedbacks_submitted || 0}
              </span>
              <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                Evaluations submitted
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Feedback Questions & Rubric Performance (X-Y Bar Chart with Dept & Domain Filter) */}
      <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] space-y-6 shadow-xs">
        {/* Section Header & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] shrink-0 mt-0.5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                Feedback Questions & Rubric Performance
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-normal">
                Overall score percentage and mark averages across all students. Filter dynamically by department and domain.
              </p>
            </div>
          </div>

          {/* Department & Domain Searchable Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <SearchSelect
              label="Dept"
              icon={GraduationCap}
              options={deptOptions}
              value={selectedDept}
              onChange={setSelectedDept}
              placeholder="Search department..."
              allLabel="All Departments"
              className="w-full sm:w-56"
            />

            <SearchSelect
              label="Domain"
              icon={Layers}
              options={domainOptions}
              value={selectedDomain}
              onChange={setSelectedDomain}
              placeholder="Search track/domain..."
              allLabel="All Tracks / Domains"
              className="w-full sm:w-64"
            />

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shadow-xs"
                title="Reset filters to All"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Indicator Badge */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] bg-[var(--accent-dim)] px-3.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-accent)]">
            <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>
              Filtering: {selectedDept !== 'all' ? `Department: ${selectedDept}` : 'All Depts'} •{' '}
              {selectedDomain !== 'all'
                ? `Domain: ${tracks.find((t) => String(t.id) === String(selectedDomain))?.title || selectedDomain}`
                : 'All Domains'}
            </span>
          </div>
        )}

        {/* Bar Chart Body */}
        {(() => {
          if (loading && !data) {
            return (
              <div className="space-y-4 animate-fadeIn py-6">
                <div className="flex items-end justify-between gap-4 h-56 px-6">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <Skeleton className="w-full rounded-t-md" style={{ height: `${30 + idx * 15}%` }} />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (!feedbackList || feedbackList.length === 0) {
            return (
              <div className="py-12 text-center space-y-3 border border-dashed border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-raised)]/50">
                <BarChart2 className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
                <h4 className="text-[15px] font-bold text-[var(--text-primary)]">No Feedback Questions Found</h4>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  {hasActiveFilters
                    ? 'No evaluations match the selected department or domain filter. Try changing your filters.'
                    : 'Once peer feedback rubrics are evaluated in mock interviews, per-question score averages will appear here.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="btn btn-secondary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 mt-2"
                  >
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* Interactive X-Y Bar Chart */}
              <div className="relative pt-6 pb-2 px-2 sm:px-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/40 border border-[var(--border)]">
                {/* Y-Axis Grid Lines & Background */}
                <div className="relative h-64 flex items-end">
                  {/* Horizontal grid guide lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                    {[100, 75, 50, 25, 0].map((pct) => (
                      <div key={pct} className="flex items-center gap-2 w-full text-[10px] font-mono text-[var(--text-muted)]">
                        <span className="w-8 text-right shrink-0">{pct}%</span>
                        <div className="h-[1px] flex-1 bg-[var(--border)]/60 border-t border-dashed border-[var(--border)]" />
                      </div>
                    ))}
                  </div>

                  {/* X-Y Bars Container */}
                  <div className="relative z-10 w-full pl-10 pr-2 h-full flex items-end justify-around gap-2 sm:gap-4 pb-8">
                    {feedbackList.map((item, idx) => {
                      const pct = Math.max(0, Math.min(100, item.score_percentage || item.avg_score_pct || 0));
                      const avgScore = item.average_score ?? item.avg_awarded_marks ?? 0;
                      const hasResponses = (item.responses_count || 0) > 0;

                      // Purple brand color bar palette
                      const barGradient = hasResponses
                        ? 'from-[#6e56cf] to-[#9065f0]'
                        : 'from-slate-400/30 to-slate-500/30';
                      const barTextColor = hasResponses
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-[var(--text-muted)]';
                      const barBorder = hasResponses
                        ? 'border-purple-500/40'
                        : 'border-[var(--border)]';

                      return (
                        <div
                          key={item.question_id || idx}
                          className="group relative flex-1 h-full flex flex-col justify-end items-center max-w-[90px]"
                        >
                          {/* Hover Tooltip Popover */}
                          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 transform -translate-y-1 group-hover:translate-y-0 w-48 text-center">
                            <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-xl text-left space-y-1 text-xs">
                              <div className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                                <span className="truncate">{item.short_label || `Question ${idx + 1}`}</span>
                                <span className={`font-mono ${barTextColor} font-extrabold`}>{pct.toFixed(0)}%</span>
                              </div>
                              <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-tight">
                                {item.question_text}
                              </p>
                              <div className="pt-1 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                                <span>
                                  Avg: <strong className="text-[var(--text-primary)]">{avgScore.toFixed(1)} / {item.max_marks}</strong>
                                </span>
                                <span>{item.responses_count} {item.responses_count === 1 ? 'eval' : 'evals'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Value Label above Bar */}
                          <div className="mb-1 text-center font-mono">
                            <span className={`text-[11px] font-bold ${barTextColor} transition-all group-hover:scale-110 block`}>
                              {hasResponses ? `${pct.toFixed(0)}%` : '0%'}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] hidden sm:block">
                              {hasResponses ? `${avgScore.toFixed(1)} pts` : '—'}
                            </span>
                          </div>

                          {/* Bar Pillar */}
                          <div className="w-full bg-[var(--bg-card)] rounded-t-[var(--radius-xs)] overflow-hidden border-t border-x border-[var(--border)] flex flex-col justify-end h-full max-h-[160px]">
                            <div
                              style={{ height: hasResponses ? `${Math.max(pct, 6)}%` : '4%' }}
                              className={`w-full bg-gradient-to-t ${barGradient} border-t ${barBorder} rounded-t-[var(--radius-xs)] shadow-sm transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-[0_0_12px_rgba(110,86,207,0.35)]`}
                            />
                          </div>

                          {/* X-Axis Label */}
                          <div className="w-full mt-2 text-center">
                            <span
                              className="text-[11px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-ui block truncate max-w-full px-0.5 transition-colors cursor-default"
                              title={`${item.short_label || item.question_text} (${item.question_text})`}
                            >
                              {item.short_label || item.question_text}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--text-muted)] block truncate uppercase">
                              {item.question_type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart Footer Indicator */}
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--text-muted)] gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                      Indicator:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#6e56cf]" />
                      <span>Evaluated Score Average</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400/40" />
                      <span>Pending Evaluations (0%)</span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px]">
                    Showing {feedbackList.length} rubric dimensions
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. Mid Grid: Track Distribution & Student Performance Cohorts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Track / Domain Breakdown (7 Cols) */}
        <div className="lg:col-span-7 panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Track & Domain Participation
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Session distribution and active student engagement across interview tracks.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/interviews')}
              className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Tracks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading && !data ? (
            <SkeletonTableRows count={3} />
          ) : trackDistribution.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-mono py-6 text-center">
              No interview tracks configured yet.
            </p>
          ) : (
            <div className="space-y-3.5">
              {trackDistribution.map((track) => (
                <div
                  key={track.track_id}
                  className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-2 hover:border-[var(--accent)]/30 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      <span>{track.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]">
                        {track.category || 'Technical'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-[var(--text-muted)]">
                        <strong>{track.student_count}</strong> students
                      </span>
                      <span className="text-[var(--accent)] font-bold">
                        {track.sessions_count} sessions ({track.share_pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden border border-[var(--border)]/40">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-[var(--accent)] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(track.share_pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Grade & Cohort Distribution (5 Cols) */}
        <div className="lg:col-span-5 panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Student Performance Cohorts
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Evaluation tier distribution based on peer score averages.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/leaderboard')}
              className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading && !data ? (
            <SkeletonTableRows count={4} />
          ) : (
            <div className="space-y-3">
              {/* Outstanding (A+) */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <strong className="text-emerald-700 dark:text-emerald-400">Outstanding (A+)</strong>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">Score &ge; 85%</p>
                  </div>
                </div>
                <span className="text-[14px] font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {gradeDistribution.outstanding || 0} students
                </span>
              </div>

              {/* Proficient (B) */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-blue-500/10 border border-blue-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div>
                    <strong className="text-blue-700 dark:text-blue-400">Proficient (B)</strong>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">Score 70% – 84%</p>
                  </div>
                </div>
                <span className="text-[14px] font-bold font-mono text-blue-700 dark:text-blue-400">
                  {gradeDistribution.proficient || 0} students
                </span>
              </div>

              {/* Average (C) */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div>
                    <strong className="text-amber-700 dark:text-amber-400">Average (C)</strong>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">Score 50% – 69%</p>
                  </div>
                </div>
                <span className="text-[14px] font-bold font-mono text-amber-700 dark:text-amber-400">
                  {gradeDistribution.average || 0} students
                </span>
              </div>

              {/* Needs Practice */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div>
                    <strong className="text-rose-700 dark:text-rose-400">Needs Practice</strong>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">Score &lt; 50%</p>
                  </div>
                </div>
                <span className="text-[14px] font-bold font-mono text-rose-700 dark:text-rose-400">
                  {gradeDistribution.needs_practice || 0} students
                </span>
              </div>

              {/* Unranked */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
                  <div>
                    <strong className="text-[var(--text-secondary)]">Unranked Cohort</strong>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">0 peer reviews received</p>
                  </div>
                </div>
                <span className="text-[14px] font-bold font-mono text-[var(--text-secondary)]">
                  {gradeDistribution.unranked || 0} students
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Grid: Recent Live Interviews & Top Student Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Live Interviews Feed (8 Cols) */}
        <div className="lg:col-span-8 panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Recent Mock Interview Sessions
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Latest conducted peer-to-peer interview meetings.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/history')}
              className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading && !data ? (
            <SkeletonTableRows count={4} />
          ) : recentSessions.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-mono py-8 text-center">
              No interview sessions conducted yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-mono uppercase text-[10px]">
                    <th className="pb-2.5 font-semibold">Session & Track</th>
                    <th className="pb-2.5 font-semibold">Participants</th>
                    <th className="pb-2.5 font-semibold">Duration</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    <th className="pb-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/50">
                  {recentSessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-[var(--bg-hover)] transition group"
                    >
                      <td className="py-3 pr-2 font-mono">
                        <div className="font-bold text-[var(--text-primary)]">
                          #{session.id} {session.track_title}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {formatDateTime(session.created_at)}
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <div className="text-[var(--text-primary)] font-semibold">
                          {session.interviewer_name}{' '}
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            ({session.interviewer_roll || 'Interviewer'})
                          </span>
                        </div>
                        <div className="text-[var(--text-secondary)] text-[11px]">
                          vs {session.interviewee_name}{' '}
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            ({session.interviewee_roll || 'Candidate'})
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-2 font-mono text-[var(--text-secondary)]">
                        {session.duration_minutes} mins
                      </td>

                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            session.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : session.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                              : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>

                      <td className="py-3 pl-2 text-right">
                        <button
                          onClick={() => navigate(`/admin/history/${session.id}`)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Student Performers Snapshot (4 Cols) */}
        <div className="lg:col-span-4 panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Top Student Leaders
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Highest accumulated points.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/leaderboard')}
              className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading && !data ? (
            <SkeletonTableRows count={4} />
          ) : topPerformers.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] font-mono py-8 text-center">
              No ranked student evaluations recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : idx === 1
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="font-bold text-[var(--text-primary)]">
                        {student.name}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">
                        {student.roll_no || student.department || 'Student'} • {student.interviews_attended} interviews
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="font-bold text-[var(--accent)]">
                      {student.total_score} pts
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {student.score_percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
