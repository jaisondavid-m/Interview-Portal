import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, SlidersHorizontal, Video, History, MessageSquareCheck, Trophy } from 'lucide-react';
import api from '../api/axios';

export default function Sidebar() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {}
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  const menuItems = isAdmin
    ? [
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Interview Configuration', path: '/admin/interviews', icon: SlidersHorizontal },
        { name: 'Peer Feedback Config', path: '/admin/feedback', icon: MessageSquareCheck },
        { name: 'Feedback Leaderboard', path: '/admin/leaderboard', icon: Trophy },
        { name: 'Interview History', path: '/admin/history', icon: History },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Interviews', path: '/interviews', icon: Video },
      ];

  return (
    <aside className="w-64 h-full shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col justify-between p-4 shadow-[var(--shadow-sm)] overflow-y-auto custom-scrollbar">
      {/* Navigation Menu */}
      <nav className="space-y-1.5 pt-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium font-ui transition-all ${
                  isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[var(--border-accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sign Out Button in Sidebar Footer */}
      <div className="pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-[var(--radius-sm)] text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] border border-[var(--border)] hover:border-[var(--red)]/20 transition-all duration-150"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
