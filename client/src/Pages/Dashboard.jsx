import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Star,
  Clock,
  CheckCircle2,
  Award,
  Zap,
  TrendingUp,
  History,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  BarChart2,
  BarChart3
} from 'lucide-react';
import api from '../api/axios';
import { Skeleton, SkeletonStatsGrid } from '../Components/Skeleton';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch computed real-time performance statistics
      const [statsRes, historyRes] = await Promise.allSettled([
        api.get('/interviews/dashboard/stats'),
        api.get('/interviews/history')
      ]);

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data || statsRes.value;
        setStats(d);
      }

      if (historyRes.status === 'fulfilled') {
        const list = Array.isArray(historyRes.value) ? historyRes.value : (historyRes.value?.data || []);
        setRecentInterviews(list.slice(0, 3));
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
      setError('Could not refresh performance stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalPoints = stats?.total_points ?? 0;
  const totalMaxPoints = stats?.total_max_points ?? 0;
  const interviewsAttended = stats?.interviews_attended ?? 0;
  const averagePoints = stats?.average_points ?? 0;
  const scorePercentage = stats?.score_percentage ?? 0;
  const grade = stats?.grade || (interviewsAttended > 0 ? 'Evaluated' : 'Unranked');

  const statCards = [
    {
      label: 'Total Points Gained',
      value: totalPoints.toFixed(0),
      suffix: totalMaxPoints > 0 ? `/ ${totalMaxPoints.toFixed(0)} max` : 'pts',
      subtext: 'Accumulated interview score',
      icon: Award,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-dim)]',
      border: 'border-[var(--border-strong)]',
    },
    {
      label: 'Average Points / Interview',
      value: averagePoints.toFixed(1),
      suffix: 'pts',
      subtext: 'Total Points ÷ Interviews Attended',
      icon: Zap,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-dim)]',
      border: 'border-[var(--border-strong)]',
    },
    {
      label: 'Interviews Attended',
      value: String(interviewsAttended),
      subtext: 'Completed mock sessions',
      icon: Video,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-dim)]',
      border: 'border-[var(--border-strong)]',
    },
    {
      label: 'Overall Score & Grade',
      value: scorePercentage > 0 ? `${scorePercentage.toFixed(0)}%` : '—',
      suffix: grade !== 'Unranked' ? `(${grade})` : '',
      subtext: `${stats?.total_reviews_received ?? 0} peer evaluations`,
      icon: TrendingUp,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-dim)]',
      border: 'border-[var(--border-strong)]',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-10">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[24px] md:text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Welcome back{user?.name ? `, ${user.name}` : ''}. Here is your live mock interview performance summary.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => navigate('/history')}
            className="btn btn-secondary text-xs py-1.5 sm:py-2 px-3 sm:px-3.5 flex items-center gap-1.5 font-mono shadow-xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>Interview History</span>
          </button>

          <button
            onClick={() => navigate('/interviews')}
            className="btn btn-primary text-xs py-1.5 sm:py-2 px-3.5 sm:px-4 flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Video className="w-4 h-4" />
            <span>Join Mock Interview</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Dynamic Performance Stat Cards Grid */}
      {/* 4 Stat Metric Cards */}
      {loading ? (
        <SkeletonStatsGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="panel-card p-4.5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[var(--text-secondary)] font-ui">
                    {stat.label}
                  </span>
                  <div className={`p-1.5 rounded-[var(--radius-sm)] ${stat.bg} ${stat.color} border ${stat.border}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[26px] font-bold text-[var(--text-primary)] font-mono leading-none">
                      {stat.value}
                    </span>
                    {stat.suffix && (
                      <span className="text-[12px] font-mono text-[var(--text-muted)] font-semibold">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1.5">
                    {stat.subtext}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback Questions Performance (X-Y Bar Chart) */}
      <div className="panel-card p-4 sm:p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] space-y-5 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-[var(--radius-xs)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-[16px] sm:text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                Feedback Questions & Rubric Performance
              </h2>
            </div>
            <p className="text-xs sm:text-[12px] text-[var(--text-secondary)]">
              Average score percentage for each peer evaluation question across all attended mock interviews.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/history')}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-mono shadow-xs"
            >
              <History className="w-3.5 h-3.5" />
              <span>Full History</span>
              <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Bar Chart Body */}
        {(() => {
          const feedbackList = (stats?.feedback_averages || []).filter(
            (item) => item.question_type !== 'text' && !item.question_text?.toLowerCase().includes('additional feedback')
          );

          if (loading) {
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
                <h4 className="text-[15px] font-bold text-[var(--text-primary)]">No Feedback Questions Configured</h4>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Once peer feedback rubrics are evaluated in mock interviews, your per-question performance bar chart will appear here.
                </p>
                <button
                  onClick={() => navigate('/interviews')}
                  className="btn btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 mt-2"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Start Interview Now</span>
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* Interactive X-Y Bar Chart with horizontal scroll on mobile */}
              <div className="relative pt-16 pb-2 px-2 sm:px-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/40 border border-[var(--border)] overflow-x-auto custom-scrollbar">
                <div className="min-w-[440px] sm:min-w-0">
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
                      const pct = Math.max(0, Math.min(100, item.score_percentage || 0));
                      const hasResponses = item.responses_count > 0;
                      
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
                          <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 transform group-hover:-translate-y-1 w-56">
                            <div className="relative p-3 rounded-xl bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl text-left space-y-1.5 backdrop-blur-md">
                              <div className="font-bold text-white flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                                <span className="truncate pr-2 font-semibold text-slate-100">{item.short_label || `Question ${idx + 1}`}</span>
                                <span className="font-mono text-purple-400 font-extrabold shrink-0 text-xs">{pct.toFixed(0)}%</span>
                              </div>
                              <p className="text-[11px] text-slate-200 font-normal leading-snug line-clamp-3">
                                {item.question_text}
                              </p>
                              <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span>Avg: <strong className="text-white font-bold">{item.average_score.toFixed(1)} / {item.max_marks}</strong></span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">{item.responses_count} {item.responses_count === 1 ? 'eval' : 'evals'}</span>
                              </div>
                              {/* Arrow Pointer */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>

                          {/* Value Label above Bar */}
                          <div className="mb-1 text-center font-mono">
                            <span className={`text-[11px] font-bold ${barTextColor} transition-all group-hover:scale-110 block`}>
                              {hasResponses ? `${pct.toFixed(0)}%` : '0%'}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] hidden sm:block">
                              {hasResponses ? `${item.average_score.toFixed(1)} pts` : '—'}
                            </span>
                          </div>

                          {/* Bar Pillar */}
                          <div className="w-full bg-[var(--bg-card)] rounded-t-[var(--radius-xs)] overflow-hidden border-t border-x border-[var(--border)] flex flex-col justify-end h-full max-h-[160px]">
                            <div
                              style={{ height: hasResponses ? `${Math.max(pct, 6)}%` : '4%' }}
                              className={`w-full bg-gradient-to-t ${barGradient} border-t ${barBorder} rounded-t-[var(--radius-xs)] shadow-sm transition-all duration-500 ease-out group-hover:brightness-110 group-hover:shadow-[0_0_12px_rgba(110,86,207,0.35)]`}
                            />
                          </div>

                          {/* X-Axis Label (Admin Configured Short Label) */}
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
              </div>

              {/* Chart Footer Indicator */}
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[var(--text-muted)] gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                      Indicator:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#6e56cf]" />
                      <span>Average Feedback Score (%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-400/40" />
                      <span>No Reviews Yet</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-[var(--text-muted)] sm:text-right">
                    Labels updated via Admin Rubrics
                  </div>
                </div>
              </div>

              {/* Rubric Strength Highlights Cards */}
              {(() => {
                const evaluated = feedbackList.filter((q) => q.responses_count > 0);
                if (evaluated.length === 0) return null;

                const sorted = [...evaluated].sort((a, b) => (b.score_percentage || 0) - (a.score_percentage || 0));
                const topSkill = sorted[0];
                const focusSkill = sorted[sorted.length - 1];

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-[var(--radius-md)] bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
                      <div className="p-2 rounded-[var(--radius-xs)] bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase">
                          Strongest Evaluated Area
                        </span>
                        <h4 className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                          {topSkill.short_label || topSkill.question_text}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                          {topSkill.score_percentage?.toFixed(0)}% average ({topSkill.average_score.toFixed(1)} / {topSkill.max_marks} pts across {topSkill.responses_count} reviews)
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[var(--radius-md)] bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                      <div className="p-2 rounded-[var(--radius-xs)] bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase">
                          Key Growth Opportunity
                        </span>
                        <h4 className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                          {focusSkill.short_label || focusSkill.question_text}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                          {focusSkill.score_percentage?.toFixed(0)}% average ({focusSkill.average_score.toFixed(1)} / {focusSkill.max_marks} pts across {focusSkill.responses_count} reviews)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
