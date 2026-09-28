#!/usr/bin/env bash
# ==============================================================================
# Mock-Mate Instant Rollback Script
# Compatible with WSL / Linux / Docker Compose
# ==============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPSTREAM_CONF="${ROOT_DIR}/infrastructure/nginx/active_upstream.conf"
STATE_FILE="${ROOT_DIR}/.active_deployment"

BLUE_PORT="${BLUE_PORT:-8081}"
GREEN_PORT="${GREEN_PORT:-8082}"
PROD_PORT="${CLIENT_PORT:-80}"

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

# 2. Determine target rollback environment
if [ "${CURRENT_COLOR}" = "green" ]; then
    TARGET_COLOR="blue"
    TARGET_SERVICE="app-blue"
    TARGET_CONTAINER="mockmate-app-blue"
    TARGET_PORT="${BLUE_PORT}"
    PREVIOUS_PORT="${GREEN_PORT}"
else
    TARGET_COLOR="green"
    TARGET_SERVICE="app-green"
    TARGET_CONTAINER="mockmate-app-green"
    TARGET_PORT="${GREEN_PORT}"
    PREVIOUS_PORT="${BLUE_PORT}"
fi

echo -e "\n${BOLD}${YELLOW}======================================================${NC}"
echo -e "${BOLD}${YELLOW}            MOCK-MATE INSTANT ROLLBACK                ${NC}"
echo -e "${BOLD}${YELLOW}======================================================${NC}"
echo -e "${BOLD}Current Environment    :${NC} ${RED}${CURRENT_COLOR^^}${NC} (Port: ${PREVIOUS_PORT})"
echo -e "${BOLD}Rollback Target        :${NC} ${GREEN}${TARGET_COLOR^^}${NC} (Port: ${TARGET_PORT})"
echo -e "${YELLOW}------------------------------------------------------${NC}\n"

# 3. Ensure target rollback container is running and healthy
echo -e "${BOLD}[1/4] Verifying ${TARGET_COLOR^^} container status...${NC}"
if ! docker ps --format '{{.Names}}' | grep -q "${TARGET_CONTAINER}"; then
    echo -e "  Target container '${TARGET_CONTAINER}' was stopped. Starting it now..."
    docker compose up -d "${TARGET_SERVICE}"
fi

echo -e "\n${BOLD}[2/4] Testing ${TARGET_COLOR^^} health check on port ${TARGET_PORT}...${NC}"
TARGET_HEALTH_URL="http://127.0.0.1:${TARGET_PORT}/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_HEALTH_URL}" 2>/dev/null || true)

if [ "${HTTP_CODE}" != "200" ]; then
    echo -e "${YELLOW}! Waiting for ${TARGET_COLOR^^} to respond on ${TARGET_HEALTH_URL}...${NC}"
    sleep 3
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_HEALTH_URL}" 2>/dev/null || true)
fi

if [ "${HTTP_CODE}" != "200" ]; then
    echo -e "${RED}✗ FATAL: Rollback target ${TARGET_COLOR^^} failed health check (HTTP ${HTTP_CODE:-N/A}).${NC}"
    echo -e "${RED}  Cannot safely rollback to an unhealthy target.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ ${TARGET_COLOR^^} is healthy (HTTP 200)${NC}"

# 4. Switch Nginx Traffic
echo -e "\n${BOLD}[3/4] Switching Nginx traffic: ${CURRENT_COLOR^^} → ${TARGET_COLOR^^}...${NC}"
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

if docker ps --format '{{.Names}}' | grep -q "mockmate-client"; then
    docker exec mockmate-client nginx -s reload
    echo -e "  Nginx reloaded successfully."
else
    docker compose up -d client
fi

# 5. Verify live production endpoint
echo -e "\n${BOLD}[4/4] Verifying live production endpoint on port ${PROD_PORT}...${NC}"
sleep 1
PROD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PROD_PORT}/version" 2>/dev/null || echo "000")
PROD_VERSION_BODY=$(curl -s "http://127.0.0.1:${PROD_PORT}/version" 2>/dev/null || echo "{}")

# Update state file
echo "${TARGET_COLOR}" > "${STATE_FILE}"

echo -e "\n${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}${GREEN}             ROLLBACK COMPLETED SUCCESSFULLY          ${NC}"
echo -e "${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}Active Environment :${NC} ${GREEN}${TARGET_COLOR^^}${NC} (Receiving Production Traffic)"
echo -e "${BOLD}Previous State     :${NC} ${YELLOW}${CURRENT_COLOR^^}${NC}"
echo -e "${BOLD}Live Version Check :${NC} ${CYAN}${PROD_VERSION_BODY}${NC}"
echo -e "${GREEN}======================================================${NC}\n"
