import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  BookOpen,
  Users,
  UsersRound,
  ArrowRight,
  Settings2,
  BarChart3,
  FileCode2
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
      const coursesRes = await api.get('/labs/courses').catch(() => ({ courses: [] }));
      const courses = coursesRes?.courses || [];

      const adminDataRes = await api.get('/admin/labs/data').catch(() => ({ mappings: [] }));
      const mappings = adminDataRes?.mappings || [];

      const batchStatsRes = await api.get('/admin/labs/batch-students/stats').catch(() => ({ stats: [] }));
      const batchStats = batchStatsRes?.stats || [];
      const totalAssignedStudents = batchStats.reduce((acc, curr) => acc + (curr.count || 0), 0);

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
      // catch silently
    } finally {
      setLoading(false);
    }
  };

  const CONFIG_CARDS = [
    {
      id: 'courses',
      title: 'Lab Courses',
      subtitle: 'Curriculum, Experiments & Regulations',
      path: '/admin/labs/courses',
      icon: BookOpen,
      badge: `${stats.coursesCount} Courses`,
    },
    {
      id: 'batches',
      title: 'Student Batches & Sections',
      subtitle: 'Cohorts, Semester/Year & Allocation',
      path: '/admin/labs/batches',
      icon: Users,
      badge: `${stats.batchesCount} Batches`,
    },
    {
      id: 'mapping',
      title: 'Faculty Lab Mapping',
      subtitle: 'Incharge Allocation & Evaluation Roles',
      path: '/admin/labs/mapping',
      icon: UsersRound,
      badge: `${stats.mappingsCount} Mappings`,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1.5">
            <Settings2 className="w-3 h-3" />
            Institutional Laboratory Suite
          </div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 text-[var(--accent)]" />
            Lab Configuration Hub
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Select a workspace below to manage practical lab courses, student cohorts, or faculty incharge mappings.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => navigate('/admin/labs/dashboard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Lab Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/labs/pdf-preview')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] hover:text-[var(--accent)] text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <FileCode2 className="w-4 h-4 text-[var(--accent)]" />
            <span>PDF Audit</span>
          </button>
        </div>
      </div>

      {/* Compact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CONFIG_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => navigate(card.path)}
              className="group bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                {/* Top Row: Icon & Count Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)]">
                    {loading ? '...' : card.badge}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                    {card.title}
                  </h2>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--accent)]">
                <span>Configure</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
