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

// CreateSlotInput represents the request payload for scheduling a new slot
type CreateSlotInput struct {
	VenueID   uint   `json:"venue_id" binding:"required"`
	FacultyID uint   `json:"faculty_id" binding:"required"`
	TrackID   *uint  `json:"track_id"`
	LevelID   *uint  `json:"level_id"`
	SlotDate  string `json:"slot_date" binding:"required"` // "YYYY-MM-DD"
	StartTime string `json:"start_time" binding:"required"` // "HH:MM" (e.g. "09:00")
	EndTime   string `json:"end_time" binding:"required"`   // "HH:MM" (e.g. "10:30")
	Capacity  *int   `json:"capacity"`                      // Optional, defaults to venue capacity
	Notes     string `json:"notes"`
}

// UpdateSlotInput represents the request payload for editing a slot
type UpdateSlotInput struct {
	VenueID   *uint              `json:"venue_id"`
	FacultyID *uint              `json:"faculty_id"`
	TrackID   *uint              `json:"track_id"`
	LevelID   *uint              `json:"level_id"`
	SlotDate  string             `json:"slot_date"`
	StartTime string             `json:"start_time"`
	EndTime   string             `json:"end_time"`
	Capacity  *int               `json:"capacity"`
	Status    *models.SlotStatus `json:"status"`
	Notes     string             `json:"notes"`
}

// AdminGetSlots retrieves interview slots with filtering by date range, venue, faculty, track, and status
func AdminGetSlots(c *gin.Context) {
	venueIDStr := strings.TrimSpace(c.Query("venue_id"))
	facultyIDStr := strings.TrimSpace(c.Query("faculty_id"))
	trackIDStr := strings.TrimSpace(c.Query("track_id"))
	levelIDStr := strings.TrimSpace(c.Query("level_id"))
	dateStr := strings.TrimSpace(c.Query("date"))
	status := strings.TrimSpace(c.Query("status"))
	upcomingOnly := strings.ToLower(strings.TrimSpace(c.Query("upcoming"))) == "true"

	query := database.DB.Model(&models.InterviewSlot{}).
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level")

	if venueIDStr != "" && venueIDStr != "all" {
		if vid, err := strconv.ParseUint(venueIDStr, 10, 32); err == nil {
			query = query.Where("venue_id = ?", uint(vid))
		}
	}

	if facultyIDStr != "" && facultyIDStr != "all" {
		if fid, err := strconv.ParseUint(facultyIDStr, 10, 32); err == nil {
			query = query.Where("faculty_id = ?", uint(fid))
		}
	}

	if trackIDStr != "" && trackIDStr != "all" {
		if tid, err := strconv.ParseUint(trackIDStr, 10, 32); err == nil && tid > 0 {
			query = query.Where("track_id = ?", uint(tid))
		}
	}

	if levelIDStr != "" && levelIDStr != "all" {
		if lid, err := strconv.ParseUint(levelIDStr, 10, 32); err == nil && lid > 0 {
			query = query.Where("level_id = ?", uint(lid))
		}
	}

	if dateStr != "" {
		query = query.Where("slot_date = ?", dateStr)
	}

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	if upcomingOnly {
		query = query.Where("status IN ?", []string{"scheduled", "active"})
	}

	var slots []models.InterviewSlot
	if err := query.Order("slot_date asc, start_time asc").Find(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch interview slots",
			"error":   err.Error(),
		})
		return
	}

	// Update counts for each slot dynamically
	for i := range slots {
		var booked int64
		var present int64
		database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", slots[i].ID).Count(&booked)
		database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND attendance_status = 'present'", slots[i].ID).Count(&present)
		slots[i].BookedCount = int(booked)
		slots[i].PresentCount = int(present)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   slots,
	})
}

// AdminCreateSlot creates a new interview time slot and assigns faculty to the venue
func AdminCreateSlot(c *gin.Context) {
	var input CreateSlotInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid slot payload",
			"error":   err.Error(),
		})
		return
	}

	// Validate Venue
	var venue models.Venue
	if err := database.DB.First(&venue, input.VenueID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Selected venue does not exist",
		})
		return
	}

	// Validate Faculty
	var faculty models.User
	if err := database.DB.First(&faculty, input.FacultyID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Selected faculty user does not exist",
		})
		return
	}

	// Validate Optional Track
	var trackID *uint
	if input.TrackID != nil && *input.TrackID > 0 {
		var track models.InterviewTrack
		if err := database.DB.First(&track, *input.TrackID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Selected track does not exist",
			})
			return
		}
		trackID = input.TrackID
	}

	// Validate Optional Level
	var levelID *uint
	if input.LevelID != nil && *input.LevelID > 0 {
		if trackID == nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Track must be selected when specifying a level restriction",
			})
			return
		}
		var level models.InterviewLevel
		if err := database.DB.Where("id = ? AND track_id = ?", *input.LevelID, *trackID).First(&level).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Selected level does not exist within the specified track",
			})
			return
		}
		levelID = input.LevelID
	}

	capacity := venue.Capacity
	if input.Capacity != nil && *input.Capacity > 0 {
		capacity = *input.Capacity
	}

	slot := models.InterviewSlot{
		VenueID:      input.VenueID,
		FacultyID:    input.FacultyID,
		TrackID:      trackID,
		LevelID:      levelID,
		SlotDate:     strings.TrimSpace(input.SlotDate),
		StartTime:    strings.TrimSpace(input.StartTime),
		EndTime:      strings.TrimSpace(input.EndTime),
		Capacity:     capacity,
		BookedCount:  0,
		PresentCount: 0,
		Status:       models.SlotScheduled,
		Notes:        strings.TrimSpace(input.Notes),
	}

	if err := database.DB.Create(&slot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to schedule slot",
			"error":   err.Error(),
		})
		return
	}

	// Load preloads for clean response
	database.DB.Preload("Venue").Preload("Faculty").Preload("Track").Preload("Level").First(&slot, slot.ID)

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Interview slot scheduled successfully",
		"data":    slot,
	})
}

// AdminUpdateSlot updates slot details, status, track/level, or faculty assignment
func AdminUpdateSlot(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid slot ID",
		})
		return
	}

	var slot models.InterviewSlot
	if err := database.DB.First(&slot, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Interview slot not found",
		})
		return
	}

	var input UpdateSlotInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid slot payload",
			"error":   err.Error(),
		})
		return
	}

	if input.VenueID != nil {
		var venue models.Venue
		if err := database.DB.First(&venue, *input.VenueID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Venue does not exist"})
			return
		}
		slot.VenueID = *input.VenueID
	}

	if input.FacultyID != nil {
		var faculty models.User
		if err := database.DB.First(&faculty, *input.FacultyID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Faculty does not exist"})
			return
		}
		slot.FacultyID = *input.FacultyID
	}

	if input.TrackID != nil {
		if *input.TrackID == 0 {
			slot.TrackID = nil
			slot.LevelID = nil
		} else {
			slot.TrackID = input.TrackID
		}
	}

	if input.LevelID != nil {
		if *input.LevelID == 0 {
			slot.LevelID = nil
		} else {
			slot.LevelID = input.LevelID
		}
	}

	if input.SlotDate != "" {
		slot.SlotDate = strings.TrimSpace(input.SlotDate)
	}
	if input.StartTime != "" {
		slot.StartTime = strings.TrimSpace(input.StartTime)
	}
	if input.EndTime != "" {
		slot.EndTime = strings.TrimSpace(input.EndTime)
	}
	if input.Capacity != nil && *input.Capacity > 0 {
		slot.Capacity = *input.Capacity
	}
	if input.Status != nil {
		slot.Status = *input.Status
	}
	if input.Notes != "" {
		slot.Notes = strings.TrimSpace(input.Notes)
	}

	if err := database.DB.Save(&slot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update slot",
			"error":   err.Error(),
		})
		return
	}

	database.DB.Preload("Venue").Preload("Faculty").Preload("Track").Preload("Level").First(&slot, slot.ID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Interview slot updated successfully",
		"data":    slot,
	})
}

// AdminDeleteSlot cancels and deletes a slot
func AdminDeleteSlot(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid slot ID",
		})
		return
	}

	var slot models.InterviewSlot
	if err := database.DB.First(&slot, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Slot not found",
		})
		return
	}

	// Check if active bookings exist
	var bookingCount int64
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", slot.ID).Count(&bookingCount)
	if bookingCount > 0 {
		slot.Status = models.SlotCancelled
		database.DB.Save(&slot)
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": fmt.Sprintf("Slot marked as cancelled because it has %d student booking(s)", bookingCount),
		})
		return
	}

	if err := database.DB.Delete(&slot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to delete slot",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Slot deleted successfully",
	})
}

// AdminGetSlotRoster retrieves the complete student roster for a specific slot
func AdminGetSlotRoster(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid slot ID",
		})
		return
	}

	var slot models.InterviewSlot
	if err := database.DB.Preload("Venue").Preload("Faculty").Preload("Track").Preload("Level").First(&slot, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Slot not found",
		})
		return
	}

	var bookings []models.SlotBooking
	if err := database.DB.
		Where("slot_id = ?", slot.ID).
		Preload("Student").
		Preload("Track").
		Order("created_at asc").
		Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch student roster",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"slot":     slot,
			"bookings": bookings,
		},
	})
}
