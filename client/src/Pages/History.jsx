import React from 'react';
import { Calendar, Star, Users, MessageSquareQuote, FileText } from 'lucide-react';

export default function History() {
  const peerFeedbackList = [
    {
      id: 'MOCK-802',
      topic: 'Full Stack Web & React Internals',
      peerName: 'Rahul K. (IIT Bombay)',
      avatar: 'RK',
      date: 'Sep 10, 2026',
      rating: 4.9,
      duration: '45 mins',
      peerNotes: 'Great explanation of React Fiber reconciliation and state batching. Handled concurrency questions smoothly. Recommended practicing edge-case handling in Golang channels.',
      myRole: 'Candidate',
    },
    {
      id: 'MOCK-801',
      topic: 'DSA: Graphs & Dynamic Programming',
      peerName: 'Sneha M. (NIT Surathkal)',
      avatar: 'SM',
      date: 'Sep 07, 2026',
      rating: 4.7,
      duration: '38 mins',
      peerNotes: 'Strong communication during whiteboard walk-through. Clear topological sort implementation and Big-O runtime analysis.',
      myRole: 'Interviewer & Candidate (Swapped)',
    },
    {
      id: 'MOCK-794',
      topic: 'System Design: URL Shortener & Redis Caching',
      peerName: 'Aman V. (BITS Pilani)',
      avatar: 'AV',
      date: 'Sep 03, 2026',
      rating: 4.5,
      duration: '50 mins',
      peerNotes: 'Good understanding of base62 encoding and DB sharding strategies. Could elaborate further on distributed cache eviction policies.',
      myRole: 'Candidate',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)]">
        <span className="badge-kicker">Peer Review Archive</span>
        <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
          Peer Feedback & Session Logs
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Review ratings and constructive notes given by fellow student interviewers after each 1-on-1 audio mock session.
        </p>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {peerFeedbackList.map((item) => (
          <div
            key={item.id}
            className="data-card data-card-interactive p-6 flex flex-col md:flex-row gap-5 items-start"
          >
            <div className="card-avatar">
              {item.avatar}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border-accent)]">
                      #{item.id}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      Role: {item.myRole}
                    </span>
                  </div>
                  <h3 className="card-title text-[16px] font-bold mt-1">
                    {item.topic}
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Interviewer: <strong className="text-[var(--text-primary)]">{item.peerName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto status-pill status-amber">
                  <Star className="w-3.5 h-3.5 fill-[var(--amber)] text-[var(--amber)]" />
                  <span className="font-bold text-[12px]">{item.rating}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">/ 5.0</span>
                </div>
              </div>

              {/* Review Quote Box */}
              <div className="p-3.5 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] text-[13px] text-[var(--text-secondary)] leading-relaxed">
                <span className="font-semibold text-[var(--accent)] text-[11px] uppercase tracking-wider block mb-1">
                  Peer Feedback:
                </span>
                "{item.peerNotes}"
              </div>

              {/* Footer Meta */}
              <div className="card-footer-meta">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>{item.date}</span>
                </span>
                <span>Duration: {item.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
