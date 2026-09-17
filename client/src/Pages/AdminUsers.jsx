import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, Search, Filter, Edit2, Trash2, Shield, 
  GraduationCap, Check, X, AlertCircle, RefreshCw, KeyRound, SlidersHorizontal, RotateCcw,
  Eye, EyeOff, Upload, Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle,
  Info, CheckSquare, Square, MinusSquare, LogOut
} from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../Components/SearchableSelect';
import { SkeletonTableRows } from '../Components/Skeleton';

const DEPARTMENT_OPTIONS = [
  { value: 'ALL', label: 'All Departments' },
  { value: 'CSE', label: 'CSE', badge: 'Comp Sci' },
  { value: 'IT', label: 'IT', badge: 'Info Tech' },
  { value: 'ECE', label: 'ECE', badge: 'Electronics' },
  { value: 'EEE', label: 'EEE', badge: 'Electrical' },
  { value: 'AI&DS', label: 'AI & DS', badge: 'AI & Data Sci' },
  { value: 'Administration', label: 'Administration', badge: 'Admin Staff' },
];

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Administrator' },
  { value: 'developer', label: 'Developer' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [roleOptions, setRoleOptions] = useState(ROLE_OPTIONS);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  const [showBulkForceLogoutModal, setShowBulkForceLogoutModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToLogout, setUserToLogout] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Bulk Upload State
  const [bulkMode, setBulkMode] = useState('file'); // 'file' | 'text'
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkDefaultDept, setBulkDefaultDept] = useState('CSE');
  const [bulkDefaultRole, setBulkDefaultRole] = useState('student');
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('mockmate123');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkParseError, setBulkParseError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_no: '',
    department: 'CSE',
    password: '',
    role: 'student',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Fetch Roles
  const fetchRoles = async () => {
    try {
      const res = await api.get('/admin/roles');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const dynamicOpts = [
          { value: 'ALL', label: 'All Roles' },
          ...res.data.map(r => ({ value: r.name, label: r.display_name }))
        ];
        setRoleOptions(dynamicOpts);
      }
    } catch (e) {
      // Retain fallback options
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.warn('Backend offline, using fallback data:', err);
      // Sample fallback list
      setUsers([
        {
          id: 1,
          name: 'System Administrator',
          email: 'admin@bitsathy.ac.in',
          roll_no: 'ADMIN01',
          department: 'Administration',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Rahul K.',
          email: 'rahul.22cs@bitsathy.ac.in',
          roll_no: '22CS104',
          department: 'CSE',
          role: 'student',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 3,
          name: 'Sneha M.',
          email: 'sneha.22it@bitsathy.ac.in',
          roll_no: '22IT052',
          department: 'IT',
          role: 'student',
          created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        },
        {
          id: 4,
          name: 'Aman V.',
          email: 'aman.21ec@bitsathy.ac.in',
          roll_no: '21EC089',
          department: 'ECE',
          role: 'student',
          created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Handle Create User Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await api.post('/admin/users', formData);
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Edit User Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setFormLoading(true);

    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Do not overwrite if blank

      await api.put(`/admin/users/${selectedUser.id}`, payload);
      setShowEditModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete User Submit
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      // Remove from selectedIds if present
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(selectedUser.id);
        return next;
      });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Bulk Delete Submit
  const handleBulkDeleteSubmit = async () => {
    if (selectedIds.size === 0) return;
    setFormLoading(true);
    try {
      const userIds = Array.from(selectedIds);
      await api.post('/admin/users/bulk-delete', { user_ids: userIds });
      setShowBulkDeleteModal(false);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete selected users');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Single User Force Logout
  const handleForceLogoutSubmit = async () => {
    if (!userToLogout) return;
    setLogoutLoading(true);
    try {
      await api.post(`/admin/users/${userToLogout.id}/force-logout`);
      setShowForceLogoutModal(false);
      setUserToLogout(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to force logout user');
    } finally {
      setLogoutLoading(false);
    }
  };

  // Handle Bulk Force Logout
  const handleBulkForceLogoutSubmit = async () => {
    if (selectedIds.size === 0) return;
    setLogoutLoading(true);
    try {
      const userIds = Array.from(selectedIds);
      await api.post('/admin/users/bulk-force-logout', { user_ids: userIds });
      setShowBulkForceLogoutModal(false);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to force logout selected users');
    } finally {
      setLogoutLoading(false);
    }
  };

  const openForceLogoutModal = (user) => {
    setUserToLogout(user);
    setShowForceLogoutModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      roll_no: user.roll_no || '',
      department: user.department || 'CSE',
      password: '',
      role: user.role || 'student',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      roll_no: '',
      department: 'CSE',
      password: '',
      role: 'student',
    });
    setSelectedUser(null);
    setFormError('');
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.roll_no?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || u.department === deptFilter;
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  // Multi-Selection Toggles
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ============================================================
  // CSV EXPORT & BULK DOWNLOAD
  // ============================================================
  const handleExportCSV = (usersToExport = filteredUsers, filenameSuffix = 'export') => {
    if (!usersToExport || usersToExport.length === 0) {
      alert('No user records available to download.');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Roll / Reg No', 'Department', 'Role', 'Created At'];
    const csvRows = usersToExport.map((u) => [
      `"${u.id || ''}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.roll_no || '').replace(/"/g, '""')}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      `"${(u.role || 'student').replace(/"/g, '""')}"`,
      `"${u.created_at ? new Date(u.created_at).toLocaleString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mockmate_users_${filenameSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sample CSV Template Download
  const handleDownloadTemplate = () => {
    const sampleHeaders = 'name,email,roll_no,department,role,password\n';
    const sampleRows = [
      'Mani M R S,manimozhichelvanmrs.ad25@bitsathy.ac.in,7376252AD230,AI&DS,student,mockmate123',
      'Jagaprasanth P,jagaprasanthp.cs25@bitsathy.ac.in,7376251CS219,CSE,student,mockmate123',
      'Jaison David M,jaisondavidm.cs25@bitsathy.ac.in,7376251CS221,CSE,student,mockmate123',
      'Campus Admin,admin.placement@bitsathy.ac.in,ADMIN02,Administration,admin,Admin@123'
    ].join('\n');
    
    const blob = new Blob([sampleHeaders + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mockmate_users_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // CSV PARSER & PREVIEW
  // ============================================================
  const parseCSVText = (csvText) => {
    setBulkParseError('');
    if (!csvText || !csvText.trim()) {
      setBulkPreview([]);
      return;
    }

    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setBulkPreview([]);
      return;
    }

    const parseLine = (text) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (inQuotes && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const firstLineCols = parseLine(lines[0]);
    const headerRow = firstLineCols.map(h => h.toLowerCase().replace(/[\s_\-/]/g, ''));
    
    const nameIdx = headerRow.findIndex(h => h.includes('name'));
    const emailIdx = headerRow.findIndex(h => h.includes('email') || h.includes('mail'));
    const rollIdx = headerRow.findIndex(h => h.includes('roll') || h.includes('reg') || h.includes('id') || h.includes('rollno'));
    const deptIdx = headerRow.findIndex(h => h.includes('dept') || h.includes('department') || h.includes('branch'));
    const roleIdx = headerRow.findIndex(h => h.includes('role') || h.includes('type'));
    const passIdx = headerRow.findIndex(h => h.includes('pass') || h.includes('password'));

    const hasHeader = (nameIdx !== -1 || emailIdx !== -1);
    const startIndex = hasHeader ? 1 : 0;

    const existingEmails = new Set(users.map(u => (u.email || '').toLowerCase().trim()));
    const batchEmails = new Set();
    const rows = [];

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

      const name = nameIdx !== -1 ? (cols[nameIdx] || '') : (cols[0] || '');
      const email = emailIdx !== -1 ? (cols[emailIdx] || '') : (cols[1] || '');
      const roll_no = rollIdx !== -1 ? (cols[rollIdx] || '') : (cols[2] || '');
      const rawRole = (cols[roleIdx] || '').toLowerCase().trim();
      const role = roleIdx !== -1 
        ? (rawRole.includes('admin') ? 'admin' : rawRole.includes('dev') ? 'developer' : 'student') 
        : bulkDefaultRole;

      let status = 'valid';
      let message = 'Ready to import';

      if (!name.trim()) {
        status = 'error';
        message = 'Missing full name';
      } else if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        status = 'error';
        message = 'Invalid email address';
      } else if (existingEmails.has(email.toLowerCase().trim())) {
        status = 'warning';
        message = 'Email already in database';
      } else if (batchEmails.has(email.toLowerCase().trim())) {
        status = 'warning';
        message = 'Duplicate email in file';
      } else {
        batchEmails.add(email.toLowerCase().trim());
      }

      rows.push({
        id: i,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        roll_no: roll_no.trim(),
        department: department.trim() || bulkDefaultDept,
        role: role || bulkDefaultRole,
        password: password || bulkDefaultPassword || 'mockmate123',
        status,
        message,
      });
    }

    setBulkPreview(rows);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text) => {
    setBulkRawText(text);
    parseCSVText(text);
  };

  const openBulkModal = () => {
    setBulkFile(null);
    setBulkRawText('');
    setBulkPreview([]);
    setBulkResult(null);
    setBulkParseError('');
    setShowBulkModal(true);
  };

  const handleBulkUploadSubmit = async () => {
    const validRows = bulkPreview.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      alert('No valid accounts to import. Please check your data.');
      return;
    }

    setBulkLoading(true);
    try {
      const payload = {
        users: validRows.map(r => ({
          name: r.name,
          email: r.email,
          roll_no: r.roll_no,
          department: r.department,
          role: r.role,
          password: r.password,
        })),
        default_password: bulkDefaultPassword || 'mockmate123',
      };

      const res = await api.post('/admin/users/bulk', payload);
      setBulkResult(res.data);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to complete bulk upload');
    } finally {
      setBulkLoading(false);
    }
  };

  const validCount = bulkPreview.filter(r => r.status === 'valid').length;
  const warningCount = bulkPreview.filter(r => r.status === 'warning').length;
  const errorCount = bulkPreview.filter(r => r.status === 'error').length;
  const isAllSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredUsers.length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-kicker">User Management</span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
            User Management Portal
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Create, provision, batch import, and export student and administrator accounts for campus mock interviews.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Download / Export CSV Button */}
          <button
            onClick={() => handleExportCSV(filteredUsers, deptFilter !== 'ALL' || roleFilter !== 'ALL' || searchTerm ? 'filtered' : 'all')}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-[var(--shadow-xs)] hover:text-[var(--accent)] cursor-pointer"
            title={`Download CSV (${filteredUsers.length} accounts)`}
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Download CSV</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[var(--bg-input)] rounded text-[var(--text-muted)]">
              {filteredUsers.length}
            </span>
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={openBulkModal}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-[var(--shadow-xs)] text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer font-semibold"
            title="Bulk Upload Users from CSV"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Upload</span>
          </button>

          {/* Provision Single User Button */}
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-[var(--shadow-sm)] cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Provision New User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel-card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search Bar */}
          <div className="relative w-full lg:w-96">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] flex items-center">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name, Roll No, Email..."
              className="custom-input search-input text-[12px] py-2"
              style={{ paddingLeft: '2.4rem', paddingRight: '2.2rem' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Searchable Select Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Department Searchable Select */}
            <SearchableSelect
              options={DEPARTMENT_OPTIONS}
              value={deptFilter}
              onChange={setDeptFilter}
              placeholder="All Departments"
              searchPlaceholder="Filter departments (e.g. CSE, IT)..."
              label="Dept:"
              icon={Filter}
              clearable={true}
              menuWidth="w-72"
            />

            {/* Role Searchable Select */}
            <SearchableSelect
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="All Roles"
              searchPlaceholder="Filter roles (Student, Admin)..."
              label="Role:"
              icon={Shield}
              clearable={true}
              menuWidth="w-56"
            />

            {/* Reset Filters button if active */}
            {(searchTerm || deptFilter !== 'ALL' || roleFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDeptFilter('ALL');
                  setRoleFilter('ALL');
                }}
                className="btn btn-secondary text-[11px] py-1.5 px-2.5 flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              className={`btn btn-secondary p-2 transition ${loading ? 'opacity-50' : ''}`}
              title="Refresh Users"
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] font-mono">
          <div className="flex items-center gap-2">
            <span>Results: <strong className="text-[var(--text-primary)]">{filteredUsers.length}</strong> of {users.length} accounts</span>
            {(deptFilter !== 'ALL' || roleFilter !== 'ALL' || searchTerm) && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[var(--accent)]">
                • (Filters applied)
              </span>
            )}
          </div>
          {searchTerm && (
            <span className="truncate max-w-[200px] text-[var(--text-secondary)]">
              Matching: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* Bulk Selection Action Bar (appears when 1 or more rows selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-[var(--accent-dim)] border border-[var(--border-accent)] rounded-[var(--radius-md)] flex items-center justify-between gap-4 animate-fadeIn shadow-xs flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-mono font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              {selectedIds.size} {selectedIds.size === 1 ? 'account' : 'accounts'} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const selectedUsers = users.filter((u) => selectedIds.has(u.id));
                handleExportCSV(selectedUsers, 'selected');
              }}
              className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Download className="w-3 h-3 text-[var(--accent)]" />
              <span>Download Selected ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => setShowBulkForceLogoutModal(true)}
              className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              title="Force logout active sessions on selected accounts"
            >
              <LogOut className="w-3 h-3" />
              <span>Force Logout Selected ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="btn btn-danger text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline ml-1 cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Users Data List / Table */}
      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-[var(--bg-input)] border-b border-[var(--border)] text-[11px] font-mono uppercase text-[var(--text-muted)] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition cursor-pointer"
                    title={isAllSelected ? 'Deselect all' : 'Select all filtered'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                    ) : isIndeterminate ? (
                      <MinusSquare className="w-4 h-4 text-[var(--accent)]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Roll / Reg No</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Session Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[13px]">
              {loading ? (
                <SkeletonTableRows rows={8} cols={7} />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[var(--text-muted)]">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedIds.has(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[var(--accent-dim)]/40 hover:bg-[var(--accent-dim)]/60' : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectUser(user.id)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition cursor-pointer"
                          title={isSelected ? 'Deselect user' : 'Select user'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="card-avatar w-8 h-8 text-[11px]">
                            {user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] font-ui">{user.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[12px] text-[var(--text-secondary)]">
                        {user.roll_no || '—'}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] font-ui">
                        {user.department || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-pill ${
                          user.role === 'admin'
                            ? 'status-accent'
                            : user.role === 'developer'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold'
                            : 'status-active'
                        }`}>
                          {user.role === 'admin' ? 'Administrator' : user.role === 'developer' ? 'Developer' : 'Student'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.has_active_session ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50"></span>
                            <span>Offline</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openForceLogoutModal(user)}
                          disabled={!user.has_active_session}
                          className={`p-1.5 rounded-[var(--radius-sm)] transition cursor-pointer ${
                            user.has_active_session
                              ? 'hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 text-amber-500/80'
                              : 'opacity-25 cursor-not-allowed text-[var(--text-muted)]'
                          }`}
                          title={user.has_active_session ? `Force Logout ${user.name}` : 'User is not currently logged in'}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-card)] hover:text-[var(--accent)] text-[var(--text-secondary)] transition cursor-pointer"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--red-bg)] hover:text-[var(--red)] text-[var(--text-secondary)] transition cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BULK UPLOAD MODAL */}
      {/* ============================================================ */}
      {showBulkModal && (
        <div 
          onClick={() => setShowBulkModal(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-4 sm:p-8 w-full max-w-4xl shadow-[var(--shadow-lg)] animate-scaleUp max-h-[92vh] flex flex-col space-y-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                    Bulk Upload User Accounts
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Import multiple student or administrator records via CSV format.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
              {/* Success / Result View if upload just finished */}
              {bulkResult ? (
                <div className="space-y-4 py-3">
                  <div className="p-5 bg-[var(--bg-raised)] border border-[var(--border)] rounded-[var(--radius-md)] flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      <DotLottieReact
                        src="/lotties/success_tick.lottie"
                        loop={false}
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                        Bulk Provisioning Completed!
                      </h4>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                        <strong>{bulkResult.created_count || 0}</strong> accounts were successfully registered.
                        {bulkResult.skipped_count > 0 && ` ${bulkResult.skipped_count} entries were skipped.`}
                      </p>
                    </div>
                  </div>

                  {bulkResult.skipped_details && bulkResult.skipped_details.length > 0 && (
                    <div className="panel-card p-4 space-y-2">
                      <p className="text-[12px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Skipped Rows & Notice Details ({bulkResult.skipped_details.length}):</span>
                      </p>
                      <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 text-[var(--text-secondary)] bg-[var(--bg-input)] p-3 rounded">
                        {bulkResult.skipped_details.map((msg, idx) => (
                          <div key={idx} className="border-b border-[var(--border)]/50 pb-1">
                            • {msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkResult(null);
                        setBulkPreview([]);
                        setBulkFile(null);
                        setBulkRawText('');
                      }}
                      className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                    >
                      Upload Another Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(false)}
                      className="btn btn-primary text-xs py-2 px-4 cursor-pointer"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Helpers: Download Sample Template */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--bg-raised)] rounded-[var(--radius-md)] border border-[var(--border)]">
                    <div className="flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)]">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Supported headers: <code className="font-mono text-[11px] text-[var(--accent)] font-bold">name, email, roll_no, department, role, password</code></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto shrink-0 font-bold hover:text-emerald-600 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-emerald-500" />
                      <span>Download Sample CSV</span>
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setBulkMode('file')}
                      className={`py-1.5 px-3 rounded-t-[var(--radius-sm)] transition flex items-center gap-1.5 cursor-pointer ${
                        bulkMode === 'file'
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-b-2 border-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload CSV File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkMode('text')}
                      className={`py-1.5 px-3 rounded-t-[var(--radius-sm)] transition flex items-center gap-1.5 cursor-pointer ${
                        bulkMode === 'text'
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-b-2 border-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Paste CSV Text</span>
                    </button>
                  </div>

                  {/* Upload Dropzone or Text Area */}
                  {bulkMode === 'file' ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] rounded-[var(--radius-lg)] p-8 text-center bg-[var(--bg-input)]/40 hover:bg-[var(--bg-input)] transition cursor-pointer space-y-2.5"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv,text/plain"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          {bulkFile ? bulkFile.name : 'Click to browse or drag and drop your CSV file'}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          CSV files up to 5MB are supported
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                        Paste Raw CSV Content (Including Header Row):
                      </label>
                      <textarea
                        rows={5}
                        value={bulkRawText}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder={`name,email,roll_no,department,role,password\nRahul Sharma,rahul.cs25@bitsathy.ac.in,7376251CS104,CSE,student,mockmate123\nSneha Patel,sneha.it25@bitsathy.ac.in,7376251IT201,IT,student,`}
                        className="custom-input font-mono text-[11px] w-full p-3 resize-y"
                      />
                    </div>
                  )}

                  {/* Fallback Defaults Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[var(--bg-raised)] rounded-[var(--radius-md)] border border-[var(--border)] text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                        Default Password (if blank):
                      </span>
                      <input
                        type="text"
                        value={bulkDefaultPassword}
                        onChange={(e) => {
                          setBulkDefaultPassword(e.target.value);
                          if (bulkFile || bulkRawText) {
                            parseCSVText(bulkRawText || '');
                          }
                        }}
                        className="custom-input py-1.5 text-xs font-mono"
                        placeholder="mockmate123"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                        Default Department (if blank):
                      </span>
                      <select
                        value={bulkDefaultDept}
                        onChange={(e) => setBulkDefaultDept(e.target.value)}
                        className="custom-input py-1.5 text-xs bg-[var(--bg-input)]"
                      >
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="AI&DS">AI & DS</option>
                        <option value="Administration">Administration</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                        Default Role (if blank):
                      </span>
                      <select
                        value={bulkDefaultRole}
                        onChange={(e) => setBulkDefaultRole(e.target.value)}
                        className="custom-input py-1.5 text-xs bg-[var(--bg-input)]"
                      >
                        {roleOptions.filter(r => r.value !== 'ALL').map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Validation & Preview Section */}
                  {bulkPreview.length > 0 && (
                    <div className="space-y-2.5">
                      {/* Validation Stats Pills */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-[var(--text-primary)]">
                            Parsed Preview:
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)]">
                            Total: {bulkPreview.length}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                            ✓ {validCount} Valid
                          </span>
                          {warningCount > 0 && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                              ⚠ {warningCount} Duplicates
                            </span>
                          )}
                          {errorCount > 0 && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                              ✕ {errorCount} Invalid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="max-h-60 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-[var(--bg-input)] text-[var(--text-muted)] font-mono uppercase sticky top-0 border-b border-[var(--border)]">
                            <tr>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Name</th>
                              <th className="py-2 px-3">Email</th>
                              <th className="py-2 px-3">Roll No</th>
                              <th className="py-2 px-3">Dept</th>
                              <th className="py-2 px-3">Role</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {bulkPreview.map((r, i) => (
                              <tr key={i} className="hover:bg-[var(--bg-hover)]">
                                <td className="py-2 px-3 whitespace-nowrap">
                                  {r.status === 'valid' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="w-3 h-3" /> Ready
                                    </span>
                                  ) : r.status === 'warning' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400" title={r.message}>
                                      <AlertTriangle className="w-3 h-3" /> {r.message}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400" title={r.message}>
                                      <AlertCircle className="w-3 h-3" /> {r.message}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">
                                  {r.name || <span className="text-rose-500 italic">Empty</span>}
                                </td>
                                <td className="py-2 px-3 font-mono text-[var(--text-secondary)]">
                                  {r.email || <span className="text-rose-500 italic">Empty</span>}
                                </td>
                                <td className="py-2 px-3 font-mono text-[var(--text-muted)]">
                                  {r.roll_no || '—'}
                                </td>
                                <td className="py-2 px-3 text-[var(--text-secondary)]">
                                  {r.department}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                    r.role === 'admin' 
                                      ? 'bg-purple-500/10 text-purple-600 font-bold' 
                                      : r.role === 'developer'
                                      ? 'bg-indigo-500/10 text-indigo-600 font-bold'
                                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                                  }`}>
                                    {r.role}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!bulkResult && (
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] shrink-0">
                <div className="text-[12px] text-[var(--text-muted)]">
                  {validCount > 0 ? (
                    <span><strong>{validCount}</strong> valid accounts ready for registration</span>
                  ) : (
                    <span>Upload or paste CSV records to preview</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={validCount === 0 || bulkLoading}
                    onClick={handleBulkUploadSubmit}
                    className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing {validCount} Users...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import {validCount} Users</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BULK DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showBulkDeleteModal && (
        <div 
          onClick={() => setShowBulkDeleteModal(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] animate-scaleUp space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--red-bg)] text-[var(--red)] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                  Delete {selectedIds.size} Accounts?
                </h3>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Batch removal confirmation
                </p>
              </div>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[var(--text-primary)]">{selectedIds.size} selected accounts</strong>? Their interview session histories and scorecards will remain archived, but account access will be revoked.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteSubmit}
                disabled={formLoading}
                className="btn btn-danger text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
              >
                {formLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete ({selectedIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE USER MODAL */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div 
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-4 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[var(--shadow-lg)] animate-slide-up space-y-4 sm:space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Admin Action</span>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                  Provision New Account
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-[var(--radius-sm)] text-[12px] text-[var(--red)] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="custom-form space-y-3.5">
              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="custom-input"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span>Roll / Reg No</span>
                  <input
                    type="text"
                    required
                    value={formData.roll_no}
                    onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                    placeholder="22CS104"
                    className="custom-input"
                  />
                </label>

                <label>
                  <span>Department</span>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="custom-input bg-[var(--bg-input)]"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="AI&DS">AI & DS</option>
                    <option value="Administration">Administration</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Institute Email</span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahul.22cs@bitsathy.ac.in"
                  className="custom-input"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span>Initial Password</span>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="custom-input pr-10 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-1 cursor-pointer"
                      title={showCreatePassword ? 'Hide password' : 'Show password'}
                      aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <label>
                  <span>User Role</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="custom-input bg-[var(--bg-input)]"
                  >
                    {roleOptions.filter(r => r.value !== 'ALL').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary text-xs py-2 px-4 cursor-pointer"
                >
                  <span>{formLoading ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT USER MODAL */}
      {/* ============================================================ */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-4 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[var(--shadow-lg)] animate-slide-up space-y-4 sm:space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Edit Account</span>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                  Update User Details
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-[var(--radius-sm)] text-[12px] text-[var(--red)] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="custom-form space-y-3.5">
              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="custom-input"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span>Roll / Reg No</span>
                  <input
                    type="text"
                    value={formData.roll_no}
                    onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                    className="custom-input"
                  />
                </label>

                <label>
                  <span>Department</span>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="custom-input bg-[var(--bg-input)]"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="AI&DS">AI & DS</option>
                    <option value="Administration">Administration</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Institute Email</span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="custom-input"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span>Reset Password (Optional)</span>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave blank to keep current"
                      className="custom-input pr-10 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-1 cursor-pointer"
                      title={showEditPassword ? 'Hide password' : 'Show password'}
                      aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <label>
                  <span>User Role</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="custom-input bg-[var(--bg-input)]"
                  >
                    {roleOptions.filter(r => r.value !== 'ALL').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary text-xs py-2 px-4 cursor-pointer"
                >
                  <span>{formLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showDeleteModal && (
        <div 
          onClick={() => setShowDeleteModal(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] animate-slide-up space-y-4"
          >
            <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
              Confirm Account Deletion
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete user account <strong className="text-[var(--text-primary)]">{selectedUser?.name}</strong> ({selectedUser?.email})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={formLoading}
                className="btn btn-danger text-xs py-2 px-4 cursor-pointer"
              >
                <span>{formLoading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SINGLE USER FORCE LOGOUT CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showForceLogoutModal && userToLogout && (
        <div 
          onClick={() => {
            setShowForceLogoutModal(false);
            setUserToLogout(null);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] animate-scaleUp space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                  Force Logout Active Session?
                </h3>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Single-device session termination
                </p>
              </div>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to terminate the active session for <strong className="text-[var(--text-primary)]">{userToLogout.name}</strong> ({userToLogout.email})? They will be immediately logged out on any active device and will need to sign in again.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setShowForceLogoutModal(false);
                  setUserToLogout(null);
                }}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForceLogoutSubmit}
                disabled={logoutLoading}
                className="btn text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
              >
                {logoutLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Confirm Force Logout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BULK FORCE LOGOUT CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showBulkForceLogoutModal && (
        <div 
          onClick={() => setShowBulkForceLogoutModal(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] animate-scaleUp space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                  Force Logout {selectedIds.size} Accounts?
                </h3>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Batch session termination
                </p>
              </div>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to terminate active sessions for <strong className="text-[var(--text-primary)]">{selectedIds.size} selected accounts</strong>? All active devices will be immediately disconnected.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowBulkForceLogoutModal(false)}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkForceLogoutSubmit}
                disabled={logoutLoading}
                className="btn text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
              >
                {logoutLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Confirm Force Logout ({selectedIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
