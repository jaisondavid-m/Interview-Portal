import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FlaskConical,
  Search,
  X,
  Loader2,
  AlertCircle,
  Eye,
  ChevronRight,
  ShieldCheck,
  Code2,
  GraduationCap
} from 'lucide-react';
import api from '../../api/axios';
import Pagination from '../../Components/Pagination';

export default function FacultyLabCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCourses();
  }, [page, limit, search]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const [coursesRes, adminDataRes] = await Promise.all([
        api.get(`/labs/courses?page=${page}&limit=${limit}&search=${encodeURIComponent(search.trim())}`),
        api.get('/admin/labs/data').catch(() => ({ mappings: [] })),
      ]);
      setCourses(coursesRes?.courses || []);
      setTotalCourses(coursesRes?.total ?? (coursesRes?.courses?.length || 0));
      setTotalPages(coursesRes?.total_pages ?? 1);
      setMappings(adminDataRes?.mappings || []);
    } catch {
      showToast('Failed to load lab curriculum courses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
              : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Faculty Reference (Read-Only)
            </span>
          </div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[var(--accent)]" />
            Lab Courses Curriculum Explorer
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Browse practical laboratory courses, syllabus, experiment problem statements, test suites, and reference solutions.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-xs)]">
        <div className="relative w-full max-w-md flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search lab courses by code, title, department, or regulation..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Courses Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm font-medium">Loading lab curriculum courses...</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
          <FlaskConical className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
            {search ? 'No lab courses matching your search keyword.' : 'No practical lab courses found.'}
          </p>
          <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
            {search
              ? 'Try modifying your search query or clear the filter.'
              : 'Lab courses configured by the department admin will appear here for faculty reference.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => {
            const mappedFaculty = mappings.filter((m) => m.course_id === c.id);
            const facultyCount = mappedFaculty.length;
            const totalExperiments = c.total_experiments || 0;

            return (
              <div
                key={c.id}
                className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                onClick={() => navigate(`/faculty/labs/curriculum/${c.id}/experiments`)}
              >
                <div className="space-y-3.5">
                  {/* Top Row: Icon + Course Code */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                      <FlaskConical className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        {c.course_code}
                      </span>
                    </div>
                  </div>

                  {/* Course Meta Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.degree && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                        {c.degree}
                      </span>
                    )}
                    {c.semester && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                        {c.semester}
                      </span>
                    )}
                    {(c.regulation || c.academic_year) && (
                      <span className="text-[10px] font-mono text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                        {c.regulation
                          ? c.regulation.toLowerCase().includes('regulation')
                            ? c.regulation
                            : `Regulation ${c.regulation.replace(/^r/i, '')}`
                          : 'Regulation 2022'}
                      </span>
                    )}
                  </div>

                  {/* Title & Department */}
                  <div>
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                      {c.department || c.description || 'Practical laboratory curriculum and assessment modules.'}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[var(--text-primary)] font-semibold flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                      {totalExperiments} {totalExperiments === 1 ? 'Experiment' : 'Experiments'}
                    </span>
                  </div>
                  <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Explore &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalCourses > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalCourses}
          limit={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          pageSizeOptions={[6, 12, 24, 48]}
        />
      )}
    </div>
  );
}
