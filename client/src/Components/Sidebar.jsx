import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mic, History, Users, ShieldCheck, Radio } from 'lucide-react';

export default function Sidebar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const menuItems = isAdmin
    ? [
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Student Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Peer Audio Room', path: '/interview', icon: Mic },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Peer Audio Room', path: '/interview', icon: Mic },
        { name: 'Peer Feedback & Logs', path: '/history', icon: History },
      ];

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <aside className="w-64 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col justify-between p-4 min-h-[calc(100vh-3.5rem)] shadow-[var(--shadow-sm)]">
      <div className="space-y-6">
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {isAdmin ? 'Admin Portal' : 'Student Portal'}
          </span>
          <span className={`status-pill ${isAdmin ? 'status-accent' : 'status-green'}`}>
            {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />}
            <span>{isAdmin ? 'Administrator' : 'Peers Online'}</span>
          </span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium font-ui transition-all ${
                    isActive
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[var(--border-accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] cursor-pointer transition">
          <div className="card-avatar">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate font-ui">
              {user?.name || 'College User'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">
              {user?.roll_no ? `${user.roll_no} • ` : ''}{user?.email || 'admin@bitsathy.ac.in'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
