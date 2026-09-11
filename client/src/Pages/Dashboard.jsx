import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Star, ArrowUpRight, Mic, Radio } from 'lucide-react';
import { INTERVIEW_TRACKS } from '../utils/constants';

export default function Dashboard() {
  const stats = [
    { label: 'Peer Mocks Completed', value: '12', change: '+3 this week', icon: Users, color: 'text-indigo-400' },
    { label: 'Peer Rating', value: '4.8 / 5.0', change: 'Based on 12 reviews', icon: Star, color: 'text-amber-400' },
    { label: 'Audio Practice Time', value: '14 hrs', change: 'With 8 unique peers', icon: Clock, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Student Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect with peers, host or join 1-on-1 audio mock interview sessions.
          </p>
        </div>
        <Link
          to="/interview"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
        >
          <Mic className="w-4 h-4" />
          <span>Match with a Student</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">{stat.label}</span>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Active Practice Tracks with Peer Count */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Available Peer Interview Queues</h2>
          <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Live Peer Matching Ready
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTERVIEW_TRACKS.slice(0, 4).map((track) => (
            <div
              key={track.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between hover:border-indigo-500/50 transition group"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {track.level}
                  </span>
                  <span className="text-xs text-slate-400">
                    {track.peersOnline} students in queue
                  </span>
                </div>
                <h3 className="font-semibold text-white group-hover:text-indigo-400 transition">{track.title}</h3>
              </div>
              <Link
                to={`/interview?track=${track.id}`}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition"
              >
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
