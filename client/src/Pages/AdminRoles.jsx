import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Shield,
  Users,
  LayoutDashboard,
  SlidersHorizontal,
  MessageSquareCheck,
  Trophy,
  History,
  Terminal,
  Video,
  Plus,
  RotateCcw,
  Check,
  X,
  Search,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  FileCode2,
  Loader2,
  CheckSquare,
  Square,
  Globe,
  Settings,
  Sparkles
} from 'lucide-react';
import api from '../api/axios';
import ConfirmModal from '../Components/ConfirmModal';

// Icon mapping helper
const ICON_COMPONENTS = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  MessageSquareCheck,
  Trophy,
  History,
  Terminal,
  Video,
  Globe,
  Settings,
  Sparkles,
  FileCode2,
};

const ICON_OPTIONS = [
  { value: 'LayoutDashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'ShieldCheck', label: 'Security / Role', icon: ShieldCheck },
  { value: 'SlidersHorizontal', label: 'Config / Sliders', icon: SlidersHorizontal },
  { value: 'MessageSquareCheck', label: 'Feedback / Reviews', icon: MessageSquareCheck },
  { value: 'Trophy', label: 'Trophy / Leaderboard', icon: Trophy },
  { value: 'History', label: 'History / Clock', icon: History },
  { value: 'Terminal', label: 'Terminal / Logs', icon: Terminal },
  { value: 'Video', label: 'Video / Interview', icon: Video },
  { value: 'Globe', label: 'Globe / Portal', icon: Globe },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'FileCode2', label: 'Code / Page', icon: FileCode2 },
];

const DEFAULT_PAGES_FALLBACK = [
  { id: 1, key: 'admin_dashboard', name: 'Dashboard', path: '/admin/dashboard', category: 'Admin', icon: 'LayoutDashboard', order_index: 1, description: 'Administrative overview metrics and platform engagement telemetry' },
  { id: 2, key: 'admin_users', name: 'User Management', path: '/admin/users', category: 'Admin', icon: 'Users', order_index: 2, description: 'Manage candidate and administrator credentials and department profiles' },
  { id: 3, key: 'admin_roles', name: 'Role Management', path: '/admin/roles', category: 'Admin', icon: 'ShieldCheck', order_index: 3, description: 'Configure role definitions and page access permissions matrix' },
  { id: 4, key: 'admin_interviews', name: 'Interview Configuration', path: '/admin/interviews', category: 'Admin', icon: 'SlidersHorizontal', order_index: 4, description: 'Manage domain tracks, experience levels, and question bank editor' },
  { id: 5, key: 'admin_feedback', name: 'Peer Feedback Config', path: '/admin/feedback', category: 'Admin', icon: 'MessageSquareCheck', order_index: 5, description: 'Configure peer evaluation questionnaires and rating rubrics' },
  { id: 6, key: 'admin_leaderboard', name: 'Leaderboard', path: '/admin/leaderboard', category: 'Admin', icon: 'Trophy', order_index: 6, description: 'Global performance rankings and peer mock score leaderboard' },
  { id: 7, key: 'admin_history', name: 'Interview History', path: '/admin/history', category: 'Admin', icon: 'History', order_index: 7, description: 'Review completed sessions, peer scorecards, and session audio recordings' },
  { id: 8, key: 'audit_logs', name: 'Audit Logs', path: '/admin/audit-logs', category: 'Admin', icon: 'Terminal', order_index: 8, description: 'Platform-wide administrative activity, developer diagnostics, and security audit trail' },
  { id: 9, key: 'student_dashboard', name: 'Student Dashboard', path: '/dashboard', category: 'Student', icon: 'LayoutDashboard', order_index: 9, description: 'Candidate dashboard with upcoming sessions, readiness stats, and tracks' },
  { id: 10, key: 'student_interviews', name: 'Interviews Portal', path: '/interviews', category: 'Student', icon: 'Video', order_index: 10, description: 'Interview track selection and automated peer matchmaking queue' },
  { id: 11, key: 'student_history', name: 'Student Interview History', path: '/history', category: 'Student', icon: 'History', order_index: 11, description: 'Personal candidate mock interview history, recordings, and peer feedback' },
  { id: 12, key: 'interview_room', name: 'Live Interview Room', path: '/interviews/room/:sessionId', category: 'Student', icon: 'Video', order_index: 12, description: 'Live dual-candidate collaborative coding, whiteboard, and sandbox room' },
];

const DEFAULT_ROLES_FALLBACK = [
  { id: 1, name: 'admin', display_name: 'Administrator', description: 'Full administrative access to manage users, tracks, roles, and platform settings', is_system: true, user_count: 1 },
  { id: 2, name: 'developer', display_name: 'Developer', description: 'Technical developer diagnostics and audit log telemetry portal', is_system: true, user_count: 1 },
  { id: 3, name: 'student', display_name: 'Student Candidate', description: 'Standard candidate access for peer mock interviews, history, and feedback', is_system: true, user_count: 5 },
];

const DEFAULT_SEED_MATRIX = {
  admin: {
    admin_dashboard: true, admin_users: true, admin_roles: true, admin_interviews: true,
    admin_feedback: true, admin_leaderboard: true, admin_history: true, audit_logs: true,
    student_dashboard: true, student_interviews: true, student_history: true, interview_room: true
  },
  developer: {
    admin_dashboard: false, admin_users: false, admin_roles: false, admin_interviews: false,
    admin_feedback: false, admin_leaderboard: false, admin_history: false, audit_logs: true,
    student_dashboard: false, student_interviews: false, student_history: false, interview_room: false
  },
  student: {
    admin_dashboard: false, admin_users: false, admin_roles: false, admin_interviews: false,
    admin_feedback: false, admin_leaderboard: false, admin_history: false, audit_logs: false,
    student_dashboard: true, student_interviews: true, student_history: true, interview_room: true
  }
};

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingMap, setSavingMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Role Modals
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Page Modals
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [showEditPageModal, setShowEditPageModal] = useState(false);
  const [showDeletePageModal, setShowDeletePageModal] = useState(false);
  const [pageToEdit, setPageToEdit] = useState(null);
  const [pageToDelete, setPageToDelete] = useState(null);

  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State for Create Role
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    clone_from: 'student',
  });

  // Form State for Create/Edit Page
  const [pageForm, setPageForm] = useState({
    name: '',
    path: '',
    key: '',
    icon: 'FileCode2',
    category: 'General',
    description: '',
  });

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/roles/mappings');
      if (res && res.data) {
        setPages(res.data.pages || DEFAULT_PAGES_FALLBACK);
        setRoles(res.data.roles || DEFAULT_ROLES_FALLBACK);
        setMatrix(res.data.matrix || DEFAULT_SEED_MATRIX);
        if (res.data.roles?.length > 0 && !res.data.roles.find(r => r.name === selectedRole)) {
          setSelectedRole(res.data.roles[0].name);
        }
      }
    } catch (err) {
      console.warn('Backend roles fetch error, using fallback state:', err);
      setPages(DEFAULT_PAGES_FALLBACK);
      setRoles(DEFAULT_ROLES_FALLBACK);
      setMatrix(DEFAULT_SEED_MATRIX);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Current active role object
  const currentRoleObj = useMemo(() => {
    return roles.find(r => r.name === selectedRole) || roles[0] || { name: 'admin', display_name: 'Administrator', is_system: true };
  }, [roles, selectedRole]);

  // Filtered pages based on search query
  const filteredPages = useMemo(() => {
    return pages.filter(page => {
      return (
        page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (page.description && page.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        page.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [pages, searchQuery]);

  // Toggle single permission for a role
  const handleTogglePermission = async (roleName, pageKey, e) => {
    if (e) e.stopPropagation();

    const currentVal = !!(matrix[roleName] && matrix[roleName][pageKey]);
    const newVal = !currentVal;

    // Optimistic UI update
    setMatrix(prev => ({
      ...prev,
      [roleName]: {
        ...(prev[roleName] || {}),
        [pageKey]: newVal,
      },
    }));

    setSavingMap(prev => ({ ...prev, [`${roleName}_${pageKey}`]: true }));

    try {
      const updatedPermissions = {
        ...(matrix[roleName] || {}),
        [pageKey]: newVal,
      };

      await api.post('/admin/roles/mappings', {
        role_name: roleName,
        permissions: updatedPermissions,
      });

      const pageObj = pages.find(p => p.key === pageKey);
      showToast(`${newVal ? 'Granted' : 'Revoked'} "${pageObj?.name || pageKey}" for ${currentRoleObj.display_name}`, 'success');
      window.dispatchEvent(new Event('permissionsUpdated'));
    } catch (err) {
      console.warn('Failed to save permission update:', err);
      // Revert optimistic update
      setMatrix(prev => ({
        ...prev,
        [roleName]: {
          ...(prev[roleName] || {}),
          [pageKey]: currentVal,
        },
      }));
      showToast('Failed to save permission change', 'error');
    } finally {
      setSavingMap(prev => {
        const next = { ...prev };
        delete next[`${roleName}_${pageKey}`];
        return next;
      });
    }
  };

  // Bulk toggle for all filtered pages
  const handleBulkToggle = async (grantAll) => {
    const newPerms = { ...(matrix[selectedRole] || {}) };
    filteredPages.forEach(p => {
      newPerms[p.key] = grantAll;
    });

    // Optimistic update
    setMatrix(prev => ({
      ...prev,
      [selectedRole]: newPerms,
    }));

    try {
      await api.post('/admin/roles/mappings', {
        role_name: selectedRole,
        permissions: newPerms,
      });
      showToast(
        `${grantAll ? 'Granted' : 'Revoked'} ${filteredPages.length} pages for ${currentRoleObj.display_name}`,
        'success'
      );
      window.dispatchEvent(new Event('permissionsUpdated'));
    } catch (err) {
      console.warn('Failed bulk update:', err);
      showToast('Failed to update permissions', 'error');
      fetchData();
    }
  };

  // Create Role Handler
  const handleCreateRole = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newRoleForm.name.trim() || !newRoleForm.display_name.trim()) {
      setFormError('Role identifier and display name are required');
      return;
    }

    setModalLoading(true);
    try {
      const initialPerms = {};
      if (newRoleForm.clone_from && matrix[newRoleForm.clone_from]) {
        Object.assign(initialPerms, matrix[newRoleForm.clone_from]);
      }

      const res = await api.post('/admin/roles', {
        name: newRoleForm.name.trim(),
        display_name: newRoleForm.display_name.trim(),
        description: newRoleForm.description.trim(),
        permissions: initialPerms,
      });

      if (res && res.data) {
        showToast(`Role "${newRoleForm.display_name}" created successfully`, 'success');
        setShowCreateRoleModal(false);
        setNewRoleForm({ name: '', display_name: '', description: '', clone_from: 'student' });
        await fetchData();
        setSelectedRole(res.data.name || newRoleForm.name.toLowerCase().trim());
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create role';
      setFormError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Edit Role Handler
  const handleEditRole = async (e) => {
    e.preventDefault();
    if (!roleToEdit) return;

    setModalLoading(true);
    try {
      await api.put(`/admin/roles/${roleToEdit.id}`, {
        display_name: roleToEdit.display_name,
        description: roleToEdit.description,
      });

      showToast(`Role "${roleToEdit.display_name}" updated`, 'success');
      setShowEditRoleModal(false);
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update role';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Role Handler
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setModalLoading(true);
    try {
      await api.delete(`/admin/roles/${roleToDelete.id}`);
      showToast(`Role "${roleToDelete.display_name}" deleted`, 'success');
      setShowDeleteRoleModal(false);
      setRoleToDelete(null);
      if (selectedRole === roleToDelete.name) {
        setSelectedRole('admin');
      }
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete role';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Create Page Handler
  const handleCreatePage = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!pageForm.name.trim() || !pageForm.path.trim()) {
      setFormError('Page name and route path are required');
      return;
    }

    setModalLoading(true);
    try {
      await api.post('/admin/roles/pages', {
        name: pageForm.name.trim(),
        path: pageForm.path.trim(),
        key: pageForm.key.trim(),
        icon: pageForm.icon || 'FileCode2',
        category: pageForm.category || 'General',
        description: pageForm.description.trim(),
      });

      showToast(`Page "${pageForm.name}" added to catalog`, 'success');
      setShowCreatePageModal(false);
      setPageForm({ name: '', path: '', key: '', icon: 'FileCode2', category: 'General', description: '' });
      window.dispatchEvent(new Event('permissionsUpdated'));
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create page';
      setFormError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Edit Page Handler
  const handleEditPage = async (e) => {
    e.preventDefault();
    if (!pageToEdit) return;

    setModalLoading(true);
    try {
      await api.put(`/admin/roles/pages/${pageToEdit.id}`, {
        name: pageForm.name.trim(),
        path: pageForm.path.trim(),
        icon: pageForm.icon || 'FileCode2',
        category: pageForm.category || 'General',
        description: pageForm.description.trim(),
      });

      showToast(`Page "${pageForm.name}" updated successfully`, 'success');
      setShowEditPageModal(false);
      setPageToEdit(null);
      window.dispatchEvent(new Event('permissionsUpdated'));
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update page';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Page Handler
  const handleDeletePage = async () => {
    if (!pageToDelete) return;

    setModalLoading(true);
    try {
      await api.delete(`/admin/roles/pages/${pageToDelete.id}`);
      showToast(`Page "${pageToDelete.name}" deleted from catalog`, 'success');
      setShowDeletePageModal(false);
      setPageToDelete(null);
      window.dispatchEvent(new Event('permissionsUpdated'));
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete page';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Reset to Defaults Handler
  const handleResetDefaults = async () => {
    setModalLoading(true);
    try {
      await api.post('/admin/roles/reset-defaults');
      showToast('All role mappings reset to system defaults', 'success');
      setShowResetModal(false);
      window.dispatchEvent(new Event('permissionsUpdated'));
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset mappings';
      showToast(msg, 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const currentPermittedCount = useMemo(() => {
    return Object.values(matrix[selectedRole] || {}).filter(Boolean).length;
  }, [matrix, selectedRole]);

  const areAllFilteredGranted = useMemo(() => {
    if (filteredPages.length === 0) return false;
    return filteredPages.every(p => !!(matrix[selectedRole] && matrix[selectedRole][p.key]));
  }, [filteredPages, matrix, selectedRole]);

  const openEditPageModal = (page, e) => {
    if (e) e.stopPropagation();
    setPageToEdit(page);
    setPageForm({
      name: page.name || '',
      path: page.path || '',
      key: page.key || '',
      icon: page.icon || 'FileCode2',
      category: page.category || 'General',
      description: page.description || '',
    });
    setFormError('');
    setShowEditPageModal(true);
  };

  const openDeletePageModal = (page, e) => {
    if (e) e.stopPropagation();
    setPageToDelete(page);
    setShowDeletePageModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border shadow-xl text-xs font-medium backdrop-blur-md animate-slideUp ${
          toastMessage.type === 'error'
            ? 'bg-rose-950/90 border-rose-800/60 text-rose-200'
            : 'bg-emerald-950/90 border-emerald-800/60 text-emerald-200'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-[var(--text-primary)]">
              Role Management
            </h1>
          </div>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Configure roles, add or edit platform pages, and toggle access permissions directly per card.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowResetModal(true)}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
            title="Reset all role mappings to initial seeded defaults"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={() => {
              setPageForm({ name: '', path: '', key: '', icon: 'FileCode2', category: 'General', description: '' });
              setFormError('');
              setShowCreatePageModal(true);
            }}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
            title="Add a new page card to the platform catalog"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Add Page</span>
          </button>

          <button
            onClick={() => {
              setNewRoleForm({ name: '', display_name: '', description: '', clone_from: 'student' });
              setFormError('');
              setShowCreateRoleModal(true);
            }}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Role</span>
          </button>
        </div>
      </div>

      {/* Role Selection Bar */}
      <div className="bg-[var(--bg-card)] p-2 rounded-[var(--radius-md)] border border-[var(--border)]">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <span className="text-[11px] font-mono uppercase text-[var(--text-muted)] px-2 shrink-0">
            Configure Role:
          </span>
          {roles.map((r) => {
            const isSelected = selectedRole === r.name;
            const permCount = Object.values(matrix[r.name] || {}).filter(Boolean).length;

            return (
              <button
                key={r.name}
                onClick={() => setSelectedRole(r.name)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-all shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border-[var(--border-accent)] shadow-sm ring-1 ring-[var(--accent)]/20'
                    : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--text-muted)]'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{r.display_name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-[var(--accent)]/20 text-[var(--accent)] font-bold' : 'bg-[var(--bg)] text-[var(--text-muted)]'
                }`}>
                  {permCount} / {pages.length}
                </span>
                {r.is_system ? (
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    System
                  </span>
                ) : (
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Custom
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Role Configuration Card */}
      <div className="p-4 sm:p-5 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {currentRoleObj.display_name} Access Permissions
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
              Role: {currentRoleObj.name}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              {currentPermittedCount} of {pages.length} Pages Allowed
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {currentRoleObj.description || 'Toggle the cards below to permit or restrict access to any page for this role.'}
          </p>
        </div>

        {/* Quick Bulk Actions for this Role */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => handleBulkToggle(true)}
            disabled={areAllFilteredGranted}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Grant permission to all pages"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grant All</span>
          </button>

          <button
            onClick={() => handleBulkToggle(false)}
            disabled={currentPermittedCount === 0}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Revoke permission from all pages"
          >
            <Square className="w-3.5 h-3.5 text-rose-400" />
            <span>Revoke All</span>
          </button>

          {/* Role Actions (if custom role) */}
          {!currentRoleObj.is_system && (
            <>
              <button
                onClick={() => {
                  setRoleToEdit({ ...currentRoleObj });
                  setFormError('');
                  setShowEditRoleModal(true);
                }}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Role</span>
              </button>
              <button
                onClick={() => {
                  setRoleToDelete(currentRoleObj);
                  setShowDeleteRoleModal(true);
                }}
                className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search pages by name, path, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-[var(--text-muted)]">
          Total Pages: {filteredPages.length}
        </div>
      </div>

      {/* ALL PAGE CARDS GRID */}
      {filteredPages.length === 0 ? (
        <div className="p-12 text-center rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] space-y-2">
          <Search className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm font-medium">No pages found matching "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="btn btn-secondary text-xs py-1 px-3 mt-2 cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPages.map((page) => {
            const Icon = ICON_COMPONENTS[page.icon] || FileCode2;
            const isGranted = !!(matrix[selectedRole] && matrix[selectedRole][page.key]);
            const isSaving = savingMap[`${selectedRole}_${page.key}`];

            return (
              <div
                key={page.key}
                onClick={(e) => handleTogglePermission(selectedRole, page.key, e)}
                className={`p-4 rounded-[var(--radius-md)] border transition-all cursor-pointer select-none flex flex-col justify-between gap-3.5 relative group ${
                  isGranted
                    ? 'bg-[var(--bg-card)] border-[var(--border-accent)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--accent)]/15'
                    : 'bg-[var(--bg-card)]/40 border-[var(--border)] opacity-65 hover:opacity-100 hover:border-[var(--text-muted)]'
                }`}
              >
                {/* Top: Icon + Title + Switch */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-[var(--radius-sm)] border shrink-0 transition-colors ${
                      isGranted
                        ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]'
                        : 'bg-[var(--bg-raised)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-snug">
                        {page.name}
                      </h3>
                      <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                        {page.path}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Toggle Switch */}
                  <div className="shrink-0 pt-0.5" onClick={(e) => handleTogglePermission(selectedRole, page.key, e)}>
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                    ) : (
                      <div
                        className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                          isGranted ? 'bg-[var(--accent)]' : 'bg-[var(--bg-raised)] border border-[var(--border)]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            isGranted ? 'translate-x-4 bg-black' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {page.description || 'Access permission to this application page.'}
                </p>

                {/* Card Footer with Page Actions (Edit / Delete) */}
                <div className="flex items-center justify-between text-[11px] font-mono pt-2.5 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold flex items-center gap-1 ${
                      isGranted ? 'text-emerald-400' : 'text-[var(--text-muted)]'
                    }`}>
                      {isGranted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Access Granted</span>
                        </>
                      ) : (
                        <span>Access Restricted</span>
                      )}
                    </span>
                  </div>

                  {/* Edit / Delete page buttons */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEditPageModal(page, e)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition"
                      title="Edit Page"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => openDeletePageModal(page, e)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PAGE MODAL */}
      {showCreatePageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Add New Page Card</h3>
              </div>
              <button
                onClick={() => setShowCreatePageModal(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Page Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Analytics Reports"
                    value={pageForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const autoKey = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                      setPageForm({ ...pageForm, name, key: pageForm.key ? pageForm.key : autoKey });
                    }}
                    required
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Route Path *</label>
                  <input
                    type="text"
                    placeholder="e.g. /admin/reports or /reports"
                    value={pageForm.path}
                    onChange={(e) => setPageForm({ ...pageForm, path: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Page Identifier Key</label>
                  <input
                    type="text"
                    placeholder="e.g. admin_reports"
                    value={pageForm.key}
                    onChange={(e) => setPageForm({ ...pageForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Card Icon</label>
                  <select
                    value={pageForm.icon}
                    onChange={(e) => setPageForm({ ...pageForm, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Description</label>
                <textarea
                  placeholder="Describe the functionality and purpose of this page..."
                  rows={2}
                  value={pageForm.description}
                  onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreatePageModal(false)}
                  disabled={modalLoading}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Page Card</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAGE MODAL */}
      {showEditPageModal && pageToEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Page Card</h3>
              </div>
              <button
                onClick={() => setShowEditPageModal(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditPage} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Page Name *</label>
                  <input
                    type="text"
                    value={pageForm.name}
                    onChange={(e) => setPageForm({ ...pageForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Route Path *</label>
                  <input
                    type="text"
                    value={pageForm.path}
                    onChange={(e) => setPageForm({ ...pageForm, path: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Page Key</label>
                  <input
                    type="text"
                    value={pageForm.key}
                    disabled
                    className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-muted)] font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1">Card Icon</label>
                  <select
                    value={pageForm.icon}
                    onChange={(e) => setPageForm({ ...pageForm, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={pageForm.description}
                  onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditPageModal(false)}
                  disabled={modalLoading}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Page Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PAGE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showDeletePageModal}
        onClose={() => { setShowDeletePageModal(false); setPageToDelete(null); }}
        onConfirm={handleDeletePage}
        title="Delete Page Card"
        message={`Are you sure you want to delete the page "${pageToDelete?.name}" (${pageToDelete?.path}) from the platform catalog? Access permissions across all roles will be removed.`}
        confirmText="Delete Page"
        variant="danger"
        loading={modalLoading}
      />

      {/* CREATE ROLE MODAL */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Create New Role</h3>
              </div>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[var(--radius-sm)] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Role Identifier (Slug) *</label>
                <input
                  type="text"
                  placeholder="e.g. interviewer, recruiter, proctor"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') })}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[10px] text-[var(--text-muted)]">Lowercase letters, numbers, and underscores only.</span>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Interviewer"
                  value={newRoleForm.display_name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, display_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Description</label>
                <textarea
                  placeholder="Describe the permissions and purpose for this role..."
                  rows={2}
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Initial Permissions Template</label>
                <select
                  value={newRoleForm.clone_from}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, clone_from: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Blank (No initial access)</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      Clone from {r.display_name} ({r.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  disabled={modalLoading}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {showEditRoleModal && roleToEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Role Metadata</h3>
              </div>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Role Identifier</label>
                <input
                  type="text"
                  value={roleToEdit.name}
                  disabled
                  className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-muted)] font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Display Name *</label>
                <input
                  type="text"
                  value={roleToEdit.display_name}
                  onChange={(e) => setRoleToEdit({ ...roleToEdit, display_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={roleToEdit.description || ''}
                  onChange={(e) => setRoleToEdit({ ...roleToEdit, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
                  disabled={modalLoading}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROLE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showDeleteRoleModal}
        onClose={() => { setShowDeleteRoleModal(false); setRoleToDelete(null); }}
        onConfirm={handleDeleteRole}
        title="Delete Custom Role"
        message={`Are you sure you want to delete the role "${roleToDelete?.display_name}"? All associated page access mappings will be permanently removed.`}
        confirmText="Delete Role"
        variant="danger"
        loading={modalLoading}
      />

      {/* RESET DEFAULTS CONFIRM MODAL */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetDefaults}
        title="Reset Page Mappings to Defaults"
        message="This action will restore all standard role permissions (Admin, Developer, Student) to the initial seeded platform defaults. Any custom role mappings will be set to restricted."
        confirmText="Restore Defaults"
        variant="warning"
        icon={RotateCcw}
        loading={modalLoading}
      />
    </div>
  );
}
