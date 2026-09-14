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

// ============================================================
// TRACKS CONTROLLER
// ============================================================

// AdminGetTracks retrieves all interview tracks with lightweight counts (no heavy nested payloads)
func AdminGetTracks(c *gin.Context) {
	var tracks []models.InterviewTrack
	if err := database.DB.Order("id asc").Find(&tracks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch interview tracks",
			"error":   err.Error(),
		})
		return
	}

	type TrackDTO struct {
		models.InterviewTrack
		LevelsCount    int64 `json:"levels_count"`
		QuestionsCount int64 `json:"questions_count"`
	}

	var trackDTOs []TrackDTO
	for _, t := range tracks {
		var lCount int64
		var qCount int64
		database.DB.Model(&models.InterviewLevel{}).Where("track_id = ?", t.ID).Count(&lCount)
		database.DB.Model(&models.InterviewQuestion{}).
			Joins("JOIN interview_levels ON interview_levels.id = interview_questions.level_id").
			Where("interview_levels.track_id = ?", t.ID).
			Count(&qCount)

		trackDTOs = append(trackDTOs, TrackDTO{
			InterviewTrack: t,
			LevelsCount:    lCount,
			QuestionsCount: qCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   trackDTOs,
	})
}

// AdminGetTrackByID retrieves a single track
func AdminGetTrackByID(c *gin.Context) {
	id := c.Param("id")
	var track models.InterviewTrack
	if err := database.DB.First(&track, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Interview track not found",
		})
		return
	}

	var lCount int64
	var qCount int64
	database.DB.Model(&models.InterviewLevel{}).Where("track_id = ?", track.ID).Count(&lCount)
	database.DB.Model(&models.InterviewQuestion{}).
		Joins("JOIN interview_levels ON interview_levels.id = interview_questions.level_id").
		Where("interview_levels.track_id = ?", track.ID).
		Count(&qCount)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"id":              track.ID,
			"title":           track.Title,
			"slug":            track.Slug,
			"category":        track.Category,
			"icon":            track.Icon,
			"description":     track.Description,
			"levels_count":    lCount,
			"questions_count": qCount,
			"created_at":      track.CreatedAt,
			"updated_at":      track.UpdatedAt,
		},
	})
}

// AdminCreateTrack creates a new interview track (e.g. DSA, System Design)
func AdminCreateTrack(c *gin.Context) {
	var input struct {
		Title       string `json:"title" binding:"required"`
		Category    string `json:"category"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid track details provided",
			"error":   err.Error(),
		})
		return
	}

	slug := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Title), " ", "-"))
	category := input.Category
	if category == "" {
		category = "Technical"
	}
	icon := input.Icon
	if icon == "" {
		icon = "Code"
	}

	track := models.InterviewTrack{
		Title:       input.Title,
		Slug:        slug,
		Category:    category,
		Icon:        icon,
		Description: input.Description,
	}

	if err := database.DB.Create(&track).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create interview track",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Interview track created successfully",
		"data":    track,
	})
}

// AdminUpdateTrack updates track meta
func AdminUpdateTrack(c *gin.Context) {
	id := c.Param("id")
	var track models.InterviewTrack
	if err := database.DB.First(&track, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Interview track not found",
		})
		return
	}

	var input struct {
		Title       string `json:"title"`
		Category    string `json:"category"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid track details",
		})
		return
	}

	if input.Title != "" {
		track.Title = input.Title
		track.Slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Title), " ", "-"))
	}
	if input.Category != "" {
		track.Category = input.Category
	}
	if input.Icon != "" {
		track.Icon = input.Icon
	}
	if input.Description != "" {
		track.Description = input.Description
	}

	database.DB.Save(&track)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Track updated successfully",
		"data":    track,
	})
}

// AdminDeleteTrack deletes track and cascading levels & questions
func AdminDeleteTrack(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.InterviewTrack{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to delete track",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Interview track deleted successfully",
	})
}

// ============================================================
// LEVELS CONTROLLER
// ============================================================

// AdminGetLevels retrieves all levels for a specific track on demand
func AdminGetLevels(c *gin.Context) {
	trackID := c.Param("id")
	if trackID == "" {
		trackID = c.Param("trackId")
	}
	var levels []models.InterviewLevel
	if err := database.DB.Where("track_id = ?", trackID).Order("level_number asc").Find(&levels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch levels",
		})
		return
	}

	type LevelDTO struct {
		models.InterviewLevel
		QuestionsCount int64 `json:"questions_count"`
	}

	var levelDTOs []LevelDTO
	for _, l := range levels {
		if l.QuestionCount <= 0 {
			if l.Mode == models.ModeMCQ {
				l.QuestionCount = 10
			} else {
				l.QuestionCount = 1
			}
		}
		var qCount int64
		database.DB.Model(&models.InterviewQuestion{}).Where("level_id = ?", l.ID).Count(&qCount)
		levelDTOs = append(levelDTOs, LevelDTO{
			InterviewLevel: l,
			QuestionsCount: qCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   levelDTOs,
	})
}

// AdminGetLevelByID retrieves a single level on demand
func AdminGetLevelByID(c *gin.Context) {
	id := c.Param("id")
	var level models.InterviewLevel
	if err := database.DB.First(&level, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Level not found"})
		return
	}

	if level.QuestionCount <= 0 {
		if level.Mode == models.ModeMCQ {
			level.QuestionCount = 10
		} else {
			level.QuestionCount = 1
		}
	}

	var qCount int64
	database.DB.Model(&models.InterviewQuestion{}).Where("level_id = ?", level.ID).Count(&qCount)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"id":               level.ID,
			"track_id":         level.TrackID,
			"level_number":     level.LevelNumber,
			"name":             level.Name,
			"description":      level.Description,
			"mode":             level.Mode,
			"duration_minutes": level.DurationMin,
			"question_count":   level.QuestionCount,
			"questions_count":  qCount,
			"created_at":       level.CreatedAt,
			"updated_at":       level.UpdatedAt,
		},
	})
}

// AdminCreateLevel adds a new level to an interview track
func AdminCreateLevel(c *gin.Context) {
	trackID := c.Param("id")
	if trackID == "" {
		trackID = c.Param("trackId")
	}
	var input struct {
		LevelNumber   int                  `json:"level_number" binding:"required"`
		Name          string               `json:"name" binding:"required"`
		Description   string               `json:"description"`
		Mode          models.InterviewMode `json:"mode" binding:"required"` // coding, verbal_qa, mcq, discussion
		DurationMin   int                  `json:"duration_minutes"`
		QuestionCount int                  `json:"question_count"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Please specify level number, title, and interview mode (coding, verbal_qa, mcq, discussion)",
			"error":   err.Error(),
		})
		return
	}

	duration := input.DurationMin
	if duration <= 0 {
		duration = 45
	}

	questionCount := input.QuestionCount
	if questionCount <= 0 {
		if input.Mode == models.ModeMCQ {
			questionCount = 10
		} else {
			questionCount = 1
		}
	}

	var trackIDUint uint
	if _, err := fmt.Sscanf(trackID, "%d", &trackIDUint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid track ID"})
		return
	}

	level := models.InterviewLevel{
		TrackID:       trackIDUint,
		LevelNumber:   input.LevelNumber,
		Name:          input.Name,
		Description:   input.Description,
		Mode:          input.Mode,
		DurationMin:   duration,
		QuestionCount: questionCount,
	}

	if err := database.DB.Create(&level).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create level",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Level created successfully",
		"data":    level,
	})
}

// AdminUpdateLevel updates level properties
func AdminUpdateLevel(c *gin.Context) {
	id := c.Param("id")
	var level models.InterviewLevel
	if err := database.DB.First(&level, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Level not found"})
		return
	}

	var input struct {
		Name          string               `json:"name"`
		Description   string               `json:"description"`
		Mode          models.InterviewMode `json:"mode"`
		DurationMin   int                  `json:"duration_minutes"`
		QuestionCount int                  `json:"question_count"`
		LevelNumber   int                  `json:"level_number"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid payload"})
		return
	}

	if input.Name != "" {
		level.Name = input.Name
	}
	if input.Description != "" {
		level.Description = input.Description
	}
	if input.Mode != "" {
		level.Mode = input.Mode
	}
	if input.DurationMin > 0 {
		level.DurationMin = input.DurationMin
	}
	if input.QuestionCount > 0 {
		level.QuestionCount = input.QuestionCount
	} else if level.QuestionCount <= 0 {
		if level.Mode == models.ModeMCQ {
			level.QuestionCount = 10
		} else {
			level.QuestionCount = 1
		}
	}
	if input.LevelNumber > 0 {
		level.LevelNumber = input.LevelNumber
	}

	database.DB.Save(&level)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Level updated successfully",
		"data":    level,
	})
}

// AdminDeleteLevel deletes a level and its questions
func AdminDeleteLevel(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.InterviewLevel{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to delete level"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Level deleted successfully",
	})
}

// ============================================================
// QUESTIONS CONTROLLER (Relational Database Normalization)
// ============================================================

// QuestionInput defines the payload for creating or updating questions
type QuestionInput struct {
	LevelID    uint                                   `json:"level_id"`
	Title      string                                 `json:"title" binding:"required"`
	Prompt     string                                 `json:"prompt" binding:"required"`
	Difficulty string                                 `json:"difficulty"`
	Type       models.InterviewMode                   `json:"type" binding:"required"`
	Detail     *models.InterviewQuestionDetail        `json:"detail"`
	Templates  []models.InterviewQuestionCodeTemplate `json:"templates"`
	TestCases  []models.InterviewQuestionTestCase     `json:"test_cases"`
	Hints      []models.InterviewQuestionHint         `json:"hints"`
	MCQOptions []models.InterviewQuestionMCQOption    `json:"mcq_options"`
}

// AdminGetQuestions retrieves all questions for a specific level with all relational children
func AdminGetQuestions(c *gin.Context) {
	levelID := c.Param("id")
	if levelID == "" {
		levelID = c.Param("levelId")
	}
	var questions []models.InterviewQuestion
	if err := database.DB.
		Preload("Detail").
		Preload("Templates").
		Preload("TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		Where("level_id = ?", levelID).
		Order("id asc").
		Find(&questions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch questions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   questions,
	})
}

// AdminGetQuestionByID retrieves a single question with all relational child tables
func AdminGetQuestionByID(c *gin.Context) {
	id := c.Param("id")
	var question models.InterviewQuestion
	if err := database.DB.
		Preload("Detail").
		Preload("Templates").
		Preload("TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		First(&question, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Question not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   question,
	})
}

// saveQuestionRelations synchronizes all relational child rows directly from strongly typed payload fields
func saveQuestionRelations(tx *gorm.DB, qID uint, input QuestionInput) error {
	// 1. Detail (Constraints, Approach, Complexity, Scenario, Ideal Answer, etc.)
	if input.Detail != nil {
		var existingDetail models.InterviewQuestionDetail
		if err := tx.Where("question_id = ?", qID).First(&existingDetail).Error; err == nil {
			existingDetail.Constraints = input.Detail.Constraints
			existingDetail.ExpectedApproach = input.Detail.ExpectedApproach
			existingDetail.ExpectedComplexity = input.Detail.ExpectedComplexity
			existingDetail.IdealAnswer = input.Detail.IdealAnswer
			existingDetail.Scenario = input.Detail.Scenario
			existingDetail.CorrectOption = input.Detail.CorrectOption
			existingDetail.Explanation = input.Detail.Explanation
			if err := tx.Save(&existingDetail).Error; err != nil {
				return fmt.Errorf("detail update failed: %w", err)
			}
		} else {
			input.Detail.QuestionID = qID
			input.Detail.ID = 0
			if err := tx.Create(input.Detail).Error; err != nil {
				return fmt.Errorf("detail create failed: %w", err)
			}
		}
	}

	// 2. Language Starter Code Templates
	if err := tx.Where("question_id = ?", qID).Delete(&models.InterviewQuestionCodeTemplate{}).Error; err != nil {
		return fmt.Errorf("templates delete failed: %w", err)
	}
	for _, tmpl := range input.Templates {
		if strings.TrimSpace(tmpl.StarterCode) == "" {
			continue
		}
		tmpl.QuestionID = qID
		tmpl.ID = 0
		if err := tx.Create(&tmpl).Error; err != nil {
			return fmt.Errorf("template create failed: %w", err)
		}
	}

	// 3. Test Cases (Sample and Hidden)
	if err := tx.Where("question_id = ?", qID).Delete(&models.InterviewQuestionTestCase{}).Error; err != nil {
		return fmt.Errorf("test cases delete failed: %w", err)
	}
	for i, tc := range input.TestCases {
		tc.QuestionID = qID
		tc.ID = 0
		if tc.OrderIndex == 0 {
			tc.OrderIndex = i + 1
		}
		if err := tx.Create(&tc).Error; err != nil {
			return fmt.Errorf("test case create failed: %w", err)
		}
	}

	// 4. Hints & Rubrics & Talking Points
	if err := tx.Where("question_id = ?", qID).Delete(&models.InterviewQuestionHint{}).Error; err != nil {
		return fmt.Errorf("hints delete failed: %w", err)
	}
	for i, h := range input.Hints {
		if strings.TrimSpace(h.Content) == "" {
			continue
		}
		h.QuestionID = qID
		h.ID = 0
		if h.OrderIndex == 0 {
			h.OrderIndex = i + 1
		}
		if err := tx.Create(&h).Error; err != nil {
			return fmt.Errorf("hint create failed: %w", err)
		}
	}

	// 5. MCQ Options
	if err := tx.Where("question_id = ?", qID).Delete(&models.InterviewQuestionMCQOption{}).Error; err != nil {
		return fmt.Errorf("mcq options delete failed: %w", err)
	}
	for _, opt := range input.MCQOptions {
		if strings.TrimSpace(opt.OptionText) == "" {
			continue
		}
		opt.QuestionID = qID
		opt.ID = 0
		if err := tx.Create(&opt).Error; err != nil {
			return fmt.Errorf("mcq option create failed: %w", err)
		}
	}

	return nil
}

// AdminCreateQuestion adds a question into a level with relational data
func AdminCreateQuestion(c *gin.Context) {
	levelID := c.Param("id")
	if levelID == "" {
		levelID = c.Param("levelId")
	}
	var input QuestionInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Please provide question title, prompt, and type",
			"error":   err.Error(),
		})
		return
	}

	var levelIDUint uint
	if _, err := fmt.Sscanf(levelID, "%d", &levelIDUint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid level ID"})
		return
	}

	difficulty := input.Difficulty
	if difficulty == "" {
		difficulty = "Medium"
	}

	question := models.InterviewQuestion{
		LevelID:    levelIDUint,
		Title:      input.Title,
		Prompt:     input.Prompt,
		Difficulty: difficulty,
		Type:       input.Type,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&question).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create question",
			"error":   err.Error(),
		})
		return
	}

	// Persist child relational records
	if err := saveQuestionRelations(tx, question.ID, input); err != nil {
		tx.Rollback()
		fmt.Printf("[AdminCreateQuestion] Relational save error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to save question relational details: " + err.Error(),
			"error":   err.Error(),
		})
		return
	}
	tx.Commit()

	// Preload fresh question
	var created models.InterviewQuestion
	database.DB.
		Preload("Detail").
		Preload("Templates").
		Preload("TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		First(&created, question.ID)

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Question added successfully",
		"data":    created,
	})
}

// AdminUpdateQuestion updates a question and its relational children
func AdminUpdateQuestion(c *gin.Context) {
	id := c.Param("id")
	var question models.InterviewQuestion
	if err := database.DB.First(&question, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Question not found"})
		return
	}

	var input QuestionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid payload", "error": err.Error()})
		return
	}

	if input.Title != "" {
		question.Title = input.Title
	}
	if input.Prompt != "" {
		question.Prompt = input.Prompt
	}
	if input.Difficulty != "" {
		question.Difficulty = input.Difficulty
	}
	if input.Type != "" {
		question.Type = input.Type
	}

	tx := database.DB.Begin()
	if err := tx.Save(&question).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to update question", "error": err.Error()})
		return
	}

	if err := saveQuestionRelations(tx, question.ID, input); err != nil {
		tx.Rollback()
		fmt.Printf("[AdminUpdateQuestion] Relational update error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update question relational details: " + err.Error(),
			"error":   err.Error(),
		})
		return
	}
	tx.Commit()

	// Preload updated question
	var updated models.InterviewQuestion
	database.DB.
		Preload("Detail").
		Preload("Templates").
		Preload("TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		First(&updated, question.ID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Question updated successfully",
		"data":    updated,
	})
}

// AdminDeleteQuestion removes a question
func AdminDeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.InterviewQuestion{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to delete question"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Question deleted successfully",
	})
}

// BulkCreateQuestionsInput represents payload for creating multiple questions
type BulkCreateQuestionsInput struct {
	Questions []QuestionInput `json:"questions" binding:"required"`
}

// AdminBulkCreateQuestions handles batch insertion of questions and all their relational child records
func AdminBulkCreateQuestions(c *gin.Context) {
	levelIDParam := c.Param("id")
	if levelIDParam == "" {
		levelIDParam = c.Param("levelId")
	}

	var levelIDUint uint
	if _, err := fmt.Sscanf(levelIDParam, "%d", &levelIDUint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid level ID"})
		return
	}

	var level models.InterviewLevel
	if err := database.DB.First(&level, levelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview level not found"})
		return
	}

	var input BulkCreateQuestionsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid questions payload",
			"error":   err.Error(),
		})
		return
	}

	if len(input.Questions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No question records provided",
		})
		return
	}

	var createdQuestions []models.InterviewQuestion
	var skippedDetails []string

	for idx, qInput := range input.Questions {
		title := strings.TrimSpace(qInput.Title)
		prompt := strings.TrimSpace(qInput.Prompt)

		if title == "" || prompt == "" {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Item %d: Missing title or prompt", idx+1))
			continue
		}

		difficulty := qInput.Difficulty
		if difficulty == "" {
			difficulty = "Medium"
		}

		qType := qInput.Type
		if qType == "" {
			qType = level.Mode
		}

		tx := database.DB.Begin()

		newQ := models.InterviewQuestion{
			LevelID:    levelIDUint,
			Title:      title,
			Prompt:     prompt,
			Difficulty: difficulty,
			Type:       qType,
		}

		if err := tx.Create(&newQ).Error; err != nil {
			tx.Rollback()
			skippedDetails = append(skippedDetails, fmt.Sprintf("Item %d (%s): Insert failed - %v", idx+1, title, err))
			continue
		}

		if err := saveQuestionRelations(tx, newQ.ID, qInput); err != nil {
			tx.Rollback()
			skippedDetails = append(skippedDetails, fmt.Sprintf("Item %d (%s): Relational save failed - %v", idx+1, title, err))
			continue
		}

		tx.Commit()
		createdQuestions = append(createdQuestions, newQ)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"message":         fmt.Sprintf("Bulk upload complete: %d questions created, %d skipped", len(createdQuestions), len(skippedDetails)),
		"created_count":   len(createdQuestions),
		"skipped_count":   len(skippedDetails),
		"skipped_details": skippedDetails,
		"data":            createdQuestions,
	})
}

// AdminBulkDeleteQuestions deletes multiple questions by IDs
func AdminBulkDeleteQuestions(c *gin.Context) {
	var input struct {
		QuestionIDs []uint `json:"question_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || len(input.QuestionIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No question IDs provided",
		})
		return
	}

	res := database.DB.Where("id IN ?", input.QuestionIDs).Delete(&models.InterviewQuestion{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to bulk delete questions",
			"error":   res.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       fmt.Sprintf("Successfully deleted %d questions", res.RowsAffected),
		"deleted_count": res.RowsAffected,
	})
}

// AdminExportQuestions exports questions for a level
func AdminExportQuestions(c *gin.Context) {
	levelID := c.Param("id")
	if levelID == "" {
		levelID = c.Param("levelId")
	}

	var questions []models.InterviewQuestion
	if err := database.DB.
		Preload("Detail").
		Preload("Templates").
		Preload("TestCases", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("Hints", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc, id asc") }).
		Preload("MCQOptions", func(db *gorm.DB) *gorm.DB { return db.Order("option_key asc, id asc") }).
		Where("level_id = ?", levelID).
		Order("id asc").
		Find(&questions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch questions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   questions,
	})
}
