package controllers

import (
	"bytes"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"server/config"
	"server/database"

	"github.com/gin-gonic/gin"
)

// TableStat represents metadata and row counts for an individual table
type TableStat struct {
	Name      string `json:"name"`
	RowCount  int64  `json:"row_count"`
	SizeBytes int64  `json:"size_bytes"`
}

// DatabaseStatsResponse contains overall health and table metrics
type DatabaseStatsResponse struct {
	Database      string      `json:"database"`
	TotalTables   int         `json:"total_tables"`
	TotalRows     int64       `json:"total_rows"`
	DataSizeBytes int64       `json:"data_size_bytes"`
	DataSizeHuman string      `json:"data_size_human"`
	Tables        []TableStat `json:"tables"`
	Cluster       struct {
		PrimaryHost  string   `json:"primary_host"`
		ReplicaHosts []string `json:"replica_hosts"`
	} `json:"cluster"`
}

// AdminGetDatabaseStats fetches live metrics and table statistics for the database
func AdminGetDatabaseStats(c *gin.Context) {
	// 1. Detect dynamic database name directly from active connection
	var dbName string
	_ = database.DB.Raw("SELECT DATABASE()").Scan(&dbName)
	if dbName == "" {
		if config.AppConfig != nil && config.AppConfig.DBName != "" {
			dbName = config.AppConfig.DBName
		} else {
			dbName = "mock_mate"
		}
	}

	// 2. Fetch table names using robust direct row scanning
	var tableNames []string
	rows, err := database.DB.Raw("SELECT TABLE_NAME FROM information_schema.TABLES WHERE (TABLE_SCHEMA = ? OR TABLE_SCHEMA = DATABASE()) AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME ASC", dbName).Rows()
	if err == nil && rows != nil {
		for rows.Next() {
			var tName string
			if err := rows.Scan(&tName); err == nil && tName != "" {
				tableNames = append(tableNames, tName)
			}
		}
		_ = rows.Close()
	}

	// Fallback to SHOW TABLES if information_schema returns nothing
	if len(tableNames) == 0 {
		stRows, stErr := database.DB.Raw("SHOW TABLES").Rows()
		if stErr == nil && stRows != nil {
			for stRows.Next() {
				var tName string
				if err := stRows.Scan(&tName); err == nil && tName != "" {
					tableNames = append(tableNames, tName)
				}
			}
			_ = stRows.Close()
		}
	}

	// 3. Fetch data length and index length for each table
	sizeMap := make(map[string]int64)
	sizeRows, err := database.DB.Raw("SELECT TABLE_NAME, (COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0)) FROM information_schema.TABLES WHERE (TABLE_SCHEMA = ? OR TABLE_SCHEMA = DATABASE()) AND TABLE_TYPE = 'BASE TABLE'", dbName).Rows()
	if err == nil && sizeRows != nil {
		for sizeRows.Next() {
			var tName string
			var dataBytes int64
			if err := sizeRows.Scan(&tName, &dataBytes); err == nil {
				sizeMap[tName] = dataBytes
			}
		}
		_ = sizeRows.Close()
	}

	// 4. Count exact rows per table
	var tableStats []TableStat
	var totalRows int64
	var totalSizeBytes int64

	for _, tbl := range tableNames {
		var count int64
		_ = database.DB.Raw(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", tbl)).Scan(&count)

		sz := sizeMap[tbl]
		totalRows += count
		totalSizeBytes += sz

		tableStats = append(tableStats, TableStat{
			Name:      tbl,
			RowCount:  count,
			SizeBytes: sz,
		})
	}

	humanSize := formatBytes(totalSizeBytes)

	res := DatabaseStatsResponse{
		Database:      dbName,
		TotalTables:   len(tableStats),
		TotalRows:     totalRows,
		DataSizeBytes: totalSizeBytes,
		DataSizeHuman: humanSize,
		Tables:        tableStats,
	}

	if config.AppConfig != nil {
		res.Cluster.PrimaryHost = fmt.Sprintf("%s:%s", config.AppConfig.DBHost, config.AppConfig.DBPort)
		res.Cluster.ReplicaHosts = config.AppConfig.DBReplicaHosts
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   res,
	})
}

// AdminExportDatabaseDump creates and streams a complete or selective MySQL .sql dump
func AdminExportDatabaseDump(c *gin.Context) {
	var dbName string
	_ = database.DB.Raw("SELECT DATABASE()").Scan(&dbName)
	if dbName == "" {
		if config.AppConfig != nil && config.AppConfig.DBName != "" {
			dbName = config.AppConfig.DBName
		} else {
			dbName = "mock_mate"
		}
	}

	selectedTablesParam := strings.TrimSpace(c.Query("tables"))
	var targetTables []string

	if selectedTablesParam != "" {
		for _, t := range strings.Split(selectedTablesParam, ",") {
			tbl := strings.TrimSpace(t)
			if tbl != "" {
				targetTables = append(targetTables, tbl)
			}
		}
	}

	// If no specific tables selected, fetch all base tables
	if len(targetTables) == 0 {
		rows, err := database.DB.Raw("SELECT TABLE_NAME FROM information_schema.TABLES WHERE (TABLE_SCHEMA = ? OR TABLE_SCHEMA = DATABASE()) AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME ASC", dbName).Rows()
		if err == nil && rows != nil {
			for rows.Next() {
				var tName string
				if err := rows.Scan(&tName); err == nil && tName != "" {
					targetTables = append(targetTables, tName)
				}
			}
			_ = rows.Close()
		}
	}

	if len(targetTables) == 0 {
		stRows, stErr := database.DB.Raw("SHOW TABLES").Rows()
		if stErr == nil && stRows != nil {
			for stRows.Next() {
				var tName string
				if err := stRows.Scan(&tName); err == nil && tName != "" {
					targetTables = append(targetTables, tName)
				}
			}
			_ = stRows.Close()
		}
	}

	var buf bytes.Buffer

	// 1. SQL Dump Header
	now := time.Now().UTC()
	buf.WriteString("-- ============================================================\n")
	buf.WriteString(fmt.Sprintf("-- MockMate Platform SQL Database Backup\n"))
	buf.WriteString(fmt.Sprintf("-- Export Date (UTC): %s\n", now.Format("2006-01-02 15:04:05")))
	buf.WriteString(fmt.Sprintf("-- Database: %s\n", dbName))
	if config.AppConfig != nil {
		buf.WriteString(fmt.Sprintf("-- Host: %s:%s\n", config.AppConfig.DBHost, config.AppConfig.DBPort))
	}
	buf.WriteString("-- ============================================================\n\n")
	buf.WriteString("SET NAMES utf8mb4;\n")
	buf.WriteString("SET FOREIGN_KEY_CHECKS = 0;\n")
	buf.WriteString("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n")
	buf.WriteString("SET time_zone = '+00:00';\n\n")

	// 2. Iterate through tables
	for _, tableName := range targetTables {
		cleanTable := strings.ReplaceAll(tableName, "`", "")

		// Table Structure
		buf.WriteString(fmt.Sprintf("-- ------------------------------------------------------------\n"))
		buf.WriteString(fmt.Sprintf("-- Table structure for `%s`\n", cleanTable))
		buf.WriteString(fmt.Sprintf("-- ------------------------------------------------------------\n"))
		buf.WriteString(fmt.Sprintf("DROP TABLE IF EXISTS `%s`;\n", cleanTable))

		var tblNameResult, createSQL string
		err := database.DB.Raw(fmt.Sprintf("SHOW CREATE TABLE `%s`", cleanTable)).Row().Scan(&tblNameResult, &createSQL)
		if err != nil {
			continue
		}
		buf.WriteString(createSQL)
		buf.WriteString(";\n\n")

		// Table Data Dump
		buf.WriteString(fmt.Sprintf("-- Dumping data for table `%s`\n", cleanTable))
		rows, err := database.DB.Raw(fmt.Sprintf("SELECT * FROM `%s`", cleanTable)).Rows()
		if err != nil {
			continue
		}

		cols, err := rows.Columns()
		if err != nil {
			_ = rows.Close()
			continue
		}

		colCount := len(cols)
		var insertValues []string
		batchSize := 100

		colHeaders := make([]string, colCount)
		for i, col := range cols {
			colHeaders[i] = fmt.Sprintf("`%s`", col)
		}
		colListStr := strings.Join(colHeaders, ", ")

		for rows.Next() {
			columns := make([]interface{}, colCount)
			columnPointers := make([]interface{}, colCount)
			for i := range columns {
				columnPointers[i] = &columns[i]
			}

			if err := rows.Scan(columnPointers...); err != nil {
				continue
			}

			valStrs := make([]string, colCount)
			for i, val := range columns {
				if val == nil {
					valStrs[i] = "NULL"
				} else {
					switch v := val.(type) {
					case []byte:
						valStrs[i] = fmt.Sprintf("'%s'", escapeSQLString(string(v)))
					case string:
						valStrs[i] = fmt.Sprintf("'%s'", escapeSQLString(v))
					case time.Time:
						valStrs[i] = fmt.Sprintf("'%s'", v.Format("2006-01-02 15:04:05"))
					case bool:
						if v {
							valStrs[i] = "1"
						} else {
							valStrs[i] = "0"
						}
					case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
						valStrs[i] = fmt.Sprintf("%v", v)
					case float32, float64:
						valStrs[i] = fmt.Sprintf("%v", v)
					case sql.NullString:
						if v.Valid {
							valStrs[i] = fmt.Sprintf("'%s'", escapeSQLString(v.String))
						} else {
							valStrs[i] = "NULL"
						}
					default:
						valStrs[i] = fmt.Sprintf("'%s'", escapeSQLString(fmt.Sprintf("%v", v)))
					}
				}
			}

			insertValues = append(insertValues, fmt.Sprintf("(%s)", strings.Join(valStrs, ", ")))

			// Flush batch
			if len(insertValues) >= batchSize {
				buf.WriteString(fmt.Sprintf("INSERT INTO `%s` (%s) VALUES\n%s;\n", cleanTable, colListStr, strings.Join(insertValues, ",\n")))
				insertValues = nil
			}
		}
		_ = rows.Close()

		if len(insertValues) > 0 {
			buf.WriteString(fmt.Sprintf("INSERT INTO `%s` (%s) VALUES\n%s;\n", cleanTable, colListStr, strings.Join(insertValues, ",\n")))
		}
		buf.WriteString("\n")
	}

	// 3. SQL Footer
	buf.WriteString("SET FOREIGN_KEY_CHECKS = 1;\n")
	buf.WriteString(fmt.Sprintf("-- Dump completed on %s UTC\n", time.Now().UTC().Format("2006-01-02 15:04:05")))

	filename := fmt.Sprintf("mockmate_backup_%s_%s.sql", dbName, time.Now().Format("20060102_150405"))

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/sql")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Expires", "0")
	c.Header("Cache-Control", "must-revalidate")
	c.Header("Pragma", "public")

	c.Data(http.StatusOK, "application/sql; charset=utf-8", buf.Bytes())
}

// escapeSQLString escapes single quotes and backslashes for SQL literals
func escapeSQLString(str string) string {
	str = strings.ReplaceAll(str, "\\", "\\\\")
	str = strings.ReplaceAll(str, "'", "\\'")
	str = strings.ReplaceAll(str, "\n", "\\n")
	str = strings.ReplaceAll(str, "\r", "\\r")
	return str
}

// formatBytes formats byte sizes into readable KB, MB, GB
func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
