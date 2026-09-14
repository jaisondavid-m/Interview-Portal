package controllers

import (
	"net/http"
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

// AdminGetSecurityReports retrieves all security and credential solicitation reports for Admin audit
func AdminGetSecurityReports(c *gin.Context) {
	var reports []models.SessionSecurityReport
	err := database.DB.
		Preload("Reporter").
		Preload("ReportedUser").
		Preload("Session").
		Preload("Session.Track").
		Preload("Session.Level").
		Order("created_at desc").
		Find(&reports).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch security reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"reports": reports,
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
