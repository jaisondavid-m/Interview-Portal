import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  BookOpen,
  GraduationCap,
  Tag,
  Calendar,
  UserCheck,
  UsersRound,
  CheckSquare,
  Square,
  Save,
  RefreshCw,
  Layers,
  UserPlus,
  Info,
  Code2,
  FileCode,
  Play,
  Sparkles,
} from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from '../../Components/SearchableSelect';

// ─── CSS Helpers ─────────────────────────────────────────────────────────────
const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';

const sectionCls =
  'bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] space-y-5';

const labelCls = 'text-[12px] font-semibold text-[var(--text-secondary)]';

// ─── Tag List Manager for Semesters & Academic Years ─────────────────────────
function SimpleTagManager({ title, icon: Icon, items, onAdd, onDelete, placeholder, color = 'accent' }) {
  const [draft, setDraft] = useState('');
  const colorMap = {
    accent: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  };
  const chip = colorMap[color] || colorMap.accent;

  const handleAdd = () => {
    const val = draft.trim();
    if (val && !items.includes(val)) {
      onAdd(val);
      setDraft('');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
        {title}
      </p>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          onClick={handleAdd}
          className="px-3 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shrink-0"
          title="Add item"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && (
          <span className="text-[11px] text-[var(--text-muted)] italic">No items added yet.</span>
        )}
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${chip}`}
          >
            {item}
            <button
              onClick={() => onDelete(item)}
              className="hover:opacity-70 transition-opacity cursor-pointer ml-1"
              title="Delete"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Lab Config Page ──────────────────────────────────────────────
export default function AdminLabConfig() {
  const navigate = useNavigate();

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Active Tab ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('courses'); // 'courses' | 'config' | 'mapping'

  // ── Persistence Helpers ────────────────────────────────────────────────────
  const loadStored = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  };
  const saveStored = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  // ── Global Semesters & Academic Years Config ───────────────────────────────
  const [semesters, setSemesters] = useState(() =>
    loadStored('lab_semesters', [
      'Semester I',
      'Semester II',
      'Semester III',
      'Semester IV',
      'Semester V',
      'Semester VI',
      'Semester VII',
      'Semester VIII',
    ])
  );
  const [academicYears, setAcademicYears] = useState(() =>
    loadStored('lab_acyears', ['2024-2025', '2025-2026', '2026-2027'])
  );

  const addSemester = (val) =>
    setSemesters((prev) => {
      const next = [...prev, val];
      saveStored('lab_semesters', next);
      return next;
    });
  const delSemester = (val) =>
    setSemesters((prev) => {
      const next = prev.filter((v) => v !== val);
      saveStored('lab_semesters', next);
      return next;
    });

  const addAcademicYear = (val) =>
    setAcademicYears((prev) => {
      const next = [...prev, val];
      saveStored('lab_acyears', next);
      return next;
    });
  const delAcademicYear = (val) =>
    setAcademicYears((prev) => {
      const next = prev.filter((v) => v !== val);
      saveStored('lab_acyears', next);
      return next;
    });

  // ── Batches (with mapped Semester & Academic Year) ──────────────────────────
  const defaultBatches = [
    { id: '1', name: 'CSE-A', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
    { id: '2', name: 'CSE-B', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
    { id: '3', name: 'AI&DS-A', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
    { id: '4', name: 'AI&DS-B', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
  ];

  const [batches, setBatches] = useState(() => {
    const raw = loadStored('lab_batches_v2', null);
    if (raw && Array.isArray(raw)) return raw;
    // Backwards compatibility from old lab_sections string array
    const legacy = loadStored('lab_sections', null);
    if (legacy && Array.isArray(legacy)) {
      return legacy.map((sec, idx) => ({
        id: String(idx + 1),
        name: typeof sec === 'string' ? sec : sec.name || `Batch-${idx + 1}`,
        semester: 'Semester III',
        academic_year: '2025-2026',
        department: '',
      }));
    }
    return defaultBatches;
  });

  const saveBatches = (newBatches) => {
    setBatches(newBatches);
    saveStored('lab_batches_v2', newBatches);
  };

  // Batch modal for Add / Edit
  const [batchModal, setBatchModal] = useState(null); // null | 'create' | 'edit'
  const [editingBatch, setEditingBatch] = useState(null);
  const emptyBatch = { name: '', semester: 'Semester III', academic_year: '2025-2026', department: '' };
  const [batchForm, setBatchForm] = useState(emptyBatch);

  const openCreateBatch = () => {
    setBatchForm({
      name: '',
      semester: semesters[0] || 'Semester III',
      academic_year: academicYears[0] || '2025-2026',
      department: '',
    });
    setEditingBatch(null);
    setBatchModal('create');
  };

  const openEditBatch = (b) => {
    setBatchForm({ ...b });
    setEditingBatch(b);
    setBatchModal('edit');
  };

  const handleSaveBatch = (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) {
      showToast('Batch name is required.', 'error');
      return;
    }
    const cleanName = batchForm.name.trim();
    if (batchModal === 'create') {
      if (batches.some((b) => b.name.toLowerCase() === cleanName.toLowerCase())) {
        showToast('A batch with this name already exists.', 'error');
        return;
      }
      const newEntry = {
        id: String(Date.now()),
        name: cleanName,
        semester: batchForm.semester,
        academic_year: batchForm.academic_year,
        department: batchForm.department,
      };
      saveBatches([...batches, newEntry]);
      showToast(`Batch "${cleanName}" created!`, 'success');
    } else if (batchModal === 'edit' && editingBatch) {
      const updated = batches.map((b) =>
        b.id === editingBatch.id
          ? {
              ...b,
              name: cleanName,
              semester: batchForm.semester,
              academic_year: batchForm.academic_year,
              department: batchForm.department,
            }
          : b
      );
      saveBatches(updated);
      showToast(`Batch "${cleanName}" updated!`, 'success');
    }
    setBatchModal(null);
    setEditingBatch(null);
  };

  const handleDeleteBatch = (id, name) => {
    if (!window.confirm(`Delete batch "${name}"? Students in this batch will not be deleted.`)) return;
    const filtered = batches.filter((b) => b.id !== id);
    saveBatches(filtered);
    showToast(`Batch "${name}" deleted.`, 'success');
  };

  // ── Lab Courses State (Tab 1) ──────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseModal, setCourseModal] = useState(null); // null | 'create' | 'edit'
  const [editingCourse, setEditingCourse] = useState(null);
  const emptyCourse = {
    course_code: '',
    title: '',
    department: '',
    degree: 'B.Tech',
    semester: '',
    regulation: '2022',
    total_experiments: 7,
    description: '',
  };
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  // ── Batch Section Student Management State (Tab 2) ────────────────────────
  const [batchTabSection, setBatchTabSection] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | 'CSE-A' | ...
  const [batchStudents, setBatchStudents] = useState([]);
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPage, setBatchPage] = useState(1);
  const [batchPagination, setBatchPagination] = useState({
    total_pages: 1,
    total_records: 0,
    has_next: false,
    has_prev: false,
  });
  const [batchSelectedIds, setBatchSelectedIds] = useState(new Set());
  const [targetBatchSection, setTargetBatchSection] = useState(() => batches[0]?.name || 'CSE-A');
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [batchStats, setBatchStats] = useState({});

  // Add Students to Active Batch Drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [drawerStudents, setDrawerStudents] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerPage, setDrawerPage] = useState(1);
  const [drawerPagination, setDrawerPagination] = useState({ total_pages: 1, total_records: 0 });
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSelectedIds, setDrawerSelectedIds] = useState(new Set());

  // ── Faculty Lab Mapping State (Tab 3) ──────────────────────────────────────
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(true);
  const [faculty, setFaculty] = useState([]);

  // Faculty mapping form (Semester & Academic Year derived from chosen Batch)
  const emptyMapping = { course_id: '', faculty_id: '', batch_name: '' };
  const [mappingForm, setMappingForm] = useState(emptyMapping);
  const [editingMapping, setEditingMapping] = useState(null);
  const [mappingSubmitting, setMappingSubmitting] = useState(false);

  // Student Mapping list in Tab 3
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentPagination, setStudentPagination] = useState({
    total_pages: 1,
    total_records: 0,
    has_next: false,
    has_prev: false,
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [studentFilterSection, setStudentFilterSection] = useState('ALL');
  const [studentMappingForm, setStudentMappingForm] = useState({
    course_id: '',
    faculty_id: '',
    batch_name: '',
  });
  const [studentMappingSubmitting, setStudentMappingSubmitting] = useState(false);
  const STUDENT_LIMIT = 15;

  // ─── Fetch Functions ───────────────────────────────────────────────────────
  const fetchCourses = async () => {
    try {
      setCoursesLoading(true);
      const res = await api.get('/labs/courses');
      setCourses(res?.courses || []);
    } catch {
      showToast('Failed to load lab courses.', 'error');
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      setMappingsLoading(true);
      const res = await api.get('/admin/labs/data');
      setMappings(res?.mappings || []);
      setFaculty(res?.faculty || []);
    } catch {
      showToast('Failed to load admin lab data.', 'error');
    } finally {
      setMappingsLoading(false);
    }
  };

  const fetchBatchStats = async () => {
    try {
      const res = await api.get('/admin/labs/batch-students/stats');
      if (Array.isArray(res?.stats)) {
        const statsMap = {};
        res.stats.forEach((s) => {
          statsMap[s.section] = s.count;
        });
        setBatchStats(statsMap);
      }
    } catch {
      // silently handle
    }
  };

  const fetchBatchStudents = useCallback(async () => {
    try {
      setBatchStudentsLoading(true);
      const params = {
        page: batchPage,
        limit: STUDENT_LIMIT,
        search: batchSearch.trim() || undefined,
        role: 'student',
      };
      if (batchTabSection === 'UNASSIGNED') {
        params.section = 'unassigned';
      } else if (batchTabSection !== 'ALL') {
        params.section = batchTabSection;
      }
      const res = await api.get('/admin/users', { params });
      setBatchStudents(Array.isArray(res.data) ? res.data : []);
      if (res.pagination) setBatchPagination(res.pagination);
    } catch {
      // silently handle
    } finally {
      setBatchStudentsLoading(false);
    }
  }, [batchPage, batchSearch, batchTabSection]);

  const fetchDrawerStudents = useCallback(async () => {
    try {
      setDrawerLoading(true);
      const params = {
        page: drawerPage,
        limit: 12,
        search: drawerSearch.trim() || undefined,
        role: 'student',
      };
      const res = await api.get('/admin/users', { params });
      setDrawerStudents(Array.isArray(res.data) ? res.data : []);
      if (res.pagination) setDrawerPagination(res.pagination);
    } catch {
      // silently handle
    } finally {
      setDrawerLoading(false);
    }
  }, [drawerPage, drawerSearch]);

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const params = {
        page: studentPage,
        limit: STUDENT_LIMIT,
        search: studentSearch.trim() || undefined,
        role: 'student',
      };
      if (studentFilterSection && studentFilterSection !== 'ALL') {
        params.section = studentFilterSection;
      }
      const res = await api.get('/admin/users', { params });
      setStudents(Array.isArray(res.data) ? res.data : []);
      if (res.pagination) setStudentPagination(res.pagination);
    } catch {
      // silently handle
    } finally {
      setStudentsLoading(false);
    }
  }, [studentPage, studentSearch, studentFilterSection]);

  useEffect(() => {
    fetchCourses();
    fetchAdminData();
    fetchBatchStats();
  }, []);

  useEffect(() => {
    if (tab === 'config') {
      fetchBatchStudents();
      fetchBatchStats();
    }
  }, [tab, fetchBatchStudents]);

  useEffect(() => {
    if (tab === 'mapping') {
      fetchStudents();
    }
  }, [tab, fetchStudents]);

  useEffect(() => {
    if (showAddDrawer) {
      fetchDrawerStudents();
    }
  }, [showAddDrawer, fetchDrawerStudents]);

  // Debounce search in batch tab
  useEffect(() => {
    if (tab !== 'config') return;
    const t = setTimeout(() => {
      setBatchPage(1);
      fetchBatchStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [batchSearch]);

  // Debounce search in drawer
  useEffect(() => {
    if (!showAddDrawer) return;
    const t = setTimeout(() => {
      setDrawerPage(1);
      fetchDrawerStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [drawerSearch]);

  // Debounce student search in mapping tab
  useEffect(() => {
    if (tab !== 'mapping') return;
    const t = setTimeout(() => {
      setStudentPage(1);
      fetchStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch, studentFilterSection]);

  // ─── Batch Student Assignment Handlers ─────────────────────────────────────
  const toggleBatchStudent = (id) => {
    setBatchSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllBatchStudents = () => {
    if (batchSelectedIds.size === batchStudents.length && batchStudents.length > 0) {
      setBatchSelectedIds(new Set());
    } else {
      setBatchSelectedIds(new Set(batchStudents.map((s) => s.id)));
    }
  };

  const handleApplyBatchSection = async (sectionToAssign) => {
    if (batchSelectedIds.size === 0) {
      showToast('Select at least one student.', 'error');
      return;
    }
    try {
      setBatchAssigning(true);
      await api.post('/admin/labs/batch-students/assign', {
        student_ids: Array.from(batchSelectedIds),
        section: sectionToAssign,
      });
      showToast(
        sectionToAssign
          ? `${batchSelectedIds.size} student(s) assigned to ${sectionToAssign}!`
          : `${batchSelectedIds.size} student(s) removed from section!`,
        'success'
      );
      setBatchSelectedIds(new Set());
      fetchBatchStudents();
      fetchBatchStats();
    } catch {
      showToast('Failed to assign section.', 'error');
    } finally {
      setBatchAssigning(false);
    }
  };

  const handleQuickAssignSingle = async (studentId, sectionVal) => {
    try {
      await api.post('/admin/labs/batch-students/assign', {
        student_ids: [studentId],
        section: sectionVal,
      });
      showToast(sectionVal ? `Assigned to ${sectionVal}` : 'Removed from batch', 'success');
      fetchBatchStudents();
      fetchBatchStats();
    } catch {
      showToast('Failed to update student section.', 'error');
    }
  };

  const toggleDrawerStudent = (id) => {
    setDrawerSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllDrawerStudents = () => {
    if (drawerSelectedIds.size === drawerStudents.length && drawerStudents.length > 0) {
      setDrawerSelectedIds(new Set());
    } else {
      setDrawerSelectedIds(new Set(drawerStudents.map((s) => s.id)));
    }
  };

  const handleAddSelectedToBatch = async () => {
    if (drawerSelectedIds.size === 0) {
      showToast('Select students to add.', 'error');
      return;
    }
    const targetSection =
      batchTabSection === 'ALL' || batchTabSection === 'UNASSIGNED' ? targetBatchSection : batchTabSection;
    try {
      setBatchAssigning(true);
      await api.post('/admin/labs/batch-students/assign', {
        student_ids: Array.from(drawerSelectedIds),
        section: targetSection,
      });
      showToast(`${drawerSelectedIds.size} student(s) added to ${targetSection}!`, 'success');
      setDrawerSelectedIds(new Set());
      setShowAddDrawer(false);
      fetchBatchStudents();
      fetchBatchStats();
    } catch {
      showToast('Failed to add students to batch.', 'error');
    } finally {
      setBatchAssigning(false);
    }
  };

  // ─── Course CRUD Handlers ──────────────────────────────────────────────────
  const openCreateCourse = () => {
    setCourseForm(emptyCourse);
    setCourseModal('create');
    setEditingCourse(null);
  };
  const openEditCourse = (c) => {
    setCourseForm({
      ...c,
      regulation: c.regulation || (c.academic_year && !c.academic_year.includes('-') ? c.academic_year : '2022'),
    });
    setCourseModal('edit');
    setEditingCourse(c);
  };
  const closeCourseModal = () => {
    setCourseModal(null);
    setEditingCourse(null);
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    if (!courseForm.course_code?.trim() || !courseForm.title?.trim()) {
      showToast('Course code and title are required.', 'error');
      return;
    }
    try {
      setCourseSubmitting(true);
      if (courseModal === 'edit' && editingCourse?.id) {
        await api.put(`/labs/courses/${editingCourse.id}`, courseForm);
        showToast('Lab course updated successfully!', 'success');
      } else {
        await api.post('/labs/courses', courseForm);
        showToast('Lab course created successfully!', 'success');
      }
      closeCourseModal();
      fetchCourses();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to save course.';
      showToast(msg, 'error');
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Delete this lab course? This will also remove associated experiments and submissions.'))
      return;
    try {
      await api.delete(`/labs/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      showToast('Course deleted successfully.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete course.';
      showToast(msg, 'error');
    }
  };

  // ─── Faculty Lab Mapping Handlers (Auto-maps Semester & Year from Batch) ───
  const openEditMapping = (m) => {
    setEditingMapping(m);
    setMappingForm({
      course_id: m.course_id,
      faculty_id: m.faculty_id,
      batch_name: m.section || '',
    });
  };
  const closeEditMapping = () => {
    setEditingMapping(null);
    setMappingForm(emptyMapping);
  };

  const handleMappingSubmit = async (e) => {
    e.preventDefault();
    if (!mappingForm.course_id || !mappingForm.faculty_id) {
      showToast('Course and Faculty are required.', 'error');
      return;
    }
    const matchedBatch = batches.find((b) => b.name === mappingForm.batch_name);
    const resolvedSemester = matchedBatch ? matchedBatch.semester : 'Semester III';
    const resolvedYear = matchedBatch ? matchedBatch.academic_year : '2025-2026';

    try {
      setMappingSubmitting(true);
      if (editingMapping) {
        await api.delete(`/admin/labs/mappings/${editingMapping.id}`).catch(() => {});
      }
      await api.post('/admin/labs/mappings', {
        course_id: parseInt(mappingForm.course_id),
        faculty_id: parseInt(mappingForm.faculty_id),
        section: mappingForm.batch_name || 'ALL',
        semester: resolvedSemester,
        academic_year: resolvedYear,
      });
      showToast(editingMapping ? 'Mapping updated!' : 'Faculty lab mapping created!', 'success');
      closeEditMapping();
      fetchAdminData();
    } catch {
      showToast('Failed to save mapping.', 'error');
    } finally {
      setMappingSubmitting(false);
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Remove this mapping?')) return;
    try {
      await api.delete(`/admin/labs/mappings/${id}`);
      setMappings((prev) => prev.filter((m) => m.id !== id));
      showToast('Mapping removed.', 'success');
    } catch {
      showToast('Failed to delete mapping.', 'error');
    }
  };

  // ─── Batch Student Lab Mapping for Course/Faculty ──────────────────────────
  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedStudentIds.size === students.length && students.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleStudentBatchMapping = async () => {
    if (selectedStudentIds.size === 0) {
      showToast('Select at least one student.', 'error');
      return;
    }
    if (!studentMappingForm.course_id || !studentMappingForm.faculty_id) {
      showToast('Select course and faculty.', 'error');
      return;
    }
    const chosenBatchName = studentMappingForm.batch_name || (studentFilterSection !== 'ALL' ? studentFilterSection : 'ALL');
    const matchedBatch = batches.find((b) => b.name === chosenBatchName);
    const resolvedSemester = matchedBatch ? matchedBatch.semester : 'Semester III';
    const resolvedYear = matchedBatch ? matchedBatch.academic_year : '2025-2026';

    try {
      setStudentMappingSubmitting(true);
      await api.post('/admin/labs/mappings', {
        course_id: parseInt(studentMappingForm.course_id),
        faculty_id: parseInt(studentMappingForm.faculty_id),
        section: chosenBatchName,
        semester: resolvedSemester,
        academic_year: resolvedYear,
      });
      showToast(`${selectedStudentIds.size} student(s) mapped to lab course!`, 'success');
      setSelectedStudentIds(new Set());
      fetchAdminData();
    } catch {
      showToast('Batch mapping failed.', 'error');
    } finally {
      setStudentMappingSubmitting(false);
    }
  };

  // ─── Derived Options for Dropdowns ─────────────────────────────────────────
  const courseOptions = courses.map((c) => ({
    value: String(c.id),
    label: `${c.course_code} — ${c.title}`,
    badge: c.course_code,
  }));

  const facultyOptions = faculty.map((f) => ({
    value: String(f.id),
    label: f.name || f.username || `Faculty #${f.id}`,
    sublabel: [f.email, f.department, f.roll_no ? `ID: ${f.roll_no}` : null].filter(Boolean).join(' • ') || 'Faculty',
    badge: 'Faculty',
  }));

  // Batch options include its mapped Semester and Year in the sublabel!
  const batchOptions = batches.map((b) => ({
    value: b.name,
    label: b.name,
    sublabel: `${b.semester} • ${b.academic_year}${b.department ? ` • ${b.department}` : ''}`,
    badge: b.name,
  }));

  const semesterOptions = semesters.map((s) => ({ value: s, label: s }));
  const acYearOptions = academicYears.map((y) => ({ value: y, label: y }));

  const TABS = [
    { key: 'courses', label: 'Lab Courses', icon: BookOpen },
    { key: 'config', label: 'Student Batches & Sections', icon: Tag },
    { key: 'mapping', label: 'Faculty Lab Mapping', icon: UsersRound },
  ];

  // Selected batch info helper for mapping form
  const selectedBatchInfo = batches.find((b) => b.name === mappingForm.batch_name);
  const selectedStudentBatchInfo = batches.find((b) => b.name === studentMappingForm.batch_name);

  // Course search state
  const [courseSearch, setCourseSearch] = useState('');

  const filteredCourses = courses.filter((c) => {
    const q = courseSearch.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.course_code?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.semester?.toLowerCase().includes(q) ||
      c.academic_year?.toLowerCase().includes(q)
    );
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
              : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[24px] md:text-[26px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--accent)]" />
            Lab Configuration
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Configure practical laboratory courses, student batches & sections, and faculty lab incharge assignments.
          </p>
        </div>

        {tab === 'courses' && (
          <button
            onClick={openCreateCourse}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Lab Course
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[var(--border)] flex items-center gap-1 overflow-x-auto pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-[13px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              tab === key
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]/30'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'courses' && courses.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                {courses.length}
              </span>
            )}
            {key === 'config' && batches.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                {batches.length} Batches
              </span>
            )}
            {key === 'mapping' && mappings.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                {mappings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* TAB 1: LAB COURSES (Card Grid Pattern)                           */}
      {/* ================================================================ */}
      {tab === 'courses' && (
        <div className="space-y-5">
          {/* Search Bar */}
          <div className="panel-card p-4">
            <div className="relative w-full max-w-md flex items-center">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search lab courses (e.g. 22AI304, Data Structures, Python)..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
              />
              {courseSearch && (
                <button
                  type="button"
                  onClick={() => setCourseSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {coursesLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm">Loading lab courses...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <FlaskConical className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {courseSearch ? 'No lab courses matching your search.' : 'No practical lab courses configured yet.'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                {courseSearch
                  ? 'Try modifying your search keywords or clear the filter.'
                  : 'Get started by creating your first academic lab course with code, curriculum, and experiments.'}
              </p>
              {!courseSearch && (
                <button
                  onClick={openCreateCourse}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Lab Course
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((c) => {
                const mappedFaculty = mappings.filter((m) => m.course_id === c.id);
                const facultyCount = mappedFaculty.length;
                const totalExperiments = c.total_experiments || 0;

                return (
                  <div
                    key={c.id}
                    className="data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer transition-all"
                    onClick={() => navigate(`/admin/labs/courses/${c.id}/experiments`)}
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Icon + Badges + Action Buttons */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCourse(c);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                            title="Edit Course Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(c.id);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] rounded hover:bg-[var(--red-bg)] transition cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Course Meta Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                          {c.course_code}
                        </span>
                        {c.semester && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                            {c.semester}
                          </span>
                        )}
                        {(c.regulation || c.academic_year) && (
                          <span className="text-[10px] font-mono text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                            {c.regulation ? (c.regulation.toLowerCase().includes('regulation') ? c.regulation : `Regulation ${c.regulation.replace(/^r/i, '')}`) : 'Regulation 2022'}
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

                    {/* Card Footer: Dot Stats + Action Link */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[var(--text-primary)] font-semibold">
                          {totalExperiments} {totalExperiments === 1 ? 'Exp' : 'Exps'}
                        </span>
                        <span>•</span>
                        <span>
                          {facultyCount} {facultyCount === 1 ? 'Faculty' : 'Faculty'}
                        </span>
                      </div>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Configure &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: STUDENT BATCHES & SECTIONS CONFIG + BATCH MAPPING           */}
      {/* ================================================================ */}
      {tab === 'config' && (
        <div className="space-y-6">
          {/* Batches Configuration Card */}
          <div className={sectionCls}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--accent)]" />
                  Student Sections / Batches
                  <span className="text-[11px] font-normal text-[var(--text-muted)] ml-1">
                    (Each batch is mapped with its Semester & Academic Year)
                  </span>
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  Create and edit batches (e.g. CSE-A, CSE-B, AI&DS-A) with pre-configured semester and year so you don't need to specify them repeatedly in mappings.
                </p>
              </div>

              <button
                onClick={openCreateBatch}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Batch
              </button>
            </div>

            {/* Batches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {batches.map((b) => {
                const count = batchStats[b.name] || 0;
                return (
                  <div
                    key={b.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-md)] p-4 space-y-2.5 transition-all shadow-[var(--shadow-xs)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[14px] text-[var(--accent)]">{b.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditBatch(b)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                          title="Edit batch semester & year"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(b.id, b.name)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--red)] transition-colors cursor-pointer"
                          title="Delete batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Semester:</span>
                        <span className="font-medium text-[var(--text-primary)]">{b.semester}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">Academic Year:</span>
                        <span className="font-medium text-[var(--text-primary)]">{b.academic_year}</span>
                      </div>
                      {b.department && (
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-muted)]">Dept:</span>
                          <span className="font-medium text-[var(--text-primary)]">{b.department}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">Enrolled:</span>
                      <span className="font-mono font-bold text-[var(--accent)]">{count} student(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sub-managers: Semesters and Academic Years */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
              <SimpleTagManager
                title="Configured Semesters"
                icon={GraduationCap}
                items={semesters}
                onAdd={addSemester}
                onDelete={delSemester}
                placeholder="e.g. Semester III"
                color="indigo"
              />
              <SimpleTagManager
                title="Configured Academic Years"
                icon={Calendar}
                items={academicYears}
                onAdd={addAcademicYear}
                onDelete={delAcademicYear}
                placeholder="e.g. 2025-2026"
                color="emerald"
              />
            </div>
          </div>

          {/* ── Student Section / Batch Assignment Manager ───────────────── */}
          <div className={sectionCls}>
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--accent)]" />
                  Student Section & Batch Mapper
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  Filter by batch, select students individually or all, and assign them directly to batches.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setShowAddDrawer(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {batchTabSection !== 'ALL' && batchTabSection !== 'UNASSIGNED'
                    ? `Add Students to ${batchTabSection}`
                    : 'Add Students to Batch'}
                </button>
                <button
                  onClick={() => {
                    fetchBatchStudents();
                    fetchBatchStats();
                  }}
                  className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Batch Quick Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">
                Filter Batch:
              </span>
              <button
                onClick={() => {
                  setBatchTabSection('ALL');
                  setBatchPage(1);
                  setBatchSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  batchTabSection === 'ALL'
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span>All Students</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 text-inherit">
                  {batchPagination.total_records || '—'}
                </span>
              </button>

              {batches.map((b) => {
                const count = batchStats[b.name] || 0;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBatchTabSection(b.name);
                      setBatchPage(1);
                      setBatchSelectedIds(new Set());
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      batchTabSection === b.name
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 text-inherit">
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setBatchTabSection('UNASSIGNED');
                  setBatchPage(1);
                  setBatchSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  batchTabSection === 'UNASSIGNED'
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span>Unassigned</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 text-inherit">
                  {batchStats['Unassigned'] || 0}
                </span>
              </button>
            </div>

            {/* Batch Action Bar (Appears when students are selected) */}
            {batchSelectedIds.size > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--accent-dim)] border border-[var(--border-accent)] rounded-[var(--radius-md)] p-3.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
                  <CheckSquare className="w-4 h-4" />
                  <span>{batchSelectedIds.size} student(s) selected</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--text-secondary)] font-medium">Assign to:</span>
                  <select
                    value={targetBatchSection}
                    onChange={(e) => setTargetBatchSection(e.target.value)}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-semibold focus:outline-none"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.semester})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleApplyBatchSection(targetBatchSection)}
                    disabled={batchAssigning}
                    className="px-3 py-1.5 rounded bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {batchAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                    Apply to Selected
                  </button>

                  <button
                    onClick={() => handleApplyBatchSection('')}
                    disabled={batchAssigning}
                    className="px-3 py-1.5 rounded bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-xs font-semibold hover:bg-[var(--red)]/15 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Remove from Batch
                  </button>
                </div>
              </div>
            )}

            {/* Student Search + Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    placeholder="Search students by name, roll number, or email..."
                    className={`${inputCls} pl-9`}
                  />
                </div>
                <button
                  onClick={toggleAllBatchStudents}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0"
                >
                  {batchSelectedIds.size === batchStudents.length && batchStudents.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  {batchSelectedIds.size === batchStudents.length && batchStudents.length > 0
                    ? 'Deselect All'
                    : 'Select All on Page'}
                </button>
              </div>

              {batchStudentsLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                  <span className="text-xs">Loading batch students...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                        <th className="py-2.5 px-3 w-9"></th>
                        <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Roll No
                        </th>
                        <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Department
                        </th>
                        <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Current Batch
                        </th>
                        <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Quick Reassign
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {batchStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-[var(--text-muted)] text-xs">
                            No students found for this batch filter.
                          </td>
                        </tr>
                      ) : (
                        batchStudents.map((s) => {
                          const isSelected = batchSelectedIds.has(s.id);
                          const matchedBatch = batches.find((b) => b.name === s.section);
                          return (
                            <tr
                              key={s.id}
                              className={`transition-colors hover:bg-[var(--bg-raised)] ${
                                isSelected ? 'bg-[var(--accent-dim)]/50' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3" onClick={() => toggleBatchStudent(s.id)}>
                                <button className="cursor-pointer flex items-center justify-center">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[var(--text-muted)]" />
                                  )}
                                </button>
                              </td>
                              <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                                <div>{s.name}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{s.email}</div>
                              </td>
                              <td className="py-2.5 pr-4 font-mono font-medium text-[var(--text-secondary)]">
                                {s.roll_no || '—'}
                              </td>
                              <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{s.department || '—'}</td>
                              <td className="py-2.5 pr-4">
                                {s.section ? (
                                  <div className="inline-flex flex-col">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] w-fit">
                                      {s.section}
                                    </span>
                                    {matchedBatch && (
                                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                        {matchedBatch.semester} · {matchedBatch.academic_year}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)] italic">
                                    Unassigned
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <select
                                    value={s.section || ''}
                                    onChange={(e) => handleQuickAssignSingle(s.id, e.target.value)}
                                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text-primary)] font-medium focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Unassigned</option>
                                    {batches.map((b) => (
                                      <option key={b.id} value={b.name}>
                                        {b.name}
                                      </option>
                                    ))}
                                  </select>
                                  {s.section && (
                                    <button
                                      onClick={() => handleQuickAssignSingle(s.id, '')}
                                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--red)] transition-colors cursor-pointer"
                                      title="Remove from batch"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Batch Pagination */}
              {batchPagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {batchPagination.total_records} students · Page {batchPage} of {batchPagination.total_pages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={!batchPagination.has_prev}
                      onClick={() => setBatchPage((p) => p - 1)}
                      className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: Math.min(batchPagination.total_pages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setBatchPage(p)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            batchPage === p
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      disabled={!batchPagination.has_next}
                      onClick={() => setBatchPage((p) => p + 1)}
                      className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: FACULTY LAB MAPPING (SEMESTER & YEAR AUTO FROM BATCH)      */}
      {/* ================================================================ */}
      {tab === 'mapping' && (
        <div className="space-y-6">
          {/* Mapping Header & Form */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Create / Edit Mapping Form */}
            <div className={`${sectionCls} xl:col-span-1`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[var(--accent)]" />
                  {editingMapping ? 'Edit Faculty Mapping' : 'New Faculty Lab Mapping'}
                </h2>
                {editingMapping && (
                  <button
                    onClick={closeEditMapping}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleMappingSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Lab Course <span className="text-[var(--red)]">*</span>
                  </label>
                  <SearchableSelect
                    options={courseOptions}
                    value={String(mappingForm.course_id)}
                    onChange={(v) => setMappingForm((p) => ({ ...p, course_id: v }))}
                    placeholder="Select lab course..."
                    searchPlaceholder="Search course code or name..."
                    fullWidth
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Faculty (Lab Incharge) <span className="text-[var(--red)]">*</span>
                  </label>
                  <SearchableSelect
                    options={facultyOptions}
                    value={String(mappingForm.faculty_id)}
                    onChange={(v) => setMappingForm((p) => ({ ...p, faculty_id: v }))}
                    placeholder="Select faculty..."
                    searchPlaceholder="Search faculty name, email, dept..."
                    fullWidth
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}>Student Section / Batch</label>
                  <SearchableSelect
                    options={[{ value: 'ALL', label: 'ALL (Entire Class)' }, ...batchOptions]}
                    value={mappingForm.batch_name}
                    onChange={(v) => setMappingForm((p) => ({ ...p, batch_name: v }))}
                    placeholder="Select batch (e.g. CSE-A)..."
                    fullWidth
                    clearable
                  />
                </div>

                {/* Batch Inherited Semester & Academic Year Display */}
                {selectedBatchInfo ? (
                  <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--accent-dim)]/50 border border-[var(--border-accent)] space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--accent)]">
                      <Info className="w-3.5 h-3.5" />
                      <span>Batch Config Linked</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Semester: <strong className="text-[var(--text-primary)]">{selectedBatchInfo.semester}</strong> · Year:{' '}
                      <strong className="text-[var(--text-primary)]">{selectedBatchInfo.academic_year}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Semester and academic year are automatically inherited from the selected batch.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={mappingSubmitting}
                  className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-[var(--shadow-sm)]"
                >
                  {mappingSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {editingMapping ? 'Update Mapping' : 'Create Faculty Mapping'}
                </button>
              </form>
            </div>

            {/* Active Mappings Table */}
            <div className={`${sectionCls} xl:col-span-2`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                  Active Faculty Lab Mappings
                  <span className="text-[11px] font-mono text-[var(--text-muted)] ml-1">
                    ({mappings.length})
                  </span>
                </h2>
                <button
                  onClick={fetchAdminData}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  title="Refresh mappings"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {mappingsLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span className="text-xs">Loading mappings...</span>
                </div>
              ) : mappings.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-muted)] text-xs">
                  No faculty lab mappings created yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mappings.map((m) => (
                    <div
                      key={m.id}
                      className="data-card p-4 flex flex-col justify-between space-y-3 transition-all hover:border-[var(--border-accent)]"
                    >
                      <div className="space-y-2.5">
                        {/* Header: Badges & Action Buttons */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                              {m.course?.course_code || 'LAB'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)]">
                              Batch: {m.section || 'ALL'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditMapping(m)}
                              className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-all"
                              title="Edit mapping"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMapping(m.id)}
                              className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] hover:bg-[var(--red)]/15 cursor-pointer transition-all"
                              title="Remove mapping"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Course Title */}
                        <div>
                          <h4 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">
                            {m.course?.title || 'Course Title'}
                          </h4>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {m.semester} · {m.academic_year}
                          </div>
                        </div>

                        {/* Faculty Info */}
                        <div className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                          <div className="w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold text-[10px] shrink-0">
                            {m.faculty?.name?.charAt(0) || 'F'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                              {m.faculty?.name || 'Faculty Incharge'}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {m.faculty?.email || 'Faculty'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Link */}
                      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-muted)] font-mono">
                          {m.course?.total_experiments || 7} Experiments
                        </span>
                        {m.course?.id && (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/labs/courses/${m.course.id}/experiments`)}
                            className="text-[var(--accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            Configure Exps &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Batch Student Lab Mapper ────────────────────────────────── */}
          <div className={sectionCls}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-[var(--accent)]" />
                  Batch Student Lab Course Mapper
                  {selectedStudentIds.size > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                      {selectedStudentIds.size} selected
                    </span>
                  )}
                </h2>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Map selected students directly to a lab course and incharge faculty.
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label className={labelCls}>Lab Course</label>
                <SearchableSelect
                  options={courseOptions}
                  value={String(studentMappingForm.course_id)}
                  onChange={(v) => setStudentMappingForm((p) => ({ ...p, course_id: v }))}
                  placeholder="Select course..."
                  searchPlaceholder="Search course..."
                  fullWidth
                  clearable
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Faculty (Incharge)</label>
                <SearchableSelect
                  options={facultyOptions}
                  value={String(studentMappingForm.faculty_id)}
                  onChange={(v) => setStudentMappingForm((p) => ({ ...p, faculty_id: v }))}
                  placeholder="Select faculty..."
                  searchPlaceholder="Search faculty..."
                  fullWidth
                  clearable
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Batch / Section</label>
                <SearchableSelect
                  options={[{ value: 'ALL', label: 'ALL' }, ...batchOptions]}
                  value={studentMappingForm.batch_name}
                  onChange={(v) => setStudentMappingForm((p) => ({ ...p, batch_name: v }))}
                  placeholder="Select batch..."
                  fullWidth
                  clearable
                />
              </div>
            </div>

            {selectedStudentIds.size > 0 && (
              <button
                onClick={handleStudentBatchMapping}
                disabled={studentMappingSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-[var(--shadow-sm)]"
              >
                {studentMappingSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                Assign {selectedStudentIds.size} Selected Student
                {selectedStudentIds.size > 1 ? 's' : ''} to Course
              </button>
            )}

            {/* Student Table with Search + Batch Filter */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search students by name, roll number, email..."
                    className={`${inputCls} pl-9`}
                  />
                </div>

                <div className="w-52 shrink-0">
                  <SearchableSelect
                    options={[{ value: 'ALL', label: 'All Batches' }, ...batchOptions]}
                    value={studentFilterSection}
                    onChange={(v) => {
                      setStudentFilterSection(v);
                      setStudentPage(1);
                    }}
                    placeholder="Filter by batch..."
                    fullWidth
                  />
                </div>

                <button
                  onClick={toggleAll}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0"
                >
                  {selectedStudentIds.size === students.length && students.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  {selectedStudentIds.size === students.length && students.length > 0
                    ? 'Deselect All'
                    : 'Select All on Page'}
                </button>
              </div>

              {studentsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span className="text-xs">Loading students...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                        <th className="py-2.5 px-3 w-9"></th>
                        <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Roll No
                        </th>
                        <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Department
                        </th>
                        <th className="py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Section / Batch
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[var(--text-muted)] text-xs">
                            No students found.
                          </td>
                        </tr>
                      ) : (
                        students.map((s) => {
                          const isSelected = selectedStudentIds.has(s.id);
                          return (
                            <tr
                              key={s.id}
                              onClick={() => toggleStudent(s.id)}
                              className={`cursor-pointer transition-colors hover:bg-[var(--bg-raised)] ${
                                isSelected ? 'bg-[var(--accent-dim)]/50' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                                ) : (
                                  <Square className="w-4 h-4 text-[var(--text-muted)]" />
                                )}
                              </td>
                              <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                                <div>{s.name}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{s.email}</div>
                              </td>
                              <td className="py-2.5 pr-4 font-mono text-[var(--text-secondary)]">
                                {s.roll_no || '—'}
                              </td>
                              <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{s.department || '—'}</td>
                              <td className="py-2.5">
                                {s.section ? (
                                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                                    {s.section}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[var(--text-muted)] italic">Unassigned</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {studentPagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {studentPagination.total_records} students · Page {studentPage} of {studentPagination.total_pages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={!studentPagination.has_prev}
                      onClick={() => setStudentPage((p) => p - 1)}
                      className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: Math.min(studentPagination.total_pages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setStudentPage(p)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            studentPage === p
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      disabled={!studentPagination.has_next}
                      onClick={() => setStudentPage((p) => p + 1)}
                      className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Create / Edit Batch with Semester & Academic Year         */}
      {/* ================================================================ */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                {batchModal === 'edit' ? `Edit Batch: ${editingBatch?.name}` : 'Add New Student Batch'}
              </h3>
              <button
                onClick={() => setBatchModal(null)}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Batch / Section Name <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  value={batchForm.name}
                  onChange={(e) => setBatchForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. CSE-A, AI&DS-B"
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  Semester <span className="text-[var(--red)]">*</span>
                </label>
                <SearchableSelect
                  options={semesterOptions}
                  value={batchForm.semester}
                  onChange={(v) => setBatchForm((p) => ({ ...p, semester: v }))}
                  placeholder="Select semester..."
                  fullWidth
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  Academic Year <span className="text-[var(--red)]">*</span>
                </label>
                <SearchableSelect
                  options={acYearOptions}
                  value={batchForm.academic_year}
                  onChange={(v) => setBatchForm((p) => ({ ...p, academic_year: v }))}
                  placeholder="Select academic year..."
                  fullWidth
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Department (Optional)</label>
                <input
                  value={batchForm.department}
                  onChange={(e) => setBatchForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="e.g. Computer Science and Engineering"
                  className={inputCls}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {batchModal === 'edit' ? 'Update Batch' : 'Create Batch'}
                </button>
                <button
                  type="button"
                  onClick={() => setBatchModal(null)}
                  className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Add Students to Batch (Drawer / Dialog)                   */}
      {/* ================================================================ */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[var(--accent)]" />
                  Add Students to Batch {batchTabSection !== 'ALL' && batchTabSection !== 'UNASSIGNED' ? `(${batchTabSection})` : ''}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Select students from the list below to assign them into the batch.
                </p>
              </div>
              <button
                onClick={() => setShowAddDrawer(false)}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {(batchTabSection === 'ALL' || batchTabSection === 'UNASSIGNED') && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Target Batch / Section to Assign</label>
                  <select
                    value={targetBatchSection}
                    onChange={(e) => setTargetBatchSection(e.target.value)}
                    className={inputCls}
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} ({b.semester})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search + Select All */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Search by student name, roll number, or department..."
                    className={`${inputCls} pl-9 text-xs`}
                  />
                </div>
                <button
                  onClick={toggleAllDrawerStudents}
                  className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all"
                >
                  {drawerSelectedIds.size === drawerStudents.length && drawerStudents.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {/* Student Drawer List */}
              {drawerLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span className="text-xs">Loading students...</span>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] divide-y divide-[var(--border)]">
                  {drawerStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">No students found.</div>
                  ) : (
                    drawerStudents.map((s) => {
                      const isSel = drawerSelectedIds.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleDrawerStudent(s.id)}
                          className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors hover:bg-[var(--bg-raised)] ${
                            isSel ? 'bg-[var(--accent-dim)]/60' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isSel ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                            <div>
                              <div className="font-semibold text-[var(--text-primary)]">{s.name}</div>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                                {s.roll_no || 'No Roll No'} · {s.email}
                              </div>
                            </div>
                          </div>
                          <div>
                            {s.section ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                                Currently: {s.section}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)] italic">Unassigned</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Drawer Pagination */}
              {drawerPagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Page {drawerPage} of {drawerPagination.total_pages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={drawerPage <= 1}
                      onClick={() => setDrawerPage((p) => p - 1)}
                      className="p-1 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={drawerPage >= drawerPagination.total_pages}
                      onClick={() => setDrawerPage((p) => p + 1)}
                      className="p-1 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-raised)] rounded-b-[var(--radius-xl)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {drawerSelectedIds.size} student(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddDrawer(false)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedToBatch}
                  disabled={drawerSelectedIds.size === 0 || batchAssigning}
                  className="px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {batchAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Assign to{' '}
                  {batchTabSection !== 'ALL' && batchTabSection !== 'UNASSIGNED'
                    ? batchTabSection
                    : targetBatchSection}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Create / Edit Lab Course                                   */}
      {/* ================================================================ */}
      {courseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[var(--accent)]" />
                {courseModal === 'edit' ? 'Edit Lab Course' : 'Add New Lab Course'}
              </h3>
              <button
                onClick={closeCourseModal}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Course Code <span className="text-[var(--red)]">*</span>
                  </label>
                  <input
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm((p) => ({ ...p, course_code: e.target.value }))}
                    placeholder="e.g. 22AI304"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Degree</label>
                  <input
                    value={courseForm.degree}
                    onChange={(e) => setCourseForm((p) => ({ ...p, degree: e.target.value }))}
                    placeholder="B.Tech"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  Course Title <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Principles of Programming Laboratory"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Department</label>
                <input
                  value={courseForm.department}
                  onChange={(e) => setCourseForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="Artificial Intelligence and Data Science"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Semester</label>
                  <SearchableSelect
                    options={semesterOptions}
                    value={courseForm.semester}
                    onChange={(v) => setCourseForm((p) => ({ ...p, semester: v }))}
                    placeholder="Select semester..."
                    fullWidth
                    clearable
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Regulation</label>
                  <SearchableSelect
                    options={[
                      { value: '2022', label: '2022' },
                      { value: '2026', label: '2026' },
                      { value: '2018', label: '2018' },
                    ]}
                    value={courseForm.regulation || '2022'}
                    onChange={(v) => setCourseForm((p) => ({ ...p, regulation: v }))}
                    placeholder="Select regulation (e.g. 2022, 2026)..."
                    fullWidth
                    clearable
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Total Experiments</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={courseForm.total_experiments}
                    onChange={(e) =>
                      setCourseForm((p) => ({
                        ...p,
                        total_experiments: parseInt(e.target.value) || 7,
                      }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the lab course..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={courseSubmitting}
                  className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {courseSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {courseModal === 'edit' ? 'Save Changes' : 'Create Course'}
                </button>
                <button
                  type="button"
                  onClick={closeCourseModal}
                  className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all"
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

