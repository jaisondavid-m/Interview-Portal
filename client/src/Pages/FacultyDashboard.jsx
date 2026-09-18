import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Sparkles,
  MapPin,
  RefreshCw,
  Award
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [todaySlots, setTodaySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, slotsRes] = await Promise.all([
        api.get('/faculty/dashboard/stats'),
        api.get('/faculty/slots?scope=today')
      ]);

      setStats(statsRes?.data || statsRes);
      setTodaySlots(Array.isArray(slotsRes?.data) ? slotsRes.data : Array.isArray(slotsRes) ? slotsRes : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load faculty dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-[var(--accent-dim)] via-[var(--bg-card)] to-[var(--bg-card)] border border-[var(--border-accent)] rounded-3xl shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Faculty Examination Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Welcome back, {user?.name || 'Faculty Member'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl">
              Manage in-person attendance at your assigned interview venues and authorize verified candidates to begin their peer assessments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/faculty/attendance')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 shadow-md transition-all"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Live Attendance Console</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Today's Slots</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] font-mono">
            {stats?.today_slots_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Assigned Examination Slots</p>
        </div>

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Booked</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] font-mono">
            {stats?.today_students_booked ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Registered Candidates</p>
        </div>

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Present in Lab</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-500 font-mono">
            {stats?.today_students_present ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Attendance Verified & Unlocked</p>
        </div>

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Pending Check-in</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-500 font-mono">
            {stats?.today_students_pending ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Awaiting Physical Verification</p>
        </div>
      </div>

      {/* Today's Scheduled Slots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              <span>Today's Assigned Venues & Examination Slots</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Select a slot to verify students, mark attendance, and allow them into mock interviews.
            </p>
          </div>

          <button
            onClick={fetchFacultyData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)] mb-2" />
            <p className="text-xs">Loading today's assigned slots...</p>
          </div>
        ) : todaySlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">No interview slots assigned for today</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
              You do not have any physical examination slots scheduled for today. Check upcoming dates or contact the platform administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaySlots.map((s) => {
              const occupancy = s.capacity > 0 ? Math.round((s.booked_count / s.capacity) * 100) : 0;
              const attendance = s.booked_count > 0 ? Math.round((s.present_count / s.booked_count) * 100) : 0;

              return (
                <div
                  key={s.id}
                  className="p-5 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-2xl shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {s.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                        <Clock className="w-3.5 h-3.5" />
                        {s.start_time} - {s.end_time}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {s.venue?.name || 'Lab Venue'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Room {s.venue?.room_number} • {s.venue?.building}
                    </p>

                    {s.track && (
                      <div className="mt-3 inline-block px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-primary)]">
                        {s.track.title}
                      </div>
                    )}

                    {/* Attendance Progress Meter */}
                    <div className="mt-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Lab Check-in:</span>
                        <span className="font-bold text-emerald-500">
                          {s.present_count} / {s.booked_count} Present ({attendance}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(attendance, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                        <span>Total Registered: {s.booked_count}</span>
                        <span>Capacity: {s.capacity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => navigate(`/faculty/attendance?slot_id=${s.id}`)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Take Attendance & Verify</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
