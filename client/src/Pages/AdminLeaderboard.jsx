import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Star,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Users,
  BarChart3,
  Flame,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Layers,
  Video,
  Zap,
  Target,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  RotateCcw
} from 'lucide-react';
import api from '../api/axios';
import { SkeletonTableRows, SkeletonStatsGrid } from '../Components/Skeleton';

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Leaderboard Tab: 'total_points' | 'points_per_interview'
  const [activeTab, setActiveTab] = useState('total_points');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [tracks, setTracks] = useState([]);
  const [sortField, setSortField] = useState('total_points');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total_records: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  // Detailed Modal for viewing an individual student's scorecard & interview performance breakdown
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [serverDepartments, setServerDepartments] = useState([]);

  // Load Interview Tracks / Domains and distinct student departments from DB
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await api.get('/admin/interviews/tracks');
        const data = res?.data?.data || res?.data || [];
        if (Array.isArray(data)) {
          setTracks(data);
        }
      } catch (err) {
        console.error('Failed to load interview tracks:', err);
      }
    };
    const fetchDepts = async () => {
      try {
        const res = await api.get('/admin/departments');
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setServerDepartments(list.filter(d => d && d.trim()));
        }
      } catch (err) {
        console.error('Failed to load student departments:', err);
      }
    };
    fetchTracks();
    fetchDepts();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('sort_by', sortField);
      params.append('order', sortOrder);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (selectedDept !== 'all') {
        params.append('department', selectedDept);
      }
      if (selectedDomain !== 'all') {
        params.append('track_id', selectedDomain);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const res = await api.get(`/admin/feedback/leaderboard?${params.toString()}`);
      const data = res?.data?.data || res?.data || res;
      setLeaderboard(data.leaderboard || []);
      if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
        setServerDepartments(data.departments);
      }
      setStats(data.stats || null);
      if (data.pagination || res?.pagination) {
        setPagination(data.pagination || res.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [page, limit, sortField, sortOrder, selectedDept, selectedDomain]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLeaderboard();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // When switching between Total Points and Points/Interview tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSortField(tab);
    setSortOrder('desc');
  };

  // Reset all active filters to default
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDept('all');
    setSelectedDomain('all');
    setSortField(activeTab);
    setSortOrder('desc');
  };

  // Unique list of departments from student records
  const departments = useMemo(() => {
    if (serverDepartments && serverDepartments.length > 0) {
      return serverDepartments;
    }
    const depts = new Set();
    leaderboard.forEach((s) => {
      if (s.department && s.department.trim()) {
        depts.add(s.department.trim());
      }
    });
    return Array.from(depts);
  }, [serverDepartments, leaderboard]);

  // Top 3 Podium Students
  const topThree = useMemo(() => {
    return leaderboard
      .filter((s) => (s.interviews_attended > 0 || s.matches_count > 0 || s.total_score > 0))
      .slice(0, 3);
  }, [leaderboard]);

  const hasActiveFilters = searchTerm.trim() !== '' || selectedDept !== 'all' || selectedDomain !== 'all';

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            Leaderboard
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            {activeTab === 'total_points'
              ? 'Ranked student leaderboard by cumulative total points gained across all mock interviews.'
              : 'Ranked student leaderboard by average points scored per completed mock interview.'}
          </p>
        </div>

        {/* 2 Dedicated Leaderboard Tabs */}
        <div className="inline-flex items-center p-1 bg-[var(--bg-raised)] rounded-[var(--radius-md)] border border-[var(--border)] shadow-xs self-start sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleTabChange('total_points')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'total_points'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Total Points Gained</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('points_per_interview')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'points_per_interview'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Points / Interview</span>
          </button>
        </div>
      </div>

      {/* Cohort KPI Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="panel-card p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] uppercase">
              <span>Active Students</span>
              <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
            </div>
            <div className="text-[22px] font-bold text-[var(--text-primary)] font-mono">
              {stats.active_students ?? stats.evaluated_students ?? 0}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">/ {stats.total_students ?? 0} total</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono">
              {stats.evaluated_students ?? 0} students evaluated
            </div>
          </div>

          <div className="panel-card p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] uppercase">
              <span>Total Interviews Completed</span>
              <Video className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-[22px] font-bold text-[var(--text-primary)] font-mono">
              {stats.total_interviews_attended ?? stats.total_reviews ?? 0}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">
              {stats.total_reviews ?? 0} peer evaluations logged
            </div>
          </div>

          <div className="panel-card p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] uppercase">
              <span>Cohort Average</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-[22px] font-bold text-purple-600 dark:text-purple-400 font-mono">
              {stats.overall_avg_score ? stats.overall_avg_score.toFixed(1) : '0.0'}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">pts/student</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono">
              {stats.overall_avg_percentage ? `${stats.overall_avg_percentage.toFixed(0)}% average score` : '—'}
            </div>
          </div>

          <div className="panel-card p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] uppercase">
              <span>
                {activeTab === 'total_points' ? 'Top Total Points' : 'Top Pts / Interview'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-[22px] font-bold text-purple-600 dark:text-purple-400 font-mono truncate">
              {activeTab === 'total_points'
                ? stats.top_scorer_by_total?.total_score != null
                  ? `${stats.top_scorer_by_total.total_score.toFixed(0)} pts`
                  : stats.top_scorer?.total_score != null
                  ? `${stats.top_scorer.total_score.toFixed(0)} pts`
                  : '—'
                : stats.top_scorer_by_avg?.points_per_interview != null
                ? `${stats.top_scorer_by_avg.points_per_interview.toFixed(1)} pts/int`
                : '—'}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono truncate">
              {activeTab === 'total_points'
                ? stats.top_scorer_by_total?.name || stats.top_scorer?.name || 'No students evaluated yet'
                : stats.top_scorer_by_avg?.name || 'No students evaluated yet'}
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {topThree.length >= 3 && !hasActiveFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Rank 2 (Silver / Purple Light) */}
          <div className="panel-card p-5 rounded-[var(--radius-lg)] bg-gradient-to-b from-purple-500/5 to-[var(--bg-card)] border border-purple-500/20 flex flex-col justify-between relative overflow-hidden shadow-md md:order-1">
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 flex items-center justify-center font-mono font-bold text-xs shadow-xs border border-purple-300 dark:border-purple-700">
              #2
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold">
                <Medal className="w-3.5 h-3.5 text-purple-500" />
                <span>Rank 2 Leader</span>
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] truncate">{topThree[1]?.name}</h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                {topThree[1]?.roll_no || 'STUDENT'} • {topThree[1]?.department || 'General'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-end justify-between">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono block">
                  {activeTab === 'total_points' ? 'Total Points Gained' : 'Points / Interview'}
                </span>
                <span className="text-[20px] font-bold text-[var(--text-primary)] font-mono">
                  {activeTab === 'total_points'
                    ? `${(topThree[1]?.total_score || 0).toFixed(0)} pts`
                    : `${(topThree[1]?.points_per_interview || topThree[1]?.avg_score_per_match || 0).toFixed(1)} pts/int`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                  {topThree[1]?.interviews_attended || topThree[1]?.matches_count || 0} attended
                </span>
                <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {(topThree[1]?.score_percentage || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Rank 1 (Top Purple Highlighted) */}
          <div className="panel-card p-5 rounded-[var(--radius-lg)] bg-gradient-to-b from-purple-500/15 via-purple-500/5 to-[var(--bg-card)] border-2 border-purple-500/40 flex flex-col justify-between relative overflow-hidden shadow-xl scale-102 md:order-2">
            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-md">
              #1
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold">
                <Trophy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Top Leader</span>
              </div>
              <h3 className="text-[19px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                <span>{topThree[0]?.name}</span>
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] font-mono">
                {topThree[0]?.roll_no || 'STUDENT'} • {topThree[0]?.department || 'General'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-end justify-between">
              <div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-mono font-bold block">
                  {activeTab === 'total_points' ? 'Top Total Points' : 'Top Points / Interview'}
                </span>
                <span className="text-[24px] font-bold text-purple-600 dark:text-purple-400 font-mono">
                  {activeTab === 'total_points'
                    ? `${(topThree[0]?.total_score || 0).toFixed(0)} pts`
                    : `${(topThree[0]?.points_per_interview || topThree[0]?.avg_score_per_match || 0).toFixed(1)} pts/int`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 block font-semibold">
                  {topThree[0]?.interviews_attended || topThree[0]?.matches_count || 0} attended
                </span>
                <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-200 bg-purple-500/20 px-2.5 py-1 rounded border border-purple-500/30">
                  {(topThree[0]?.score_percentage || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Rank 3 (Purple Subtle) */}
          <div className="panel-card p-5 rounded-[var(--radius-lg)] bg-gradient-to-b from-purple-950/10 to-[var(--bg-card)] border border-purple-500/20 flex flex-col justify-between relative overflow-hidden shadow-md md:order-3">
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200 flex items-center justify-center font-mono font-bold text-xs shadow-xs border border-purple-200 dark:border-purple-800">
              #3
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold">
                <Medal className="w-3.5 h-3.5 text-purple-500" />
                <span>Rank 3 Performer</span>
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] truncate">{topThree[2]?.name}</h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                {topThree[2]?.roll_no || 'STUDENT'} • {topThree[2]?.department || 'General'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-end justify-between">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono block">
                  {activeTab === 'total_points' ? 'Total Points Gained' : 'Points / Interview'}
                </span>
                <span className="text-[20px] font-bold text-[var(--text-primary)] font-mono">
                  {activeTab === 'total_points'
                    ? `${(topThree[2]?.total_score || 0).toFixed(0)} pts`
                    : `${(topThree[2]?.points_per_interview || topThree[2]?.avg_score_per_match || 0).toFixed(1)} pts/int`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                  {topThree[2]?.interviews_attended || topThree[2]?.matches_count || 0} attended
                </span>
                <span className="text-xs font-mono font-bold text-purple-800 dark:text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/25">
                  {(topThree[2]?.score_percentage || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="panel-card p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students by name, roll number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="custom-input search-input w-full text-xs py-2"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Dept:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="custom-input text-xs py-1.5 px-2 font-mono"
              >
                <option value="all">All Depts</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Domain / Interview Track Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Domain:</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="custom-input text-xs py-1.5 px-2 font-mono"
              >
                <option value="all">All Domains</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-[var(--red)] border-red-500/20 hover:bg-red-500/10 font-mono"
                title="Reset active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchLeaderboard}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-mono font-bold"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table (Distinct for each tab) */}
      <div className="panel-card bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto animate-fadeIn">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Dept / Roll No</th>
                  <th className="py-3 px-4 text-center">Attended</th>
                  <th className="py-3 px-4 text-right">Points</th>
                  <th className="py-3 px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <SkeletonTableRows rows={8} cols={6} />
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[var(--red)] space-y-2">
            <p className="text-sm font-bold">{error}</p>
            <button onClick={fetchLeaderboard} className="btn btn-secondary text-xs py-1 px-3">
              Try Again
            </button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No Students Found</p>
            <p className="text-xs">No student matches the selected filter criteria.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn btn-secondary text-xs py-1 px-3 inline-flex items-center gap-1 mt-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        ) : activeTab === 'total_points' ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => {
                      setSortField('name');
                      setSortOrder(sortField === 'name' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Student</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Department</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => {
                      setSortField('interviews_attended');
                      setSortOrder(sortField === 'interviews_attended' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Interviews Attended</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer text-[var(--accent)] font-bold hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSortField('total_points');
                      setSortOrder(sortField === 'total_points' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Points Gained</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {leaderboard.map((student) => {
                  const attended = student.interviews_attended ?? student.matches_count ?? 0;
                  const totalScore = student.total_score ?? 0;
                  const isTop3 = student.rank <= 3 && (attended > 0 || totalScore > 0);

                  return (
                    <tr
                      key={student.student_id}
                      className={`hover:bg-[var(--bg-hover)] transition-colors ${
                        student.rank === 1 && (attended > 0 || totalScore > 0)
                          ? 'bg-purple-500/5 dark:bg-purple-500/5'
                          : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center font-mono">
                        {student.rank === 1 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold inline-flex items-center justify-center text-xs shadow-xs">
                            1
                          </span>
                        ) : student.rank === 2 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700 font-bold inline-flex items-center justify-center text-xs shadow-xs">
                            2
                          </span>
                        ) : student.rank === 3 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold inline-flex items-center justify-center text-xs shadow-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] font-bold">#{student.rank}</span>
                        )}
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-bold font-mono flex items-center justify-center text-xs border border-[var(--border-accent)] shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              <span>{student.name}</span>
                              {isTop3 && <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">
                              {student.roll_no || 'NO ROLL'} • {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                        {student.department || 'General'}
                      </td>

                      {/* Interviews Attended */}
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-[var(--text-primary)]">
                          <Video className="w-3 h-3 text-[var(--accent)]" />
                          <span>{attended}</span>
                        </span>
                      </td>

                      {/* Total Points Gained */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-0.5">
                          <span className="text-[14px] font-extrabold text-[var(--accent)]">
                            {totalScore.toFixed(0)} pts
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            / {student.total_max_score ? student.total_max_score.toFixed(0) : '0'} max
                          </span>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 ml-auto font-mono hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          title="View student's interview scorecard and evaluation breakdown"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Scorecard</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => {
                      setSortField('name');
                      setSortOrder(sortField === 'name' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Student</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Department</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => {
                      setSortField('interviews_attended');
                      setSortOrder(sortField === 'interviews_attended' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Interviews Attended</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer text-[var(--accent)] font-bold hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSortField('points_per_interview');
                      setSortOrder(sortField === 'points_per_interview' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Points / Interview</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {leaderboard.map((student) => {
                  const attended = student.interviews_attended ?? student.matches_count ?? 0;
                  const totalScore = student.total_score ?? 0;
                  const pointsPerInt = student.points_per_interview ?? student.avg_score_per_match ?? 0;
                  const isTop3 = student.rank <= 3 && (attended > 0 || totalScore > 0);

                  return (
                    <tr
                      key={student.student_id}
                      className={`hover:bg-[var(--bg-hover)] transition-colors ${
                        student.rank === 1 && (attended > 0 || totalScore > 0)
                          ? 'bg-purple-500/5 dark:bg-purple-500/5'
                          : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center font-mono">
                        {student.rank === 1 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold inline-flex items-center justify-center text-xs shadow-xs">
                            1
                          </span>
                        ) : student.rank === 2 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700 font-bold inline-flex items-center justify-center text-xs shadow-xs">
                            2
                          </span>
                        ) : student.rank === 3 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold inline-flex items-center justify-center text-xs shadow-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] font-bold">#{student.rank}</span>
                        )}
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-bold font-mono flex items-center justify-center text-xs border border-[var(--border-accent)] shrink-0">
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              <span>{student.name}</span>
                              {isTop3 && <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">
                              {student.roll_no || 'NO ROLL'} • {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                        {student.department || 'General'}
                      </td>

                      {/* Interviews Attended */}
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-[var(--text-primary)]">
                          <Video className="w-3 h-3 text-[var(--accent)]" />
                          <span>{attended}</span>
                        </span>
                      </td>

                      {/* Points / Interview Attended */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-0.5">
                          <span className="text-[14px] font-extrabold text-[var(--accent)]">
                            {pointsPerInt.toFixed(1)} pts
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            avg / interview
                          </span>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 ml-auto font-mono hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          title="View student's interview scorecard and evaluation breakdown"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Scorecard</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.total_records > 0 && (
          <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-raised)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-[var(--text-primary)] font-mono">{((page - 1) * limit) + 1}</strong> to{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {Math.min(page * limit, pagination.total_records)}
                </strong>{' '}
                of <strong className="text-[var(--text-primary)] font-mono">{pagination.total_records}</strong> ranked students
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] font-mono focus:outline-hidden focus:border-[var(--accent)]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.has_prev || loading}
                className="px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded font-semibold text-[var(--text-primary)]">
                {page} / {pagination.total_pages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages || 1, p + 1))}
                disabled={!pagination.has_next || loading}
                className="px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Comprehensive Student Scorecard & Performance Breakdown */}
      {selectedStudent && (
        <div 
          onClick={() => setSelectedStudent(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel-card w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-bold font-mono flex items-center justify-center text-sm border border-[var(--border-accent)]">
                  {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)]">{selectedStudent.name}</h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {selectedStudent.roll_no || 'NO ROLL'} • {selectedStudent.department || 'General'} • Rank #{selectedStudent.rank}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performance Summary Metrics */}
            <div className="px-6 py-3.5 bg-[var(--bg-card)] border-b border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-2.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Total Points</span>
                <span className="text-[17px] font-bold text-[var(--accent)]">
                  {(selectedStudent.total_score || 0).toFixed(0)} pts
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  / {(selectedStudent.total_max_score || 0).toFixed(0)} max
                </span>
              </div>

              <div className="p-2.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Interviews Attended</span>
                <span className="text-[17px] font-bold text-[var(--text-primary)]">
                  {selectedStudent.interviews_attended ?? selectedStudent.matches_count ?? 0}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  sessions
                </span>
              </div>

              <div className="p-2.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Points / Interview</span>
                <span className="text-[17px] font-bold text-purple-600 dark:text-purple-400">
                  {(selectedStudent.points_per_interview || selectedStudent.avg_score_per_match || 0).toFixed(1)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  pts / session
                </span>
              </div>

              <div className="p-2.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Percentage</span>
                <span className="text-[17px] font-bold text-purple-600 dark:text-purple-400">
                  {(selectedStudent.score_percentage || 0).toFixed(0)}%
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-bold">
                  {selectedStudent.grade}
                </span>
              </div>
            </div>

            {/* Match History List */}
            <div className="p-6 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
              <h4 className="text-[12px] font-mono uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                Evaluations Received for Attended Mock Interviews ({selectedStudent.recent_sessions?.length || 0})
              </h4>

              {selectedStudent.recent_sessions && selectedStudent.recent_sessions.length > 0 ? (
                selectedStudent.recent_sessions.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-between gap-3 font-mono text-xs shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span>{rec.track_title || 'Mock Interview Track'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]">
                          Session #{rec.session_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Evaluated by: <strong>{rec.reviewer_name}</strong> •{' '}
                        {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-bold text-[var(--accent)]">
                        +{rec.total_score} / {rec.max_score} pts
                      </div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                        {rec.score_percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-[var(--radius-md)]">
                  No evaluations recorded for this student yet.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--bg-raised)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="btn btn-primary text-xs py-1.5 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
