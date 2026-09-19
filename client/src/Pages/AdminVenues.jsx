import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X,
  UserCheck,
  MapPin,
  Layers,
  Sparkles,
  ClipboardList,
  Eye,
  RefreshCw,
  Globe,
  CheckSquare,
  Square,
  BookOpen,
  ShieldCheck,
  Shuffle,
  ArrowRightLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import api from '../api/axios';
import ConfirmModal from '../Components/ConfirmModal';

export default function AdminVenues() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('slots'); // 'slots' | 'venues'
  
  // Venues State
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueSearch, setVenueSearch] = useState('');
  
  // Slots State
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotDateFilter, setSlotDateFilter] = useState('');
  const [slotVenueFilter, setSlotVenueFilter] = useState('all');
  const [slotFacultyFilter, setSlotFacultyFilter] = useState('all');
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);

  // Active slot details synchronized with updated slots list
  const activeSlot = useMemo(() => {
    if (!selectedSlotDetails) return null;
    return slots.find(s => s.id === selectedSlotDetails.id) || selectedSlotDetails;
  }, [slots, selectedSlotDetails]);
  
  // Faculty List & Tracks
  const [facultyList, setFacultyList] = useState([]);
  const [tracks, setTracks] = useState([]);

  // Modals
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueFormData, setVenueFormData] = useState({
    name: '',
    building: '',
    room_number: '',
    capacity: 30,
    description: '',
    is_active: true,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'venue'|'slot', id, name }

  // Roster Modal State
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedSlotRoster, setSelectedSlotRoster] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterVenueFilter, setRosterVenueFilter] = useState('all');
  const [autoBalancing, setAutoBalancing] = useState(false);
  const [publishingAllocations, setPublishingAllocations] = useState(false);
  const [reassigningBookingId, setReassigningBookingId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  const fetchVenues = async () => {
    try {
      setLoadingVenues(true);
      const res = await api.get('/admin/venues');
      const data = res?.data || res;
      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load venues', 'error');
    } finally {
      setLoadingVenues(false);
    }
  };

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const params = new URLSearchParams();
      if (slotDateFilter) params.append('date', slotDateFilter);
      if (slotVenueFilter !== 'all') params.append('venue_id', slotVenueFilter);
      if (slotFacultyFilter !== 'all') params.append('faculty_id', slotFacultyFilter);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/slots${query}`);
      const data = res?.data || res;
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load slots', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchFacultyAndTracks = async () => {
    try {
      const [facRes, trackRes] = await Promise.all([
        api.get('/admin/venues/faculty-list'),
        api.get('/interviews/tracks')
      ]);
      setFacultyList(facRes?.data || facRes || []);
      setTracks(trackRes?.data || trackRes || []);
    } catch (err) {
      console.error('Failed to load auxiliary lists', err);
    }
  };

  useEffect(() => {
    fetchVenues();
    fetchSlots();
    fetchFacultyAndTracks();
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchSlots();
    }
  }, [slotDateFilter, slotVenueFilter, slotFacultyFilter]);

  // Venue Handlers
  const handleOpenCreateVenue = () => {
    setEditingVenue(null);
    setVenueFormData({
      name: '',
      building: '',
      room_number: '',
      capacity: 30,
      description: '',
      is_active: true,
    });
    setShowVenueModal(true);
  };

  const handleOpenEditVenue = (v) => {
    setEditingVenue(v);
    setVenueFormData({
      name: v.name,
      building: v.building,
      room_number: v.room_number,
      capacity: v.capacity,
      description: v.description || '',
      is_active: v.is_active,
    });
    setShowVenueModal(true);
  };

  const handleSaveVenue = async (e) => {
    e.preventDefault();
    if (!venueFormData.name || !venueFormData.building || !venueFormData.room_number) {
      showToast('Please fill in all required venue fields', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingVenue) {
        await api.put(`/admin/venues/${editingVenue.id}`, venueFormData);
        showToast('Venue updated successfully');
      } else {
        await api.post('/admin/venues', venueFormData);
        showToast('Venue created successfully');
      }
      setShowVenueModal(false);
      fetchVenues();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save venue', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Slot Handlers
  const handleOpenCreateSlot = () => {
    navigate('/admin/slots/new');
  };

  const handleOpenEditSlot = (s) => {
    navigate(`/admin/slots/${s.id}/edit`);
  };

  // Delete Handlers
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setSaving(true);
      if (itemToDelete.type === 'venue') {
        await api.delete(`/admin/venues/${itemToDelete.id}`);
        showToast('Venue deleted successfully');
        fetchVenues();
      } else {
        await api.delete(`/admin/slots/${itemToDelete.id}`);
        showToast('Interview slot cancelled/deleted');
        fetchSlots();
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete item', 'error');
    } finally {
      setSaving(false);
    }
  };

  // View Roster
  const handleViewRoster = async (slotId) => {
    try {
      setLoadingRoster(true);
      setShowRosterModal(true);
      setRosterVenueFilter('all');
      setRosterSearch('');
      const res = await api.get(`/admin/slots/${slotId}/roster`);
      setSelectedSlotRoster(res?.data || res);
    } catch (err) {
      showToast('Failed to load slot roster', 'error');
      setShowRosterModal(false);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleAutoBalanceVenues = async () => {
    if (!selectedSlotRoster?.slot?.id) return;
    try {
      setAutoBalancing(true);
      const res = await api.post(`/admin/slots/${selectedSlotRoster.slot.id}/auto-balance`);
      setSelectedSlotRoster(res?.data || res);
      showToast('Students automatically balanced across venues evenly!');
      fetchSlots();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to auto-balance venues', 'error');
    } finally {
      setAutoBalancing(false);
    }
  };

  const handlePublishAllocations = async () => {
    if (!selectedSlotRoster?.slot?.id) return;
    try {
      setPublishingAllocations(true);
      const res = await api.post(`/admin/slots/${selectedSlotRoster.slot.id}/publish-allocations`);
      setSelectedSlotRoster(res?.data || res);
      showToast('Venue allocations verified and published! Students can now see their venue & room numbers.');
      fetchSlots();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish allocations', 'error');
    } finally {
      setPublishingAllocations(false);
    }
  };

  const handleReassignVenue = async (bookingId, newVenueId) => {
    if (!selectedSlotRoster?.slot?.id || !newVenueId) return;
    try {
      setReassigningBookingId(bookingId);
      const res = await api.post(`/admin/slots/${selectedSlotRoster.slot.id}/reassign-venue`, {
        booking_id: bookingId,
        venue_id: Number(newVenueId),
      });
      setSelectedSlotRoster(res?.data || res);
      showToast('Student reassigned to new venue successfully');
      fetchSlots();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reassign student venue', 'error');
    } finally {
      setReassigningBookingId(null);
    }
  };

  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  const handleAdminCancelBooking = (booking) => {
    setBookingToCancel(booking);
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    const booking = bookingToCancel;
    const studentName = booking.student?.name || 'Student';

    try {
      setCancellingBookingId(booking.id);
      await api.post(`/admin/slots/bookings/${booking.id}/cancel`);
      showToast(`Booking cancelled for ${studentName}`);

      // Refresh current roster
      if (selectedSlotRoster?.slot?.id) {
        const res = await api.get(`/admin/slots/${selectedSlotRoster.slot.id}/roster`);
        setSelectedSlotRoster(res?.data || res);
      }
      // Refresh slots table to update seat counts
      fetchSlots();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel student booking', 'error');
    } finally {
      setCancellingBookingId(null);
      setBookingToCancel(null);
    }
  };

  // Filtered Venues
  const filteredVenues = useMemo(() => {
    if (!venueSearch) return venues;
    const q = venueSearch.toLowerCase();
    return venues.filter(
      v => v.name?.toLowerCase().includes(q) || v.building?.toLowerCase().includes(q) || v.room_number?.toLowerCase().includes(q)
    );
  }, [venues, venueSearch]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium transition-all ${
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
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Venues & Slot Scheduling
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage physical venues, schedule session time slots, and assign faculty.
          </p>
        </div>

        {/* Tab Selector & Primary Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl border border-[var(--border)]">
            <button
              onClick={() => setActiveTab('slots')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'slots'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Interview Slots</span>
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
                {slots.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('venues')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'venues'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Venues</span>
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
                {venues.length}
              </span>
            </button>
          </div>

          {activeTab === 'slots' ? (
            <button
              onClick={handleOpenCreateSlot}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Slot</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateVenue}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Venue</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: INTERVIEW SLOTS */}
      {activeTab === 'slots' && (
        <>
          {activeSlot ? (
            /* FULL SLOT DETAILS VIEW (After clicking a slot card) */
            <div className="space-y-6 animate-fadeIn pb-10">
              {/* Back button & Breadcrumb header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedSlotDetails(null)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[var(--accent)]" />
                  <span>Back to All Slots</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewRoster(activeSlot.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Manage Roster ({activeSlot.booked_count})</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditSlot(activeSlot)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Edit Slot</span>
                  </button>

                  <button
                    onClick={() => {
                      const nameLabel = activeSlot.venues && activeSlot.venues.length > 0
                        ? `${activeSlot.venues.map(v => v.venue?.name).join(', ')} (${activeSlot.slot_date} ${activeSlot.start_time})`
                        : `${activeSlot.venue?.name} (${activeSlot.slot_date} ${activeSlot.start_time})`;
                      setItemToDelete({ type: 'slot', id: activeSlot.id, name: nameLabel });
                      setShowDeleteModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Slot</span>
                  </button>
                </div>
              </div>

              {/* Slot Hero Overview Card */}
              <div className="p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-[var(--border)]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        activeSlot.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : activeSlot.status === 'scheduled'
                          ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {activeSlot.status}
                      </span>

                      {activeSlot.slot_type === 'online' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Online Remote Session</span>
                        </span>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider ${
                          activeSlot.allocations_published
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {activeSlot.allocations_published ? '✓ Allocations Published' : 'Draft Allocation'}
                        </span>
                      )}

                      {activeSlot.prevent_same_venue_match && activeSlot.slot_type !== 'online' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Cross-Venue Matchmaking Enforced</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 pt-1">
                      <Calendar className="w-5 h-5 text-[var(--accent)]" />
                      <span>{activeSlot.slot_date}</span>
                      <span className="text-[var(--text-muted)] font-normal">•</span>
                      <Clock className="w-5 h-5 text-[var(--accent)] ml-1" />
                      <span>{activeSlot.start_time} - {activeSlot.end_time}</span>
                    </h2>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center min-w-[110px]">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-muted)] block">Capacity</span>
                      <span className="text-base font-bold text-[var(--text-primary)]">{activeSlot.capacity} Seats</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center min-w-[110px]">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-muted)] block">Booked</span>
                      <span className="text-base font-bold text-[var(--accent)]">{activeSlot.booked_count} Students</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center min-w-[110px]">
                      <span className="text-[10px] uppercase font-mono text-[var(--text-muted)] block">Present</span>
                      <span className="text-base font-bold text-emerald-500">{activeSlot.present_count} Checked-In</span>
                    </div>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  {/* Left 8-cols: Venues, Faculty, Domains, Notes */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* ASSIGNED VENUES & FACULTY SECTION */}
                    <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                          <Building2 className="w-4 h-4 text-[var(--accent)]" />
                          <span>
                            {activeSlot.slot_type === 'online' ? 'Online Session Format' : `Assigned Venues & Faculty (${(activeSlot.venues && activeSlot.venues.length) || 1})`}
                          </span>
                        </div>
                      </div>

                      {activeSlot.slot_type === 'online' ? (
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
                            <Globe className="w-4 h-4 text-indigo-400" />
                            <span>Remote Virtual Interview Slot</span>
                          </div>
                          <p className="text-indigo-300/80 leading-relaxed text-[11.5px]">
                            This slot is fully remote and online. No physical venue attendance is required. Students connect from anywhere and start peer interviews directly on schedule.
                          </p>
                        </div>
                      ) : activeSlot.venues && activeSlot.venues.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {activeSlot.venues.map((va, idx) => (
                            <div
                              key={va.id || idx}
                              className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                    {va.venue?.name || `Venue #${va.venue_id}`}
                                  </h4>
                                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                                    Room {va.venue?.room_number || 'N/A'} • {va.venue?.building || 'Main Campus'}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-mono text-[10.5px] font-bold shrink-0">
                                  {va.capacity} Seats
                                </span>
                              </div>

                              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                                <span className="text-[var(--text-muted)] font-medium">Invigilator:</span>
                                <span className="font-semibold text-emerald-500 truncate max-w-[160px]" title={va.faculty?.name}>
                                  {va.faculty?.name || 'Unassigned'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">
                              {activeSlot.venue?.name || 'Assigned Venue'}
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)] font-mono">
                              Room {activeSlot.venue?.room_number || 'N/A'} • {activeSlot.venue?.building || 'Main Campus'}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-mono text-xs font-bold">
                            {activeSlot.capacity} Seats
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ELIGIBLE DOMAINS & LEVELS SECTION */}
                    <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border)]">
                        <Layers className="w-4 h-4 text-[var(--accent)]" />
                        <span>Eligible Domain Tracks & Levels</span>
                      </div>

                      {activeSlot.allowed_tracks && activeSlot.allowed_tracks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeSlot.allowed_tracks.map(trk => {
                            const trkLevelIds = trk.levels?.map(l => l.id) || [];
                            const allowedLevels = (trk.levels || []).filter(l =>
                              !activeSlot.allowed_level_ids ||
                              activeSlot.allowed_level_ids.length === 0 ||
                              activeSlot.allowed_level_ids.includes(l.id)
                            );

                            return (
                              <div key={trk.id} className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-[var(--text-primary)]">{trk.title}</h4>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)]">
                                    {trk.category || 'Domain'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {allowedLevels.map(lvl => (
                                    <span key={lvl.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                                      L{lvl.level_number}: {lvl.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : activeSlot.track ? (
                        <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{activeSlot.track.title}</span>
                          {activeSlot.level && (
                            <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-semibold text-xs">
                              Level {activeSlot.level.level_number}: {activeSlot.level.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>This slot is open to all domains, tracks, and difficulty tiers.</span>
                        </div>
                      )}
                    </div>

                    {/* SPECIAL NOTES & GUIDANCE */}
                    {activeSlot.notes && (
                      <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                          <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Student Arrival Notes & Guidance</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {activeSlot.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right 4-cols: Live Occupancy & Quick Actions */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Live Occupancy Gauge Card */}
                    <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-4">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Live Seat Occupancy</span>
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[var(--text-secondary)]">Total Seats Booked</span>
                            <span className="font-bold text-[var(--text-primary)]">
                              {activeSlot.booked_count} / {activeSlot.capacity} ({activeSlot.capacity > 0 ? Math.round((activeSlot.booked_count / activeSlot.capacity) * 100) : 0}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] rounded-full transition-all"
                              style={{ width: `${Math.min((activeSlot.booked_count / (activeSlot.capacity || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[var(--text-secondary)]">In-Venue Check-in Rate</span>
                            <span className="font-bold text-emerald-500">
                              {activeSlot.present_count} / {activeSlot.booked_count} ({activeSlot.booked_count > 0 ? Math.round((activeSlot.present_count / activeSlot.booked_count) * 100) : 0}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min((activeSlot.present_count / (activeSlot.booked_count || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewRoster(activeSlot.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage Live Student Roster</span>
                      </button>
                    </div>

                    {/* Quick Disclosure Notice */}
                    <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                        <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                        <span>Allocation & Privacy Rules</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {activeSlot.slot_type === 'online'
                          ? 'Online slots allow students to enter the room immediately when the session starts without faculty physical attendance check.'
                          : activeSlot.allocations_published
                          ? 'Venue room numbers and invigilators are published and visible to booked candidates on their portal.'
                          : 'Specific venue rooms remain hidden from candidates until you review the roster and click Publish Allocations.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* COMPACT OVERVIEW CARDS GRID VIEW */
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="font-medium">Date:</span>
                    <input
                      type="date"
                      value={slotDateFilter}
                      onChange={(e) => setSlotDateFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    {slotDateFilter && (
                      <button
                        onClick={() => setSlotDateFilter('')}
                        className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="font-medium">Venue:</span>
                    <select
                      value={slotVenueFilter}
                      onChange={(e) => setSlotVenueFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="all">All Venues</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.room_number})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <UserCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="font-medium">Faculty:</span>
                    <select
                      value={slotFacultyFilter}
                      onChange={(e) => setSlotFacultyFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="all">All Faculty</option>
                      {facultyList.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.department || 'Staff'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={fetchSlots}
                  disabled={loadingSlots}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Slots Table / Grid */}
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-3" />
                  <p className="text-sm">Loading interview slots...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">No interview slots found</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                    Schedule an interview slot to assign faculty to venues.
                  </p>
                  <button
                    onClick={handleOpenCreateSlot}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule First Slot</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...slots].sort((a, b) => {
                    const statusOrder = { active: 1, scheduled: 2, completed: 3, cancelled: 4 };
                    const orderA = statusOrder[a.status] || 5;
                    const orderB = statusOrder[b.status] || 5;
                    if (orderA !== orderB) return orderA - orderB;
                    const dateDiff = (a.slot_date || '').localeCompare(b.slot_date || '');
                    if (dateDiff !== 0) return dateDiff;
                    return (a.start_time || '').localeCompare(b.start_time || '');
                  }).map((s) => {
                    const occupancyPercent = s.capacity > 0 ? Math.round((s.booked_count / s.capacity) * 100) : 0;
                    const venueAssignments = s.venues && s.venues.length > 0 ? s.venues : null;
                    const isCancelled = s.status === 'cancelled';

                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSlotDetails(s)}
                        className={`p-4 bg-[var(--bg-card)] border ${isCancelled ? 'border-[var(--border)] opacity-70 bg-[var(--bg)]/50' : 'border-[var(--border)] hover:border-[var(--accent)]'} hover:shadow-md rounded-2xl transition-all cursor-pointer flex flex-col justify-between gap-3 group relative select-none`}
                      >
                        {/* Top: Status Badges + Date */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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

                            {s.slot_type === 'online' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span>Online</span>
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${
                                s.allocations_published
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}>
                                {s.allocations_published ? '✓ Published' : 'Draft'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] shrink-0 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                            <span className="font-semibold text-[var(--text-primary)]">{s.slot_date}</span>
                          </div>
                        </div>

                        {/* Middle: Timing & Venue Summary */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[var(--accent)] font-bold text-base group-hover:translate-x-0.5 transition-transform">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>{s.start_time} - {s.end_time}</span>
                            </span>
                            {s.prevent_same_venue_match && s.slot_type !== 'online' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                Cross-Venue
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate pt-0.5">
                            {s.slot_type === 'online' ? (
                              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                <span>Remote Online Session</span>
                              </span>
                            ) : venueAssignments && venueAssignments.length > 0 ? (
                              <span className="flex items-center gap-1.5 truncate font-medium text-[var(--text-primary)]">
                                <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                                <span className="truncate">
                                  {venueAssignments[0]?.venue?.name || 'Venue'}
                                  {venueAssignments.length > 1 && ` (+${venueAssignments.length - 1} more)`}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                  • {venueAssignments.length} {venueAssignments.length === 1 ? 'Venue' : 'Venues'}
                                </span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 truncate font-medium text-[var(--text-primary)]">
                                <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                                <span className="truncate">{s.venue?.name || 'Venue'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Micro Occupancy Bar */}
                        <div className="space-y-1 pt-1 border-t border-[var(--border)]/60">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[var(--text-secondary)] flex items-center gap-1">
                              <Users className="w-3 h-3 text-[var(--accent)]" />
                              <span>Booked:</span>
                            </span>
                            <span className="font-semibold text-[var(--text-primary)] font-mono">
                              {s.booked_count} / {s.capacity} ({occupancyPercent}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${occupancyPercent >= 90 ? 'bg-amber-500' : 'bg-[var(--accent)]'}`}
                              style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer: Click Hint + Edit / Delete Actions */}
                        <div className="pt-2 border-t border-[var(--border)]/70 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-[var(--accent)] font-semibold text-[11.5px] group-hover:translate-x-1 transition-transform">
                            <span>View Full Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditSlot(s);
                              }}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
                              title="Edit Slot"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nameLabel = s.venues && s.venues.length > 0
                                  ? `${s.venues.map(v => v.venue?.name).join(', ')} (${s.slot_date} ${s.start_time})`
                                  : `${s.venue?.name} (${s.slot_date} ${s.start_time})`;
                                setItemToDelete({ type: 'slot', id: s.id, name: nameLabel });
                                setShowDeleteModal(true);
                              }}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete / Cancel Slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2: VENUES */}
      {activeTab === 'venues' && (
        <div className="space-y-4">
          {/* Venues Search Bar */}
          <div className="flex items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search venues by name, building, room..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Showing {filteredVenues.length} venue(s)
            </span>
          </div>

          {/* Venues Grid */}
          {loadingVenues ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-[var(--text-secondary)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-3" />
              <p className="text-sm">Loading venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">No venues found</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Add physical venues and exam halls to start scheduling interview slots.
              </p>
              <button
                onClick={handleOpenCreateVenue}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Venue</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVenues.map((v) => (
                <div
                  key={v.id}
                  className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-[var(--accent)] transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">{v.name}</h4>
                          <p className="text-[11px] text-[var(--text-secondary)]">{v.building} • Room {v.room_number}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {v.description && (
                      <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--border)] line-clamp-2">
                        {v.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 font-mono">
                      <span>Capacity: <strong className="text-[var(--text-primary)]">{v.capacity} Seats</strong></span>
                      <span>ID: #{v.id}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditVenue(v)}
                      className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVenue(v.id)}
                      className="btn text-xs py-1 px-2.5 flex items-center gap-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT VENUE MODAL */}
      {showVenueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] w-full max-w-md shadow-2xl animate-scaleUp overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--accent)]" />
                <span>{editingVenue ? 'Edit Venue' : 'Create New Venue'}</span>
              </h3>
              <button
                onClick={() => setShowVenueModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVenue} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Robotics Venue"
                  value={venueFormData.name}
                  onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Building *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Block"
                    value={venueFormData.building}
                    onChange={(e) => setVenueFormData({ ...venueFormData, building: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MB-204"
                    value={venueFormData.room_number}
                    onChange={(e) => setVenueFormData({ ...venueFormData, room_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Capacity (Seats) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={venueFormData.capacity}
                    onChange={(e) => setVenueFormData({ ...venueFormData, capacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Status
                  </label>
                  <select
                    value={venueFormData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setVenueFormData({ ...venueFormData, is_active: e.target.value === 'active' })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Special venue instructions, systems available, etc."
                  value={venueFormData.description}
                  onChange={(e) => setVenueFormData({ ...venueFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowVenueModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingVenue ? 'Save Changes' : 'Create Venue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW & MANAGE SLOT ROSTER */}
      {showRosterModal && selectedSlotRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] shrink-0 bg-[var(--bg)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      {selectedSlotRoster.slot?.slot_type === 'online' ? (
                        <>
                          <Globe className="w-5 h-5 text-indigo-400" />
                          <span>Online Slot Candidate Roster</span>
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-5 h-5 text-[var(--accent)]" />
                          <span>Slot Candidate Roster & Venue Allocation</span>
                        </>
                      )}
                    </h2>
                    {selectedSlotRoster.slot?.slot_type === 'online' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        ✓ Online Auto-Access (No Faculty Required)
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedSlotRoster.slot?.allocations_published
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {selectedSlotRoster.slot?.allocations_published ? '✓ Allocations Published to Students' : 'Draft Allocation (Hidden from Students)'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--text-primary)]">{selectedSlotRoster.slot?.slot_date}</span>
                    <span>•</span>
                    <span className="text-[var(--accent)] font-mono">{selectedSlotRoster.slot?.start_time} - {selectedSlotRoster.slot?.end_time}</span>
                    <span>•</span>
                    <span>Total Booked: <strong className="text-[var(--text-primary)]">{selectedSlotRoster.bookings?.filter(b => b.status !== 'cancelled').length || 0}</strong> / {selectedSlotRoster.slot?.capacity}</span>
                  </p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedSlotRoster.slot?.slot_type !== 'online' && (
                    <>
                      <button
                        type="button"
                        onClick={handleAutoBalanceVenues}
                        disabled={autoBalancing || !selectedSlotRoster.venues || selectedSlotRoster.venues.length <= 1}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold shadow-sm transition-all disabled:opacity-40 cursor-pointer"
                        title="Evenly distribute booked students across assigned venues"
                      >
                        {autoBalancing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" /> : <Shuffle className="w-3.5 h-3.5 text-[var(--accent)]" />}
                        <span>Auto-Balance Venues</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePublishAllocations}
                        disabled={publishingAllocations}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                        title="Publish room allocations so candidates can see their assigned rooms"
                      >
                        {publishingAllocations ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>{selectedSlotRoster.slot?.allocations_published ? 'Re-Publish / Sync' : 'Verify & Publish'}</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setShowRosterModal(false)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] ml-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Multi-Venue Breakdown Bar (Physical Slots Only) */}
              {selectedSlotRoster.slot?.slot_type !== 'online' && selectedSlotRoster.venues && selectedSlotRoster.venues.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {selectedSlotRoster.venues.map((va) => {
                    const activeStudentsInThisVenue = (selectedSlotRoster.bookings || []).filter(
                      b => b.status !== 'cancelled' && b.assigned_venue_id === va.venue_id
                    ).length;

                    return (
                      <div
                        key={va.id || va.venue_id}
                        className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[var(--accent)]" />
                            <span>{va.venue?.name || `Venue #${va.venue_id}`}</span>
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            Room {va.venue?.room_number} • Faculty: <span className="font-semibold text-[var(--text-primary)]">{va.faculty?.name ? va.faculty.name.split(' ')[0] : 'Invigilator'}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold ${
                            activeStudentsInThisVenue > va.capacity ? 'text-rose-500 font-extrabold' : 'text-[var(--accent)]'
                          }`}>
                            {activeStudentsInThisVenue} / {va.capacity}
                          </span>
                          <p className="text-[9px] text-[var(--text-secondary)] uppercase font-semibold">Assigned</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3.5 border-b border-[var(--border)] shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card)]">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search student roll no, name..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Venue Filter Pills (Physical Slots Only) */}
              {selectedSlotRoster.slot?.slot_type !== 'online' && selectedSlotRoster.venues && selectedSlotRoster.venues.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setRosterVenueFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                      rosterVenueFilter === 'all'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All Venues ({selectedSlotRoster.bookings?.filter(b => b.status !== 'cancelled').length || 0})
                  </button>
                  {selectedSlotRoster.venues.map((va) => {
                    const count = (selectedSlotRoster.bookings || []).filter(
                      b => b.status !== 'cancelled' && b.assigned_venue_id === va.venue_id
                    ).length;
                    return (
                      <button
                        key={va.venue_id}
                        type="button"
                        onClick={() => setRosterVenueFilter(String(va.venue_id))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                          rosterVenueFilter === String(va.venue_id)
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {va.venue?.name || `Venue #${va.venue_id}`} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Candidate Table */}
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mb-2" />
                  <p className="text-xs">Loading roster data...</p>
                </div>
              ) : !selectedSlotRoster.bookings || selectedSlotRoster.bookings.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <Users className="w-8 h-8 mx-auto mb-2 text-[var(--text-secondary)] opacity-50" />
                  <p className="text-xs">No students have booked this slot yet.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider font-semibold text-[10px]">
                      <th className="pb-2.5">Roll No</th>
                      <th className="pb-2.5">Student Name</th>
                      <th className="pb-2.5">Domain / Level</th>
                      <th className="pb-2.5">Venue / Mode</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Attendance</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {selectedSlotRoster.bookings
                      .filter(b => {
                        // Venue filter
                        if (rosterVenueFilter !== 'all') {
                          if (String(b.assigned_venue_id) !== rosterVenueFilter) return false;
                        }
                        // Search filter
                        if (!rosterSearch) return true;
                        const q = rosterSearch.toLowerCase();
                        return (
                          b.student?.name?.toLowerCase().includes(q) ||
                          b.student?.roll_no?.toLowerCase().includes(q) ||
                          b.student?.email?.toLowerCase().includes(q) ||
                          b.track?.title?.toLowerCase().includes(q)
                        );
                      })
                      .map((b) => {
                        const isCancelled = b.status === 'cancelled';
                        const isCancelling = cancellingBookingId === b.id;
                        const isReassigning = reassigningBookingId === b.id;
                        const isOnlineSlot = selectedSlotRoster.slot?.slot_type === 'online';
                        const venueOptions = selectedSlotRoster.venues && selectedSlotRoster.venues.length > 0
                          ? selectedSlotRoster.venues
                          : (selectedSlotRoster.slot?.venue ? [{ venue_id: selectedSlotRoster.slot.venue.id, venue: selectedSlotRoster.slot.venue }] : []);

                        return (
                          <tr key={b.id} className={`transition-all ${isCancelled ? 'opacity-50 bg-[var(--bg)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                            <td className="py-2.5 font-mono font-semibold text-[var(--text-primary)]">
                              {b.student?.roll_no || 'N/A'}
                            </td>
                            <td className="py-2.5">
                              <p className="font-semibold text-[var(--text-primary)]">{b.student?.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)]">{b.student?.department || b.student?.email || 'Student'}</p>
                            </td>
                            <td className="py-2.5 font-medium text-[var(--text-secondary)]">
                              <div className="font-semibold text-[var(--text-primary)]">
                                {b.track?.title || 'General'}
                              </div>
                              {b.level ? (
                                <span className="text-[10px] text-[var(--accent)] font-mono">
                                  Level {b.level.level_number}: {b.level.name}
                                </span>
                              ) : b.level_id ? (
                                <span className="text-[10px] text-[var(--accent)] font-mono">
                                  Level {b.level_id}
                                </span>
                              ) : null}
                            </td>

                            {/* Assigned Venue Selector / Mode */}
                            <td className="py-2.5">
                              {isCancelled ? (
                                <span className="text-zinc-500 text-[11px]">—</span>
                              ) : isOnlineSlot ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                                  <Globe className="w-3.5 h-3.5 shrink-0" />
                                  <span>Online Remote</span>
                                </span>
                              ) : venueOptions.length > 1 ? (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={b.assigned_venue_id || ''}
                                    disabled={isReassigning}
                                    onChange={(e) => handleReassignVenue(b.id, e.target.value)}
                                    className="px-2 py-1 text-[11px] rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium cursor-pointer"
                                  >
                                    {venueOptions.map(vo => (
                                      <option key={vo.venue_id} value={vo.venue_id}>
                                        {vo.venue?.name || `Venue #${vo.venue_id}`} ({vo.venue?.room_number || 'Room'})
                                      </option>
                                    ))}
                                  </select>
                                  {isReassigning && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />}
                                </div>
                              ) : (
                                <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                                  {b.assigned_venue?.name || selectedSlotRoster.slot?.venue?.name || 'Assigned Venue'}
                                </span>
                              )}
                            </td>

                            {/* Allocation Status */}
                            <td className="py-2.5">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                  Cancelled
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${
                                  b.allocation_status === 'verified' || isOnlineSlot
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                  {b.allocation_status === 'verified' || isOnlineSlot ? '✓ Verified' : 'Draft'}
                                </span>
                              )}
                            </td>

                            {/* Attendance */}
                            <td className="py-2.5">
                              {isCancelled ? (
                                <span className="text-zinc-500 text-[11px]">—</span>
                              ) : isOnlineSlot ? (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  Auto (On-Time)
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                            <td className="py-2.5 text-right">
                              {isCancelled ? (
                                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                  Cancelled
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAdminCancelBooking(b)}
                                  disabled={isCancelling}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[10.5px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                                  title="Cancel student booking and free up seat"
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--bg)]">
              <div className="text-xs text-[var(--text-secondary)]">
                {selectedSlotRoster.slot?.slot_type === 'online'
                  ? 'Candidates can join their virtual assessment directly on time. Admins can cancel any seat booking above.'
                  : 'Tip: Use Auto-Balance to equalize students across venues, or manually change their venue above before publishing.'}
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE VENUE / SLOT MODAL */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={itemToDelete?.type === 'venue' ? 'Delete Venue' : 'Cancel / Delete Slot'}
        message={`Are you sure you want to delete ${itemToDelete?.name}? This action cannot be undone.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
      />

      {/* CONFIRM CANCEL STUDENT BOOKING MODAL */}
      <ConfirmModal
        isOpen={Boolean(bookingToCancel)}
        title="Cancel Student Booking"
        message={
          bookingToCancel ? (
            <span>
              Are you sure you want to cancel the booking for{' '}
              <strong className="text-[var(--text-primary)]">
                {bookingToCancel.student?.name || 'Student'}
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
