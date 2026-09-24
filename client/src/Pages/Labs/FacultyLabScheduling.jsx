import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Unlock,
  Lock,
  Calendar,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MessageSquareCheck,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import api from '../../api/axios';
import LabScheduleModal from '../../Components/AdminLabs/LabScheduleModal';

export default function FacultyLabScheduling() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Unlock Matrix & Schedule State
  const [unlockData, setUnlockData] = useState({
    courses: [],
    mappings: [],
    unlocks: [],
    student_overrides: [],
    experiments: [],
    sections: [],
    students: [],
  });
  const [selectedUnlockCourseId, setSelectedUnlockCourseId] = useState('');
  const [selectedUnlockSection, setSelectedUnlockSection] = useState('ALL');
  const [togglingExpId, setTogglingExpId] = useState(null);

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetStudentId, setScheduleTargetStudentId] = useState('');
  const [scheduleTargetExpId, setScheduleTargetExpId] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchUnlockMatrix();
  }, []);

  const fetchUnlockMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-incharge/unlocks');
      setUnlockData(res || {
        courses: [],
        mappings: [],
        unlocks: [],
        student_overrides: [],
        experiments: [],
        sections: [],
        students: [],
      });
      if (res?.courses?.length > 0 && !selectedUnlockCourseId) {
        setSelectedUnlockCourseId(String(res.courses[0].id));
      }
    } catch {
      showToast('Failed to load lab schedules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUnlock = async (courseId, expId, section, newStatus) => {
    try {
      setTogglingExpId(expId);
      await api.post('/lab-incharge/unlocks/toggle', {
        course_id: Number(courseId),
        experiment_id: Number(expId),
        section: section || 'ALL',
        is_unlocked: newStatus,
      });
      showToast(
        newStatus
          ? `Experiment released for section ${section}!`
          : `Experiment locked for section ${section}!`,
        'success'
      );
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to update unlock status.', 'error');
    } finally {
      setTogglingExpId(null);
    }
  };

  const currentCourse = unlockData.courses.find((c) => String(c.id) === String(selectedUnlockCourseId));
  const activeCourseExperiments = unlockData.experiments.filter(
    (e) => String(e.course_id) === String(selectedUnlockCourseId)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Link to="/faculty/labs" className="hover:text-[var(--accent)] transition-colors">
              Lab Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-primary)] font-semibold">Window Scheduling</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[var(--accent)]" />
            Window Scheduling & Section Locks
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Control experiment release windows, manage section availability, and configure individual student deadline extensions.
          </p>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/faculty/labs')}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Student Analytics
          </button>

          <button
            type="button"
            onClick={() => navigate('/faculty/labs/evaluation')}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <MessageSquareCheck className="w-3.5 h-3.5" />
            Evaluation Queue
          </button>
        </div>
      </div>

      {/* Controls Bar: Course & Section Filter + Modal Trigger */}
      <div className="panel-card p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-2xl">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="space-y-1 min-w-[240px]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Target Lab Course
            </label>
            <select
              value={selectedUnlockCourseId}
              onChange={(e) => setSelectedUnlockCourseId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              {unlockData.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Target Section
            </label>
            <select
              value={selectedUnlockSection}
              onChange={(e) => setSelectedUnlockSection(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="ALL">ALL Sections</option>
              {unlockData.sections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => {
              setScheduleTargetStudentId('');
              setScheduleTargetExpId('');
              setIsScheduleModalOpen(true);
            }}
            className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Clock className="w-4 h-4" />
            Configure Attendance Windows & Overrides
          </button>
        </div>
      </div>

      {/* Experiment Availability Matrix Grid */}
      <div className="panel-card p-6 space-y-4 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Unlock className="w-4 h-4 text-[var(--accent)]" />
            Experiment Availability Matrix (Section: {selectedUnlockSection})
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {activeCourseExperiments.length} Experiments Configured
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
            <Clock className="w-6 h-6 animate-spin mx-auto text-[var(--accent)]" />
            <p>Loading experiments matrix...</p>
          </div>
        ) : activeCourseExperiments.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
            No experiments found for this course.
          </div>
        ) : (
          <div className="space-y-3">
            {activeCourseExperiments.map((exp) => {
              const unlockRecord = unlockData.unlocks.find(
                (u) =>
                  u.experiment_id === exp.id &&
                  (u.section === selectedUnlockSection || u.section === 'ALL')
              );
              const isUnlocked = unlockRecord?.is_unlocked || false;
              const starts = unlockRecord?.starts_at
                ? new Date(unlockRecord.starts_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;
              const ends = unlockRecord?.ends_at
                ? new Date(unlockRecord.ends_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              return (
                <div
                  key={exp.id}
                  className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[var(--accent)]/40 transition-all shadow-sm"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        Ex {exp.experiment_no}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                        {exp.title}
                      </h4>
                    </div>
                    {exp.aim && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 italic">
                        {exp.aim}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1 flex-wrap font-mono">
                      {starts && ends ? (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Window: {starts} → {ends}
                        </span>
                      ) : (
                        <span className="text-[var(--text-secondary)]">Window: Standard Class Session</span>
                      )}
                      {unlockRecord?.max_attempts > 0 && (
                        <span>• Max Attempts: {unlockRecord.max_attempts}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleTargetStudentId('');
                        setScheduleTargetExpId(String(exp.id));
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" /> Schedule
                    </button>

                    <button
                      type="button"
                      disabled={togglingExpId === exp.id}
                      onClick={() =>
                        handleToggleUnlock(
                          selectedUnlockCourseId,
                          exp.id,
                          selectedUnlockSection,
                          !isUnlocked
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isUnlocked
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm'
                          : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {isUnlocked ? 'Open' : 'Locked'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Window Scheduling & Overrides Modal */}
      {isScheduleModalOpen && (
        <LabScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          courses={unlockData.courses}
          sections={unlockData.sections}
          experiments={unlockData.experiments}
          students={unlockData.students}
          studentOverrides={unlockData.student_overrides}
          initialCourseId={selectedUnlockCourseId}
          initialStudentId={scheduleTargetStudentId}
          initialExpId={scheduleTargetExpId}
          onSuccess={(msg) => {
            showToast(msg);
            fetchUnlockMatrix();
          }}
        />
      )}
    </div>
  );
}
