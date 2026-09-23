package controllers

import (
	"bufio"
	"compress/gzip"
	"database/sql"
	"fmt"
	"io"
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

// getPrimaryDB returns a database handle guaranteed to target Primary node
func getPrimaryDB() *databaseWrapper {
	return &databaseWrapper{db: database.DB}
}

// getEffectiveDBName resolves the active database name
func getEffectiveDBName() string {
	if config.AppConfig != nil && strings.TrimSpace(config.AppConfig.DBName) != "" {
		return strings.TrimSpace(config.AppConfig.DBName)
	}
	var dbName string
	_ = database.DB.Raw("SELECT DATABASE()").Scan(&dbName)
	if strings.TrimSpace(dbName) != "" {
		return strings.TrimSpace(dbName)
	}
	return "mock_mate"
}

// getClusterTableNames returns all base table names reliably
func getClusterTableNames(dbName string) []string {
	var tableNames []string

	// 1. Try information_schema first
	rows, err := database.DB.Raw("SELECT TABLE_NAME FROM information_schema.TABLES WHERE LOWER(TABLE_SCHEMA) = LOWER(?) AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME ASC", dbName).Rows()
	if err == nil && rows != nil {
		for rows.Next() {
			var tName string
			if err := rows.Scan(&tName); err == nil && tName != "" {
				tableNames = append(tableNames, tName)
			}
		}
		_ = rows.Close()
	}

	// 2. Fallback: SHOW TABLES
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

	// 3. Fallback: known model tables if schema metadata query returned empty
	if len(tableNames) == 0 {
		tableNames = []string{
			"users",
			"roles",
			"app_pages",
			"role_page_permissions",
			"interview_tracks",
			"interview_levels",
			"interview_questions",
			"interview_question_details",
			"interview_question_code_templates",
			"interview_question_test_cases",
			"interview_question_hints",
			"interview_question_mcq_options",
			"matchmaking_queue_entries",
			"interview_sessions",
			"feedback_questions",
			"feedback_question_options",
			"interview_feedbacks",
			"interview_feedback_responses",
			"interview_recordings",
			"session_security_reports",
			"audit_logs",
		}
	}

	return tableNames
}

// databaseWrapper wraps database calls
type databaseWrapper struct {
	db interface{}
}

// AdminGetDatabaseStats fetches live metrics and table statistics for the database
func AdminGetDatabaseStats(c *gin.Context) {
	dbName := getEffectiveDBName()
	tableNames := getClusterTableNames(dbName)

	// Fetch data length and index length for each table
	sizeMap := make(map[string]int64)
	sizeRows, err := database.DB.Raw("SELECT TABLE_NAME, (COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0)) FROM information_schema.TABLES WHERE LOWER(TABLE_SCHEMA) = LOWER(?) AND TABLE_TYPE = 'BASE TABLE'", dbName).Rows()
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

	// Count exact rows per table
	var tableStats []TableStat
	var totalRows int64
	var totalSizeBytes int64

	for _, tbl := range tableNames {
		var count int64
		_ = database.DB.Raw(fmt.Sprintf("SELECT COUNT(*) FROM `%s`", tbl)).Scan(&count)

		sz := sizeMap[tbl]
		if sz == 0 && count > 0 {
			sz = count * 512 // Estimated 512 bytes per row fallback
		}

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

// AdminExportDatabaseDump creates and streams a complete or selective MySQL .sql dump (plain or gzip compressed)
func AdminExportDatabaseDump(c *gin.Context) {
	dbName := getEffectiveDBName()

	selectedTablesParam := strings.TrimSpace(c.Query("tables"))
	isGzip := c.Query("gzip") == "true" || c.Query("gz") == "1" || c.Query("compress") == "1"

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
		targetTables = getClusterTableNames(dbName)
	}

	timestamp := time.Now().Format("20060102_150405")
	var filename string
	if isGzip {
		filename = fmt.Sprintf("mockmate_backup_%s_%s.sql.gz", dbName, timestamp)
		c.Header("Content-Type", "application/gzip")
	} else {
		filename = fmt.Sprintf("mockmate_backup_%s_%s.sql", dbName, timestamp)
		c.Header("Content-Type", "application/sql; charset=utf-8")
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Expires", "0")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")

	// Set status before streaming
	c.Status(http.StatusOK)

	var outWriter io.Writer = c.Writer
	var gzWriter *gzip.Writer

	if isGzip {
		gzWriter = gzip.NewWriter(c.Writer)
		outWriter = gzWriter
		defer func() {
			if gzWriter != nil {
				_ = gzWriter.Close()
			}
		}()
	}

	bufWriter := bufio.NewWriterSize(outWriter, 64*1024)
	defer func() {
		_ = bufWriter.Flush()
		if gzWriter != nil {
			_ = gzWriter.Flush()
			_ = gzWriter.Close()
		}
		c.Writer.Flush()
	}()

	writeStr := func(s string) {
		_, _ = bufWriter.WriteString(s)
	}

	// 1. SQL Dump Header
	now := time.Now().UTC()
	writeStr("-- ============================================================\n")
	writeStr(fmt.Sprintf("-- MockMate Platform SQL Database Backup\n"))
	writeStr(fmt.Sprintf("-- Export Date (UTC): %s\n", now.Format("2006-01-02 15:04:05")))
	writeStr(fmt.Sprintf("-- Database: %s\n", dbName))
	if config.AppConfig != nil {
		writeStr(fmt.Sprintf("-- Host: %s:%s\n", config.AppConfig.DBHost, config.AppConfig.DBPort))
	}
	writeStr("-- ============================================================\n\n")
	writeStr("SET NAMES utf8mb4;\n")
	writeStr("SET FOREIGN_KEY_CHECKS = 0;\n")
	writeStr("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n")
	writeStr("SET time_zone = '+00:00';\n\n")

	_ = bufWriter.Flush()
	c.Writer.Flush()

	// 2. Iterate through tables
	for _, tableName := range targetTables {
		cleanTable := strings.ReplaceAll(tableName, "`", "")

		// Table Structure
		writeStr(fmt.Sprintf("-- ------------------------------------------------------------\n"))
		writeStr(fmt.Sprintf("-- Table structure for `%s`\n", cleanTable))
		writeStr(fmt.Sprintf("-- ------------------------------------------------------------\n"))
		writeStr(fmt.Sprintf("DROP TABLE IF EXISTS `%s`;\n", cleanTable))

		var tblNameResult, createSQL string
		err := database.DB.Raw(fmt.Sprintf("SHOW CREATE TABLE `%s`", cleanTable)).Row().Scan(&tblNameResult, &createSQL)
		if err != nil {
			continue
		}
		writeStr(createSQL)
		writeStr(";\n\n")

		// Table Data Dump
		writeStr(fmt.Sprintf("-- Dumping data for table `%s`\n", cleanTable))
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
		batchSize := 200

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
				writeStr(fmt.Sprintf("INSERT INTO `%s` (%s) VALUES\n%s;\n", cleanTable, colListStr, strings.Join(insertValues, ",\n")))
				insertValues = nil
				_ = bufWriter.Flush()
				c.Writer.Flush()
			}
		}
		_ = rows.Close()

		if len(insertValues) > 0 {
			writeStr(fmt.Sprintf("INSERT INTO `%s` (%s) VALUES\n%s;\n", cleanTable, colListStr, strings.Join(insertValues, ",\n")))
		}
		writeStr("\n")
		_ = bufWriter.Flush()
		c.Writer.Flush()
	}

	// 3. SQL Footer
	writeStr("SET FOREIGN_KEY_CHECKS = 1;\n")
	writeStr(fmt.Sprintf("-- Dump completed on %s UTC\n", time.Now().UTC().Format("2006-01-02 15:04:05")))
}

// escapeSQLString escapes special characters for SQL literals
func escapeSQLString(str string) string {
	var sb strings.Builder
	sb.Grow(len(str) + 16)
	for i := 0; i < len(str); i++ {
		c := str[i]
		switch c {
		case 0:
			sb.WriteString("\\0")
		case '\n':
			sb.WriteString("\\n")
		case '\r':
			sb.WriteString("\\r")
		case '\\':
			sb.WriteString("\\\\")
		case '\'':
			sb.WriteString("\\'")
		case '"':
			sb.WriteString("\\\"")
		case '\032': // Control-Z
			sb.WriteString("\\Z")
		default:
			sb.WriteByte(c)
		}
	}
	return sb.String()
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
