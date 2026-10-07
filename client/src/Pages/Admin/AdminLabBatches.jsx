import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeft,
  X,
  Save,
  GraduationCap,
  Calendar,
  Layers,
  UserPlus,
  UserCheck,
  CheckSquare,
  Square,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Eye,
  HelpCircle,
  Check
} from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from '../../Components/SearchableSelect';
import ConfirmModal from '../../Components/ConfirmModal';

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';
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

const DEPT_PRESETS = [
  'Computer Science and Engineering',
  'Artificial Intelligence and Data Science',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical and Electronics Engineering',
];

export default function AdminLabBatches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Active Tab state: 'batches' | 'roster'
  const [activeTab, setActiveTab] = useState('batches');

  // Dynamic Departments from Master
  const [dynamicDepartments, setDynamicDepartments] = useState([]);

  const deptOptions = useMemo(() => {
    return dynamicDepartments.map((d) => ({
      value: d.name,
      label: d.name,
      badge: d.code || undefined,
      sublabel: `${d.student_count || 0} students · ${d.faculty_count || 0} faculty`,
    }));
  }, [dynamicDepartments]);

  const drawerDeptOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Departments' },
      ...dynamicDepartments.map((d) => ({
        value: d.name,
        label: d.name,
        badge: d.code || undefined,
        sublabel: `${d.student_count || 0} students`,
      })),
    ];
  }, [dynamicDepartments]);

  // Persistence helpers
  const loadStored = (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  };
  const saveStored = (key, val) => localStorage.setItem(key, JSON.stringify(val));

  // Batches state
  const defaultBatches = [
    { id: '1', name: 'CSE-A', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
    { id: '2', name: 'CSE-B', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
    { id: '3', name: 'AI&DS-A', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
    { id: '4', name: 'AI&DS-B', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
  ];

  const [batches, setBatches] = useState(() => {
    const raw = loadStored('lab_batches_v2', null);
    if (raw && Array.isArray(raw)) return raw;
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

  // Batch Stats
  const [batchStats, setBatchStats] = useState({});
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // Batch Modal
  const [batchModal, setBatchModal] = useState(null); // null | 'create' | 'edit'
  const [editingBatch, setEditingBatch] = useState(null);
  const emptyBatch = {
    name: '',
    semester: 'Semester III',
    academic_year: '2025-2026',
    department: 'CSE',
  };
  const [batchForm, setBatchForm] = useState(emptyBatch);

  // Student list state
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total_pages: 1,
    total_records: 0,
    has_next: false,
    has_prev: false,
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [targetSection, setTargetSection] = useState(() => batches[0]?.name || 'CSE-A');
  const [assigning, setAssigning] = useState(false);

  // Add Students Drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [drawerStudents, setDrawerStudents] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerDept, setDrawerDept] = useState('ALL');
  const [drawerPage, setDrawerPage] = useState(1);
  const [drawerPagination, setDrawerPagination] = useState({ total_pages: 1, total_records: 0 });
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSelectedIds, setDrawerSelectedIds] = useState(new Set());

  // Bulk Upload State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState('file'); // 'file' | 'text'
  const [bulkTargetBatchMode, setBulkTargetBatchMode] = useState('selected'); // 'selected' | 'from_csv'
  const [bulkTargetBatch, setBulkTargetBatch] = useState(() => batches[0]?.name || 'CSE-A');
  const [bulkImportMode, setBulkImportMode] = useState('upsert'); // 'upsert' | 'create_only' | 'update_only'
  const [bulkDefaultDept, setBulkDefaultDept] = useState('CSE');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('mockmate-bitsathy-4321');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkParseError, setBulkParseError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const fileInputRef = useRef(null);

  const STUDENT_LIMIT = 15;

  const fetchBatchStats = useCallback(async () => {
    try {
      const params = {};
      if (filterDept && filterDept !== 'ALL') {
        params.department = filterDept;
      }
      const res = await api.get('/admin/labs/batch-students/stats', { params });
      if (Array.isArray(res?.stats)) {
        const statsMap = {};
        let total = 0;
        res.stats.forEach((s) => {
          statsMap[s.section] = s.count;
          total += s.count;
        });
        setBatchStats(statsMap);
        setTotalStudentsCount(res?.total_students !== undefined ? res.total_students : total);
      }
    } catch {
      // silently catch
    }
  }, [filterDept]);

  const fetchDynamicDepartments = async () => {
    try {
      const res = await api.get('/admin/data-management/departments');
      if (res && res.data) {
        setDynamicDepartments(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Fallback
    }
  };

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const params = {
        page,
        limit: STUDENT_LIMIT,
        search: search.trim() || undefined,
        role: 'student',
      };
      if (filterSection === 'UNASSIGNED') {
        params.section = 'unassigned';
      } else if (filterSection !== 'ALL') {
        params.section = filterSection;
      }
      if (filterDept && filterDept !== 'ALL') {
        params.department = filterDept;
      }
      const res = await api.get('/admin/users', { params });
      setStudents(Array.isArray(res.data) ? res.data : []);
      if (res.pagination) setPagination(res.pagination);
    } catch {
      // silently catch
    } finally {
      setStudentsLoading(false);
    }
  }, [page, search, filterSection, filterDept]);

  const fetchDrawerStudents = useCallback(async () => {
    try {
      setDrawerLoading(true);
      const params = {
        page: drawerPage,
        limit: 12,
        search: drawerSearch.trim() || undefined,
        role: 'student',
      };
      if (drawerDept !== 'ALL') {
        params.department = drawerDept;
      }
      const res = await api.get('/admin/users', { params });
      setDrawerStudents(Array.isArray(res.data) ? res.data : []);
      if (res.pagination) setDrawerPagination(res.pagination);
    } catch {
      // silently catch
    } finally {
      setDrawerLoading(false);
    }
  }, [drawerPage, drawerSearch, drawerDept]);

  useEffect(() => {
    fetchBatchStats();
  }, [fetchBatchStats]);

  useEffect(() => {
    fetchDynamicDepartments();

    // Check URL params for pre-loaded department or action
    const deptParam = searchParams.get('dept');
    const createParam = searchParams.get('create');
    const tabParam = searchParams.get('tab');

    if (tabParam === 'roster' || tabParam === 'allocation') {
      setActiveTab('roster');
    }
    if (deptParam) {
      setFilterDept(deptParam);
      setBatchForm((prev) => ({
        ...prev,
        department: deptParam,
        name: `${deptParam.slice(0, 4).toUpperCase()}-A`,
      }));
      setDrawerDept(deptParam);
      setActiveTab('roster');
    }
    if (createParam === 'true') {
      setBatchModal('create');
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (showAddDrawer) {
      fetchDrawerStudents();
    }
  }, [showAddDrawer, fetchDrawerStudents]);

  // Debounce search in table
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Debounce search in drawer
  useEffect(() => {
    if (!showAddDrawer) return;
    const t = setTimeout(() => {
      setDrawerPage(1);
      fetchDrawerStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [drawerSearch]);

  // Batch creation & modification
  const openCreateBatch = () => {
    setBatchForm({
      name: '',
      semester: 'Semester III',
      academic_year: '2025-2026',
      department: 'CSE',
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
      showToast(`Batch "${cleanName}" created successfully!`);
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
      showToast(`Batch "${cleanName}" updated successfully!`);
    }
    setBatchModal(null);
    setEditingBatch(null);
  };

  const [deletingBatch, setDeletingBatch] = useState(null);

  const executeDeleteBatch = () => {
    if (!deletingBatch) return;
    const { id, name } = deletingBatch;
    setDeletingBatch(null);
    const filtered = batches.filter((b) => b.id !== id);
    saveBatches(filtered);
    showToast(`Batch "${name}" deleted.`);
  };

  // Student selection & assignment
  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllStudents = () => {
    if (selectedIds.size === students.length && students.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleApplySection = async (sectionToAssign) => {
    if (selectedIds.size === 0) {
      showToast('Select at least one student.', 'error');
      return;
    }
    try {
      setAssigning(true);
      await api.post('/admin/labs/batch-students/assign', {
        student_ids: Array.from(selectedIds),
        section: sectionToAssign,
      });
      showToast(
        sectionToAssign
          ? `${selectedIds.size} student(s) allocated to ${sectionToAssign}!`
          : `${selectedIds.size} student(s) unassigned!`,
        'success'
      );
      setSelectedIds(new Set());
      fetchStudents();
      fetchBatchStats();
    } catch {
      showToast('Failed to assign section.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleQuickAssignSingle = async (studentId, sectionVal) => {
    try {
      await api.post('/admin/labs/batch-students/assign', {
        student_ids: [studentId],
        section: sectionVal,
      });
      showToast(sectionVal ? `Allocated to ${sectionVal}` : 'Unassigned from batch');
      fetchStudents();
      fetchBatchStats();
    } catch {
      showToast('Failed to update student section.', 'error');
    }
  };

  // Drawer handlers
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
    const target =
      filterSection === 'ALL' || filterSection === 'UNASSIGNED' ? targetSection : filterSection;
    try {
      setAssigning(true);
      await api.post('/admin/labs/batch-students/assign', {
        student_ids: Array.from(drawerSelectedIds),
        section: target,
      });
      showToast(`${drawerSelectedIds.size} student(s) added to batch "${target}"!`);
      setShowAddDrawer(false);
      setDrawerSelectedIds(new Set());
      fetchStudents();
      fetchBatchStats();
    } catch {
      showToast('Failed to add students to batch.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Bulk upload handlers
  const openBulkUploadModal = () => {
    setBulkFile(null);
    setBulkRawText('');
    setBulkPreview([]);
    setBulkParseError('');
    setBulkResult(null);
    setBulkImportMode('upsert');
    setBulkTargetBatch(batches[0]?.name || 'CSE-A');
    setShowBulkModal(true);
  };

  const parseCSVText = (
    text,
    targetMode = bulkTargetBatchMode,
    chosenBatch = bulkTargetBatch
  ) => {
    setBulkParseError('');
    if (!text || !text.trim()) {
      setBulkPreview([]);
      return;
    }

    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setBulkPreview([]);
      return;
    }

    const splitLine = (line) => {
      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
      return line
        .split(delimiter)
        .map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
    };

    const firstRow = splitLine(lines[0]);
    const isHeader = firstRow.some((col) => {
      const c = col.toLowerCase();
      return (
        c.includes('name') ||
        c.includes('email') ||
        c.includes('roll') ||
        c.includes('reg') ||
        c.includes('dept') ||
        c.includes('sec') ||
        c.includes('batch')
      );
    });

    let colIdx = { name: 0, email: 1, roll_no: 2, department: 3, section: 4 };

    if (isHeader) {
      firstRow.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('name')) colIdx.name = idx;
        else if (lower.includes('mail')) colIdx.email = idx;
        else if (lower.includes('roll') || lower.includes('reg')) colIdx.roll_no = idx;
        else if (lower.includes('dept')) colIdx.department = idx;
        else if (lower.includes('sec') || lower.includes('batch') || lower.includes('cohort')) colIdx.section = idx;
      });
    }

    const dataRows = isHeader ? lines.slice(1) : lines;
    const rows = [];
    const seenEmails = new Set();

    for (let i = 0; i < dataRows.length; i++) {
      const cells = splitLine(dataRows[i]);
      if (cells.length === 0 || cells.every((c) => !c)) continue;

      const name = cells[colIdx.name] || '';
      const email = (cells[colIdx.email] || '').toLowerCase().trim();
      const roll_no = cells[colIdx.roll_no] || '';
      const department = cells[colIdx.department] || bulkDefaultDept || 'CSE';
      const parsedSection = cells[colIdx.section] || '';
      const resolvedSection = targetMode === 'selected' ? chosenBatch : (parsedSection || chosenBatch);

      let status = 'valid';
      let message = 'Ready to provision & assign';

      if (!email) {
        status = 'error';
        message = 'Missing email address';
      } else if (!email.includes('@') || !email.includes('.')) {
        status = 'error';
        message = 'Invalid email syntax';
      } else if (seenEmails.has(email)) {
        status = 'error';
        message = 'Duplicate email within file';
      } else {
        seenEmails.add(email);
      }

      rows.push({
        id: i + 1,
        name: name.trim() || (email ? email.split('@')[0].replace(/\./g, ' ') : `Student ${i + 1}`),
        email,
        roll_no: roll_no.trim(),
        department: department.trim(),
        section: resolvedSection.trim(),
        role: 'student',
        status,
        message,
      });
    }

    setBulkPreview(rows);
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setBulkRawText(text);
      parseCSVText(text, bulkTargetBatchMode, bulkTargetBatch);
    };
    reader.readAsText(file);
  };

  const handleRawTextChange = (text) => {
    setBulkRawText(text);
    parseCSVText(text, bulkTargetBatchMode, bulkTargetBatch);
  };

  const handleBatchModeChange = (mode, batchName) => {
    setBulkTargetBatchMode(mode);
    setBulkTargetBatch(batchName);
    if (bulkRawText) {
      parseCSVText(bulkRawText, mode, batchName);
    }
  };

  const downloadSampleCSV = () => {
    const defaultBatchName = batches[0]?.name || 'CSE-A';
    const csvContent =
      'Name,Email,Roll No,Department,Section\n' +
      `Rahul K,rahul.22cs@bitsathy.ac.in,7376221CS101,CSE,${defaultBatchName}\n` +
      `Priya S,priya.22cs@bitsathy.ac.in,7376221CS102,CSE,${defaultBatchName}\n` +
      `Arun M,arun.22ai@bitsathy.ac.in,7376221AD101,AI&DS,${batches[1]?.name || 'CSE-B'}\n` +
      `Kavitha R,kavitha.22ai@bitsathy.ac.in,7376221AD102,AI&DS,${batches[1]?.name || 'CSE-B'}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_batch_roster_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteBulkUpload = async () => {
    const eligibleRows = bulkPreview.filter((r) => r.status === 'valid');
    if (eligibleRows.length === 0) {
      showToast('No valid student rows to upload. Please review errors.', 'error');
      return;
    }

    setBulkLoading(true);
    try {
      const userItems = eligibleRows.map((r) => ({
        name: r.name,
        email: r.email,
        roll_no: r.roll_no,
        department: r.department,
        section: r.section,
        role: 'student',
      }));

      const CHUNK_SIZE = 500;
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let allSkippedDetails = [];

      for (let i = 0; i < userItems.length; i += CHUNK_SIZE) {
        const batchChunk = userItems.slice(i, i + CHUNK_SIZE);
        const payload = {
          users: batchChunk,
          default_password: bulkDefaultPassword || 'mockmate-bitsathy-4321',
          mode: bulkImportMode,
        };

        const res = await api.post('/admin/users/bulk', payload, { timeout: 180000 });
        if (res) {
          totalCreated += res.created_count || 0;
          totalUpdated += res.updated_count || 0;
          totalSkipped += res.skipped_count || 0;
          if (res.skipped_details?.length) {
            allSkippedDetails = [...allSkippedDetails, ...res.skipped_details];
          }
        }
      }

      setBulkResult({
        status: 'success',
        created_count: totalCreated,
        updated_count: totalUpdated,
        skipped_count: totalSkipped,
        skipped_details: allSkippedDetails,
      });

      showToast(`Bulk upload complete: ${totalCreated} created, ${totalUpdated} updated!`);
      fetchStudents();
      fetchBatchStats();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to complete bulk upload.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const totalAssignedStudents = Object.values(batchStats).reduce((a, b) => a + b, 0);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/labs/config')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back to Config
          </button>
          <div>
            <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[var(--accent)]" />
              Student Batches & Sections
            </h1>
            <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
              Configure student cohorts with pre-linked semester and academic year, and manage allocations seamlessly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={openBulkUploadModal}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <Upload className="w-4 h-4 text-[var(--accent)]" />
            Bulk Upload Roster
          </button>
          <button
            onClick={openCreateBatch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
          >
            <Plus className="w-4 h-4" />
            Create New Batch
          </button>
        </div>
      </div>

      {/* Page Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all -mb-[1px] ${
            activeTab === 'batches'
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]/40 rounded-t-[var(--radius-sm)] shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Configured Batches &amp; Cohorts</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2.5 text-xs sm:text-[13px] font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all -mb-[1px] ${
            activeTab === 'roster'
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]/40 rounded-t-[var(--radius-sm)] shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Student Batch Allocation Roster</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
            {totalStudentsCount || '—'}
          </span>
        </button>
      </div>

      {/* TAB 1: Configured Batches & Cohorts */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--accent)]" />
                Configured Batches &amp; Cohorts
                <span className="text-[11px] font-mono text-[var(--text-muted)] ml-1">
                  ({batches.length} Batches · {totalAssignedStudents} Students Allocated)
                </span>
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Click any batch card to inspect and allocate students in the roster.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openCreateBatch}
                className="px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Batch
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {batches.map((b) => {
              const count = batchStats[b.name] || 0;
              const isFiltering = filterSection === b.name;

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setFilterSection(b.name);
                    setPage(1);
                    setActiveTab('roster');
                  }}
                  className={`group relative bg-[var(--bg-card)] border rounded-[var(--radius-md)] p-4 space-y-3 transition-all cursor-pointer hover:shadow-sm ${
                    isFiltering
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20 shadow-sm'
                      : 'border-[var(--border)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-[16px] text-[var(--accent)] group-hover:underline">
                        {b.name}
                      </span>
                      {b.department && (
                        <span className="block text-[10px] text-[var(--text-muted)] font-medium">
                          {b.department}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditBatch(b)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                        title="Edit batch semester & year"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingBatch({ id: b.id, name: b.name })}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--red)] transition-colors cursor-pointer"
                        title="Delete batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Linked Semester & Academic Year Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                      <GraduationCap className="w-3 h-3 text-[var(--accent)]" />
                      {b.semester}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                      <Calendar className="w-3 h-3 text-[var(--accent)]" />
                      {b.academic_year}
                    </span>
                  </div>

                  {/* Footer Count & Filter Action */}
                  <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Enrolled:</span>
                    <span className="font-mono font-bold text-[var(--accent)]">
                      {count} student{count === 1 ? '' : 's'} &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Student Allocation Workspace */}
      {activeTab === 'roster' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-xs)]">
        {/* Workspace Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[var(--accent)]" />
              Student Batch Allocation Roster
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Filter by batch, select students, and assign them directly to batches.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={openBulkUploadModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {filterSection !== 'ALL' && filterSection !== 'UNASSIGNED'
                ? `Add Students to ${filterSection}`
                : 'Add Students to Batch'}
            </button>
            <button
              onClick={() => {
                fetchStudents();
                fetchBatchStats();
              }}
              className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Refresh roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${studentsLoading ? 'animate-spin text-[var(--accent)]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">
            Filter View:
          </span>
          <button
            onClick={() => {
              setFilterSection('ALL');
              setPage(1);
              setSelectedIds(new Set());
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              filterSection === 'ALL'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span>All Students</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/20 text-inherit">
              {totalStudentsCount || 0}
            </span>
          </button>

          {batches.map((b) => {
            const count = batchStats[b.name] || 0;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setFilterSection(b.name);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterSection === b.name
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
              setFilterSection('UNASSIGNED');
              setPage(1);
              setSelectedIds(new Set());
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              filterSection === 'UNASSIGNED'
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

        {/* Selected Action Floating Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--accent-dim)] border border-[var(--border-accent)] rounded-[var(--radius-md)] p-3.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)]">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedIds.size} student(s) selected</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Assign to:</span>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-semibold focus:outline-none cursor-pointer"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.semester})
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleApplySection(targetSection)}
                disabled={assigning}
                className="px-3.5 py-1.5 rounded bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                Allocate to Selected
              </button>

              <button
                onClick={() => handleApplySection('')}
                disabled={assigning}
                className="px-3 py-1.5 rounded bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-xs font-semibold hover:bg-[var(--red)]/15 transition-all cursor-pointer disabled:opacity-50"
              >
                Remove from Batch
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Search Bar + Department Filter + Select All */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students by name, roll number, or email..."
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="w-full sm:w-72 shrink-0">
            <SearchableSelect
              options={drawerDeptOptions}
              value={filterDept}
              onChange={(val) => {
                setFilterDept(val);
                setPage(1);
                setSelectedIds(new Set());
              }}
              placeholder="All Departments"
              searchPlaceholder="Search departments..."
              fullWidth
              clearable
            />
          </div>

          <button
            onClick={toggleAllStudents}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0"
          >
            {selectedIds.size === students.length && students.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {selectedIds.size === students.length && students.length > 0
              ? 'Deselect All'
              : 'Select All on Page'}
          </button>
        </div>

        {/* Student Table */}
        {studentsLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            <span className="text-xs">Loading students...</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                  <th className="py-2.5 px-3 w-9"></th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Current Batch
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Quick Move
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[var(--text-muted)] text-xs">
                      No students found matching this criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => {
                    const isSelected = selectedIds.has(s.id);
                    const matchedBatch = batches.find((b) => b.name === s.section);
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors hover:bg-[var(--bg-raised)] ${
                          isSelected ? 'bg-[var(--accent-dim)]/50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3" onClick={() => toggleStudent(s.id)}>
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

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)]">
                {pagination.total_records} students · Page {page} of {pagination.total_pages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={!pagination.has_prev}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                        page === p
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={!pagination.has_next}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create / Edit Batch with Clean Presets Flow */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                {batchModal === 'edit' ? `Edit Batch: ${editingBatch?.name}` : 'Create New Student Batch'}
              </h3>
              <button
                onClick={() => setBatchModal(null)}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4">
              {/* Batch Name */}
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
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Department <span className="text-[var(--red)]">*</span>
                </label>
                <SearchableSelect
                  options={deptOptions}
                  value={batchForm.department}
                  onChange={(val) => setBatchForm((p) => ({ ...p, department: val }))}
                  placeholder="Select Department..."
                  searchPlaceholder="Search by department name or code..."
                  fullWidth
                  clearable
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
                <div className="flex gap-2">
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
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {batchModal === 'edit' ? 'Save Changes' : 'Create Batch'}
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

      {/* MODAL: Add Students to Batch (Drawer) */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[var(--accent)]" />
                  Add Students to Batch {filterSection !== 'ALL' && filterSection !== 'UNASSIGNED' ? `(${filterSection})` : ''}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Select students from the list below to assign them directly into the batch.
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
              {(filterSection === 'ALL' || filterSection === 'UNASSIGNED') && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Target Batch to Assign</label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
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

              {/* Controls: Department Filter + Search + Select All */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-64">
                  <SearchableSelect
                    options={drawerDeptOptions}
                    value={drawerDept}
                    onChange={(val) => {
                      setDrawerDept(val);
                      setDrawerPage(1);
                    }}
                    placeholder="All Departments"
                    searchPlaceholder="Search departments..."
                    fullWidth
                  />
                </div>

                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Search by name, roll no, email..."
                    className={`${inputCls} pl-9 text-xs`}
                  />
                </div>
                <button
                  onClick={toggleAllDrawerStudents}
                  className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0"
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
                  disabled={drawerSelectedIds.size === 0 || assigning}
                  className="px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Assign to {filterSection !== 'ALL' && filterSection !== 'UNASSIGNED' ? filterSection : targetSection}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bulk Upload Students & Batches */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[var(--accent)]" />
                  Bulk Upload Students & Allocate Batches
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Import student rosters from CSV, Excel, or tabular text and automatically assign them to batches.
                </p>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Target Batch Allocation Strategy */}
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-3">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  1. Batch & Allocation Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={labelCls}>Allocation Strategy</label>
                    <select
                      value={bulkTargetBatchMode}
                      onChange={(e) => handleBatchModeChange(e.target.value, bulkTargetBatch)}
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold cursor-pointer"
                    >
                      <option value="selected">Assign All to a Specific Batch</option>
                      <option value="from_csv">Read Batch from CSV Column (&quot;Section&quot;)</option>
                    </select>
                  </div>

                  {bulkTargetBatchMode === 'selected' ? (
                    <div className="space-y-1">
                      <label className={labelCls}>Target Batch Cohort</label>
                      <select
                        value={bulkTargetBatch}
                        onChange={(e) => handleBatchModeChange('selected', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold cursor-pointer"
                      >
                        {batches.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name} ({b.semester} · {b.academic_year})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className={labelCls}>Fallback Batch (if row has no section)</label>
                      <select
                        value={bulkTargetBatch}
                        onChange={(e) => handleBatchModeChange('from_csv', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold cursor-pointer"
                      >
                        {batches.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name} ({b.semester})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[var(--border)]">
                  <div className="space-y-1">
                    <label className={labelCls}>Provisioning Mode</label>
                    <select
                      value={bulkImportMode}
                      onChange={(e) => setBulkImportMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold cursor-pointer"
                    >
                      <option value="upsert">Upsert (Create new + update batch)</option>
                      <option value="create_only">Create Only (Skip existing)</option>
                      <option value="update_only">Update Batch Only (Existing only)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Default Department</label>
                    <input
                      type="text"
                      value={bulkDefaultDept}
                      onChange={(e) => setBulkDefaultDept(e.target.value)}
                      placeholder="e.g. CSE"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Default Password</label>
                    <input
                      type="text"
                      value={bulkDefaultPassword}
                      onChange={(e) => setBulkDefaultPassword(e.target.value)}
                      placeholder="Default initial password"
                      className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Tabs & File Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkTab('file')}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        bulkTab === 'file'
                          ? 'bg-[var(--accent)] text-white shadow-sm'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Upload CSV / Excel File
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkTab('text')}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        bulkTab === 'text'
                          ? 'bg-[var(--accent)] text-white shadow-sm'
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Paste Raw Text
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={downloadSampleCSV}
                    className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample CSV Template
                  </button>
                </div>

                {bulkTab === 'file' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-[var(--radius-lg)] bg-[var(--bg-input)]/40 hover:bg-[var(--bg-input)]/70 transition-all cursor-pointer text-center space-y-2 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.tsv"
                      onChange={handleBulkFileChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        {bulkFile ? bulkFile.name : 'Click to browse or drag & drop student CSV roster'}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Supports standard CSV / TSV with headers: Name, Email, Roll No, Department, Section
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <textarea
                      rows={5}
                      value={bulkRawText}
                      onChange={(e) => handleRawTextChange(e.target.value)}
                      placeholder={'Name,Email,Roll No,Department,Section\nRahul K,rahul.22cs@bitsathy.ac.in,7376221CS101,CSE,CSE-A\nPriya S,priya.22cs@bitsathy.ac.in,7376221CS102,CSE,CSE-A'}
                      className="w-full font-mono text-xs p-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Table */}
              {bulkPreview.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Live Parsed Preview ({bulkPreview.length} Rows)
                    </span>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px]">
                        {bulkPreview.filter((r) => r.status === 'valid').length} Valid
                      </span>
                      {bulkPreview.filter((r) => r.status === 'error').length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30 text-[11px]">
                          {bulkPreview.filter((r) => r.status === 'error').length} Errors
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)]">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                          <th className="py-2 px-2.5 w-8 text-[10px] font-mono text-[var(--text-muted)]">#</th>
                          <th className="py-2 px-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                          <th className="py-2 px-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Email</th>
                          <th className="py-2 px-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Roll No</th>
                          <th className="py-2 px-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Dept</th>
                          <th className="py-2 px-2.5 font-semibold text-[var(--text-muted)] uppercase tracking-wider">Assigned Batch</th>
                          <th className="py-2 px-2.5 text-right font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-mono">
                        {bulkPreview.map((row) => (
                          <tr
                            key={row.id}
                            className={`hover:bg-[var(--bg-raised)] transition-colors ${
                              row.status === 'error' ? 'bg-[var(--red-bg)]/30' : ''
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-[10px] text-[var(--text-muted)]">{row.id}</td>
                            <td className="py-1.5 px-2.5 font-sans font-semibold text-[var(--text-primary)]">
                              {row.name}
                            </td>
                            <td className="py-1.5 px-2.5 text-[var(--text-secondary)]">{row.email}</td>
                            <td className="py-1.5 px-2.5 text-[var(--text-muted)]">{row.roll_no || '—'}</td>
                            <td className="py-1.5 px-2.5 text-[var(--text-muted)]">{row.department}</td>
                            <td className="py-1.5 px-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                                {row.section}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-sans">
                              {row.status === 'valid' ? (
                                <span className="text-emerald-600 font-bold text-[10px] flex items-center justify-end gap-1">
                                  <Check className="w-3 h-3" />
                                  Ready
                                </span>
                              ) : (
                                <span className="text-[var(--red)] font-bold text-[10px] flex items-center justify-end gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  {row.message}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload Results Card */}
              {bulkResult && (
                <div className="p-4 rounded-[var(--radius-md)] bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="font-bold text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Provisioning & Batch Allocation Succeeded!
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-center">
                      <span className="text-[10px] text-[var(--text-muted)] block">Created</span>
                      <span className="font-mono font-bold text-emerald-600 text-sm">{bulkResult.created_count}</span>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-center">
                      <span className="text-[10px] text-[var(--text-muted)] block">Updated Batch</span>
                      <span className="font-mono font-bold text-[var(--accent)] text-sm">{bulkResult.updated_count}</span>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-center">
                      <span className="text-[10px] text-[var(--text-muted)] block">Skipped</span>
                      <span className="font-mono font-bold text-[var(--text-muted)] text-sm">{bulkResult.skipped_count}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-raised)] rounded-b-[var(--radius-xl)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {bulkPreview.filter((r) => r.status === 'valid').length} of {bulkPreview.length} rows valid
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  {bulkResult ? 'Close' : 'Cancel'}
                </button>
                <button
                  onClick={handleExecuteBulkUpload}
                  disabled={bulkPreview.filter((r) => r.status === 'valid').length === 0 || bulkLoading}
                  className="px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {bulkLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Import & Allocate (
                  {bulkPreview.filter((r) => r.status === 'valid').length} Students)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Batch Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingBatch)}
        onClose={() => setDeletingBatch(null)}
        onConfirm={executeDeleteBatch}
        title="Delete Batch Cohort"
        message={`Delete batch "${deletingBatch?.name || ''}"? Students allocated to this batch will not be deleted.`}
        confirmText="Delete Batch"
        variant="danger"
        isDanger={true}
      />
    </div>
  );
}
