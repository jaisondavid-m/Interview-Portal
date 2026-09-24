import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  BookOpen,
  Users,
  UsersRound,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  GraduationCap,
  Calendar,
  ChevronRight,
  FileCode2,
  CheckCircle2,
  Settings2,
  BarChart3
} from 'lucide-react';
import api from '../../api/axios';

export default function AdminLabConfig() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    coursesCount: 0,
    batchesCount: 0,
    studentsCount: 0,
    mappingsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummaryStats();
  }, []);

  const fetchSummaryStats = async () => {
    try {
      setLoading(true);
      // Fetch courses
      const coursesRes = await api.get('/labs/courses').catch(() => ({ courses: [] }));
      const courses = coursesRes?.courses || [];

      // Fetch admin lab mappings and faculty
      const adminDataRes = await api.get('/admin/labs/data').catch(() => ({ mappings: [] }));
      const mappings = adminDataRes?.mappings || [];

      // Fetch batch stats
      const batchStatsRes = await api.get('/admin/labs/batch-students/stats').catch(() => ({ stats: [] }));
      const batchStats = batchStatsRes?.stats || [];
      const totalAssignedStudents = batchStats.reduce((acc, curr) => acc + (curr.count || 0), 0);

      // Load stored batches
      let storedBatches = [];
      try {
        const raw = localStorage.getItem('lab_batches_v2');
        if (raw) storedBatches = JSON.parse(raw);
        else {
          storedBatches = [
            { id: '1', name: 'CSE-A', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
            { id: '2', name: 'CSE-B', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
            { id: '3', name: 'AI&DS-A', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
            { id: '4', name: 'AI&DS-B', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
          ];
        }
      } catch {
        storedBatches = [];
      }

      setStats({
        coursesCount: courses.length,
        batchesCount: storedBatches.length,
        studentsCount: totalAssignedStudents,
        mappingsCount: mappings.length,
      });
    } catch {
      // silently catch
    } finally {
      setLoading(false);
    }
  };

  const CONFIG_CARDS = [
    {
      id: 'courses',
      title: 'Lab Courses',
      subtitle: 'Curriculum, Experiments & Regulations',
      description:
        'Manage academic laboratory courses, create syllabi, configure problem statements, test cases, code templates, and assessment rubrics.',
      path: '/admin/labs/courses',
      icon: BookOpen,
      badge: `${stats.coursesCount} Courses`,
      features: [
        'Curriculum & syllabus configuration',
        'Experiment problem statements & variants',
        'Automatic Python execution & unit test evaluation',
        'Academic regulations (2022, 2026, etc.)'
      ],
      color: 'accent',
    },
    {
      id: 'batches',
      title: 'Student Batches & Sections',
      subtitle: 'Cohorts, Semester/Year & Allocation',
      description:
        'Organize student cohorts into sections (e.g. CSE-A, AI&DS-B) with linked semesters and academic years, and assign students with 1-click workflows.',
      path: '/admin/labs/batches',
      icon: Users,
      badge: `${stats.batchesCount} Batches · ${stats.studentsCount} Students`,
      features: [
        'Clean & intuitive batch creation with linked semester & year',
        'Smart presets for academic years and semesters',
        '1-click student allocation & fast re-assignment',
        'Batch roster overview & quick search'
      ],
      color: 'emerald',
    },
    {
      id: 'mapping',
      title: 'Faculty Lab Mapping',
      subtitle: 'Incharge Allocation & Evaluation Roles',
      description:
        'Assign faculty incharges to lab courses for specific student batches with automatic semester & academic year synchronization.',
      path: '/admin/labs/mapping',
      icon: UsersRound,
      badge: `${stats.mappingsCount} Active Mappings`,
      features: [
        'Faculty-to-course & batch mapping',
        'Auto-inherited semester and academic year',
        'Batch student lab course enrolment',
        'Evaluation access & mark entry authority'
      ],
      color: 'indigo',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1.5">
            <Settings2 className="w-3 h-3" />
            Institutional Laboratory Suite
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--accent)]" />
            Lab Configuration Hub
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Centrally manage your institutional laboratory courses, student batch allocations, and faculty incharge mappings.
          </p>
        </div>

        {/* Quick Audit Link */}
        <button
          onClick={() => navigate('/admin/labs/pdf-preview')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold hover:bg-[var(--bg-hover)] transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0 self-start md:self-auto"
        >
          <FileCode2 className="w-4 h-4 text-[var(--accent)]" />
          <span>Student Lab PDF Audit</span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* 3 Main Functional Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {CONFIG_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => navigate(card.path)}
              className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                {/* Top Row: Icon + Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center transition-transform group-hover:scale-105">
                    <Icon className="w-6 h-6" />
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)]">
                    {loading ? '...' : card.badge}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h2 className="text-[18px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {card.title}
                  </h2>
                  <p className="text-[12px] font-medium text-[var(--accent)] mt-0.5">
                    {card.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {card.description}
                </p>

                {/* Feature Bullet Points */}
                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Core Capabilities
                  </p>
                  <ul className="space-y-1.5 text-[12px] text-[var(--text-secondary)]">
                    {card.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                  Open Workspace
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] group-hover:translate-x-1 transition-transform">
                  Configure
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
