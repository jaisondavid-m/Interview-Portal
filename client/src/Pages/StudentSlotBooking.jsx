import React, { useState, useEffect } from 'react';
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
  Ticket
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function StudentSlotBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my_bookings'
  
  // Available Slots
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // My Bookings & Check-in
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState(null);

  // Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [slotToBook, setSlotToBook] = useState(null);
  const [bookingTrackId, setBookingTrackId] = useState('');
  const [bookingLevelId, setBookingLevelId] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const params = new URLSearchParams();
      if (selectedTrackId) params.append('track_id', selectedTrackId);
      if (dateFilter) params.append('date', dateFilter);

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/slots/available${query}`);
      const data = res?.data || res;
      setAvailableSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load available interview slots', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchMyBookingsAndStatus = async () => {
    try {
      setLoadingBookings(true);
      const [bookingsRes, checkinRes] = await Promise.all([
        api.get('/slots/my-bookings'),
        api.get('/slots/active-checkin')
      ]);

      const bList = bookingsRes?.data || bookingsRes || [];
      setMyBookings(Array.isArray(bList) ? bList : []);
      setActiveCheckIn(checkinRes?.data || checkinRes || null);
    } catch (err) {
      console.error('Failed to load my bookings', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const res = await api.get('/interviews/tracks');
      const data = res?.data || res || [];
      setTracks(Array.isArray(data) ? data : []);
      if (data.length > 0 && !bookingTrackId) {
        setBookingTrackId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load tracks', err);
    }
  };

  useEffect(() => {
    fetchAvailableSlots();
    fetchMyBookingsAndStatus();
    fetchTracks();
  }, []);

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedTrackId, dateFilter]);

  // Periodic polling for active attendance status check
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

  // Handle Book Slot Confirmation
  const handleOpenBooking = (slot) => {
    setSlotToBook(slot);
    setBookingTrackId(slot.track_id || tracks[0]?.id || '');
    setShowBookingModal(true);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!slotToBook || !bookingTrackId) {
      showToast('Please select a domain track for your assessment', 'error');
      return;
    }

    try {
      setBookingLoading(true);
      await api.post('/slots/book', {
        slot_id: slotToBook.id,
        track_id: Number(bookingTrackId),
        level_id: bookingLevelId ? Number(bookingLevelId) : 0,
      });

      showToast('Slot booked successfully! Please report to the lab on time.');
      setShowBookingModal(false);
      fetchAvailableSlots();
      fetchMyBookingsAndStatus();
      setActiveTab('my_bookings');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to book slot', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this slot booking?')) return;
    try {
      await api.post(`/slots/bookings/${bookingId}/cancel`);
      showToast('Booking cancelled successfully');
      fetchAvailableSlots();
      fetchMyBookingsAndStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
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

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Physical Lab Slot Booking
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            Book an interview examination seat at your campus lab. In-venue faculty invigilators verify your attendance to unlock the interview room.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl border border-[var(--border)] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'available'
                ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Available Slots</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('my_bookings');
              fetchMyBookingsAndStatus();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'my_bookings'
                ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Bookings</span>
            {myBookings.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
                {myBookings.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LIVE IN-VENUE ATTENDANCE GATE CARD (If Active Booking Today) */}
      {activeCheckIn?.has_active_booking && activeCheckIn.booking && (
        <div className={`p-5 rounded-2xl border transition-all ${
          activeCheckIn.can_start
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
            : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeCheckIn.can_start
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-amber-500/20 text-amber-500 animate-pulse'
              }`}>
                {activeCheckIn.can_start ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {activeCheckIn.can_start
                      ? 'Attendance Verified — Cleared to Interview!'
                      : 'Waiting for Faculty In-Venue Verification'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    activeCheckIn.can_start
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white animate-pulse'
                  }`}>
                    {activeCheckIn.attendance_status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {activeCheckIn.can_start ? (
                    <span>Faculty has checked you in at <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.venue?.name} (Room {activeCheckIn.booking.slot?.venue?.room_number})</strong>. You can now launch your mock interview!</span>
                  ) : (
                    <span>Please report to <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.venue?.name} ({activeCheckIn.booking.slot?.venue?.room_number})</strong>. Invigilator <strong className="text-[var(--text-primary)]">{activeCheckIn.booking.slot?.faculty?.name}</strong> will mark your attendance. (Auto-refreshing...)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeCheckIn.can_start ? (
                <button
                  onClick={() => navigate('/interviews')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all animate-bounce"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Mock Interview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking live status...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: AVAILABLE SLOTS */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-medium">Filter Domain:</span>
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">All Domains</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="font-medium">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={fetchAvailableSlots}
              disabled={loadingSlots}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Slots Cards */}
          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
              <p className="text-xs">Loading available slots...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
              <Building2 className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mb-2" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No interview slots available</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                There are no open examination slots matching your filter criteria. Please check back soon or try another date.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSlots.map((slot) => {
                const isFull = slot.available_seats <= 0;
                const isBooked = slot.is_booked_by_me;

                return (
                  <div
                    key={slot.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isBooked
                        ? 'bg-[var(--accent-dim)]/20 border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border-accent)]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]">
                          {slot.track_title}
                        </span>

                        <div className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{slot.start_time} - {slot.end_time}</span>
                        </div>
                      </div>

                      {/* Venue & Location */}
                      <h3 className="text-base font-bold text-[var(--text-primary)]">{slot.venue_name}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Room {slot.room_number} • {slot.building}
                      </p>

                      <div className="mt-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Date:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{slot.slot_date}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Faculty Invigilator:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{slot.faculty_name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Remaining Seats:</span>
                          <span className={`font-bold font-mono ${isFull ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {slot.available_seats} / {slot.total_capacity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-[var(--border)]">
                      {isBooked ? (
                        <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Already Booked by You</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenBooking(slot)}
                          disabled={isFull}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          <CalendarCheck className="w-4 h-4" />
                          <span>{isFull ? 'Slot Full' : 'Book Interview Seat'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKINGS */}
      {activeTab === 'my_bookings' && (
        <div className="space-y-4">
          {loadingBookings ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
              <p className="text-xs">Loading your bookings...</p>
            </div>
          ) : myBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
              <Ticket className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mb-2" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No bookings found</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                You haven't booked any upcoming physical examination slots yet.
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-sm"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Browse Available Slots</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBookings.map((b) => {
                const isCancelled = b.status === 'cancelled';
                const isPresent = b.attendance_status === 'present';
                const isPending = b.attendance_status === 'pending';

                return (
                  <div
                    key={b.id}
                    className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]">
                          <Ticket className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">{b.slot?.venue?.name}</h3>
                          <p className="text-[11px] text-[var(--text-secondary)]">Room {b.slot?.venue?.room_number} • {b.slot?.venue?.building}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPresent
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : isCancelled
                          ? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {b.attendance_status}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)]">Date & Time</span>
                        <p className="font-semibold text-[var(--text-primary)]">{b.slot?.slot_date}</p>
                        <p className="text-[11px] text-[var(--accent)]">{b.slot?.start_time} - {b.slot?.end_time}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)]">Track / Faculty</span>
                        <p className="font-semibold text-[var(--text-primary)]">{b.track?.title}</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">{b.slot?.faculty?.name || 'Staff'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                      {isPresent ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Cleared for Interview</span>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-secondary)]">
                          Report to lab before {b.slot?.start_time}
                        </div>
                      )}

                      {!isCancelled && !isPresent && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-3 py-1 text-xs font-semibold text-[var(--red)] hover:bg-[var(--red-bg)] rounded-lg transition-all"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CONFIRM BOOKING */}
      {showBookingModal && slotToBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[var(--accent)]" />
                <span>Confirm Slot Reservation</span>
              </h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-1">
                <p className="text-xs font-semibold text-[var(--text-primary)]">{slotToBook.venue_name}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Room {slotToBook.room_number} • {slotToBook.building}</p>
                <p className="text-[11px] text-[var(--accent)] font-semibold">{slotToBook.slot_date} • {slotToBook.start_time} - {slotToBook.end_time}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Faculty Invigilator: {slotToBook.faculty_name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Choose Assessment Domain Track *
                </label>
                <select
                  required
                  value={bookingTrackId}
                  onChange={(e) => setBookingTrackId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Important Laboratory Notice:</span>
                </p>
                <p>You must physically report to this lab venue. The faculty invigilator will mark your attendance to unlock your mock interview.</p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm disabled:opacity-50"
                >
                  {bookingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reservation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
