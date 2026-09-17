import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';

/**
 * DynamicPageRoute Guard
 * Dynamically validates whether the authenticated user has permission for the specified pageKey(s).
 * If permitted (or if superadmin), renders child routes/components.
 * If unauthorized, renders an access restricted notification.
 */
export default function DynamicPageRoute({ pageKey, requiredRole, children }) {
  const { user, loading, permissionsLoading, hasPermission, permissions } = useAuth();
  const navigate = useNavigate();

  if (loading || permissionsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <span className="text-xs font-mono text-[var(--text-muted)]">Checking permissions...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check specific role requirement if given (e.g. for superadmin role management)
  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    return (
      <div className="flex-1 min-h-[70vh] flex items-center justify-center p-6 animate-fadeIn">
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Superadmin Access Required</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              This administrative portal is strictly reserved for system administrators.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check page permission
  const isAllowed = !pageKey || hasPermission(pageKey);

  if (!isAllowed) {
    return (
      <div className="flex-1 min-h-[70vh] flex items-center justify-center p-6 animate-fadeIn">
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Access Restricted</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Your role (<span className="font-mono text-[var(--accent)] uppercase font-semibold">{user.role}</span>) does not currently have permission to access this page. An administrator can grant you access in <strong>Role Management</strong>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
            <button
              onClick={() => {
                const firstPermitted = permissions?.pages?.[0]?.path;
                navigate(firstPermitted || '/');
              }}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>My Workspace</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
