package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// VenueWithStats provides venue info alongside active slots and total capacity
type VenueWithStats struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Building    string `json:"building"`
	RoomNumber  string `json:"room_number"`
	Capacity    int    `json:"capacity"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
	TotalSlots  int64  `json:"total_slots"`
	ActiveSlots int64  `json:"active_slots"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateVenueInput represents the request payload to create a new physical venue
type CreateVenueInput struct {
	Name        string `json:"name" binding:"required"`
	Building    string `json:"building" binding:"required"`
	RoomNumber  string `json:"room_number" binding:"required"`
	Capacity    int    `json:"capacity" binding:"required,min=1"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

// UpdateVenueInput represents the request payload to update an existing venue
type UpdateVenueInput struct {
	Name        string `json:"name"`
	Building    string `json:"building"`
	RoomNumber  string `json:"room_number"`
	Capacity    int    `json:"capacity"`
	Description string `json:"description"`
	IsActive    *bool  `json:"is_active"`
}

// AdminGetVenues returns a list of venues with search, active filters, and slot statistics
func AdminGetVenues(c *gin.Context) {
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	status := strings.ToLower(strings.TrimSpace(c.Query("status"))) // "all", "active", "inactive"

	query := database.DB.Model(&models.Venue{})

	if status == "active" {
		query = query.Where("is_active = ?", true)
	} else if status == "inactive" {
		query = query.Where("is_active = ?", false)
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(building) LIKE ? OR LOWER(room_number) LIKE ?", s, s, s)
	}

	var venues []models.Venue
	if err := query.Order("building asc, name asc").Find(&venues).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch venues",
			"error":   err.Error(),
		})
		return
	}

	// Calculate slot stats for each venue
	response := make([]VenueWithStats, 0, len(venues))
	for _, v := range venues {
		var totalSlots int64
		var activeSlots int64
		database.DB.Model(&models.InterviewSlot{}).Where("venue_id = ?", v.ID).Count(&totalSlots)
		database.DB.Model(&models.InterviewSlot{}).Where("venue_id = ? AND status IN ?", v.ID, []string{"scheduled", "active"}).Count(&activeSlots)

		response = append(response, VenueWithStats{
			ID:          v.ID,
			Name:        v.Name,
			Building:    v.Building,
			RoomNumber:  v.RoomNumber,
			Capacity:    v.Capacity,
			Description: v.Description,
			IsActive:    v.IsActive,
			TotalSlots:  totalSlots,
			ActiveSlots: activeSlots,
			CreatedAt:   v.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   v.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// AdminCreateVenue creates a new interview venue
func AdminCreateVenue(c *gin.Context) {
	var input CreateVenueInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid venue payload",
			"error":   err.Error(),
		})
		return
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	venue := models.Venue{
		Name:        strings.TrimSpace(input.Name),
		Building:    strings.TrimSpace(input.Building),
		RoomNumber:  strings.TrimSpace(input.RoomNumber),
		Capacity:    input.Capacity,
		Description: strings.TrimSpace(input.Description),
		IsActive:    isActive,
	}

	if err := database.DB.Create(&venue).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create venue",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Venue created successfully",
		"data":    venue,
	})
}

// AdminUpdateVenue updates venue details
func AdminUpdateVenue(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid venue ID",
		})
		return
	}

	var venue models.Venue
	if err := database.DB.First(&venue, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Venue not found",
		})
		return
	}

	var input UpdateVenueInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid venue payload",
			"error":   err.Error(),
		})
		return
	}

	if input.Name != "" {
		venue.Name = strings.TrimSpace(input.Name)
	}
	if input.Building != "" {
		venue.Building = strings.TrimSpace(input.Building)
	}
	if input.RoomNumber != "" {
		venue.RoomNumber = strings.TrimSpace(input.RoomNumber)
	}
	if input.Capacity > 0 {
		venue.Capacity = input.Capacity
	}
	if input.Description != "" {
		venue.Description = strings.TrimSpace(input.Description)
	}
	if input.IsActive != nil {
		venue.IsActive = *input.IsActive
	}

	if err := database.DB.Save(&venue).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update venue",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Venue updated successfully",
		"data":    venue,
	})
}

// AdminDeleteVenue deletes a venue if there are no active scheduled slots
func AdminDeleteVenue(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid venue ID",
		})
		return
	}

	var venue models.Venue
	if err := database.DB.First(&venue, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Venue not found",
		})
		return
	}

	// Check if active slots exist
	var activeSlotCount int64
	database.DB.Model(&models.InterviewSlot{}).Where("venue_id = ? AND status IN ?", venue.ID, []string{"scheduled", "active"}).Count(&activeSlotCount)
	if activeSlotCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Cannot delete venue '%s' because %d active interview slot(s) are scheduled in this venue. Cancel or reassign those slots first.", venue.Name, activeSlotCount),
		})
		return
	}

	if err := database.DB.Delete(&venue).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to delete venue",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Venue '%s' deleted successfully", venue.Name),
	})
}

// AdminGetFacultyList returns all users with role 'faculty' (or 'admin') for slot assignment dropdowns
func AdminGetFacultyList(c *gin.Context) {
	var facultyUsers []models.User
	if err := database.DB.Where("role IN ?", []string{"faculty", "admin"}).Order("name asc").Find(&facultyUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch faculty list",
			"error":   err.Error(),
		})
		return
	}

	type FacultySummary struct {
		ID         uint   `json:"id"`
		Name       string `json:"name"`
		Email      string `json:"email"`
		Department string `json:"department"`
		Role       string `json:"role"`
	}

	res := make([]FacultySummary, 0, len(facultyUsers))
	for _, u := range facultyUsers {
		res = append(res, FacultySummary{
			ID:         u.ID,
			Name:       u.Name,
			Email:      u.Email,
			Department: u.Department,
			Role:       u.Role,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   res,
	})
}
