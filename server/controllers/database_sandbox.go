package controllers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
)

func checkSandboxAccess(c *gin.Context, sessionID string) (*models.InterviewSession, bool) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return nil, false
	}
	currentUserID := rawUserID.(uint)

	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Interview session not found"})
		return nil, false
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied. You are not a participant in this interview session."})
		return nil, false
	}

	return &session, true
}

// SandboxColumn represents a table column extracted for the ER diagram
type SandboxColumn struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	IsPk       bool   `json:"isPk"`
	IsFk       bool   `json:"isFk"`
	IsNullable bool   `json:"isNullable"`
	IsUnique   bool   `json:"isUnique"`
}

// SandboxTable represents a database table for the visual ER diagram
type SandboxTable struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	X        int             `json:"x"`
	Y        int             `json:"y"`
	Color    string          `json:"color"`
	RowCount int64           `json:"rowCount"`
	Columns  []SandboxColumn `json:"columns"`
}

// SandboxRelationship represents a foreign key connection between tables
type SandboxRelationship struct {
	ID         string `json:"id"`
	FromTable  string `json:"fromTable"`
	FromColumn string `json:"fromColumn"`
	ToTable    string `json:"toTable"`
	ToColumn   string `json:"toColumn"`
	Type       string `json:"type"` // "1:1" | "1:N" | "N:M"
	Label      string `json:"label"`
}

// SandboxSchemaPayload represents the complete live schema payload
type SandboxSchemaPayload struct {
	Database      string                `json:"database"`
	Databases     []string              `json:"databases"`
	Tables        []SandboxTable        `json:"tables"`
	Relationships []SandboxRelationship `json:"relationships"`
}

func sanitizeSessionDBName(sessionID string) string {
	reg := regexp.MustCompile("[^a-zA-Z0-9_]")
	clean := reg.ReplaceAllString(sessionID, "_")
	if len(clean) > 40 {
		clean = clean[:40]
	}
	return "mockmate_sandbox_" + clean
}

func getSandboxDSN(dbName string) string {
	host := os.Getenv("SANDBOX_DB_HOST")
	if host == "" {
		host = os.Getenv("DB_HOST")
	}
	if host == "" {
		host = "127.0.0.1"
	}

	port := os.Getenv("SANDBOX_DB_PORT")
	if port == "" {
		port = os.Getenv("DB_PORT")
	}
	if port == "" {
		port = "3306"
	}

	user := os.Getenv("SANDBOX_DB_USER")
	if user == "" {
		user = os.Getenv("DB_USER")
	}
	if user == "" {
		user = "root"
	}

	pass := os.Getenv("SANDBOX_DB_PASSWORD")
	if pass == "" {
		pass = os.Getenv("DB_PASSWORD")
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/", user, pass, host, port)
	if dbName != "" {
		dsn += dbName
	}
	dsn += "?charset=utf8mb4&parseTime=True&loc=Local&multiStatements=true"
	return dsn
}

// splitSQLStatements splits a multi-statement SQL script while respecting quotes, backticks, and comments
func splitSQLStatements(sqlText string) []string {
	var statements []string
	var current strings.Builder
	inSingleQuote := false
	inDoubleQuote := false
	inBacktick := false
	inLineComment := false
	inBlockComment := false

	runes := []rune(sqlText)
	n := len(runes)

	for i := 0; i < n; i++ {
		r := runes[i]
		next := rune(0)
		if i+1 < n {
			next = runes[i+1]
		}

		if inLineComment {
			if r == '\n' {
				inLineComment = false
			}
			current.WriteRune(r)
			continue
		}
		if inBlockComment {
			if r == '*' && next == '/' {
				inBlockComment = false
				current.WriteRune(r)
				current.WriteRune(next)
				i++
				continue
			}
			current.WriteRune(r)
			continue
		}

		if !inSingleQuote && !inDoubleQuote && !inBacktick {
			if r == '-' && next == '-' {
				inLineComment = true
				current.WriteRune(r)
				current.WriteRune(next)
				i++
				continue
			}
			if r == '#' {
				inLineComment = true
				current.WriteRune(r)
				continue
			}
			if r == '/' && next == '*' {
				inBlockComment = true
				current.WriteRune(r)
				current.WriteRune(next)
				i++
				continue
			}
		}

		if r == '\'' && !inDoubleQuote && !inBacktick {
			if i > 0 && runes[i-1] == '\\' {
				// escaped quote
			} else {
				inSingleQuote = !inSingleQuote
			}
		} else if r == '"' && !inSingleQuote && !inBacktick {
			if i > 0 && runes[i-1] == '\\' {
				// escaped quote
			} else {
				inDoubleQuote = !inDoubleQuote
			}
		} else if r == '`' && !inSingleQuote && !inDoubleQuote {
			inBacktick = !inBacktick
		}

		if r == ';' && !inSingleQuote && !inDoubleQuote && !inBacktick {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			continue
		}

		current.WriteRune(r)
	}

	remaining := strings.TrimSpace(current.String())
	if remaining != "" {
		statements = append(statements, remaining)
	}

	return statements
}

// getAvailableDatabases finds all databases accessible for this sandbox session
func getAvailableDatabases(db *sql.DB, defaultDBName string) []string {
	databases := []string{defaultDBName}

	rows, err := db.Query("SHOW DATABASES;")
	if err != nil {
		return databases
	}
	defer rows.Close()

	systemDBs := map[string]bool{
		"information_schema": true,
		"mysql":              true,
		"performance_schema": true,
		"sys":                true,
	}
	mainDB := os.Getenv("DB_NAME")
	if mainDB != "" {
		systemDBs[strings.ToLower(mainDB)] = true
	}

	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			lower := strings.ToLower(name)
			if systemDBs[lower] {
				continue
			}
			// Don't show other sessions' sandbox databases
			if strings.HasPrefix(lower, "mockmate_sandbox_") && lower != strings.ToLower(defaultDBName) {
				continue
			}
			if strings.EqualFold(name, defaultDBName) {
				continue
			}
			databases = append(databases, name)
		}
	}
	return databases
}

// ProvisionSandboxDatabase creates an isolated database for the interview session
func ProvisionSandboxDatabase(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	session, ok := checkSandboxAccess(c, sessionID)
	if !ok {
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Interview session is already completed"})
		return
	}

	defaultDBName := sanitizeSessionDBName(sessionID)
	rootDSN := getSandboxDSN("")

	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to sandbox database server: " + err.Error()})
		return
	}
	defer db.Close()

	// 1. Create default session sandbox database
	query := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", defaultDBName)
	if _, err := db.Exec(query); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sandbox database: " + err.Error()})
		return
	}

	// 2. Execute any optional initial DDL if provided
	var reqBody struct {
		InitialDDL string `json:"initial_ddl"`
		Database   string `json:"database"`
	}
	activeDB := defaultDBName
	if err := c.ShouldBindJSON(&reqBody); err == nil {
		if reqBody.Database != "" {
			activeDB = reqBody.Database
		}
		if strings.TrimSpace(reqBody.InitialDDL) != "" {
			sessionDBDSN := getSandboxDSN(activeDB)
			sessionDB, err := sql.Open("mysql", sessionDBDSN)
			if err == nil {
				defer sessionDB.Close()
				stmts := splitSQLStatements(reqBody.InitialDDL)
				for _, stmt := range stmts {
					_, _ = sessionDB.Exec(stmt)
				}
			}
		}
	}

	// 3. Introspect schema & discover databases
	allDBs := getAvailableDatabases(db, defaultDBName)
	schema, _ := introspectSandboxSchema(activeDB)
	schema.Database = activeDB
	schema.Databases = allDBs

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"database":  activeDB,
		"databases": allDBs,
		"message":   "Isolated database sandbox ready",
		"schema":    schema,
	})
}

// ExecuteSandboxQuery runs arbitrary SQL queries against the isolated session sandbox database
func ExecuteSandboxQuery(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	session, ok := checkSandboxAccess(c, sessionID)
	if !ok {
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Interview session is already completed"})
		return
	}

	var reqBody struct {
		Query    string `json:"query" binding:"required"`
		Database string `json:"database"`
	}
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SQL query required"})
		return
	}

	trimmedSQL := strings.TrimSpace(reqBody.Query)
	if trimmedSQL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query cannot be empty"})
		return
	}

	defaultDBName := sanitizeSessionDBName(sessionID)
	activeDB := defaultDBName
	if reqBody.Database != "" {
		activeDB = reqBody.Database
	}

	rootDSN := getSandboxDSN("")
	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to session database: " + err.Error()})
		return
	}
	defer db.Close()

	// Ensure default sandbox database exists
	_, _ = db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", defaultDBName))

	// Acquire single connection for stateful statement execution (e.g. USE db)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	conn, err := db.Conn(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to acquire database connection: " + err.Error()})
		return
	}
	defer conn.Close()

	// Switch to target database
	_, _ = conn.ExecContext(ctx, fmt.Sprintf("USE `%s`;", activeDB))

	startTime := time.Now()

	statements := splitSQLStatements(trimmedSQL)
	if len(statements) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No executable SQL statements found"})
		return
	}

	var lastColumns []string
	var lastRowsData []map[string]interface{}
	var lastRowsValues [][]interface{}
	var hasQueryResults bool
	var totalAffectedRows int64

	for _, stmt := range statements {
		cleanStmt := strings.TrimSpace(stmt)
		if cleanStmt == "" {
			continue
		}

		upper := strings.ToUpper(cleanStmt)

		// Handle database change statements: USE <dbname>
		if strings.HasPrefix(upper, "USE ") {
			dbTarget := strings.TrimSpace(cleanStmt[4:])
			dbTarget = strings.Trim(dbTarget, ";`'\" ")
			if dbTarget != "" {
				if _, err := conn.ExecContext(ctx, fmt.Sprintf("USE `%s`;", dbTarget)); err != nil {
					c.JSON(http.StatusOK, gin.H{
						"success":      false,
						"error":        fmt.Sprintf("USE error [%s]: %s", cleanStmt, err.Error()),
						"execution_ms": time.Since(startTime).Milliseconds(),
					})
					return
				}
				activeDB = dbTarget
				continue
			}
		}

		// Handle CREATE DATABASE statements
		if strings.HasPrefix(upper, "CREATE DATABASE") || strings.HasPrefix(upper, "CREATE SCHEMA") {
			if _, execErr := conn.ExecContext(ctx, cleanStmt); execErr != nil {
				c.JSON(http.StatusOK, gin.H{
					"success":      false,
					"error":        fmt.Sprintf("Error in [%s]: %s", cleanStmt, execErr.Error()),
					"execution_ms": time.Since(startTime).Milliseconds(),
				})
				return
			}
			continue
		}

		isQuery := strings.HasPrefix(upper, "SELECT") ||
			strings.HasPrefix(upper, "SHOW") ||
			strings.HasPrefix(upper, "DESCRIBE") ||
			strings.HasPrefix(upper, "DESC ") ||
			strings.HasPrefix(upper, "EXPLAIN") ||
			strings.HasPrefix(upper, "WITH")

		if isQuery {
			rows, qErr := conn.QueryContext(ctx, cleanStmt)
			if qErr != nil {
				c.JSON(http.StatusOK, gin.H{
					"success":      false,
					"error":        fmt.Sprintf("Query error in [%s]: %s", cleanStmt, qErr.Error()),
					"execution_ms": time.Since(startTime).Milliseconds(),
				})
				return
			}

			colNames, _ := rows.Columns()
			lastColumns = colNames
			var curRowsData []map[string]interface{}
			var curRowsValues [][]interface{}

			for rows.Next() {
				values := make([]interface{}, len(colNames))
				valuePtrs := make([]interface{}, len(colNames))
				for i := range colNames {
					valuePtrs[i] = &values[i]
				}

				if err := rows.Scan(valuePtrs...); err != nil {
					continue
				}

				rowMap := make(map[string]interface{})
				rowVals := make([]interface{}, len(colNames))
				for i, col := range colNames {
					var val interface{}
					rawVal := values[i]
					b, ok := rawVal.([]byte)
					if ok {
						val = string(b)
					} else {
						val = rawVal
					}
					rowMap[col] = val
					rowVals[i] = val
				}
				curRowsData = append(curRowsData, rowMap)
				curRowsValues = append(curRowsValues, rowVals)
			}
			rows.Close()

			lastRowsData = curRowsData
			lastRowsValues = curRowsValues
			hasQueryResults = true
		} else {
			// DDL / DML execution
			res, execErr := conn.ExecContext(ctx, cleanStmt)
			if execErr != nil {
				c.JSON(http.StatusOK, gin.H{
					"success":      false,
					"error":        fmt.Sprintf("Execution error in [%s]: %s", cleanStmt, execErr.Error()),
					"execution_ms": time.Since(startTime).Milliseconds(),
				})
				return
			}
			if res != nil {
				aff, _ := res.RowsAffected()
				totalAffectedRows += aff
			}
		}
	}

	elapsedMs := time.Since(startTime).Milliseconds()
	if elapsedMs < 1 {
		elapsedMs = 1
	}

	// Introspect live schema & available databases
	allDBs := getAvailableDatabases(db, defaultDBName)
	liveSchema, _ := introspectSandboxSchema(activeDB)
	liveSchema.Database = activeDB
	liveSchema.Databases = allDBs

	if hasQueryResults {
		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"database":  activeDB,
			"databases": allDBs,
			"results": gin.H{
				"is_query":      true,
				"columns":       lastColumns,
				"rows":          lastRowsData,
				"values":        lastRowsValues,
				"row_count":     len(lastRowsData),
				"affected_rows": totalAffectedRows,
				"message":       fmt.Sprintf("%d rows returned", len(lastRowsData)),
			},
			"schema":       liveSchema,
			"execution_ms": elapsedMs,
		})
	} else {
		msg := "Query executed successfully."
		if totalAffectedRows > 0 {
			msg = fmt.Sprintf("Query executed successfully. %d rows affected.", totalAffectedRows)
		}
		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"database":  activeDB,
			"databases": allDBs,
			"results": gin.H{
				"is_query":      false,
				"columns":       []string{"Status"},
				"rows":          []map[string]interface{}{{"Status": msg}},
				"values":        [][]interface{}{{msg}},
				"row_count":     0,
				"affected_rows": totalAffectedRows,
				"message":       msg,
			},
			"schema":       liveSchema,
			"execution_ms": elapsedMs,
		})
	}
}

// GetSandboxSchema returns the current visual schema of the session's sandbox database
func GetSandboxSchema(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	_, ok := checkSandboxAccess(c, sessionID)
	if !ok {
		return
	}

	defaultDBName := sanitizeSessionDBName(sessionID)
	targetDB := c.Query("db")
	if targetDB == "" {
		targetDB = defaultDBName
	}

	rootDSN := getSandboxDSN("")
	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer db.Close()

	allDBs := getAvailableDatabases(db, defaultDBName)
	schema, err := introspectSandboxSchema(targetDB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	schema.Database = targetDB
	schema.Databases = allDBs

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"database":  targetDB,
		"databases": allDBs,
		"schema":    schema,
	})
}

// TeardownSandboxDatabase drops the isolated session database when interview finishes
func TeardownSandboxDatabase(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	_, ok := checkSandboxAccess(c, sessionID)
	if !ok {
		return
	}

	defaultDBName := sanitizeSessionDBName(sessionID)
	rootDSN := getSandboxDSN("")

	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to sandbox database server: " + err.Error()})
		return
	}
	defer db.Close()

	allDBs := getAvailableDatabases(db, defaultDBName)
	for _, dbName := range allDBs {
		query := fmt.Sprintf("DROP DATABASE IF EXISTS `%s`;", dbName)
		_, _ = db.Exec(query)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Session database sandbox dropped and cleaned up",
	})
}

// introspectSandboxSchema queries information_schema to extract all tables, columns, and foreign keys
func introspectSandboxSchema(dbName string) (SandboxSchemaPayload, error) {
	rootDSN := getSandboxDSN("")
	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		return SandboxSchemaPayload{Tables: []SandboxTable{}, Relationships: []SandboxRelationship{}}, err
	}
	defer db.Close()

	// 1. Get all tables
	tableQuery := `
		SELECT TABLE_NAME 
		FROM information_schema.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
		ORDER BY TABLE_NAME ASC;
	`
	tRows, err := db.Query(tableQuery, dbName)
	if err != nil {
		return SandboxSchemaPayload{Tables: []SandboxTable{}, Relationships: []SandboxRelationship{}}, err
	}
	defer tRows.Close()

	var tableNames []string
	for tRows.Next() {
		var tName string
		if err := tRows.Scan(&tName); err == nil {
			tableNames = append(tableNames, tName)
		}
	}

	// Palette for table headers in ER diagram
	palette := []string{"#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1"}

	tables := make([]SandboxTable, 0, len(tableNames))
	for idx, tName := range tableNames {
		// Get columns
		colQuery := `
			SELECT 
				COLUMN_NAME, 
				COLUMN_TYPE, 
				COLUMN_KEY, 
				IS_NULLABLE 
			FROM information_schema.COLUMNS 
			WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
			ORDER BY ORDINAL_POSITION ASC;
		`
		cRows, err := db.Query(colQuery, dbName, tName)
		if err != nil {
			continue
		}

		var columns []SandboxColumn
		colIdx := 1
		for cRows.Next() {
			var colName, colType, colKey, isNullableStr string
			if err := cRows.Scan(&colName, &colType, &colKey, &isNullableStr); err == nil {
				isPk := strings.Contains(colKey, "PRI")
				isUnique := strings.Contains(colKey, "UNI") || isPk
				isNullable := (isNullableStr == "YES")

				columns = append(columns, SandboxColumn{
					ID:         fmt.Sprintf("c_%s_%d", tName, colIdx),
					Name:       colName,
					Type:       strings.ToUpper(colType),
					IsPk:       isPk,
					IsFk:       false, // Resolved below from foreign keys
					IsNullable: isNullable,
					IsUnique:   isUnique,
				})
				colIdx++
			}
		}
		cRows.Close()

		// Count rows in the table
		var rowCount int64
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM `%s`.`%s`", dbName, tName)
		_ = db.QueryRow(countQuery).Scan(&rowCount)

		// Calculate staggered grid coordinates
		colPos := idx % 3
		rowPos := idx / 3
		xPos := 60 + (colPos * 360)
		yPos := 60 + (rowPos * 280)

		color := palette[idx%len(palette)]

		tables = append(tables, SandboxTable{
			ID:       "tbl_" + tName,
			Name:     tName,
			X:        xPos,
			Y:        yPos,
			Color:    color,
			RowCount: rowCount,
			Columns:  columns,
		})
	}

	// 2. Get Foreign Key Relationships
	fkQuery := `
		SELECT 
			CONSTRAINT_NAME, 
			TABLE_NAME, 
			COLUMN_NAME, 
			REFERENCED_TABLE_NAME, 
			REFERENCED_COLUMN_NAME 
		FROM information_schema.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = ? 
		  AND REFERENCED_TABLE_NAME IS NOT NULL
		ORDER BY CONSTRAINT_NAME ASC;
	`
	fkRows, err := db.Query(fkQuery, dbName)
	var relationships []SandboxRelationship
	if err == nil {
		defer fkRows.Close()
		relIdx := 1
		for fkRows.Next() {
			var constraintName, fromTable, fromColumn, toTable, toColumn string
			if err := fkRows.Scan(&constraintName, &fromTable, &fromColumn, &toTable, &toColumn); err == nil {
				relationships = append(relationships, SandboxRelationship{
					ID:         fmt.Sprintf("rel_%d", relIdx),
					FromTable:  "tbl_" + toTable,
					FromColumn: toColumn,
					ToTable:    "tbl_" + fromTable,
					ToColumn:   fromColumn,
					Type:       "1:N",
					Label:      fromColumn + " -> " + toTable + "." + toColumn,
				})

				// Mark fromColumn in fromTable as FK
				for tI := range tables {
					if tables[tI].Name == fromTable {
						for cI := range tables[tI].Columns {
							if tables[tI].Columns[cI].Name == fromColumn {
								tables[tI].Columns[cI].IsFk = true
							}
						}
					}
				}
				relIdx++
			}
		}
	}

	return SandboxSchemaPayload{
		Tables:        tables,
		Relationships: relationships,
	}, nil
}
