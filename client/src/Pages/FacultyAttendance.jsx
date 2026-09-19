import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Calendar,
  Clock,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  UserCheck,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Unlock,
  Lock,
  Eye,
  CheckCheck
} from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../Components/SearchableSelect';
import { useAuth } from '../context/AuthContext';

export default function FacultyAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignedSlots, setAssignedSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(searchParams.get('slot_id') || '');
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Roster State
  const [rosterData, setRosterData] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'pending' | 'late'

  // Action State
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch slots assigned to faculty
  const fetchAssignedSlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await api.get('/faculty/slots?scope=all');
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setAssignedSlots(data);

      if (!selectedSlotId && data.length > 0) {
        // Default to first today/active slot, or first slot
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySlot = data.find(s => s.slot_date === todayStr);
        const defaultId = todaySlot ? todaySlot.id : data[0].id;
        setSelectedSlotId(defaultId);
        setSearchParams({ slot_id: defaultId });
      }
    } catch (err) {
      showToast('Failed to load assigned interview slots', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Fetch student roster for active slot
  const fetchSlotRoster = async (slotId) => {
    if (!slotId) return;
    try {
      setLoadingRoster(true);
      const res = await api.get(`/faculty/slots/${slotId}/roster`);
      setRosterData(res?.data || res);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load venue roster', 'error');
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchAssignedSlots();
  }, []);

  useEffect(() => {
    if (selectedSlotId) {
      fetchSlotRoster(selectedSlotId);
      setSearchParams({ slot_id: selectedSlotId });
    }
  }, [selectedSlotId]);

  // Handle single attendance toggle
  const handleUpdateAttendance = async (bookingId, newStatus) => {
    try {
      setUpdatingId(bookingId);
      await api.post(`/faculty/slots/${selectedSlotId}/attendance/${bookingId}`, {
        attendance_status: newStatus,
      });

      // Update local state smoothly
      setRosterData((prev) => {
        if (!prev || !prev.roster) return prev;
        const updatedRoster = prev.roster.map((b) => {
          if (b.id === bookingId) {
            return {
              ...b,
              attendance_status: newStatus,
              can_start_interview: newStatus === 'present',
            };
          }
          return b;
        });

        const presentCount = updatedRoster.filter(b => b.attendance_status === 'present').length;
        const absentCount = updatedRoster.filter(b => b.attendance_status === 'absent').length;
        const pendingCount = updatedRoster.filter(b => b.attendance_status === 'pending').length;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            present: presentCount,
            absent: absentCount,
            pending: pendingCount,
          },
          roster: updatedRoster,
        };
      });

      showToast(`Student marked as ${newStatus}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update attendance', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Bulk Check-in (Mark all pending/filtered present)
  const handleBulkMarkPresent = async () => {
    if (!rosterData?.roster || rosterData.roster.length === 0) return;
    const pendingIds = rosterData.roster
      .filter(b => b.attendance_status !== 'present')
      .map(b => b.id);

    if (pendingIds.length === 0) {
      showToast('All students in this slot are already marked Present!', 'info');
      return;
    }

    try {
      setBulkUpdating(true);
      await api.post(`/faculty/slots/${selectedSlotId}/attendance/bulk`, {
        booking_ids: pendingIds,
        attendance_status: 'present',
      });
      showToast(`Successfully marked ${pendingIds.length} candidate(s) as Present`);
      fetchSlotRoster(selectedSlotId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to bulk update attendance', 'error');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    if (!rosterData?.roster) return [];
    return rosterData.roster.filter((b) => {
      // Filter by status
      if (attendanceFilter !== 'all' && b.attendance_status !== attendanceFilter) {
        return false;
      }
      // Filter by search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.student?.name?.toLowerCase().includes(q);
        const matchesRoll = b.student?.roll_no?.toLowerCase().includes(q);
        const matchesEmail = b.student?.email?.toLowerCase().includes(q);
        const matchesTrack = b.track?.title?.toLowerCase().includes(q);
        return matchesName || matchesRoll || matchesEmail || matchesTrack;
      }
      return true;
    });
  }, [rosterData, attendanceFilter, searchQuery]);

  const currentSlot = rosterData?.slot || assignedSlots.find(s => Number(s.id) === Number(selectedSlotId));

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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] mb-1">
            <button
              onClick={() => navigate('/faculty/dashboard')}
              className="hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[var(--accent)]" />
            <span>Venue Attendance Console</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Verify students physically present in the venue to authorize their peer mock interview access.
          </p>
        </div>

        {/* Slot Selector Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Active Slot:
          </label>
          <SearchableSelect
            options={assignedSlots.map((s) => ({
              value: String(s.id),
              label: `${s.venue?.name || 'Venue'} • ${s.slot_date}`,
              sublabel: `${s.start_time} - ${s.end_time}`,
            }))}
            value={String(selectedSlotId)}
            onChange={(val) => setSelectedSlotId(val)}
            placeholder="Select Slot..."
            menuWidth="w-72"
          />

          <button
            onClick={() => fetchSlotRoster(selectedSlotId)}
            disabled={loadingRoster}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRoster ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Slot Overview Banner & Quick Actions */}
      {currentSlot && (
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">{currentSlot.venue?.name || 'Venue'}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                  Room {currentSlot.venue?.room_number} • {currentSlot.venue?.building}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {currentSlot.slot_date}
                </span>
                <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  {currentSlot.start_time} - {currentSlot.end_time}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics & Bulk Check-in Button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs">
              <span className="text-[var(--text-secondary)]">Present:</span>
              <span className="font-bold text-emerald-500 font-mono text-sm">
                {rosterData?.stats?.present ?? 0}
              </span>
              <span className="text-[var(--text-secondary)]">/ {rosterData?.stats?.total ?? 0}</span>
            </div>

            <button
              onClick={handleBulkMarkPresent}
              disabled={bulkUpdating || loadingRoster || !rosterData?.roster?.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {bulkUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span>Mark All Present</span>
            </button>
          </div>
        </div>
      )}

      {/* Roster Table Section */}
      <div className="p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-sm space-y-4">
        {/* Filters & Search Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search candidate by Roll No, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto">
            {[
              { id: 'all', label: 'All', count: rosterData?.stats?.total },
              { id: 'present', label: 'Present', count: rosterData?.stats?.present, color: 'text-emerald-500' },
              { id: 'pending', label: 'Pending', count: rosterData?.stats?.pending, color: 'text-amber-500' },
              { id: 'absent', label: 'Absent', count: rosterData?.stats?.absent, color: 'text-rose-500' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAttendanceFilter(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  attendanceFilter === tab.id
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono ${tab.color || 'text-[var(--text-secondary)]'}`}>
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loadingRoster ? (
          <div className="flex flex-col items-center justify-center p-12 text-[var(--text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-2" />
            <p className="text-xs">Loading candidate roster...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="w-10 h-10 text-[var(--text-secondary)] opacity-40 mb-2" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">No candidates found</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {searchQuery || attendanceFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'No students have booked this venue slot yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-3">Roll No</th>
                  <th className="py-3 px-3">Student Details</th>
                  <th className="py-3 px-3">Domain Track</th>
                  <th className="py-3 px-3">Interview Gate</th>
                  <th className="py-3 px-3 text-right">Attendance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRoster.map((booking) => {
                  const isUpdating = updatingId === booking.id;
                  const isPresent = booking.attendance_status === 'present';
                  const isAbsent = booking.attendance_status === 'absent';
                  const isLate = booking.attendance_status === 'late';
                  const isPending = booking.attendance_status === 'pending';

                  return (
                    <tr
                      key={booking.id}
                      className={`hover:bg-[var(--bg-hover)] transition-all ${
                        isPresent ? 'bg-emerald-500/[0.02]' : ''
                      }`}
                    >
                      {/* Roll No */}
                      <td className="py-3 px-3 font-mono font-bold text-[var(--text-primary)]">
                        {booking.student?.roll_no || 'N/A'}
                      </td>

                      {/* Student Details */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0">
                            {booking.student?.name ? booking.student.name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{booking.student?.name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{booking.student?.email} • {booking.student?.department || 'CSE'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Domain Track */}
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-semibold text-[var(--text-primary)]">
                          {booking.track?.title || 'General'}
                        </span>
                      </td>

                      {/* Interview Gate Status */}
                      <td className="py-3 px-3">
                        {booking.can_start_interview ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold">
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Access Unlocked</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[11px] font-medium">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked (Pending)</span>
                          </div>
                        )}
                      </td>

                      {/* Action Status Pills */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark Present */}
                          <button
                            onClick={() => handleUpdateAttendance(booking.id, 'present')}
                            disabled={isUpdating || isPresent}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                                : 'bg-[var(--bg)] hover:bg-emerald-500/10 text-[var(--text-secondary)] hover:text-emerald-500 border border-[var(--border)]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          {/* Mark Late */}
                          <button
                            onClick={() => handleUpdateAttendance(booking.id, 'late')}
                            disabled={isUpdating || isLate}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isLate
                                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                                : 'bg-[var(--bg)] hover:bg-amber-500/10 text-[var(--text-secondary)] hover:text-amber-500 border border-[var(--border)]'
                            }`}
                          >
                            <Clock3 className="w-3.5 h-3.5" />
                            <span>Late</span>
                          </button>

                          {/* Mark Absent */}
                          <button
                            onClick={() => handleUpdateAttendance(booking.id, 'absent')}
                            disabled={isUpdating || isAbsent}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                                : 'bg-[var(--bg)] hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--border)]'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
