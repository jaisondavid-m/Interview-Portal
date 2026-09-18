package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// BookSlotInput represents the payload from a student to book a slot
type BookSlotInput struct {
	SlotID  uint `json:"slot_id" binding:"required"`
	TrackID uint `json:"track_id" binding:"required"`
	LevelID uint `json:"level_id"`
}

// AvailableSlotResponse represents an open interview slot with venue and remaining capacity
type AvailableSlotResponse struct {
	ID             uint                  `json:"id"`
	VenueID        uint                  `json:"venue_id"`
	VenueName      string                `json:"venue_name"`
	Building       string                `json:"building"`
	RoomNumber     string                `json:"room_number"`
	FacultyName    string                `json:"faculty_name"`
	FacultyDept    string                `json:"faculty_department"`
	TrackID        *uint                 `json:"track_id,omitempty"`
	TrackTitle     string                `json:"track_title,omitempty"`
	LevelID        *uint                 `json:"level_id,omitempty"`
	LevelName      string                `json:"level_name,omitempty"`
	LevelNumber    int                   `json:"level_number,omitempty"`
	SlotDate       string                `json:"slot_date"`
	StartTime      string                `json:"start_time"`
	EndTime        string                `json:"end_time"`
	TotalCapacity  int                   `json:"total_capacity"`
	BookedCount    int                   `json:"booked_count"`
	AvailableSeats int                   `json:"available_seats"`
	IsBookedByMe   bool                  `json:"is_booked_by_me"`
	MyBookingID    uint                  `json:"my_booking_id,omitempty"`
	Notes          string                `json:"notes"`
}

// GetAvailableSlots returns all upcoming active slots open for booking with track & level filters
func GetAvailableSlots(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	var currentUserID uint
	if exists {
		if uid, ok := rawUserID.(uint); ok {
			currentUserID = uid
		}
	}

	trackIDStr := strings.TrimSpace(c.Query("track_id"))
	levelIDStr := strings.TrimSpace(c.Query("level_id"))
	dateStr := strings.TrimSpace(c.Query("date"))

	todayStr := time.Now().Format("2006-01-02")
	query := database.DB.Model(&models.InterviewSlot{}).
		Where("status IN ? AND slot_date >= ?", []string{"scheduled", "active"}, todayStr).
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level")

	if trackIDStr != "" && trackIDStr != "all" {
		if tid, err := strconv.ParseUint(trackIDStr, 10, 32); err == nil && tid > 0 {
			query = query.Where("(track_id IS NULL OR track_id = ?)", uint(tid))
		}
	}

	if levelIDStr != "" && levelIDStr != "all" {
		if lid, err := strconv.ParseUint(levelIDStr, 10, 32); err == nil && lid > 0 {
			query = query.Where("(level_id IS NULL OR level_id = 0 OR level_id = ?)", uint(lid))
		}
	}

	if dateStr != "" {
		query = query.Where("slot_date = ?", dateStr)
	}

	var slots []models.InterviewSlot
	if err := query.Order("slot_date asc, start_time asc").Find(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch available slots",
			"error":   err.Error(),
		})
		return
	}

	// Fetch current user's active bookings to flag "is_booked_by_me"
	myBookingsMap := make(map[uint]uint)
	if currentUserID > 0 {
		var myBookings []models.SlotBooking
		database.DB.Where("student_id = ? AND status != 'cancelled'", currentUserID).Find(&myBookings)
		for _, b := range myBookings {
			myBookingsMap[b.SlotID] = b.ID
		}
	}

	response := make([]AvailableSlotResponse, 0, len(slots))
	for _, s := range slots {
		var booked int64
		database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", s.ID).Count(&booked)

		available := s.Capacity - int(booked)
		if available < 0 {
			available = 0
		}

		venueName := ""
		building := ""
		roomNumber := ""
		if s.Venue != nil {
			venueName = s.Venue.Name
			building = s.Venue.Building
			roomNumber = s.Venue.RoomNumber
		}

		facultyName := "Assigned Staff"
		facultyDept := ""
		if s.Faculty != nil {
			facultyName = s.Faculty.Name
			facultyDept = s.Faculty.Department
		}

		trackTitle := "All Domains"
		if s.Track != nil {
			trackTitle = s.Track.Title
		}

		levelName := "All Levels"
		levelNumber := 0
		if s.Level != nil {
			levelName = s.Level.Name
			levelNumber = s.Level.LevelNumber
		}

		bookingID := myBookingsMap[s.ID]

		response = append(response, AvailableSlotResponse{
			ID:             s.ID,
			VenueID:        s.VenueID,
			VenueName:      venueName,
			Building:       building,
			RoomNumber:     roomNumber,
			FacultyName:    facultyName,
			FacultyDept:    facultyDept,
			TrackID:        s.TrackID,
			TrackTitle:     trackTitle,
			LevelID:        s.LevelID,
			LevelName:      levelName,
			LevelNumber:    levelNumber,
			SlotDate:       s.SlotDate,
			StartTime:      s.StartTime,
			EndTime:        s.EndTime,
			TotalCapacity:  s.Capacity,
			BookedCount:    int(booked),
			AvailableSeats: available,
			IsBookedByMe:   bookingID > 0,
			MyBookingID:    bookingID,
			Notes:          s.Notes,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// BookSlot allows a student to reserve an interview slot
func BookSlot(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	studentID := rawUserID.(uint)

	var input BookSlotInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid booking input",
			"error":   err.Error(),
		})
		return
	}

	// 1. Verify Slot exists and is open
	var slot models.InterviewSlot
	if err := database.DB.Preload("Venue").Preload("Faculty").First(&slot, input.SlotID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview slot not found"})
		return
	}

	if slot.Status == models.SlotCancelled || slot.Status == models.SlotCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "This slot is no longer open for booking"})
		return
	}

	// Check domain restriction if slot is locked to a specific track
	if slot.TrackID != nil && *slot.TrackID > 0 && *slot.TrackID != input.TrackID {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "This slot is restricted to a different interview domain",
		})
		return
	}

	// Check level restriction if slot is locked to a specific level
	if slot.LevelID != nil && *slot.LevelID > 0 && *slot.LevelID != input.LevelID {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "This slot is restricted to a different difficulty level tier",
		})
		return
	}

	// 2. Check Capacity
	var bookedCount int64
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", slot.ID).Count(&bookedCount)
	if int(bookedCount) >= slot.Capacity {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Venue slot is fully booked (%d/%d seats filled)", bookedCount, slot.Capacity),
		})
		return
	}

	// 3. Prevent duplicate active booking in the same slot
	var existingBooking models.SlotBooking
	if err := database.DB.Where("slot_id = ? AND student_id = ? AND status != 'cancelled'", slot.ID, studentID).First(&existingBooking).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": "You have already booked a seat in this slot",
			"data":    existingBooking,
		})
		return
	}

	// 4. Verify Track exists
	var track models.InterviewTrack
	if err := database.DB.First(&track, input.TrackID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Selected track does not exist"})
		return
	}

	// 5. Create Booking
	booking := models.SlotBooking{
		SlotID:            slot.ID,
		StudentID:         studentID,
		TrackID:           input.TrackID,
		LevelID:           input.LevelID,
		Status:            "booked",
		AttendanceStatus:  models.AttendancePending,
		CanStartInterview: false,
	}

	if err := database.DB.Create(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to book slot",
			"error":   err.Error(),
		})
		return
	}

	// Preload associations
	database.DB.Preload("Slot.Venue").Preload("Slot.Faculty").Preload("Track").First(&booking, booking.ID)

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Interview slot booked successfully! Please report to the venue at the scheduled time.",
		"data":    booking,
	})
}

// GetMyBookings retrieves all slot bookings for the authenticated student
func GetMyBookings(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	studentID := rawUserID.(uint)

	var bookings []models.SlotBooking
	if err := database.DB.
		Where("student_id = ?", studentID).
		Preload("Slot.Venue").
		Preload("Slot.Faculty").
		Preload("Track").
		Order("created_at desc").
		Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch bookings",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   bookings,
	})
}

// CancelBooking allows a student to cancel their booking
func CancelBooking(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	studentID := rawUserID.(uint)

	idParam := c.Param("id")
	bookingID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid booking ID"})
		return
	}

	var booking models.SlotBooking
	if err := database.DB.Where("id = ? AND student_id = ?", uint(bookingID), studentID).First(&booking).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Booking not found"})
		return
	}

	if booking.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Booking is already cancelled"})
		return
	}

	if booking.AttendanceStatus == models.AttendancePresent {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Cannot cancel booking after attendance has been marked Present"})
		return
	}

	booking.Status = "cancelled"
	if err := database.DB.Save(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to cancel booking",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Booking cancelled successfully",
	})
}

// GetActiveSlotCheckInStatus checks if the student has an active booking today and whether they are marked Present
func GetActiveSlotCheckInStatus(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	studentID := rawUserID.(uint)

	todayStr := time.Now().Format("2006-01-02")

	var booking models.SlotBooking
	err := database.DB.
		Joins("JOIN interview_slots ON interview_slots.id = slot_bookings.slot_id").
		Where("slot_bookings.student_id = ? AND slot_bookings.status != 'cancelled' AND interview_slots.slot_date = ?", studentID, todayStr).
		Preload("Slot.Venue").
		Preload("Slot.Faculty").
		Preload("Slot.Level").
		Preload("Track").
		Order("interview_slots.start_time asc").
		First(&booking).Error

	if err != nil {
		// No active booking today
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"has_active_booking": false,
				"can_start":          false,
				"booking":            nil,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"has_active_booking": true,
			"can_start":          booking.CanStartInterview && booking.AttendanceStatus == models.AttendancePresent,
			"attendance_status":  booking.AttendanceStatus,
			"booking":            booking,
		},
	})
}
