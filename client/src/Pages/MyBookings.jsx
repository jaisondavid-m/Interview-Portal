import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Building2,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  X,
  Lock,
  Unlock,
  RefreshCw,
  Video,
  Ticket,
  Globe,
  UserCheck,
  Ban,
  Layers,
  Code,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../Components/ConfirmModal';

export default function MyBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Bookings list & Real-time active attendance status
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [filterScope, setFilterScope] = useState('all'); // 'all' | 'upcoming' | 'completed' | 'cancelled'

  // Cancel Booking Modal State
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  // Matchmaking State (for starting verified / online interview directly from My Bookings)
  const [matchStatus, setMatchStatus] = useState('idle'); // 'idle' | 'searching' | 'matched' | 'error'
  const [activeQueue, setActiveQueue] = useState(null);
  const [matchedSession, setMatchedSession] = useState(null);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [matchError, setMatchError] = useState('');

  const timerIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch student bookings & active check-in
  const fetchMyBookingsAndStatus = async () => {
    try {
      setLoading(true);
      const [bookingsRes, checkinRes] = await Promise.all([
        api.get('/slots/my-bookings'),
        api.get('/slots/active-checkin')
      ]);

      const bList = bookingsRes?.data || bookingsRes || [];
      setBookings(Array.isArray(bList) ? bList : []);
      setActiveCheckIn(checkinRes?.data || checkinRes || null);
    } catch (err) {
      console.error('Failed to load my bookings', err);
      showToast('Failed to load your interview bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookingsAndStatus();
  }, []);

  // Periodic polling for real-time attendance verification status (every 3 seconds)
  useEffect(() => {
    const pollCheckin = async () => {
      try {
        const res = await api.get('/slots/active-checkin');
        setActiveCheckIn(res?.data || res || null);
      } catch (e) {}
    };

    const interval = setInterval(pollCheckin, 3000);
    return () => clearInterval(interval);
  }, []);

  // Matchmaking timer & polling
  useEffect(() => {
    if (matchStatus === 'searching') {
      const start = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setQueueElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setQueueElapsed(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [matchStatus]);

  useEffect(() => {
    if (matchStatus === 'searching') {
      const checkMatch = async () => {
        try {
          const params = new URLSearchParams();
          if (activeQueue?.queueId) params.append('queue_id', activeQueue.queueId);
          if (activeQueue?.trackId) params.append('track_id', activeQueue.trackId);
          const queryString = params.toString() ? `?${params.toString()}` : '';

          const res = await api.get(`/interviews/matchmake/status${queryString}`);
          const data = res?.data || res;
          if (data?.status === 'matched' && data?.session_id) {
            setMatchStatus('matched');
            setMatchedSession(data);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            setTimeout(() => {
              navigate(`/interviews/room/${data.session_id}`);
            }, 800);
          }
        } catch (e) {}
      };

      checkMatch();
      pollIntervalRef.current = setInterval(checkMatch, 1000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [matchStatus, activeQueue, navigate]);

  // Handle Starting Verified / Online Interview from My Bookings
  const handleStartInterview = async (booking) => {
    if (!booking) return;
    try {
      setMatchError('');
      setActiveQueue({
        trackId: booking.track_id || booking.track?.id,
        trackTitle: booking.track?.title || 'Assessment',
        trackIcon: booking.track?.icon || 'Code',
        levelId: booking.level_id || booking.level?.id || null,
        levelName: booking.level?.name || null,
        levelNumber: booking.level?.level_number || 1,
        durationMinutes: booking.level?.duration_minutes || 45,
        queueId: null,
      });
      setMatchStatus('searching');

      const payload = {
        track_id: booking.track_id || booking.track?.id,
        is_testing: false,
      };
      if (booking.level_id || booking.level?.id) {
        payload.level_id = booking.level_id || booking.level?.id;
      }

      const res = await api.post('/interviews/matchmake', payload);
      const data = res?.data || res;
      if (data?.matched && data?.session_id) {
        setMatchStatus('matched');
        setMatchedSession(data);
        setTimeout(() => {
          navigate(`/interviews/room/${data.session_id}`);
        }, 1200);
      } else if (data?.status === 'waiting' && data?.queue_id) {
        setActiveQueue((prev) => ({
          ...prev,
          queueId: data.queue_id,
        }));
      }
    } catch (err) {
      setMatchStatus('error');
      setMatchError(err.response?.data?.message || err.message || 'Failed to start matchmaking.');
    }
  };

  const handleCancelMatchmaking = async () => {
    try {
      const qId = activeQueue?.queueId;
      await api.post(`/interviews/matchmake/cancel${qId ? `?queue_id=${qId}` : ''}`);
    } catch (e) {}
    setMatchStatus('idle');
    setActiveQueue(null);
    setMatchedSession(null);
  };

  // Handle Cancel Booking
  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      setCancellingBookingId(bookingToCancel.id);
      await api.post(`/slots/bookings/${bookingToCancel.id}/cancel`);
      showToast('Interview slot booking has been cancelled');
      setBookingToCancel(null);
      fetchMyBookingsAndStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel slot booking', 'error');
    } finally {
      setCancellingBookingId(null);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Filtered Bookings list
  const filteredBookings = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return bookings.filter((b) => {
      if (filterScope === 'upcoming') {
        return b.status === 'scheduled' && (b.slot?.slot_date >= todayStr || !b.slot?.slot_date);
      }
      if (filterScope === 'completed') {
        return b.status === 'completed' || b.attendance_status === 'present';
      }
      if (filterScope === 'cancelled') {
        return b.status === 'cancelled';
      }
      return true;
    });
  }, [bookings, filterScope]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-slideUp ${
          toast.type === 'error' ? 'bg-rose-500 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Matchmaking Overlay Modal */}
      {matchStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 text-center space-y-5 shadow-2xl animate-scaleUp">
            {matchStatus === 'searching' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-[var(--accent)] flex items-center justify-center mx-auto animate-pulse">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Connecting to Peer Interview...
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Matching you with a verified peer for{' '}
                    <span className="text-[var(--text-primary)] font-semibold">
                      {activeQueue?.trackTitle}
                      {activeQueue?.levelName ? ` • ${activeQueue.levelName}` : ''}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm font-mono font-bold text-[var(--accent)]">
                  <Clock className="w-4 h-4" />
                  <span>Elapsed: {formatTime(queueElapsed)}</span>
                </div>
                <button
                  onClick={handleCancelMatchmaking}
                  className="w-full py-2.5 rounded-xl bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel Connection
                </button>
              </>
            )}

            {matchStatus === 'matched' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Peer Connected!</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Entering peer interview room now...
                  </p>
                </div>
              </>
            )}

            {matchStatus === 'error' && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Unable to Connect</h3>
                  <p className="text-xs text-rose-400 mt-1">{matchError || 'An error occurred.'}</p>
                </div>
                <button
                  onClick={() => setMatchStatus('idle')}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-md cursor-pointer"
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-semibold mb-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Interview Reservations & Attendance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <span>My Bookings</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-1 max-w-2xl">
            Track your scheduled venue assessment slots, live attendance verification, and launch your peer interview once cleared.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchMyBookingsAndStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => navigate('/interviews')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Book New Slot</span>
          </button>
        </div>
      </div>



      {/* ============================================================ */}
      {/* 2. FILTER TABS & SEARCH */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterScope('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterScope === 'all'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setFilterScope('upcoming')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterScope === 'upcoming'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            Upcoming & Active ({bookings.filter(b => b.status === 'scheduled').length})
          </button>
          <button
            onClick={() => setFilterScope('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterScope === 'completed'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            Completed ({bookings.filter(b => b.status === 'completed' || b.attendance_status === 'present').length})
          </button>
          <button
            onClick={() => setFilterScope('cancelled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterScope === 'cancelled'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. BOOKINGS LIST */}
      {/* ============================================================ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl text-[var(--text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-3" />
          <p className="text-xs font-medium">Loading your interview bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mb-3">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {filterScope === 'all'
              ? 'No interview bookings found'
              : `No ${filterScope} bookings`}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
            You don't have any interview slots booked under this filter. Browse domains in the Interview page to reserve a session.
          </p>
          <button
            onClick={() => navigate('/interviews')}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Browse Interview Domains</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const isCancelled = b.status === 'cancelled';
            const isPresent = b.attendance_status === 'present';
            const isAbsent = b.attendance_status === 'absent';
            const isPending = b.attendance_status === 'pending' || !b.attendance_status;
            const canLaunch = !isCancelled && (isPresent || b.slot?.is_online);

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCancelled
                    ? 'bg-[var(--bg-card)]/40 border-[var(--border)]/50 opacity-70'
                    : isPresent
                    ? 'bg-gradient-to-br from-emerald-500/5 via-[var(--bg-card)] to-[var(--bg-card)] border-emerald-500/30 hover:border-emerald-500 shadow-sm'
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)] shadow-sm'
                }`}
              >
                <div>
                  {/* Top Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      Booking #{b.id}
                    </span>
                    <div className="flex items-center gap-2">
                      {isCancelled ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">
                          Cancelled
                        </span>
                      ) : isPresent ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Attendance Verified
                        </span>
                      ) : isAbsent ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">
                          Marked Absent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Attendance Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Track & Level */}
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] shrink-0">
                      <Code className="w-4 h-4" />
                    </span>
                    <span>{b.track?.title || 'Assessment Track'}</span>
                  </h3>
                  {b.level && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Level {b.level.level_number}: {b.level.name}
                      </span>
                    </div>
                  )}

                  {/* Slot Details Box */}
                  <div className="mt-4 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Date:</span>
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {b.slot?.slot_date || '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Time Slot:</span>
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] font-mono">
                        {b.slot?.start_time} - {b.slot?.end_time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Venue / Location:</span>
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {b.venue ? (
                          `${b.venue.name} (Room ${b.venue.room_number})`
                        ) : b.slot?.is_online ? (
                          'Online Virtual Room'
                        ) : (
                          'Campus Venue'
                        )}
                      </span>
                    </div>

                    {b.assigned_faculty && (
                      <div className="flex items-center justify-between text-[var(--text-secondary)] pt-1 border-t border-[var(--border)]">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>Assigned Faculty:</span>
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {b.assigned_faculty.name} ({b.assigned_faculty.department || 'Invigilator'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-end gap-3">
                  <div className="ml-auto flex items-center gap-2">
                    {canLaunch ? (
                      <button
                        onClick={() => handleStartInterview(b)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Start Interview</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : !isCancelled ? (
                      <span className="text-[11px] text-[var(--text-muted)] italic">
                        Report to venue for verification
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
