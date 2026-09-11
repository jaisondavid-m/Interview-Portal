import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Heart, Globe, MessageSquare, Share2, Headphones } from 'lucide-react';
import { APP_NAME } from '../utils/constants';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">{APP_NAME}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect with fellow students for live 1-on-1 audio mock interviews, mutual feedback, and collaborative technical preparation.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/interview" className="hover:text-white transition">Peer Audio Rooms</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition">Student Dashboard</Link></li>
              <li><Link to="/history" className="hover:text-white transition">Peer Feedback & Ratings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Tracks & Prep</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#dsa" className="hover:text-white transition">DSA & Algorithms</a></li>
              <li><a href="#fullstack" className="hover:text-white transition">Web Development</a></li>
              <li><a href="#behavioral" className="hover:text-white transition">Behavioral & HR Prep</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Community</h4>
            <div className="flex space-x-3 text-slate-400">
              <a href="#" className="hover:text-white transition p-2 bg-slate-900 rounded-lg border border-slate-800">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-white transition p-2 bg-slate-900 rounded-lg border border-slate-800">
                <MessageSquare className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-white transition p-2 bg-slate-900 rounded-lg border border-slate-800">
                <Share2 className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {APP_NAME}. Student-to-Student Mock Interview Platform.</p>
          <p className="flex items-center space-x-1 mt-2 md:mt-0">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            <span>using Go, Gin, React & Web Audio</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
