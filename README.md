# 🚀 MockMate — Distributed Peer-to-Peer Technical Interview & Lab Engineering Platform

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MySQL Cluster](https://img.shields.io/badge/MySQL-8.0_HA_Cluster-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![Redis](https://img.shields.io/badge/Redis-7.0_Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose_V2-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org)
[![Zero Downtime](https://img.shields.io/badge/Deploy-Blue--Green_Zero_Downtime-brightgreen?style=for-the-badge)](./BLUE_GREEN_GUIDE.md)
[![WebRTC](https://img.shields.io/badge/WebRTC-Audio_Signaling-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)

> **Enterprise-grade, distributed mock interview and academic evaluation platform engineered with Go, React 19, MySQL Primary-Replica Clustering, Automated GTID Failover, and Zero-Downtime Blue-Green Deployment.**

---

## 📌 Executive Summary: What Problem Does MockMate Solve?

Preparing for top-tier technical interviews is traditionally broken:
- **One-Sided Practice:** Students usually practice alone or pay expensive fees for single mock sessions without understanding the interviewer’s evaluation mindset.
- **Cognitive Bias & Anxiety:** Face-to-face peer interviews often introduce intimidation, social friction, and unconscious bias.
- **Lack of Realistic Infrastructure:** Candidates rarely get hands-on experience defending distributed system topologies, running live SQL queries, or handling edge-case test validations under timed pressure.
- **Academic Evaluation Bottlenecks:** University computer science departments struggle to conduct scalable, authenticated, anti-cheat lab examinations with individual question randomization.

### The Solution:
**MockMate** is a high-availability, double-blind peer interview and lab engineering platform featuring:
1. **Automated Peer Role-Reversal:** Every interview session splits into two balanced rounds. In Round 1, Student A interviews Student B; at the halfway mark, the platform triggers an automatic **Role Swap**, turning Student B into the interviewer and Student A into the candidate.
2. **Anonymous Double-Blind Collaboration:** Real-time WebRTC audio without video or personally identifiable names, removing bias while simulating realistic remote phone/voice technical screenings.
3. **Four Domain-Specific Interactive Workspaces:**
   - 🏗️ **System Design Studio:** Collaborative drag-and-drop cloud architecture canvas with protocol link modeling.
   - 🗄️ **Database Sandbox:** Dedicated, isolated MySQL sandbox for executing live SQL queries, indexing analysis, and ER schema modeling.
   - 💻 **Algorithm Code Lab:** Multi-language live editor (C++, Java, Python, JavaScript) with test runner validation.
   - ⚡ **MCQ Speed Arena:** Real-time observer view with instant rationale benchmarks.
4. **Institutional Academic Lab Management:** Complete course experiment mapping, randomized question variant allocation, physical venue attendance gatekeeping, automated grading rubrics, and PDF lab record generation.

---

## 🏛️ System Architecture & Distributed Design

MockMate is architected with strict separation of concerns, high-concurrency stateless services, read/write splitting, and self-healing infrastructure.

```
                              [ Public Clients / University Labs ]
                                                │
                                                ▼
                                [ Cloudflare Tunnel / Public Ingress ]
                                                │
                                                ▼
                              ┌───────────────────────────────────┐
                              │     Nginx Gateway / Router        │
                              │      (Port 80 / Reverse Proxy)    │
                              └─────────────────┬─────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        │ Dynamic Upstream Switch                       │
                        ▼ (ACTIVE)                                      ▽ (STANDBY / Testing)
           ┌─────────────────────────┐                     ┌─────────────────────────┐
           │      app-blue (Go)      │                     │     app-green (Go)      │
           │ Container :8080 | :8081 │                     │ Container :8080 | :8082 │
           └────────────┬────────────┘                     └────────────┬────────────┘
                        │                                               │
                        └───────────────────────┬───────────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         │                                      │                                      │
         ▼                                      ▼                                      ▼
┌──────────────────┐                 ┌────────────────────┐                 ┌─────────────────────┐
│  Redis Cache &   │                 │ Gorilla WebSockets │                 │ Isolated SQL DB     │
│  Rate Limiting   │                 │ & WebRTC Signaling │                 │ Sandbox (Port 3309) │
│   (Port 6379)    │                 │ (Low-latency Audio)│                 │ (Arbitrary DDL/DML) │
└──────────────────┘                 └────────────────────┘                 └─────────────────────┘
                                                │
                                                ▼
                             ┌──────────────────────────────────────┐
                             │    High-Availability MySQL Cluster   │
                             └──────────────────┬───────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        │                                               │
     [Writes: INSERT / UPDATE / DELETE]                         [Reads: SELECT via GORM DBResolver]
                        ▼                                               ▼
          ┌───────────────────────────┐                   ┌───────────────────────────┐
          │     MySQL Primary (RW)    │                   │   MySQL Read Replica 1    │
          │         Port: 3306        ├─ GTID Replication ┼─►       Port: 3307        │
          └─────────────┬─────────────┘                   └───────────────────────────┘
                        │                                               │
                        │ GTID Replication                ┌─────────────┴─────────────┐
                        └─────────────────────────────────┼─►   MySQL Read Replica 2  │
                                                          │         Port: 3308        │
                                                          └───────────────────────────┘
                                                                        ▲
                                                                        │
                                       ┌────────────────────────────────┴─────────────┐
                                       │    Self-Healing Failover Daemon (Python)     │
                                       │ • 3-second heartbeat health probes           │
                                       │ • Automatic promotion of highest GTID node   │
                                       │ • Reconfigures surviving replicas to Primary │
                                       └──────────────────────────────────────────────┘
```

---

## 💎 Professional Engineering Highlights

### 1. 🔄 Zero-Downtime Blue-Green Deployment Engine
MockMate uses a custom containerized Blue-Green deployment architecture that eliminates release downtime and prevents broken builds from hitting production users.

- **Dual Parallel Environments:** Two identical Go backend containers (`mockmate-app-blue` on port 8081 and `mockmate-app-green` on port 8082) run concurrently.
- **Atomic Nginx Upstream Switching:** Nginx routes traffic via an included configuration snippet (`active_upstream.conf`). During deployment, traffic shifts instantaneously via an in-memory worker reload (`nginx -s reload`) without terminating in-flight connections.
- **Automated Pre-Flight Health Probing:** The [`deploy.sh`](./deploy.sh) script builds and boots the idle environment, then executes automated health probes (`/health`) over 30 retries. If the candidate fails to respond or database ping fails, deployment halts immediately and the active version remains untouched.
- **Sub-Second Instant Rollback:** If an anomaly is observed post-deployment, [`rollback.sh`](./rollback.sh) re-points Nginx to the standby container within **< 1 second** without rebuilding Docker images.
- **Jenkins CI/CD Automation:** A production-ready declarative [`Jenkinsfile`](./Jenkinsfile) automates git checkout, containerized test execution (`go test`), zero-downtime blue-green rollout, and ingress telemetry verification.

---

### 2. 🛡️ High-Availability MySQL Cluster with Read/Write Splitting & Auto-Failover
To handle intensive query loads from synchronous interview sessions and institutional lab cohorts, MockMate implements an enterprise data architecture:

#### A. Intelligent Read/Write Splitting (`GORM DBResolver`)
- **Master / Primary Node (`:3306`):** Dedicated exclusively to write operations (`INSERT`, `UPDATE`, `DELETE`, schema migrations, and transactional locks).
- **Read Replica Nodes (`:3307`, `:3308`):** Handle read traffic (`SELECT`) with load balanced across replicas using `RandomPolicy`.
- **Connection Pooling Optimization:** High-concurrency tuning (`SetMaxOpenConns: 500`, `SetMaxIdleConns: 50`, `SetConnMaxLifetime: 1 hour`).

#### B. GTID-Based Asynchronous Replication
- Replicas synchronize with the primary node using Global Transaction Identifiers (`gtid-mode=ON`, `enforce-gtid-consistency=ON`, `binlog-format=ROW`).
- Ensures exact transaction tracking across the cluster without relying on brittle log file offsets.

#### C. Self-Healing Topology Failover Daemon (`failover_manager.py`)
A standalone Python supervisor daemon monitors the health of the database cluster:
1. **Heartbeat Probes:** Pings Primary, Replica 1, and Replica 2 every 3 seconds.
2. **Failure Detection:** If the Primary fails 3 consecutive health checks:
   - Queries `@@GLOBAL.gtid_executed` on all surviving replicas.
   - Elects the replica with the most up-to-date transaction log to guarantee zero data loss.
   - Promotes the winner to **New Primary** (`STOP REPLICA`, `SET GLOBAL read_only = OFF`, `SET GLOBAL super_read_only = OFF`).
   - Dynamically reconfigures the remaining replica to follow the New Primary via `CHANGE REPLICATION SOURCE TO ... SOURCE_AUTO_POSITION=1`.
   - Re-seeds a replacement standby node to restore full cluster redundancy.

---

### 3. 🧪 Isolated Database Sandbox Engine
Candidates practicing database engineering must be free to create tables, alter schemas, and run complex SQL joins without jeopardizing the core application database.
- MockMate spins up an **isolated MySQL sandbox container (`:3309`)** dedicated solely to candidate runtime queries.
- Each interview session dynamically generates an ephemeral schema namespace.
- High-risk operations (e.g. attempting to read host configuration or access system tables) are isolated inside the sandbox boundary.

---

### 4. ⚡ Low-Latency Real-Time Audio & Collaborative Workspaces
- **WebRTC Voice Channels:** Peer-to-peer browser audio connection managed through a lightweight Go WebSocket signaling server (`gorilla/websocket`).
- **Live Canvas State Synchronization:** High-frequency bi-directional socket events keep code editor inputs, diagram node coordinates, and question state synchronized between the candidate and the interviewer in real time.
- **Audio Session Archiving:** Compressed audio tracks are recorded and uploaded to persistent volume storage for subsequent faculty auditing and candidate performance review.

---

### 5. 🔐 Dynamic RBAC & Production Security Standards
- **Dynamic Database-Driven RBAC:** Permissions are not hardcoded in source code. Route privileges and navigation visibility are mapped dynamically in `app_pages`, `roles`, and `role_page_permissions` tables, allowing administrators to customize access tiers without redeploying code.
- **Hardened Cookie Authentication:** Session tokens are delivered through HTTP-Only, Secure, SameSite cookies to defend against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).
- **Redis Sliding-Window Rate Limiting:** High-frequency endpoints (auth, compilation, matchmaking) are throttled via an atomic Redis sliding-window algorithm to neutralize brute-force attacks and resource exhaustion.

---

## 💻 Tech Stack & Architectural Matrix

| Layer | Technologies & Frameworks | Rationale |
| :--- | :--- | :--- |
| **Backend Core** | **Go 1.23**, Gin Web Framework | High-throughput, low-memory footprint, sub-millisecond route dispatching |
| **ORM & Persistence**| **GORM**, GORM DBResolver | Fluent relational mapping with native read/write replica routing |
| **Primary Database** | **MySQL 8.0 (Leader)** | ACID-compliant transactional consistency, GTID replication logging |
| **Read Replicas** | **2x MySQL 8.0 (Followers)** | Horizontal read scalability for dashboards, analytics, and question banks |
| **Cache & Throttling**| **Redis 7 (Alpine)** | In-memory session state, rate-limiting counters, fast-path key-value store |
| **Frontend** | **React 19**, Vite, Tailwind CSS | Modern reactive UI, fast tree-shaking, lightweight bundles |
| **Code & Diagramming**| CodeMirror 6, Canvas API | Syntax highlighting for multi-language evaluation and interactive architecture nodes |
| **Real-Time** | WebRTC, Gorilla WebSockets | Peer-to-peer low-latency voice and bi-directional canvas state sync |
| **Gateway & Ingress** | **Nginx**, Cloudflare Tunnel | Reverse proxy, static asset delivery, SSL termination, Blue-Green routing |
| **DevOps & CI/CD** | Docker Compose V2, Jenkins, Bash | Containerized reproducibility, automated tests, zero-downtime rollout |

---

## 📂 Project Directory Layout

```
mock-mate/
├── .env.example                     # Environment template for ports, secrets & DB credentials
├── docker-compose.yml               # Complete orchestration: Primary, 2 Replicas, Redis, Blue, Green, Client
├── docker-compose.db-cluster.yml    # Standalone DB cluster configuration
├── deploy.sh                        # Automated Blue-Green zero-downtime deployment runner
├── rollback.sh                      # Instant sub-second rollback script
├── Jenkinsfile                      # Declarative CI/CD pipeline definition
├── BLUE_GREEN_GUIDE.md              # In-depth Blue-Green testing & simulation runbook
├── APPLICATION_FLOW.md              # End-to-end user journeys & interview mode breakdowns
│
├── client/                          # React 19 Frontend Application
│   ├── src/
│   │   ├── Components/              # Modular UI components (Navbar, Sidebar, Modals)
│   │   ├── Pages/                   # Core views (Dashboard, Matchmaking, Admin, Labs)
│   │   │   ├── InterviewRoom/       # 4 Interactive interview workspaces
│   │   │   └── Labs/                # University lab scheduling & evaluation
│   │   └── services/                # Axios API services & WebSocket connectors
│   ├── nginx.conf                   # In-container Nginx router configuration
│   └── Dockerfile                   # Multi-stage production build (Node -> Nginx Alpine)
│
├── server/                          # Go (Gin) High-Performance Backend
│   ├── cmd/api/main.go              # Backend application entrypoint
│   ├── config/                      # Environment parser & connection config
│   ├── controllers/                 # HTTP controllers (Auth, Interview, Labs, Matchmaking)
│   ├── database/                    # Connection pool, GORM migrations & Redis client
│   │   ├── db.go                    # Primary & Read-Replica DBResolver initialization
│   │   └── redis.go                 # Redis client & sliding-window rate limiters
│   ├── middlewares/                 # Auth guards, CORS, Audit logging, Rate limiters
│   ├── models/                      # Database relational schemas & GORM structs
│   ├── routes/                      # API endpoint definitions and route grouping
│   └── Dockerfile                   # Minimal Go production container
│
└── infrastructure/                  # Infrastructure Configuration & Tooling
    ├── mysql/                       # MySQL custom my.cnf configuration
    │   ├── primary/my.cnf           # Binary logging & GTID master settings
    │   ├── replica/my.cnf           # Read-only follower configurations
    │   └── init-scripts/            # Cluster replication bootstrap scripts
    ├── nginx/                       # Gateway configuration & upstream definitions
    │   ├── active_upstream.conf     # Dynamic link swapped during Blue-Green deployments
    │   ├── upstream_blue.conf       # Upstream mapping for app-blue (:8081)
    │   └── upstream_green.conf      # Upstream mapping for app-green (:8082)
    └── scripts/
        ├── failover_manager.py      # Self-healing MySQL failover & election daemon
        └── cluster_ctl.sh           # Manual DB cluster management utility
```

---

## ⚡ Quick Start & Local Execution

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+) & [Docker Compose](https://docs.docker.com/compose/) (v2+)
- [Git](https://git-scm.com/)

### 2. Clone & Setup Configuration
```bash
git clone https://github.com/jaisondavid-m/Interview-Portal.git mock-mate
cd mock-mate

# Copy example environment configuration
cp .env.example .env
```

### 3. Launch Full Infrastructure
Boot the entire distributed system (MySQL Primary, 2 Replicas, Redis, Sandbox DB, Failover Daemon, Blue App, and Nginx Gateway):

```bash
docker compose up -d --build
```

Verify service status:
```bash
docker compose ps
```

The system will be accessible at:
- **Web Application / Gateway:** `http://localhost` (Port 80)
- **Active Backend Health API:** `http://localhost/health`
- **Active Version Endpoint:** `http://localhost/version`
- **Blue Instance (Direct):** `http://localhost:8081`
- **Green Instance (Direct):** `http://localhost:8082`
- **MySQL Primary (RW):** `localhost:3306`
- **MySQL Read Replicas (RO):** `localhost:3307`, `localhost:3308`
- **Sandbox DB:** `localhost:3309`

---

## 🧪 Testing Blue-Green Deployments & Database Failover

### A. Execute a Zero-Downtime Deployment
Deploy a new release to the inactive environment and verify traffic cutover:

```bash
# Make scripts executable
chmod +x deploy.sh rollback.sh

# Deploy release v2.0.0
./deploy.sh v2.0.0
```
**What happens under the hood:**
1. Detects `app-blue` is active; sets target to `app-green`.
2. Builds and starts `mockmate-app-green`.
3. Polls `http://localhost:8082/health` until HTTP 200 is confirmed.
4. Updates `active_upstream.conf` to target `app-green`.
5. Signals Nginx with `nginx -s reload`. Active traffic is now on Green with **0 lost requests**.

### B. Execute an Instant Rollback
```bash
./rollback.sh
```
*Instantly shifts Nginx traffic back to the standby Blue container in under 1 second.*

### C. Simulate Database Primary Failure (Auto-Failover Test)
```bash
# 1. Stop the Primary MySQL container
docker stop mockmate-mysql-primary

# 2. Inspect the Failover Manager logs in real time
docker logs -f mockmate-failover-manager
```
**Expected Behavior:**
- The daemon detects loss of node 3306.
- Compares GTID positions between Replica 1 and Replica 2.
- Promotes the most advanced replica to **Primary** (`read_only=OFF`).
- Instructs the other replica to replicate from the new master.
- Backend reads and writes continue functioning without manual intervention.

---

## 🎯 Recruiter & Engineering Review Checklist

| Feature | Implementation Highlights |
| :--- | :--- |
| **High Availability Architecture** | Zero single point of failure; multi-node DB clustering with automated failover daemon. |
| **Zero Downtime Deployments** | Production Blue-Green deployment workflow with automated health checking and instant rollback. |
| **Database Scalability** | Read/write query splitting via GORM DBResolver; GTID-based replication across MySQL followers. |
| **Real-time Distributed Systems** | WebRTC signaling and bidirectional WebSocket state synchronization for collaborative canvases. |
| **Sandboxed Code Execution** | Dedicated, isolated containerized database sandbox for secure, multi-tenant candidate queries. |
| **Security & Authorization** | Cookie-based HTTP-only session management with database-driven dynamic RBAC and Redis rate limiting. |
| **CI/CD Automation** | Comprehensive Jenkins pipeline with containerized automated testing and ingress telemetry. |

---

## 📄 License
This project is open-source and distributed under the [MIT License](LICENSE).

