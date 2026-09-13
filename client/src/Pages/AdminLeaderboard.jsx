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
  RotateCcw
} from 'lucide-react';
import api from '../api/axios';

export default function AdminLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Primary Ranking Metric Mode:
  // 'total_points' | 'points_per_interview' | 'interviews_attended' | 'percentage'
  const [metricMode, setMetricMode] = useState('total_points');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [minInterviews, setMinInterviews] = useState(0);
  const [minPoints, setMinPoints] = useState(0);
  const [sortField, setSortField] = useState('total_points');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Detailed Modal for viewing an individual student's scorecard & interview performance breakdown
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('sort_by', sortField);
      params.append('order', sortOrder);
      if (selectedDept !== 'all') {
        params.append('department', selectedDept);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (minInterviews > 0) {
        params.append('min_matches', minInterviews);
      }
      if (minPoints > 0) {
        params.append('min_points', minPoints);
      }

      const res = await api.get(`/admin/feedback/leaderboard?${params.toString()}`);
      const data = res?.data?.data || res?.data || res;
      setLeaderboard(data.leaderboard || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortField, sortOrder, selectedDept, minInterviews, minPoints]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeaderboard();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // When Metric Mode toggles, update primary sorting
  const handleMetricModeChange = (mode) => {
    setMetricMode(mode);
    if (mode === 'total_points') {
      setSortField('total_points');
      setSortOrder('desc');
    } else if (mode === 'points_per_interview') {
      setSortField('points_per_interview');
      setSortOrder('desc');
    } else if (mode === 'interviews_attended') {
      setSortField('interviews_attended');
      setSortOrder('desc');
    } else if (mode === 'percentage') {
      setSortField('percentage');
      setSortOrder('desc');
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDept('all');
    setMinInterviews(0);
    setMinPoints(0);
    setMetricMode('total_points');
    setSortField('total_points');
    setSortOrder('desc');
  };

  // Unique list of departments
  const departments = useMemo(() => {
    const depts = new Set();
    leaderboard.forEach((s) => {
      if (s.department && s.department.trim()) {
        depts.add(s.department.trim());
      }
    });
    return Array.from(depts);
  }, [leaderboard]);

  // Top 3 Podium Students
  const topThree = useMemo(() => {
    return leaderboard
      .filter((s) => (s.interviews_attended > 0 || s.matches_count > 0 || s.total_score > 0))
      .slice(0, 3);
  }, [leaderboard]);

  const getGradeBadge = (grade, pct, attended) => {
    if (attended === 0 && (!pct || pct === 0)) {
      return {
        bg: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        dot: 'bg-zinc-400',
        label: 'Unranked',
      };
    }
    if (pct >= 85) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500',
        label: 'Outstanding (A+)',
      };
    }
    if (pct >= 70) {
      return {
        bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        dot: 'bg-purple-500',
        label: 'Proficient (B)',
      };
    }
    if (pct >= 50) {
      return {
        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500',
        label: 'Average (C)',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      dot: 'bg-rose-500',
      label: 'Needs Practice',
    };
  };

  const hasActiveFilters = searchTerm.trim() !== '' || selectedDept !== 'all' || minInterviews > 0 || minPoints > 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Student Performance Rankings</span>
          </div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            Person-Wise Interview Leaderboard
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Ranked student performance scorecards calculated by total points gained and interview attendance volume.
          </p>
        </div>

        {/* Primary Ranking Metric Toggle Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-raised)] rounded-[var(--radius-md)] border border-[var(--border)] shadow-xs flex-wrap self-start lg:self-auto">
          <button
            type="button"
            onClick={() => handleMetricModeChange('total_points')}
            className={`px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all flex items-center gap-1.5 ${
              metricMode === 'total_points'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Rank students by overall cumulative points gained"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Total Points Gained</span>
          </button>

          <button
            type="button"
            onClick={() => handleMetricModeChange('points_per_interview')}
            className={`px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all flex items-center gap-1.5 ${
              metricMode === 'points_per_interview'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Rank students by Points / Number of Interviews Attended"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Points / Interview</span>
          </button>

          <button
            type="button"
            onClick={() => handleMetricModeChange('interviews_attended')}
            className={`px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all flex items-center gap-1.5 ${
              metricMode === 'interviews_attended'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Rank students by number of interviews attended"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Interviews Attended</span>
          </button>

          <button
            type="button"
            onClick={() => handleMetricModeChange('percentage')}
            className={`px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all flex items-center gap-1.5 ${
              metricMode === 'percentage'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Rank students by percentage score"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Percentage (%)</span>
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
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-[22px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.overall_avg_score ? stats.overall_avg_score.toFixed(1) : '0.0'}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">pts/student</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono">
              {stats.overall_avg_percentage ? `${stats.overall_avg_percentage.toFixed(0)}% average score` : '—'}
            </div>
          </div>

          <div className="panel-card p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] uppercase">
              <span>Top Total Points Scorer</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-[22px] font-bold text-amber-500 font-mono truncate">
              {stats.top_scorer_by_total?.total_score != null
                ? `${stats.top_scorer_by_total.total_score.toFixed(0)} pts`
                : stats.top_scorer?.total_score != null
                ? `${stats.top_scorer.total_score.toFixed(0)} pts`
                : '—'}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono truncate">
              {stats.top_scorer_by_total?.name || stats.top_scorer?.name || 'No students evaluated yet'}
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {topThree.length >= 3 && !hasActiveFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Rank 2 (Silver) */}
          <div className="panel-card p-5 rounded-[var(--radius-lg)] bg-gradient-to-b from-slate-500/10 to-[var(--bg-card)] border border-slate-400/30 flex flex-col justify-between relative overflow-hidden shadow-md md:order-1">
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              #2
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-500 font-bold">
                <Medal className="w-3.5 h-3.5 text-slate-400" />
                <span>Silver Performer</span>
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] truncate">{topThree[1]?.name}</h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                {topThree[1]?.roll_no || 'STUDENT'} • {topThree[1]?.department || 'General'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-end justify-between">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono block">
                  {metricMode === 'points_per_interview'
                    ? 'Points / Interview'
                    : metricMode === 'interviews_attended'
                    ? 'Interviews Attended'
                    : 'Total Points Gained'}
                </span>
                <span className="text-[20px] font-bold text-[var(--text-primary)] font-mono">
                  {metricMode === 'points_per_interview'
                    ? `${(topThree[1]?.points_per_interview || topThree[1]?.avg_score_per_match || 0).toFixed(1)} pts`
                    : metricMode === 'interviews_attended'
                    ? `${topThree[1]?.interviews_attended || topThree[1]?.matches_count || 0} int.`
                    : `${(topThree[1]?.total_score || 0).toFixed(0)} pts`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                  {topThree[1]?.interviews_attended || topThree[1]?.matches_count || 0} attended
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
                  {(topThree[1]?.score_percentage || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Rank 1 (Gold - Center Highlighted) */}
          <div className="panel-card p-5 rounded-[var(--radius-lg)] bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-[var(--bg-card)] border-2 border-amber-500/40 flex flex-col justify-between relative overflow-hidden shadow-xl scale-102 md:order-2">
            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 flex items-center justify-center font-mono font-bold text-sm shadow-md">
              #1
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-amber-500 font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Gold Leader</span>
              </div>
              <h3 className="text-[19px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                <span>{topThree[0]?.name}</span>
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] font-mono">
                {topThree[0]?.roll_no || 'STUDENT'} • {topThree[0]?.department || 'General'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-end justify-between">
              <div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-mono font-bold block">
                  {metricMode === 'points_per_interview'
                    ? 'Top Points / Interview'
                    : metricMode === 'interviews_attended'
                    ? 'Top Attendance'
                    : 'Top Total Points'}
                </span>
                <span className="text-[24px] font-bold text-amber-500 font-mono">
                  {metricMode === 'points_per_interview'
                    ? `${(topThree[0]?.points_per_interview || topThree[0]?.avg_score_per_match || 0).toFixed(1)} pts`
                    : metricMode === 'interviews_attended'
                    ? `${topThree[0]?.interviews_attended || topThree[0]?.matches_count || 0} interviews`
                    : `${(topThree[0]?.total_score || 0).toFixed(0)} pts`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block font-semibold">
                  {topThree[0]?.interviews_attended || topThree[0]?.matches_count || 0} attended
                </span>
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30">
                  {(topThree[0]?.score_percentage || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="panel-card p-5 rounded-[var(--radius-lg)] bg-gradient-to-b from-amber-700/10 to-[var(--bg-card)] border border-amber-700/30 flex flex-col justify-between relative overflow-hidden shadow-md md:order-3">
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              #3
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400 font-bold">
                <Medal className="w-3.5 h-3.5 text-amber-600" />
                <span>Bronze Performer</span>
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] truncate">{topThree[2]?.name}</h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                {topThree[2]?.roll_no || 'STUDENT'} • {topThree[2]?.department || 'General'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-end justify-between">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono block">
                  {metricMode === 'points_per_interview'
                    ? 'Points / Interview'
                    : metricMode === 'interviews_attended'
                    ? 'Interviews Attended'
                    : 'Total Points Gained'}
                </span>
                <span className="text-[20px] font-bold text-[var(--text-primary)] font-mono">
                  {metricMode === 'points_per_interview'
                    ? `${(topThree[2]?.points_per_interview || topThree[2]?.avg_score_per_match || 0).toFixed(1)} pts`
                    : metricMode === 'interviews_attended'
                    ? `${topThree[2]?.interviews_attended || topThree[2]?.matches_count || 0} int.`
                    : `${(topThree[2]?.total_score || 0).toFixed(0)} pts`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                  {topThree[2]?.interviews_attended || topThree[2]?.matches_count || 0} attended
                </span>
                <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-700/15 px-2 py-0.5 rounded border border-amber-700/25">
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
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students by name, roll number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="custom-input w-full pl-9 text-xs py-2"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter by Interviews Attended */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Interviews Attended:</span>
              <select
                value={minInterviews}
                onChange={(e) => setMinInterviews(Number(e.target.value))}
                className="custom-input text-xs py-1.5 px-2 font-mono"
              >
                <option value="0">All Students (0+)</option>
                <option value="1">1+ Interviews</option>
                <option value="2">2+ Interviews</option>
                <option value="3">3+ Interviews</option>
                <option value="5">5+ Interviews</option>
              </select>
            </div>

            {/* Filter by Total Points Threshold */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Min Points:</span>
              <select
                value={minPoints}
                onChange={(e) => setMinPoints(Number(e.target.value))}
                className="custom-input text-xs py-1.5 px-2 font-mono"
              >
                <option value="0">All Points</option>
                <option value="10">10+ pts</option>
                <option value="25">25+ pts</option>
                <option value="50">50+ pts</option>
                <option value="100">100+ pts</option>
              </select>
            </div>

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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-[var(--red)] border-red-500/20 hover:bg-red-500/10 font-mono"
                title="Reset all filters"
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

      {/* Main Person-Wise Leaderboard Table */}
      <div className="panel-card bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
            <p className="text-xs text-[var(--text-muted)] font-mono">Calculating points & generating person-wise leaderboard...</p>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
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
                    className={`py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors ${
                      metricMode === 'interviews_attended' ? 'text-[var(--accent)] font-bold' : ''
                    }`}
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
                    className={`py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors ${
                      metricMode === 'total_points' ? 'text-[var(--accent)] font-bold' : ''
                    }`}
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
                  <th
                    className={`py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors ${
                      metricMode === 'points_per_interview' ? 'text-[var(--accent)] font-bold' : ''
                    }`}
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
                  <th
                    className={`py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors ${
                      metricMode === 'percentage' ? 'text-[var(--accent)] font-bold' : ''
                    }`}
                    onClick={() => {
                      setSortField('percentage');
                      setSortOrder(sortField === 'percentage' && sortOrder === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Score %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {leaderboard.map((student) => {
                  const attended = student.interviews_attended ?? student.matches_count ?? 0;
                  const totalScore = student.total_score ?? 0;
                  const pointsPerInt = student.points_per_interview ?? student.avg_score_per_match ?? 0;
                  const pct = student.score_percentage ?? 0;
                  const badge = getGradeBadge(student.grade, pct, attended);
                  const isTop3 = student.rank <= 3 && (attended > 0 || totalScore > 0);

                  return (
                    <tr
                      key={student.student_id}
                      className={`hover:bg-[var(--bg-hover)] transition-colors ${
                        student.rank === 1 && (attended > 0 || totalScore > 0)
                          ? 'bg-amber-500/5 dark:bg-amber-500/5'
                          : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center font-mono">
                        {student.rank === 1 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold inline-flex items-center justify-center text-xs shadow-sm">
                            1
                          </span>
                        ) : student.rank === 2 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold inline-flex items-center justify-center text-xs shadow-sm">
                            2
                          </span>
                        ) : student.rank === 3 && (attended > 0 || totalScore > 0) ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-bold inline-flex items-center justify-center text-xs shadow-sm">
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
                              {isTop3 && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
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
                          <span className={`text-[13px] font-bold ${
                            metricMode === 'total_points' ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--text-primary)]'
                          }`}>
                            {totalScore.toFixed(0)} pts
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            / {student.total_max_score ? student.total_max_score.toFixed(0) : '0'} max
                          </span>
                        </div>
                      </td>

                      {/* Points / Interview Attended */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-0.5">
                          <span className={`text-[13px] font-bold ${
                            metricMode === 'points_per_interview' ? 'text-amber-500 font-extrabold' : 'text-[var(--text-primary)]'
                          }`}>
                            {pointsPerInt.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            pts / interview
                          </span>
                        </div>
                      </td>

                      {/* Score Percentage Bar */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[var(--text-primary)]">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[var(--bg-raised)] h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 85
                                  ? 'bg-emerald-500'
                                  : pct >= 70
                                  ? 'bg-purple-500'
                                  : pct >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Grade Badge */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border inline-flex items-center gap-1 ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
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
      </div>

      {/* Modal: Comprehensive Student Scorecard & Performance Breakdown */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="panel-card w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[85vh]">
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
                <span className="text-[17px] font-bold text-amber-500">
                  {(selectedStudent.points_per_interview || selectedStudent.avg_score_per_match || 0).toFixed(1)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  pts / session
                </span>
              </div>

              <div className="p-2.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Percentage</span>
                <span className="text-[17px] font-bold text-emerald-600 dark:text-emerald-400">
                  {(selectedStudent.score_percentage || 0).toFixed(0)}%
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
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
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
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
