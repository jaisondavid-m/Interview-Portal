import React from 'react';
import { Calendar, Star, Users, UserCheck, MessageSquareQuote } from 'lucide-react';

export default function History() {
  const peerFeedbackList = [
    {
      id: 'session-802',
      topic: 'Full Stack & React Internals',
      peerName: 'Rahul K. (IIT Bombay)',
      date: 'Sep 10, 2026',
      rating: 4.9,
      duration: '45 mins',
      peerNotes: 'Great explanation of React Virtual DOM & reconciliation. Handled concurrency questions smoothly. Recommended practicing edge case handling in Golang channels.',
      myRole: 'Candidate',
    },
    {
      id: 'session-801',
      topic: 'DSA: Graphs & Dynamic Programming',
      peerName: 'Sneha M. (NIT Surathkal)',
      date: 'Sep 07, 2026',
      rating: 4.7,
      duration: '38 mins',
      peerNotes: 'Strong communication during whiteboard walk-through. Clear topological sort implementation.',
      myRole: 'Interviewer & Candidate (Swapped)',
    },
    {
      id: 'session-794',
      topic: 'System Design: URL Shortener & Redis Caching',
      peerName: 'Aman V. (BITS Pilani)',
      date: 'Sep 03, 2026',
      rating: 4.5,
      duration: '50 mins',
      peerNotes: 'Good understanding of base62 encoding and DB sharding. Could elaborate more on cache eviction policies.',
      myRole: 'Candidate',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Peer Feedback & Mock History</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review written feedback and performance ratings given by student peers after each 1-on-1 audio mock session.
        </p>
      </div>

      <div className="space-y-4">
        {peerFeedbackList.map((item) => (
          <div
            key={item.id}
            className="p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {item.topic}
                  </span>
                  <span className="text-xs text-slate-400">Duration: {item.duration}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Peer: {item.peerName}</span>
                </h3>
              </div>
              
              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-white">{item.rating}</span>
                <span className="text-xs text-slate-500">/ 5.0</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold">
                <MessageSquareQuote className="w-4 h-4" />
                <span>Peer's Written Review & Tips:</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic pl-6">
                "{item.peerNotes}"
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/50">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{item.date}</span>
              </span>
              <span className="text-slate-400 font-medium">Role: {item.myRole}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
