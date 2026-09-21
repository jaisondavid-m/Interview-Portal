import React, { useState, useEffect, useRef } from 'react';
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
  Award,
  Radio,
  Search,
  ChevronRight,
  Shield,
  ShieldAlert,
  Mail,
  ExternalLink,
  SlidersHorizontal,
  ChevronLeft,
  X,
  Play,
  Volume2,
  FileText,
  Star,
  Check,
  Ticket
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AudioPlayer from '../Components/AudioPlayer';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active Main Tab: 'live' | 'slots' | 'history'
  const [activeTab, setActiveTab] = useState('live');

  // Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Managed Slots State
  const [slots, setSlots] = useState([]);
  const [slotsScope, setSlotsScope] = useState('all'); // 'all' | 'today' | 'upcoming' | 'history'
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Venue Interview Sessions History & Live Monitoring State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('ALL'); // 'ALL' | 'in_progress' | 'completed'
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPagination, setSessionsPagination] = useState({
    page: 1,
    limit: 15,
    total_records: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  });

  // Detailed Session Modal State (for Live Audio Streaming & Verification)
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/faculty/dashboard/stats');
      setStats(res?.data || res);
    } catch (err) {
      console.error('Failed to load faculty stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Managed Slots
  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await api.get('/faculty/slots', {
        params: { scope: slotsScope }
      });
      const list = res?.data || (Array.isArray(res) ? res : []);
      setSlots(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load faculty slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // 3. Fetch Interview Sessions for Mapped Venues
  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await api.get('/faculty/interviews/sessions', {
        params: {
          page: sessionsPage,
          limit: 15,
          status: sessionStatusFilter !== 'ALL' ? sessionStatusFilter : undefined,
          search: sessionSearch.trim() || undefined,
        }
      });
      const list = res?.data || (Array.isArray(res) ? res : []);
      setSessions(Array.isArray(list) ? list : []);
      if (res?.pagination) {
        setSessionsPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load faculty sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchSlots();
    fetchSessions();
  }, []);

  // Reload slots on scope change
  useEffect(() => {
    fetchSlots();
  }, [slotsScope]);

  // Reload sessions on filter / pagination change
  useEffect(() => {
    fetchSessions();
  }, [sessionsPage, sessionStatusFilter]);

  // Search debounce for sessions
  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionsPage(1);
      fetchSessions();
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionSearch]);

  // Polling for live session counter and live status updates every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      if (activeTab === 'live' || sessionStatusFilter === 'in_progress') {
        fetchSessions();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab, sessionStatusFilter]);

  // Open Full Session Modal
  const handleOpenSessionModal = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setSessionDetail(null);
    setDetailError('');
    setLoadingDetail(true);

    try {
      const res = await api.get(`/faculty/interviews/sessions/${sessionId}`);
      const data = res?.data || res;
      setSessionDetail(data);
    } catch (err) {
      setDetailError(err.response?.data?.message || err.message || 'Failed to load interview session details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseSessionModal = () => {
    setSelectedSessionId(null);
    setSessionDetail(null);
    setDetailError('');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startStr, endStr) => {
    if (!startStr) return '—';
    const start = new Date(startStr);
    if (isNaN(start.getTime()) || start.getFullYear() <= 1970) return '—';
    const end = endStr ? new Date(endStr) : new Date();
    const diffSecs = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m ${secs}s`;
  };

  const getSessionStartTime = (s) => {
    if (s?.started_at && new Date(s.started_at).getFullYear() > 1970) {
      return s.started_at;
    }
    if (s?.created_at && new Date(s.created_at).getFullYear() > 1970) {
      return s.created_at;
    }
    return null;
  };

  // Live in-progress sessions count & flexible search filtering
  const liveSessions = sessions.filter((s) => s.status === 'in_progress');
  const filteredLiveSessions = liveSessions.filter((s) => {
    if (!sessionSearch.trim()) return true;
    const q = sessionSearch.toLowerCase().trim();
    const cleanQ = q.replace(/^room\s*/i, '').replace(/^#/, '');

    const roomIdMatch = String(s.id).includes(cleanQ) || `#${s.id}`.toLowerCase().includes(q) || `room #${s.id}`.toLowerCase().includes(q);
    const trackMatch = s.track_title?.toLowerCase().includes(q) || s.track_category?.toLowerCase().includes(q);
    const levelMatch = s.level_name?.toLowerCase().includes(q) || s.level_mode?.toLowerCase().includes(q) || `level ${s.level_number}`.includes(q);
    const interviewerMatch = s.interviewer?.name?.toLowerCase().includes(q) || s.interviewer?.roll_no?.toLowerCase().includes(q) || s.interviewer?.email?.toLowerCase().includes(q) || s.interviewer?.department?.toLowerCase().includes(q);
    const candidateMatch = s.interviewee?.name?.toLowerCase().includes(q) || s.interviewee?.roll_no?.toLowerCase().includes(q) || s.interviewee?.email?.toLowerCase().includes(q) || s.interviewee?.department?.toLowerCase().includes(q);

    return roomIdMatch || trackMatch || levelMatch || interviewerMatch || candidateMatch;
  });

  const liveCount = stats?.live_sessions_count ?? liveSessions.length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slideUp ${
          toast.type === 'error' ? 'bg-rose-500 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}


      {/* ============================================================ */}
      {/* 2. TOP MANAGEMENT KPI STATS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Slots Managed */}
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-[var(--accent)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Total Slots Managed</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] font-mono">
            {stats?.total_slots_managed ?? stats?.total_slots_count ?? slots.filter(s => s.status !== 'cancelled').length}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Assigned Examination Slots</p>
        </div>

        {/* Live Running Sessions */}
        <div
          onClick={() => setActiveTab('live')}
          className={`p-5 bg-[var(--bg-card)] border rounded-2xl shadow-sm transition-all cursor-pointer ${
            liveCount > 0
              ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500'
              : 'border-[var(--border)] hover:border-[var(--accent)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <span>Live Venue Interviews</span>
              {liveCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Radio className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-500 font-mono">
            {liveCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
            {liveCount > 0 ? 'Currently Running in Venue • Click to listen' : 'No active sessions running'}
          </p>
        </div>

        {/* Active & Upcoming Slots */}
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-[var(--accent)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Upcoming & Active</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] font-mono">
            {stats?.active_upcoming_slots ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Ready for Evaluation</p>
        </div>

        {/* Total Candidates Evaluated */}
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-[var(--accent)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Candidates Evaluated</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-indigo-500 font-mono">
            {stats?.total_students_evaluated ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Verified & Assessed</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN NAVIGATION TABS */}
      {/* ============================================================ */}
      <div className="border-b border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Live Sessions Tab */}
          <button
            onClick={() => setActiveTab('live')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'live'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-500" />
            <span>Currently Running Interviews</span>
            {liveCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {liveCount} Live
              </span>
            )}
          </button>

          {/* Managed Slots Tab */}
          <button
            onClick={() => setActiveTab('slots')}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'slots'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Managed Slots & Schedule ({slots.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. TAB CONTENT: LIVE INTERVIEWS */}
      {/* ============================================================ */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Live Interview Monitoring in Your Venues</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Real-time active peer assessment rooms occurring in your assigned venue locations. Listen to live dialogue and monitor progress.
              </p>
            </div>

            <button
              onClick={fetchSessions}
              disabled={loadingSessions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
              <span>Refresh Live Rooms</span>
            </button>
          </div>

          {/* Flexible Live Search & Monitoring Toolbar */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search live interviews by Room #, student name, roll number, track title, level..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                {sessionSearch && (
                  <button
                    onClick={() => setSessionSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Live Filter Status & Quick Tag Badges */}
            <div className="flex items-center justify-between text-xs gap-2 flex-wrap pt-1 border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[var(--text-muted)] font-medium">Quick Filters:</span>
                {['Backend', 'Frontend', 'Round 1', 'Level 1'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSessionSearch(sessionSearch === tag ? '' : tag)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      sessionSearch.toLowerCase() === tag.toLowerCase()
                        ? 'bg-emerald-500 text-white font-bold shadow-xs'
                        : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-emerald-500/50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                Showing <strong className="text-emerald-500 font-bold">{filteredLiveSessions.length}</strong> of {liveSessions.length} live rooms
              </span>
            </div>
          </div>

          {loadingSessions ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)] mb-2" />
              <p className="text-xs">Checking for live venue interview rooms...</p>
            </div>
          ) : liveSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">No interview sessions currently in progress</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md">
                When students at your assigned venue begin their peer mock assessments, their active rooms and live audio feeds will appear here immediately.
              </p>
              <button
                onClick={() => setActiveTab('slots')}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>View Scheduled Slots</span>
              </button>
            </div>
          ) : filteredLiveSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center space-y-2">
              <Search className="w-8 h-8 text-[var(--text-muted)] mb-1" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No live interviews match "{sessionSearch}"</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Try searching by Room #, student name, roll number, or assessment track.
              </p>
              <button
                onClick={() => setSessionSearch('')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-500 cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLiveSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-5 bg-[var(--bg-card)] border-2 border-emerald-500/40 hover:border-emerald-500 rounded-2xl shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>LIVE NOW</span>
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        Room #{s.id}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{calculateDuration(getSessionStartTime(s), null)}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {s.track_title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Level {s.level_number}: {s.level_name} ({s.level_mode?.toUpperCase()} Mode)
                    </p>
                  </div>

                  {/* Paired Students */}
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Interviewer</span>
                      <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">{s.interviewer?.name || 'Student A'}</p>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)] truncate">{s.interviewer?.roll_no || s.interviewer?.email}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Candidate</span>
                      <p className="font-bold text-[var(--text-primary)] truncate mt-0.5">{s.interviewee?.name || 'Student B'}</p>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)] truncate">{s.interviewee?.roll_no || s.interviewee?.email}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      Role switch: {s.switch_count > 0 ? '✓ Switched' : 'Round 1'}
                    </span>
                    <button
                      onClick={() => handleOpenSessionModal(s.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen & Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. TAB CONTENT: MANAGED SLOTS */}
      {/* ============================================================ */}
      {activeTab === 'slots' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[var(--text-primary)] mr-2 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
                Filter Slots:
              </span>
              {[
                { id: 'all', label: 'All Managed' },
                { id: 'today', label: "Today's Slots" },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'history', label: 'Past & Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSlotsScope(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    slotsScope === tab.id
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchSlots}
              disabled={loadingSlots}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)] mb-2" />
              <p className="text-xs">Loading managed examination slots...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">No interview slots found</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md">
                You do not have any slots assigned for this filter. Check with platform administrators for new venue schedules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((s) => {
                const occupancy = s.capacity > 0 ? Math.round((s.booked_count / s.capacity) * 100) : 0;
                const attendance = s.booked_count > 0 ? Math.round((s.present_count / s.booked_count) * 100) : 0;
                const venueAssignments = s.venues && s.venues.length > 0 ? s.venues : null;

                return (
                  <div
                    key={s.id}
                    className="p-5 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] rounded-2xl shadow-sm transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : s.status === 'scheduled'
                            ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                            : s.status === 'completed'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {s.status}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>{s.slot_date}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[var(--accent)] font-bold text-base mb-1">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>{s.start_time} - {s.end_time}</span>
                        </span>
                      </div>

                      <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate pt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        {venueAssignments && venueAssignments.length > 0 ? (
                          <span className="font-semibold text-[var(--text-primary)] truncate">
                            {venueAssignments[0]?.venue?.name}
                            {venueAssignments.length > 1 && ` (+${venueAssignments.length - 1} more)`}
                          </span>
                        ) : (
                          <span className="font-semibold text-[var(--text-primary)] truncate">
                            {s.venue?.name || 'Assigned Venue'}
                          </span>
                        )}
                      </div>

                      {s.track && (
                        <div className="mt-2.5 inline-block px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]">
                          {s.track.title}
                        </div>
                      )}

                      {/* Attendance Progress Meter */}
                      <div className="mt-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Venue Attendance:</span>
                          <span className="font-bold text-emerald-500 font-mono">
                            {s.present_count} / {s.booked_count} Present ({attendance}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(attendance, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                          <span>Booked: {s.booked_count}</span>
                          <span>Capacity: {s.capacity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/faculty/attendance?slot_id=${s.id}`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Attendance Console</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. DETAILED SESSION MODAL (WITH LIVE/RECORDED AUDIO PLAYER) */}
      {/* ============================================================ */}
      {selectedSessionId && (
        <div
          onClick={handleCloseSessionModal}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-5 sm:p-6 w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl animate-scaleUp space-y-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-kicker">Faculty Session Inspection</span>
                  <span className="text-xs font-mono font-bold text-[var(--accent)]">
                    Session #{selectedSessionId}
                  </span>
                </div>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                  {sessionDetail?.session?.track?.title || 'Peer Mock Assessment'}
                </h3>
              </div>
              <button
                onClick={handleCloseSessionModal}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center text-[var(--text-secondary)]">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent)] mb-3" />
                <p className="text-sm font-semibold">Loading session data & dialogue recording...</p>
              </div>
            ) : detailError ? (
              <div className="p-4 bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-[var(--radius-md)] text-xs text-[var(--red)] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{detailError}</span>
              </div>
            ) : sessionDetail?.session ? (
              <div className="space-y-5">
                {/* Status Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Status</span>
                    <span className={`text-xs font-bold font-mono ${sessionDetail.session.status === 'in_progress' ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                      {sessionDetail.session.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Duration</span>
                    <span className="text-xs font-bold font-mono text-[var(--text-primary)]">
                      {calculateDuration(sessionDetail.session.started_at || sessionDetail.session.created_at, sessionDetail.session.ended_at)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Assessment Level</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate block">
                      Level {sessionDetail.session.level?.level_number || 1}: {sessionDetail.session.level?.name || 'Coding'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">Role Switches</span>
                    <span className="text-xs font-bold font-mono text-[var(--accent)]">
                      {sessionDetail.session.switch_count || 0} times
                    </span>
                  </div>
                </div>

                {/* Paired Student Participant Profiles */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-mono uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Student Participant Profiles</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Student A */}
                    <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                        <span className="font-bold text-[var(--accent)]">Round 1 Interviewer</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold">Student A</span>
                      </div>
                      <p className="font-bold text-sm text-[var(--text-primary)]">{sessionDetail.session.interviewer?.name || '—'}</p>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)]">{sessionDetail.session.interviewer?.roll_no || '—'}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{sessionDetail.session.interviewer?.email || '—'}</p>
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">{sessionDetail.session.interviewer?.department || '—'}</p>
                    </div>

                    {/* Student B */}
                    <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                        <span className="font-bold text-emerald-500">Round 1 Candidate</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">Student B</span>
                      </div>
                      <p className="font-bold text-sm text-[var(--text-primary)]">{sessionDetail.session.interviewee?.name || '—'}</p>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)]">{sessionDetail.session.interviewee?.roll_no || '—'}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{sessionDetail.session.interviewee?.email || '—'}</p>
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">{sessionDetail.session.interviewee?.department || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Dialogue Audio Player */}
                <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[var(--accent)]" />
                      <span>Interview Dialogue Audio Player</span>
                    </h4>
                    {sessionDetail.recording && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                        Recording Ready
                      </span>
                    )}
                  </div>

                  <AudioPlayer
                    recording={sessionDetail.recording}
                    session={sessionDetail.session}
                    title={`${sessionDetail.session.track?.title || 'Interview'} Session Audio`}
                  />
                </div>

                {/* Peer Scorecards / Feedback */}
                {sessionDetail.feedbacks && sessionDetail.feedbacks.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold font-mono uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Peer Assessment Scores & Rubrics ({sessionDetail.feedbacks.length})</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {sessionDetail.feedbacks.map((f, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
                            <span className="font-semibold text-[var(--text-primary)]">
                              Evaluator: {f.giver?.name || 'Peer'}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                              Overall: {f.overall_rating || f.rating || '—'}/10
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] italic">
                            "{f.general_notes || f.comment || 'Assessment completed'}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleCloseSessionModal}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
