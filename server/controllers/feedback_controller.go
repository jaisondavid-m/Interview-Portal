package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FeedbackQuestionInput represents incoming payload for creating/updating a question
type FeedbackQuestionInput struct {
	QuestionText string   `json:"question_text" binding:"required"`
	QuestionType string   `json:"question_type" binding:"required"` // "mcq", "yes_no", "text"
	IsRequired   bool     `json:"is_required"`
	OrderIndex   int      `json:"order_index"`
	IsActive     *bool    `json:"is_active"`
	Options      []string `json:"options"` // For MCQ and Yes/No choices
}

// ============================================================
// ADMIN CONTROLLER METHODS
// ============================================================

// AdminGetFeedbackQuestions retrieves all configured feedback questions
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

// AdminCreateFeedbackQuestion creates a new feedback question with relational options
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

	question := models.FeedbackQuestion{
		QuestionText: strings.TrimSpace(input.QuestionText),
		QuestionType: qType,
		IsRequired:   input.IsRequired,
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

	// Handle relational options based on question type
	var optionsToInsert []string
	if qType == "mcq" {
		for _, opt := range input.Options {
			trimmed := strings.TrimSpace(opt)
			if trimmed != "" {
				optionsToInsert = append(optionsToInsert, trimmed)
			}
		}
	} else if qType == "yes_no" {
		if len(input.Options) > 0 {
			optionsToInsert = input.Options
		} else {
			optionsToInsert = []string{"Yes", "No"}
		}
	}

	for idx, optText := range optionsToInsert {
		optRecord := models.FeedbackQuestionOption{
			QuestionID: question.ID,
			OptionText: optText,
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

// AdminUpdateFeedbackQuestion updates a question and its relational options
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

	question.QuestionText = strings.TrimSpace(input.QuestionText)
	question.QuestionType = qType
	question.IsRequired = input.IsRequired
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

	var optionsToInsert []string
	if qType == "mcq" {
		for _, opt := range input.Options {
			trimmed := strings.TrimSpace(opt)
			if trimmed != "" {
				optionsToInsert = append(optionsToInsert, trimmed)
			}
		}
	} else if qType == "yes_no" {
		if len(input.Options) > 0 {
			optionsToInsert = input.Options
		} else {
			optionsToInsert = []string{"Yes", "No"}
		}
	}

	for idx, optText := range optionsToInsert {
		optRecord := models.FeedbackQuestionOption{
			QuestionID: question.ID,
			OptionText: optText,
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
	// Remove child options
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

// GetSessionFeedbackStatus checks if current user has already submitted peer feedback for a session
func GetSessionFeedbackStatus(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Unauthorized"})
		return
	}
	currentUserID := rawUserID.(uint)
	sessionID := c.Param("id")

	var session models.InterviewSession
	if err := database.DB.Preload("Interviewer").Preload("Interviewee").First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != currentUserID && session.IntervieweeID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access denied"})
		return
	}

	var peer *models.User
	if session.InterviewerID == currentUserID {
		peer = session.Interviewee
	} else {
		peer = session.Interviewer
	}

	var existingFeedback models.InterviewFeedback
	err := database.DB.
		Where("session_id = ? AND reviewer_id = ?", session.ID, currentUserID).
		Preload("Responses").
		Preload("Responses.Question").
		Preload("Responses.SelectedOption").
		First(&existingFeedback).Error

	hasSubmitted := (err == nil && existingFeedback.ID > 0)

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"has_submitted": hasSubmitted,
		"peer":          peer,
		"session_id":    session.ID,
		"feedback":      existingFeedback,
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

// SubmitSessionFeedback records a student's peer evaluation for their interview partner
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

	// Insert relational response rows
	for _, ans := range input.Answers {
		if ans.QuestionID == 0 {
			continue
		}

		responseRecord := models.InterviewFeedbackResponse{
			FeedbackID:       feedback.ID,
			QuestionID:       ans.QuestionID,
			SelectedOptionID: ans.SelectedOptionID,
			AnswerValue:      strings.TrimSpace(ans.AnswerValue),
		}

		// If selected option ID is present, make sure answer_value contains option text if empty
		if responseRecord.SelectedOptionID != nil && responseRecord.AnswerValue == "" {
			var opt models.FeedbackQuestionOption
			if err := tx.First(&opt, *responseRecord.SelectedOptionID).Error; err == nil {
				responseRecord.AnswerValue = opt.OptionText
			}
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
		"message": "Peer feedback submitted successfully. Thank you for your review!",
		"data":    createdFeedback,
	})
}
