package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// GetAuditLogs returns a paginated, filterable list of HTTP audit logs
func GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
	if limit < 1 || limit > 100 {
		limit = 25
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.AuditLog{})

	// Search filter (path, query, user email, username, IP)
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		s := "%" + search + "%"
		query = query.Where(
			"path LIKE ? OR query LIKE ? OR user_email LIKE ? OR user_name LIKE ? OR ip_address LIKE ? OR request_body LIKE ? OR response_body LIKE ?",
			s, s, s, s, s, s, s,
		)
	}

	// Method filter (e.g. GET, POST, PUT, DELETE)
	if method := strings.TrimSpace(c.Query("method")); method != "" && method != "ALL" {
		query = query.Where("method = ?", strings.ToUpper(method))
	}

	// Status code filter (e.g. "2xx", "4xx", "5xx", or specific status like "404")
	if status := strings.TrimSpace(c.Query("status")); status != "" && status != "ALL" {
		switch strings.ToLower(status) {
		case "2xx", "success":
			query = query.Where("status_code >= 200 AND status_code < 300")
		case "3xx", "redirect":
			query = query.Where("status_code >= 300 AND status_code < 400")
		case "4xx", "client_error":
			query = query.Where("status_code >= 400 AND status_code < 500")
		case "5xx", "server_error":
			query = query.Where("status_code >= 500")
		case "errors":
			query = query.Where("status_code >= 400")
		default:
			if code, err := strconv.Atoi(status); err == nil {
				query = query.Where("status_code = ?", code)
			}
		}
	}

	// Role filter
	if role := strings.TrimSpace(c.Query("role")); role != "" && role != "ALL" {
		query = query.Where("user_role = ?", role)
	}

	// Date range filters
	if fromDate := strings.TrimSpace(c.Query("from_date")); fromDate != "" {
		if t, err := time.Parse(time.RFC3339, fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		} else if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if toDate := strings.TrimSpace(c.Query("to_date")); toDate != "" {
		if t, err := time.Parse(time.RFC3339, toDate); err == nil {
			query = query.Where("created_at <= ?", t)
		} else if t, err := time.Parse("2006-01-02", toDate); err == nil {
			query = query.Where("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	var totalCount int64
	query.Count(&totalCount)

	var logs []models.AuditLog
	err := query.
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch audit logs: " + err.Error(),
		})
		return
	}

	totalPages := (int(totalCount) + limit - 1) / limit
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"logs":        logs,
		"data":        logs,
		"total":       totalCount,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
		"has_next":    hasNext,
		"has_prev":    hasPrev,
		"pagination": gin.H{
			"page":          page,
			"limit":         limit,
			"total_records": totalCount,
			"total_pages":   totalPages,
			"has_next":      hasNext,
			"has_prev":      hasPrev,
		},
	})
}

// GetAuditLogByID returns full details of a specific audit log
func GetAuditLogByID(c *gin.Context) {
	logID := c.Param("id")

	var logEntry models.AuditLog
	if err := database.DB.First(&logEntry, logID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Audit log entry not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"log":    logEntry,
	})
}

// TopEndpointStat represents count and average latency for a specific path
type TopEndpointStat struct {
	Method     string  `json:"method"`
	Path       string  `json:"path"`
	Count      int64   `json:"count"`
	AvgLatency float64 `json:"avg_latency"`
}

// GetAuditStats returns aggregated telemetry and health statistics for developer monitoring
func GetAuditStats(c *gin.Context) {
	var totalRequests int64
	database.DB.Model(&models.AuditLog{}).Count(&totalRequests)

	var successCount int64
	database.DB.Model(&models.AuditLog{}).Where("status_code >= 200 AND status_code < 400").Count(&successCount)

	var clientErrorCount int64
	database.DB.Model(&models.AuditLog{}).Where("status_code >= 400 AND status_code < 500").Count(&clientErrorCount)

	var serverErrorCount int64
	database.DB.Model(&models.AuditLog{}).Where("status_code >= 500").Count(&serverErrorCount)

	type LatencyResult struct {
		AvgLatency float64
	}
	var latResult LatencyResult
	database.DB.Model(&models.AuditLog{}).Select("COALESCE(AVG(latency_ms), 0) as avg_latency").Scan(&latResult)

	// Top 5 most active endpoints
	var topEndpoints []TopEndpointStat
	database.DB.Model(&models.AuditLog{}).
		Select("method, path, COUNT(*) as count, AVG(latency_ms) as avg_latency").
		Group("method, path").
		Order("count desc").
		Limit(5).
		Scan(&topEndpoints)

	// Breakdown by HTTP method
	type MethodCount struct {
		Method string `json:"method"`
		Count  int64  `json:"count"`
	}
	var methodBreakdown []MethodCount
	database.DB.Model(&models.AuditLog{}).
		Select("method, COUNT(*) as count").
		Group("method").
		Order("count desc").
		Scan(&methodBreakdown)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"stats": gin.H{
			"total_requests":   totalRequests,
			"success_count":    successCount,
			"client_errors":    clientErrorCount,
			"server_errors":    serverErrorCount,
			"avg_latency_ms":   latResult.AvgLatency,
			"top_endpoints":    topEndpoints,
			"method_breakdown": methodBreakdown,
		},
	})
}

// ClearAuditLogs allows developers or administrators to purge old audit log entries
func ClearAuditLogs(c *gin.Context) {
	daysStr := c.DefaultQuery("older_than_days", "0")
	days, _ := strconv.Atoi(daysStr)

	query := database.DB.Unscoped()
	if days > 0 {
		cutoff := time.Now().AddDate(0, 0, -days)
		query = query.Where("created_at < ?", cutoff)
	}

	result := query.Delete(&models.AuditLog{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to clear audit logs: " + result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       fmt.Sprintf("Audit logs cleared successfully (%d entries deleted)", result.RowsAffected),
		"rows_affected": result.RowsAffected,
	})
}
