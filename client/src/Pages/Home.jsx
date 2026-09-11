import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Users, MessageSquareText, ShieldCheck, ArrowRight, Radio, Sparkles } from 'lucide-react';
import { INTERVIEW_TRACKS, APP_NAME } from '../utils/constants';

export default function Home() {
  return (
    <div className="space-y-20 py-12">
      {/* Hero Section */}
      <section className="relative max-w-[1280px] mx-auto px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-[12px] font-mono font-semibold">
          <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          <span>LIVE 1-ON-1 STUDENT VOICE MOCK PLATFORM</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Practice Technical Interviews with{' '}
          <span className="text-[var(--accent)] underline decoration-[var(--border-accent)] underline-offset-8">
            Real Student Peers
          </span>{' '}
          Over Voice
        </h1>

        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Match with university students preparing for software engineering roles. Practice DSA, System Design, and Behavioral rounds in live voice rooms with shared notes and constructive feedback.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/interview"
            className="btn btn-primary text-[14px] py-3 px-6 shadow-[var(--shadow-md)]"
          >
            <Mic className="w-4 h-4" />
            <span>Match with a Peer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="btn btn-secondary text-[14px] py-3 px-6"
          >
            Explore Dashboard
          </Link>
        </div>
      </section>

      {/* 3-Step Process Cards */}
      <section className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-12 space-y-2">
          <span className="badge-kicker">Collaborative Learning</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            How MockMate Works
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] max-w-xl mx-auto">
            Take turns being the interviewer and candidate for authentic, two-way interview experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="data-card p-6 flex flex-col justify-between space-y-4 data-card-interactive">
            <div className="space-y-3">
              <div className="card-avatar">
                01
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] font-ui">
                1. Select Track & Queue
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Choose your focus topic (DSA, Backend, System Design) and get paired with an active student at your difficulty tier.
              </p>
            </div>
            <span className="status-pill status-active self-start">Instant Match</span>
          </div>

          <div className="data-card p-6 flex flex-col justify-between space-y-4 data-card-interactive">
            <div className="space-y-3">
              <div className="card-avatar">
                02
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] font-ui">
                2. Live 1-on-1 Audio Room
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Hop into a crystal-clear WebRTC voice call. Use the collaborative scratchpad to write pseudocode while thinking out loud.
              </p>
            </div>
            <span className="status-pill status-accent self-start">Low Latency Audio</span>
          </div>

          <div className="data-card p-6 flex flex-col justify-between space-y-4 data-card-interactive">
            <div className="space-y-3">
              <div className="card-avatar">
                03
              </div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] font-ui">
                3. Mutual Peer Rating
              </h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Exchange detailed feedback on communication clarity, edge-case analysis, and algorithmic correctness.
              </p>
            </div>
            <span className="status-pill status-pending self-start">Constructive Review</span>
          </div>
        </div>
      </section>

      {/* Active Tracks Panel */}
      <section className="max-w-[1280px] mx-auto px-6">
        <div className="panel-card p-8 sm:p-10 border border-[var(--border-strong)] bg-[var(--bg-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <span className="badge-kicker">Live Rooms</span>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Active Student Practice Tracks
              </h2>
            </div>
            <Link to="/interview" className="btn btn-primary text-xs py-2 px-4 self-start sm:self-auto">
              Join Live Queue →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERVIEW_TRACKS.map((track) => (
              <div
                key={track.id}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] hover:border-[var(--border-accent)] hover:bg-[var(--bg-card)] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                      {track.level}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition mt-1">
                    {track.title}
                  </h4>
                </div>
                <span className="status-pill status-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                  <span>{track.peersOnline} Online</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
