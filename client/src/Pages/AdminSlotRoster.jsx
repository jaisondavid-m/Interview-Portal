import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Globe,
  MapPin,
  ClipboardList,
  ShieldCheck,
  Shuffle,
  Trash2,
  Download,
  Printer,
  UserCheck,
  Check,
  X,
  Layers,
  Sparkles,
  ArrowRightLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import api from '../api/axios';
import ConfirmModal from '../Components/ConfirmModal';
import SearchableSelect from '../Components/SearchableSelect';

export default function AdminSlotRoster() {
  const { slotId } = useParams();
  const navigate = useNavigate();

  // Roster & Slot Data
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [venueFilter, setVenueFilter] = useState('all');
  const [attendanceFilter, setAttendanceFilter] = useState('all');

  // Action Loading States
  const [autoBalancing, setAutoBalancing] = useState(false);
  const [publishingAllocations, setPublishingAllocations] = useState(false);
  const [reassigningBookingId, setReassigningBookingId] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Roster Data
  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/slots/${slotId}/roster`);
      const payload = res?.data || res;
      setRosterData(payload);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load slot roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slotId) {
      fetchRoster();
    }
  }, [slotId]);

  // Derived properties from rosterData
  const slot = rosterData?.slot || null;
  const bookings = useMemo(() => rosterData?.bookings || [], [rosterData]);
  const isOnlineSlot = slot?.slot_type === 'online';

  // Extract slot assigned venues array cleanly
  const assignedVenues = useMemo(() => {
    if (rosterData?.assigned_venues && rosterData.assigned_venues.length > 0) {
      return rosterData.assigned_venues;
    }
    if (slot?.venues && slot.venues.length > 0) {
      return slot.venues;
    }
    if (slot?.venue) {
      return [{
        id: slot.id,
        venue_id: slot.venue.id,
        venue: slot.venue,
        faculty_id: slot.faculty_id,
        faculty: slot.faculty,
        capacity: slot.capacity,
      }];
    }
    return [];
  }, [rosterData, slot]);

  // All active system venues fallback for dropdown
  const availableVenues = useMemo(() => {
    if (rosterData?.available_venues && rosterData.available_venues.length > 0) {
      return rosterData.available_venues;
    }
    return assignedVenues.map(av => av.venue).filter(Boolean);
  }, [rosterData, assignedVenues]);

  // Computed metrics
  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings]);
  const presentCount = useMemo(() => bookings.filter(b => b.attendance_status === 'present').length, [bookings]);
  const absentCount = useMemo(() => bookings.filter(b => b.attendance_status === 'absent').length, [bookings]);
  const lateCount = useMemo(() => bookings.filter(b => b.attendance_status === 'late').length, [bookings]);
  const verifiedCount = useMemo(() => activeBookings.filter(b => b.allocation_status === 'verified' || isOnlineSlot).length, [activeBookings, isOnlineSlot]);

  // Filtered Bookings for the Table
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = b.student?.name?.toLowerCase().includes(q);
        const matchesRoll = b.student?.roll_no?.toLowerCase().includes(q);
        const matchesEmail = b.student?.email?.toLowerCase().includes(q);
        const matchesTrack = b.track?.title?.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesEmail && !matchesTrack) return false;
      }

      // Venue filter
      if (venueFilter !== 'all') {
        if (String(b.assigned_venue_id) !== venueFilter) return false;
      }

      // Attendance filter
      if (attendanceFilter !== 'all') {
        if (attendanceFilter === 'cancelled') {
          if (b.status !== 'cancelled') return false;
        } else if (attendanceFilter === 'pending') {
          if (b.attendance_status && b.attendance_status !== 'pending' && b.status !== 'cancelled') return false;
        } else {
          if (b.attendance_status !== attendanceFilter || b.status === 'cancelled') return false;
        }
      }

      return true;
    });
  }, [bookings, searchTerm, venueFilter, attendanceFilter]);

  // Handlers
  const handleAutoBalanceVenues = async () => {
    if (!slotId) return;
    try {
      setAutoBalancing(true);
      await api.post(`/admin/slots/${slotId}/auto-balance`);
      showToast('Candidates evenly balanced across all assigned venues!');
      await fetchRoster();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to auto-balance venues', 'error');
    } finally {
      setAutoBalancing(false);
    }
  };

  const handlePublishAllocations = async () => {
    if (!slotId) return;
    try {
      setPublishingAllocations(true);
      await api.post(`/admin/slots/${slotId}/publish-allocations`);
      showToast('Allocations verified and published to candidate dashboards!');
      await fetchRoster();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish allocations', 'error');
    } finally {
      setPublishingAllocations(false);
    }
  };

  const handleReassignVenue = async (bookingId, newVenueId) => {
    if (!slotId || !newVenueId) return;
    try {
      setReassigningBookingId(bookingId);
      await api.post(`/admin/slots/${slotId}/reassign-venue`, {
        booking_id: bookingId,
        venue_id: Number(newVenueId),
      });
      showToast('Candidate venue reassigned successfully');
      await fetchRoster();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reassign candidate venue', 'error');
    } finally {
      setReassigningBookingId(null);
    }
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    const booking = bookingToCancel;
    const studentName = booking.student?.name || 'Candidate';

    try {
      setCancellingBookingId(booking.id);
      await api.post(`/admin/slots/bookings/${booking.id}/cancel`);
      showToast(`Booking cancelled for ${studentName}`);
      await fetchRoster();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel student booking', 'error');
    } finally {
      setCancellingBookingId(null);
      setBookingToCancel(null);
    }
  };

  // Export Roster as CSV
  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) {
      showToast('No candidates to export', 'error');
      return;
    }

    const headers = ['Roll No', 'Name', 'Email', 'Department', 'Track', 'Level', 'Assigned Venue', 'Room No', 'Allocation Status', 'Attendance Status'];
    const rows = bookings.map(b => {
      const vName = isOnlineSlot ? 'Online Remote' : (b.assigned_venue?.name || slot?.venue?.name || 'N/A');
      const roomNo = isOnlineSlot ? 'Virtual' : (b.assigned_venue?.room_number || slot?.venue?.room_number || 'N/A');
      const levelStr = b.level ? `L${b.level.level_number}: ${b.level.name}` : (b.level_id ? `Level ${b.level_id}` : 'N/A');

      return [
        `"${b.student?.roll_no || ''}"`,
        `"${b.student?.name || ''}"`,
        `"${b.student?.email || ''}"`,
        `"${b.student?.department || ''}"`,
        `"${b.track?.title || 'General'}"`,
        `"${levelStr}"`,
        `"${vName}"`,
        `"${roomNo}"`,
        `"${b.allocation_status || (isOnlineSlot ? 'verified' : 'draft')}"`,
        `"${b.status === 'cancelled' ? 'Cancelled' : (b.attendance_status || 'pending')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Slot_${slotId}_Roster_${slot?.slot_date || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Roster exported as CSV successfully');
  };

  // Print Roster
  const handlePrint = () => {
    window.print();
  };

  if (loading && !rosterData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">Loading candidate roster & venue allocations...</p>
      </div>
    );
  }

  if (!slot && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Interview Slot Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)]">The requested slot roster does not exist or has been deleted.</p>
        <Link
          to="/admin/venues"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Venues & Slots</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold transition-all ${
          toast.type === 'error'
            ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
            : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/30'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Link to="/admin/venues" className="hover:text-[var(--accent)] transition flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Venues & Slots</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="font-semibold text-[var(--text-primary)]">Slot Candidate Roster</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
              {isOnlineSlot ? (
                <Globe className="w-6 h-6 text-indigo-400" />
              ) : (
                <ClipboardList className="w-6 h-6 text-[var(--accent)]" />
              )}
              <span>Candidate Roster & Allocation Workspace</span>
            </h1>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                slot.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : slot.status === 'scheduled'
                  ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
              }`}>
                {slot.status}
              </span>

              {isOnlineSlot ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Online Remote</span>
                </span>
              ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                  slot.allocations_published
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {slot.allocations_published ? '✓ Allocations Published' : 'Draft Allocation'}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 flex-wrap pt-1">
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{slot.slot_date}</span>
            </span>
            <span>•</span>
            <span className="text-[var(--accent)] font-mono font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{slot.start_time} - {slot.end_time}</span>
            </span>
            <span>•</span>
            <span>
              Occupancy: <strong className="text-[var(--text-primary)]">{activeBookings.length}</strong> / {slot.capacity} Candidates Booked
            </span>
          </p>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Link
            to="/admin/venues"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--accent)]" />
            <span>Back to All Slots</span>
          </Link>

          {!isOnlineSlot && (
            <>
              <button
                type="button"
                onClick={handleAutoBalanceVenues}
                disabled={autoBalancing || assignedVenues.length <= 1}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold shadow-sm transition disabled:opacity-40 cursor-pointer"
                title="Evenly distribute booked candidates across assigned venues"
              >
                {autoBalancing ? <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" /> : <Shuffle className="w-4 h-4 text-[var(--accent)]" />}
                <span>Auto-Balance Venues</span>
              </button>

              <button
                type="button"
                onClick={handlePublishAllocations}
                disabled={publishingAllocations}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                title="Publish room allocations so candidates can view their room numbers"
              >
                {publishingAllocations ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{slot.allocations_published ? 'Re-Publish Allocations' : 'Verify & Publish'}</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-1 border-l border-[var(--border)] pl-2">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Export Candidate Roster (CSV)"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              title="Print Attendance Sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={fetchRoster}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Refresh Roster Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Capacity Gauge */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              <span>Seat Occupancy</span>
            </span>
            <span className="font-bold text-[var(--text-primary)] font-mono">
              {activeBookings.length} / {slot.capacity} Seats
            </span>
          </div>
          <div className="h-2.5 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all"
              style={{ width: `${Math.min((activeBookings.length / (slot.capacity || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] font-mono text-right">
            {slot.capacity > 0 ? Math.round((activeBookings.length / slot.capacity) * 100) : 0}% Filled
          </p>
        </div>

        {/* Metric 2: Attendance Check-In */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>In-Venue Check-in Rate</span>
            </span>
            <span className="font-bold text-emerald-500 font-mono">
              {presentCount} / {activeBookings.length}
            </span>
          </div>
          <div className="h-2.5 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min((presentCount / (activeBookings.length || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] font-mono text-right">
            {activeBookings.length > 0 ? Math.round((presentCount / activeBookings.length) * 100) : 0}% Present
          </p>
        </div>

        {/* Metric 3: Allocations Status */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-secondary)] font-medium block">Allocations Verified</span>
            <div className="text-lg font-bold text-[var(--text-primary)] font-mono">
              {verifiedCount} / {activeBookings.length}
            </div>
            <p className="text-[10.5px] text-[var(--text-muted)]">
              {isOnlineSlot ? 'Online Auto-Verified' : (slot.allocations_published ? 'Published to Students' : 'Draft / Hidden')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Assigned Venues Count */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-secondary)] font-medium block">Format / Venues</span>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {isOnlineSlot ? 'Online Virtual' : `${assignedVenues.length} Assigned ${assignedVenues.length === 1 ? 'Venue' : 'Venues'}`}
            </div>
            <p className="text-[10.5px] text-[var(--text-muted)]">
              {isOnlineSlot ? 'Remote Peer Assessment' : `${assignedVenues.reduce((s, v) => s + (v.capacity || 0), 0)} Total Room Seats`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center">
            {isOnlineSlot ? <Globe className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Multi-Venue Distribution Breakdown (Physical Slots Only) */}
      {!isOnlineSlot && assignedVenues.length > 0 && (
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Assigned Venues & Invigilator Distribution</span>
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">Click a venue to filter the roster table below</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {assignedVenues.map((va) => {
              const activeCountInVenue = activeBookings.filter(
                b => String(b.assigned_venue_id) === String(va.venue_id)
              ).length;

              const isSelected = venueFilter === String(va.venue_id);

              return (
                <div
                  key={va.id || va.venue_id}
                  onClick={() => setVenueFilter(isSelected ? 'all' : String(va.venue_id))}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? 'bg-[var(--accent-dim)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate">{va.venue?.name || `Venue #${va.venue_id}`}</span>
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                        Room {va.venue?.room_number || 'N/A'} • {va.venue?.building || 'Main Campus'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 ${
                      activeCountInVenue > (va.capacity || 0)
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                    }`}>
                      {activeCountInVenue} / {va.capacity || 30}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]/70 flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Invigilator:</span>
                    <span className="font-semibold text-emerald-500 truncate max-w-[140px]" title={va.faculty?.name}>
                      {va.faculty?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Roster Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden space-y-0">
        {/* Search and Filters Bar */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search candidate roll no, name, email, track..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Venue Filter Dropdown (Physical Slots) */}
            {!isOnlineSlot && assignedVenues.length > 0 && (
              <SearchableSelect
                options={[
                  { value: 'all', label: `All Venues (${activeBookings.length})` },
                  ...assignedVenues.map(va => ({
                    value: String(va.venue_id),
                    label: `${va.venue?.name || `Venue #${va.venue_id}`} (${activeBookings.filter(b => String(b.assigned_venue_id) === String(va.venue_id)).length})`
                  }))
                ]}
                value={venueFilter}
                onChange={(val) => setVenueFilter(val)}
                menuWidth="w-60"
              />
            )}

            {/* Attendance Status Filter Pills */}
            <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto custom-scrollbar">
              {[
                { id: 'all', label: 'All', count: bookings.length },
                { id: 'present', label: 'Present', count: presentCount, badgeClass: 'text-emerald-500' },
                { id: 'pending', label: 'Pending', count: activeBookings.length - presentCount - absentCount - lateCount },
                { id: 'absent', label: 'Absent', count: absentCount, badgeClass: 'text-rose-500' },
                { id: 'cancelled', label: 'Cancelled', count: bookings.length - activeBookings.length, badgeClass: 'text-zinc-400' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAttendanceFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                    attendanceFilter === tab.id
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="ml-1 opacity-80 font-mono">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto custom-scrollbar">
          {filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--text-secondary)]">
              <Users className="w-10 h-10 mb-2 opacity-40 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">No candidates match your search filter</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Try clearing search keywords or selecting a different venue tab.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Candidate Details</th>
                  <th className="py-3 px-4">Domain Track & Level</th>
                  <th className="py-3 px-4">Assigned Venue / Mode</th>
                  <th className="py-3 px-4">Allocation</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredBookings.map((b) => {
                  const isCancelled = b.status === 'cancelled';
                  const isCancelling = cancellingBookingId === b.id;
                  const isReassigning = reassigningBookingId === b.id;

                  // Construct complete dropdown venue options (assigned slot venues + available system venues)
                  const venueOptionList = availableVenues.map(v => ({
                    value: String(v.id),
                    label: `${v.name} (${v.room_number || 'Room'}) - ${v.building || ''}`
                  }));

                  return (
                    <tr
                      key={b.id}
                      className={`transition-all ${isCancelled ? 'opacity-50 bg-[var(--bg)]/60' : 'hover:bg-[var(--bg-hover)]'}`}
                    >
                      {/* Roll Number */}
                      <td className="py-3 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {b.student?.roll_no || 'N/A'}
                      </td>

                      {/* Candidate Info */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[var(--text-primary)]">{b.student?.name || 'Student Candidate'}</p>
                        <p className="text-[10.5px] text-[var(--text-secondary)] font-mono">
                          {b.student?.email || b.student?.department || 'Student'}
                        </p>
                      </td>

                      {/* Domain Track & Level */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                          <span>{b.track?.title || 'General Domain'}</span>
                        </div>
                        {b.level ? (
                          <span className="text-[10px] text-[var(--accent)] font-mono font-medium">
                            Level {b.level.level_number}: {b.level.name}
                          </span>
                        ) : b.level_id ? (
                          <span className="text-[10px] text-[var(--accent)] font-mono font-medium">
                            Level {b.level_id}
                          </span>
                        ) : null}
                      </td>

                      {/* Assigned Venue Selector / Virtual Mode */}
                      <td className="py-3 px-4">
                        {isCancelled ? (
                          <span className="text-zinc-500 text-[11px]">—</span>
                        ) : isOnlineSlot ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span>Online Remote</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <SearchableSelect
                              options={venueOptionList}
                              value={String(b.assigned_venue_id || b.assigned_venue?.id || slot?.venue_id || '')}
                              onChange={(val) => handleReassignVenue(b.id, val)}
                              menuWidth="w-72"
                              fullWidth
                            />
                            {isReassigning && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)] shrink-0" />}
                          </div>
                        )}
                      </td>

                      {/* Allocation Status */}
                      <td className="py-3 px-4">
                        {isCancelled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Cancelled
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${
                            b.allocation_status === 'verified' || isOnlineSlot
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {b.allocation_status === 'verified' || isOnlineSlot ? '✓ Verified' : 'Draft'}
                          </span>
                        )}
                      </td>

                      {/* Physical Attendance Status */}
                      <td className="py-3 px-4">
                        {isCancelled ? (
                          <span className="text-zinc-500 text-[11px]">—</span>
                        ) : isOnlineSlot ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Auto (Virtual)
                          </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.attendance_status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : b.attendance_status === 'absent'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : b.attendance_status === 'late'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}>
                            {b.attendance_status || 'pending'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isCancelled ? (
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            Seat Released
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBookingToCancel(b)}
                            disabled={isCancelling}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[10.5px] font-semibold transition cursor-pointer disabled:opacity-50"
                            title="Cancel candidate booking and free up seat"
                          >
                            {isCancelling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>Cancel Seat</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)] flex items-center justify-between text-xs text-[var(--text-secondary)] flex-wrap gap-2">
          <div>
            Showing <strong className="text-[var(--text-primary)]">{filteredBookings.length}</strong> of {bookings.length} candidate booking(s)
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Tip: Select candidate venues in the dropdown to instantly re-assign them to a specific room.
          </div>
        </div>
      </div>

      {/* CONFIRM CANCEL STUDENT BOOKING MODAL */}
      <ConfirmModal
        isOpen={Boolean(bookingToCancel)}
        title="Cancel Candidate Booking"
        message={
          bookingToCancel ? (
            <span>
              Are you sure you want to cancel the booking for{' '}
              <strong className="text-[var(--text-primary)]">
                {bookingToCancel.student?.name || 'Candidate'}
                {bookingToCancel.student?.roll_no ? ` (${bookingToCancel.student.roll_no})` : ''}
              </strong>
              ? This will release their allocated seat back into the slot.
            </span>
          ) : ''
        }
        confirmText="Confirm Cancellation"
        cancelText="Keep Booking"
        loading={Boolean(cancellingBookingId)}
        onConfirm={handleConfirmCancelBooking}
        onCancel={() => setBookingToCancel(null)}
      />
    </div>
  );
}
