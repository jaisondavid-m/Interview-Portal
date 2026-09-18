import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({ allowedKeys: [], pages: [], defaultPage: '' });
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch permitted pages and keys from backend
  const fetchPermissions = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setPermissionsLoading(true);
      const res = await api.get('/auth/permissions');
      if (res && res.data) {
        setPermissions({
          allowedKeys: res.data.allowed_keys || [],
          pages: res.data.pages || [],
          defaultPage: res.data.default_page || '',
        });
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to load user permissions:', err);
    } finally {
      if (!isSilent) setPermissionsLoading(false);
    }
    return null;
  }, []);

  // Check current session from /auth/me using HTTP-only cookie
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth/me');
      if (res && res.user) {
        setUser(res.user);
        await fetchPermissions(true);
        return res.user;
      }
      setUser(null);
      setPermissions({ allowedKeys: [], pages: [] });
      return null;
    } catch (err) {
      setUser(null);
      setPermissions({ allowedKeys: [], pages: [] });
      return null;
    } finally {
      setLoading(false);
      setPermissionsLoading(false);
    }
  }, [fetchPermissions]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for live permission updates from Role Management across components
  useEffect(() => {
    const handlePermissionsUpdated = () => {
      fetchPermissions(true);
    };

    const handleSessionInvalidated = (e) => {
      setUser(null);
      setPermissions({ allowedKeys: [], pages: [] });
      if (e.detail?.message) {
        sessionStorage.setItem('logoutNotice', e.detail.message);
      }
    };

    window.addEventListener('permissionsUpdated', handlePermissionsUpdated);
    window.addEventListener('sessionInvalidated', handleSessionInvalidated);
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdated);
      window.removeEventListener('sessionInvalidated', handleSessionInvalidated);
    };
  }, [fetchPermissions]);

  // Check if current user has permission for a specific page key (or list of keys)
  const hasPermission = useCallback((pageKeys) => {
    if (!user) return false;
    const role = user.role?.toLowerCase();
    if (role === 'admin') return true; // Superadmin bypass

    if (!pageKeys) return true;

    const keysToCheck = Array.isArray(pageKeys) ? pageKeys : [pageKeys];
    return keysToCheck.some(key => permissions.allowedKeys.includes(key));
  }, [user, permissions.allowedKeys]);

  // Login handler
  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res && res.user) {
        setUser(res.user);
        await fetchPermissions();
        return { success: true, user: res.user };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Google Login handler
  const loginWithGoogle = async (googlePayload) => {
    setLoading(true);
    setError(null);
    try {
      // Accepts string credential (ID token) or object payload
      const body = typeof googlePayload === 'string' 
        ? { credential: googlePayload } 
        : googlePayload;

      const res = await api.post('/auth/google', body);

      if (res && res.user) {
        setUser(res.user);
        await fetchPermissions();
        return { success: true, user: res.user };
      }
      return { success: false, error: 'Invalid Google authentication response' };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Google sign-in failed';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      setUser(null);
      setPermissions({ allowedKeys: [], pages: [] });
    }
  };

  const value = {
    user,
    setUser,
    permissions,
    permissionsLoading,
    hasPermission,
    fetchPermissions,
    loading,
    error,
    login,
    loginWithGoogle,
    logout,
    checkAuth,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
