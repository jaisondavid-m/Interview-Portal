#!/usr/bin/env bash
# ==============================================================================
# Mock-Mate Zero-Downtime Blue-Green Deployment Script
# Compatible with WSL / Linux / Docker Compose
# ==============================================================================

set -euo pipefail

# Text colors for terminal output
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPSTREAM_CONF="${ROOT_DIR}/infrastructure/nginx/active_upstream.conf"
STATE_FILE="${ROOT_DIR}/.active_deployment"

if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    source "${ROOT_DIR}/.env"
    set +a
fi

BLUE_PORT="${BLUE_PORT:-8083}"
GREEN_PORT="${GREEN_PORT:-8084}"
PROD_PORT="${CLIENT_PORT:-8081}"

MAX_HEALTH_RETRIES=30
HEALTH_INTERVAL=2

# 1. Determine currently active environment
CURRENT_COLOR="blue"
if [ -f "${UPSTREAM_CONF}" ]; then
    if grep -q "mockmate-app-green" "${UPSTREAM_CONF}"; then
        CURRENT_COLOR="green"
    elif grep -q "mockmate-app-blue" "${UPSTREAM_CONF}"; then
        CURRENT_COLOR="blue"
    fi
elif [ -f "${STATE_FILE}" ]; then
    CURRENT_COLOR=$(cat "${STATE_FILE}")
fi

# 2. Determine target inactive environment
if [ "${CURRENT_COLOR}" = "blue" ]; then
    TARGET_COLOR="green"
    TARGET_SERVICE="app-green"
    TARGET_CONTAINER="mockmate-app-green"
    TARGET_PORT="${GREEN_PORT}"
    PREVIOUS_PORT="${BLUE_PORT}"
else
    TARGET_COLOR="blue"
    TARGET_SERVICE="app-blue"
    TARGET_CONTAINER="mockmate-app-blue"
    TARGET_PORT="${BLUE_PORT}"
    PREVIOUS_PORT="${GREEN_PORT}"
fi

DEPLOY_VERSION="${1:-${TARGET_COLOR^^}_RELEASE_$(date +%Y%m%d_%H%M%S)}"

echo -e "\n${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}       MOCK-MATE BLUE-GREEN ZERO-DOWNTIME DEPLOY      ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}Current Active Environment :${NC} ${YELLOW}${CURRENT_COLOR^^}${NC} (Port: ${PREVIOUS_PORT})"
echo -e "${BOLD}Target Deployment Target   :${NC} ${GREEN}${TARGET_COLOR^^}${NC} (Port: ${TARGET_PORT})"
echo -e "${BOLD}Target Version / Release   :${NC} ${BOLD}${DEPLOY_VERSION}${NC}"
echo -e "${CYAN}------------------------------------------------------${NC}\n"

# 3. Ensure Shared Infrastructure (MySQL & Redis) is running
echo -e "${BOLD}[1/6] Checking shared infrastructure (MySQL & Redis)...${NC}"
docker compose up -d mysql-primary mysql-replica-1 mysql-replica-2 redis

# 4. Build and start target candidate container
echo -e "\n${BOLD}[2/6] Building and starting ${TARGET_COLOR^^} environment...${NC}"
if [ "${TARGET_COLOR}" = "green" ]; then
    export GREEN_VERSION="${DEPLOY_VERSION}"
    export GREEN_COLOR="green"
else
    export BLUE_VERSION="${DEPLOY_VERSION}"
    export BLUE_COLOR="blue"
fi

docker compose up -d --build "${TARGET_SERVICE}" client

# Multi-network probe helper (supports host localhost, container network DNS, and docker bridge gateway)
probe_endpoint() {
    local container="$1"
    local port="$2"
    local endpoint="${3:-/health}"
    local code="000"

    # 1. Direct container network probe (works within Docker / Jenkins)
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://${container}:8080${endpoint}" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "$code"
        return 0
    fi

    # 2. Host localhost probe (works on host WSL)
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}${endpoint}" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "$code"
        return 0
    fi

    # 3. Docker bridge gateway probe (works from container to host port)
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://172.17.0.1:${port}${endpoint}" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "$code"
        return 0
    fi

    # 4. In-container docker exec probe fallback
    if docker exec "${container}" wget -qO- "http://127.0.0.1:8080${endpoint}" 2>/dev/null | grep -q -E "success|version|release"; then
        echo "200"
        return 0
    fi

    echo "$code"
}

fetch_endpoint_body() {
    local container="$1"
    local port="$2"
    local endpoint="${3:-/health}"

    local body=$(curl -s "http://${container}:8080${endpoint}" 2>/dev/null || true)
    if [ -n "$body" ] && [ "$body" != "{}" ]; then
        echo "$body"
        return 0
    fi
    body=$(curl -s "http://127.0.0.1:${port}${endpoint}" 2>/dev/null || true)
    if [ -n "$body" ] && [ "$body" != "{}" ]; then
        echo "$body"
        return 0
    fi
    body=$(curl -s "http://172.17.0.1:${port}${endpoint}" 2>/dev/null || true)
    if [ -n "$body" ] && [ "$body" != "{}" ]; then
        echo "$body"
        return 0
    fi
    docker exec "${container}" wget -qO- "http://127.0.0.1:8080${endpoint}" 2>/dev/null || echo "{}"
}

# 5. Health Check Loop on Inactive Target
echo -e "\n${BOLD}[3/6] Waiting for ${TARGET_COLOR^^} instance to become healthy on port ${TARGET_PORT}...${NC}"
RETRIES=0
HEALTHY=false

while [ ${RETRIES} -lt ${MAX_HEALTH_RETRIES} ]; do
    HTTP_CODE=$(probe_endpoint "${TARGET_CONTAINER}" "${TARGET_PORT}" "/health")
    
    if [ "${HTTP_CODE}" = "200" ]; then
        HEALTH_BODY=$(fetch_endpoint_body "${TARGET_CONTAINER}" "${TARGET_PORT}" "/health")
        echo -e "${GREEN}✓ ${TARGET_COLOR^^} health check passed (HTTP 200)${NC}"
        echo -e "  Response: ${HEALTH_BODY}"
        HEALTHY=true
        break
    else
        echo -e "  [Attempt $((RETRIES+1))/${MAX_HEALTH_RETRIES}] HTTP status ${HTTP_CODE:-N/A} - Waiting ${HEALTH_INTERVAL}s..."
        sleep ${HEALTH_INTERVAL}
        RETRIES=$((RETRIES+1))
    fi
done

if [ "${HEALTHY}" = false ]; then
    echo -e "\n${RED}✗ FATAL: Health check failed for ${TARGET_COLOR^^} (${TARGET_CONTAINER})${NC}"
    echo -e "${RED}  Aborting deployment. Production traffic remains safely on ${CURRENT_COLOR^^}.${NC}"
    echo -e "${YELLOW}Container logs for ${TARGET_CONTAINER}:${NC}"
    docker logs --tail 30 "${TARGET_CONTAINER}" || true
    exit 1
fi

# 6. Verify Candidate Version Endpoint
echo -e "\n${BOLD}[4/6] Verifying ${TARGET_COLOR^^} version endpoint...${NC}"
VERSION_RESP=$(fetch_endpoint_body "${TARGET_CONTAINER}" "${TARGET_PORT}" "/version")
echo -e "  Candidate Version: ${CYAN}${VERSION_RESP}${NC}"

# 7. Switch Nginx Traffic to Target Color
echo -e "\n${BOLD}[5/6] Switching Nginx traffic: ${CURRENT_COLOR^^} → ${TARGET_COLOR^^}...${NC}"
mkdir -p "$(dirname "${UPSTREAM_CONF}")"

cat <<EOF > "${UPSTREAM_CONF}"
# ==========================================
# Mock-Mate Dynamic Active Upstream Router
# ==========================================
# Managed automatically by deploy.sh / rollback.sh
# Active Target: ${TARGET_COLOR^^} (Port: ${TARGET_PORT})

upstream active_backend {
    server ${TARGET_CONTAINER}:8080 max_fails=3 fail_timeout=10s;
    keepalive 32;
}
EOF

# Ensure Nginx client is running and reload configuration
if docker ps --format '{{.Names}}' | grep -q "mockmate-client"; then
    echo -e "  Reloading Nginx in container 'mockmate-client'..."
    docker exec mockmate-client nginx -s reload
else
    echo -e "  Starting client/nginx container..."
    docker compose up -d client
fi

# 8. Verify Live Production Endpoint
echo -e "\n${BOLD}[6/6] Verifying live production endpoint on port ${PROD_PORT}...${NC}"
sleep 2

PROD_STATUS="000"
PROD_VERSION_BODY="{}"
for check_url in "http://127.0.0.1:${PROD_PORT}/version" "http://mockmate-client:80/version" "http://172.17.0.1:${PROD_PORT}/version"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${check_url}" 2>/dev/null || echo "000")
    if [ "${STATUS}" = "200" ]; then
        PROD_STATUS="200"
        PROD_VERSION_BODY=$(curl -s "${check_url}" 2>/dev/null || echo "{}")
        break
    fi
done

if [ "${PROD_STATUS}" = "200" ]; then
    echo -e "${GREEN}✓ Production verification passed (HTTP 200)${NC}"
    echo -e "  Live Production Endpoint Response: ${GREEN}${PROD_VERSION_BODY}${NC}"
else
    echo -e "${YELLOW}! Warning: Production verification returned HTTP ${PROD_STATUS}.${NC}"
fi

# Save state
echo "${TARGET_COLOR}" > "${STATE_FILE}"

echo -e "\n${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}${GREEN}            DEPLOYMENT COMPLETED SUCCESSFULLY         ${NC}"
echo -e "${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}Active Environment   :${NC} ${GREEN}${TARGET_COLOR^^}${NC} (Receiving Production Traffic)"
echo -e "${BOLD}Previous Environment :${NC} ${YELLOW}${CURRENT_COLOR^^}${NC} (Kept online for Instant Rollback)"
echo -e "${BOLD}Active Container     :${NC} ${TARGET_CONTAINER}"
echo -e "${BOLD}Live Version Check   :${NC} curl http://localhost:${PROD_PORT}/version"
echo -e "${BOLD}To Rollback Instantly:${NC} ./rollback.sh"
echo -e "${GREEN}======================================================${NC}\n"
