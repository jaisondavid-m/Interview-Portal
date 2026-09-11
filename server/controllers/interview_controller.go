package controllers

import (
	"fmt"
	"net/http"
	"strings"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// ============================================================
// TRACKS CONTROLLER
// ============================================================

// AdminGetTracks retrieves all interview tracks along with nested level & question counts
func AdminGetTracks(c *gin.Context) {
	var tracks []models.InterviewTrack
	if err := database.DB.Preload("Levels.Questions").Order("id asc").Find(&tracks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch interview tracks",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   tracks,
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

// AdminGetLevels retrieves all levels for a track
func AdminGetLevels(c *gin.Context) {
	trackID := c.Param("trackId")
	var levels []models.InterviewLevel
	if err := database.DB.Preload("Questions").Where("track_id = ?", trackID).Order("level_number asc").Find(&levels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch levels",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   levels,
	})
}

// AdminCreateLevel adds a new level to an interview track
func AdminCreateLevel(c *gin.Context) {
	trackID := c.Param("trackId")
	var input struct {
		LevelNumber int                  `json:"level_number" binding:"required"`
		Name        string               `json:"name" binding:"required"`
		Description string               `json:"description"`
		Mode        models.InterviewMode `json:"mode" binding:"required"` // coding, verbal_qa, mcq, discussion
		DurationMin int                  `json:"duration_minutes"`
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

	var trackIDUint uint
	if _, err := fmt.Sscanf(trackID, "%d", &trackIDUint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid track ID"})
		return
	}

	level := models.InterviewLevel{
		TrackID:     trackIDUint,
		LevelNumber: input.LevelNumber,
		Name:        input.Name,
		Description: input.Description,
		Mode:        input.Mode,
		DurationMin: duration,
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
		Name        string               `json:"name"`
		Description string               `json:"description"`
		Mode        models.InterviewMode `json:"mode"`
		DurationMin int                  `json:"duration_minutes"`
		LevelNumber int                  `json:"level_number"`
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
// QUESTIONS CONTROLLER
// ============================================================

// AdminGetQuestions retrieves all questions for a specific level
func AdminGetQuestions(c *gin.Context) {
	levelID := c.Param("levelId")
	var questions []models.InterviewQuestion
	if err := database.DB.Where("level_id = ?", levelID).Order("id asc").Find(&questions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch questions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   questions,
	})
}

// AdminCreateQuestion adds a question into a level
func AdminCreateQuestion(c *gin.Context) {
	levelID := c.Param("levelId")
	var input struct {
		Title       string               `json:"title" binding:"required"`
		Prompt      string               `json:"prompt" binding:"required"`
		Difficulty  string               `json:"difficulty"`
		Type        models.InterviewMode `json:"type" binding:"required"`
		PayloadJSON string               `json:"payload_json"`
	}

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
		LevelID:     levelIDUint,
		Title:       input.Title,
		Prompt:      input.Prompt,
		Difficulty:  difficulty,
		Type:        input.Type,
		PayloadJSON: input.PayloadJSON,
	}

	if err := database.DB.Create(&question).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create question",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Question added successfully",
		"data":    question,
	})
}

// AdminUpdateQuestion updates a question
func AdminUpdateQuestion(c *gin.Context) {
	id := c.Param("id")
	var question models.InterviewQuestion
	if err := database.DB.First(&question, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Question not found"})
		return
	}

	var input struct {
		Title       string               `json:"title"`
		Prompt      string               `json:"prompt"`
		Difficulty  string               `json:"difficulty"`
		Type        models.InterviewMode `json:"type"`
		PayloadJSON string               `json:"payload_json"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid payload"})
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
	if input.PayloadJSON != "" {
		question.PayloadJSON = input.PayloadJSON
	}

	database.DB.Save(&question)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Question updated successfully",
		"data":    question,
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
