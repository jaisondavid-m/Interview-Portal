# Universal Backend Architecture & API Specification

> **Purpose**: A universal, language-agnostic backend architecture blueprint, security specification, database design pattern, and REST API standard. Can be implemented in any backend programming language, framework, or runtime (e.g., Node.js/NestJS/Express, Python/FastAPI/Django, Go, Java/Spring Boot, C#/.NET, Rust, Ruby on Rails).

---

## 1. Architectural Principles & System Design

The backend follows a strict **Layered Architecture (Separation of Concerns)** with stateless request handling, distributed caching, and dynamic access control.

```
┌─────────────────────────────────────────────────────────────┐
│                       HTTP Client                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP Request (Cookie / JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Pipeline                      │
│   [CORS] ➔ [Rate Limiter] ➔ [Auth / Session] ➔ [RBAC Guard] │
└──────────────────────────────┬──────────────────────────────┘
                               │ Validated Context
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Routing Layer                           │
│   Dispatches endpoints to Controller / Handler functions    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Request Data Binding
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller / Handlers                     │
│   Input Validation ➔ Calls Business Service ➔ Standard JSON │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service / Business Layer                   │
│   Domain Logic, Calculations, Multi-Model Transactions      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Data Access / Repository Layer                │
│   Database Queries, Soft Deletes, Cache Interceptors        │
└───────────────────────┬─────────────────────────────┬───────┘
                        ▼                             ▼
         ┌────────────────────────────┐ ┌───────────────────────────┐
         │ Relational Database (SQL)  │ │ Fast In-Memory Cache (KV) │
         └────────────────────────────┘ └───────────────────────────┘
```

---

## 2. Universal Layered Directory Structure

```
backend/
├── config/                     # Environment configuration & secret loaders
├── controllers/ / handlers/    # HTTP layer: Parses input, invokes services, formats responses
├── middlewares/ / interceptors/# Auth verification, Rate limiting, CORS, Audit logging
├── models/ / entities/         # Data models, schema definitions, validation rules
├── routes/ / routers/          # Endpoint definitions, versioning, middleware binding
├── services/                   # Core business logic, transaction workflows, external integrations
├── database/ / repositories/   # Connection pools, auto-migration, seeders, query abstractions
└── utils/ / helpers/           # Cryptography, time formatting, string transformations
```

---

## 3. Security, Authentication & Dynamic RBAC

### 3.1 Token-Based Cookie Authentication
- Authentication tokens are generated containing `user_id`, `email`, `role`, and expiration timestamp (`exp`).
- Tokens are delivered via **HTTP-Only Cookies**:
  - `HttpOnly: true` (Shields token from JavaScript access, mitigating XSS extraction).
  - `Secure: true` (Enforces HTTPS transmission in production).
  - `SameSite: Lax` or `Strict` (Defends against cross-site request forgery).
  - `Path: "/"`

### 3.2 Dynamic Role-Based Access Control (RBAC) Architecture

Instead of hardcoding roles in source code, access permissions are modeled dynamically in database tables. This allows administrators to create new custom roles, modify page permissions, and toggle access in real time without redeploying code.

```sql
-- 1. Catalog of accessible pages / feature routes in the system
CREATE TABLE app_pages (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,       -- e.g. "admin_users", "analytics_dashboard"
    name VARCHAR(150) NOT NULL,             -- Human-readable name: "User Management"
    path VARCHAR(255) NOT NULL,             -- Route path: "/admin/users"
    icon VARCHAR(50) DEFAULT 'FileCode',
    category VARCHAR(100) DEFAULT 'General',-- Grouping: "Administration", "Workspace"
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

-- 2. System and custom user roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,       -- Normalized identifier: "admin", "moderator", "member"
    display_name VARCHAR(100) NOT NULL,     -- UI Label: "Administrator"
    description TEXT,
    default_page VARCHAR(255),              -- Landing route redirect after login
    is_system BOOLEAN DEFAULT false,        -- If true, cannot be deleted (prevents root lockout)
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

-- 3. Granular permission mapping matrix
CREATE TABLE role_page_permissions (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    page_key VARCHAR(100) NOT NULL,
    can_access BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT uq_role_page UNIQUE (role_name, page_key)
);
```

### 3.3 Authorization Guard Pseudo-Logic

```
function RequirePermission(requiredPageKeys[]):
    user = GetAuthenticatedUserFromSession()
    if not user:
        return HTTP 401 Unauthorized ("Authentication required")

    // Universal Superadmin Bypass
    if user.role == "admin":
        return Next() // Root administrator has unrestricted access

    // Query active permissions for user's role
    allowed = CheckDatabasePermissions(user.role, requiredPageKeys)
    if not allowed:
        return HTTP 403 Forbidden ("Access restricted: Role does not have permission")

    return Next()
```

### 3.4 Rate Limiting & Abuse Prevention
- Uses a distributed **Token-Bucket / Sliding-Window** algorithm keyed by `ratelimit:{tier_or_scope}:{identifier}` (where identifier is User ID or Client IP).
- Configurable rate tiers:
  - **Public / Unauthenticated**: e.g., 60 requests / minute.
  - **Authenticated Standard User**: e.g., 180 requests / minute.
  - **Elevated / Administrator**: e.g., 600 requests / minute.
  - **Internal / Daemon Tasks**: e.g., 2000 requests / minute.

---

## 4. Database Lifecycle & Self-Healing Seed Pipeline

On backend application startup, the database connection initializes a self-healing lifecycle:

```
[Server Starts]
       │
       ▼
1. Auto-Migration Phase
   └── Create or update table structures, column types, and composite indexes.
       │
       ▼
2. App Catalog Synchronization Phase
   └── Register newly added routes/pages into `app_pages` table without overwriting customizations.
       │
       ▼
3. Role & Permission Matrix Sync Phase
   └── Ensure all existing roles have explicit `true`/`false` permission records for all registered pages.
       │
       ▼
4. Default System Settings Seeding Phase
   └── Verify global key-value configuration flags (e.g. feature flags, auth toggles) exist.
       │
       ▼
5. Relational Data Backfilling Phase
   └── If new sub-entities are added to parent models, backfill default initial records to prevent null errors.
       │
       ▼
[Ready for Incoming Traffic]
```

### 4.1 Safe Relational Backfilling Principle
When extending a parent entity to support multiple sub-items/variants (e.g., Parent $\rightarrow$ Multiple Variants), the startup migration must check if any parent lacks sub-records and automatically create an initial default sub-record, ensuring legacy queries and past submissions never break.

---

## 5. REST API Standards & Response Contracts

### 5.1 Standardized JSON Response Envelope

All API endpoints must return a predictable, uniform JSON structure:

#### Single Entity / Action Success
```json
{
  "status": "success",
  "message": "Resource updated successfully",
  "data": {
    "id": 101,
    "title": "Example Title",
    "updated_at": "2026-09-23T10:00:00Z"
  }
}
```

#### Paginated List / Collection Success
```json
{
  "status": "success",
  "data": {
    "items": [
      { "id": 1, "name": "Item A" },
      { "id": 2, "name": "Item B" }
    ],
    "total": 48,
    "page": 1,
    "per_page": 20
  }
}
```

#### Error Response
```json
{
  "status": "error",
  "message": "Validation failed on input payload",
  "error": "Field 'title' is required and cannot be empty"
}
```

### 5.2 HTTP Status Code Standard
- `200 OK`: Successful read, update, or action execution.
- `201 Created`: Entity successfully created.
- `400 Bad Request`: Payload validation error, missing fields, or malformed JSON.
- `401 Unauthorized`: Session cookie missing, expired, or invalid.
- `403 Forbidden`: Authenticated user lacks permission in the RBAC matrix.
- `404 Not Found`: Target resource ID does not exist.
- `429 Too Many Requests`: Rate limit threshold exceeded.
- `500 Internal Server Error`: Unhandled server runtime exception.

---

## 6. Route Mounting & Versioning Architecture

APIs must be organized into logical, versioned router groups:

```
/
├── /auth/                      # Public & session endpoints
│   ├── POST /login             # Issues HTTP-only cookie
│   ├── POST /logout            # Clears HTTP-only cookie
│   ├── GET  /me                # Returns current session profile
│   └── GET  /permissions       # Returns allowed page keys & permitted paths
├── /api/v1/                    # Version 1 Resource API (Protected by Auth)
│   ├── /workspace/             # User workspace features
│   │   ├── GET  /items         # List items
│   │   └── POST /items/:id/run # Execute item
│   ├── /admin/                 # Administrative management (Protected by RBAC)
│   │   ├── GET  /roles/mappings# Full Role × Page permission matrix
│   │   ├── PUT  /roles/permissions # Update role access toggles
│   │   └── GET  /users         # Account management
└── /health                     # Liveness / Readiness probe
```

---

## 7. Backend Engineering & Code Quality Best Practices

1. **Transaction Boundaries**: Wrap multi-step relational operations (e.g. creating parent entity, assigning sub-items, updating counters, and writing audit logs) in a single database transaction. If any step fails, roll back completely.
2. **Sensitive Field Shielding**: Never expose password hashes, internal secret tokens, or private keys in response models or logs.
3. **Soft Deletion (`deleted_at`)**: Use soft deletes on primary entities to preserve relational audit trails and prevent accidental permanent data destruction.
4. **Deterministic Sorting**: Always specify an explicit sort order (e.g., `ORDER BY order_index ASC, id ASC` or `ORDER BY created_at DESC`) on collection endpoints to prevent randomized pagination shifts.
5. **Input Validation Before Execution**: Validate payload types, lengths, required fields, and JSON format at the controller entry point before delegating to service logic.
6. **Graceful Shutdown**: Intercept termination signals (`SIGINT`, `SIGTERM`) to finish pending requests and close database connection pools cleanly before exiting.
