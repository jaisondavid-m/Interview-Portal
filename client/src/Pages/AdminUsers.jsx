import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Edit2, Trash2, Shield, 
  GraduationCap, Check, X, AlertCircle, RefreshCw, KeyRound, SlidersHorizontal, RotateCcw
} from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../Components/SearchableSelect';

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
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setFormLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <span className="badge-kicker">Administration Control</span>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
            User Management Portal
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Create, provision, and manage student and administrator accounts for campus mock interviews.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn btn-primary text-xs py-2.5 px-4 self-start sm:self-auto shadow-[var(--shadow-sm)]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
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
              options={ROLE_OPTIONS}
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

      {/* Users Data List / Table */}
      <div className="panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-input)] border-b border-[var(--border)] text-[11px] font-mono uppercase text-[var(--text-muted)] tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Roll / Reg No</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[var(--text-muted)] font-mono">
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-hover)] transition-colors">
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
                      <span className={`status-pill ${user.role === 'admin' ? 'status-accent' : 'status-active'}`}>
                        {user.role === 'admin' ? 'Administrator' : 'Student'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-card)] hover:text-[var(--accent)] text-[var(--text-secondary)] transition"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--red-bg)] hover:text-[var(--red)] text-[var(--text-secondary)] transition"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CREATE USER MODAL */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 sm:p-8 w-full max-w-lg shadow-[var(--shadow-lg)] animate-slide-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Admin Action</span>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                  Provision New Account
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
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
                  placeholder="student@bitsathy.ac.in"
                  className="custom-input"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span>Temporary Password</span>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="custom-input"
                  />
                </label>

                <label>
                  <span>User Role</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="custom-input bg-[var(--bg-input)]"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary text-xs py-2 px-4"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 sm:p-8 w-full max-w-lg shadow-[var(--shadow-lg)] animate-slide-up space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="badge-kicker">Edit Account</span>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] mt-0.5">
                  Update User Details
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
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
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current"
                    className="custom-input"
                  />
                </label>

                <label>
                  <span>User Role</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="custom-input bg-[var(--bg-input)]"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary text-xs py-2 px-4"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-[var(--shadow-lg)] animate-slide-up space-y-4">
            <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
              Confirm Account Deletion
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete user account <strong className="text-[var(--text-primary)]">{selectedUser?.name}</strong> ({selectedUser?.email})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={formLoading}
                className="btn btn-danger text-xs py-2 px-4"
              >
                <span>{formLoading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
