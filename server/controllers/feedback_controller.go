package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FeedbackOptionInput represents option text and its marks/weightage
type FeedbackOptionInput struct {
	OptionText string  `json:"option_text"`
	Marks      float64 `json:"marks"`
}

// FeedbackQuestionInput represents incoming payload for creating/updating a question
type FeedbackQuestionInput struct {
	QuestionText string          `json:"question_text" binding:"required"`
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

	// Delete old options and recreate relational rows
	if err := tx.Where("question_id = ?", question.ID).Delete(&models.FeedbackQuestionOption{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to sync question options",
			"error":   err.Error(),
		})
		return
	}

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
					"message": "Failed to save updated question option",
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
	if err := tx.Where("question_id = ?", id).Delete(&models.FeedbackQuestionOption{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to delete question options"})
		return
	}

	if err := tx.Delete(&models.FeedbackQuestion{}, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to delete feedback question"})
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

	var peer *models.User
	var peerID uint
	if session.InterviewerID == currentUserID {
		peer = session.Interviewee
		peerID = session.IntervieweeID
	} else {
		peer = session.Interviewer
		peerID = session.InterviewerID
	}

	// 1. My feedback given to peer
	var myFeedback models.InterviewFeedback
	errMy := database.DB.
		Where("session_id = ? AND reviewer_id = ?", session.ID, currentUserID).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		First(&myFeedback).Error

	hasSubmitted := (errMy == nil && myFeedback.ID > 0)

	// 2. Peer's feedback given to me
	var peerFeedback models.InterviewFeedback
	errPeer := database.DB.
		Where("session_id = ? AND reviewer_id = ? AND reviewee_id = ?", session.ID, peerID, currentUserID).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		First(&peerFeedback).Error

	peerHasSubmitted := (errPeer == nil && peerFeedback.ID > 0)
	bothSubmitted := (hasSubmitted && peerHasSubmitted)

	var feedbacksList []models.InterviewFeedback
	if hasSubmitted {
		feedbacksList = append(feedbacksList, myFeedback)
	}
	if peerHasSubmitted {
		feedbacksList = append(feedbacksList, peerFeedback)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":              "success",
		"has_submitted":       hasSubmitted,
		"peer_has_submitted":  peerHasSubmitted,
		"both_submitted":      bothSubmitted,
		"my_feedback":         myFeedback,
		"peer_feedback":       peerFeedback,
		"feedbacks":           feedbacksList,
		"peer":                peer,
		"session_id":          session.ID,
		"feedback":            myFeedback, // Backward compatibility
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

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   feedbacks,
	})
}

