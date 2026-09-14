import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) { }
    }
  }, []);

  const isAdmin = user?.role === 'admin';
  const targetPath = isAdmin ? '/admin/users' : '/dashboard';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  const displayName = user?.name || (isAdmin ? 'System Administrator' : 'College Student');
  const displayRoll = user?.roll_no || (isAdmin ? 'ADMIN01' : user?.email || 'STUDENT01');

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border)] shadow-[var(--shadow-sm)] h-16">
      <div className="flex items-center justify-between h-full w-full">
        {/* Left Section: MockMate centered directly above the sidebar */}
        <div className="w-64 h-full md:border-r border-[var(--border)] flex items-center justify-center px-4 shrink-0">
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
                Mock<span className="text-[var(--accent)]">Mate</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mb-0.5 animate-pulse" />
            </div>
          </Link>
        </div>

        {/* Right Section: User Profile Card at the far right end */}
        <div className="flex-1 flex items-center justify-end px-6">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] hover:border-[var(--border-strong)] transition-all">
            <div className="card-avatar w-7 h-7 text-[11px]">
              {initials}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-bold text-[var(--text-primary)] font-ui leading-tight">
                {displayName}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-wider">
                {displayRoll}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
