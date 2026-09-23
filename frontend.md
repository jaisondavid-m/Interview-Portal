# Comprehensive Frontend Design System & Architecture Specification

> **Purpose**: A production-grade frontend architecture blueprint, design system specification, and component guideline for building state-of-the-art, visually stunning, and highly responsive web applications.

---

## 1. Design System & Visual Tokens

The design system is based on a modern **elevated light/pastel surface hierarchy** contrasted with a **vibrant violet-purple primary brand**, **slate-charcoal typography**, and **subtle multi-layered colored shadows**.

### 1.1 Core CSS Variables (`index.css`)

```css
:root {
  /* Surface & Background Hierarchy */
  --bg:            #f5f4fa;  /* Base application background */
  --bg-raised:     #faf9ff;  /* Elevated sections & sidebars */
  --bg-card:       #ffffff;  /* Primary card container */
  --bg-input:      #f0eef8;  /* Form field fills & pills */
  --bg-hover:      #ebe8f5;  /* Subtle hover interactive states */

  /* Borders & Dividers */
  --border:        rgba(110, 86, 207, 0.10); /* Soft dividers */
  --border-strong: rgba(110, 86, 207, 0.20); /* Card / Input boundary */
  --border-accent: rgba(110, 86, 207, 0.40); /* Focused highlight */

  /* Typography Colors */
  --text-primary:   #1e1a30; /* High-contrast navy-charcoal */
  --text-secondary: #6b6589; /* Subtitle / label text */
  --text-muted:     #a89fc4; /* Captions / placeholders */
  --text-accent:    #6e56cf; /* Accent highlight text */

  /* Primary Brand & Accent */
  --accent:       #6e56cf;                  /* Radiant Purple-Violet */
  --accent-dim:   rgba(110, 86, 207, 0.08); /* Dim accent background */
  --accent-glow:  rgba(110, 86, 207, 0.16); /* Focus glow */

  /* Semantic State Colors */
  --green:        #30a46c;                  /* Success Green */
  --green-bg:     rgba(48, 164, 108, 0.08);
  --green-border: rgba(48, 164, 108, 0.25);

  --amber:        #d97706;                  /* Warning Amber */
  --amber-bg:     rgba(217, 119, 6, 0.08);
  --amber-border: rgba(217, 119, 6, 0.25);

  --red:          #e5484d;                  /* Destructive Red */
  --red-bg:       rgba(229, 72, 77, 0.08);
  --red-border:   rgba(229, 72, 77, 0.20);

  /* Typography */
  --font-ui:   'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Border Radii Hierarchy */
  --radius-sm: 6px;   /* Small controls (buttons, inputs, pills) */
  --radius-md: 10px;  /* Medium elements (dropdowns, cards, list items) */
  --radius-lg: 14px;  /* Large panels (modals, master-detail panes) */
  --radius-xl: 20px;  /* Auth containers / Hero elements */

  /* Animation Timings */
  --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Violet-Tinted Multi-Layered Shadows */
  --shadow-sm: 0 1px 4px rgba(110, 86, 207, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(110, 86, 207, 0.10), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 12px 40px rgba(110, 86, 207, 0.14), 0 4px 8px rgba(0, 0, 0, 0.04);
}
```

---

## 2. Typography & Spatial Layout Rules

### 2.1 Font Pairing Principles
- **Headings & Body UI**: Use `Plus Jakarta Sans` or `Inter` (`font-ui`) with crisp weights (`500` for body, `600` for subtitles/labels, `700` for titles).
- **Technical & Metric Data**: Use `JetBrains Mono` (`font-mono`) for codes, IDs, badge kickers, numbers, timestamps, and test metrics.

### 2.2 Reusable CSS Utility Classes

```css
/* Typography */
.font-ui { font-family: var(--font-ui); }
.font-mono { font-family: var(--font-mono); }

/* Buttons */
.btn {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition);
  cursor: pointer;
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
  border-color: var(--border-strong);
}

.btn-danger {
  background: var(--red);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(229, 72, 77, 0.30);
}

/* Status Badges & Pills */
.status-pill {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.status-active {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--border-accent);
}
.status-success {
  background: var(--green-bg);
  color: var(--green);
  border: 1px solid var(--green-border);
}
.status-warning {
  background: var(--amber-bg);
  color: var(--amber);
  border: 1px solid var(--amber-border);
}
.status-error {
  background: var(--red-bg);
  color: var(--red);
  border: 1px solid var(--red-border);
}

/* Custom Scrollbars */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
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

## 3. Component Architecture & UI Patterns

### 3.1 Application Shell Layout (`DashboardLayout`)
- **Fixed Top Header (Height: `4rem` / `64px`)**:
  - Left: Application logo and portal title badge.
  - Right: Current user avatar pill, role badge, session status, notifications.
- **Left Navigation Sidebar (Width: `16rem` / `256px`)**:
  - Dynamically renders navigation links loaded from user permissions.
  - Highlights active route with `bg-[var(--accent-dim)]`, border glow, and accent text.
  - Sticky bottom Sign Out button.
- **Main Viewport (`h-[calc(100vh-4rem)] overflow-y-auto`)**:
  - Content container with standardized padding (`p-6` or master-detail split `h-full overflow-hidden`).

### 3.2 Master-Detail Split Workspace Pattern
For complex editing, evaluation, or management workflows:
- **Left Column (`w-[40%-45%]` or `lg:col-span-4`)**:
  - Searchable list of items.
  - Active selection indicator with accent left-bar or full highlight ring.
  - Quick action buttons (Add, Filter).
- **Right Studio Column (`w-[55%-60%]` or `lg:col-span-8`)**:
  - Item detail header with status pill and primary save/delete actions.
  - Tabbed sub-sections (`details`, `configuration`, `preview`, `logs`).
  - Side-by-side comparative diff viewers.

### 3.3 Dynamic Route & Role Permission Guard (`DynamicPageRoute`)

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
          <span className="text-xs font-mono text-[var(--text-muted)]">Verifying access...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Strict role check
  if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
    return <AccessRestrictedView onBack={() => navigate('/')} />;
  }

  // Dynamic granular permission check
  const isAllowed = !pageKey || hasPermission(pageKey);
  if (!isAllowed) {
    return (
      <div className="flex-1 min-h-[70vh] flex items-center justify-center p-6 animate-fadeIn">
        <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Access Restricted</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Your role (<span className="font-mono text-[var(--accent)] uppercase font-semibold">{user.role}</span>) does not currently have permission to access this page.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
            <button
              onClick={() => {
                const firstPermitted = permissions?.pages?.[0]?.path;
                navigate(firstPermitted || '/');
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

  return children ? children : <Outlet />;
}
```

### 3.4 Searchable Select Dropdown (`SearchableSelect`)
- Full keyboard and text filter support.
- Category group demarcation with badge indicators.
- Outside-click listener and escape-key dismissal.
- Highlight match styling.

### 3.5 Confirmation Modal (`ConfirmModal`)
- Full accessible portal rendering.
- Danger / Warning / Primary visual themes.
- Escape key and backdrop click detection.
- Asynchronous action loader indicator (`loading={isDeleting}`).

---

## 4. State Management & Authentication (`AuthContext`)

### 4.1 Architecture
- Centralized `AuthContext.jsx` handling:
  - User session state (`user`, `isAuthenticated`).
  - Allowed permissions map (`permissions.allowedKeys`, `permissions.pages`, `permissions.defaultPage`).
  - Automatic silent refresh on session checks.
  - Window event bus listener for real-time permission sync (`window.addEventListener('permissionsUpdated', ...)`).
  - Centralized `hasPermission(keyOrArray)` supporting single keys or multi-key fallback matching.

```javascript
const hasPermission = useCallback((pageKeys) => {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  if (role === 'admin') return true; // Superadmin override
  if (!pageKeys) return true;

  const keysToCheck = Array.isArray(pageKeys) ? pageKeys : [pageKeys];
  return keysToCheck.some(key => permissions.allowedKeys.includes(key));
}, [user, permissions.allowedKeys]);
```

---

## 5. Frontend Directory Structure

```
client/
├── public/                     # Static assets, icons, fonts
├── src/
│   ├── api/
│   │   └── axios.js            # Axios client with interceptors & withCredentials: true
│   ├── Components/
│   │   ├── DynamicPageRoute.jsx# Granular RBAC Route Guard
│   │   ├── ProtectedRoute.jsx  # Authenticated session boundary
│   │   ├── ConfirmModal.jsx    # Accessible modal dialog
│   │   ├── SearchableSelect.jsx# Keyboard-navigable dropdown
│   │   ├── CodeEditor.jsx      # Monaco-based editor wrapper
│   │   ├── Sidebar.jsx         # Dynamic navigation menu
│   │   └── Topbar.jsx          # User status & actions bar
│   ├── context/
│   │   └── AuthContext.jsx     # Global authentication & permissions provider
│   ├── layouts/
│   │   └── DashboardLayout.jsx # Master application shell layout
│   ├── Pages/                  # Route views
│   │   ├── Auth/
│   │   ├── Admin/
│   │   ├── User/
│   │   └── Common/
│   ├── routes/
│   │   └── index.jsx           # Central React Router v6 tree with guards
│   ├── utils/                  # Helper formatters, date parsers, math utils
│   ├── App.jsx                 # Provider root
│   ├── index.css               # Design system tokens, utilities & reset
│   └── main.jsx                # Entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 6. Frontend Code Quality & Engineering Rules

1. **Strict CSS Token Usage**: Never hardcode random hex values for backgrounds, borders, or text. Always reference `var(--bg-card)`, `var(--border)`, `var(--accent)`, `var(--text-primary)`.
2. **Deterministic Layout Heights**: Master studio pages should calculate exact height: `h-[calc(100vh-4rem)] overflow-hidden` with scrollable sub-panels (`overflow-y-auto custom-scrollbar`).
3. **Optimistic & Safe Actions**: Destructive actions (deletes, resets, overrides) must always trigger a confirmation modal with distinct danger styling.
4. **Resilient Routing**: All route definitions must pair path definitions with array-compatible `pageKey={['primary_key', 'fallback_key']}` in `DynamicPageRoute` to prevent role lockout.
