import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Building2,
  Users,
  GraduationCap,
  FlaskConical,
  Layers,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Mail,
  FileText,
  SlidersHorizontal,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Save,
  Loader2
} from 'lucide-react';
import api from '../../api/axios';
import Pagination from '../../Components/Pagination';
import SearchableSelect from '../../Components/SearchableSelect';

const cardCls = 'bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 transition-all';
const inputCls = 'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3.5 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';
const labelCls = 'text-[12px] font-semibold text-[var(--text-secondary)]';

const SEMESTER_PRESETS = [
  'Semester I',
  'Semester II',
  'Semester III',
  'Semester IV',
  'Semester V',
  'Semester VI',
  'Semester VII',
  'Semester VIII',
];

const ACADEMIC_YEAR_PRESETS = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
];

export default function AdminDataManagement() {
  const navigate = useNavigate();

  // Active view: 'overview' | 'departments'
  const [activeTab, setActiveTab] = useState('departments');

  // Department data state
  const [departments, setDepartments] = useState([]);
  const [deptSummary, setDeptSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('users'); // 'users' | 'name' | 'students' | 'faculty'

  // Department Users Inspection Drawer
  const [inspectDept, setInspectDept] = useState(null);
  const [deptUsers, setDeptUsers] = useState([]);
  const [deptUsersLoading, setDeptUsersLoading] = useState(false);
  const [deptUserSearch, setDeptUserSearch] = useState('');
  const [deptUserRole, setDeptUserRole] = useState('student');
  const [deptUserPage, setDeptUserPage] = useState(1);
  const [deptUserPagination, setDeptUserPagination] = useState({
    total_pages: 1,
    total_records: 0,
    has_next: false,
    has_prev: false,
  });

  // Quick Batch Creation Modal
  const [createBatchModal, setCreateBatchModal] = useState(null); // department object or null
  const [batchForm, setBatchForm] = useState({
    name: '',
    department: '',
    semester: 'Semester III',
    academic_year: '2025-2026',
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Copy helper
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Fetch departments overview
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/data-management/departments', {
        params: {
          search: search.trim() || undefined,
          sort_by: sortBy,
        },
      });
      if (res && res.data) {
        setDepartments(Array.isArray(res.data) ? res.data : []);
        if (res.summary) setDeptSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      showToast('Failed to load department master data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy]);

  const deptOptions = useMemo(() => {
    return departments.map((d) => ({
      value: d.name,
      label: d.name,
      badge: d.code || undefined,
      sublabel: `${d.student_count || 0} students · ${d.faculty_count || 0} faculty`,
    }));
  }, [departments]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Fetch users within selected department
  const fetchDepartmentUsers = useCallback(async () => {
    if (!inspectDept) return;
    try {
      setDeptUsersLoading(true);
      const res = await api.get(`/admin/data-management/departments/${encodeURIComponent(inspectDept.name)}/users`, {
        params: {
          page: deptUserPage,
          limit: 12,
          role: deptUserRole === 'all' ? undefined : deptUserRole,
          search: deptUserSearch.trim() || undefined,
        },
      });
      if (res && res.data) {
        setDeptUsers(Array.isArray(res.data) ? res.data : []);
        if (res.pagination) setDeptUserPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch department users:', err);
    } finally {
      setDeptUsersLoading(false);
    }
  }, [inspectDept, deptUserPage, deptUserRole, deptUserSearch]);

  useEffect(() => {
    if (inspectDept) {
      fetchDepartmentUsers();
    }
  }, [inspectDept, fetchDepartmentUsers]);

  // Open batch creation with pre-filled department
  const handleOpenBatchCreate = (dept) => {
    setBatchForm({
      name: `${dept.code || 'SEC'}-A`,
      department: dept.name,
      semester: 'Semester III',
      academic_year: '2025-2026',
    });
    setCreateBatchModal(dept);
  };

  // Save new batch into storage and navigate
  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) {
      showToast('Please enter a valid batch identifier', 'error');
      return;
    }
    setBatchSubmitting(true);
    try {
      const payload = {
        name: batchForm.name.trim().toUpperCase(),
        department: batchForm.department,
        semester: batchForm.semester,
        academic_year: batchForm.academic_year,
        regulation: '2022',
      };

      await api.post('/admin/labs/batches', payload);

      showToast(`Batch "${payload.name}" created successfully!`);
      setCreateBatchModal(null);
      // Optional navigate
      setTimeout(() => {
        navigate('/admin/labs/batches');
      }, 700);
    } catch (err) {
      console.error('Error saving batch:', err);
      showToast(err.response?.data?.error || 'Failed to save batch', 'error');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Copy all emails in view
  const handleCopyEmails = () => {
    if (!deptUsers || deptUsers.length === 0) return;
    const emails = deptUsers.map((u) => u.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emails);
    setCopiedEmail(true);
    showToast('User emails copied to clipboard');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-lg)] border shadow-xl text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-[var(--red-subtle)] border-[var(--red)] text-[var(--red)]'
              : 'bg-[var(--accent-subtle)] border-[var(--border-accent)] text-[var(--text-primary)]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[var(--red)] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] mb-1">
              <span>Admin</span>
              <span>/</span>
              <span className="text-[var(--accent)] font-semibold">Data Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
              <Database className="w-6 h-6 text-[var(--accent)]" />
              Data Management
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-1">
              Explore unique institutional departments, student taxonomy, and load department datasets for batch creation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDepartments}
              disabled={loading}
              className="px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin/labs/batches')}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              Manage Student Batches
            </button>
          </div>
        </div>

        {/* Master Dataset Hub Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Departments Master */}
          <div
            onClick={() => setActiveTab('departments')}
            className={`p-5 rounded-[var(--radius-xl)] border transition-all cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-[var(--accent-subtle)] border-[var(--border-accent)] shadow-sm'
                : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border-accent)]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-main)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent)] text-white uppercase tracking-wider">
                Live Users Table
              </span>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {deptSummary?.total_departments ?? departments.length}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
              Unique Academic Departments
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{deptSummary?.total_users?.toLocaleString() ?? '2,115+'} Total Users</span>
              <span className="text-[var(--accent)] font-semibold flex items-center gap-0.5">
                Explore <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 2: Student Enrollment */}
          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-main)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Active</span>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {deptSummary?.total_students?.toLocaleString() ?? '2,070+'}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
              Enrolled Students
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Across all branches</span>
              <button
                onClick={() => navigate('/admin/users?role=student')}
                className="text-[var(--text-secondary)] hover:text-[var(--accent)] font-semibold cursor-pointer"
              >
                View Users &rarr;
              </button>
            </div>
          </div>

          {/* Card 3: Faculty In-charges */}
          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-main)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Staff</span>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {deptSummary?.total_faculty?.toLocaleString() ?? '38+'}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
              Faculty Lab In-charges
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Departmental Staff</span>
              <button
                onClick={() => navigate('/admin/users?role=faculty')}
                className="text-[var(--text-secondary)] hover:text-[var(--accent)] font-semibold cursor-pointer"
              >
                View Staff &rarr;
              </button>
            </div>
          </div>

          {/* Card 4: Lab Curriculum & Batches */}
          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-main)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">Curriculum</span>
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              Practical Labs
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
              Course & Batch Linkage
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Master Configuration</span>
              <button
                onClick={() => navigate('/admin/labs/config')}
                className="text-[var(--accent)] font-semibold cursor-pointer"
              >
                Configure &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Section Title & Search/Sort Controls */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--accent)]" />
                Department Master Catalog
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                  {departments.length} Departments Found
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                All distinct departments detected across user accounts. Click any department to inspect enrolled students or create dedicated batches.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search department or code..."
                  className={`${inputCls} pl-8.5`}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-accent)]"
              >
                <option value="users">Sort: Total Users</option>
                <option value="students">Sort: Student Count</option>
                <option value="faculty">Sort: Faculty Count</option>
                <option value="name">Sort: Department Name</option>
              </select>
            </div>
          </div>

          {/* Department Cards Grid */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="text-xs">Loading department master data...</span>
            </div>
          ) : departments.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
              No departments found matching &quot;{search}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {departments.map((dept) => (
                <div
                  key={dept.name}
                  className="bg-[var(--bg-main)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-4 flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-3">
                    {/* Header with Code Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-accent)]">
                          {dept.code}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--text-muted)]">
                        {dept.total_users} users
                      </div>
                    </div>

                    {/* Department Full Name */}
                    <div>
                      <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-snug">
                        {dept.name}
                      </h3>
                      {dept.sections && dept.sections.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          <span className="text-[10px] text-[var(--text-muted)]">Sections:</span>
                          {dept.sections.map((sec) => (
                            <span
                              key={sec}
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]"
                            >
                              {sec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats Metrics Bar */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                      <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                          Students
                        </div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">
                          {dept.student_count}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] p-2 rounded border border-[var(--border)]">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                          Faculty
                        </div>
                        <div className="text-sm font-bold text-[var(--text-primary)]">
                          {dept.faculty_count}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                    <button
                      onClick={() => {
                        setInspectDept(dept);
                        setDeptUserPage(1);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      View Students
                    </button>
                    <button
                      onClick={() => handleOpenBatchCreate(dept)}
                      className="py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Create a new student batch for this department"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Batch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DRAWER / MODAL: Inspect Department Users */}
      {inspectDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-accent)]">
                    {inspectDept.code}
                  </span>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {inspectDept.name}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Browsing user accounts mapped to this department in the central users repository.
                </p>
              </div>
              <button
                onClick={() => setInspectDept(null)}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={deptUserRole}
                  onChange={(e) => {
                    setDeptUserRole(e.target.value);
                    setDeptUserPage(1);
                  }}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] focus:outline-none"
                >
                  <option value="student">Students ({inspectDept.student_count})</option>
                  <option value="faculty">Faculty ({inspectDept.faculty_count})</option>
                  <option value="all">All Roles ({inspectDept.total_users})</option>
                </select>

                <div className="relative min-w-[200px]">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={deptUserSearch}
                    onChange={(e) => {
                      setDeptUserSearch(e.target.value);
                      setDeptUserPage(1);
                    }}
                    placeholder="Search name, roll no, email..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-7 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyEmails}
                  className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                  title="Copy email addresses for current page"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedEmail ? 'Copied' : 'Copy Page Emails'}
                </button>
                <button
                  onClick={() => handleOpenBatchCreate(inspectDept)}
                  className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Batch with Dept
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {deptUsersLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                  <span className="text-xs">Loading department students...</span>
                </div>
              ) : deptUsers.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
                  No user records found for the applied filter.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-semibold">
                      <th className="py-2.5 px-3">Roll No / ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {deptUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[var(--accent)]">
                          {u.roll_no || u.id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                          {u.name}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono">
                          {u.email}
                        </td>
                        <td className="py-2.5 px-3">
                          {u.section ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]">
                              {u.section}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : u.role === 'faculty'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            {deptUserPagination.total_pages > 1 && (
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-main)]">
                <Pagination
                  page={deptUserPage}
                  totalPages={deptUserPagination.total_pages}
                  totalRecords={deptUserPagination.total_records}
                  hasNext={deptUserPagination.has_next}
                  hasPrev={deptUserPagination.has_prev}
                  onPageChange={setDeptUserPage}
                  itemLabel="users"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Create New Batch Preloaded with Department */}
      {createBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                Create Batch for {createBatchModal.code || 'Department'}
              </h3>
              <button
                onClick={() => setCreateBatchModal(null)}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4">
              {/* Batch Identifier */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Batch Name / Section Identifier <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  value={batchForm.name}
                  onChange={(e) => setBatchForm((p) => ({ ...p, name: e.target.value.toUpperCase() }))}
                  placeholder="e.g. CSE-A, AI&DS-B, IT-A"
                  className={inputCls}
                  autoFocus
                  required
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Unique section code used to assign lab experiments and faculty in-charges.
                </p>
              </div>

              {/* Department (Pre-selected) */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Department <span className="text-[var(--red)]">*</span>
                </label>
                <SearchableSelect
                  options={deptOptions}
                  value={batchForm.department}
                  onChange={(val) => setBatchForm((p) => ({ ...p, department: val }))}
                  placeholder="Select Department..."
                  searchPlaceholder="Search departments..."
                  fullWidth
                />
              </div>

              {/* Semester Selector */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Semester <span className="text-[var(--red)]">*</span>
                </label>
                <select
                  value={batchForm.semester}
                  onChange={(e) => setBatchForm((p) => ({ ...p, semester: e.target.value }))}
                  className={inputCls}
                  required
                >
                  {SEMESTER_PRESETS.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year Selector */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Academic Year <span className="text-[var(--red)]">*</span>
                </label>
                <select
                  value={batchForm.academic_year}
                  onChange={(e) => setBatchForm((p) => ({ ...p, academic_year: e.target.value }))}
                  className={inputCls}
                  required
                >
                  {ACADEMIC_YEAR_PRESETS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  {batchSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Create &amp; Go to Batches
                </button>
                <button
                  type="button"
                  onClick={() => setCreateBatchModal(null)}
                  className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
