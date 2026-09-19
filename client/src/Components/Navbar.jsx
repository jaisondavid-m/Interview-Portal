import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleMobileMenu, isMobileMenuOpen }) {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isDeveloper = user?.role === 'developer';
  const targetPath = isDeveloper ? '/developer/audit-logs' : isAdmin ? '/admin/dashboard' : '/dashboard';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : isDeveloper ? 'DEV' : isAdmin ? 'SA' : 'ST';

  const displayName = user?.name || (isDeveloper ? 'Lead Developer' : isAdmin ? 'System Administrator' : 'College Student');
  const displayRoll = user?.roll_no || (isDeveloper ? 'DEV01' : isAdmin ? 'ADMIN01' : user?.email || 'STUDENT01');

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border)] shadow-[var(--shadow-sm)] h-16">
      <div className="flex items-center justify-between h-full w-full">
        {/* Desktop Left Section: API Portal centered directly above the sidebar */}
        <div className="hidden md:flex w-64 h-full border-r border-[var(--border)] items-center justify-center px-4 shrink-0">
          <Link
            to={targetPath}
            className="flex items-center gap-2.5 no-underline group focus:outline-none"
          >
            {/* Brand Icon Logo */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6e56cf] to-[#8c74eb] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(110,86,207,0.28)] group-hover:scale-105 transition-transform duration-200">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>

            {/* Site Name */}
            <div className="flex items-baseline gap-1">
              <span className="font-ui font-extrabold text-[18px] tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                API <span className="text-[var(--accent)]">Portal</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Mobile Left Section: Hamburger Button + Logo */}
        <div className="flex md:hidden items-center gap-2 px-3 shrink-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-[var(--accent)]" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <Link
            to={targetPath}
            className="flex items-center gap-2 no-underline group focus:outline-none ml-1"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#6e56cf] to-[#8c74eb] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(110,86,207,0.28)]">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>

            <div className="flex items-baseline gap-0.5">
              <span className="font-ui font-extrabold text-[16px] tracking-tight text-[var(--text-primary)]">
                API <span className="text-[var(--accent)]">Portal</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Right Section: User Profile Card */}
        <div className="flex-1 flex items-center justify-end px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all">
            <div className="card-avatar w-7 h-7 text-[11px] shrink-0 font-bold">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[13px] font-bold text-[var(--text-primary)] font-ui leading-tight truncate max-w-[140px] md:max-w-none">
                {displayName}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-wider truncate max-w-[140px] md:max-w-none">
                {displayRoll}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
