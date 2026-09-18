import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Save,
  Check,
  X,
  Plus,
  Trash2,
  UserCheck,
  MapPin,
  Layers,
  Sparkles,
  Globe,
  CheckSquare,
  Square,
  BookOpen,
  Info,
  HelpCircle,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  Code,
  Cpu,
  BrainCircuit,
  GitFork,
  ArrowRightLeft
} from 'lucide-react';
import api from '../api/axios';

export default function AdminSlotEditor() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(slotId);

  // Reference data
  const [venues, setVenues] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    slot_type: 'physical', // 'physical' | 'online'
    slot_venues: [
      { venue_id: '', faculty_id: '', capacity: 30 }
    ],
    prevent_same_venue_match: false,
    slot_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:30',
    capacity: 30,
    status: 'scheduled',
    notes: '',
    is_open_to_all: true,
    allowed_track_ids: [],
    allowed_level_ids: [],
  });

  const [domainSearch, setDomainSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: Get icon component
  const getTrackIcon = (iconName) => {
    switch (iconName) {
      case 'Layers': return Layers;
      case 'Cpu': return Cpu;
      case 'BrainCircuit': return BrainCircuit;
      case 'CheckSquare': return CheckSquare;
      default: return Code;
    }
  };

  // Load initial data (Venues, Faculty, Tracks, and Slot if editing)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingInitial(true);
        const [venuesRes, facRes, trackRes] = await Promise.all([
          api.get('/admin/venues'),
          api.get('/admin/venues/faculty-list'),
          api.get('/interviews/tracks')
        ]);

        const venueData = Array.isArray(venuesRes?.data || venuesRes) ? (venuesRes?.data || venuesRes) : [];
        const facData = Array.isArray(facRes?.data || facRes) ? (facRes?.data || facRes) : [];
        const trackData = Array.isArray(trackRes?.data || trackRes) ? (trackRes?.data || trackRes) : [];

        setVenues(venueData);
        setFacultyList(facData);
        setTracks(trackData);

        if (isEditing) {
          const slotRes = await api.get(`/admin/slots/${slotId}`);
          const s = slotRes?.data?.data || slotRes?.data || slotRes;

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

          // Build slot venues array
          let slotVenues = [];
          if (Array.isArray(s.venues) && s.venues.length > 0) {
            slotVenues = s.venues.map(sv => ({
              venue_id: String(sv.venue_id || ''),
              faculty_id: String(sv.faculty_id || ''),
              capacity: sv.capacity || 30,
            }));
          } else if (s.venue_id && s.faculty_id) {
            slotVenues = [{
              venue_id: String(s.venue_id),
              faculty_id: String(s.faculty_id),
              capacity: s.capacity || 30,
            }];
          } else {
            slotVenues = [{
              venue_id: venueData[0]?.id ? String(venueData[0].id) : '',
              faculty_id: facData[0]?.id ? String(facData[0].id) : '',
              capacity: venueData[0]?.capacity || 30,
            }];
          }

          setFormData({
            slot_type: s.slot_type || (s.venue_id === 0 && (!s.venues || s.venues.length === 0) ? 'online' : 'physical'),
            slot_venues: slotVenues,
            prevent_same_venue_match: Boolean(s.prevent_same_venue_match),
            slot_date: s.slot_date || new Date().toISOString().split('T')[0],
            start_time: s.start_time || '09:00',
            end_time: s.end_time || '10:30',
            capacity: s.capacity || 30,
            status: s.status || 'scheduled',
            notes: s.notes || '',
            is_open_to_all: isOpenToAll,
            allowed_track_ids: allowedTracks,
            allowed_level_ids: allowedLevels,
          });
        } else {
          // Defaults for new slot
          const defaultVenue = venueData[0]?.id ? String(venueData[0].id) : '';
          const defaultVenueCap = venueData[0]?.capacity || 30;
          const defaultFaculty = facData[0]?.id ? String(facData[0].id) : '';

          setFormData(prev => ({
            ...prev,
            slot_venues: [
              { venue_id: defaultVenue, faculty_id: defaultFaculty, capacity: defaultVenueCap }
            ],
            capacity: defaultVenueCap,
          }));
        }
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to load configuration data', 'error');
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchData();
  }, [slotId, isEditing]);

  // Venue row management
  const handleAddVenueRow = () => {
    // Find unassigned venue and unassigned faculty
    const assignedVenueIds = formData.slot_venues.map(v => String(v.venue_id));
    const assignedFacultyIds = formData.slot_venues.map(v => String(v.faculty_id));

    const nextVenue = venues.find(v => !assignedVenueIds.includes(String(v.id))) || venues[0];
    const nextFaculty = facultyList.find(f => !assignedFacultyIds.includes(String(f.id))) || facultyList[0];

    const newVenues = [
      ...formData.slot_venues,
      {
        venue_id: nextVenue ? String(nextVenue.id) : '',
        faculty_id: nextFaculty ? String(nextFaculty.id) : '',
        capacity: nextVenue?.capacity || 30,
      }
    ];

    const totalCap = newVenues.reduce((sum, v) => sum + (Number(v.capacity) || 0), 0);

    setFormData(prev => ({
      ...prev,
      slot_venues: newVenues,
      capacity: totalCap,
    }));
  };

  const handleRemoveVenueRow = (index) => {
    if (formData.slot_venues.length <= 1) {
      showToast('A slot must have at least one venue', 'error');
      return;
    }

    const newVenues = formData.slot_venues.filter((_, i) => i !== index);
    const totalCap = newVenues.reduce((sum, v) => sum + (Number(v.capacity) || 0), 0);

    setFormData(prev => ({
      ...prev,
      slot_venues: newVenues,
      capacity: totalCap,
    }));
  };

  const handleUpdateVenueRow = (index, field, value) => {
    const newVenues = [...formData.slot_venues];
    newVenues[index] = { ...newVenues[index], [field]: value };

    if (field === 'venue_id') {
      const v = venues.find(item => String(item.id) === String(value));
      if (v) {
        newVenues[index].capacity = v.capacity;
      }
    }

    const totalCap = newVenues.reduce((sum, v) => sum + (Number(v.capacity) || 0), 0);

    setFormData(prev => ({
      ...prev,
      slot_venues: newVenues,
      capacity: totalCap,
    }));
  };

  // Check for duplicate faculty assignments across venues in the slot
  const duplicateFacultyError = useMemo(() => {
    const seen = new Set();
    for (const sv of formData.slot_venues) {
      if (!sv.faculty_id) continue;
      if (seen.has(String(sv.faculty_id))) {
        const fac = facultyList.find(f => String(f.id) === String(sv.faculty_id));
        return `Faculty "${fac?.name || 'Faculty Member'}" is assigned to multiple venues in this slot. Each venue must be mapped to a distinct faculty invigilator.`;
      }
      seen.add(String(sv.faculty_id));
    }
    return null;
  }, [formData.slot_venues, facultyList]);

  // Check for duplicate venue assignments
  const duplicateVenueError = useMemo(() => {
    const seen = new Set();
    for (const sv of formData.slot_venues) {
      if (!sv.venue_id) continue;
      if (seen.has(String(sv.venue_id))) {
        const ven = venues.find(v => String(v.id) === String(sv.venue_id));
        return `Venue "${ven?.name || 'Venue'}" is added multiple times. Each venue row must be unique.`;
      }
      seen.add(String(sv.venue_id));
    }
    return null;
  }, [formData.slot_venues, venues]);

  // Date shortcut presets
  const setDatePreset = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setFormData(prev => ({ ...prev, slot_date: d.toISOString().split('T')[0] }));
  };

  // Duration shortcuts (calculate end time from start time)
  const setDurationPreset = (minutes) => {
    if (!formData.start_time) return;
    const [hStr, mStr] = formData.start_time.split(':');
    const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    const formattedEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, end_time: formattedEnd }));
  };

  // Calculate session duration in minutes
  const sessionDuration = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return 0;
    const [sh, sm] = formData.start_time.split(':').map(Number);
    const [eh, em] = formData.end_time.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return diff;
  }, [formData.start_time, formData.end_time]);

  // Filtered tracks for search
  const filteredTracks = useMemo(() => {
    if (!domainSearch.trim()) return tracks;
    const q = domainSearch.toLowerCase();
    return tracks.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [tracks, domainSearch]);

  // Domain selection helpers
  const handleToggleTrack = (trackId) => {
    const tId = Number(trackId);
    setFormData(prev => {
      const isSelected = prev.allowed_track_ids.includes(tId);
      const targetTrack = tracks.find(t => t.id === tId);
      const trackLevelIds = targetTrack?.levels?.map(l => l.id) || [];

      if (isSelected) {
        return {
          ...prev,
          allowed_track_ids: prev.allowed_track_ids.filter(id => id !== tId),
          allowed_level_ids: prev.allowed_level_ids.filter(id => !trackLevelIds.includes(id)),
        };
      } else {
        return {
          ...prev,
          allowed_track_ids: [...prev.allowed_track_ids, tId],
        };
      }
    });
  };

  const handleToggleLevel = (trackId, levelId) => {
    const tId = Number(trackId);
    const lId = Number(levelId);

    setFormData(prev => {
      const trackSelected = prev.allowed_track_ids.includes(tId);
      const updatedTrackIds = trackSelected ? prev.allowed_track_ids : [...prev.allowed_track_ids, tId];

      const levelSelected = prev.allowed_level_ids.includes(lId);
      let updatedLevelIds;
      if (levelSelected) {
        updatedLevelIds = prev.allowed_level_ids.filter(id => id !== lId);
      } else {
        updatedLevelIds = [...prev.allowed_level_ids, lId];
      }

      return {
        ...prev,
        allowed_track_ids: updatedTrackIds,
        allowed_level_ids: updatedLevelIds,
      };
    });
  };

  const handleSelectAllDomains = () => {
    const allTrackIds = tracks.map(t => Number(t.id));
    setFormData(prev => ({
      ...prev,
      allowed_track_ids: allTrackIds,
      allowed_level_ids: [],
    }));
  };

  const handleClearAllDomains = () => {
    setFormData(prev => ({
      ...prev,
      allowed_track_ids: [],
      allowed_level_ids: [],
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const isOnline = formData.slot_type === 'online';

    if (!isOnline) {
      if (formData.slot_venues.length === 0) {
        showToast('Please add at least one venue', 'error');
        return;
      }

      for (let i = 0; i < formData.slot_venues.length; i++) {
        const sv = formData.slot_venues[i];
        if (!sv.venue_id) {
          showToast(`Please select a venue for Location #${i + 1}`, 'error');
          return;
        }
        if (!sv.faculty_id) {
          showToast(`Please assign a faculty invigilator for Location #${i + 1}`, 'error');
          return;
        }
      }

      if (duplicateFacultyError) {
        showToast(duplicateFacultyError, 'error');
        return;
      }

      if (duplicateVenueError) {
        showToast(duplicateVenueError, 'error');
        return;
      }
    }

    if (!formData.slot_date || !formData.start_time || !formData.end_time) {
      showToast('Please specify the date and session timings', 'error');
      return;
    }
    if (!formData.is_open_to_all && formData.allowed_track_ids.length === 0) {
      showToast('Please select at least one domain or toggle "Open to All Domains"', 'error');
      return;
    }

    const venuesPayload = isOnline ? [] : formData.slot_venues.map(sv => ({
      venue_id: Number(sv.venue_id),
      faculty_id: Number(sv.faculty_id),
      capacity: Number(sv.capacity) || 30,
    }));

    const totalCap = isOnline
      ? (Number(formData.capacity) || 50)
      : venuesPayload.reduce((sum, v) => sum + v.capacity, 0);

    const payload = {
      slot_type: formData.slot_type,
      venues: venuesPayload,
      prevent_same_venue_match: isOnline ? false : formData.prevent_same_venue_match,
      allowed_track_ids: formData.is_open_to_all ? [] : formData.allowed_track_ids.map(Number),
      allowed_level_ids: formData.is_open_to_all ? [] : formData.allowed_level_ids.map(Number),
      slot_date: formData.slot_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      capacity: Number(formData.capacity) || totalCap,
      notes: formData.notes,
    };

    if (isEditing) {
      payload.status = formData.status;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/admin/slots/${slotId}`, payload);
        showToast('Interview slot updated successfully');
      } else {
        await api.post('/admin/slots', payload);
        showToast(isOnline ? 'Online interview slot scheduled successfully' : 'Physical interview slot scheduled successfully');
      }
      setTimeout(() => {
        navigate('/admin/venues');
      }, 700);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save slot', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--text-secondary)]">
        <Loader2 className="w-9 h-9 animate-spin text-[var(--accent)] mb-3" />
        <p className="text-sm font-medium">Loading slot configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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

      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <Link
              to="/admin/venues"
              className="hover:text-[var(--accent)] transition-colors flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Venues & Lab Slots</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)] font-semibold">
              {isEditing ? `Edit Slot #${slotId}` : 'Schedule Interview Slot'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-[var(--accent)]" />
            <span>{isEditing ? 'Edit Interview Slot' : 'Schedule New Interview Slot'}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure venues, assign faculty, and set schedule details.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => navigate('/admin/venues')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || Boolean(duplicateFacultyError) || Boolean(duplicateVenueError)}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isEditing ? 'Save Changes' : 'Publish Slot'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Sections (Left) & Live Summary Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Form Inputs */}
        <div className="lg:col-span-8 space-y-6">
          {/* SLOT TYPE FORMAT SELECTOR */}
          <div className="p-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, slot_type: 'physical' }))}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                formData.slot_type === 'physical'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Physical Venue</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, slot_type: 'online' }))}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                formData.slot_type === 'online'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Online (Remote Virtual Session)</span>
            </button>
          </div>

          {/* SECTION 1: PHYSICAL VENUES (IF PHYSICAL) OR ONLINE SETTINGS (IF ONLINE) */}
          {formData.slot_type === 'online' ? (
            <div className="panel-card p-6 bg-[var(--bg-card)] border border-indigo-500/30 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Online Virtual Session Settings</span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    No venue or faculty is required.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-indigo-200">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Automated Remote Proctoring & Instant Access</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-indigo-300/90">
                  Candidates who book this online slot can start their peer interview directly on the scheduled session time from anywhere without waiting for physical faculty attendance check-in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Online Student Capacity (Maximum Simultaneous Test Takers) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full max-w-xs px-3.5 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Venues & Faculty
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Assign 1 or more venues. Each venue must be mapped to a distinct faculty.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddVenueRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Venue</span>
                </button>
              </div>

              {/* Validation Alerts */}
              {duplicateFacultyError && (
                <div className="p-3.5 rounded-xl bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-semibold">{duplicateFacultyError}</p>
                </div>
              )}

              {duplicateVenueError && (
                <div className="p-3.5 rounded-xl bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-semibold">{duplicateVenueError}</p>
                </div>
              )}

              {/* Venue Rows List */}
              <div className="space-y-4">
                {formData.slot_venues.map((sv, idx) => {
                  const venueObj = venues.find(v => String(v.id) === String(sv.venue_id));
                  const facultyObj = facultyList.find(f => String(f.id) === String(sv.faculty_id));

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-xs font-bold text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                          <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Venue #{idx + 1}</span>
                        </span>

                        {formData.slot_venues.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVenueRow(idx)}
                            className="text-rose-500 hover:text-rose-600 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Venue</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        {/* Venue Dropdown */}
                        <div className="sm:col-span-5 space-y-1">
                          <label className="block text-[11px] font-bold text-[var(--text-primary)]">
                            Select Venue <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={sv.venue_id}
                            onChange={(e) => handleUpdateVenueRow(idx, 'venue_id', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium"
                          >
                            <option value="" disabled>-- Select Venue --</option>
                            {venues.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name} (Room {v.room_number}) • {v.building}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Faculty Dropdown */}
                        <div className="sm:col-span-5 space-y-1">
                          <label className="block text-[11px] font-bold text-[var(--text-primary)]">
                            Assigned Faculty Invigilator <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={sv.faculty_id}
                            onChange={(e) => handleUpdateVenueRow(idx, 'faculty_id', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium"
                          >
                            <option value="" disabled>-- Select Faculty Member --</option>
                            {facultyList.map(f => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.department || 'Faculty'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Capacity */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="block text-[11px] font-bold text-[var(--text-primary)]">
                            Capacity
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={sv.capacity}
                            onChange={(e) => handleUpdateVenueRow(idx, 'capacity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono font-medium"
                          />
                        </div>
                      </div>

                      {/* Venue & Faculty Mini Badge Info */}
                      {venueObj && facultyObj && (
                        <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-[10.5px] text-[var(--text-secondary)] font-mono">
                          <span>Room: <strong className="text-[var(--text-primary)]">{venueObj.room_number} ({venueObj.building})</strong></span>
                          <span>Invigilator: <strong className="text-emerald-500">{facultyObj.name}</strong></span>
                          <span>Allocated Seats: <strong className="text-[var(--accent)]">{sv.capacity}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cross-Venue Matchmaking Toggle */}
              <div className="pt-3 border-t border-[var(--border)]">
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.prevent_same_venue_match}
                    onChange={(e) => setFormData({ ...formData, prevent_same_venue_match: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded text-[var(--accent)] accent-[var(--accent)] cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Enforce Cross-Venue Matchmaking
                      </span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Integrity Shield
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Guarantees that a candidate in Venue 1 will connect with a peer sitting in Venue 2 or Venue 3 (prevents candidates sitting in the same physical venue from interviewing each other).
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 2: DATE, TIME & CAPACITY */}
          <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Session Schedule, Timings & Total Seat Quota
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Configure the slot date, start/end session timings, and total combined capacity.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Date with quick presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    Slot Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">Quick Set:</span>
                    <button
                      type="button"
                      onClick={() => setDatePreset(0)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatePreset(1)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatePreset(2)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] cursor-pointer"
                    >
                      +2 Days
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={formData.slot_date}
                  onChange={(e) => setFormData({ ...formData, slot_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium"
                />
              </div>

              {/* Timings & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    Start Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      End Time <span className="text-rose-500">*</span>
                    </label>
                    {sessionDuration > 0 && (
                      <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-mono font-bold">
                        {sessionDuration} mins
                      </span>
                    )}
                  </div>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium"
                  />
                </div>
              </div>

              {/* Quick Duration Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Quick Duration:</span>
                </span>
                {[45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationPreset(mins)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      sessionDuration === mins
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)]'
                    }`}
                  >
                    {mins} Mins
                  </button>
                ))}
              </div>

              {/* Capacity & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      Total Seat Quota (Combined Venues) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      Auto-sum of {formData.slot_venues.length} venue(s)
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono font-medium"
                  />
                </div>

                {isEditing && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      Slot Lifecycle Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-medium"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active (In Progress)</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: DOMAIN & LEVEL ELIGIBILITY */}
          <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Domain & Difficulty Level Restrictions
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Control which interview tracks and level tiers can be reserved for this slot.
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                formData.is_open_to_all
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
              }`}>
                {formData.is_open_to_all ? 'Open to All Domains' : `Restricted (${formData.allowed_track_ids.length} Selected)`}
              </span>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_open_to_all: true, allowed_track_ids: [], allowed_level_ids: [] })}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  formData.is_open_to_all
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                    : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--border-accent)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  formData.is_open_to_all ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">Open to All Domains</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Any student can book any domain & level tier in this slot.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    is_open_to_all: false,
                    allowed_track_ids: prev.allowed_track_ids.length > 0 ? prev.allowed_track_ids : tracks.map(t => Number(t.id)),
                  }));
                }}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  !formData.is_open_to_all
                    ? 'bg-[var(--accent-dim)]/20 border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--border-accent)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  !formData.is_open_to_all ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">Specific Domains & Levels</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Restrict slot bookings to selected domains and levels.
                  </p>
                </div>
              </button>
            </div>

            {/* If Restricted Mode is Active -> Show Filter and Clean Track Cards */}
            {!formData.is_open_to_all && (
              <div className="space-y-4 pt-2 animate-fadeIn">
                {/* Search & Bulk Select Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Filter domains (e.g., DSA, System Design)..."
                      value={domainSearch}
                      onChange={(e) => setDomainSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllDomains}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] hover:opacity-90 transition-all cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllDomains}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Domain Cards Grid */}
                <div className="space-y-3">
                  {filteredTracks.map((track) => {
                    const trackId = Number(track.id);
                    const isTrackSelected = formData.allowed_track_ids.includes(trackId);
                    const levels = track.levels || [];
                    const trackLevelIds = levels.map(l => l.id);

                    // Check which levels are specifically selected
                    const selectedForThisTrack = formData.allowed_level_ids.filter(id => trackLevelIds.includes(id));
                    const isAllLevels = isTrackSelected && selectedForThisTrack.length === 0;

                    const IconComponent = getTrackIcon(track.icon);

                    return (
                      <div
                        key={track.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isTrackSelected
                            ? 'bg-[var(--accent-dim)]/10 border-[var(--border-accent)] shadow-sm'
                            : 'bg-[var(--bg)] border-[var(--border)] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isTrackSelected}
                              onChange={() => handleToggleTrack(trackId)}
                              className="mt-1 w-4 h-4 rounded text-[var(--accent)] focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                  {track.title}
                                </h4>
                                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]">
                                  {track.category || 'Technical'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                                {track.description || 'Hands-on assessment modules'}
                              </p>
                            </div>
                          </label>

                          {isTrackSelected && (
                            <span className="text-[11px] font-mono text-[var(--accent)] font-semibold shrink-0">
                              {isAllLevels ? 'All Levels Allowed' : `${selectedForThisTrack.length} Level(s) Selected`}
                            </span>
                          )}
                        </div>

                        {/* Level Tier Selection Pills */}
                        {isTrackSelected && levels.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                              <span>Select specific difficulty levels:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    allowed_level_ids: prev.allowed_level_ids.filter(id => !trackLevelIds.includes(id)),
                                  }));
                                }}
                                className={`text-[10px] font-semibold hover:underline cursor-pointer ${isAllLevels ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                              >
                                {isAllLevels ? '✓ All Levels Selected' : 'Switch to All Levels'}
                              </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {levels.map((lvl) => {
                                const isLvlSelected = isAllLevels || formData.allowed_level_ids.includes(lvl.id);

                                return (
                                  <button
                                    key={lvl.id}
                                    type="button"
                                    onClick={() => handleToggleLevel(trackId, lvl.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isLvlSelected
                                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-accent)]'
                                    }`}
                                  >
                                    <span className="font-bold">L{lvl.level_number}:</span>
                                    <span>{lvl.name}</span>
                                    {isLvlSelected && <Check className="w-3 h-3 ml-0.5" />}
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
            )}
          </div>

          {/* SECTION 4: NOTES & INSTRUCTIONS */}
          <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Special Notes & Student Instructions
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Provide guidance for students attending this session and venue arrival instructions.
                </p>
              </div>
            </div>

            <textarea
              rows="3"
              placeholder="e.g., Please arrive 10 minutes prior to slot start time with college ID card. Venue allocation will be verified by the admin before your session."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Live Summary & Preview (Sticky) */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          {/* Live Preview Card */}
          <div className="panel-card p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span>Live Slot Summary</span>
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                formData.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-sky-500/10 text-sky-500'
              }`}>
                {formData.status}
              </span>
            </div>

            {/* Format & Venues Summary List */}
            {formData.slot_type === 'online' ? (
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Online Remote Virtual Session</span>
                </div>
                <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                  No physical lab room or faculty invigilator required. Candidates connect remotely and begin on time automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Assigned Venues ({formData.slot_venues.length}):</span>
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {formData.slot_venues.map((sv, i) => {
                    const ven = venues.find(v => String(v.id) === String(sv.venue_id));
                    const fac = facultyList.find(f => String(f.id) === String(sv.faculty_id));

                    return (
                      <div key={i} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                          <span>{ven?.name || `Location #${i + 1}`}</span>
                          <span className="px-2 py-0.2 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-mono">
                            {sv.capacity} Seats
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--text-secondary)]">
                          Room: {ven?.room_number || 'TBD'} • Invigilator: <strong className="text-emerald-500">{fac?.name || 'Unassigned'}</strong>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                  <Calendar className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  {formData.slot_date || 'YYYY-MM-DD'}
                </span>
                <span className="font-mono text-[11px] text-[var(--accent)] font-semibold">
                  {formData.start_time} - {formData.end_time}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] pl-6">
                Total Duration: <strong className="text-[var(--text-primary)]">{sessionDuration} Minutes</strong>
              </p>
            </div>

            {/* Cross-Venue Matchmaking Badge (Only if physical) */}
            {formData.slot_type === 'physical' && (
              <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-medium">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Cross-Venue Match:</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  formData.prevent_same_venue_match
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {formData.prevent_same_venue_match ? 'Enforced' : 'Same-Venue Allowed'}
                </span>
              </div>
            )}

            {/* Capacity */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-[var(--text-secondary)]">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                <span>{formData.slot_type === 'online' ? 'Online Student Capacity:' : 'Total Combined Seats:'}</span>
              </span>
              <strong className="text-sm font-mono text-[var(--text-primary)]">
                {formData.capacity} Seats
              </strong>
            </div>

            {/* Domains Preview */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                Eligible Domains:
              </span>
              <div className="flex flex-wrap gap-1">
                {formData.is_open_to_all ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Open to All Tracks & Levels
                  </span>
                ) : formData.allowed_track_ids.length === 0 ? (
                  <span className="text-[11px] text-rose-500 font-semibold">
                    No domains selected!
                  </span>
                ) : (
                  formData.allowed_track_ids.map(id => {
                    const trk = tracks.find(t => t.id === id);
                    if (!trk) return null;
                    return (
                      <span key={id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)]">
                        {trk.title}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || (formData.slot_type === 'physical' && (Boolean(duplicateFacultyError) || Boolean(duplicateVenueError)))}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isEditing ? 'Save Changes' : 'Schedule Slot'}</span>
              </button>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              {formData.slot_type === 'online' ? (
                <>
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Online Remote Session Flow</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                  <span>Admin Allocation & Disclosure Gate</span>
                </>
              )}
            </div>
            <p className="text-[11px] leading-relaxed">
              {formData.slot_type === 'online'
                ? 'For online slots, students can initiate their interview directly at the scheduled start time without any faculty check-in. Admins can view the booked student roster and cancel bookings anytime.'
                : 'When students reserve this slot, specific room details remain masked until you review the student distribution in the slot roster and click Verify & Publish Allocations.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
