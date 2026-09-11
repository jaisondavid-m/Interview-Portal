package controllers

import (
	"net/http"
	"sync"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// Global mutex to avoid race conditions during queue pairings
var queueMutex sync.Mutex

// GetStudentTracks returns interview tracks with their levels and mode information for students
func GetStudentTracks(c *gin.Context) {
	var tracks []models.InterviewTrack
	err := database.DB.Preload("Levels.Questions").Order("id asc").Find(&tracks).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch interview tracks",
		})
		return
	}

	// Prepare sanitized response with question count per level
	type LevelDTO struct {
		ID              uint                 `json:"id"`
		TrackID         uint                 `json:"track_id"`
		LevelNumber     int                  `json:"level_number"`
		Name            string               `json:"name"`
		Description     string               `json:"description"`
		Mode            models.InterviewMode `json:"mode"`
		DurationMinutes int                  `json:"duration_minutes"`
		QuestionsCount  int                  `json:"questions_count"`
	}

	type TrackDTO struct {
		ID             uint       `json:"id"`
		Title          string     `json:"title"`
		Slug           string     `json:"slug"`
		Category       string     `json:"category"`
		Icon           string     `json:"icon"`
		Description    string     `json:"description"`
		LevelsCount    int        `json:"levels_count"`
		QuestionsCount int        `json:"questions_count"`
		Levels         []LevelDTO `json:"levels"`
	}

	result := make([]TrackDTO, len(tracks))
	for i, t := range tracks {
		totalQ := 0
		lvlDTOs := make([]LevelDTO, len(t.Levels))
		for j, l := range t.Levels {
			qCount := len(l.Questions)
			totalQ += qCount
			lvlDTOs[j] = LevelDTO{
				ID:              l.ID,
				TrackID:         l.TrackID,
				LevelNumber:     l.LevelNumber,
				Name:            l.Name,
				Description:     l.Description,
				Mode:            l.Mode,
				DurationMinutes: l.DurationMin,
				QuestionsCount:  qCount,
			}
		}

		result[i] = TrackDTO{
			ID:             t.ID,
			Title:          t.Title,
			Slug:           t.Slug,
			Category:       t.Category,
			Icon:           t.Icon,
			Description:    t.Description,
			LevelsCount:    len(t.Levels),
			QuestionsCount: totalQ,
			Levels:         lvlDTOs,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   result,
	})
}

// JoinMatchmaking places the student in the queue and pairs with an available peer
func JoinMatchmaking(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	var req struct {
		TrackID uint `json:"track_id" binding:"required"`
		LevelID uint `json:"level_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Valid track_id is required"})
		return
	}

	// Lock mutex for atomic matching
	queueMutex.Lock()
	defer queueMutex.Unlock()

	// 1. Check if track exists
	var track models.InterviewTrack
	if err := database.DB.Preload("Levels").First(&track, req.TrackID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview track not found"})
		return
	}

	levelID := req.LevelID
	if levelID == 0 && len(track.Levels) > 0 {
		levelID = track.Levels[0].ID
	}

	// 2. Cancel old waiting queue entries for this user
	database.DB.Model(&models.MatchmakingQueueEntry{}).
		Where("user_id = ? AND status = 'waiting'", currentUserID).
		Update("status", "cancelled")

	// 3. Search for another waiting student in the same track
	var peerEntry models.MatchmakingQueueEntry
	err := database.DB.Where("track_id = ? AND user_id != ? AND status = 'waiting'", req.TrackID, currentUserID).
		Order("created_at asc").
		First(&peerEntry).Error

	if err == nil {
		// PEER FOUND! Create InterviewSession
		// Peer becomes initial Interviewer, Current User becomes initial Interviewee
		session := models.InterviewSession{
			TrackID:       req.TrackID,
			LevelID:       levelID,
			InterviewerID: peerEntry.UserID,
			IntervieweeID: currentUserID,
			Status:        "in_progress",
			StartedAt:     time.Now(),
		}

		if err := database.DB.Create(&session).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to establish interview session"})
			return
		}

		// Update peer entry status to matched
		database.DB.Model(&peerEntry).Updates(map[string]interface{}{
			"status":             "matched",
			"matched_session_id": session.ID,
		})

		// Create matched queue entry for current user too
		userEntry := models.MatchmakingQueueEntry{
			UserID:           currentUserID,
			TrackID:          req.TrackID,
			LevelID:          levelID,
			Status:           "matched",
			MatchedSessionID: session.ID,
		}
		database.DB.Create(&userEntry)

		c.JSON(http.StatusOK, gin.H{
			"status":     "matched",
			"matched":    true,
			"session_id": session.ID,
			"role":       "interviewee",
			"message":    "Peer match found! Connecting to live room...",
		})
		return
	}

	// 4. No peer yet -> Add student to waiting queue
	newEntry := models.MatchmakingQueueEntry{
		UserID:  currentUserID,
		TrackID: req.TrackID,
		LevelID: levelID,
		Status:  "waiting",
	}

	if err := database.DB.Create(&newEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to join matchmaking queue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "waiting",
		"matched":  false,
		"queue_id": newEntry.ID,
		"track_id": req.TrackID,
		"message":  "Waiting for another peer to join...",
	})
}

// GetMatchmakingStatus polls for queue updates
func GetMatchmakingStatus(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	var entry models.MatchmakingQueueEntry
	err := database.DB.Where("user_id = ?", currentUserID).
		Order("id desc").
		First(&entry).Error

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"status": "idle"})
		return
	}

	if entry.Status == "matched" && entry.MatchedSessionID > 0 {
		var session models.InterviewSession
		if err := database.DB.First(&session, entry.MatchedSessionID).Error; err == nil {
			role := "interviewee"
			if session.InterviewerID == currentUserID {
				role = "interviewer"
			}

			c.JSON(http.StatusOK, gin.H{
				"status":     "matched",
				"matched":    true,
				"session_id": entry.MatchedSessionID,
				"role":       role,
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   entry.Status,
		"matched":  false,
		"queue_id": entry.ID,
		"track_id": entry.TrackID,
	})
}

// CancelMatchmaking removes the student from the waiting queue
func CancelMatchmaking(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	queueMutex.Lock()
	defer queueMutex.Unlock()

	database.DB.Model(&models.MatchmakingQueueEntry{}).
		Where("user_id = ? AND status = 'waiting'", currentUserID).
		Update("status", "cancelled")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Matchmaking search cancelled successfully",
	})
}

// GetInterviewSession fetches live session information, participants, and questions
func GetInterviewSession(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var session models.InterviewSession
	err := database.DB.
		Preload("Track").
		Preload("Level.Questions").
		Preload("Interviewer").
		Preload("Interviewee").
		First(&session, sessionID).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	// Verify current user is a participant
	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied to this interview session"})
		return
	}

	// Identify role and peer
	currentUserRole := "interviewee"
	var peerUser *models.User

	if session.InterviewerID == currentUserID {
		currentUserRole = "interviewer"
		peerUser = session.Interviewee
	} else {
		peerUser = session.Interviewer
	}

	type UserSummary struct {
		ID         uint   `json:"id"`
		Name       string `json:"name"`
		Email      string `json:"email"`
		RollNo     string `json:"roll_no"`
		Department string `json:"department"`
	}

	var peerSummary *UserSummary
	if peerUser != nil {
		peerSummary = &UserSummary{
			ID:         peerUser.ID,
			Name:       peerUser.Name,
			Email:      peerUser.Email,
			RollNo:     peerUser.RollNo,
			Department: peerUser.Department,
		}
	}

	var interviewerSummary *UserSummary
	if session.Interviewer != nil {
		interviewerSummary = &UserSummary{
			ID:         session.Interviewer.ID,
			Name:       session.Interviewer.Name,
			Email:      session.Interviewer.Email,
			RollNo:     session.Interviewer.RollNo,
			Department: session.Interviewer.Department,
		}
	}

	var intervieweeSummary *UserSummary
	if session.Interviewee != nil {
		intervieweeSummary = &UserSummary{
			ID:         session.Interviewee.ID,
			Name:       session.Interviewee.Name,
			Email:      session.Interviewee.Email,
			RollNo:     session.Interviewee.RollNo,
			Department: session.Interviewee.Department,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"session": gin.H{
				"id":                     session.ID,
				"track_id":               session.TrackID,
				"track":                  session.Track,
				"level_id":               session.LevelID,
				"level":                  session.Level,
				"interviewer_id":         session.InterviewerID,
				"interviewer":            interviewerSummary,
				"interviewee_id":         session.IntervieweeID,
				"interviewee":            intervieweeSummary,
				"status":                 session.Status,
				"roles_switched":         session.RolesSwitched,
				"switch_count":           session.SwitchCount,
				"current_question_index": session.CurrentQIndex,
				"started_at":             session.StartedAt,
				"ended_at":               session.EndedAt,
			},
			"current_user_role": currentUserRole,
			"peer":              peerSummary,
		},
	})
}

// SwitchSessionRoles swaps the interviewer and interviewee roles
func SwitchSessionRoles(c *gin.Context) {
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
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	// Swap participants
	oldInterviewer := session.InterviewerID
	session.InterviewerID = session.IntervieweeID
	session.IntervieweeID = oldInterviewer
	session.RolesSwitched = true
	session.SwitchCount++

	if err := database.DB.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to switch interview roles"})
		return
	}

	currentUserRole := "interviewee"
	if session.InterviewerID == currentUserID {
		currentUserRole = "interviewer"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":            "success",
		"message":           "Roles switched successfully",
		"current_user_role": currentUserRole,
		"switch_count":      session.SwitchCount,
		"interviewer_id":    session.InterviewerID,
		"interviewee_id":    session.IntervieweeID,
	})
}

// EndInterviewSession marks the session as completed
func EndInterviewSession(c *gin.Context) {
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
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	now := time.Now()
	session.Status = "completed"
	session.EndedAt = &now
	database.DB.Save(&session)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Interview session finished successfully",
	})
}
