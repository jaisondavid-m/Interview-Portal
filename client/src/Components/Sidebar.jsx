import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mic, History, Users, Radio } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Peer Audio Room', path: '/interview', icon: Mic },
    { name: 'Peer Feedback & Logs', path: '/history', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</p>
          <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Live Peers</span>
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
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center space-x-3 px-3 py-2 text-slate-300 rounded-lg hover:bg-slate-800 cursor-pointer transition">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
            JS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Student Candidate</p>
            <p className="text-[11px] text-slate-400 truncate">student@university.edu</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
