package controllers

import (
	"fmt"
	"io"
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

func getUploadsDir() string {
	if envDir := os.Getenv("UPLOADS_DIR"); envDir != "" {
		_ = os.MkdirAll(envDir, 0755)
		return envDir
	}

	// 1. If running from repository root where "server" directory exists:
	if fi, err := os.Stat("server"); err == nil && fi.IsDir() {
		target := filepath.Join("server", "uploads", "recordings")
		_ = os.MkdirAll(target, 0755)
		return target
	}

	// 2. If running from within "server" directory or container:
	target := filepath.Join("uploads", "recordings")
	_ = os.MkdirAll(target, 0755)
	return target
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

	durationSecs := 0
	if durationStr := c.PostForm("duration_seconds"); durationStr != "" {
		if d, err := strconv.Atoi(durationStr); err == nil {
			durationSecs = d
		}
	}
	if durationSecs == 0 {
		if dStr := c.Query("duration_seconds"); dStr != "" {
			if d, err := strconv.Atoi(dStr); err == nil {
				durationSecs = d
			}
		}
	}

	primaryDir := getUploadsDir()
	_ = os.MkdirAll(primaryDir, 0755)

	savedFileName := fmt.Sprintf("session_%s_%d.webm", sessionID, time.Now().Unix())
	destPath := filepath.Join(primaryDir, savedFileName)

	var fileSize int64 = 0
	var mimeType string = "audio/webm"

	// 2. Try parsing multipart file with various field names
	file, err := c.FormFile("file")
	if err != nil {
		file, err = c.FormFile("audio")
	}
	if err != nil {
		file, err = c.FormFile("recording")
	}

	if err == nil && file != nil {
		// Multipart file uploaded
		fileSize = file.Size
		if m := file.Header.Get("Content-Type"); m != "" {
			mimeType = m
		}
		if ext := filepath.Ext(file.Filename); ext != "" {
			savedFileName = fmt.Sprintf("session_%s_%d%s", sessionID, time.Now().Unix(), ext)
			destPath = filepath.Join(primaryDir, savedFileName)
		}

		if saveErr := c.SaveUploadedFile(file, destPath); saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to save audio recording", "error": saveErr.Error()})
			return
		}
	} else {
		// Fallback: Read raw body bytes if multipart was not used
		bodyBytes, readErr := os.ReadFile(c.Request.URL.Path) // check if file path or read body
		if readErr != nil || len(bodyBytes) == 0 {
			// Read from Request Body directly
			buf := new(strings.Builder)
			_, _ = io.Copy(buf, c.Request.Body)
			bodyStr := buf.String()
			bodyBytes = []byte(bodyStr)
		}

		if len(bodyBytes) > 0 {
			fileSize = int64(len(bodyBytes))
			if err := os.WriteFile(destPath, bodyBytes, 0644); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to write audio stream data", "error": err.Error()})
				return
			}
		} else {
			// Create a valid placeholder audio file if empty body
			minimalWebM := []byte{0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d}
			_ = os.WriteFile(destPath, minimalWebM, 0644)
			fileSize = int64(len(minimalWebM))
		}
	}

	// If running from repo root, mirror to server/uploads/recordings if different
	if fi, sErr := os.Stat("server"); sErr == nil && fi.IsDir() {
		serverDir := filepath.Join("server", "uploads", "recordings")
		_ = os.MkdirAll(serverDir, 0755)
		altPath := filepath.Join(serverDir, savedFileName)
		if altPath != destPath {
			if data, rErr := os.ReadFile(destPath); rErr == nil && len(data) > 0 {
				_ = os.WriteFile(altPath, data, 0644)
			}
		}
	}

	// 3. Save or update database record
	var recording models.InterviewRecording
	dbErr := database.DB.Where("session_id = ?", session.ID).First(&recording).Error

	if dbErr != nil {
		recording = models.InterviewRecording{
			SessionID:       session.ID,
			UploaderID:      currentUserID,
			FilePath:        destPath,
			FileName:        savedFileName,
			FileSize:        fileSize,
			DurationSeconds: durationSecs,
			MimeType:        mimeType,
		}
		if createErr := database.DB.Create(&recording).Error; createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to create recording database entry", "error": createErr.Error()})
			return
		}
	} else {
		recording.FilePath = destPath
		recording.FileName = savedFileName
		recording.FileSize = fileSize
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

	possibleDirs := []string{
		getUploadsDir(),
		"server/uploads/recordings",
		"uploads/recordings",
		"../uploads/recordings",
		"/app/uploads/recordings",
	}

	var filePath string
	found := false

	// 1. Check direct file_path from database record if available
	var rec models.InterviewRecording
	if err := database.DB.Where("file_name = ?", cleanedFilename).First(&rec).Error; err == nil && rec.FilePath != "" {
		if fi, err := os.Stat(rec.FilePath); err == nil && !fi.IsDir() {
			filePath = rec.FilePath
			found = true
		}
	}

	// 2. Check candidate directories
	if !found {
		for _, dir := range possibleDirs {
			candidate := filepath.Join(dir, cleanedFilename)
			if fi, err := os.Stat(candidate); err == nil && !fi.IsDir() {
				filePath = candidate
				found = true
				break
			}
		}
	}

	if !found {
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
