package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FeedbackOptionInput represents option text, ID, and its marks/weightage
type FeedbackOptionInput struct {
	ID         uint    `json:"id,omitempty"`
	OptionText string  `json:"option_text"`
	Marks      float64 `json:"marks"`
}

// FeedbackQuestionInput represents incoming payload for creating/updating a question
type FeedbackQuestionInput struct {
	QuestionText string          `json:"question_text" binding:"required"`
	ShortLabel   string          `json:"short_label"`
	QuestionType string          `json:"question_type" binding:"required"` // "mcq", "yes_no", "text"
	IsRequired   bool            `json:"is_required"`
	MaxMarks     float64         `json:"max_marks"`
	OrderIndex   int             `json:"order_index"`
	IsActive     *bool           `json:"is_active"`
	Options      json.RawMessage `json:"options"` // Can be []string or []FeedbackOptionInput
}

// helper to parse options input flexibly
func parseOptionsInput(raw json.RawMessage, qType string) []FeedbackOptionInput {
	var result []FeedbackOptionInput

	if len(raw) > 0 && string(raw) != "null" {
		// Try parsing as []FeedbackOptionInput first
		var structured []FeedbackOptionInput
		if err := json.Unmarshal(raw, &structured); err == nil && len(structured) > 0 {
			for _, item := range structured {
				trimmed := strings.TrimSpace(item.OptionText)
				if trimmed != "" {
					result = append(result, FeedbackOptionInput{
						ID:         item.ID,
						OptionText: trimmed,
						Marks:      item.Marks,
					})
				}
			}
			return result
		}

		// Fallback: parse as []string
		var strList []string
		if err := json.Unmarshal(raw, &strList); err == nil && len(strList) > 0 {
			for idx, str := range strList {
				trimmed := strings.TrimSpace(str)
				if trimmed != "" {
					marks := 0.0
					if qType == "yes_no" {
						if strings.EqualFold(trimmed, "yes") {
							marks = 5.0
						} else {
							marks = 0.0
						}
					} else if qType == "mcq" {
						marks = float64(idx + 1)
					}
					result = append(result, FeedbackOptionInput{
						OptionText: trimmed,
						Marks:      marks,
					})
				}
			}
			return result
		}
	}

	// Default fallback for yes_no
	if qType == "yes_no" {
		return []FeedbackOptionInput{
			{OptionText: "Yes", Marks: 5.0},
			{OptionText: "No", Marks: 0.0},
		}
	}

	return result
}

// ============================================================
// ADMIN CONTROLLER METHODS
// ============================================================

// AdminGetFeedbackQuestions retrieves all configured feedback questions with options & marks
func AdminGetFeedbackQuestions(c *gin.Context) {
	var questions []models.FeedbackQuestion
	err := database.DB.
		Preload("Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_index asc, id asc")
		}).
		Order("order_index asc, id asc").
		Find(&questions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch feedback questions",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   questions,
	})
}

// AdminCreateFeedbackQuestion creates a new feedback question with relational options and marks
func AdminCreateFeedbackQuestion(c *gin.Context) {
	var input FeedbackQuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid question payload: question_text and question_type are required",
			"error":   err.Error(),
		})
		return
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	qType := strings.ToLower(strings.TrimSpace(input.QuestionType))
	if qType != "mcq" && qType != "yes_no" && qType != "text" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Question type must be 'mcq', 'yes_no', or 'text'",
		})
		return
	}

	// Default order_index if 0
	if input.OrderIndex == 0 {
		var maxOrder int
		database.DB.Model(&models.FeedbackQuestion{}).Select("COALESCE(MAX(order_index), 0)").Scan(&maxOrder)
		input.OrderIndex = maxOrder + 1
	}

	parsedOptions := parseOptionsInput(input.Options, qType)

	// Calculate max marks for the question
	maxMarks := input.MaxMarks
	if maxMarks <= 0 {
		for _, opt := range parsedOptions {
			if opt.Marks > maxMarks {
				maxMarks = opt.Marks
			}
		}
	}

	question := models.FeedbackQuestion{
		QuestionText: strings.TrimSpace(input.QuestionText),
		ShortLabel:   strings.TrimSpace(input.ShortLabel),
		QuestionType: qType,
		IsRequired:   input.IsRequired,
		MaxMarks:     maxMarks,
		OrderIndex:   input.OrderIndex,
		IsActive:     isActive,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&question).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create feedback question",
			"error":   err.Error(),
		})
		return
	}

	// Insert options
	if qType != "text" {
		for idx, opt := range parsedOptions {
			optRecord := models.FeedbackQuestionOption{
				QuestionID: question.ID,
				OptionText: opt.OptionText,
				Marks:      opt.Marks,
				OrderIndex: idx + 1,
			}
			if err := tx.Create(&optRecord).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Failed to save question option",
					"error":   err.Error(),
				})
				return
			}
		}
	}

	tx.Commit()

	var created models.FeedbackQuestion
	database.DB.
		Preload("Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_index asc, id asc")
		}).
		First(&created, question.ID)

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Feedback question created successfully",
		"data":    created,
	})
}

// AdminUpdateFeedbackQuestion updates a question and its relational options with marks
func AdminUpdateFeedbackQuestion(c *gin.Context) {
	id := c.Param("id")
	var question models.FeedbackQuestion
	if err := database.DB.First(&question, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Feedback question not found",
		})
		return
	}

	var input FeedbackQuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid payload provided",
			"error":   err.Error(),
		})
		return
	}

	qType := strings.ToLower(strings.TrimSpace(input.QuestionType))
	if qType == "" {
		qType = question.QuestionType
	}

	parsedOptions := parseOptionsInput(input.Options, qType)

	// Calculate max marks
	maxMarks := input.MaxMarks
	if maxMarks <= 0 {
		for _, opt := range parsedOptions {
			if opt.Marks > maxMarks {
				maxMarks = opt.Marks
			}
		}
	}

	question.QuestionText = strings.TrimSpace(input.QuestionText)
	question.ShortLabel = strings.TrimSpace(input.ShortLabel)
	question.QuestionType = qType
	question.IsRequired = input.IsRequired
	question.MaxMarks = maxMarks
	if input.OrderIndex > 0 {
		question.OrderIndex = input.OrderIndex
	}
	if input.IsActive != nil {
		question.IsActive = *input.IsActive
	}

	tx := database.DB.Begin()
	if err := tx.Save(&question).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update feedback question",
			"error":   err.Error(),
		})
		return
	}

	// Smart Sync Options: update existing, create new, delete removed
	var existingOptions []models.FeedbackQuestionOption
	tx.Where("question_id = ?", question.ID).Find(&existingOptions)

	existingMap := make(map[uint]*models.FeedbackQuestionOption)
	for i := range existingOptions {
		existingMap[existingOptions[i].ID] = &existingOptions[i]
	}

	usedIDs := make(map[uint]bool)

	if qType != "text" {
		for idx, opt := range parsedOptions {
			// 1. Try matching by ID if provided
			if opt.ID > 0 && existingMap[opt.ID] != nil {
				usedIDs[opt.ID] = true
				if err := tx.Model(&models.FeedbackQuestionOption{}).
					Where("id = ?", opt.ID).
					Updates(map[string]interface{}{
						"option_text": opt.OptionText,
						"marks":       opt.Marks,
						"order_index": idx + 1,
					}).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Failed to update question option",
						"error":   err.Error(),
					})
					return
				}
				continue
			}

			// 2. Try matching by OptionText with an unused existing option
			var matchedID uint = 0
			for _, existOpt := range existingOptions {
				if !usedIDs[existOpt.ID] && strings.EqualFold(existOpt.OptionText, opt.OptionText) {
					matchedID = existOpt.ID
					break
				}
			}

			// 3. Fallback: match by index if exists and unused
			if matchedID == 0 && idx < len(existingOptions) && !usedIDs[existingOptions[idx].ID] {
				matchedID = existingOptions[idx].ID
			}

			if matchedID > 0 {
				usedIDs[matchedID] = true
				if err := tx.Model(&models.FeedbackQuestionOption{}).
					Where("id = ?", matchedID).
					Updates(map[string]interface{}{
						"option_text": opt.OptionText,
						"marks":       opt.Marks,
						"order_index": idx + 1,
					}).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Failed to update question option",
						"error":   err.Error(),
					})
					return
				}
			} else {
				// Insert brand new option
				newOpt := models.FeedbackQuestionOption{
					QuestionID: question.ID,
					OptionText: opt.OptionText,
					Marks:      opt.Marks,
					OrderIndex: idx + 1,
				}
				if err := tx.Create(&newOpt).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{
						"status":  "error",
						"message": "Failed to create new question option",
						"error":   err.Error(),
					})
					return
				}
			}
		}
	}

	// Delete any existing options that were explicitly removed
	for _, existOpt := range existingOptions {
		if !usedIDs[existOpt.ID] {
			// Disconnect any foreign key references in responses to avoid constraint violation
			tx.Model(&models.InterviewFeedbackResponse{}).
				Where("selected_option_id = ?", existOpt.ID).
				Update("selected_option_id", nil)

			if err := tx.Delete(&models.FeedbackQuestionOption{}, existOpt.ID).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Failed to delete removed question option",
					"error":   err.Error(),
				})
				return
			}
		}
	}

	tx.Commit()

	var updated models.FeedbackQuestion
	database.DB.
		Preload("Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_index asc, id asc")
		}).
		First(&updated, question.ID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Feedback question updated successfully",
		"data":    updated,
	})
}

// AdminDeleteFeedbackQuestion removes a feedback question and child options
func AdminDeleteFeedbackQuestion(c *gin.Context) {
	id := c.Param("id")

	tx := database.DB.Begin()

	// Disconnect foreign key references before deleting
	tx.Model(&models.InterviewFeedbackResponse{}).
		Where("question_id = ?", id).
		Update("selected_option_id", nil)

	if err := tx.Where("question_id = ?", id).Delete(&models.FeedbackQuestionOption{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to delete question options", "error": err.Error()})
		return
	}

	if err := tx.Delete(&models.FeedbackQuestion{}, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to delete feedback question", "error": err.Error()})
		return
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Feedback question deleted successfully",
	})
}

// AdminGetFeedbackSubmissions lists submitted peer evaluations for review and analytics
func AdminGetFeedbackSubmissions(c *gin.Context) {
	sessionID := c.Query("session_id")
	reviewerID := c.Query("reviewer_id")
	revieweeID := c.Query("reviewee_id")

	query := database.DB.Model(&models.InterviewFeedback{}).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Session").
		Preload("Session.Track").
		Preload("Session.Level").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		Order("created_at desc")

	if sessionID != "" {
		query = query.Where("session_id = ?", sessionID)
	}
	if reviewerID != "" {
		query = query.Where("reviewer_id = ?", reviewerID)
	}
	if revieweeID != "" {
		query = query.Where("reviewee_id = ?", revieweeID)
	}

	var feedbacks []models.InterviewFeedback
	if err := query.Find(&feedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch feedback submissions",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   feedbacks,
	})
}

// ============================================================
// STUDENT CONTROLLER METHODS
// ============================================================

// GetActiveFeedbackQuestions returns active questions for the student evaluation popup
func GetActiveFeedbackQuestions(c *gin.Context) {
	var questions []models.FeedbackQuestion
	err := database.DB.
		Where("is_active = ?", true).
		Preload("Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("order_index asc, id asc")
		}).
		Order("order_index asc, id asc").
		Find(&questions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch evaluation questions",
			"error":   err.Error(),
		})
		return
	}

	// Sanitize points/marks from student view
	for i := range questions {
		questions[i].MaxMarks = 0
		for j := range questions[i].Options {
			questions[i].Options[j].Marks = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   questions,
	})
}

// GetSessionFeedbackStatus checks mutual review submissions for both students in a session
func GetSessionFeedbackStatus(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var session models.InterviewSession
	if err := database.DB.Preload("Interviewer").Preload("Interviewee").Preload("Track").Preload("Level").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	var peerID uint
	if session.InterviewerID == currentUserID {
		peerID = session.IntervieweeID
	} else {
		peerID = session.InterviewerID
	}

	// 1. My feedback given to peer
	var myFeedback models.InterviewFeedback
	errMy := database.DB.
		Where("session_id = ? AND reviewer_id = ?", session.ID, currentUserID).
		First(&myFeedback).Error

	hasSubmitted := (errMy == nil && myFeedback.ID > 0)

	// 2. Peer's feedback given to me
	var peerFeedback models.InterviewFeedback
	errPeer := database.DB.
		Where("session_id = ? AND reviewer_id = ? AND reviewee_id = ?", session.ID, peerID, currentUserID).
		First(&peerFeedback).Error

	peerHasSubmitted := (errPeer == nil && peerFeedback.ID > 0)
	bothSubmitted := (hasSubmitted && peerHasSubmitted)

	peerAnonymous := gin.H{
		"id":   peerID,
		"name": "Anonymous Peer",
	}

	// Blinded peer review: do not leak peer feedback responses, scores, or breakdown during live sessions
	c.JSON(http.StatusOK, gin.H{
		"status":             "success",
		"has_submitted":      hasSubmitted,
		"peer_has_submitted": peerHasSubmitted,
		"both_submitted":     bothSubmitted,
		"peer":               peerAnonymous,
		"session_id":         session.ID,
	})
}

// SubmitFeedbackInput represents payload submitted by a student
type SubmitFeedbackInput struct {
	Answers []struct {
		QuestionID       uint   `json:"question_id" binding:"required"`
		SelectedOptionID *uint  `json:"selected_option_id"`
		AnswerValue      string `json:"answer_value"`
	} `json:"answers" binding:"required"`
}

// SubmitSessionFeedback records a student's peer evaluation and automatically computes scores
func SubmitSessionFeedback(c *gin.Context) {
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

	// Verify caller belongs to this interview session
	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "You are not a participant in this interview session"})
		return
	}

	// Determine peer (reviewee)
	var revieweeID uint
	if session.InterviewerID == currentUserID {
		revieweeID = session.IntervieweeID
	} else {
		revieweeID = session.InterviewerID
	}

	// Check for duplicate submission
	var existingCount int64
	database.DB.Model(&models.InterviewFeedback{}).
		Where("session_id = ? AND reviewer_id = ?", session.ID, currentUserID).
		Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": "You have already submitted peer feedback for this interview session.",
		})
		return
	}

	var input SubmitFeedbackInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid feedback responses payload",
			"error":   err.Error(),
		})
		return
	}

	tx := database.DB.Begin()

	feedback := models.InterviewFeedback{
		SessionID:  session.ID,
		ReviewerID: currentUserID,
		RevieweeID: revieweeID,
	}

	if err := tx.Create(&feedback).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to save peer feedback header",
			"error":   err.Error(),
		})
		return
	}

	var totalScore float64 = 0
	var totalMaxScore float64 = 0

	// Insert relational response rows & calculate score
	for _, ans := range input.Answers {
		if ans.QuestionID == 0 {
			continue
		}

		var q models.FeedbackQuestion
		if err := tx.Preload("Options").First(&q, ans.QuestionID).Error; err != nil {
			continue
		}

		// Calculate question max marks
		qMax := q.MaxMarks
		if qMax <= 0 && len(q.Options) > 0 {
			for _, o := range q.Options {
				if o.Marks > qMax {
					qMax = o.Marks
				}
			}
		}

		var awardedMarks float64 = 0
		ansValue := strings.TrimSpace(ans.AnswerValue)

		// Determine marks from selected option or answer value
		if ans.SelectedOptionID != nil && *ans.SelectedOptionID > 0 {
			for _, opt := range q.Options {
				if opt.ID == *ans.SelectedOptionID {
					awardedMarks = opt.Marks
					if ansValue == "" {
						ansValue = opt.OptionText
					}
					break
				}
			}
		} else if q.QuestionType == "yes_no" {
			for _, opt := range q.Options {
				if strings.EqualFold(opt.OptionText, ansValue) {
					awardedMarks = opt.Marks
					break
				}
			}
		} else if q.QuestionType == "mcq" {
			for _, opt := range q.Options {
				if strings.EqualFold(opt.OptionText, ansValue) {
					awardedMarks = opt.Marks
					break
				}
			}
		}

		// Text questions don't contribute to standard numeric totalMaxScore unless max_marks configured
		if q.QuestionType != "text" || qMax > 0 {
			totalScore += awardedMarks
			totalMaxScore += qMax
		}

		responseRecord := models.InterviewFeedbackResponse{
			FeedbackID:       feedback.ID,
			QuestionID:       ans.QuestionID,
			SelectedOptionID: ans.SelectedOptionID,
			AnswerValue:      ansValue,
			AwardedMarks:     awardedMarks,
			MaxMarks:         qMax,
		}

		if err := tx.Create(&responseRecord).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Failed to save response for question %d", ans.QuestionID),
				"error":   err.Error(),
			})
			return
		}
	}

	var scorePercentage float64 = 0
	if totalMaxScore > 0 {
		scorePercentage = (totalScore / totalMaxScore) * 100.0
	}

	// Update totals on feedback header
	if err := tx.Model(&feedback).Updates(map[string]interface{}{
		"total_score":      totalScore,
		"max_score":        totalMaxScore,
		"score_percentage": scorePercentage,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update feedback total scores",
			"error":   err.Error(),
		})
		return
	}

	tx.Commit()

	// Automatically conclude and complete the session once both students have submitted feedback
	var totalSessionFeedbacks int64
	database.DB.Model(&models.InterviewFeedback{}).Where("session_id = ?", session.ID).Count(&totalSessionFeedbacks)
	if totalSessionFeedbacks >= 2 {
		now := time.Now()
		database.DB.Model(&session).Updates(map[string]interface{}{
			"status":   "completed",
			"ended_at": &now,
		})
		database.DB.Model(&models.MatchmakingQueueEntry{}).
			Where("matched_session_id = ?", session.ID).
			Update("status", "completed")
	}

	var createdFeedback models.InterviewFeedback
	database.DB.
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		First(&createdFeedback, feedback.ID)

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Peer feedback submitted successfully. Scores calculated!",
		"data":    createdFeedback,
	})
}

// StudentInterviewItem represents an interview session attended by the student
type StudentInterviewItem struct {
	SessionID       uint                                `json:"session_id"`
	TrackTitle      string                              `json:"track_title"`
	TrackCategory   string                              `json:"track_category"`
	TrackIcon       string                              `json:"track_icon"`
	LevelNumber     int                                 `json:"level_number"`
	LevelName       string                              `json:"level_name"`
	LevelMode       string                              `json:"level_mode"`
	Role            string                              `json:"role"` // "interviewer" | "interviewee"
	PeerName        string                              `json:"peer_name"`
	PeerRollNo      string                              `json:"peer_roll_no"`
	PeerDepartment  string                              `json:"peer_department"`
	PeerEmail       string                              `json:"peer_email"`
	Status          string                              `json:"status"`
	StartedAt       time.Time                           `json:"started_at"`
	EndedAt         *time.Time                          `json:"ended_at"`
	CreatedAt       time.Time                           `json:"created_at"`
	DurationSecs    int                                 `json:"duration_seconds"`
	TotalScore      float64                             `json:"total_score"`
	MaxScore        float64                             `json:"max_score"`
	ScorePercentage float64                             `json:"score_percentage"`
	HasScorecard    bool                                `json:"has_scorecard"`
	EvaluatorName   string                              `json:"evaluator_name"`
	ReviewNotes     string                              `json:"review_notes"`
	Responses       []models.InterviewFeedbackResponse  `json:"responses"`
}

// GetStudentInterviewHistory retrieves all interview sessions attended by the logged-in student with track, level, date, and scorecard
func GetStudentInterviewHistory(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	// Fetch all sessions where student was either Interviewer or Interviewee
	var sessions []models.InterviewSession
	err := database.DB.
		Where("(interviewer_id = ? OR interviewee_id = ?) AND status != ?", currentUserID, currentUserID, "cancelled").
		Preload("Track").
		Preload("Level").
		Preload("Interviewer").
		Preload("Interviewee").
		Order("created_at desc").
		Find(&sessions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch student interview history",
			"error":   err.Error(),
		})
		return
	}

	// Fetch all feedbacks received by this student
	var feedbacks []models.InterviewFeedback
	database.DB.
		Where("reviewee_id = ?", currentUserID).
		Preload("Reviewer").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		Find(&feedbacks)

	feedbackMap := make(map[uint]models.InterviewFeedback)
	for _, fb := range feedbacks {
		feedbackMap[fb.SessionID] = fb
	}

	var items []StudentInterviewItem
	for _, s := range sessions {
		trackTitle := "Technical Mock Interview"
		trackCategory := "Technical"
		trackIcon := "Code"
		if s.Track != nil {
			if s.Track.Title != "" { trackTitle = s.Track.Title }
			if s.Track.Category != "" { trackCategory = s.Track.Category }
			if s.Track.Icon != "" { trackIcon = s.Track.Icon }
		}

		levelNumber := 1
		levelName := "Foundation Level"
		levelMode := "coding"
		if s.Level != nil {
			if s.Level.LevelNumber > 0 { levelNumber = s.Level.LevelNumber }
			if s.Level.Name != "" { levelName = s.Level.Name }
			if s.Level.Mode != "" { levelMode = string(s.Level.Mode) }
		}

		myRole := "interviewee"
		if s.InterviewerID == currentUserID {
			myRole = "interviewer"
		}

		durationSecs := 0
		if s.EndedAt != nil && !s.StartedAt.IsZero() {
			diff := s.EndedAt.Sub(s.StartedAt).Seconds()
			if diff > 0 {
				durationSecs = int(diff)
			}
		}

		fb, hasFb := feedbackMap[s.ID]
		reviewNotes := ""
		var responses []models.InterviewFeedbackResponse
		var totalScore, maxScore, scorePct float64

		if hasFb {
			totalScore = fb.TotalScore
			maxScore = fb.MaxScore
			scorePct = fb.ScorePercentage
			responses = fb.Responses
			for _, r := range fb.Responses {
				if r.Question != nil && r.Question.QuestionType == "text" && r.AnswerValue != "" {
					reviewNotes = r.AnswerValue
					break
				}
			}
		}

		items = append(items, StudentInterviewItem{
			SessionID:       s.ID,
			TrackTitle:      trackTitle,
			TrackCategory:   trackCategory,
			TrackIcon:       trackIcon,
			LevelNumber:     levelNumber,
			LevelName:       levelName,
			LevelMode:       levelMode,
			Role:            myRole,
			PeerName:        "Anonymous Peer",
			PeerRollNo:      "",
			PeerDepartment:  "",
			PeerEmail:       "",
			Status:          s.Status,
			StartedAt:       s.StartedAt,
			EndedAt:         s.EndedAt,
			CreatedAt:       s.CreatedAt,
			DurationSecs:    durationSecs,
			TotalScore:      totalScore,
			MaxScore:        maxScore,
			ScorePercentage: scorePct,
			HasScorecard:    hasFb,
			EvaluatorName:   "Anonymous Peer",
			ReviewNotes:     reviewNotes,
			Responses:       responses,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   items,
	})
}

// QuestionFeedbackAvg represents question-wise average performance metrics for student dashboard
type QuestionFeedbackAvg struct {
	QuestionID      uint    `json:"question_id"`
	QuestionText    string  `json:"question_text"`
	ShortLabel      string  `json:"short_label"`
	QuestionType    string  `json:"question_type"`
	AverageScore    float64 `json:"average_score"`
	MaxMarks        float64 `json:"max_marks"`
	ScorePercentage float64 `json:"score_percentage"`
	ResponsesCount  int     `json:"responses_count"`
}

// GetStudentDashboardStats retrieves computed real-time performance KPI metrics for the student dashboard
func GetStudentDashboardStats(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	// 1. Total sessions attended
	var sessions []models.InterviewSession
	database.DB.
		Where("(interviewer_id = ? OR interviewee_id = ?) AND status != ?", currentUserID, currentUserID, "cancelled").
		Find(&sessions)

	interviewsAttended := len(sessions)

	var totalPracticeSecs float64
	for _, s := range sessions {
		if s.EndedAt != nil && !s.StartedAt.IsZero() {
			diff := s.EndedAt.Sub(s.StartedAt).Seconds()
			if diff > 0 {
				totalPracticeSecs += diff
			}
		} else {
			totalPracticeSecs += 2700 // default 45 mins per completed session
		}
	}
	totalPracticeHours := totalPracticeSecs / 3600.0

	// 2. Feedbacks received (scores gained)
	var feedbacks []models.InterviewFeedback
	database.DB.
		Where("reviewee_id = ?", currentUserID).
		Find(&feedbacks)

	var totalPoints float64
	var totalMaxPoints float64
	for _, fb := range feedbacks {
		totalPoints += fb.TotalScore
		totalMaxPoints += fb.MaxScore
	}

	// 3. Average points = Total Points / Interviews Attended
	var avgPoints float64
	if interviewsAttended > 0 {
		avgPoints = totalPoints / float64(interviewsAttended)
	} else if len(feedbacks) > 0 {
		avgPoints = totalPoints / float64(len(feedbacks))
	}

	var scorePct float64
	if totalMaxPoints > 0 {
		scorePct = (totalPoints / totalMaxPoints) * 100.0
	}

	grade := "Needs Practice"
	if scorePct >= 85 {
		grade = "Outstanding (A+)"
	} else if scorePct >= 70 {
		grade = "Proficient (B)"
	} else if scorePct >= 50 {
		grade = "Average (C)"
	} else if interviewsAttended == 0 && totalPoints == 0 {
		grade = "Unranked"
	}

	// 4. Question-wise feedback score averages across all peer evaluations received
	var allQuestions []models.FeedbackQuestion
	database.DB.
		Preload("Options").
		Order("order_index asc, id asc").
		Find(&allQuestions)

	// Fetch all feedback responses received by this student
	type qStats struct {
		totalAwarded float64
		totalMax     float64
		count        int
	}
	qStatsMap := make(map[uint]*qStats)

	if len(feedbacks) > 0 {
		var feedbackIDs []uint
		for _, fb := range feedbacks {
			feedbackIDs = append(feedbackIDs, fb.ID)
		}
		var responses []models.InterviewFeedbackResponse
		database.DB.Where("feedback_id IN ?", feedbackIDs).Find(&responses)
		for _, r := range responses {
			if r.QuestionID > 0 {
				if qStatsMap[r.QuestionID] == nil {
					qStatsMap[r.QuestionID] = &qStats{}
				}
				qStatsMap[r.QuestionID].totalAwarded += r.AwardedMarks
				if r.MaxMarks > 0 {
					qStatsMap[r.QuestionID].totalMax += r.MaxMarks
				}
				qStatsMap[r.QuestionID].count++
			}
		}
	}

	feedbackAverages := make([]QuestionFeedbackAvg, 0)
	for _, q := range allQuestions {
		// Calculate max marks
		qMax := q.MaxMarks
		if qMax <= 0 && len(q.Options) > 0 {
			for _, o := range q.Options {
				if o.Marks > qMax {
					qMax = o.Marks
				}
			}
		}
		if qMax <= 0 {
			qMax = 5.0 // fallback default
		}

		shortLabel := strings.TrimSpace(q.ShortLabel)
		if shortLabel == "" {
			words := strings.Fields(q.QuestionText)
			if len(words) > 3 {
				shortLabel = strings.Join(words[:3], " ")
			} else if len(words) > 0 {
				shortLabel = strings.Join(words, " ")
			} else {
				shortLabel = fmt.Sprintf("Q%d", q.ID)
			}
		}

		var avgScore float64 = 0
		var scorePercentage float64 = 0
		var respCount int = 0

		if qs := qStatsMap[q.ID]; qs != nil && qs.count > 0 {
			respCount = qs.count
			avgScore = qs.totalAwarded / float64(qs.count)
			if qMax > 0 {
				scorePercentage = (avgScore / qMax) * 100.0
				if scorePercentage > 100.0 {
					scorePercentage = 100.0
				}
			}
		}

		feedbackAverages = append(feedbackAverages, QuestionFeedbackAvg{
			QuestionID:      q.ID,
			QuestionText:    q.QuestionText,
			ShortLabel:      shortLabel,
			QuestionType:    q.QuestionType,
			AverageScore:    avgScore,
			MaxMarks:        qMax,
			ScorePercentage: scorePercentage,
			ResponsesCount:  respCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"total_points":           totalPoints,
			"total_max_points":       totalMaxPoints,
			"interviews_attended":    interviewsAttended,
			"average_points":         avgPoints,
			"score_percentage":       scorePct,
			"total_practice_hours":   totalPracticeHours,
			"total_reviews_received": len(feedbacks),
			"grade":                  grade,
			"feedback_averages":      feedbackAverages,
		},
	})
}

// GetStudentFeedbackHistory retrieves all past peer evaluations received and given by the logged in student
func GetStudentFeedbackHistory(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)

	var feedbacks []models.InterviewFeedback
	err := database.DB.
		Where("reviewee_id = ? OR reviewer_id = ?", currentUserID, currentUserID).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Session").
		Preload("Session.Track").
		Preload("Session.Level").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		Order("created_at desc").
		Find(&feedbacks).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch student feedback history",
			"error":   err.Error(),
		})
		return
	}

	// Anonymize peer details
	for i := range feedbacks {
		if feedbacks[i].ReviewerID != currentUserID && feedbacks[i].Reviewer != nil {
			feedbacks[i].Reviewer = &models.User{
				ID:   feedbacks[i].ReviewerID,
				Name: "Anonymous Peer",
			}
		}
		if feedbacks[i].RevieweeID != currentUserID && feedbacks[i].Reviewee != nil {
			feedbacks[i].Reviewee = &models.User{
				ID:   feedbacks[i].RevieweeID,
				Name: "Anonymous Peer",
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   feedbacks,
	})
}

// StudentLeaderboardEntry represents one student's aggregated peer feedback performance
type StudentLeaderboardEntry struct {
	Rank                int                       `json:"rank"`
	StudentID           uint                      `json:"student_id"`
	Name                string                    `json:"name"`
	RollNo              string                    `json:"roll_no"`
	Department          string                    `json:"department"`
	Email               string                    `json:"email"`
	InterviewsAttended  int                       `json:"interviews_attended"`
	MatchesCount        int                       `json:"matches_count"` // Backwards-compatible alias
	ReviewsCount        int                       `json:"reviews_count"`
	TotalScore          float64                   `json:"total_score"`
	TotalMaxScore       float64                   `json:"total_max_score"`
	PointsPerInterview  float64                   `json:"points_per_interview"`
	AvgScorePerMatch    float64                   `json:"avg_score_per_match"` // Backwards-compatible alias
	AvgMaxScorePerMatch float64                   `json:"avg_max_score_per_match"`
	ScorePercentage     float64                   `json:"score_percentage"`
	Grade               string                    `json:"grade"`
	RecentSessions      []RecentEvaluationSummary `json:"recent_sessions"`
}

// RecentEvaluationSummary holds a brief summary of a single evaluation received
type RecentEvaluationSummary struct {
	SessionID       uint      `json:"session_id"`
	TrackTitle      string    `json:"track_title"`
	ReviewerName    string    `json:"reviewer_name"`
	TotalScore      float64   `json:"total_score"`
	MaxScore        float64   `json:"max_score"`
	ScorePercentage float64   `json:"score_percentage"`
	CreatedAt       time.Time `json:"created_at"`
}

// AdminGetFeedbackLeaderboard generates a ranked person-wise leaderboard of students based on points gained and interviews attended
func AdminGetFeedbackLeaderboard(c *gin.Context) {
	sortBy := strings.ToLower(strings.TrimSpace(c.DefaultQuery("sort_by", "total_points"))) // "total_points", "points_per_interview" (or "avg_points"), "interviews_attended" (or "matches_count"), "percentage", "name"
	order := strings.ToLower(strings.TrimSpace(c.DefaultQuery("order", "desc")))
	deptFilter := strings.TrimSpace(c.Query("department"))
	searchQuery := strings.ToLower(strings.TrimSpace(c.Query("search")))
	trackFilter := strings.TrimSpace(c.Query("track_id"))
	if trackFilter == "" {
		trackFilter = strings.TrimSpace(c.Query("domain"))
	}
	var trackID uint = 0
	if trackFilter != "" && !strings.EqualFold(trackFilter, "all") {
		var parsedID uint64
		if _, err := fmt.Sscanf(trackFilter, "%d", &parsedID); err == nil && parsedID > 0 {
			trackID = uint(parsedID)
		}
	}
	
	minMatchesStr := strings.TrimSpace(c.Query("min_matches"))
	if minMatchesStr == "" {
		minMatchesStr = strings.TrimSpace(c.Query("min_interviews"))
	}
	minMatches := 0
	if minMatchesStr != "" {
		fmt.Sscanf(minMatchesStr, "%d", &minMatches)
	}

	minPointsStr := strings.TrimSpace(c.Query("min_points"))
	var minPoints float64 = 0
	if minPointsStr != "" {
		fmt.Sscanf(minPointsStr, "%f", &minPoints)
	}

	// 1. Fetch all student users
	var students []models.User
	userQuery := database.DB.Where("role = ?", "student")
	if deptFilter != "" && !strings.EqualFold(deptFilter, "all") {
		userQuery = userQuery.Where("LOWER(department) LIKE ?", "%"+strings.ToLower(deptFilter)+"%")
	}
	if searchQuery != "" {
		userQuery = userQuery.Where("LOWER(name) LIKE ? OR LOWER(roll_no) LIKE ? OR LOWER(email) LIKE ?", "%"+searchQuery+"%", "%"+searchQuery+"%", "%"+searchQuery+"%")
	}
	if err := userQuery.Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch student list for leaderboard",
			"error":   err.Error(),
		})
		return
	}

	// 2. Fetch all completed/active interview sessions to compute actual attendance per student
	var allSessions []models.InterviewSession
	sessionQuery := database.DB.Where("status != ?", "cancelled")
	if trackID > 0 {
		sessionQuery = sessionQuery.Where("track_id = ?", trackID)
	}
	sessionQuery.Find(&allSessions)
	studentSessionsMap := make(map[uint]map[uint]bool)
	for _, sess := range allSessions {
		if sess.InterviewerID > 0 {
			if studentSessionsMap[sess.InterviewerID] == nil {
				studentSessionsMap[sess.InterviewerID] = make(map[uint]bool)
			}
			studentSessionsMap[sess.InterviewerID][sess.ID] = true
		}
		if sess.IntervieweeID > 0 {
			if studentSessionsMap[sess.IntervieweeID] == nil {
				studentSessionsMap[sess.IntervieweeID] = make(map[uint]bool)
			}
			studentSessionsMap[sess.IntervieweeID][sess.ID] = true
		}
	}

	// 3. Fetch all feedback records with relational session & user info
	var allFeedbacks []models.InterviewFeedback
	fbQuery := database.DB.Model(&models.InterviewFeedback{}).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Session.Track").
		Order("interview_feedbacks.created_at desc")

	if trackID > 0 {
		fbQuery = fbQuery.
			Joins("JOIN interview_sessions ON interview_sessions.id = interview_feedbacks.session_id AND interview_sessions.deleted_at IS NULL").
			Where("interview_sessions.track_id = ?", trackID)
	}

	if err := fbQuery.Find(&allFeedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch feedback records",
			"error":   err.Error(),
		})
		return
	}

	// 4. Map feedbacks by RevieweeID (student receiving the marks)
	type studentAgg struct {
		totalScore    float64
		totalMaxScore float64
		sessionIDs    map[uint]bool
		reviews       []RecentEvaluationSummary
	}
	aggMap := make(map[uint]*studentAgg)

	for _, fb := range allFeedbacks {
		if fb.RevieweeID == 0 {
			continue
		}
		if aggMap[fb.RevieweeID] == nil {
			aggMap[fb.RevieweeID] = &studentAgg{
				sessionIDs: make(map[uint]bool),
			}
		}
		agg := aggMap[fb.RevieweeID]
		agg.totalScore += fb.TotalScore
		agg.totalMaxScore += fb.MaxScore
		if fb.SessionID > 0 {
			agg.sessionIDs[fb.SessionID] = true
		}

		reviewerName := "Peer Student"
		if fb.Reviewer != nil && fb.Reviewer.Name != "" {
			reviewerName = fb.Reviewer.Name
		}
		trackTitle := "Technical Mock Interview"
		if fb.Session != nil && fb.Session.Track != nil && fb.Session.Track.Title != "" {
			trackTitle = fb.Session.Track.Title
		}

		if len(agg.reviews) < 5 {
			agg.reviews = append(agg.reviews, RecentEvaluationSummary{
				SessionID:       fb.SessionID,
				TrackTitle:      trackTitle,
				ReviewerName:    reviewerName,
				TotalScore:      fb.TotalScore,
				MaxScore:        fb.MaxScore,
				ScorePercentage: fb.ScorePercentage,
				CreatedAt:       fb.CreatedAt,
			})
		}
	}

	// 5. Build leaderboard entries for all matching students
	var entries []StudentLeaderboardEntry

	for _, s := range students {
		agg := aggMap[s.ID]
		
		// Interviews attended: from session map or fallback to evaluated session IDs
		interviewsAttended := len(studentSessionsMap[s.ID])
		if interviewsAttended == 0 && agg != nil {
			interviewsAttended = len(agg.sessionIDs)
		}

		reviewsCount := 0
		var totalScore, totalMaxScore, pointsPerInterview, avgMaxScore, pct float64
		var recent []RecentEvaluationSummary

		if agg != nil {
			reviewsCount = len(agg.reviews)
			totalScore = agg.totalScore
			totalMaxScore = agg.totalMaxScore
			
			// Efficiency: points per interview attended
			divisor := interviewsAttended
			if divisor <= 0 {
				divisor = len(agg.sessionIDs)
			}
			if divisor <= 0 && reviewsCount > 0 {
				divisor = reviewsCount
			}
			if divisor > 0 {
				pointsPerInterview = totalScore / float64(divisor)
				avgMaxScore = totalMaxScore / float64(divisor)
			}
			
			if totalMaxScore > 0 {
				pct = (totalScore / totalMaxScore) * 100.0
			}
			recent = agg.reviews
		}

		// Filter by min interviews attended if requested
		if minMatches > 0 && interviewsAttended < minMatches {
			continue
		}

		// Filter by min points if requested
		if minPoints > 0 && totalScore < minPoints {
			continue
		}

		// Calculate grade
		grade := "Needs Practice"
		if pct >= 85 {
			grade = "Outstanding (A+)"
		} else if pct >= 70 {
			grade = "Proficient (B)"
		} else if pct >= 50 {
			grade = "Average (C)"
		} else if interviewsAttended == 0 && totalScore == 0 {
			grade = "Unranked (No Interviews)"
		}

		entries = append(entries, StudentLeaderboardEntry{
			StudentID:           s.ID,
			Name:                s.Name,
			RollNo:              s.RollNo,
			Department:          s.Department,
			Email:               s.Email,
			InterviewsAttended:  interviewsAttended,
			MatchesCount:        interviewsAttended,
			ReviewsCount:        reviewsCount,
			TotalScore:          totalScore,
			TotalMaxScore:       totalMaxScore,
			PointsPerInterview:  pointsPerInterview,
			AvgScorePerMatch:    pointsPerInterview,
			AvgMaxScorePerMatch: avgMaxScore,
			ScorePercentage:     pct,
			Grade:               grade,
			RecentSessions:      recent,
		})
	}

	// 6. Sort entries based on requested criteria
	isAsc := (order == "asc")
	for i := 0; i < len(entries)-1; i++ {
		for j := i + 1; j < len(entries); j++ {
			var swap bool
			switch sortBy {
			case "avg_points", "points_per_interview", "points_per_attendance":
				if isAsc {
					swap = entries[i].PointsPerInterview > entries[j].PointsPerInterview
				} else {
					if entries[i].PointsPerInterview == entries[j].PointsPerInterview {
						swap = entries[i].TotalScore < entries[j].TotalScore
					} else {
						swap = entries[i].PointsPerInterview < entries[j].PointsPerInterview
					}
				}
			case "matches_count", "interviews_attended", "attendance":
				if isAsc {
					swap = entries[i].InterviewsAttended > entries[j].InterviewsAttended
				} else {
					if entries[i].InterviewsAttended == entries[j].InterviewsAttended {
						swap = entries[i].TotalScore < entries[j].TotalScore
					} else {
						swap = entries[i].InterviewsAttended < entries[j].InterviewsAttended
					}
				}
			case "percentage", "score_percentage":
				if isAsc {
					swap = entries[i].ScorePercentage > entries[j].ScorePercentage
				} else {
					if entries[i].ScorePercentage == entries[j].ScorePercentage {
						swap = entries[i].TotalScore < entries[j].TotalScore
					} else {
						swap = entries[i].ScorePercentage < entries[j].ScorePercentage
					}
				}
			case "name":
				if isAsc {
					swap = entries[i].Name > entries[j].Name
				} else {
					swap = entries[i].Name < entries[j].Name
				}
			default: // "total_points", "total_score"
				if isAsc {
					swap = entries[i].TotalScore > entries[j].TotalScore
				} else {
					if entries[i].TotalScore == entries[j].TotalScore {
						swap = entries[i].PointsPerInterview < entries[j].PointsPerInterview
					} else {
						swap = entries[i].TotalScore < entries[j].TotalScore
					}
				}
			}
			if swap {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	// 7. Assign Ranks (1-indexed) & Compute Cohort Statistics
	var totalOverallScore, totalOverallMaxScore float64
	evaluatedStudentsCount := 0
	activeStudentsCount := 0
	totalInterviewsAttended := 0

	var topScorerByTotal *StudentLeaderboardEntry
	var topScorerByAvg *StudentLeaderboardEntry
	var mostActiveStudent *StudentLeaderboardEntry

	for i := range entries {
		entries[i].Rank = i + 1
		if entries[i].InterviewsAttended > 0 {
			activeStudentsCount++
			totalInterviewsAttended += entries[i].InterviewsAttended
		}
		if entries[i].TotalScore > 0 || entries[i].ReviewsCount > 0 {
			totalOverallScore += entries[i].TotalScore
			totalOverallMaxScore += entries[i].TotalMaxScore
			evaluatedStudentsCount++
		}

		if topScorerByTotal == nil || entries[i].TotalScore > topScorerByTotal.TotalScore {
			if entries[i].TotalScore > 0 {
				topScorerByTotal = &entries[i]
			}
		}
		if topScorerByAvg == nil || (entries[i].InterviewsAttended > 0 && entries[i].PointsPerInterview > topScorerByAvg.PointsPerInterview) {
			if entries[i].PointsPerInterview > 0 {
				topScorerByAvg = &entries[i]
			}
		}
		if mostActiveStudent == nil || entries[i].InterviewsAttended > mostActiveStudent.InterviewsAttended {
			if entries[i].InterviewsAttended > 0 {
				mostActiveStudent = &entries[i]
			}
		}
	}

	var overallAvgScore, overallAvgPct float64
	if evaluatedStudentsCount > 0 {
		overallAvgScore = totalOverallScore / float64(evaluatedStudentsCount)
	}
	if totalOverallMaxScore > 0 {
		overallAvgPct = (totalOverallScore / totalOverallMaxScore) * 100.0
	}

	var primaryLeader *StudentLeaderboardEntry
	if len(entries) > 0 && (entries[0].TotalScore > 0 || entries[0].InterviewsAttended > 0) {
		primaryLeader = &entries[0]
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"leaderboard": entries,
			"stats": gin.H{
				"total_students":            len(students),
				"active_students":           activeStudentsCount,
				"evaluated_students":        evaluatedStudentsCount,
				"total_interviews_attended": totalInterviewsAttended,
				"total_reviews":             len(allFeedbacks),
				"total_points_awarded":      totalOverallScore,
				"overall_avg_score":         overallAvgScore,
				"overall_avg_percentage":    overallAvgPct,
				"top_scorer":                primaryLeader,
				"top_scorer_by_total":       topScorerByTotal,
				"top_scorer_by_avg":         topScorerByAvg,
				"most_active_student":       mostActiveStudent,
			},
			"sort_by": sortBy,
			"order":   order,
		},
	})
}



