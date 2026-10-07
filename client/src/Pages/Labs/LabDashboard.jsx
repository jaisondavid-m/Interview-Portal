import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FlaskConical,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  Code2,
  Search,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Award,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LabMarkVerticalsModal from '../../Components/LabMarkVerticalsModal';

export default function LabDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [loadingExperiments, setLoadingExperiments] = useState(false);
  const [expError, setExpError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [verticalsModalData, setVerticalsModalData] = useState(null);

  // 1. Load enrolled courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // 2. Sync selected course from URL parameter if present
  useEffect(() => {
    const courseIdParam = searchParams.get('courseId');
    if (courseIdParam && courses.length > 0) {
      const match = courses.find((c) => String(c.id) === String(courseIdParam));
      if (match) {
        setSelectedCourse(match);
      }
    } else if (!courseIdParam) {
      setSelectedCourse(null);
      setExperiments([]);
    }
  }, [searchParams, courses]);

  // 3. Load experiments when a course is selected
  useEffect(() => {
    if (selectedCourse?.id) {
      fetchExperiments(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      setCourseError('');
      const res = await api.get('/labs/courses');
      const courseList = res?.courses || [];
      setCourses(courseList);
      setAvailableSections(res?.sections || []);

      // Check if URL already has a courseId param
      const courseIdParam = searchParams.get('courseId');
      if (courseIdParam) {
        const match = courseList.find((c) => String(c.id) === String(courseIdParam));
        if (match) {
          setSelectedCourse(match);
        }
      }
    } catch {
      setCourseError('Failed to load practical lab courses.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchExperiments = async (courseId) => {
    try {
      setLoadingExperiments(true);
      setExpError('');
      const res = await api.get(`/labs/courses/${courseId}/experiments`);
      setExperiments(res?.experiments || []);
    } catch {
      setExpError('Failed to load experiments for this course.');
    } finally {
      setLoadingExperiments(false);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setSearchParams({ courseId: course.id });
    setSearchQuery('');
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSearchParams({});
    setSearchQuery('');
  };

  // Filtered courses for top view
  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      c.title?.toLowerCase().includes(q) ||
      c.course_code?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.semester?.toLowerCase().includes(q) ||
      (c.assigned_faculty && c.assigned_faculty.some((f) => f.toLowerCase().includes(q)));

    const matchesSection =
      selectedSectionFilter === 'ALL' ||
      !c.assigned_sections ||
      c.assigned_sections.length === 0 ||
      c.assigned_sections.includes(selectedSectionFilter);

    return matchesQuery && matchesSection;
  });

  // Filtered experiments for course view
  const filteredExperiments = experiments.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      String(e.experiment_no)?.includes(q) ||
      e.aim?.toLowerCase().includes(q) ||
      e.language?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: EXPERIMENTS VIEW (WHEN COURSE IS SELECTED)
  // ─────────────────────────────────────────────────────────────────────────────
  if (selectedCourse) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb / Top Navigation Bar */}
        <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={handleBackToCourses}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Enrolled Courses
            </button>
            <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
              <FlaskConical className="w-6 h-6 text-[var(--accent)]" />
              {selectedCourse.title}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                {selectedCourse.course_code}
              </span>
              {selectedCourse.semester && (
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                  {selectedCourse.degree ? `${selectedCourse.degree} · ` : ''}
                  {selectedCourse.semester}
                </span>
              )}
              {selectedCourse.regulation && (
                <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                  {selectedCourse.regulation.toLowerCase().includes('regulation')
                    ? selectedCourse.regulation
                    : `Regulation ${selectedCourse.regulation.replace(/^r/i, '')}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => navigate(`/labs/${selectedCourse.id}/record`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent)] text-xs font-semibold shadow-[var(--shadow-xs)] transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              View Semester Record PDF
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="panel-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-md flex items-center">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiments by title, experiment #, or keyword..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs font-mono text-[var(--text-muted)]">
            Total Experiments: <strong className="text-[var(--text-primary)]">{experiments.length}</strong>
          </div>
        </div>

        {/* Loading Experiments */}
        {loadingExperiments && (
          <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            <span className="text-sm">Loading course experiments & permission status...</span>
          </div>
        )}

        {/* Experiment Error */}
        {!loadingExperiments && expError && (
          <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{expError}</span>
          </div>
        )}

        {/* Experiments Grid */}
        {!loadingExperiments && !expError && (
          <div className="space-y-4">
            {filteredExperiments.length === 0 ? (
              <div className="panel-card p-12 text-center space-y-3">
                <Code2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {searchQuery ? 'No experiments match your search criteria.' : 'No experiments configured for this course yet.'}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                  {searchQuery
                    ? 'Try clearing the search query to view all available experiments.'
                    : 'Check back shortly or contact your lab incharge faculty.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredExperiments.map((exp) => {
                  const sub = exp.submission;
                  const isInactive = exp.is_active === false || exp.unlock_status?.status === 'INACTIVE';
                  const isUnlocked = Boolean(exp.is_unlocked) && !isInactive;
                  const isApproved = sub?.status === 'APPROVED';
                  const isSubmitted = sub?.status === 'SUBMITTED_FOR_VERIFICATION';
                  const isFinished = isApproved || isSubmitted;
                  const isResubmit = sub?.status === 'RESUBMISSION_REQUESTED' || sub?.status === 'REVISION_REQUIRED';
                  const hasDraft = sub && !isFinished && !isResubmit;

                  return (
                    <div
                      key={exp.id}
                      className={`data-card p-5 flex flex-col justify-between transition-all hover:border-[var(--border-accent)] ${
                        isInactive ? 'opacity-70 bg-[var(--bg-card)]/60 border-dashed' : ''
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Header Row: Exp Number + Language + Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                              Experiment #{exp.experiment_no}
                            </span>
                            {exp.language && (
                              <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                                {exp.language}
                              </span>
                            )}
                          </div>

                          {/* Permission & Submission Status Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                Inactive
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approved ({sub.marks || sub.total_marks || 0}/{exp.max_marks || 100})
                              </span>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                Verification Pending
                              </span>
                            ) : isResubmit ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                <RotateCcw className="w-3.5 h-3.5" />
                                Resubmit Required
                              </span>
                            ) : isUnlocked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <Unlock className="w-3.5 h-3.5" />
                                Unlocked
                              </span>
                            ) : exp.unlock_status?.status === 'PREREQUISITE_LOCKED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                <Lock className="w-3.5 h-3.5" />
                                Prerequisite Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border)]">
                                <Lock className="w-3.5 h-3.5" />
                                Locked
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Aim */}
                        <div>
                          <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-snug">
                            {exp.title}
                          </h3>
                          {exp.aim && (
                            <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                              {exp.aim}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
                        {isInactive ? (
                          <div className="w-full flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)]">
                              <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>This experiment is currently inactive / disabled.</span>
                            </div>
                            {sub && (
                              <button
                                onClick={() =>
                                  navigate(`/labs/${selectedCourse.id}/experiment/${exp.id}`)
                                }
                                className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                View Record &rarr;
                              </button>
                            )}
                          </div>
                        ) : isFinished ? (
                          /* Experiment already finished -> DO NOT show Launch Assessment. Show View Record & View Mark Verticals */
                          <div className="w-full flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <button
                              onClick={() =>
                                navigate(`/labs/${selectedCourse.id}/experiment/${exp.id}`)
                              }
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent)] text-xs font-semibold shadow-[var(--shadow-xs)] transition-all cursor-pointer min-w-[130px]"
                            >
                              <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                              View Record
                            </button>
                            <button
                              onClick={() =>
                                setVerticalsModalData({ experiment: exp, course: selectedCourse, submission: sub })
                              }
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white text-xs font-bold shadow-[var(--shadow-xs)] transition-all cursor-pointer min-w-[140px]"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              View Mark Verticals
                            </button>
                          </div>
                        ) : isUnlocked ? (
                          /* Experiment not finished & Unlocked -> Show Launch Assessment */
                          <button
                            onClick={() =>
                              navigate(`/labs/${selectedCourse.id}/experiment/${exp.id}`)
                            }
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all shadow-[var(--shadow-sm)] cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {hasDraft ? 'Resume Assessment' : isResubmit ? 'Revise Submission' : 'Launch Assessment'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        ) : (
                          /* Locked by faculty */
                          <div className="w-full flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)]">
                              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                {exp.unlock_status?.notes || 'Locked by faculty incharge'}
                              </span>
                            </div>

                            {sub && (
                              <button
                                onClick={() =>
                                  navigate(`/labs/${selectedCourse.id}/experiment/${exp.id}`)
                                }
                                className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                View Record &rarr;
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mark Verticals Modal */}
        <LabMarkVerticalsModal
          isOpen={Boolean(verticalsModalData)}
          onClose={() => setVerticalsModalData(null)}
          experiment={verticalsModalData?.experiment}
          course={verticalsModalData?.course}
          submission={verticalsModalData?.submission}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: TOP LEVEL (ENROLLED LABORATORY COURSES LIST)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[24px] md:text-[26px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--accent)]" />
            Practical Lab Assessments
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Select an enrolled laboratory course to view assigned experiments, active faculty windows, and launch code assessments.
          </p>
        </div>
        {courses.length > 0 && (
          <button
            onClick={() => navigate(`/labs/${courses[0]?.id || 1}/record`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--accent)] text-xs font-semibold shadow-[var(--shadow-xs)] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <FileText className="w-4 h-4 text-[var(--accent)]" />
            View Semester Record
          </button>
        )}
      </div>

      {/* Controls Bar: Search & Section / Batch Filter */}
      <div className="panel-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full max-w-md flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practical courses, code, or faculty..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {availableSections.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Batch / Section:</span>
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--border-accent)]"
            >
              <option value="ALL">ALL Batches / Sections</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading Courses */}
      {loadingCourses && (
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading lab courses...</span>
        </div>
      )}

      {/* Course Error */}
      {!loadingCourses && courseError && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{courseError}</span>
        </div>
      )}

      {/* Courses Grid */}
      {!loadingCourses && !courseError && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              Enrolled Laboratory Courses
              <span className="text-[11px] font-mono font-normal text-[var(--text-muted)] ml-1">
                ({filteredCourses.length})
              </span>
            </h2>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <FlaskConical className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {searchQuery || selectedSectionFilter !== 'ALL'
                  ? 'No lab courses matching your criteria.'
                  : 'No practical lab courses assigned to your batch.'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                {searchQuery || selectedSectionFilter !== 'ALL'
                  ? 'Try modifying your search or section filter.'
                  : 'Please check with your department lab coordinator to map your section.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const totalExperiments = course.total_experiments || 7;
                const completedExps = course.completed_experiments || 0;
                const overallPct = course.overall_pct || 0;
                const assignedFaculty = course.assigned_faculty || [];
                const assignedSections = course.assigned_sections || [];

                return (
                  <div
                    key={course.id}
                    className="data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer transition-all border hover:border-[var(--border-accent)] shadow-sm"
                    onClick={() => handleSelectCourse(course)}
                  >
                    <div className="space-y-3.5">
                      {/* Header row: Icon & Course Code Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            {course.course_code}
                          </span>
                        </div>
                      </div>

                      {/* Semester / Regulation / Batches Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {course.semester && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                            {course.degree ? `${course.degree} · ` : ''}
                            {course.semester}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                          {course.regulation
                            ? course.regulation.toLowerCase().includes('regulation')
                              ? course.regulation
                              : `Regulation ${course.regulation.replace(/^r/i, '')}`
                            : 'Regulation 2022'}
                        </span>
                        {assignedSections.length > 0 && (
                          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                            {assignedSections.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Course Title & Dept */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                          {course.department ||
                            'Practical laboratory assessments and viva voce evaluations.'}
                        </p>
                      </div>

                      {/* Assigned Faculty Details */}
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 pt-1">
                        <span className="font-semibold text-[var(--text-secondary)]">Faculty:</span>
                        <span className="truncate">
                          {assignedFaculty.length > 0
                            ? assignedFaculty.join(', ')
                            : 'Unassigned / Department Core'}
                        </span>
                      </div>

                      {/* Student Progress Bar if student */}
                      {user?.role?.toLowerCase() === 'student' && (
                        <div className="pt-2 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-[var(--text-muted)]">Progress</span>
                            <span className="font-bold text-[var(--accent)]">
                              {completedExps}/{totalExperiments} Done ({overallPct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] transition-all duration-300"
                              style={{ width: `${overallPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Metadata stats + Action Link */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[var(--text-primary)] font-semibold flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                          {totalExperiments} Experiments
                        </span>
                      </div>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        View Experiments &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mark Verticals Modal */}
      <LabMarkVerticalsModal
        isOpen={Boolean(verticalsModalData)}
        onClose={() => setVerticalsModalData(null)}
        experiment={verticalsModalData?.experiment}
        course={verticalsModalData?.course}
        submission={verticalsModalData?.submission}
      />
    </div>
  );
}
