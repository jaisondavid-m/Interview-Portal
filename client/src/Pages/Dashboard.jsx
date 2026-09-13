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
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

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
      border: 'border-[var(--border-accent)]',
    },
    {
      label: 'Average Points / Interview',
      value: averagePoints.toFixed(1),
      suffix: 'pts',
      subtext: 'Total Points ÷ Interviews Attended',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Interviews Attended',
      value: String(interviewsAttended),
      subtext: 'Completed mock sessions',
      icon: Video,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Overall Score & Grade',
      value: scorePercentage > 0 ? `${scorePercentage.toFixed(0)}%` : '—',
      suffix: grade !== 'Unranked' ? `(${grade})` : '',
      subtext: `${stats?.total_reviews_received ?? 0} peer evaluations`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn pb-10">
      {/* Page Header */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="badge-kicker">Student Portal</span>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
            Dashboard
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Welcome back{user?.name ? `, ${user.name}` : ''}. Here is your live mock interview performance summary.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/history')}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-mono shadow-xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>Interview History</span>
          </button>

          <button
            onClick={() => navigate('/interviews')}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm"
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
                    {loading ? '...' : stat.value}
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

      {/* Recent Interviews Attended Section */}
      <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
              Recent Attended Interviews
            </h2>
          </div>

          <button
            onClick={() => navigate('/history')}
            className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2 text-[var(--text-muted)]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
            <p className="text-xs font-mono">Loading interview records...</p>
          </div>
        ) : recentInterviews.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-[var(--border)] rounded-[var(--radius-md)]">
            <Video className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
            <h4 className="text-[14px] font-bold text-[var(--text-primary)]">No interviews attended yet</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Join the matchmaking queue to be paired with a peer student and start practicing technical interviews.
            </p>
            <button
              onClick={() => navigate('/interviews')}
              className="btn btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 mt-2"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start Interview Now</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentInterviews.map((sess) => (
              <div
                key={sess.session_id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded border border-[var(--border-accent)]">
                      Level {sess.level_number}: {sess.level_name || 'Level'}
                    </span>
                    <span className="font-mono text-[11px] uppercase text-[var(--text-muted)] bg-[var(--bg-raised)] px-2 py-0.5 rounded border border-[var(--border)]">
                      {sess.level_mode || 'coding'}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                    {sess.track_title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2">
                    <span>Peer: <strong>{sess.peer_name}</strong></span>
                    <span>•</span>
                    <span>Role: <strong className="capitalize">{sess.role}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                      {formatDateTime(sess.started_at || sess.created_at)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  {sess.has_scorecard ? (
                    <div className="text-right font-mono">
                      <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        +{sess.total_score} / {sess.max_score} pts
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {sess.score_percentage?.toFixed(0)}% score
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
                      Pending Scorecard
                    </span>
                  )}

                  <button
                    onClick={() => navigate('/history')}
                    className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-mono"
                  >
                    <span>Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
