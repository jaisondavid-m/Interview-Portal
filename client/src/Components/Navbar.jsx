import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Mic, Menu, X, Users, Sparkles } from 'lucide-react';
import { NAV_LINKS, APP_NAME } from '../utils/constants';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        
        {/* Brand Logo with accent dot */}
        <Link 
          to="/" 
          className="font-mono font-semibold text-[13px] tracking-[0.06em] text-[var(--accent)] flex items-center gap-2 no-underline group"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] group-hover:scale-125 transition-transform" />
          <span className="font-bold tracking-tight">{APP_NAME}</span>
          <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20 ml-1">
            PEER AUDIO
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium font-ui transition-all duration-150 ${
                  isActive
                    ? 'text-[var(--accent)] bg-[var(--accent-dim)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* Action CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-3 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--radius-sm)] transition"
          >
            Sign In
          </Link>
          <Link
            to="/interview"
            className="btn btn-primary text-[13px] py-1.5 px-3.5"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Match Peer</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-4 space-y-2 animate-slide-up">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium font-ui ${
                  isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
          <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="btn btn-secondary w-full text-xs py-2"
            >
              Sign In
            </Link>
            <Link
              to="/interview"
              onClick={() => setIsOpen(false)}
              className="btn btn-primary w-full text-xs py-2"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Match Student Interview</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
