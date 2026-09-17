#!/usr/bin/env bash
# cluster_ctl.sh: CLI Controller for MockMate MySQL HA Cluster

set -euo pipefail

COMPOSE_FILE="docker-compose.db-cluster.yml"

show_help() {
  cat <<EOF
MockMate Database Cluster Management Tool

Usage: ./infrastructure/scripts/cluster_ctl.sh [command]

Commands:
  start       Start the 3-node MySQL cluster + Failover Manager daemon
  stop        Stop all cluster containers
  status      Display replication status and GTID positions for all nodes
  failover    Simulate a primary crash (stops primary and monitors promotion)
  reseed      Provision a fresh 2nd replica to maintain the 2-replica policy
  logs        Stream logs from the Failover Manager daemon
  help        Show this help message
EOF
}

cmd_start() {
  echo "[INFO] Starting MockMate 3-Node MySQL Cluster & Failover Manager..."
  docker compose -f "$COMPOSE_FILE" up -d
  echo "[INFO] Cluster containers launched. Waiting for healthy status..."
}

cmd_stop() {
  echo "[INFO] Stopping MockMate MySQL Cluster..."
  docker compose -f "$COMPOSE_FILE" down
}

cmd_status() {
  echo "============================================================"
  echo "         MockMate MySQL Cluster Health & Topology           "
  echo "============================================================"
  echo ""
  echo "--- 1. Primary Node (Port 3306) ---"
  docker exec -it mockmate-mysql-primary mysql -uroot -pjaison -e "SELECT @@server_id AS server_id, @@read_only AS read_only, @@gtid_executed AS gtid_executed;" 2>/dev/null || echo "[WARN] Primary is DOWN / Unreachable"
  echo ""
  echo "--- 2. Replica 1 (Port 3307) ---"
  docker exec -it mockmate-mysql-replica-1 mysql -uroot -pjaison -e "SELECT @@server_id AS server_id, @@read_only AS read_only; SHOW REPLICA STATUS\G" 2>/dev/null || echo "[WARN] Replica 1 is DOWN / Unreachable"
  echo ""
  echo "--- 3. Replica 2 (Port 3308) ---"
  docker exec -it mockmate-mysql-replica-2 mysql -uroot -pjaison -e "SELECT @@server_id AS server_id, @@read_only AS read_only; SHOW REPLICA STATUS\G" 2>/dev/null || echo "[WARN] Replica 2 is DOWN / Unreachable"
}

cmd_failover() {
  echo "[ACTION] Simulating Primary Crash: Stopping mockmate-mysql-primary container..."
  docker stop mockmate-mysql-primary
  echo "[INFO] Primary stopped. Streaming Failover Manager promotion logs..."
  docker logs -f --tail 20 mockmate-failover-manager
}

cmd_logs() {
  docker logs -f --tail 50 mockmate-failover-manager
}

case "${1:-help}" in
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  status)   cmd_status ;;
  failover) cmd_failover ;;
  logs)     cmd_logs ;;
  help|*)   show_help ;;
esac
