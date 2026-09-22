import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  ChevronRight,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  Code2,
  UserCheck
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/labs/courses');
      setCourses(res.data?.courses || []);
    } catch (err) {
      setError('Failed to load practical lab courses.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-[var(--accent)]" />
            Practical Lab Assessments
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Complete mandatory college lab experiments online. Get your code verified by the Lab Incharge and download your official printable PDF record.
          </p>
        </div>
        <button
          onClick={() => navigate('/labs/1/record')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold shadow-[var(--shadow-sm)] hover:opacity-90 transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          View Semester Record
        </button>
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
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            Enrolled Laboratory Courses
            <span className="text-[11px] font-mono font-normal text-[var(--text-muted)] ml-1">
              ({courses.length} course{courses.length !== 1 ? 's' : ''})
            </span>
          </h2>

          {courses.length === 0 ? (
            <div className="p-10 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] text-[var(--text-muted)] text-sm">
              No lab courses have been assigned to you yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] rounded-[var(--radius-lg)] p-6 transition-all flex flex-col md:flex-row justify-between gap-6"
                >
                  {/* Course Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        {course.course_code}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                        {course.degree} · {course.semester}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                        {course.academic_year}
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                      {course.title}
                    </h3>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                      {course.department}
                    </p>

                    <div className="flex items-center gap-5 pt-1">
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                        <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span><strong className="text-[var(--text-primary)]">{course.total_experiments || 7}</strong> Experiments</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Faculty Assigned</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col justify-center items-start md:items-end gap-2.5 md:border-l md:border-[var(--border)] md:pl-6 min-w-[180px]">
                    <button
                      onClick={() => navigate(`/labs/${course.id}/experiment/1`)}
                      className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
                    >
                      Open Workspace
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/labs/${course.id}/record`)}
                      className="w-full px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer border border-[var(--border)]"
                    >
                      <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Semester Record PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
