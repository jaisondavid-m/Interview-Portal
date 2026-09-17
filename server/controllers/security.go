package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// SubmitSecurityReportInput represents student input payload
type SubmitSecurityReportInput struct {
	AskedCredentials *bool  `json:"asked_credentials" binding:"required"`
	Details          string `json:"details"`
}

// SubmitSecurityReport allows a student to submit a post-interview credential security verification
func SubmitSecurityReport(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "You are not a participant in this interview session"})
		return
	}

	var reportedUserID uint
	if session.InterviewerID == currentUserID {
		reportedUserID = session.IntervieweeID
	} else {
		reportedUserID = session.InterviewerID
	}

	var input SubmitSecurityReportInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid request payload", "error": err.Error()})
		return
	}

	askedCredentials := false
	if input.AskedCredentials != nil {
		askedCredentials = *input.AskedCredentials
	}

	// Check if report already exists for this reporter in this session
	var existing models.SessionSecurityReport
	err := database.DB.Where("session_id = ? AND reporter_id = ?", session.ID, currentUserID).First(&existing).Error

	if err == nil {
		// Update existing report
		existing.AskedCredentials = askedCredentials
		existing.Details = input.Details
		existing.UpdatedAt = time.Now()
		if askedCredentials {
			existing.Status = "pending"
		}
		if saveErr := database.DB.Save(&existing).Error; saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to update security report"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "Security verification updated successfully",
			"report":  existing,
		})
		return
	}

	// Create new report
	report := models.SessionSecurityReport{
		SessionID:        session.ID,
		ReporterID:       currentUserID,
		ReportedUserID:   reportedUserID,
		AskedCredentials: askedCredentials,
		IncidentType:     "credential_solicitation",
		Details:          input.Details,
		Status:           "pending",
	}

	if createErr := database.DB.Create(&report).Error; createErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to record security verification", "error": createErr.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Security verification recorded successfully",
		"report":  report,
	})
}

// GetSessionSecurityReportStatus checks if current student has submitted security review
func GetSessionSecurityReportStatus(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var report models.SessionSecurityReport
	err := database.DB.
		Where("session_id = ? AND reporter_id = ?", sessionID, currentUserID).
		First(&report).Error

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status":        "success",
			"has_submitted": false,
			"report":        nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"has_submitted": true,
		"report":        report,
	})
}

// AdminGetSecurityReports retrieves security and credential solicitation reports for Admin audit with pagination
func AdminGetSecurityReports(c *gin.Context) {
	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "20"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))

	query := database.DB.Model(&models.SessionSecurityReport{})

	if statusFilter != "" && !strings.EqualFold(statusFilter, "all") {
		query = query.Where("status = ?", statusFilter)
	}
	if search != "" {
		s := "%" + search + "%"
		query = query.Joins("LEFT JOIN users AS rep ON rep.id = session_security_reports.reporter_id").
			Joins("LEFT JOIN users AS rpt ON rpt.id = session_security_reports.reported_user_id").
			Where("LOWER(rep.name) LIKE ? OR LOWER(rep.email) LIKE ? OR LOWER(rep.roll_no) LIKE ? OR LOWER(rpt.name) LIKE ? OR LOWER(rpt.email) LIKE ? OR LOWER(rpt.roll_no) LIKE ? OR LOWER(session_security_reports.details) LIKE ?", s, s, s, s, s, s, s)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to count security reports"})
		return
	}

	page := 1
	limit := 20
	var reports []models.SessionSecurityReport

	dbQuery := query.
		Preload("Reporter").
		Preload("ReportedUser").
		Preload("Session").
		Preload("Session.Track").
		Preload("Session.Level").
		Order("session_security_reports.created_at desc")

	if limitStr == "all" || limitStr == "0" || limitStr == "-1" {
		limit = int(totalCount)
		if limit == 0 {
			limit = 1
		}
		if err := dbQuery.Find(&reports).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch security reports"})
			return
		}
	} else {
		if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
			page = p
		}
		if l, err := strconv.Atoi(limitStr); err == nil && l >= 1 {
			limit = l
			if limit > 200 {
				limit = 200
			}
		}
		offset := (page - 1) * limit
		if err := dbQuery.Limit(limit).Offset(offset).Find(&reports).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch security reports"})
			return
		}
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int((totalCount + int64(limit) - 1) / int64(limit))
	}
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"reports": reports,
		"data":    reports,
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

// AdminUpdateSecurityReportStatus updates report status (e.g. reviewed, dismissed)
func AdminUpdateSecurityReportStatus(c *gin.Context) {
	reportID := c.Param("id")
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid status"})
		return
	}

	var report models.SessionSecurityReport
	if err := database.DB.First(&report, reportID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Report not found"})
		return
	}

	report.Status = input.Status
	database.DB.Save(&report)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Report status updated",
		"report":  report,
	})
}
