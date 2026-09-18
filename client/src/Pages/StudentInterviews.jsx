import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Code,
  Layers,
  Cpu,
  BrainCircuit,
  Search,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  CheckSquare,
  CalendarCheck,
  Calendar,
  Building2,
  MapPin,
  Lock,
  Unlock,
  Ticket,
  UserCheck,
  RefreshCw,
  Globe
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import api from '../api/axios';
import { SkeletonTrackGrid } from '../Components/Skeleton';

export default function StudentInterviews() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Student Bookings & Real-time In-Venue Check-in State
  const [myBookings, setMyBookings] = useState([]);
  const [activeCheckIn, setActiveCheckIn] = useState(null);

  // Integrated Slot Booking Drawer / Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState(null); // { track, level }
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Matchmaking State (for verified sessions)
  const [activeQueue, setActiveQueue] = useState(null);
  const [matchStatus, setMatchStatus] = useState('idle'); // 'idle' | 'searching' | 'matched' | 'error'
  const [matchedSession, setMatchedSession] = useState(null);
  const [queueElapsed, setQueueElapsed] = useState(0);

  const pollIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch student interview tracks
  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interviews/tracks');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTracks(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load interview domains.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch my bookings & active checkin status
  const fetchMyBookingsAndStatus = async () => {
    try {
      const [bookingsRes, checkinRes] = await Promise.all([
        api.get('/slots/my-bookings'),
        api.get('/slots/active-checkin')
      ]);

      const bList = bookingsRes?.data || bookingsRes || [];
      setMyBookings(Array.isArray(bList) ? bList : []);
      setActiveCheckIn(checkinRes?.data || checkinRes || null);
    } catch (e) {
      console.error('Failed to load active status', e);
    }
  };

  useEffect(() => {
    fetchTracks();
    fetchMyBookingsAndStatus();
  }, []);

  // Periodic polling for real-time attendance verification status
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
  }, [matchStatus, activeQueue?.queueId, activeQueue?.trackId, navigate]);

  // Open Integrated Slot Booking Modal for a specific Track & Level
  const handleOpenSlotBooking = async (track, level) => {
    setTargetLevel({ track, level });
    setBookingModalOpen(true);
    try {
      setLoadingSlots(true);
      const params = new URLSearchParams();
      params.append('track_id', track.id);
      if (level?.id) params.append('level_id', level.id);

      const res = await api.get(`/slots/available?${params.toString()}`);
      const data = res?.data || res || [];
      setAvailableSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load slots for this level', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Confirm booking a specific slot
  const handleConfirmSlotBooking = async (slotId) => {
    if (!targetLevel?.track) return;
    try {
      setBookingLoading(true);
      await api.post('/slots/book', {
        slot_id: slotId,
        track_id: targetLevel.track.id,
        level_id: targetLevel.level?.id || 0,
      });

      showToast('Interview slot reserved! Please report to the venue on time.');
      setBookingModalOpen(false);
      fetchMyBookingsAndStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to book slot', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  // Launch interview when verified
  const handleStartVerifiedInterview = async (track, level) => {
    try {
      setError('');
      setActiveQueue({
        trackId: track.id,
        trackTitle: track.title,
        trackIcon: track.icon,
        levelId: level?.id || null,
        levelName: level?.name || null,
        levelNumber: level?.level_number || 1,
        durationMinutes: level?.duration_minutes || 45,
        queueId: null,
      });
      setMatchStatus('searching');

      const payload = { track_id: track.id };
      if (level?.id) payload.level_id = level.id;

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
      setError(err.response?.data?.message || err.message || 'Failed to start matchmaking.');
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

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Map of active student bookings by track/level for fast lookup
  const activeBookingMap = useMemo(() => {
    const map = {};
    for (const b of myBookings) {
      if (b.status !== 'cancelled') {
        const key = `${b.track_id}_${b.level_id || 0}`;
        map[key] = b;
      }
    }
    return map;
  }, [myBookings]);

  const filteredTracks = tracks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrackIcon = (iconName) => {
    switch (iconName) {
      case 'Layers': return Layers;
      case 'Cpu': return Cpu;
      case 'BrainCircuit': return BrainCircuit;
      case 'CheckSquare': return CheckSquare;
      default: return Code;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
          toast.type === 'error'
            ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
            : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/30'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <span>Mock Mate Interviews</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Book a slot at your campus venue. Faculty at the venue will verify your attendance to start your peer interview.
          </p>
        </div>
      </div>

      {/* STICKY REAL-TIME IN-VENUE / ONLINE ATTENDANCE GATE CARD */}
      {activeCheckIn?.has_active_booking && activeCheckIn.booking && (
        <div className={`p-5 rounded-2xl border transition-all ${
          activeCheckIn.can_start
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
            : activeCheckIn.is_online
            ? 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/30'
            : activeCheckIn.venue_details_verified
            ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30'
            : 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-sky-500/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeCheckIn.can_start
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : activeCheckIn.is_online
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : activeCheckIn.venue_details_verified
                  ? 'bg-amber-500/20 text-amber-500 animate-pulse'
                  : 'bg-sky-500/20 text-sky-400 animate-pulse'
              }`}>
                {activeCheckIn.can_start ? <Unlock className="w-5 h-5" /> : activeCheckIn.is_online ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {activeCheckIn.can_start
                      ? (activeCheckIn.is_online ? 'Online Session Active — Cleared to Interview!' : 'Attendance Verified — Cleared to Interview!')
                      : activeCheckIn.is_online
                      ? `Online Slot Reserved — Starts at ${activeCheckIn.booking.slot?.start_time}`
                      : activeCheckIn.venue_details_verified
                      ? 'Physical In-Venue Attendance Pending'
                      : 'Slot Reserved — Venue Allocation in Progress'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    activeCheckIn.can_start
                      ? 'bg-emerald-500 text-white'
                      : activeCheckIn.is_online
                      ? 'bg-indigo-600 text-white'
                      : activeCheckIn.venue_details_verified
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-sky-600 text-white'
                  }`}>
                    {activeCheckIn.can_start
                      ? activeCheckIn.attendance_status
                      : activeCheckIn.is_online
                      ? 'Online Scheduled'
                      : activeCheckIn.venue_details_verified
                      ? activeCheckIn.attendance_status
                      : 'Allocation Draft'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {activeCheckIn.can_start ? (
                    activeCheckIn.is_online ? (
                      <span>Your online session is now live. Click below to begin your peer mock interview assessment!</span>
                    ) : (
                      <span>You are checked in at <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.venue?.name} (Room {activeCheckIn.booking.slot?.venue?.room_number})</strong>. Click below to start your peer assessment.</span>
                    )
                  ) : activeCheckIn.is_online ? (
                    <span>This is a remote virtual slot scheduled for <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.slot_date} ({activeCheckIn.booking.slot?.start_time} - {activeCheckIn.booking.slot?.end_time})</strong>. No faculty check-in is required; this button will unlock automatically on time!</span>
                  ) : activeCheckIn.venue_details_verified ? (
                    <span>Please report to <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.venue?.name} (Room {activeCheckIn.booking.slot?.venue?.room_number})</strong>. The faculty invigilator at the venue will verify your attendance.</span>
                  ) : (
                    <span>Your session is scheduled for <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.slot_date} ({activeCheckIn.booking.slot?.start_time} - {activeCheckIn.booking.slot?.end_time})</strong>. Lab and room assignments are being finalized by admin and will appear here shortly.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeCheckIn.can_start ? (
                <button
                  onClick={() => handleStartVerifiedInterview(activeCheckIn.booking.track, { id: activeCheckIn.booking.level_id })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all animate-bounce cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Mock Interview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : activeCheckIn.is_online ? (
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-400">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Unlocks at {activeCheckIn.booking.slot?.start_time}...</span>
                </div>
              ) : activeCheckIn.venue_details_verified ? (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Awaiting Faculty Check-in...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-sky-400">
                  <Clock className="w-4 h-4" />
                  <span>Awaiting Admin Verification...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Callout */}
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[13px] font-medium">{error}</p>
        </div>
      )}

      {/* VIEW 1: SELECTED TRACK DRILL-DOWN (LEVELS VIEW) */}
      {selectedTrack ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Back Navigation */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setSelectedTrack(null)}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--accent)]" />
              <span>Back to All Domains</span>
            </button>

            <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-muted)]">
              <span>Domain:</span>
              <strong className="text-[var(--text-primary)]">{selectedTrack.title}</strong>
              <span>•</span>
              <span>{selectedTrack.levels?.length || 0} Levels Available</span>
            </div>
          </div>

          {/* Selected Track Detail Banner */}
          <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-start gap-4">
              {(() => {
                const IconComponent = getTrackIcon(selectedTrack.icon);
                return (
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <IconComponent className="w-6 h-6" />
                  </div>
                );
              })()}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                    {selectedTrack.category || 'Technical'}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                    {selectedTrack.levels?.[0]?.mode?.toUpperCase() || 'CODING'}
                  </span>
                </div>
                <h2 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
                  {selectedTrack.title}
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                  {selectedTrack.description || 'Hands-on peer assessment with in-venue verification.'}
                </p>
              </div>
            </div>
          </div>

          {/* Levels Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              <span>Available Level Tiers</span>
            </h3>
            <span className="text-[12px] font-mono text-[var(--text-muted)]">
              Reserve a seat in your campus lab slot to attend
            </span>
          </div>

          {/* Levels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {selectedTrack.levels?.map((lvl) => {
              const key = `${selectedTrack.id}_${lvl.id}`;
              const booking = activeBookingMap[key];
              const isBooked = !!booking;
              const isPresent = booking?.attendance_status === 'present';
              const isVerified = booking?.allocation_status === 'verified' || booking?.slot?.allocations_published;
              const duration = lvl.duration_minutes || 45;
              const qCount = lvl.questions?.length || lvl.question_count || 0;
              const modeName = lvl.mode?.toUpperCase() || 'CODING';

              return (
                <div
                  key={lvl.id}
                  className={`panel-card p-6 flex flex-col justify-between group transition-all bg-[var(--bg-card)] border ${
                    isBooked
                      ? 'border-[var(--accent)] shadow-[var(--shadow-md)]'
                      : 'border-[var(--border)] hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-sm)]'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        Level {lvl.level_number}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                        {modeName} MODE
                      </span>
                    </div>

                    <div>
                      <h4 className="text-[17px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {lvl.name}
                      </h4>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed line-clamp-3">
                        {lvl.description || 'Hands-on examination tier in campus laboratory.'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-3 font-mono text-[11px] text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5 bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
                        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Duration: <strong>{duration} Mins</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--green)]" />
                        <span>Pool: <strong>{qCount} Questions</strong></span>
                      </div>
                    </div>

                    {/* Slot Booking Pass Details (If Booked) */}
                    {isBooked && (
                      <div className="mt-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs space-y-1">
                        {booking.slot?.slot_type === 'online' ? (
                          <>
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-indigo-400 flex items-center gap-1.5 font-bold">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Online Video Assessment</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                activeCheckIn?.can_start && activeCheckIn.booking?.id === booking.id
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {activeCheckIn?.can_start && activeCheckIn.booking?.id === booking.id ? 'Live Now' : 'Online Session'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              {booking.slot?.slot_date} • {booking.slot?.start_time} - {booking.slot?.end_time} • No faculty check-in needed
                            </p>
                          </>
                        ) : isVerified ? (
                          <>
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-[var(--text-primary)]">{booking.slot?.venue?.name} (Room {booking.slot?.venue?.room_number})</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isPresent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {booking.attendance_status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              {booking.slot?.slot_date} • {booking.slot?.start_time} - {booking.slot?.end_time}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-[var(--accent)] font-medium">Session: {booking.slot?.start_time} - {booking.slot?.end_time}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                Allocation in Progress
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              {booking.slot?.slot_date} • Room details will be released once verified
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between gap-3">
                    {booking?.slot?.slot_type === 'online' ? (
                      activeCheckIn?.can_start && activeCheckIn.booking?.id === booking.id ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Session Live</span>
                          </div>
                          <button
                            onClick={() => handleStartVerifiedInterview(selectedTrack, lvl)}
                            className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-[13px] py-2 px-4 flex items-center gap-2 shadow-md font-bold cursor-pointer transition-transform hover:scale-105"
                          >
                            <Video className="w-4 h-4" />
                            <span>Launch Interview</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                            <Globe className="w-3.5 h-3.5" />
                            <span>Online ({booking.slot?.start_time})</span>
                          </div>
                          <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-mono text-indigo-400">
                            <span>Unlocks on Time</span>
                          </div>
                        </>
                      )
                    ) : isPresent ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Attendance Verified</span>
                        </div>
                        <button
                          onClick={() => handleStartVerifiedInterview(selectedTrack, lvl)}
                          className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-[13px] py-2 px-4 flex items-center gap-2 shadow-md font-bold cursor-pointer transition-transform hover:scale-105"
                        >
                          <Video className="w-4 h-4" />
                          <span>Launch Interview</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : isBooked && isVerified ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium animate-pulse">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Report to Venue</span>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
                          <span>Slot Reserved</span>
                        </div>
                      </>
                    ) : isBooked ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Allocation Pending</span>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
                          <span>Slot Reserved</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                          <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Session Booking</span>
                        </div>
                        <button
                          onClick={() => handleOpenSlotBooking(selectedTrack, lvl)}
                          className="btn btn-primary text-[13px] py-2 px-4 flex items-center gap-2 shadow-[var(--shadow-sm)] hover:scale-[1.02] active:scale-[0.98] transition-transform font-bold cursor-pointer"
                        >
                          <CalendarCheck className="w-4 h-4" />
                          <span>Book a Slot</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: DOMAIN OVERVIEW CARDS */
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="panel-card p-4">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search interview domains (e.g., DSA, System Design)..."
                className="custom-input search-input text-[12px] py-2"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          {/* Domain Cards Grid */}
          {loading ? (
            <SkeletonTrackGrid count={4} />
          ) : filteredTracks.length === 0 ? (
            <div className="panel-card p-10 text-center space-y-2">
              <Video className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">No interview domains found</h3>
              <p className="text-[13px] text-[var(--text-muted)]">Try adjusting your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredTracks.map((track) => {
                const IconComponent = getTrackIcon(track.icon);
                const levels = track.levels || [];
                const primaryMode = levels[0]?.mode || 'coding';
                const levelCount = levels.length || track.levels_count || 1;

                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className="panel-card p-6 flex flex-col justify-between group hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] transition-all bg-[var(--bg-card)] border border-[var(--border)] cursor-pointer"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
                          <IconComponent className="w-6 h-6" />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                            {track.category || 'Technical'}
                          </span>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            {primaryMode.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {track.title}
                        </h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {track.description || 'Core computer science fundamentals, algorithmic problem solving, and system design.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[12px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span><strong>{levelCount}</strong> {levelCount === 1 ? 'Level' : 'Levels'} Available</span>
                      </div>

                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:underline">
                        <span>Book Slot</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* INTEGRATED IN-PLACE SLOT BOOKING MODAL */}
      {/* ============================================================ */}
      {bookingModalOpen && targetLevel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-[var(--accent)]" />
                  <span>Book Interview Slot</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {targetLevel.track.title} • Level {targetLevel.level?.level_number}: {targetLevel.level?.name}
                </p>
              </div>
              <button
                onClick={() => setBookingModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)] mb-2" />
                  <p className="text-xs">Checking available slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-6 text-[var(--text-secondary)] space-y-2">
                  <div className="w-36 h-36 mx-auto">
                    <DotLottieReact
                      src="/lotties/document-empty.lottie"
                      loop
                      autoplay
                    />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">No slots available</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                    No interview slots are currently open for this domain and level. Please check back later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {availableSlots.map((slot) => {
                    const isFull = slot.available_seats <= 0;
                    const isBookedByMe = slot.is_booked_by_me;

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isBookedByMe
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--border-accent)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              slot.slot_type === 'online'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--accent)]'
                            }`}>
                              {slot.slot_type === 'online' ? 'Online Remote' : slot.slot_date}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{slot.start_time} - {slot.end_time}</span>
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-1">
                            <div className="flex items-center gap-2">
                              {slot.slot_type === 'online' ? (
                                <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-[var(--accent)] shrink-0" />
                              )}
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                {slot.slot_type === 'online' ? 'Online Virtual Session' : `Session Time: ${slot.start_time} - ${slot.end_time}`}
                              </h4>
                            </div>
                            <p className="text-[10.5px] text-[var(--text-secondary)]">
                              {slot.slot_type === 'online'
                                ? 'No physical venue / faculty required. Starts automatically on time.'
                                : 'Venue and room details will be assigned upon booking.'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          {isBookedByMe ? (
                            <div className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-500 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Current Booking</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleConfirmSlotBooking(slot.id)}
                              disabled={isFull || bookingLoading}
                              className="w-full py-2 px-3 rounded-lg bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {bookingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>{isFull ? 'Slot Full' : 'Confirm Slot'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] shrink-0 flex justify-end bg-[var(--bg)]">
              <button
                onClick={() => setBookingModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCHMAKING RADAR MODAL OVERLAY */}
      {matchStatus !== 'idle' && (
        <div 
          onClick={() => { if (matchStatus !== 'matched') handleCancelMatchmaking(); }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel-card w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-xl)] rounded-[var(--radius-lg)] text-center space-y-6 relative animate-fadeIn"
          >
            {matchStatus !== 'matched' && (
              <button
                onClick={handleCancelMatchmaking}
                className="absolute right-4 top-4 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
                title="Cancel Search"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              {matchStatus === 'matched' ? (
                <div className="w-24 h-24 rounded-full bg-[var(--green-bg)] border-2 border-[var(--green)] flex items-center justify-center text-[var(--green)] animate-bounce">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full border border-[var(--accent)]/20 animate-ping" />
                  <div className="absolute inset-3 rounded-full border border-[var(--accent)]/40 animate-pulse" />
                  <div className="absolute inset-8 rounded-full border border-[var(--accent)]/60" />
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-dim)] border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shadow-lg shadow-[var(--accent)]/20">
                    <Users className="w-7 h-7 animate-pulse" />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                {matchStatus === 'matched'
                  ? 'Peer Match Found!'
                  : 'Matching Verified Candidates in Lab...'}
              </h2>
              <div className="space-y-0.5">
                <p className="text-[14px] font-bold text-[var(--text-primary)]">
                  {activeQueue?.trackTitle || 'Mock Interview Track'}
                </p>
                {activeQueue?.levelName && (
                  <p className="text-[12px] text-[var(--accent)] font-mono font-medium">
                    Level {activeQueue.levelNumber}: {activeQueue.levelName} ({activeQueue.durationMinutes}m)
                  </p>
                )}
              </div>
            </div>

            {matchStatus === 'searching' && (
              <div className="bg-[var(--bg-raised)] py-2.5 px-4 rounded-[var(--radius-md)] border border-[var(--border)] inline-flex items-center gap-2 text-[13px] font-mono text-[var(--text-primary)]">
                <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                <span>Queue Duration: <strong>{formatTime(queueElapsed)}</strong></span>
              </div>
            )}

            {matchStatus === 'matched' && (
              <div className="bg-[var(--green-bg)] text-[var(--green)] py-2.5 px-4 rounded-[var(--radius-md)] border border-[var(--green)]/30 text-[13px] font-semibold">
                Connecting to live interview room...
              </div>
            )}

            {matchStatus === 'searching' && (
              <div className="pt-2">
                <button
                  onClick={handleCancelMatchmaking}
                  className="btn btn-secondary text-[12px] py-2 px-5 font-semibold cursor-pointer"
                >
                  Cancel Matchmaking
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
