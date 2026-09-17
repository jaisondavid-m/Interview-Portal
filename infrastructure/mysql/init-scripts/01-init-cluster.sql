-- 01-init-cluster.sql: Initialize Replication User & Health Monitor User on Primary

-- 1. Create dedicated replication user
CREATE USER IF NOT EXISTS 'repl_user'@'%' IDENTIFIED BY 'repl_password_2026';
GRANT REPLICATION SLAVE, REPLICATION CLIENT, RELOAD ON *.* TO 'repl_user'@'%';

-- 2. Create cluster orchestrator / failover manager user
CREATE USER IF NOT EXISTS 'cluster_mgr'@'%' IDENTIFIED BY 'cluster_mgr_secret';
GRANT ALL PRIVILEGES ON *.* TO 'cluster_mgr'@'%' WITH GRANT OPTION;

-- 3. Flush privileges to ensure immediate activation
FLUSH PRIVILEGES;