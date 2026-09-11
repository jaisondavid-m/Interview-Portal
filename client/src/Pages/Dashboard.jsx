import React, { useState, useEffect } from 'react';
import { Video, Star, Clock, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const stats = [
    {
      label: 'Interviews Attended',
      value: '6',
      subtext: 'Completed mock sessions',
      icon: Video,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-dim)]',
      border: 'border-[var(--border-accent)]',
    },
    {
      label: 'Average Score',
      value: '4.8',
      suffix: '/ 5.0',
      subtext: 'Based on peer ratings',
      icon: Star,
      color: 'text-[var(--amber)]',
      bg: 'bg-[var(--amber-bg)]',
      border: 'border-[var(--amber)]/20',
    },
    {
      label: 'Practice Time',
      value: '4.5',
      suffix: 'hrs',
      subtext: 'Total mock duration',
      icon: Clock,
      color: 'text-[var(--green)]',
      bg: 'bg-[var(--green-bg)]',
      border: 'border-[var(--green)]/20',
    },
    {
      label: 'Attendance Rate',
      value: '100%',
      subtext: 'No missed sessions',
      icon: CheckCircle2,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-dim)]',
      border: 'border-[var(--border-accent)]',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="pb-5 border-b border-[var(--border)]">
        <span className="badge-kicker">Student Portal</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
          Dashboard
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Welcome back{user?.name ? `, ${user.name}` : ''}. Here is a summary of your mock interview performance.
        </p>
      </div>

      {/* Minimal Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="panel-card p-4 space-y-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--text-secondary)] font-ui">
                  {stat.label}
                </span>
                <div className={`p-1.5 rounded-[var(--radius-sm)] ${stat.bg} ${stat.color} border ${stat.border}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[26px] font-bold text-[var(--text-primary)] font-mono leading-none">
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="text-[13px] font-mono text-[var(--text-muted)]">
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
    </div>
  );
}
