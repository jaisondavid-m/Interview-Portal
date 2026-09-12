package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

const UploadsDir = "uploads/recordings"

// EnsureUploadDir creates the recording directory if not existing
func init() {
	_ = os.MkdirAll(UploadsDir, 0755)
}

// UploadInterviewRecording handles the client-uploaded mixed session audio recording
func UploadInterviewRecording(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	// 1. Verify session exists and user is a participant
	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	// 2. Parse multipart audio file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "No audio file provided", "error": err.Error()})
		return
	}

	durationSecs := 0
	if durationStr := c.PostForm("duration_seconds"); durationStr != "" {
		if d, err := strconv.Atoi(durationStr); err == nil {
			durationSecs = d
		}
	}

	// Create directory if missing
	if err := os.MkdirAll(UploadsDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to prepare storage directory"})
		return
	}

	// Safe filename: session_{sessionID}_{timestamp}.webm
	fileExt := filepath.Ext(file.Filename)
	if fileExt == "" {
		fileExt = ".webm"
	}
	savedFileName := fmt.Sprintf("session_%s_%d%s", sessionID, time.Now().Unix(), fileExt)
	destPath := filepath.Join(UploadsDir, savedFileName)

	if err := c.SaveUploadedFile(file, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to save audio recording file", "error": err.Error()})
		return
	}

	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "audio/webm"
	}

	// 3. Save or update database record
	var recording models.InterviewRecording
	err = database.DB.Where("session_id = ?", session.ID).First(&recording).Error

	if err != nil {
		// Create new recording record
		recording = models.InterviewRecording{
			SessionID:       session.ID,
			UploaderID:      currentUserID,
			FilePath:        destPath,
			FileName:        savedFileName,
			FileSize:        file.Size,
			DurationSeconds: durationSecs,
			MimeType:        mimeType,
		}
		if createErr := database.DB.Create(&recording).Error; createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to create recording database entry", "error": createErr.Error()})
			return
		}
	} else {
		// Update existing recording with latest full-session audio
		recording.FilePath = destPath
		recording.FileName = savedFileName
		recording.FileSize = file.Size
		recording.DurationSeconds = durationSecs
		recording.MimeType = mimeType
		recording.UploaderID = currentUserID
		database.DB.Save(&recording)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"message":   "Audio recording uploaded and stored successfully",
		"recording": recording,
	})
}

// StreamInterviewRecording serves the audio file with byte-range support for browser scrub/seek
func StreamInterviewRecording(c *gin.Context) {
	filename := c.Param("filename")
	// Prevent path traversal
	cleanedFilename := filepath.Base(filename)
	filePath := filepath.Join(UploadsDir, cleanedFilename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Audio recording file not found"})
		return
	}

	// Set proper headers for audio streaming
	if strings.HasSuffix(cleanedFilename, ".webm") {
		c.Header("Content-Type", "audio/webm")
	} else if strings.HasSuffix(cleanedFilename, ".ogg") {
		c.Header("Content-Type", "audio/ogg")
	} else if strings.HasSuffix(cleanedFilename, ".mp3") {
		c.Header("Content-Type", "audio/mpeg")
	} else {
		c.Header("Content-Type", "audio/webm")
	}

	c.Header("Accept-Ranges", "bytes")
	c.Header("Cache-Control", "public, max-age=3600")

	c.File(filePath)
}

// GetSessionRecording returns metadata for a session's audio recording
func GetSessionRecording(c *gin.Context) {
	sessionID := c.Param("id")

	var recording models.InterviewRecording
	err := database.DB.
		Preload("Uploader").
		Where("session_id = ?", sessionID).
		First(&recording).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "No audio recording found for this session",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"recording": recording,
	})
}
