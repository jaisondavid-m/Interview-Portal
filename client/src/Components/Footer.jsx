import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Heart, Globe, MessageSquare, Share2 } from 'lucide-react';
import { APP_NAME } from '../utils/constants';

export default function Footer() {
  return (
    <footer className="bg-[var(--bg-card)] border-t border-[var(--border)] text-[var(--text-secondary)] py-12 mt-auto">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              <span className="font-mono font-bold text-[14px] text-[var(--text-primary)]">{APP_NAME}</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Live student-to-student 1-on-1 audio mock interviews with curated questions and mutual feedback.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/interview" className="hover:text-[var(--accent)] transition">Peer Audio Rooms</Link></li>
              <li><Link to="/dashboard" className="hover:text-[var(--accent)] transition">Student Dashboard</Link></li>
              <li><Link to="/history" className="hover:text-[var(--accent)] transition">Feedback & Logs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">
              Tracks
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/interview" className="hover:text-[var(--accent)] transition">DSA & Algorithms</Link></li>
              <li><Link to="/interview" className="hover:text-[var(--accent)] transition">Full Stack Web</Link></li>
              <li><Link to="/interview" className="hover:text-[var(--accent)] transition">System Design</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider">
              Community
            </h4>
            <div className="flex gap-2 text-[var(--text-secondary)]">
              <a href="#" className="p-2 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition">
                <MessageSquare className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition">
                <Share2 className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between text-[12px] text-[var(--text-muted)] font-mono">
          <p>© {new Date().getFullYear()} {APP_NAME}. Student Mock Platform.</p>
          <p className="flex items-center gap-1 mt-2 md:mt-0 font-ui text-[12px]">
            <span>Designed with</span>
            <Heart className="w-3 h-3 text-[var(--red)] fill-[var(--red)]" />
            <span>in Soft Pastel Minimal</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
