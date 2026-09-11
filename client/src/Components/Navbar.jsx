import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Mic, Menu, X, LogOut, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { APP_NAME } from '../utils/constants';
import api from '../api/axios';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  const navLinks = isAdmin
    ? [
        { name: 'User Management', path: '/admin/users' },
        { name: 'Student Dashboard', path: '/dashboard' },
        { name: 'Audio Rooms', path: '/interview' },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Peer Audio Room', path: '/interview' },
        { name: 'Feedback & Logs', path: '/history' },
      ];

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        
        {/* Brand Logo & Portal Badge */}
        <Link 
          to={isAdmin ? "/admin/users" : "/dashboard"} 
          className="font-mono font-semibold text-[13px] tracking-[0.06em] text-[var(--accent)] flex items-center gap-2 no-underline group"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] group-hover:scale-125 transition-transform" />
          <span className="font-bold tracking-tight">{APP_NAME}</span>
          <span className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ml-1 flex items-center gap-1 ${
            isAdmin 
              ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]' 
              : 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20'
          }`}>
            {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
            <span>{isAdmin ? 'ADMIN PORTAL' : 'CAMPUS PORTAL'}</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
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

        {/* Action Buttons & Logout */}
        <div className="hidden md:flex items-center gap-3">
          {isAdmin ? (
            <Link
              to="/admin/users"
              className="btn btn-primary text-[12px] py-1.5 px-3"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Users</span>
            </Link>
          ) : (
            <Link
              to="/interview"
              className="btn btn-primary text-[12px] py-1.5 px-3"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Match Peer</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded-[var(--radius-sm)] transition flex items-center gap-1.5 text-[12px] font-medium"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
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
          {navLinks.map((link) => (
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
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="btn btn-secondary w-full text-xs py-2 text-[var(--red)]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
