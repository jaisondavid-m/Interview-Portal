import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  RefreshCw,
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
  FileText
} from 'lucide-react';
import api from '../api/axios';
import { Skeleton, SkeletonStatsGrid, SkeletonTableRows } from '../Components/Skeleton';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Chart Controls
  const [timeframe, setTimeframe] = useState('14d'); // '7d' | '14d' | '30d'
  const [chartMetric, setChartMetric] = useState('sessions'); // 'sessions' | 'hours'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchAnalytics = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.get('/admin/analytics/dashboard');
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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpis = data?.kpis || {};
  const rawDailyActivity = data?.daily_activity || [];
  const trackDistribution = data?.track_distribution || [];
  const rubricBreakdown = data?.rubric_breakdown || [];
  const gradeDistribution = data?.grade_distribution || {};
  const recentSessions = data?.recent_sessions || [];
  const topPerformers = data?.top_performers || [];

  // Filter Daily Activity based on selected timeframe
  const filteredActivity = useMemo(() => {
    if (!rawDailyActivity.length) return [];
    const count = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : 30;
    return rawDailyActivity.slice(-count);
  }, [rawDailyActivity, timeframe]);

  // Chart Metrics Calculations
  const chartMaxVal = useMemo(() => {
    if (!filteredActivity.length) return 10;
    const vals = filteredActivity.map((d) =>
      chartMetric === 'sessions' ? d.sessions_count : d.practice_hours
    );
    const max = Math.max(...vals, 1);
    return Math.ceil(max * 1.25);
  }, [filteredActivity, chartMetric]);

  const totalTimeframeSessions = useMemo(() => {
    return filteredActivity.reduce((acc, curr) => acc + curr.sessions_count, 0);
  }, [filteredActivity]);

  const totalTimeframeHours = useMemo(() => {
    return filteredActivity.reduce((acc, curr) => acc + curr.practice_hours, 0);
  }, [filteredActivity]);

  const avgTimeframeVelocity = useMemo(() => {
    if (!filteredActivity.length) return '0.0';
    return (totalTimeframeSessions / filteredActivity.length).toFixed(1);
  }, [filteredActivity, totalTimeframeSessions]);

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
            Real-time insights on student participation, mock interview velocity, rubric competencies, and domain breakdowns.
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
      {loading ? (
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
                Cumulative audio & code time
              </p>
            </div>
          </div>

          {/* Card 4: Platform Average Score */}
          <div className="panel-card p-4 space-y-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Platform Avg Score</span>
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

      {/* 2. Interactive Time-Series Activity Velocity Chart */}
      <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-5">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight">
                Interview Activity Velocity & Session Volume
              </h2>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Daily mock interview frequency and cumulative practice time over selected timeframe.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Metric Switcher */}
            <div className="flex items-center bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-semibold">
              <button
                onClick={() => setChartMetric('sessions')}
                className={`px-3 py-1 rounded-[var(--radius-xs)] transition ${
                  chartMetric === 'sessions'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Sessions Count
              </button>
              <button
                onClick={() => setChartMetric('hours')}
                className={`px-3 py-1 rounded-[var(--radius-xs)] transition ${
                  chartMetric === 'hours'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Practice Hours
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-xs font-semibold">
              {['7d', '14d', '30d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-[var(--radius-xs)] uppercase transition ${
                    timeframe === tf
                      ? 'bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border-accent)] shadow-xs font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Badges Bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-raised)]/60 px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] flex-wrap">
          <div>
            Total in period:{' '}
            <strong className="text-[var(--text-primary)]">
              {chartMetric === 'sessions' ? `${totalTimeframeSessions} sessions` : `${totalTimeframeHours.toFixed(1)} hrs`}
            </strong>
          </div>
          <div className="text-[var(--border-strong)]">•</div>
          <div>
            Average Daily Velocity:{' '}
            <strong className="text-[var(--accent)]">
              {avgTimeframeVelocity} sessions / day
            </strong>
          </div>
          <div className="text-[var(--border-strong)]">•</div>
          <div>
            Timeframe: <strong className="text-[var(--text-primary)]">{filteredActivity.length} Days</strong>
          </div>
        </div>

        {/* Responsive Interactive SVG Chart */}
        <div className="relative pt-2 pb-1">
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <Skeleton className="w-full h-48 rounded-[var(--radius-md)]" />
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted)] font-mono">
              No activity logs recorded for this timeframe.
            </div>
          ) : (
            <div className="w-full h-64 relative">
              <svg
                viewBox={`0 0 800 200`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = 180 - pct * 150;
                  const labelVal = Math.round(pct * chartMaxVal);
                  return (
                    <g key={idx}>
                      <line
                        x1="40"
                        y1={y}
                        x2="790"
                        y2={y}
                        stroke="var(--border)"
                        strokeDasharray="4,4"
                        strokeWidth="1"
                      />
                      <text
                        x="32"
                        y={y + 3}
                        fontSize="10"
                        fill="var(--text-muted)"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Area & Line */}
                {(() => {
                  const points = filteredActivity.map((item, idx) => {
                    const x = 50 + (idx / Math.max(filteredActivity.length - 1, 1)) * 730;
                    const val = chartMetric === 'sessions' ? item.sessions_count : item.practice_hours;
                    const y = 180 - (val / chartMaxVal) * 150;
                    return { x, y, item };
                  });

                  if (points.length === 0) return null;

                  // Construct Smooth Path (SVG Path)
                  let dPath = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 1; i < points.length; i++) {
                    const prev = points[i - 1];
                    const curr = points[i];
                    const cp1x = prev.x + (curr.x - prev.x) / 2;
                    const cp1y = prev.y;
                    const cp2x = prev.x + (curr.x - prev.x) / 2;
                    const cp2y = curr.y;
                    dPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                  }

                  const areaPath = `${dPath} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

                  return (
                    <g>
                      {/* Gradient Fill */}
                      <path d={areaPath} fill="url(#purpleGradient)" />

                      {/* Line Stroke */}
                      <path
                        d={dPath}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Interactive Data Points & Hover Targets */}
                      {points.map((pt, idx) => {
                        const isHovered = hoveredPoint?.item?.date === pt.item.date;
                        return (
                          <g key={idx} className="cursor-pointer">
                            {/* Vertical Hover Indicator Line */}
                            {isHovered && (
                              <line
                                x1={pt.x}
                                y1="15"
                                x2={pt.x}
                                y2="180"
                                stroke="var(--accent)"
                                strokeWidth="1.5"
                                strokeDasharray="3,3"
                              />
                            )}

                            {/* Circle Node */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? '#ffffff' : 'var(--accent)'}
                              stroke="var(--accent)"
                              strokeWidth={isHovered ? 3 : 2}
                              className="transition-all duration-150"
                            />

                            {/* Click / Hover Target Zone */}
                            <rect
                              x={pt.x - 15}
                              y="10"
                              width="30"
                              height="180"
                              fill="transparent"
                              onMouseEnter={() => setHoveredPoint(pt)}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />

                            {/* Date Label on X Axis */}
                            {(idx === 0 ||
                              idx === points.length - 1 ||
                              idx % Math.ceil(points.length / 7) === 0) && (
                              <text
                                x={pt.x}
                                y="195"
                                fontSize="10"
                                fill="var(--text-secondary)"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {pt.item.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>

              {/* Dynamic Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute z-20 pointer-events-none panel-card p-2.5 bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-sm)] shadow-[var(--shadow-md)] text-xs font-mono transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(hoveredPoint.x / 800) * 100}%`,
                    top: `${(hoveredPoint.y / 200) * 100 - 10}%`,
                  }}
                >
                  <p className="font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1">
                    {hoveredPoint.item.label} ({hoveredPoint.item.date})
                  </p>
                  <div className="pt-1.5 space-y-0.5 text-[11px]">
                    <p className="text-[var(--accent)] font-semibold">
                      Sessions: {hoveredPoint.item.sessions_count}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      Hours: {hoveredPoint.item.practice_hours} hrs
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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

          {loading ? (
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

          {loading ? (
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

      {/* 4. Rubric Competency & Skill Performance Breakdown */}
      <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                Peer Evaluation Rubrics & Skill Competency
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Average marks and percentage achieved across all peer feedback dimensions.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/feedback')}
            className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Configure Rubrics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <SkeletonTableRows count={3} />
        ) : rubricBreakdown.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] font-mono py-4 text-center">
            No active peer feedback evaluation questions configured.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {rubricBreakdown.map((rubric) => {
              const pct = rubric.avg_score_pct || 0;
              const isHigh = pct >= 75;
              const isMid = pct >= 50 && pct < 75;
              const colorClass = isHigh
                ? 'from-emerald-500 to-teal-500'
                : isMid
                ? 'from-amber-500 to-orange-500'
                : 'from-rose-500 to-red-500';

              return (
                <div
                  key={rubric.question_id}
                  className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--text-primary)]">
                        {rubric.short_label || rubric.question_text}
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                        {rubric.question_text}
                      </p>
                    </div>

                    <span className="text-[14px] font-bold font-mono text-[var(--accent)] shrink-0">
                      {pct}%
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden border border-[var(--border)]/40">
                    <div
                      className={`bg-gradient-to-r ${colorClass} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-0.5">
                    <span>
                      Avg: <strong>{rubric.avg_awarded_marks}</strong> / {rubric.max_marks} marks
                    </span>
                    <span>{rubric.responses_count} reviews evaluated</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Bottom Grid: Recent Live Interviews & Top Student Performers */}
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

          {loading ? (
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

          {loading ? (
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
