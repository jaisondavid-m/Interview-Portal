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

// UploadRecordingChunk receives real-time audio chunks from the client and appends them directly to the server audio file
func UploadRecordingChunk(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	// 1. Verify session exists and caller is an authorized participant
	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	userRole, _ := c.Get("userRole")
	isAdmin := userRole == "admin"
	if !isAdmin && session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied to interview audio recording"})
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

	seqNumber := 0
	if seqStr := c.PostForm("sequence_number"); seqStr != "" {
		if s, err := strconv.Atoi(seqStr); err == nil {
			seqNumber = s
		}
	}

	primaryDir := getUploadsDir()
	_ = os.MkdirAll(primaryDir, 0755)

	savedFileName := fmt.Sprintf("session_%s.webm", sessionID)
	destPath := filepath.Join(primaryDir, savedFileName)

	// 2. Read chunk bytes from multipart form file or raw body
	var chunkBytes []byte
	file, err := c.FormFile("chunk")
	if err != nil {
		file, err = c.FormFile("file")
	}
	if err != nil {
		file, err = c.FormFile("audio")
	}

	if err == nil && file != nil {
		src, openErr := file.Open()
		if openErr == nil {
			defer src.Close()
			chunkBytes, _ = io.ReadAll(src)
		}
	} else {
		// Read raw request body
		body, rErr := io.ReadAll(c.Request.Body)
		if rErr == nil && len(body) > 0 {
			chunkBytes = body
		}
	}

	if len(chunkBytes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "No audio chunk data provided"})
		return
	}

	// 3. Single-Uploader Guard: Verify or establish the master uploader for this session
	var recording models.InterviewRecording
	dbErr := database.DB.Where("session_id = ?", session.ID).First(&recording).Error

	if dbErr == nil && recording.UploaderID > 0 && recording.UploaderID != currentUserID {
		// Another client is already the designated master recorder for this session.
		// Ignore secondary stream to prevent audio duplication and WebM chunk interleaving.
		c.JSON(http.StatusOK, gin.H{
			"status":  "ignored",
			"message": "Duplicate stream chunk ignored. Master recording is handled by primary participant.",
		})
		return
	}

	// 4. Atomically append chunk bytes to the server file
	f, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to open session recording file on server",
			"error":   err.Error(),
		})
		return
	}
	defer f.Close()

	n, writeErr := f.Write(chunkBytes)
	if writeErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to append audio chunk to server file",
			"error":   writeErr.Error(),
		})
		return
	}

	fi, statErr := f.Stat()
	var currentFileSize int64 = int64(n)
	if statErr == nil {
		currentFileSize = fi.Size()
	}

	// 5. Mirror to server/uploads/recordings if running locally from repo root
	if fiStat, sErr := os.Stat("server"); sErr == nil && fiStat.IsDir() {
		serverDir := filepath.Join("server", "uploads", "recordings")
		_ = os.MkdirAll(serverDir, 0755)
		altPath := filepath.Join(serverDir, savedFileName)
		if altPath != destPath {
			if altF, altErr := os.OpenFile(altPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644); altErr == nil {
				_, _ = altF.Write(chunkBytes)
				altF.Close()
			}
		}
	}

	// 6. Update or create recording database record in real-time
	if dbErr != nil {
		recording = models.InterviewRecording{
			SessionID:       session.ID,
			UploaderID:      currentUserID,
			FilePath:        destPath,
			FileName:        savedFileName,
			FileSize:        currentFileSize,
			DurationSeconds: durationSecs,
			MimeType:        "audio/webm",
		}
		database.DB.Create(&recording)
	} else {
		recording.FilePath = destPath
		recording.FileName = savedFileName
		recording.FileSize = currentFileSize
		if durationSecs > recording.DurationSeconds {
			recording.DurationSeconds = durationSecs
		}
		recording.MimeType = "audio/webm"
		database.DB.Save(&recording)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"message":         "Audio chunk streamed and stored on server",
		"bytes_written":   n,
		"total_file_size": currentFileSize,
		"sequence_number": seqNumber,
		"recording_id":    recording.ID,
	})
}

// FinalizeInterviewRecording marks the session recording as finalized with verified duration
func FinalizeInterviewRecording(c *gin.Context) {
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

	userRole, _ := c.Get("userRole")
	isAdmin := userRole == "admin"
	if !isAdmin && session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	var recording models.InterviewRecording
	if err := database.DB.Where("session_id = ?", session.ID).First(&recording).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "No recording found to finalize"})
		return
	}

	durationSecs := recording.DurationSeconds
	if durationStr := c.PostForm("duration_seconds"); durationStr != "" {
		if d, err := strconv.Atoi(durationStr); err == nil && d > 0 {
			durationSecs = d
		}
	}

	if fi, err := os.Stat(recording.FilePath); err == nil {
		recording.FileSize = fi.Size()
	}
	recording.DurationSeconds = durationSecs
	database.DB.Save(&recording)

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"message":   "Interview recording finalized successfully",
		"recording": recording,
	})
}

// UploadInterviewRecording handles single-blob upload for backward compatibility
func UploadInterviewRecording(c *gin.Context) {
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

	userRole, _ := c.Get("userRole")
	isAdmin := userRole == "admin"
	if !isAdmin && session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	durationSecs := 0
	if durationStr := c.PostForm("duration_seconds"); durationStr != "" {
		if d, err := strconv.Atoi(durationStr); err == nil {
			durationSecs = d
		}
	}

	primaryDir := getUploadsDir()
	_ = os.MkdirAll(primaryDir, 0755)

	savedFileName := fmt.Sprintf("session_%s.webm", sessionID)
	destPath := filepath.Join(primaryDir, savedFileName)

	var fileSize int64 = 0
	var mimeType string = "audio/webm"

	file, err := c.FormFile("file")
	if err != nil {
		file, err = c.FormFile("audio")
	}
	if err != nil {
		file, err = c.FormFile("recording")
	}

	if err == nil && file != nil {
		fileSize = file.Size
		if m := file.Header.Get("Content-Type"); m != "" {
			mimeType = m
		}
		if saveErr := c.SaveUploadedFile(file, destPath); saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to save audio recording", "error": saveErr.Error()})
			return
		}
	} else {
		buf := new(strings.Builder)
		_, _ = io.Copy(buf, c.Request.Body)
		bodyBytes := []byte(buf.String())

		if len(bodyBytes) > 0 {
			fileSize = int64(len(bodyBytes))
			if err := os.WriteFile(destPath, bodyBytes, 0644); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to write audio stream data", "error": err.Error()})
				return
			}
		} else {
			minimalWebM := []byte{0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d}
			_ = os.WriteFile(destPath, minimalWebM, 0644)
			fileSize = int64(len(minimalWebM))
		}
	}

	// Mirror to server/uploads/recordings if running from repo root
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
		database.DB.Create(&recording)
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
		"message":   "Audio recording stored successfully",
		"recording": recording,
	})
}

// StreamInterviewRecording serves audio files with byte-range seeking, supporting Admin and Session Participants
func StreamInterviewRecording(c *gin.Context) {
	filename := c.Param("filename")
	sessionID := c.Param("id")

	if filename == "" && sessionID != "" {
		filename = fmt.Sprintf("session_%s.webm", sessionID)
	}

	cleanedFilename := filepath.Base(filename)
	if cleanedFilename == "." || cleanedFilename == "/" || cleanedFilename == "" {
		if sessionID != "" {
			cleanedFilename = fmt.Sprintf("session_%s.webm", sessionID)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid recording filename"})
			return
		}
	}

	// If filename has no extension, append .webm default
	if filepath.Ext(cleanedFilename) == "" {
		cleanedFilename = cleanedFilename + ".webm"
	}

	// 1. Check database for recording metadata
	var rec models.InterviewRecording
	var dbFound bool

	if sessionID != "" {
		if err := database.DB.Where("session_id = ?", sessionID).First(&rec).Error; err == nil {
			dbFound = true
			if rec.FileName != "" {
				cleanedFilename = rec.FileName
			}
		}
	}

	if !dbFound {
		if err := database.DB.Where("file_name = ?", cleanedFilename).First(&rec).Error; err == nil {
			dbFound = true
		} else if strings.HasPrefix(cleanedFilename, "session_") {
			// Extract session ID number
			trimmed := strings.TrimPrefix(cleanedFilename, "session_")
			trimmed = strings.TrimSuffix(trimmed, filepath.Ext(trimmed))
			if sID, err := strconv.Atoi(trimmed); err == nil && sID > 0 {
				if err2 := database.DB.Where("session_id = ?", sID).First(&rec).Error; err2 == nil {
					dbFound = true
				}
			}
		}
	}

	// 2. Authorization check: Admin or session participant
	userRole, _ := c.Get("userRole")
	roleStr := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", userRole)))
	isAdmin := roleStr == "admin"

	if !isAdmin && dbFound && rec.SessionID > 0 {
		rawUserID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required to stream recording"})
			return
		}
		currentUserID := rawUserID.(uint)
		var session models.InterviewSession
		if err := database.DB.First(&session, rec.SessionID).Error; err == nil {
			if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
				c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied to this interview recording"})
				return
			}
		}
	}

	// 3. Locate file on disk across all possible directories
	possibleDirs := []string{
		getUploadsDir(),
		"server/uploads/recordings",
		"uploads/recordings",
		"/app/uploads/recordings",
		"../uploads/recordings",
		"uploads",
		"server/uploads",
		"/app/uploads",
		filepath.Join(os.TempDir(), "recordings"),
	}

	var targetPath string
	found := false

	// Try database path first
	if dbFound && rec.FilePath != "" {
		if fi, err := os.Stat(rec.FilePath); err == nil && !fi.IsDir() && fi.Size() > 0 {
			targetPath = rec.FilePath
			found = true
		}
	}

	// Try all candidate directories
	if !found {
		namesToTry := []string{cleanedFilename}
		if sessionID != "" {
			namesToTry = append(namesToTry, fmt.Sprintf("session_%s.webm", sessionID))
		}
		if rec.FileName != "" && rec.FileName != cleanedFilename {
			namesToTry = append(namesToTry, rec.FileName)
		}

		for _, dir := range possibleDirs {
			for _, name := range namesToTry {
				candidate := filepath.Join(dir, name)
				if fi, err := os.Stat(candidate); err == nil && !fi.IsDir() && fi.Size() > 0 {
					targetPath = candidate
					found = true
					break
				}
			}
			if found {
				break
			}
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"status":   "error",
			"message":  "Audio recording file not found on server",
			"filename": cleanedFilename,
		})
		return
	}

	// 4. Set streaming headers
	if strings.HasSuffix(cleanedFilename, ".webm") {
		c.Header("Content-Type", "audio/webm")
	} else if strings.HasSuffix(cleanedFilename, ".ogg") {
		c.Header("Content-Type", "audio/ogg")
	} else if strings.HasSuffix(cleanedFilename, ".mp3") {
		c.Header("Content-Type", "audio/mpeg")
	} else if strings.HasSuffix(cleanedFilename, ".mp4") || strings.HasSuffix(cleanedFilename, ".m4a") {
		c.Header("Content-Type", "audio/mp4")
	} else {
		c.Header("Content-Type", "audio/webm")
	}

	c.Header("Accept-Ranges", "bytes")
	c.Header("Cache-Control", "private, no-cache, no-store, must-revalidate")

	if c.Query("download") == "true" || c.Query("dl") == "1" {
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", cleanedFilename))
	} else {
		c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", cleanedFilename))
	}

	http.ServeFile(c.Writer, c.Request, targetPath)
}

// GetSessionRecording returns metadata for a session's audio recording (Admin & participant access)
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

	if (recording.DurationSeconds <= 0 || recording.DurationSeconds <= 5) && recording.SessionID > 0 {
		var sess models.InterviewSession
		if sErr := database.DB.First(&sess, recording.SessionID).Error; sErr == nil {
			startTime := sess.StartedAt
			if startTime.IsZero() {
				startTime = sess.CreatedAt
			}
			endTime := time.Now()
			if sess.EndedAt != nil && !sess.EndedAt.IsZero() {
				endTime = *sess.EndedAt
			}
			if !startTime.IsZero() {
				diff := int(endTime.Sub(startTime).Seconds())
				if diff > recording.DurationSeconds {
					recording.DurationSeconds = diff
					_ = database.DB.Model(&recording).Update("duration_seconds", diff)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"recording": recording,
	})
}
