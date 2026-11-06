# 🚀 Interview Portal Blue-Green Deployment Guide

This document explains the **Blue-Green Deployment Architecture** for Interview Portal, how zero-downtime traffic switching works through **Nginx** and **Cloudflare Tunnel**, how to deploy new versions, execute instant rollbacks, and simulate failure scenarios.

---

## 📐 Architecture Overview

```
                                [ Public Internet ]
                                         │
                                         ▼
                        [ Cloudflare Tunnel (cloudflared) ]
                                         │
                                         ▼
                           [ Nginx Reverse Proxy / Gateway ]
                                  (Host Port: 80)
                                         │
                     ┌───────────────────┴───────────────────┐
                     │                                       │
                     ▼ (ACTIVE Upstream)                     ▽ (STANDBY / Testing)
           ┌───────────────────┐                   ┌───────────────────┐
           │     app-blue      │                   │    app-green      │
           │  (mockmate-app-   │                   │  (mockmate-app-   │
           │       blue)       │                   │      green)       │
           │  Container : 8080 │                   │  Container : 8080 │
           │  Host Port : 8081 │                   │  Host Port : 8082 │
           └─────────┬─────────┘                   └─────────┬─────────┘
                     │                                       │
                     └───────────────────┬───────────────────┘
                                         ▼
                      [ Shared Data & Cache Infrastructure ]
                      ├─ MySQL Primary (RW)          : 3306
                      ├─ MySQL Replica 1 (RO)        : 3307
                      ├─ MySQL Replica 2 (RO)        : 3308
                      ├─ DB Failover Manager         : Daemon
                      ├─ Redis Cache & Rate Limiter  : 6379
                      └─ Sandbox MySQL Playground    : 3309
```

---

## 🎯 Why Blue-Green Deployment?

| Feature | Standard In-Place Restart | Blue-Green Deployment |
| :--- | :--- | :--- |
| **Downtime** | ❌ Service drops for 10–60s during rebuild | ✅ **Zero Downtime** (Seamless Nginx worker reload) |
| **Verification** | ❌ Bugs hit live users immediately | ✅ Verified on private port before traffic switch |
| **Rollback** | ❌ Slow (requires rebuild/redeploy of old code) | ✅ **Instant (< 1 second)** by pointing Nginx back |
| **Risk Level** | ❌ High risk of breaking production | ✅ Low risk with automated healthcheck gatekeeper |

---

## 🔄 Deployment & Traffic Switching Workflow

```
1. Current State:
   Traffic ──► [ Nginx :80 ] ──► [ app-blue :8081 ] (ACTIVE)
                                 [ app-green :8082 ] (Idle/Previous)

2. Deploy New Version (deploy.sh):
   a. Build & start inactive container: app-green
   b. Continuous health probe: curl http://localhost:8082/health
   c. Candidate validation: verify HTTP 200 + DB connection
   d. Update active_upstream.conf -> mockmate-app-green:8080
   e. Reload Nginx: docker exec mockmate-client nginx -s reload

3. New State:
   Traffic ──► [ Nginx :80 ] ──► [ app-green :8082 ] (ACTIVE)
                                 [ app-blue :8081 ] (STANDBY / Rollback Target)
```

---

## 🛠️ Commands & Operational Runbook

### 1. Initial Infrastructure Startup
```bash
# Start shared databases, redis, and default active app (Blue)
docker compose up -d
```

### 2. Check Currently Active Version & Health
```bash
# Via Nginx / Cloudflare Tunnel entrypoint (Port 80)
curl http://localhost/version
curl http://localhost/health

# Via individual internal ports
curl http://localhost:8081/version   # Blue instance
curl http://localhost:8082/version   # Green instance
```

### 3. Deploy New Release (Automated Zero-Downtime)
```bash
# Give execution permissions (first time)
chmod +x deploy.sh rollback.sh

# Deploy next version
./deploy.sh

# Or deploy with a specific release tag:
./deploy.sh v2.0.0
```

### 4. Instant Rollback
If any unexpected issue arises in production after deployment:
```bash
./rollback.sh
```
*Switches Nginx upstream immediately back to the previous environment without rebuilding or downtime.*

---

## 🧪 Demonstration & Testing Playbook

### Scenario A: Normal Blue $\rightarrow$ Green $\rightarrow$ Blue Deployment
1. Check current version:
   ```bash
   curl http://localhost/version
   # Output: {"release":"v1.0.0","status":"online","version":"blue"}
   ```
2. Run deployment:
   ```bash
   ./deploy.sh v2.0.0
   ```
3. Check version again:
   ```bash
   curl http://localhost/version
   # Output: {"release":"v2.0.0","status":"online","version":"green"}
   ```
4. Notice that active traffic switched to **Green**, while **Blue** remains running on port 8081 for fast rollback.

---

### Scenario B: Intentional Failure Simulation (Safety Gatekeeper Test)
To prove that unhealthy code **never** reaches production:

1. Stop MySQL Primary or provide invalid DB credentials to simulate an unready state:
   ```bash
   docker stop mockmate-mysql-primary
   ```
2. Attempt to deploy:
   ```bash
   ./deploy.sh v3.0.0-broken
   ```
3. **Observed Behavior**:
   - The health check loop polls the candidate instance.
   - Database ping fails $\rightarrow$ `/health` returns `HTTP 503`.
   - `deploy.sh` detects failure, outputs error logs, and **aborts immediately**.
   - Nginx is **never touched**, and production traffic remains undisturbed on the previous working version.
4. Restore MySQL:
   ```bash
   docker start mockmate-mysql-primary
   ```

---

### Scenario C: Instant Rollback Demonstration
1. While production is running on `GREEN`:
   ```bash
   ./rollback.sh
   ```
2. Output confirms:
   - Traffic switched from `GREEN` $\rightarrow$ `BLUE`.
   - Nginx reloaded in milliseconds.
   - Verification confirms `curl http://localhost/version` returns `blue`.

---

## 🗄️ Database Backward-Compatibility Principles

Because both **Blue** and **Green** share the same MySQL cluster during transitions:
1. **Additive Changes First**: Add new tables or nullable columns rather than modifying/renaming existing columns.
2. **Dual-Writing / Safe Reads**: Ensure new code can read existing schemas before old code is decommissioned.
3. **No Destructive Drops During Deploy**: Drop obsolete columns only after the previous environment is fully retired.

---

## 🔍 Troubleshooting Commands

| Task | Command |
| :--- | :--- |
| View Nginx Upstream Configuration | `cat infrastructure/nginx/active_upstream.conf` |
| View Blue Container Logs | `docker logs -f mockmate-app-blue` |
| View Green Container Logs | `docker logs -f mockmate-app-green` |
| View Nginx Client Logs | `docker logs -f mockmate-client` |
| View Cloudflare Tunnel Logs | `docker logs -f mockmate-cloudflare-tunnel` |
| Test Nginx Reload Manually | `docker exec mockmate-client nginx -t && docker exec mockmate-client nginx -s reload` |
