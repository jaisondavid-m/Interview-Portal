package controllers

import (
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
	ID      string          `json:"id"`
	Name    string          `json:"name"`
	X       int             `json:"x"`
	Y       int             `json:"y"`
	Color   string          `json:"color"`
	Columns []SandboxColumn `json:"columns"`
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

	dbName := sanitizeSessionDBName(sessionID)
	rootDSN := getSandboxDSN("")

	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to sandbox database server: " + err.Error()})
		return
	}
	defer db.Close()

	// 1. Create isolated session database
	query := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", dbName)
	if _, err := db.Exec(query); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sandbox database: " + err.Error()})
		return
	}

	// 2. Execute any optional initial DDL if provided
	var reqBody struct {
		InitialDDL string `json:"initial_ddl"`
	}
	if err := c.ShouldBindJSON(&reqBody); err == nil && strings.TrimSpace(reqBody.InitialDDL) != "" {
		sessionDBDSN := getSandboxDSN(dbName)
		sessionDB, err := sql.Open("mysql", sessionDBDSN)
		if err == nil {
			defer sessionDB.Close()
			_, _ = sessionDB.Exec(reqBody.InitialDDL)
		}
	}

	// 3. Introspect schema
	schema, _ := introspectSandboxSchema(dbName)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"database": dbName,
		"message":  "Isolated database sandbox ready",
		"schema":   schema,
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
		Query string `json:"query" binding:"required"`
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

	dbName := sanitizeSessionDBName(sessionID)
	sessionDBDSN := getSandboxDSN(dbName)

	db, err := sql.Open("mysql", sessionDBDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to session database: " + err.Error()})
		return
	}
	defer db.Close()

	startTime := time.Now()

	// Execute queries
	var columns []string
	var rowsData []map[string]interface{}
	var isSelect bool
	var affectedRows int64

	// Split statements for safety/execution or run with multiStatements enabled
	isSelect = strings.HasPrefix(strings.ToUpper(trimmedSQL), "SELECT") ||
		strings.HasPrefix(strings.ToUpper(trimmedSQL), "SHOW") ||
		strings.HasPrefix(strings.ToUpper(trimmedSQL), "DESCRIBE") ||
		strings.HasPrefix(strings.ToUpper(trimmedSQL), "EXPLAIN")

	if isSelect && !strings.Contains(trimmedSQL, ";") {
		// Single query execution
		rows, qErr := db.Query(trimmedSQL)
		if qErr != nil {
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"error":        qErr.Error(),
				"execution_ms": time.Since(startTime).Milliseconds(),
			})
			return
		}
		defer rows.Close()

		colNames, _ := rows.Columns()
		columns = colNames

		for rows.Next() {
			values := make([]interface{}, len(columns))
			valuePtrs := make([]interface{}, len(columns))
			for i := range columns {
				valuePtrs[i] = &values[i]
			}

			if err := rows.Scan(valuePtrs...); err != nil {
				continue
			}

			rowMap := make(map[string]interface{})
			for i, col := range columns {
				var val interface{}
				rawVal := values[i]
				b, ok := rawVal.([]byte)
				if ok {
					val = string(b)
				} else {
					val = rawVal
				}
				rowMap[col] = val
			}
			rowsData = append(rowsData, rowMap)
		}
	} else {
		// DDL / DML or multiple statements execution
		res, execErr := db.Exec(trimmedSQL)
		if execErr != nil {
			c.JSON(http.StatusOK, gin.H{
				"success":      false,
				"error":        execErr.Error(),
				"execution_ms": time.Since(startTime).Milliseconds(),
			})
			return
		}
		if res != nil {
			affectedRows, _ = res.RowsAffected()
		}
	}

	elapsedMs := time.Since(startTime).Milliseconds()
	if elapsedMs < 1 {
		elapsedMs = 1
	}

	// Always introspect live schema after query execution to update ER Diagram
	liveSchema, _ := introspectSandboxSchema(dbName)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": gin.H{
			"is_query":      isSelect,
			"columns":       columns,
			"rows":          rowsData,
			"row_count":     len(rowsData),
			"affected_rows": affectedRows,
		},
		"schema":       liveSchema,
		"execution_ms": elapsedMs,
	})
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

	dbName := sanitizeSessionDBName(sessionID)
	schema, err := introspectSandboxSchema(dbName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"schema":  schema,
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

	dbName := sanitizeSessionDBName(sessionID)
	rootDSN := getSandboxDSN("")

	db, err := sql.Open("mysql", rootDSN)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to connect to sandbox database server: " + err.Error()})
		return
	}
	defer db.Close()

	query := fmt.Sprintf("DROP DATABASE IF EXISTS `%s`;", dbName)
	_, _ = db.Exec(query)

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

	// Colors for table headers
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
					IsFk:       false, // Will be resolved below
					IsNullable: isNullable,
					IsUnique:   isUnique,
				})
				colIdx++
			}
		}
		cRows.Close()

		// Calculate initial staggered grid coordinates
		colPos := idx % 3
		rowPos := idx / 3
		xPos := 60 + (colPos * 360)
		yPos := 60 + (rowPos * 280)

		color := palette[idx%len(palette)]

		tables = append(tables, SandboxTable{
			ID:      "tbl_" + tName,
			Name:    tName,
			X:       xPos,
			Y:       yPos,
			Color:   color,
			Columns: columns,
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
