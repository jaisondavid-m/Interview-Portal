import React, { useState, useEffect, useMemo } from 'react';
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
  BookOpen
} from 'lucide-react';
import api from '../api/axios';
import ConfirmModal from '../Components/ConfirmModal';

export default function AdminVenues() {
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

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotFormData, setSlotFormData] = useState({
    venue_id: '',
    faculty_id: '',
    track_id: '',
    level_id: '',
    allowed_track_ids: [],
    allowed_level_ids: [],
    is_open_to_all: true,
    slot_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:30',
    capacity: 30,
    notes: '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'venue'|'slot', id, name }

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedSlotRoster, setSelectedSlotRoster] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

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

  // Multi-Domain & Level Handlers
  const handleToggleTrack = (trackId) => {
    const tid = Number(trackId);
    const isSelected = slotFormData.allowed_track_ids.includes(tid);
    const newTracks = isSelected
      ? slotFormData.allowed_track_ids.filter(id => id !== tid)
      : [...slotFormData.allowed_track_ids, tid];

    const trackObj = tracks.find(t => Number(t.id) === tid);
    const trackLevelIds = trackObj?.levels?.map(l => Number(l.id)) || [];
    let newLevels = slotFormData.allowed_level_ids;
    if (isSelected) {
      newLevels = newLevels.filter(lid => !trackLevelIds.includes(lid));
    }

    setSlotFormData({
      ...slotFormData,
      allowed_track_ids: newTracks,
      allowed_level_ids: newLevels,
      is_open_to_all: newTracks.length === 0,
    });
  };

  const handleToggleLevel = (trackId, levelId) => {
    const tid = Number(trackId);
    const lid = Number(levelId);
    const trackObj = tracks.find(t => Number(t.id) === tid);
    const allTrackLevelIds = trackObj?.levels?.map(l => Number(l.id)) || [];

    let newTracks = slotFormData.allowed_track_ids.includes(tid)
      ? [...slotFormData.allowed_track_ids]
      : [...slotFormData.allowed_track_ids, tid];

    const currentSelectedForTrack = slotFormData.allowed_level_ids.filter(id => allTrackLevelIds.includes(id));
    let newLevels = [...slotFormData.allowed_level_ids];

    if (currentSelectedForTrack.length === 0) {
      // Transition from "all levels open" to single selected level
      newLevels.push(lid);
    } else if (newLevels.includes(lid)) {
      newLevels = newLevels.filter(id => id !== lid);
    } else {
      newLevels.push(lid);
    }

    setSlotFormData({
      ...slotFormData,
      allowed_track_ids: newTracks,
      allowed_level_ids: newLevels,
      is_open_to_all: false,
    });
  };

  const handleToggleAllLevelsForTrack = (track) => {
    const tid = Number(track.id);
    const trackLevelIds = track.levels?.map(l => Number(l.id)) || [];

    let newTracks = slotFormData.allowed_track_ids.includes(tid)
      ? [...slotFormData.allowed_track_ids]
      : [...slotFormData.allowed_track_ids, tid];

    // Reset explicit level filters for this track to open all levels
    const newLevels = slotFormData.allowed_level_ids.filter(id => !trackLevelIds.includes(id));

    setSlotFormData({
      ...slotFormData,
      allowed_track_ids: newTracks,
      allowed_level_ids: newLevels,
      is_open_to_all: false,
    });
  };

  const handleSelectAllDomains = () => {
    const allTrackIds = tracks.map(t => Number(t.id));
    setSlotFormData({
      ...slotFormData,
      allowed_track_ids: allTrackIds,
      allowed_level_ids: [],
      is_open_to_all: false,
    });
  };

  const handleSetOpenToAll = () => {
    setSlotFormData({
      ...slotFormData,
      allowed_track_ids: [],
      allowed_level_ids: [],
      is_open_to_all: true,
    });
  };

  // Slot Handlers
  const handleOpenCreateSlot = () => {
    setEditingSlot(null);
    const defaultVenue = venues[0]?.id || '';
    const defaultFaculty = facultyList[0]?.id || '';
    const defaultVenueCap = venues[0]?.capacity || 30;

    setSlotFormData({
      venue_id: defaultVenue,
      faculty_id: defaultFaculty,
      track_id: '',
      level_id: '',
      allowed_track_ids: [],
      allowed_level_ids: [],
      is_open_to_all: true,
      slot_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '10:30',
      capacity: defaultVenueCap,
      notes: '',
    });
    setShowSlotModal(true);
  };

  const handleOpenEditSlot = (s) => {
    setEditingSlot(s);
    let allowedTracks = [];
    if (Array.isArray(s.allowed_track_ids) && s.allowed_track_ids.length > 0) {
      allowedTracks = s.allowed_track_ids.map(Number);
    } else if (s.track_id) {
      allowedTracks = [Number(s.track_id)];
    }

    let allowedLevels = [];
    if (Array.isArray(s.allowed_level_ids) && s.allowed_level_ids.length > 0) {
      allowedLevels = s.allowed_level_ids.map(Number);
    } else if (s.level_id) {
      allowedLevels = [Number(s.level_id)];
    }

    const isOpenToAll = allowedTracks.length === 0;

    setSlotFormData({
      venue_id: s.venue_id,
      faculty_id: s.faculty_id,
      track_id: s.track_id || '',
      level_id: s.level_id || '',
      allowed_track_ids: allowedTracks,
      allowed_level_ids: allowedLevels,
      is_open_to_all: isOpenToAll,
      slot_date: s.slot_date,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity,
      status: s.status,
      notes: s.notes || '',
    });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!slotFormData.venue_id || !slotFormData.faculty_id || !slotFormData.slot_date || !slotFormData.start_time || !slotFormData.end_time) {
      showToast('Please fill in all required slot fields', 'error');
      return;
    }

    const allowedTrackIds = slotFormData.is_open_to_all ? [] : slotFormData.allowed_track_ids.map(Number);
    const allowedLevelIds = slotFormData.is_open_to_all ? [] : slotFormData.allowed_level_ids.map(Number);

    const payload = {
      venue_id: Number(slotFormData.venue_id),
      faculty_id: Number(slotFormData.faculty_id),
      allowed_track_ids: allowedTrackIds,
      allowed_level_ids: allowedLevelIds,
      slot_date: slotFormData.slot_date,
      start_time: slotFormData.start_time,
      end_time: slotFormData.end_time,
      capacity: Number(slotFormData.capacity),
      notes: slotFormData.notes,
    };

    if (editingSlot && slotFormData.status) {
      payload.status = slotFormData.status;
    }

    try {
      setSaving(true);
      if (editingSlot) {
        await api.put(`/admin/slots/${editingSlot.id}`, payload);
        showToast('Interview slot updated successfully');
      } else {
        await api.post('/admin/slots', payload);
        showToast('Interview slot scheduled successfully');
      }
      setShowSlotModal(false);
      fetchSlots();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save slot', 'error');
    } finally {
      setSaving(false);
    }
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
      const res = await api.get(`/admin/slots/${slotId}/roster`);
      setSelectedSlotRoster(res?.data || res);
    } catch (err) {
      showToast('Failed to load slot roster', 'error');
      setShowRosterModal(false);
    } finally {
      setLoadingRoster(false);
    }
  };

  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  const handleAdminCancelBooking = async (booking) => {
    const studentName = booking.student?.name || 'Student';
    const rollNo = booking.student?.roll_no ? ` (${booking.student.roll_no})` : '';
    if (!window.confirm(`Are you sure you want to cancel the booking for ${studentName}${rollNo}? This will free up 1 seat in this slot.`)) {
      return;
    }

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
            Manage physical interview examination labs, schedule session time slots, and assign faculty invigilators.
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
              <span>Venues & Labs</span>
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
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] underline"
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
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-all"
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
                Schedule an interview slot to assign faculty invigilators to physical examination labs.
              </p>
              <button
                onClick={handleOpenCreateSlot}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule First Slot</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((s) => {
                const isCompleted = s.status === 'completed' || s.status === 'cancelled';
                const occupancyPercent = s.capacity > 0 ? Math.round((s.booked_count / s.capacity) * 100) : 0;
                const attendancePercent = s.booked_count > 0 ? Math.round((s.present_count / s.booked_count) * 100) : 0;

                return (
                  <div
                    key={s.id}
                    className="p-5 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-2xl shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : s.status === 'scheduled'
                            ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}>
                          {s.status}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span className="font-semibold text-[var(--text-primary)]">{s.slot_date}</span>
                        </div>
                      </div>

                      {/* Venue & Time Header */}
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{s.venue?.name || 'Lab Venue'}</span>
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono text-[11px]">
                            {s.venue?.room_number || 'Room'} • {s.venue?.building}
                          </span>
                          <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {s.start_time} - {s.end_time}
                          </span>
                        </p>
                      </div>

                      {/* Assigned Faculty */}
                      <div className="mt-4 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center text-xs font-bold">
                            {s.faculty?.name ? s.faculty.name.charAt(0) : 'F'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{s.faculty?.name || 'Assigned Faculty'}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{s.faculty?.department || 'Invigilator'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 max-w-[60%]">
                          {(() => {
                            if (s.allowed_tracks && s.allowed_tracks.length > 0) {
                              return (
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {s.allowed_tracks.slice(0, 2).map(trk => {
                                    const trkLevelIds = trk.levels?.map(l => l.id) || [];
                                    const allowedForThisTrk = (s.allowed_level_ids || []).filter(id => trkLevelIds.includes(id));
                                    const lvlSummary = allowedForThisTrk.length > 0 && allowedForThisTrk.length < trkLevelIds.length
                                      ? `(${allowedForThisTrk.length} Lvl)`
                                      : '';

                                    return (
                                      <span key={trk.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]">
                                        {trk.title} {lvlSummary}
                                      </span>
                                    );
                                  })}
                                  {s.allowed_tracks.length > 2 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                                      +{s.allowed_tracks.length - 2} more
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            if (s.track) {
                              return (
                                <>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]">
                                    {s.track.title}
                                  </span>
                                  {s.level && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] font-mono">
                                      Level {s.level.level_number}: {s.level.name}
                                    </span>
                                  )}
                                </>
                              );
                            }
                            return (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Open to All Domains
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Capacity & Attendance Meters */}
                      <div className="mt-4 space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[var(--text-secondary)]">Seats Booked</span>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {s.booked_count} / {s.capacity} ({occupancyPercent}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] rounded-full transition-all"
                              style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-[var(--text-secondary)]">Present in Venue</span>
                            <span className="font-semibold text-emerald-500">
                              {s.present_count} / {s.booked_count} ({attendancePercent}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(attendancePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleViewRoster(s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--accent-dim)] text-[var(--text-secondary)] hover:text-[var(--accent)] text-xs font-semibold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Roster ({s.booked_count})</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditSlot(s)}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                          title="Edit Slot"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete({ type: 'slot', id: s.id, name: `${s.venue?.name} (${s.slot_date} ${s.start_time})` });
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-all"
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

      {/* TAB 2: VENUES & LABS */}
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
                Add physical lab venues and exam halls to start scheduling interview slots.
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
                  className="p-5 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-2xl shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.is_active
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                      }`}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] font-mono">
                        Room {v.room_number}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)]">{v.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                      {v.building}
                    </p>

                    {v.description && (
                      <p className="mt-3 text-xs text-[var(--text-secondary)] line-clamp-2 italic">
                        "{v.description}"
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
                      <div>
                        <p className="text-[10px] text-[var(--text-secondary)]">Max Cap</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{v.capacity}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-secondary)]">Active Slots</p>
                        <p className="text-sm font-bold text-[var(--accent)]">{v.active_slots || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-secondary)]">Total Slots</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{v.total_slots || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditVenue(v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setItemToDelete({ type: 'venue', id: v.id, name: v.name });
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--red)] hover:bg-[var(--red-bg)] transition-all"
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

      {/* MODAL: CREATE / EDIT VENUE */}
      {showVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--accent)]" />
                <span>{editingVenue ? 'Edit Venue' : 'Create New Venue'}</span>
              </h2>
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
                  placeholder="e.g. AI & Robotics Lab"
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
                  placeholder="Special lab instructions, systems available, etc."
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

      {/* MODAL: SCHEDULE / EDIT SLOT */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--accent)]" />
                <span>{editingSlot ? 'Edit Interview Slot' : 'Schedule Interview Slot'}</span>
              </h2>
              <button
                onClick={() => setShowSlotModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Select Venue *
                  </label>
                  <select
                    required
                    value={slotFormData.venue_id}
                    onChange={(e) => {
                      const v = venues.find(item => Number(item.id) === Number(e.target.value));
                      setSlotFormData({
                        ...slotFormData,
                        venue_id: e.target.value,
                        capacity: v ? v.capacity : slotFormData.capacity,
                      });
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="" disabled>Select Venue</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.room_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Assign Faculty Invigilator *
                  </label>
                  <select
                    required
                    value={slotFormData.faculty_id}
                    onChange={(e) => setSlotFormData({ ...slotFormData, faculty_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="" disabled>Select Faculty</option>
                    {facultyList.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.department || 'Faculty'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Slot Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={slotFormData.slot_date}
                    onChange={(e) => setSlotFormData({ ...slotFormData, slot_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotFormData.start_time}
                    onChange={(e) => setSlotFormData({ ...slotFormData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotFormData.end_time}
                    onChange={(e) => setSlotFormData({ ...slotFormData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Allowed Domains & Levels Multi-Selector */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      Allowed Domains & Difficulty Levels (Optional)
                    </label>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {slotFormData.is_open_to_all
                        ? 'Open to all interview domains and difficulty level tiers'
                        : `Restricted to ${slotFormData.allowed_track_ids.length} selected domain(s)`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetOpenToAll}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                        slotFormData.is_open_to_all
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>All Domains (Open)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllDomains}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                        !slotFormData.is_open_to_all && slotFormData.allowed_track_ids.length === tracks.length
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-bold'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                      }`}
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Select All</span>
                    </button>
                  </div>
                </div>

                {/* Domain & Levels Interactive List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {tracks.map((t) => {
                    const isTrackSelected = !slotFormData.is_open_to_all && slotFormData.allowed_track_ids.includes(Number(t.id));
                    const trackLevels = t.levels || [];
                    const trackLevelIds = trackLevels.map(l => Number(l.id));
                    const selectedLevelIdsForTrack = slotFormData.allowed_level_ids.filter(id => trackLevelIds.includes(id));
                    const isAllLevelsForTrack = selectedLevelIdsForTrack.length === 0 || selectedLevelIdsForTrack.length === trackLevels.length;

                    return (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isTrackSelected
                            ? 'bg-[var(--bg-card)] border-[var(--accent)] shadow-sm'
                            : 'bg-[var(--bg-card)]/50 border-[var(--border)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {/* Domain Row */}
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                            <input
                              type="checkbox"
                              checked={isTrackSelected}
                              onChange={() => handleToggleTrack(t.id)}
                              className="w-4 h-4 rounded text-[var(--accent)] accent-[var(--accent)] cursor-pointer"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[var(--text-primary)]">{t.title}</span>
                              <span className="px-1.5 py-0.2 text-[9px] rounded font-mono uppercase bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]">
                                {t.category || 'Domain'}
                              </span>
                            </div>
                          </label>

                          {isTrackSelected && (
                            <span className="text-[10px] font-semibold text-[var(--accent)] font-mono">
                              {isAllLevelsForTrack
                                ? 'All Levels'
                                : `${selectedLevelIdsForTrack.length}/${trackLevels.length} Levels`}
                            </span>
                          )}
                        </div>

                        {/* Expandable Level Chips */}
                        {isTrackSelected && trackLevels.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border)] space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                              <span>Select Allowed Levels for {t.title}:</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllLevelsForTrack(t)}
                                className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
                              >
                                {isAllLevelsForTrack ? 'Select Specific' : 'Reset to All Levels'}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {trackLevels.map((lvl) => {
                                const isLvlSelected = isAllLevelsForTrack || selectedLevelIdsForTrack.includes(Number(lvl.id));

                                return (
                                  <button
                                    type="button"
                                    key={lvl.id}
                                    onClick={() => handleToggleLevel(t.id, lvl.id)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isLvlSelected
                                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-bold'
                                        : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isLvlSelected ? 'bg-[var(--accent)]' : 'bg-zinc-400'}`} />
                                    <span>L{lvl.level_number}: {lvl.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Seat Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={slotFormData.capacity}
                  onChange={(e) => setSlotFormData({ ...slotFormData, capacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {editingSlot && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Slot Status
                  </label>
                  <select
                    value={slotFormData.status}
                    onChange={(e) => setSlotFormData({ ...slotFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active (In Progress)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Notes / Instructions
                </label>
                <textarea
                  rows="2"
                  placeholder="Special instructions for students and invigilator..."
                  value={slotFormData.notes}
                  onChange={(e) => setSlotFormData({ ...slotFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
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
                  <span>{editingSlot ? 'Save Changes' : 'Schedule Slot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW SLOT ROSTER */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[var(--accent)]" />
                  <span>Student Roster: {selectedSlotRoster?.slot?.venue?.name}</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {selectedSlotRoster?.slot?.slot_date} • {selectedSlotRoster?.slot?.start_time} - {selectedSlotRoster?.slot?.end_time} • Faculty: {selectedSlotRoster?.slot?.faculty?.name}
                </p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border)] shrink-0 flex items-center justify-between gap-3 bg-[var(--bg)]">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Filter student by roll no, name..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="text-xs text-[var(--text-secondary)]">
                Active Booked: <span className="font-bold text-[var(--text-primary)]">{selectedSlotRoster?.bookings?.filter(b => b.status !== 'cancelled').length || 0}</span> / {selectedSlotRoster?.slot?.capacity}
              </div>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mb-2" />
                  <p className="text-xs">Loading roster data...</p>
                </div>
              ) : !selectedSlotRoster?.bookings || selectedSlotRoster.bookings.length === 0 ? (
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
                      <th className="pb-2.5">Attendance</th>
                      <th className="pb-2.5">Interview Access</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {selectedSlotRoster.bookings
                      .filter(b => {
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

                        return (
                          <tr key={b.id} className="hover:bg-[var(--bg-hover)] transition-all">
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
                            <td className="py-2.5">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                  Cancelled
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
                            <td className="py-2.5">
                              {isCancelled ? (
                                <span className="text-zinc-500 text-[11px]">
                                  Booking Cancelled
                                </span>
                              ) : b.can_start_interview ? (
                                <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Unlocked</span>
                                </span>
                              ) : (
                                <span className="text-[var(--text-secondary)] text-[11px]">
                                  Locked (Pending Present)
                                </span>
                              )}
                            </td>
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
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                                  title="Cancel student booking and free up seat"
                                >
                                  {isCancelling ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  <span>Cancel Booking</span>
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

            <div className="p-4 border-t border-[var(--border)] shrink-0 flex justify-end bg-[var(--bg)]">
              <button
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--border)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
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
    </div>
  );
}
