import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShieldCheck, LogOut, SlidersHorizontal, 
  Video, History, MessageSquareCheck, Trophy, Terminal, FileCode2, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ICON_MAP = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  MessageSquareCheck,
  Trophy,
  History,
  Terminal,
  Video,
};

export default function MobileSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, permissions } = useAuth();

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const isDeveloper = userRole === 'developer';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : isDeveloper ? 'DEV' : isAdmin ? 'SA' : 'ST';

  const displayName = user?.name || (isDeveloper ? 'Lead Developer' : isAdmin ? 'System Administrator' : 'College Student');
  const displayRoll = user?.roll_no || (isDeveloper ? 'DEV01' : isAdmin ? 'ADMIN01' : user?.email || 'STUDENT01');

  // Non-parameterized pages from context permissions
  const navPages = React.useMemo(() => {
    if (permissions?.pages && Array.isArray(permissions.pages)) {
      return permissions.pages.filter(p => !p.path.includes(':'));
    }
    return null;
  }, [permissions?.pages]);

  // Fallback static items
  const fallbackMenuItems = isDeveloper
    ? [
        { name: 'Audit Logs', path: '/developer/audit-logs', icon: Terminal },
      ]
    : isAdmin
    ? [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Role Management', path: '/admin/roles', icon: ShieldCheck },
        { name: 'Interview Configuration', path: '/admin/interviews', icon: SlidersHorizontal },
        { name: 'Peer Feedback Config', path: '/admin/feedback', icon: MessageSquareCheck },
        { name: 'Leaderboard', path: '/admin/leaderboard', icon: Trophy },
        { name: 'Interview History', path: '/admin/history', icon: History },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: Terminal },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Interviews', path: '/interviews', icon: Video },
        { name: 'Interview History', path: '/history', icon: History },
      ];

  const menuItems = navPages && navPages.length > 0
    ? navPages.map(page => ({
        name: page.name,
        path: page.path,
        icon: ICON_MAP[page.icon] || FileCode2,
      }))
    : fallbackMenuItems;

  return (
    <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <aside 
        className={`relative w-[280px] max-w-[85vw] h-full bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header with Brand and Close Button */}
        <div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#6e56cf] to-[#8c74eb] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(110,86,207,0.28)]">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-ui font-extrabold text-[16px] tracking-tight text-[var(--text-primary)]">
                  Mock<span className="text-[var(--accent)]">Mate</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mb-0.5 animate-pulse" />
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="p-3.5 border-b border-[var(--border)] bg-[var(--bg)]/50">
            <div className="flex items-center gap-3">
              <div className="card-avatar w-8 h-8 text-[12px] shrink-0 font-bold">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-[var(--text-primary)] font-ui truncate">
                  {displayName}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                  {displayRoll}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 max-h-[calc(100vh-210px)] overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium font-ui transition-all ${
                      isActive
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[var(--border-accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer with Sign Out */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-card)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--radius-sm)] text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] border border-[var(--border)] hover:border-[var(--red)]/20 transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
