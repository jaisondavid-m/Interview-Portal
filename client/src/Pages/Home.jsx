import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Users, MessageSquareText, ShieldCheck, ArrowRight, Radio, Volume2 } from 'lucide-react';
import { INTERVIEW_TRACKS } from '../utils/constants';

export default function Home() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Live 1-on-1 Student Peer Audio Mock Interviews</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Practice Technical Interviews with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Real Student Peers Over Voice
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Match with fellow students preparing for tech roles. Take turns being the interviewer and candidate with live voice calls, shared questions, and honest feedback.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/interview"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 hover:shadow-indigo-500/40 transition transform active:scale-95"
          >
            <Mic className="w-5 h-5" />
            <span>Find a Peer to Practice</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* How It Works Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold text-white">How Student Mock Mates Work</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A collaborative 3-step peer-learning experience designed for serious job seekers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">1. Instant Peer Matching</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Select your track (DSA, Full Stack, Backend, Behavioral) and get matched with an active student at your skill level.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">2. Live 1-on-1 Audio Room</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connect over low-latency audio. Take turns asking curated interview questions and solving problems out loud in real time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/40 transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">3. Mutual Peer Feedback</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Rate your peer on technical depth, problem breakdown, and communication clarity. Receive constructive notes to improve.
            </p>
          </div>
        </div>
      </section>

      {/* Live Peer Tracks */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900/60 border border-indigo-500/20 rounded-3xl p-8 sm:p-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Active Student Practice Rooms</h2>
              <p className="text-slate-400 text-sm mt-1">Join a queue and start practicing voice interviews in minutes.</p>
            </div>
            <Link
              to="/interview"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Start Matching
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERVIEW_TRACKS.map((track) => (
              <div
                key={track.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition cursor-pointer group space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800 text-indigo-400">
                    {track.level}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {track.peersOnline} students active
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white group-hover:text-indigo-400 transition">
                  {track.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
