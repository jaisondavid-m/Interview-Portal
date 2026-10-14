# Comprehensive Frontend Design System & Architecture Specification

> **Purpose**: A production-grade frontend architecture blueprint, design system specification, and component guideline for building state-of-the-art, visually stunning, and highly responsive web applications. Use this specification to replicate the clean UI structure, pastel surface hierarchy, RBAC routing, and component architecture in any web application.

---

## 1. Stack Specifications & Core Architecture

| Technology / Library | Version / Tooling | Role & Purpose |
| :--- | :--- | :--- |
| **Framework** | React `^19.2` | Component UI Engine |
| **Build System** | Vite `^8.3` | Lightning-fast HMR and ESM bundling |
| **Styling Engine** | TailwindCSS `^4.3` (`@tailwindcss/vite`) + CSS Custom Properties | Dual-engine approach: Tailwind utility class speed + CSS variables design system |
| **Routing** | React Router DOM `^7.18` | Client-side routing with nested layouts and permission guards |
| **Icons** | Lucide React `^1.44` | Crisp, consistent SVG icon set |
| **Code Editor** | `@uiw/react-codemirror` `^4.25` | Embedded CodeMirror editor supporting Python, JS, C++, and Java |
| **HTTP Client** | Axios `^1.20` | Centralized REST client with interceptors & credential handling |
| **PDF & Export** | `jspdf` `^2.5`, `html2canvas` `^1.4` | Client-side PDF generation & element snapshotting |

---

## 2. Design System & Visual Tokens (`index.css`)

The design system relies on an **elevated light/pastel surface hierarchy** contrasted with a **radiant purple-violet primary brand accent (`#6E56CF`)**, **high-contrast navy-charcoal typography (`#1E1A30`)**, and **subtle violet-tinted multi-layered soft shadows**.

### 2.1 Complete CSS Variables & Reset (`src/index.css`)

```css
@import "tailwindcss";

/* ============================================================
   DESIGN SYSTEM TOKENS (CSS Variables)
   ============================================================ */
:root {
  /* Surface & Background Colors (Light, Soft Pastel) */
  --bg:        #f5f4fa;  /* Base application canvas background */
  --bg-raised: #faf9ff;  /* Elevated sections & sidebars */
  --bg-card:   #ffffff;  /* Primary card container */
  --bg-input:  #f0eef8;  /* Form field fills & tab backgrounds */
  --bg-hover:  #ebe8f5;  /* Subtle hover interactive states */

  /* Borders & Dividers */
  --border:        rgba(110, 86, 207, 0.10); /* Soft subtle divider */
  --border-strong: rgba(110, 86, 207, 0.20); /* Card / Input boundary */
  --border-accent: rgba(110, 86, 207, 0.40); /* Focused highlight / active tab */

  /* Typography Colors */
  --text-primary:   #1e1a30; /* High contrast navy-charcoal */
  --text-secondary: #6b6589; /* Subtitle / label text */
  --text-muted:     #a89fc4; /* Captions / placeholders */
  --text-accent:    #6e56cf; /* Accent highlight text */

  /* Primary Accent & Brand (Purple Violet #6E56CF) */
  --accent:       #6e56cf;
  --accent-dim:   rgba(110, 86, 207, 0.08);
  --accent-glow:  rgba(110, 86, 207, 0.16);

  /* Semantic Destructive & State Colors */
  --green:        #30a46c;                  /* Success Green */
  --green-bg:     rgba(48, 164, 108, 0.08);
  --green-border: rgba(48, 164, 108, 0.25);

  --amber:        #d97706;                  /* Warning Amber */
  --amber-bg:     rgba(217, 119, 6, 0.08);
  --amber-border: rgba(217, 119, 6, 0.25);

  --red:          #e5484d;                  /* Destructive Red */
  --red-bg:       rgba(229, 72, 77, 0.08);
  --red-border:   rgba(229, 72, 77, 0.20);

  /* Typography Stack */
  --font-ui:   'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Border Radii Hierarchy */
  --radius-sm: 6px;   /* Small elements (buttons, inputs, pills) */
  --radius-md: 10px;  /* Medium components (cards, list items, dropdowns) */
  --radius-lg: 14px;  /* Modals / Large cards / Workspace panes */
  --radius-xl: 20px;  /* Auth containers / Hero elements */

  /* Motion & Transitions */
  --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Multi-layered Soft Shadows (Violet-tinted) */
  --shadow-sm: 0 1px 4px rgba(110, 86, 207, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(110, 86, 207, 0.10), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 12px 40px rgba(110, 86, 207, 0.14), 0 4px 8px rgba(0, 0, 0, 0.04);
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--bg);
    color: var(--text-primary);
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
}
```

### 2.2 Core Utility Classes (`src/index.css`)

```css
/* Typography Utilities */
.font-ui { font-family: var(--font-ui); }
.font-mono { font-family: var(--font-mono); }

/* Buttons */
.btn {
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition);
}

.btn-primary {
  background: var(--accent);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(110, 86, 207, 0.30);
}
.btn-primary:hover {
  opacity: 0.94;
  box-shadow: 0 6px 20px rgba(110, 86, 207, 0.38);
}
.btn-primary:active { transform: scale(0.98); }

.btn-secondary {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-danger {
  background: var(--red);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(229, 72, 77, 0.30);
}
.btn-danger:hover {
  opacity: 0.94;
  box-shadow: 0 6px 20px rgba(229, 72, 77, 0.38);
}

/* Status Pills & Badges */
.status-pill {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1.2;
}

.status-active, .status-accent {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--border-strong);
}

.status-pending, .status-neutral {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.status-error, .status-red {
  background: var(--red-bg);
  color: var(--red);
  border: 1px solid var(--red-border);
}

.badge-kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.badge-kicker::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
}

/* Data Cards & Panels */
.panel-card, .data-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
}

.data-card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}

/* Form Controls */
.custom-input {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition), background-color var(--transition);
  width: 100%;
}
.custom-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
  background: var(--bg-card);
}
.custom-input::placeholder { color: var(--text-muted); }

/* Custom Scrollbars */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}
```

---

## 3. Spatial Layout Blueprints

### 3.1 Application Shell (`DashboardLayout.jsx`)

The application layout uses a non-scrolling, viewport-locked outer grid (`h-screen w-screen overflow-hidden`) with a fixed top header, fixed desktop sidebar, mobile drawer, and an independently scrollable main content view.

```jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import MobileSidebar from '../Components/MobileSidebar';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Top Navbar */}
      <Navbar 
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} 
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Mobile Drawer */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Fixed Desktop Sidebar */}
        <div className="hidden md:block h-full shrink-0">
          <Sidebar />
        </div>

        {/* Scrollable Workspace Content Area */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden custom-scrollbar p-3.5 sm:p-5 md:p-8 bg-[var(--bg)] min-w-0">
          <div className="max-w-[1280px] w-full min-w-0 mx-auto pb-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
```

### 3.2 Authentication Shell (`AuthLayout.jsx`)

```jsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { APP_NAME } from '../utils/constants';

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] p-6 relative overflow-hidden">
      {/* Soft Ambient Radial Background Glows */}
      <div 
        className="absolute -top-48 -left-48 w-[600px] h-[600px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(110, 86, 207, 0.08) 0%, transparent 65%)' }}
      />
      <div 
        className="absolute -bottom-48 -right-48 w-[600px] h-[600px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(110, 86, 207, 0.06) 0%, transparent 65%)' }}
      />

      <div className="w-full max-w-[440px] relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-mono font-semibold text-[14px] text-[var(--accent)] tracking-[0.06em]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span className="font-bold">{APP_NAME}</span>
          </Link>
        </div>

        {/* Card Container */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-xl)] p-8 sm:p-10 shadow-[var(--shadow-lg)] animate-slide-up">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
```

### 3.3 Master-Detail Split Studio Layout

For lab workspaces, management split panes, or configuration suites:
- **Parent Container**: `h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden gap-4`
- **Left Control Panel**: `w-full md:w-80 shrink-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] flex flex-col overflow-hidden`
- **Right Studio Panel**: `flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] flex flex-col overflow-hidden`

---

## 4. Key Component Architecture Blueprints

### 4.1 Granular Dynamic RBAC Route Guard (`DynamicPageRoute.jsx`)

Supports single-key, array fallback matching, strict role checks, loading states, and built-in access restriction fallbacks.

```jsx
import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Loader2 } from 'lucide-react';

export default function DynamicPageRoute({ pageKey, requiredRole, children }) {
  const { user, loading, permissionsLoading, hasPermission, permissions } = useAuth();
  const navigate = useNavigate();

  if (loading || permissionsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
          <span className="text-xs font-mono text-[var(--text-muted)]">Verifying session permissions...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role override check
  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    return <AccessRestrictedView onBack={() => navigate('/')} user={user} permissions={permissions} navigate={navigate} />;
  }

  // Dynamic permission check
  const isAllowed = !pageKey || hasPermission(pageKey);
  if (!isAllowed) {
    return <AccessRestrictedView onBack={() => navigate(-1)} user={user} permissions={permissions} navigate={navigate} />;
  }

  return children ? children : <Outlet />;
}

function AccessRestrictedView({ onBack, user, permissions, navigate }) {
  return (
    <div className="flex-1 min-h-[70vh] flex items-center justify-center p-6 animate-fadeIn">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-8 text-center shadow-[var(--shadow-lg)] space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Access Restricted</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Your role (<span className="font-mono text-[var(--accent)] uppercase font-semibold">{user?.role}</span>) does not currently have permission to access this view.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={onBack} className="btn btn-secondary text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => {
              const firstPermitted = permissions?.pages?.[0]?.path;
              navigate(firstPermitted || '/dashboard');
            }}
            className="btn btn-primary text-xs"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>My Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4.2 Dynamic Sidebar Navigation (`Sidebar.jsx`)

Renders navigation links dynamically based on server-provided RBAC permissions, with fallback menu sets per role.

```jsx
import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShieldCheck, LogOut, SlidersHorizontal, 
  Terminal, FileCode2, Database, Building2, CalendarCheck, 
  ClipboardCheck, FlaskConical, Headphones, Zap, BarChart3, Clock, Video, History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ICON_MAP = {
  LayoutDashboard, Users, ShieldCheck, SlidersHorizontal, Terminal,
  FileCode2, Database, Building2, CalendarCheck, ClipboardCheck,
  FlaskConical, Headphones, Zap, BarChart3, Clock, Video, History
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout, permissions } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navPages = useMemo(() => {
    if (permissions?.pages && Array.isArray(permissions.pages)) {
      return permissions.pages.filter(p => !p.path.includes(':'));
    }
    return null;
  }, [permissions?.pages]);

  const menuItems = navPages && navPages.length > 0
    ? navPages.map(page => ({
        name: page.name,
        path: page.path,
        icon: ICON_MAP[page.icon] || FileCode2,
      }))
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Practical Labs', path: '/labs', icon: FlaskConical },
        { name: 'My Bookings', path: '/my-bookings', icon: CalendarCheck },
      ];

  return (
    <aside className="w-64 h-full shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col justify-between p-4 shadow-[var(--shadow-sm)] overflow-y-auto custom-scrollbar">
      <nav className="space-y-1.5 pt-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-[13px] font-medium font-ui transition-all ${
                  isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold border border-[var(--border-accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-[var(--radius-sm)] text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] border border-[var(--border)] hover:border-[var(--red)]/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
```

### 4.3 Accessible Confirmation Modal (`ConfirmModal.jsx`)

```jsx
import React, { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconBg: "bg-[var(--red-bg)] text-[var(--red)] border-[var(--red-border)]",
      btnClass: "btn-danger",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      btnClass: "bg-amber-500 text-white hover:bg-amber-600",
    },
    primary: {
      icon: Info,
      iconBg: "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]",
      btnClass: "btn-primary",
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const IconComponent = currentVariant.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-lg)] animate-scaleUp relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${currentVariant.iconBg}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-base font-bold text-[var(--text-primary)] font-ui">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed font-ui">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--border)]">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading} 
            className="btn btn-secondary text-xs px-4"
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            disabled={loading} 
            className={`btn text-xs px-4 ${currentVariant.btnClass}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Global State Architecture (`AuthContext.jsx`)

The auth provider manages authentication state, permission keys, dynamic pages, superadmin overrides for `admin` role, and syncs permission updates in real time using a window event listener (`permissionsUpdated`).

```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({ allowedKeys: [], pages: [], defaultPage: null });
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      setPermissionsLoading(true);
      const res = await api.get('/auth/permissions');
      if (res.data?.success) {
        setPermissions({
          allowedKeys: res.data.allowed_keys || [],
          pages: res.data.pages || [],
          defaultPage: res.data.default_page || null
        });
      }
    } catch (err) {
      console.error('Failed to load RBAC permissions:', err);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        await fetchPermissions();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchPermissions]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Real-time permission event bus listener
  useEffect(() => {
    const handlePermissionsUpdated = () => fetchPermissions();
    window.addEventListener('permissionsUpdated', handlePermissionsUpdated);
    return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdated);
  }, [fetchPermissions]);

  const hasPermission = useCallback((pageKeys) => {
    if (!user) return false;
    if (user.role?.toLowerCase() === 'admin') return true; // Superadmin override
    if (!pageKeys) return true;

    const keysToCheck = Array.isArray(pageKeys) ? pageKeys : [pageKeys];
    return keysToCheck.some(key => permissions.allowedKeys.includes(key));
  }, [user, permissions.allowedKeys]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setPermissions({ allowedKeys: [], pages: [], defaultPage: null });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      permissions,
      permissionsLoading,
      hasPermission,
      checkAuth,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 6. HTTP API Layer (`src/api/axios.js`)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for session expiration handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 7. Frontend Directory Map

```
client/
├── public/                     # Favicons, static branding, fonts
├── src/
│   ├── api/
│   │   └── axios.js            # Axios client with credentials & interceptors
│   ├── Components/
│   │   ├── DynamicPageRoute.jsx# Granular RBAC Route Guard
│   │   ├── ProtectedRoute.jsx  # Authenticated boundary wrapper
      ├── ConfirmModal.jsx    # Accessible modal component
      ├── SearchableSelect.jsx# Keyboard-navigable grouped search dropdown
      ├── CodeEditor.jsx      # CodeMirror editor component
      ├── Sidebar.jsx         # Dynamic navigation menu
      ├── MobileSidebar.jsx   # Mobile slide-out drawer menu
      ├── Navbar.jsx          # Header with user avatar & menu toggle
      └── Skeleton.jsx        # Data shimmer loaders
│   ├── context/
│   │   └── AuthContext.jsx     # Global session & permission state
│   ├── Layout/
│   │   ├── DashboardLayout.jsx # Primary application shell layout
│   │   └── AuthLayout.jsx      # Centered card authentication shell
│   ├── Pages/                  # Modular view screens
│   │   ├── Auth/               # Login, Register, Password Reset
│   │   ├── Admin/              # Admin control panels & labs configuration
│   │   ├── User/               # Dashboards, bookings, submissions
│   │   └── Common/             # 404, Access Restricted views
│   ├── routes/
│   │   └── index.jsx           # Central React Router v7 route registry
│   ├── utils/                  # Helper formatters, date parsers, constants
│   ├── App.jsx                 # Global root provider wrapper
│   ├── index.css               # Design system variables, Tailwind imports, tokens
│   └── main.jsx                # Vite entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 8. Design System & Frontend Engineering Rules

1. **Strict CSS Token Adherence**:
   - Never hardcode arbitrary hex values for backgrounds, borders, or text colors. Always reference CSS variables (`var(--bg-card)`, `var(--border)`, `var(--accent)`, `var(--text-primary)`).
2. **Deterministic Height Management**:
   - Master studio panes and split panels must calculate exact height using `h-[calc(100vh-4rem)] overflow-hidden` and scroll sub-views with `custom-scrollbar`.
3. **Optimistic Action Safety**:
   - All destructive operations (deleting data, overriding roles, resetting configurations) must require a `ConfirmModal` prompt.
4. **Resilient Route Permission Fallbacks**:
   - Route guards must support array keys (`pageKey={['primary_key', 'fallback_key']}`) so that permission re-namings don't cause page lockouts.
5. **Mobile Responsiveness**:
   - Every view must test against mobile breakpoints (`md:hidden` sidebar drawer, full-width inputs, dynamic grid columns).
