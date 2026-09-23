import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  ChevronRight,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  Code2,
  UserCheck,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/labs/courses');
      setCourses(res?.courses || []);
    } catch (err) {
      setError('Failed to load practical lab courses.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.course_code?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.semester?.toLowerCase().includes(q)
    );
  });

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
            Complete your mandatory academic lab experiments online, execute code against test cases, submit for faculty verification, and download your verified semester record PDF.
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

      {/* Search Bar */}
      <div className="panel-card p-4">
        <div className="relative w-full max-w-md flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search enrolled practical courses (e.g. 22AI304, Data Structures)..."
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
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading lab courses...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Courses Grid */}
      {!loading && !error && (
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
                {searchQuery ? 'No lab courses matching your search.' : 'No practical lab courses assigned to your batch.'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                {searchQuery
                  ? 'Try modifying your search term or clear the filter.'
                  : 'Please check with your department lab coordinator to map your section.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const totalExperiments = course.total_experiments || 7;

                return (
                  <div
                    key={course.id}
                    className="data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer transition-all"
                    onClick={() => navigate(`/labs/${course.id}/experiment/1`)}
                  >
                    <div className="space-y-3.5">
                      {/* Header row: Icon & Course Code Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            {course.course_code}
                          </span>
                        </div>
                      </div>

                      {/* Semester / Academic Year Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {course.semester && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                            {course.degree ? `${course.degree} · ` : ''}{course.semester}
                          </span>
                        )}
                        {course.academic_year && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                            {course.academic_year}
                          </span>
                        )}
                      </div>

                      {/* Course Title & Dept */}
                      <div>
                        <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                          {course.department || 'Practical laboratory assessments and viva voce evaluations.'}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: Metadata dot stats + Action Link */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[var(--text-primary)] font-semibold flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                          {totalExperiments} Experiments
                        </span>
                      </div>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Open Workspace &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

