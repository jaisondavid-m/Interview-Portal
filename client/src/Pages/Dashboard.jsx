import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Star, ArrowUpRight, Mic, Radio, BookOpen, PlusCircle } from 'lucide-react';
import { INTERVIEW_TRACKS } from '../utils/constants';

export default function Dashboard() {
  const stats = [
    { label: 'Peer Mocks Completed', value: '12', change: '+3 this week', icon: Users, color: 'text-[var(--accent)]' },
    { label: 'Peer Rating', value: '4.8 / 5.0', change: 'Based on 12 reviews', icon: Star, color: 'text-[var(--amber)]' },
    { label: 'Audio Practice Time', value: '14 hrs', change: 'With 8 unique peers', icon: Clock, color: 'text-[var(--green)]' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="badge-kicker">Candidate Workspace</span>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
            Student Dashboard
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Overview of your completed peer mock interviews, ratings, and active matching queues.
          </p>
        </div>
        <Link
          to="/interview"
          className="btn btn-primary text-xs py-2 px-4 self-start sm:self-auto"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Match Student Peer</span>
        </Link>
      </div>

      {/* Responsive Split Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar Control Panel (4 Cols) */}
        <aside className="lg:col-span-4 panel-card p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
              Quick Peer Queue
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Select your focus and enter the queue immediately.
            </p>
          </div>

          <div className="space-y-2">
            {INTERVIEW_TRACKS.slice(0, 3).map((track) => (
              <Link
                key={track.id}
                to={`/interview?track=${track.id}`}
                className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-between transition group block"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                    {track.title}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--text-muted)]">
                    Level: {track.level}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition" />
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <Link
              to="/interview"
              className="btn btn-primary w-full text-xs py-2.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start Voice Session</span>
            </Link>
          </div>
        </aside>

        {/* Right Main Content Area (8 Cols) */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* Top 3 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="panel-card p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[var(--text-secondary)] font-ui">
                      {stat.label}
                    </span>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <p className="text-[24px] font-bold text-[var(--text-primary)] font-mono">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {stat.change}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Section Header & Active Records */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
                Active Student Interview Records
              </h2>
              <span className="status-pill status-accent">
                3 Tracks Active
              </span>
            </div>

            {/* List of Data Cards */}
            <div className="space-y-3">
              <div className="data-card data-card-interactive">
                <div className="card-avatar">RK</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="card-title">Full Stack Web & Goroutines</h3>
                    <span className="status-pill status-active">Passed • 4.9/5</span>
                  </div>
                  <p className="card-description">
                    Practiced with Rahul K. (IIT Bombay). In-depth review on async patterns & channel buffer sizes.
                  </p>
                  <div className="card-footer-meta">
                    <span>ID: #MOCK-802</span>
                    <span>Sep 10, 2026</span>
                    <span>Duration: 45m</span>
                  </div>
                </div>
              </div>

              <div className="data-card data-card-interactive">
                <div className="card-avatar">SM</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="card-title">DSA: Graphs & DP Whiteboard</h3>
                    <span className="status-pill status-active">Passed • 4.7/5</span>
                  </div>
                  <p className="card-description">
                    Practiced with Sneha M. (NIT Surathkal). Topological sort walk-through and edge-case handling.
                  </p>
                  <div className="card-footer-meta">
                    <span>ID: #MOCK-801</span>
                    <span>Sep 07, 2026</span>
                    <span>Duration: 38m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
