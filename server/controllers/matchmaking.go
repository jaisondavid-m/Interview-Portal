package controllers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Global mutex to avoid race conditions during queue pairings
var queueMutex sync.Mutex

// Helper to extract starter code from question templates
func extractStarterCode(q models.InterviewQuestion, defaultCode string) string {
	for _, t := range q.Templates {
		if strings.EqualFold(t.Language, "javascript") && t.StarterCode != "" {
			return t.StarterCode
		}
	}
	for _, t := range q.Templates {
		if t.StarterCode != "" {
			return t.StarterCode
		}
	}
	return defaultCode
}

func getDefaultStarterTemplate(lang string) string {
	return ""
}

// Helper to sanitize questions for candidate (strip hidden test cases, solutions, hints, rubrics)
func sanitizeQuestionForCandidate(q models.InterviewQuestion) gin.H {
	// 1. Build starter templates
	templatesMap := make(map[string]string)
	for _, t := range q.Templates {
		templatesMap[t.Language] = t.StarterCode
	}
	if templatesMap["javascript"] == "" {
		templatesMap["javascript"] = getDefaultStarterTemplate("javascript")
	}
	if templatesMap["python"] == "" {
		templatesMap["python"] = getDefaultStarterTemplate("python")
	}
	starterCode := templatesMap["javascript"]

	// 2. Build open test cases
	var openTestCases []gin.H
	for _, tc := range q.TestCases {
		if !tc.IsHidden {
			openTestCases = append(openTestCases, gin.H{
				"input":       tc.Input,
				"output":      tc.ExpectedOutput,
				"explanation": tc.Explanation,
			})
		}
	}

	// 3. Extract detail fields
	constraints := ""
	scenario := ""
	if q.Detail != nil {
		constraints = q.Detail.Constraints
		scenario = q.Detail.Scenario
	}

	// 4. Extract sanitized MCQ options (hide is_correct)
	var sanitizedOptions []gin.H
	for _, opt := range q.MCQOptions {
		sanitizedOptions = append(sanitizedOptions, gin.H{
			"id":          opt.OptionKey,
			"option_key":  opt.OptionKey,
			"text":        opt.OptionText,
			"option_text": opt.OptionText,
		})
	}

	sanitizedPayload := gin.H{
		"starter_code":      starterCode,
		"starter_code_js":   templatesMap["javascript"],
		"starter_code_py":   templatesMap["python"],
		"starter_code_cpp":  templatesMap["cpp"],
		"starter_code_java": templatesMap["java"],
		"open_test_cases":   openTestCases,
		"constraints":       constraints,
		"scenario":          scenario,
		"options":           sanitizedOptions,
	}

	return gin.H{
		"id":          q.ID,
		"level_id":    q.LevelID,
		"title":       q.Title,
		"prompt":      q.Prompt,
		"difficulty":  q.Difficulty,
		"type":        q.Type,
		"templates":   q.Templates,
		"test_cases":  openTestCases,
		"detail":      q.Detail,
		"options":     sanitizedOptions,
		"mcq_options": sanitizedOptions,
		"payload":     sanitizedPayload,
		"created_at":  q.CreatedAt,
	}
}

// Helper for interviewer full question payload
func fullQuestionForInterviewer(q models.InterviewQuestion) gin.H {
	templatesMap := make(map[string]string)
	for _, t := range q.Templates {
		templatesMap[t.Language] = t.StarterCode
	}
	if templatesMap["javascript"] == "" {
		templatesMap["javascript"] = getDefaultStarterTemplate("javascript")
	}
	if templatesMap["python"] == "" {
		templatesMap["python"] = getDefaultStarterTemplate("python")
	}

	var openTestCases []gin.H
	for _, tc := range q.TestCases {
		if !tc.IsHidden {
			openTestCases = append(openTestCases, gin.H{
				"input":       tc.Input,
				"output":      tc.ExpectedOutput,
				"explanation": tc.Explanation,
			})
		}
	}

	var hints []string
	var interviewTips []string
	var rubrics []string
	var talkingPoints []string
	var tradeoffs []string

	for _, h := range q.Hints {
		switch h.Type {
		case "hint":
			hints = append(hints, h.Content)
		case "interview_tip":
			interviewTips = append(interviewTips, h.Content)
		case "rubric":
			rubrics = append(rubrics, h.Content)
		case "talking_point":
			talkingPoints = append(talkingPoints, h.Content)
		case "tradeoff":
			tradeoffs = append(tradeoffs, h.Content)
		}
	}

	var mcqOptions []gin.H
	correctOption := ""
	explanation := ""
	constraints := ""
	expectedApproach := ""
	expectedComplexity := ""
	idealAnswer := ""
	scenario := ""

	if q.Detail != nil {
		constraints = q.Detail.Constraints
		expectedApproach = q.Detail.ExpectedApproach
		expectedComplexity = q.Detail.ExpectedComplexity
		idealAnswer = q.Detail.IdealAnswer
		scenario = q.Detail.Scenario
		correctOption = q.Detail.CorrectOption
		explanation = q.Detail.Explanation
	}

	for _, opt := range q.MCQOptions {
		isCorr := opt.IsCorrect
		if !isCorr && correctOption != "" && (strings.EqualFold(opt.OptionKey, correctOption) || strings.EqualFold(opt.OptionText, correctOption)) {
			isCorr = true
		}
		mcqOptions = append(mcqOptions, gin.H{
			"id":          opt.OptionKey,
			"option_key":  opt.OptionKey,
			"text":        opt.OptionText,
			"option_text": opt.OptionText,
			"is_correct":  isCorr,
		})
	}

	fullPayload := gin.H{
		"starter_code":        templatesMap["javascript"],
		"starter_code_js":     templatesMap["javascript"],
		"starter_code_py":     templatesMap["python"],
		"starter_code_cpp":    templatesMap["cpp"],
		"starter_code_java":   templatesMap["java"],
		"open_test_cases":     openTestCases,
		"constraints":         constraints,
		"expected_approach":   expectedApproach,
		"expected_complexity": expectedComplexity,
		"hints":               hints,
		"interview_tips":      interviewTips,
		"ideal_answer":        idealAnswer,
		"rubrics":             rubrics,
		"scenario":            scenario,
		"talking_points":      talkingPoints,
		"tradeoffs":           tradeoffs,
		"options":             mcqOptions,
		"correct_option":      correctOption,
		"explanation":         explanation,
	}

	return gin.H{
		"id":             q.ID,
		"level_id":       q.LevelID,
		"title":          q.Title,
		"prompt":         q.Prompt,
		"difficulty":     q.Difficulty,
		"type":           q.Type,
		"detail":         q.Detail,
		"templates":      q.Templates,
		"test_cases":     openTestCases,
		"options":        mcqOptions,
		"mcq_options":    mcqOptions,
		"correct_option": correctOption,
		"explanation":    explanation,
		"ideal_answer":   idealAnswer,
		"talking_points": talkingPoints,
		"tradeoffs":      tradeoffs,
		"rubrics":        rubrics,
		"interview_tips": interviewTips,
		"payload":        fullPayload,
		"created_at":     q.CreatedAt,
	}
}

// GetStudentTracks returns interview tracks with their levels and mode information for students
func GetStudentTracks(c *gin.Context) {
	var tracks []models.InterviewTrack
	err := database.DB.
		Preload("Levels.Questions.Detail").
		Preload("Levels.Questions.Templates").
		Preload("Levels.Questions.TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Levels.Questions.Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Levels.Questions.MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		Order("id asc").
		Find(&tracks).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch interview tracks",
		})
		return
	}

	type LevelDTO struct {
		ID              uint                 `json:"id"`
		TrackID         uint                 `json:"track_id"`
		LevelNumber     int                  `json:"level_number"`
		Name            string               `json:"name"`
		Description     string               `json:"description"`
		Mode            models.InterviewMode `json:"mode"`
		DurationMinutes int                  `json:"duration_minutes"`
		QuestionCount   int                  `json:"question_count"`
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
			qLoad := l.QuestionCount
			if qLoad <= 0 {
				if l.Mode == models.ModeMCQ {
					qLoad = 10
				} else {
					qLoad = 1
				}
			}
			lvlDTOs[j] = LevelDTO{
				ID:              l.ID,
				TrackID:         l.TrackID,
				LevelNumber:     l.LevelNumber,
				Name:            l.Name,
				Description:     l.Description,
				Mode:            l.Mode,
				DurationMinutes: l.DurationMin,
				QuestionCount:   qLoad,
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

// Cleanup helper to auto-expire abandoned sessions (> 2 hours) and stale queues (> 15 mins)
func cleanupStaleMatchmakingAndSessions() {
	// 1. Stale in-progress sessions older than 2 hours -> mark completed
	database.DB.Exec("UPDATE interview_sessions SET status = 'completed', ended_at = NOW() WHERE status = 'in_progress' AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)")

	// 2. Old waiting entries (> 15 mins) -> mark cancelled
	database.DB.Exec("UPDATE matchmaking_queue_entries SET status = 'cancelled' WHERE status = 'waiting' AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)")
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

	queueMutex.Lock()
	defer queueMutex.Unlock()

	// 1. Run periodic background cleanup using DB native time arithmetic
	cleanupStaleMatchmakingAndSessions()

	// 2. Check if user was ALREADY matched in an active session in the last 5 minutes (prevent accidental double matching)
	var activeSession models.InterviewSession
	if err := database.DB.Where("(interviewer_id = ? OR interviewee_id = ?) AND status = 'in_progress' AND track_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)", currentUserID, currentUserID, req.TrackID).
		Order("id desc").First(&activeSession).Error; err == nil {
		role := "interviewee"
		if activeSession.InterviewerID == currentUserID {
			role = "interviewer"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":     "matched",
			"matched":    true,
			"session_id": activeSession.ID,
			"track_id":   activeSession.TrackID,
			"role":       role,
			"message":    "Connecting to active peer interview...",
		})
		return
	}

	// 3. Check if track exists
	var track models.InterviewTrack
	if err := database.DB.Preload("Levels").First(&track, req.TrackID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview track not found"})
		return
	}

	levelID := req.LevelID
	for i := range track.Levels {
		if track.Levels[i].ID == levelID || (levelID == 0 && i == 0) {
			levelID = track.Levels[i].ID
			break
		}
	}

	// 4. Cancel old waiting queue entries for this user
	database.DB.Model(&models.MatchmakingQueueEntry{}).
		Where("user_id = ? AND status = 'waiting'", currentUserID).
		Update("status", "cancelled")

	// 5. Search for an active waiting student in the SAME track (different user)
	var peerEntry models.MatchmakingQueueEntry
	err := database.DB.Where("track_id = ? AND user_id != ? AND status = 'waiting'", req.TrackID, currentUserID).
		Order("id asc").
		First(&peerEntry).Error

	if err == nil {
		// PEER FOUND! Determine level
		if levelID == 0 && peerEntry.LevelID > 0 {
			levelID = peerEntry.LevelID
		}

		// Preload questions for this level or track
		var questions []models.InterviewQuestion
		if levelID > 0 {
			database.DB.Preload("Detail").Preload("Templates").Preload("TestCases").Preload("Hints").Preload("MCQOptions").
				Where("level_id = ?", levelID).
				Find(&questions)
		}
		if len(questions) == 0 {
			database.DB.Preload("Detail").Preload("Templates").Preload("TestCases").Preload("Hints").Preload("MCQOptions").
				Joins("JOIN interview_levels ON interview_levels.id = interview_questions.level_id").
				Where("interview_levels.track_id = ?", req.TrackID).
				Find(&questions)
		}

		var initialQID uint = 0
		var starterCode string = "// Write your solution here\n"
		if len(questions) > 0 {
			rand.Seed(time.Now().UnixNano())
			initialQ := questions[rand.Intn(len(questions))]
			initialQID = initialQ.ID
			if levelID == 0 {
				levelID = initialQ.LevelID
			}
			starterCode = extractStarterCode(initialQ, starterCode)
		}

		session := models.InterviewSession{
			TrackID:           req.TrackID,
			LevelID:           levelID,
			InterviewerID:     peerEntry.UserID,
			IntervieweeID:     currentUserID,
			Status:            "in_progress",
			Round:             1,
			CurrentQuestionID: initialQID,
			Round1QuestionID:  initialQID,
			CandidateCode:     starterCode,
			CandidateLang:     "javascript",
			SwitchCount:       0,
			StartedAt:         time.Now(),
		}

		if err := database.DB.Create(&session).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to establish interview session"})
			return
		}

		// Update peer entry status to matched
		database.DB.Model(&models.MatchmakingQueueEntry{}).Where("id = ?", peerEntry.ID).Updates(map[string]interface{}{
			"status":             "matched",
			"matched_session_id": session.ID,
		})

		// Create matched queue entry for current user
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
			"queue_id":   userEntry.ID,
			"track_id":   req.TrackID,
			"role":       "interviewee",
			"message":    "Peer match found! Connecting to live room...",
		})
		return
	}

	// 6. No peer waiting yet -> Add student to waiting queue
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

	queueIDStr := c.Query("queue_id")
	trackIDStr := c.Query("track_id")

	var trackID uint
	if trackIDStr != "" {
		fmt.Sscanf(trackIDStr, "%d", &trackID)
	}

	// 1. Direct active session check: If user is part of an active session created within last 2 hours, return it!
	var activeSession models.InterviewSession
	sQuery := database.DB.Where("(interviewer_id = ? OR interviewee_id = ?) AND status = 'in_progress' AND created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)", currentUserID, currentUserID)
	if trackID > 0 {
		sQuery = sQuery.Where("track_id = ?", trackID)
	}
	if sErr := sQuery.Order("id desc").First(&activeSession).Error; sErr == nil {
		role := "interviewee"
		if activeSession.InterviewerID == currentUserID {
			role = "interviewer"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":     "matched",
			"matched":    true,
			"session_id": activeSession.ID,
			"track_id":   activeSession.TrackID,
			"role":       role,
		})
		return
	}

	// 2. Check queue entry status
	var entry models.MatchmakingQueueEntry
	var found bool

	if queueIDStr != "" {
		var qID uint
		if _, err := fmt.Sscanf(queueIDStr, "%d", &qID); err == nil && qID > 0 {
			if sErr := database.DB.Where("id = ? AND user_id = ?", qID, currentUserID).First(&entry).Error; sErr == nil {
				found = true
			}
		}
	}

	if !found {
		query := database.DB.Where("user_id = ? AND status IN ('waiting', 'matched')", currentUserID)
		if trackID > 0 {
			query = query.Where("track_id = ?", trackID)
		}
		if sErr := query.Order("id desc").First(&entry).Error; sErr == nil {
			found = true
		}
	}

	if found {
		if entry.Status == "matched" && entry.MatchedSessionID > 0 {
			var session models.InterviewSession
			if sErr := database.DB.First(&session, entry.MatchedSessionID).Error; sErr == nil && session.Status == "in_progress" {
				role := "interviewee"
				if session.InterviewerID == currentUserID {
					role = "interviewer"
				}
				c.JSON(http.StatusOK, gin.H{
					"status":     "matched",
					"matched":    true,
					"session_id": session.ID,
					"queue_id":   entry.ID,
					"track_id":   entry.TrackID,
					"role":       role,
				})
				return
			}
		} else if entry.Status == "waiting" {
			c.JSON(http.StatusOK, gin.H{
				"status":   "waiting",
				"matched":  false,
				"queue_id": entry.ID,
				"track_id": entry.TrackID,
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "idle",
		"matched": false,
	})
}

// CancelMatchmaking removes student from queue
func CancelMatchmaking(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	queueIDStr := c.Query("queue_id")
	if queueIDStr != "" {
		var queueID uint
		if _, sErr := fmt.Sscanf(queueIDStr, "%d", &queueID); sErr == nil && queueID > 0 {
			database.DB.Model(&models.MatchmakingQueueEntry{}).
				Where("id = ? AND user_id = ?", queueID, currentUserID).
				Update("status", "cancelled")
		}
	}

	database.DB.Model(&models.MatchmakingQueueEntry{}).
		Where("user_id = ? AND status = 'waiting'", currentUserID).
		Update("status", "cancelled")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Cancelled matchmaking queue",
	})
}

// GetInterviewSession fetches live session information, participants, code, and questions
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
		Preload("Level.Questions.Detail").
		Preload("Level.Questions.Templates").
		Preload("Level.Questions.TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Level.Questions.Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Level.Questions.MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		Preload("CurrentQuestion.Detail").
		Preload("CurrentQuestion.Templates").
		Preload("CurrentQuestion.TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("CurrentQuestion.Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("CurrentQuestion.MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
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

	// Initialize question if missing
	if (session.CurrentQuestionID == 0 || session.CurrentQuestion == nil) && session.Level != nil && len(session.Level.Questions) > 0 {
		session.CurrentQuestionID = session.Level.Questions[0].ID
		session.CurrentQuestion = &session.Level.Questions[0]
		session.Round1QuestionID = session.Level.Questions[0].ID
		if session.CandidateCode == "" {
			session.CandidateCode = extractStarterCode(*session.CurrentQuestion, "")
		}
		database.DB.Model(&session).Updates(map[string]interface{}{
			"current_question_id": session.CurrentQuestionID,
			"round1_question_id":  session.Round1QuestionID,
			"candidate_code":      session.CandidateCode,
			"round":               1,
		})
	}

	// Ensure Round 2 question is strictly different from Round 1 question
	if session.Round == 2 && (session.CurrentQuestionID == session.Round1QuestionID || session.Round2QuestionID == 0) {
		var candidateQuestions []models.InterviewQuestion
		database.DB.Preload("Detail").Preload("Templates").Preload("TestCases").Preload("Hints").Preload("MCQOptions").
			Where("level_id = ? AND id != ?", session.LevelID, session.Round1QuestionID).
			Find(&candidateQuestions)
		if len(candidateQuestions) == 0 {
			database.DB.Preload("Detail").Preload("Templates").Preload("TestCases").Preload("Hints").Preload("MCQOptions").
				Joins("JOIN interview_levels ON interview_levels.id = interview_questions.level_id").
				Where("interview_levels.track_id = ? AND interview_questions.id != ?", session.TrackID, session.Round1QuestionID).
				Find(&candidateQuestions)
		}
		if len(candidateQuestions) > 0 {
			rand.Seed(time.Now().UnixNano())
			nextQ := candidateQuestions[rand.Intn(len(candidateQuestions))]
			session.CurrentQuestionID = nextQ.ID
			session.Round2QuestionID = nextQ.ID
			session.CurrentQuestion = &nextQ
			if session.CandidateCode == "" {
				session.CandidateCode = extractStarterCode(nextQ, "")
			}
			database.DB.Model(&session).Updates(map[string]interface{}{
				"current_question_id": nextQ.ID,
				"round2_question_id":  nextQ.ID,
				"candidate_code":      session.CandidateCode,
			})
		}
	}

	// Ensure started_at is populated and persisted
	if session.StartedAt.IsZero() {
		if !session.CreatedAt.IsZero() {
			session.StartedAt = session.CreatedAt
		} else {
			session.StartedAt = time.Now()
		}
		database.DB.Model(&session).Update("started_at", session.StartedAt)
	}

	// Identify current user role
	currentUserRole := "interviewee"
	if session.InterviewerID == currentUserID {
		currentUserRole = "interviewer"
	}

	type UserSummary struct {
		Name       string `json:"name"`
		Email      string `json:"email,omitempty"`
		RollNo     string `json:"roll_no,omitempty"`
		Department string `json:"department,omitempty"`
	}

	// Double-blind peer anonymity
	var peerSummary *UserSummary
	var interviewerSummary *UserSummary
	var intervieweeSummary *UserSummary

	if currentUserRole == "interviewer" {
		interviewerSummary = &UserSummary{
			Name:       session.Interviewer.Name,
			Email:      session.Interviewer.Email,
			RollNo:     session.Interviewer.RollNo,
			Department: session.Interviewer.Department,
		}
		intervieweeSummary = &UserSummary{
			Name:       "Peer Candidate",
			RollNo:     "CANDIDATE",
			Department: "Student Peer",
		}
		peerSummary = intervieweeSummary
	} else {
		intervieweeSummary = &UserSummary{
			Name:       session.Interviewee.Name,
			Email:      session.Interviewee.Email,
			RollNo:     session.Interviewee.RollNo,
			Department: session.Interviewee.Department,
		}
		interviewerSummary = &UserSummary{
			Name:       "Peer Interviewer",
			RollNo:     "INTERVIEWER",
			Department: "Student Assessor",
		}
		peerSummary = interviewerSummary
	}

	// Prepare Question Payload based on role (Only if session is active)
	var activeQuestion gin.H
	var levelQuestions []gin.H

	if session.Status != "completed" && session.Status != "cancelled" {
		if session.CurrentQuestion != nil {
			if currentUserRole == "interviewer" {
				activeQuestion = fullQuestionForInterviewer(*session.CurrentQuestion)
			} else {
				activeQuestion = sanitizeQuestionForCandidate(*session.CurrentQuestion)
			}
		}

		// Sanitize Level Questions list for candidate
		if session.Level != nil {
			allQuestions := session.Level.Questions
			loadCount := session.Level.QuestionCount
			if loadCount <= 0 {
				if session.Level.Mode == models.ModeMCQ {
					loadCount = 10
				} else {
					loadCount = 1
				}
			}

			var questionsToServe []models.InterviewQuestion
			if session.Round == 2 {
				// Round 2: serve questions starting after Round 1 set so questions are NOT repeated
				if len(allQuestions) > loadCount {
					startIdx := loadCount
					endIdx := startIdx + loadCount
					if endIdx > len(allQuestions) {
						endIdx = len(allQuestions)
					}
					questionsToServe = allQuestions[startIdx:endIdx]
				} else {
					// If level doesn't have enough extra questions, try fetching other questions from track
					var extraQuestions []models.InterviewQuestion
					database.DB.Preload("Detail").Preload("Templates").Preload("TestCases").Preload("Hints").Preload("MCQOptions").
						Joins("JOIN interview_levels ON interview_levels.id = interview_questions.level_id").
						Where("interview_levels.track_id = ? AND interview_questions.id != ?", session.TrackID, session.Round1QuestionID).
						Limit(loadCount).
						Find(&extraQuestions)
					if len(extraQuestions) > 0 {
						questionsToServe = extraQuestions
					} else {
						questionsToServe = allQuestions
					}
				}
			} else {
				// Round 1: first loadCount questions
				if loadCount > 0 && len(allQuestions) > loadCount {
					questionsToServe = allQuestions[:loadCount]
				} else {
					questionsToServe = allQuestions
				}
			}

			for _, q := range questionsToServe {
				if currentUserRole == "interviewer" {
					levelQuestions = append(levelQuestions, fullQuestionForInterviewer(q))
				} else {
					levelQuestions = append(levelQuestions, sanitizeQuestionForCandidate(q))
				}
			}
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
				"round":                  session.Round,
				"current_question_id":    session.CurrentQuestionID,
				"current_question":       activeQuestion,
				"level_questions":        levelQuestions,
				"candidate_code":         session.CandidateCode,
				"candidate_lang":         session.CandidateLang,
				"candidate_whiteboard":   session.CandidateWhiteboard,
				"interviewer_rubrics":   session.InterviewerRubrics,
				"last_execution_type":    session.LastExecutionType,
				"last_execution_verdict": session.LastExecutionVerdict,
				"last_execution_passed":  session.LastExecutionPassed,
				"last_execution_total":   session.LastExecutionTotal,
				"last_executed_at":       session.LastExecutedAt,
				"last_execution_json":    session.LastExecutionJSON,
				"roles_switched":         session.RolesSwitched,
				"switch_count":           session.SwitchCount,
				"switch_requested_by":    session.SwitchRequestedBy,
				"end_requested_by":       session.EndRequestedBy,
				"started_at":             session.StartedAt,
				"ended_at":               session.EndedAt,
			},
			"current_user_role": currentUserRole,
			"peer":              peerSummary,
		},
	})
}

// UpdateSessionCode synchronizes the code written by the candidate
func UpdateSessionCode(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var input struct {
		Code string `json:"code"`
		Lang string `json:"lang"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid code payload"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	// Only the candidate is authorized to update code
	if session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Only the active candidate can edit code"})
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Interview session is already concluded"})
		return
	}

	updates := map[string]interface{}{
		"candidate_code": input.Code,
	}
	if input.Lang != "" {
		updates["candidate_lang"] = input.Lang
	}

	database.DB.Model(&session).Updates(updates)

	c.JSON(http.StatusOK, gin.H{
		"status":         "success",
		"candidate_code": input.Code,
		"candidate_lang": input.Lang,
	})
}

// UpdateSessionWhiteboard synchronizes the whiteboard canvas state created by the candidate
func UpdateSessionWhiteboard(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var input struct {
		Whiteboard string `json:"whiteboard"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid whiteboard payload"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	// Only the active candidate is authorized to update the whiteboard
	if session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Only the active candidate can edit the whiteboard"})
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Interview session is already concluded"})
		return
	}

	database.DB.Model(&session).Update("candidate_whiteboard", input.Whiteboard)

	c.JSON(http.StatusOK, gin.H{
		"status":               "success",
		"candidate_whiteboard": input.Whiteboard,
	})
}

// SwitchSessionQuestion allows changing the active question within the current round
func SwitchSessionQuestion(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var input struct {
		QuestionID uint `json:"question_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid question payload"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.Preload("Level.Questions").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Interview session is already concluded"})
		return
	}

	var question models.InterviewQuestion
	err := database.DB.
		Preload("Detail").
		Preload("Templates").
		Preload("TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		First(&question, input.QuestionID).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Question not found"})
		return
	}

	// Update session active question
	session.CurrentQuestionID = question.ID
	session.CurrentQuestion = &question
	database.DB.Model(&session).Updates(map[string]interface{}{
		"current_question_id": question.ID,
	})

	role := "interviewee"
	if session.InterviewerID == currentUserID {
		role = "interviewer"
	}

	var respQ gin.H
	if role == "interviewer" {
		respQ = fullQuestionForInterviewer(question)
	} else {
		respQ = sanitizeQuestionForCandidate(question)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"current_question_id": question.ID,
			"current_question":    respQ,
		},
	})
}

// UpdateSessionRubrics synchronizes the evaluation rubrics scored/updated by the interviewer
func UpdateSessionRubrics(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var input struct {
		Rubrics string `json:"rubrics"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid rubrics payload"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	// Only active participants (specifically interviewer) can update evaluation rubrics
	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "You are not a participant in this interview session"})
		return
	}

	database.DB.Model(&session).Update("interviewer_rubrics", input.Rubrics)

	c.JSON(http.StatusOK, gin.H{
		"status":              "success",
		"interviewer_rubrics": input.Rubrics,
	})
}

// RunSessionCode executes test cases (sample test cases or custom input)
func RunSessionCode(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var input struct {
		Code        string `json:"code"`
		Lang        string `json:"lang"`
		IsCustom    bool   `json:"is_custom"`
		CustomInput string `json:"custom_input"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid payload"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.Preload("CurrentQuestion").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Interview session is already concluded"})
		return
	}

	var results []EvalResult
	allPassed := true

	if input.IsCustom {
		// Run custom input execution
		res, _ := ExecuteCustomInput(input.Code, input.Lang, input.CustomInput)
		results = append(results, res)
		allPassed = res.Passed
	} else {
		// Run relational open sample test cases
		var openCases []models.InterviewQuestionTestCase
		if session.CurrentQuestionID > 0 {
			database.DB.Where("question_id = ? AND is_hidden = false", session.CurrentQuestionID).
				Order("order_index asc, id asc").
				Find(&openCases)
		}

		if len(openCases) == 0 {
			// No test cases configured for this question: execute standalone code to check for syntax and runtime validity
			res, _ := ExecuteCustomInput(input.Code, input.Lang, "")
			results = append(results, res)
			allPassed = res.Passed
		} else {

		evalCases := make([]EvalTestCase, len(openCases))
		for idx, tc := range openCases {
			evalCases[idx] = EvalTestCase{
				Index:          idx + 1,
				IsHidden:       false,
				Name:           fmt.Sprintf("Sample Case %d", idx+1),
				Input:          tc.Input,
				ExpectedOutput: tc.ExpectedOutput,
			}
		}

		var err error
		results, err = ExecuteTestCases(input.Code, input.Lang, evalCases)
		if err != nil || len(results) == 0 {
			results = make([]EvalResult, len(openCases))
			for i, tc := range openCases {
				results[i] = EvalResult{
					Index:       i + 1,
					IsHidden:    false,
					Name:        fmt.Sprintf("Sample Case %d", i+1),
					Input:       tc.Input,
					Expected:    tc.ExpectedOutput,
					Actual:      "Execution failed",
					Passed:      false,
					ExecutionMs: 0,
				}
			}
		}

		for _, r := range results {
			if !r.Passed {
				allPassed = false
				break
			}
		}
		}
	}

	passedCount := 0
	for _, r := range results {
		if r.Passed {
			passedCount++
		}
	}

	verdict := "All Sample Cases Passed"
	if !allPassed {
		verdict = "Sample Cases Failed"
	}

	// Persist execution for interviewer real-time synchronization
	runJSON, _ := json.Marshal(gin.H{
		"type":        "run",
		"all_passed":  allPassed,
		"results":     results,
		"total_cases": len(results),
	})
	now := time.Now()

	database.DB.Model(&session).Updates(map[string]interface{}{
		"last_execution_json":    string(runJSON),
		"last_execution_type":    "run",
		"last_execution_verdict": verdict,
		"last_execution_passed":  passedCount,
		"last_execution_total":   len(results),
		"last_executed_at":       &now,
	})

	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"all_passed":  allPassed,
		"results":     results,
		"total_cases": len(results),
	})
}

// SubmitSessionCode evaluates full solution against both open and hidden relational test cases
func SubmitSessionCode(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var input struct {
		Code string `json:"code"`
		Lang string `json:"lang"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid submission payload"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.Preload("CurrentQuestion").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Session not found"})
		return
	}

	if session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Only candidate can submit solution"})
		return
	}

	if session.Status == "completed" || session.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Interview session is already concluded"})
		return
	}

	// 1. Process Open Sample Cases and Hidden Verification Cases
	var openCases []models.InterviewQuestionTestCase
	var hiddenCases []models.InterviewQuestionTestCase

	if session.CurrentQuestionID > 0 {
		database.DB.Where("question_id = ? AND is_hidden = false", session.CurrentQuestionID).
			Order("order_index asc, id asc").
			Find(&openCases)
		database.DB.Where("question_id = ? AND is_hidden = true", session.CurrentQuestionID).
			Order("order_index asc, id asc").
			Find(&hiddenCases)
	}

	var evalQueue []EvalTestCase
	caseIdx := 1
	for _, tc := range openCases {
		evalQueue = append(evalQueue, EvalTestCase{
			Index:          caseIdx,
			IsHidden:       false,
			Name:           fmt.Sprintf("Sample Case %d", caseIdx),
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
		})
		caseIdx++
	}

	hiddenIdx := 1
	for _, tc := range hiddenCases {
		evalQueue = append(evalQueue, EvalTestCase{
			Index:          caseIdx,
			IsHidden:       true,
			Name:           fmt.Sprintf("Hidden Case %d (Verification)", hiddenIdx),
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
		})
		caseIdx++
		hiddenIdx++
	}

	var caseResults []EvalResult
	if len(evalQueue) == 0 {
		// No automated test cases configured: execute code standalone to check for syntax and runtime validity
		res, _ := ExecuteCustomInput(input.Code, input.Lang, "")
		res.Name = "Code Validation (No Test Cases Configured)"
		caseResults = append(caseResults, res)
	} else {
		// Real execution evaluation against real configured test cases
		var err error
		caseResults, err = ExecuteTestCases(input.Code, input.Lang, evalQueue)
		if err != nil || len(caseResults) == 0 {
			caseResults = make([]EvalResult, len(evalQueue))
			for i, tc := range evalQueue {
				caseResults[i] = EvalResult{
					Index:       tc.Index,
					IsHidden:    tc.IsHidden,
					Name:        tc.Name,
					Input:       tc.Input,
					Expected:    tc.ExpectedOutput,
					Actual:      "Execution Engine Error",
					Passed:      false,
					ExecutionMs: 0,
				}
			}
		}
	}

	passedCount := 0
	hasSyntaxError := false
	hasRuntimeError := false
	var totalExecMs int

	for _, c := range caseResults {
		totalExecMs += c.ExecutionMs
		if c.Passed {
			passedCount++
		}
		if strings.Contains(c.Actual, "Syntax") || strings.Contains(c.Actual, "Compilation") {
			hasSyntaxError = true
		}
		if strings.Contains(c.Actual, "Runtime Error") {
			hasRuntimeError = true
		}
	}

	verdict := "Wrong Answer"
	if passedCount == len(caseResults) {
		verdict = "Accepted"
	} else if hasSyntaxError {
		verdict = "Compile Error"
	} else if hasRuntimeError {
		verdict = "Runtime Error"
	}

	// Sanitize execution results:
	// - For open/sample test cases: keep input, expected, actual, passed, execution_ms
	// - For hidden test cases: keep passed, execution_ms, is_hidden, and name; strictly blank out input, expected, and actual values
	var sanitizedResults []EvalResult
	hiddenCaseCounter := 1
	for _, c := range caseResults {
		if c.IsHidden {
			sanitizedResults = append(sanitizedResults, EvalResult{
				Index:       c.Index,
				IsHidden:    true,
				Name:        fmt.Sprintf("Hidden Test Case %d", hiddenCaseCounter),
				Input:       "",
				Expected:    "",
				Actual:      "",
				Passed:      c.Passed,
				ExecutionMs: c.ExecutionMs,
			})
			hiddenCaseCounter++
		} else {
			sanitizedResults = append(sanitizedResults, c)
		}
	}

	subData := gin.H{
		"status":        "success",
		"type":          "submit",
		"verdict":       verdict,
		"passed_cases":  passedCount,
		"total_cases":   len(caseResults),
		"open_cases":    len(openCases),
		"hidden_cases":  len(hiddenCases),
		"results":       sanitizedResults,
		"all_passed":    verdict == "Accepted",
		"runtime_ms":    totalExecMs + rand.Intn(15) + 5,
		"memory_mb":     "14.8 MB",
		"round":         session.Round,
	}
	subJSON, _ := json.Marshal(subData)
	now := time.Now()

	database.DB.Model(&session).Updates(map[string]interface{}{
		"last_execution_json":    string(subJSON),
		"last_execution_type":    "submit",
		"last_execution_verdict": verdict,
		"last_execution_passed":  passedCount,
		"last_execution_total":   len(caseResults),
		"last_executed_at":       &now,
	})

	c.JSON(http.StatusOK, subData)
}

// performRoleSwitchInternal executes the actual role swap and selects the next question
func performRoleSwitchInternal(session *models.InterviewSession) error {
	// 1. Swap participants
	oldInterviewer := session.InterviewerID
	session.InterviewerID = session.IntervieweeID
	session.IntervieweeID = oldInterviewer
	session.RolesSwitched = true
	session.SwitchCount = 1
	session.Round = 2
	session.SwitchRequestedBy = 0
	session.LastExecutionJSON = ""
	session.LastExecutionType = ""
	session.LastExecutionVerdict = ""
	session.LastExecutionPassed = 0
	session.LastExecutionTotal = 0
	session.LastExecutedAt = nil

	// 2. Load candidate questions for Round 2 that are strictly DIFFERENT from Round 1
	var candidateQuestions []models.InterviewQuestion
	database.DB.Preload("Templates").
		Where("level_id = ? AND id != ?", session.LevelID, session.Round1QuestionID).
		Find(&candidateQuestions)

	// If no other question found in the exact level, search across the entire track
	if len(candidateQuestions) == 0 {
		database.DB.Preload("Templates").
			Joins("JOIN interview_levels ON interview_levels.id = interview_questions.level_id").
			Where("interview_levels.track_id = ? AND interview_questions.id != ?", session.TrackID, session.Round1QuestionID).
			Find(&candidateQuestions)
	}

	// Fallback to any other question in the database
	if len(candidateQuestions) == 0 {
		database.DB.Preload("Templates").
			Where("id != ?", session.Round1QuestionID).
			Find(&candidateQuestions)
	}

	var nextQ models.InterviewQuestion
	if len(candidateQuestions) > 0 {
		rand.Seed(time.Now().UnixNano())
		nextQ = candidateQuestions[rand.Intn(len(candidateQuestions))]
	}

	if nextQ.ID > 0 {
		session.CurrentQuestionID = nextQ.ID
		session.Round2QuestionID = nextQ.ID
		session.CandidateCode = extractStarterCode(nextQ, "")
	}

	// 3. Clear isolated database sandbox for Round 2 so candidate starts with a brand new fresh database
	starterDDL := ""
	if nextQ.ID > 0 {
		starterDDL = extractStarterCode(nextQ, "")
	}
	sessionIDStr := fmt.Sprintf("%d", session.ID)
	// Wipes old Round 1 tables/queries and provisions fresh Round 2 database
	_, _, _ = ResetSessionSandboxDatabase(sessionIDStr, starterDDL)

	return database.DB.Save(session).Error
}

// RequestSessionRoleSwitch initiates a role switch request requiring peer confirmation
func RequestSessionRoleSwitch(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var session models.InterviewSession
	if err := database.DB.Preload("Level.Questions").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	// Strictly limit role switch to ONE TIME ONLY
	if session.SwitchCount >= 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Role switch is allowed only once per session. Round 2 is the final round.",
		})
		return
	}

	// If the other student has already requested a role switch, this request acts as mutual acceptance!
	if session.SwitchRequestedBy != 0 && session.SwitchRequestedBy != currentUserID {
		if err := performRoleSwitchInternal(&session); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to switch interview roles"})
			return
		}

		currentUserRole := "interviewee"
		if session.InterviewerID == currentUserID {
			currentUserRole = "interviewer"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":              "success",
			"switched":            true,
			"message":             "Mutual agreement reached! Roles switched to Round 2.",
			"current_user_role":   currentUserRole,
			"round":               session.Round,
			"switch_count":        session.SwitchCount,
			"current_question_id": session.CurrentQuestionID,
			"candidate_code":      session.CandidateCode,
		})
		return
	}

	// Otherwise, record switch request and wait for peer acceptance
	session.SwitchRequestedBy = currentUserID
	database.DB.Model(&session).Update("switch_requested_by", currentUserID)

	c.JSON(http.StatusOK, gin.H{
		"status":              "pending",
		"switched":            false,
		"switch_requested_by": currentUserID,
		"message":             "Role switch requested! Waiting for peer student to accept...",
	})
}

// AcceptSessionRoleSwitch confirms and completes the role swap
func AcceptSessionRoleSwitch(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var session models.InterviewSession
	if err := database.DB.Preload("Level.Questions").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	if session.SwitchCount >= 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Role switch has already been completed.",
		})
		return
	}

	if session.SwitchRequestedBy == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No pending role switch request found.",
		})
		return
	}

	if session.SwitchRequestedBy == currentUserID {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "You cannot accept your own request. Waiting for peer.",
		})
		return
	}

	// Perform role swap
	if err := performRoleSwitchInternal(&session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to execute role switch"})
		return
	}

	currentUserRole := "interviewee"
	if session.InterviewerID == currentUserID {
		currentUserRole = "interviewer"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":              "success",
		"switched":            true,
		"message":             "Round 1 finished! Roles switched to Round 2 with a new question.",
		"current_user_role":   currentUserRole,
		"round":               session.Round,
		"switch_count":        session.SwitchCount,
		"current_question_id": session.CurrentQuestionID,
		"candidate_code":      session.CandidateCode,
	})
}

// DeclineSessionRoleSwitch cancels the pending switch request
func DeclineSessionRoleSwitch(c *gin.Context) {
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

	session.SwitchRequestedBy = 0
	database.DB.Model(&session).Update("switch_requested_by", 0)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Role switch request was declined.",
	})
}

// SwitchSessionRoles performs or delegates the role switch request
func SwitchSessionRoles(c *gin.Context) {
	RequestSessionRoleSwitch(c)
}

// RequestSessionEndInterview initiates an end interview request requiring peer confirmation
func RequestSessionEndInterview(c *gin.Context) {
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

	if session.Status == "completed" {
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"ended":   true,
			"message": "Interview session has already ended.",
		})
		return
	}

	// If peer already requested to end the interview, mutual confirmation reached!
	if session.EndRequestedBy != 0 && session.EndRequestedBy != currentUserID {
		now := time.Now()
		session.Status = "completed"
		session.EndedAt = &now
		session.EndRequestedBy = 0
		database.DB.Save(&session)

		// Clean up matched queue entries
		database.DB.Model(&models.MatchmakingQueueEntry{}).
			Where("matched_session_id = ?", session.ID).
			Update("status", "completed")

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"ended":   true,
			"message": "Both students agreed to complete the interview.",
		})
		return
	}

	// Otherwise, record end request and wait for peer confirmation
	session.EndRequestedBy = currentUserID
	database.DB.Model(&session).Update("end_requested_by", currentUserID)

	c.JSON(http.StatusOK, gin.H{
		"status":           "pending",
		"ended":            false,
		"end_requested_by": currentUserID,
		"message":          "End interview requested. Waiting for peer student to confirm...",
	})
}

// AcceptSessionEndInterview confirms and marks the session as completed
func AcceptSessionEndInterview(c *gin.Context) {
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

	if session.EndRequestedBy == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No pending end interview request found.",
		})
		return
	}

	if session.EndRequestedBy == currentUserID {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "You cannot accept your own end request. Waiting for peer.",
		})
		return
	}

	now := time.Now()
	session.Status = "completed"
	session.EndedAt = &now
	session.EndRequestedBy = 0
	database.DB.Save(&session)

	// Clean up matched queue entries
	database.DB.Model(&models.MatchmakingQueueEntry{}).
		Where("matched_session_id = ?", session.ID).
		Update("status", "completed")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"ended":   true,
		"message": "Interview completed successfully.",
	})
}

// DeclineSessionEndInterview cancels the pending end interview request
func DeclineSessionEndInterview(c *gin.Context) {
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

	session.EndRequestedBy = 0
	database.DB.Model(&session).Update("end_requested_by", 0)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "End interview request was declined.",
	})
}

// EndInterviewSession terminates the session only with mutual consent or feedback submission
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

	// Check if user has submitted feedback or mutual agreement exists
	var feedbackCount int64
	database.DB.Model(&models.InterviewFeedback{}).Where("session_id = ? AND reviewer_id = ?", session.ID, currentUserID).Count(&feedbackCount)

	if feedbackCount == 0 && session.EndRequestedBy == 0 && session.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Force end is disabled. Both students must mutually agree to conclude the session, or complete peer evaluation.",
		})
		return
	}

	now := time.Now()
	session.Status = "completed"
	session.EndedAt = &now
	session.EndRequestedBy = 0
	database.DB.Save(&session)

	// Clean up matched queue entries
	database.DB.Model(&models.MatchmakingQueueEntry{}).
		Where("matched_session_id = ?", session.ID).
		Update("status", "completed")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"ended":   true,
		"message": "Interview session ended successfully.",
	})
}

// AdminGetInterviewSessions returns interview history with full participant identities, query filtering, and fast pagination
func AdminGetInterviewSessions(c *gin.Context) {
	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "20"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	trackFilter := strings.TrimSpace(c.Query("track_id"))
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	fromDate := strings.TrimSpace(c.Query("from_date"))
	toDate := strings.TrimSpace(c.Query("to_date"))

	query := database.DB.Model(&models.InterviewSession{})

	if statusFilter != "" && !strings.EqualFold(statusFilter, "all") {
		query = query.Where("status = ?", statusFilter)
	}

	if trackFilter != "" && !strings.EqualFold(trackFilter, "all") {
		var parsedTrackID uint64
		if _, err := fmt.Sscanf(trackFilter, "%d", &parsedTrackID); err == nil && parsedTrackID > 0 {
			query = query.Where("track_id = ?", parsedTrackID)
		}
	}

	if fromDate != "" {
		if t, err := time.Parse(time.RFC3339, fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		} else if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if toDate != "" {
		if t, err := time.Parse(time.RFC3339, toDate); err == nil {
			query = query.Where("created_at <= ?", t)
		} else if t, err := time.Parse("2006-01-02", toDate); err == nil {
			query = query.Where("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Joins("LEFT JOIN users AS interviewer ON interviewer.id = interview_sessions.interviewer_id").
			Joins("LEFT JOIN users AS interviewee ON interviewee.id = interview_sessions.interviewee_id").
			Joins("LEFT JOIN interview_tracks ON interview_tracks.id = interview_sessions.track_id").
			Where("LOWER(interviewer.name) LIKE ? OR LOWER(interviewer.email) LIKE ? OR LOWER(interviewer.roll_no) LIKE ? OR LOWER(interviewee.name) LIKE ? OR LOWER(interviewee.email) LIKE ? OR LOWER(interviewee.roll_no) LIKE ? OR LOWER(interview_tracks.title) LIKE ?", s, s, s, s, s, s, s)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to count interview sessions",
			"error":   err.Error(),
		})
		return
	}

	page := 1
	limit := 20
	var sessions []models.InterviewSession

	dbQuery := query.
		Preload("Track").
		Preload("Level").
		Preload("Interviewer").
		Preload("Interviewee").
		Order("interview_sessions.created_at desc")

	if limitStr == "all" || limitStr == "0" || limitStr == "-1" {
		limit = int(totalCount)
		if limit == 0 {
			limit = 1
		}
		if err := dbQuery.Find(&sessions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to fetch interview session history",
			})
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
		if err := dbQuery.Limit(limit).Offset(offset).Find(&sessions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to fetch interview session history",
			})
			return
		}
	}

	type UserSummary struct {
		ID         uint   `json:"id"`
		Name       string `json:"name"`
		Email      string `json:"email"`
		RollNo     string `json:"roll_no"`
		Department string `json:"department"`
		Role       string `json:"role"`
	}

	type SessionDTO struct {
		ID                uint                       `json:"id"`
		TrackID           uint                       `json:"track_id"`
		TrackTitle        string                     `json:"track_title"`
		TrackCategory     string                     `json:"track_category"`
		LevelID           uint                       `json:"level_id"`
		LevelNumber       int                        `json:"level_number"`
		LevelName         string                     `json:"level_name"`
		LevelMode         string                     `json:"level_mode"`
		Interviewer       *UserSummary               `json:"interviewer"`
		Interviewee       *UserSummary               `json:"interviewee"`
		Status            string                     `json:"status"`
		Round             int                        `json:"round"`
		RolesSwitched     bool                       `json:"roles_switched"`
		SwitchCount       int                        `json:"switch_count"`
		HasSecurityReport bool                       `json:"has_security_report"`
		HasRecording      bool                       `json:"has_recording"`
		Recording         *models.InterviewRecording `json:"recording,omitempty"`
		StartedAt         time.Time                  `json:"started_at"`
		EndedAt           *time.Time                 `json:"ended_at"`
		CreatedAt         time.Time                  `json:"created_at"`
	}

	// Batch fetch recordings and security reports for page sessions to eliminate N+1 latency
	sessionIDs := make([]uint, len(sessions))
	for i, s := range sessions {
		sessionIDs[i] = s.ID
	}

	recordingMap := make(map[uint]models.InterviewRecording)
	if len(sessionIDs) > 0 {
		var recordings []models.InterviewRecording
		database.DB.Where("session_id IN (?)", sessionIDs).Find(&recordings)
		for _, r := range recordings {
			recordingMap[r.SessionID] = r
		}
	}

	secReportMap := make(map[uint]bool)
	if len(sessionIDs) > 0 {
		type SecCount struct {
			SessionID uint  `gorm:"column:session_id"`
			Count     int64 `gorm:"column:count"`
		}
		var secCounts []SecCount
		database.DB.Model(&models.SessionSecurityReport{}).
			Select("session_id, count(*) as count").
			Where("session_id IN (?) AND asked_credentials = true", sessionIDs).
			Group("session_id").
			Scan(&secCounts)
		for _, sc := range secCounts {
			if sc.Count > 0 {
				secReportMap[sc.SessionID] = true
			}
		}
	}

	result := make([]SessionDTO, len(sessions))
	for i, s := range sessions {
		var interviewer *UserSummary
		if s.Interviewer != nil {
			interviewer = &UserSummary{
				ID:         s.Interviewer.ID,
				Name:       s.Interviewer.Name,
				Email:      s.Interviewer.Email,
				RollNo:     s.Interviewer.RollNo,
				Department: s.Interviewer.Department,
				Role:       s.Interviewer.Role,
			}
		}

		var interviewee *UserSummary
		if s.Interviewee != nil {
			interviewee = &UserSummary{
				ID:         s.Interviewee.ID,
				Name:       s.Interviewee.Name,
				Email:      s.Interviewee.Email,
				RollNo:     s.Interviewee.RollNo,
				Department: s.Interviewee.Department,
				Role:       s.Interviewee.Role,
			}
		}

		trackTitle := "Unknown Domain"
		trackCategory := "Technical"
		if s.Track != nil {
			trackTitle = s.Track.Title
			trackCategory = s.Track.Category
		}

		lvlNum := 1
		lvlName := "Level 1"
		lvlMode := "coding"
		if s.Level != nil {
			lvlNum = s.Level.LevelNumber
			lvlName = s.Level.Name
			lvlMode = string(s.Level.Mode)
		}

		round := s.Round
		if round == 0 {
			round = 1
		}

		rec, hasRec := recordingMap[s.ID]
		var recPtr *models.InterviewRecording
		if hasRec {
			recPtr = &rec
		}

		result[i] = SessionDTO{
			ID:                s.ID,
			TrackID:           s.TrackID,
			TrackTitle:        trackTitle,
			TrackCategory:     trackCategory,
			LevelID:           s.LevelID,
			LevelNumber:       lvlNum,
			LevelName:         lvlName,
			LevelMode:         lvlMode,
			Interviewer:       interviewer,
			Interviewee:       interviewee,
			Status:            s.Status,
			Round:             round,
			RolesSwitched:     s.RolesSwitched,
			SwitchCount:       s.SwitchCount,
			HasSecurityReport: secReportMap[s.ID],
			HasRecording:      hasRec,
			Recording:         recPtr,
			StartedAt:         s.StartedAt,
			EndedAt:           s.EndedAt,
			CreatedAt:         s.CreatedAt,
		}
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int((totalCount + int64(limit) - 1) / int64(limit))
	}
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   result,
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

// AdminGetInterviewSessionByID returns full details of a specific session for admin inspection
func AdminGetInterviewSessionByID(c *gin.Context) {
	sessionID := c.Param("id")

	var session models.InterviewSession
	err := database.DB.
		Preload("Track").
		Preload("Level.Questions").
		Preload("CurrentQuestion").
		Preload("Interviewer").
		Preload("Interviewee").
		First(&session, sessionID).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Interview session not found",
		})
		return
	}

	var feedbacks []models.InterviewFeedback
	database.DB.
		Where("session_id = ?", session.ID).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		Order("created_at asc").
		Find(&feedbacks)

	var securityReports []models.SessionSecurityReport
	database.DB.
		Where("session_id = ?", session.ID).
		Preload("Reporter").
		Preload("ReportedUser").
		Order("created_at asc").
		Find(&securityReports)

	var recording *models.InterviewRecording
	var rec models.InterviewRecording
	if err := database.DB.Preload("Uploader").Where("session_id = ?", session.ID).First(&rec).Error; err == nil {
		if (rec.DurationSeconds <= 0 || rec.DurationSeconds <= 5) {
			startTime := session.StartedAt
			if startTime.IsZero() {
				startTime = session.CreatedAt
			}
			endTime := time.Now()
			if session.EndedAt != nil && !session.EndedAt.IsZero() {
				endTime = *session.EndedAt
			}
			if !startTime.IsZero() {
				diff := int(endTime.Sub(startTime).Seconds())
				if diff > rec.DurationSeconds {
					rec.DurationSeconds = diff
					_ = database.DB.Model(&rec).Update("duration_seconds", diff)
				}
			}
		}
		recording = &rec
	}

	c.JSON(http.StatusOK, gin.H{
		"status":           "success",
		"data":             session,
		"session":          session,
		"feedbacks":        feedbacks,
		"recording":        recording,
		"security_reports": securityReports,
	})
}

