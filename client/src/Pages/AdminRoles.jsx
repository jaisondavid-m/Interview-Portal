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
  Sparkles,
  ArrowLeft,
  ChevronRight
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

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingMap, setSavingMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Role Modals
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);
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

  // Toggle & Bulk Confirm Modals
  const [toggleConfirmModal, setToggleConfirmModal] = useState({
    isOpen: false,
    roleName: '',
    pageKey: '',
    pageName: '',
    roleDisplayName: '',
    isGranting: false,
  });

  const [bulkToggleModal, setBulkToggleModal] = useState({
    isOpen: false,
    grantAll: false,
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
        setPages(res.data.pages || []);
        setRoles(res.data.roles || []);
        setMatrix(res.data.matrix || {});
      }
    } catch (err) {
      console.warn('Backend roles fetch error:', err);
      setPages([]);
      setRoles([]);
      setMatrix({});
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

  // Prompt confirmation for single toggle
  const promptTogglePermission = (roleName, pageKey, e) => {
    if (e) e.stopPropagation();
    const currentVal = !!(matrix[roleName] && matrix[roleName][pageKey]);
    const pageObj = pages.find(p => p.key === pageKey);
    const roleObj = roles.find(r => r.name === roleName);

    setToggleConfirmModal({
      isOpen: true,
      roleName,
      pageKey,
      pageName: pageObj?.name || pageKey,
      roleDisplayName: roleObj?.display_name || roleName,
      isGranting: !currentVal,
    });
  };

  // Confirm single toggle
  const confirmTogglePermission = async () => {
    const { roleName, pageKey } = toggleConfirmModal;
    setToggleConfirmModal(prev => ({ ...prev, isOpen: false }));
    await handleTogglePermission(roleName, pageKey);
  };

  // Prompt confirmation for bulk toggle
  const promptBulkToggle = (grantAll) => {
    setBulkToggleModal({
      isOpen: true,
      grantAll,
    });
  };

  // Confirm bulk toggle
  const confirmBulkToggle = async () => {
    const { grantAll } = bulkToggleModal;
    setBulkToggleModal({ isOpen: false, grantAll: false });
    await handleBulkToggle(grantAll);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)]">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-[20px] sm:text-2xl font-bold font-heading text-[var(--text-primary)]">
              Role Management
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)]">
            Configure roles, add or edit platform pages, and toggle access permissions directly per card.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
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

      {/* VIEW 1: ALL ROLES CARDS GRID */}
      {!selectedRole ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] font-mono uppercase tracking-wider">
              Platform Roles ({roles.length})
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              Click a role card to configure and toggle its accessible pages
            </span>
          </div>

          {roles.length === 0 ? (
            <div className="p-12 text-center rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]">
              <Shield className="w-8 h-8 mx-auto opacity-40 mb-2" />
              <p className="text-sm font-medium">No roles found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {roles.map((r) => {
                const lower = r.name?.toLowerCase();
                const Icon = lower === 'admin' ? ShieldCheck : lower === 'developer' ? Terminal : lower === 'student' ? Users : Shield;
                const permCount = Object.values(matrix[r.name] || {}).filter(Boolean).length;
                const percentage = pages.length > 0 ? Math.round((permCount / pages.length) * 100) : 0;

                return (
                  <div
                    key={r.name}
                    onClick={() => { setSelectedRole(r.name); setSearchQuery(''); }}
                    className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] hover:shadow-md transition-all flex flex-col justify-between gap-5 group cursor-pointer relative"
                  >
                    {/* Card Header: Icon + Name + System Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {r.display_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                              role: {r.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {r.is_system ? (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                            System
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Description */}
                    <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-3 leading-relaxed min-h-[48px]">
                      {r.description || 'Custom defined role with granular page access rules.'}
                    </p>

                    {/* Footer: Manage Permissions Button & Edit / Delete Icons */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:translate-x-1 transition-transform">
                        <span>Manage Permissions</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToEdit({ ...r });
                            setFormError('');
                            setShowEditRoleModal(true);
                          }}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition cursor-pointer"
                          title="Edit Role Metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {r.name?.toLowerCase() !== 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(r);
                              setShowDeleteRoleModal(true);
                            }}
                            className="p-1.5 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: ROLE PAGE PERMISSIONS TOGGLE GRID */
        <div className="space-y-5 animate-fadeIn">
          {/* Breadcrumbs & Back Navigation */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => { setSelectedRole(null); setSearchQuery(''); }}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer hover:border-[var(--accent)]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-semibold">Back to All Roles</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span>Roles</span>
              <span>/</span>
              <span className="text-[var(--accent)] font-bold">{currentRoleObj.display_name} Permissions</span>
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
                onClick={() => promptBulkToggle(true)}
                disabled={areAllFilteredGranted}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Grant permission to all pages"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Grant All</span>
              </button>

              <button
                onClick={() => promptBulkToggle(false)}
                disabled={currentPermittedCount === 0}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Revoke permission from all pages"
              >
                <Square className="w-3.5 h-3.5 text-rose-400" />
                <span>Revoke All</span>
              </button>

              {/* Role Actions */}
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

              {currentRoleObj.name?.toLowerCase() !== 'admin' && (
                <button
                  onClick={() => {
                    setRoleToDelete(currentRoleObj);
                    setShowDeleteRoleModal(true);
                  }}
                  className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Role</span>
                </button>
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
                    onClick={(e) => promptTogglePermission(selectedRole, page.key, e)}
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
                      <div className="shrink-0 pt-0.5" onClick={(e) => promptTogglePermission(selectedRole, page.key, e)}>
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
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition cursor-pointer"
                          title="Edit Page"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => openDeletePageModal(page, e)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
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
        </div>
      )}

      {/* CREATE PAGE MODAL */}
      {showCreatePageModal && (
        <div 
          onClick={() => setShowCreatePageModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-scaleUp"
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
        <div 
          onClick={() => setShowEditPageModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-scaleUp"
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
        <div 
          onClick={() => setShowCreateRoleModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-scaleUp"
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
        <div 
          onClick={() => setShowEditRoleModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-scaleUp"
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
        title="Delete Role"
        message={`Are you sure you want to delete the role "${roleToDelete?.display_name}"? All associated page access mappings will be permanently removed.`}
        confirmText="Delete Role"
        variant="danger"
        loading={modalLoading}
      />

      {/* TOGGLE PERMISSION CONFIRM MODAL */}
      <ConfirmModal
        isOpen={toggleConfirmModal.isOpen}
        onClose={() => setToggleConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmTogglePermission}
        title={toggleConfirmModal.isGranting ? "Grant Page Access" : "Revoke Page Access"}
        message={
          toggleConfirmModal.isGranting
            ? `Are you sure you want to grant access to "${toggleConfirmModal.pageName}" for the "${toggleConfirmModal.roleDisplayName}" role? Users with this role will be able to view and interact with this page.`
            : `Are you sure you want to revoke access to "${toggleConfirmModal.pageName}" from the "${toggleConfirmModal.roleDisplayName}" role? Users with this role will no longer be able to access this page.`
        }
        confirmText={toggleConfirmModal.isGranting ? "Grant Access" : "Revoke Access"}
        variant={toggleConfirmModal.isGranting ? "info" : "warning"}
        loading={modalLoading}
      />

      {/* BULK TOGGLE CONFIRM MODAL */}
      <ConfirmModal
        isOpen={bulkToggleModal.isOpen}
        onClose={() => setBulkToggleModal({ isOpen: false, grantAll: false })}
        onConfirm={confirmBulkToggle}
        title={bulkToggleModal.grantAll ? "Grant All Pages Access" : "Revoke All Pages Access"}
        message={
          bulkToggleModal.grantAll
            ? `Are you sure you want to grant access to all ${filteredPages.length} catalog pages for the "${currentRoleObj.display_name}" role?`
            : `Are you sure you want to revoke access to all pages from the "${currentRoleObj.display_name}" role?`
        }
        confirmText={bulkToggleModal.grantAll ? "Grant All" : "Revoke All"}
        variant={bulkToggleModal.grantAll ? "info" : "danger"}
        loading={modalLoading}
      />
    </div>
  );
}
