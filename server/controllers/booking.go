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
	ID                   uint     `json:"id"`
	SlotType             string   `json:"slot_type"` // "physical" | "online"
	VenueID              uint     `json:"venue_id"`
	VenueName            string   `json:"venue_name"`
	Building             string   `json:"building"`
	RoomNumber           string   `json:"room_number"`
	FacultyName          string   `json:"faculty_name"`
	FacultyDept          string   `json:"faculty_department"`
	TrackID              *uint    `json:"track_id,omitempty"`
	TrackTitle           string   `json:"track_title,omitempty"`
	LevelID              *uint    `json:"level_id,omitempty"`
	LevelName            string   `json:"level_name,omitempty"`
	LevelNumber          int      `json:"level_number,omitempty"`
	AllowedTrackIDs      []uint   `json:"allowed_track_ids,omitempty"`
	AllowedLevelIDs      []uint   `json:"allowed_level_ids,omitempty"`
	AllowedTracksSummary string   `json:"allowed_tracks_summary,omitempty"`
	SlotDate             string   `json:"slot_date"`
	StartTime            string   `json:"start_time"`
	EndTime              string   `json:"end_time"`
	TotalCapacity        int      `json:"total_capacity"`
	BookedCount          int      `json:"booked_count"`
	AvailableSeats       int      `json:"available_seats"`
	IsBookedByMe         bool     `json:"is_booked_by_me"`
	MyBookingID          uint     `json:"my_booking_id,omitempty"`
	Notes                string   `json:"notes"`
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

	var reqTrackID uint
	if trackIDStr != "" && trackIDStr != "all" {
		if tid, err := strconv.ParseUint(trackIDStr, 10, 32); err == nil {
			reqTrackID = uint(tid)
		}
	}

	var reqLevelID uint
	if levelIDStr != "" && levelIDStr != "all" {
		if lid, err := strconv.ParseUint(levelIDStr, 10, 32); err == nil {
			reqLevelID = uint(lid)
		}
	}

	response := make([]AvailableSlotResponse, 0, len(slots))
	for _, s := range slots {
		ParseSlotAllowedIDs(&s)

		// 1. Filter by Track if requested
		if reqTrackID > 0 {
			if len(s.AllowedTrackIDs) > 0 {
				found := false
				for _, tid := range s.AllowedTrackIDs {
					if tid == reqTrackID {
						found = true
						break
					}
				}
				if !found {
					continue
				}
			} else if s.TrackID != nil && *s.TrackID > 0 && *s.TrackID != reqTrackID {
				continue
			}
		}

		// 2. Filter by Level if requested
		if reqLevelID > 0 {
			if len(s.AllowedLevelIDs) > 0 {
				found := false
				for _, lid := range s.AllowedLevelIDs {
					if lid == reqLevelID {
						found = true
						break
					}
				}
				if !found {
					continue
				}
			} else if s.LevelID != nil && *s.LevelID > 0 && *s.LevelID != reqLevelID {
				continue
			}
		}

		var booked int64
		database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", s.ID).Count(&booked)

		available := s.Capacity - int(booked)
		if available < 0 {
			available = 0
		}

		// Do not disclose internal venue and invigilator details before booking (for physical slots)
		venueName := "Campus Examination Venue"
		building := "Academic Complex"
		roomNumber := "Assigned on Verification"
		facultyName := "Faculty Invigilator"
		facultyDept := "Examination Wing"

		if s.SlotType == "online" {
			venueName = "Online Video Assessment"
			building = "Remote / Virtual"
			roomNumber = "Online Session"
			facultyName = "Self-Proctored"
			facultyDept = "Virtual Proctor"
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
			ID:                   s.ID,
			SlotType:             s.SlotType,
			VenueID:              s.VenueID,
			VenueName:            venueName,
			Building:             building,
			RoomNumber:           roomNumber,
			FacultyName:          facultyName,
			FacultyDept:          facultyDept,
			TrackID:              s.TrackID,
			TrackTitle:           trackTitle,
			LevelID:              s.LevelID,
			LevelName:            levelName,
			LevelNumber:          levelNumber,
			AllowedTrackIDs:      s.AllowedTrackIDs,
			AllowedLevelIDs:      s.AllowedLevelIDs,
			SlotDate:             s.SlotDate,
			StartTime:            s.StartTime,
			EndTime:              s.EndTime,
			TotalCapacity:        s.Capacity,
			BookedCount:          int(booked),
			AvailableSeats:       available,
			IsBookedByMe:         bookingID > 0,
			MyBookingID:          bookingID,
			Notes:                s.Notes,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// BookSlot reserves a seat in an interview slot and dynamically balances student into an assigned venue
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
			"message": "Invalid booking payload",
			"error":   err.Error(),
		})
		return
	}

	// 1. Fetch Slot
	var slot models.InterviewSlot
	if err := database.DB.Preload("Venue").Preload("Faculty").Preload("Venues.Venue").Preload("Venues.Faculty").First(&slot, input.SlotID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Interview slot not found",
		})
		return
	}

	if slot.Status == models.SlotCancelled || slot.Status == models.SlotCompleted {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Cannot book a %s slot", slot.Status),
		})
		return
	}

	ParseSlotAllowedIDs(&slot)

	// Check domain restriction
	if len(slot.AllowedTrackIDs) > 0 {
		found := false
		for _, tid := range slot.AllowedTrackIDs {
			if tid == input.TrackID {
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "This slot does not include the selected domain",
			})
			return
		}
	} else if slot.TrackID != nil && *slot.TrackID > 0 && *slot.TrackID != input.TrackID {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "This slot is restricted to a different interview domain",
		})
		return
	}

	// Check level restriction
	if len(slot.AllowedLevelIDs) > 0 && input.LevelID > 0 {
		found := false
		for _, lid := range slot.AllowedLevelIDs {
			if lid == input.LevelID {
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "This slot does not include the selected difficulty level tier",
			})
			return
		}
	} else if slot.LevelID != nil && *slot.LevelID > 0 && input.LevelID > 0 && *slot.LevelID != input.LevelID {
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

	// 5. Dynamic Venue Balancing (for physical slots, allocate student to least-loaded venue)
	var assignedVenueID *uint
	var assignedFacultyID *uint

	allocationStatus := "pending_verification"
	if slot.SlotType == "online" || slot.AllocationsPublished {
		allocationStatus = "verified"
	}

	if slot.SlotType != "online" {
		if len(slot.Venues) > 0 {
			bestVenue := slot.Venues[0]
			minBookings := int64(999999)
			for _, sv := range slot.Venues {
				var count int64
				database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND assigned_venue_id = ? AND status != 'cancelled'", slot.ID, sv.VenueID).Count(&count)
				if count < minBookings {
					minBookings = count
					bestVenue = sv
				}
			}
			assignedVenueID = &bestVenue.VenueID
			assignedFacultyID = &bestVenue.FacultyID
		} else if slot.VenueID > 0 {
			assignedVenueID = &slot.VenueID
			assignedFacultyID = &slot.FacultyID
		}
	}

	// 6. Create Booking
	booking := models.SlotBooking{
		SlotID:            slot.ID,
		StudentID:         studentID,
		TrackID:           input.TrackID,
		LevelID:           input.LevelID,
		AssignedVenueID:   assignedVenueID,
		AssignedFacultyID: assignedFacultyID,
		AllocationStatus:  allocationStatus,
		Status:            "booked",
		AttendanceStatus:  models.AttendancePending,
		CanStartInterview: slot.SlotType == "online",
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
	database.DB.Preload("Slot.Venue").Preload("Slot.Faculty").Preload("AssignedVenue").Preload("AssignedFaculty").Preload("Track").First(&booking, booking.ID)

	successMsg := "Interview slot reserved successfully! Venue allocation will be verified by the admin before your session."
	if slot.SlotType == "online" {
		successMsg = "Online interview slot reserved! You can join remotely at the scheduled session time."
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": successMsg,
		"data":    booking,
	})
}

// GetMyBookings retrieves all slot bookings for the authenticated student with venue privacy masking
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
		Preload("AssignedVenue").
		Preload("AssignedFaculty").
		Preload("Track").
		Order("CASE WHEN status = 'cancelled' THEN 2 ELSE 1 END asc, created_at desc").
		Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch bookings",
			"error":   err.Error(),
		})
		return
	}

	// Mask venue details if allocation is not verified/published yet
	for i := range bookings {
		isOnline := bookings[i].Slot != nil && bookings[i].Slot.SlotType == "online"
		if isOnline {
			if bookings[i].Slot != nil {
				bookings[i].Slot.Venue = &models.Venue{
					Name:        "Online Video Assessment",
					Building:    "Remote / Virtual",
					RoomNumber:  "Online Session",
					Description: "Remote peer interview session. No physical venue attendance required.",
				}
			}
			bookings[i].AssignedVenue = nil
			bookings[i].AllocationStatus = "verified"
			continue
		}

		isVerified := bookings[i].AllocationStatus == "verified" || (bookings[i].Slot != nil && bookings[i].Slot.AllocationsPublished)
		if isVerified {
			if bookings[i].AssignedVenue != nil && bookings[i].Slot != nil {
				bookings[i].Slot.Venue = bookings[i].AssignedVenue
			}
		} else {
			if bookings[i].Slot != nil {
				bookings[i].Slot.Venue = &models.Venue{
					Name:        "Campus Venue (Allocation in Progress)",
					Building:    "Academic Block",
					RoomNumber:  "Pending Admin Verification",
					Description: "Specific venue details will be released once admin completes venue allocation.",
				}
			}
			bookings[i].AssignedVenue = nil
		}
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

// GetActiveSlotCheckInStatus checks if the student has an active booking today and returns verified venue details
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
		Preload("AssignedVenue").
		Preload("AssignedFaculty").
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

	isOnline := booking.Slot != nil && booking.Slot.SlotType == "online"
	if isOnline {
		nowTimeStr := time.Now().Format("15:04")
		// Online slots: Student can start when current time is on/after StartTime (e.g. "09:00")
		canStart := nowTimeStr >= booking.Slot.StartTime
		if booking.Slot.EndTime != "" && nowTimeStr > booking.Slot.EndTime {
			// Session window has ended
			canStart = false
		}

		booking.Slot.Venue = &models.Venue{
			Name:        "Online Video Assessment",
			Building:    "Remote Examination",
			RoomNumber:  "Online Session",
			Description: "Remote peer interview session. No in-person faculty check-in required. Connects automatically during session time.",
		}
		booking.AssignedVenue = nil

		attStatus := "pending"
		if canStart {
			attStatus = "present"
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"has_active_booking":     true,
				"is_online":              true,
				"can_start":              canStart,
				"attendance_status":      attStatus,
				"allocation_status":      "verified",
				"venue_details_verified": true,
				"booking":                booking,
			},
		})
		return
	}

	isVerified := booking.AllocationStatus == "verified" || (booking.Slot != nil && booking.Slot.AllocationsPublished)
	if isVerified {
		if booking.AssignedVenue != nil && booking.Slot != nil {
			booking.Slot.Venue = booking.AssignedVenue
		}
	} else {
		if booking.Slot != nil {
			booking.Slot.Venue = &models.Venue{
				Name:        "Campus Examination Venue",
				Building:    "Academic Block",
				RoomNumber:  "Allocation in Progress by Admin",
				Description: "Venue allocation is in progress. The venue will be revealed once verified by admin.",
			}
		}
		booking.AssignedVenue = nil
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"has_active_booking":      true,
			"is_online":               false,
			"can_start":               booking.CanStartInterview && booking.AttendanceStatus == models.AttendancePresent,
			"attendance_status":       booking.AttendanceStatus,
			"allocation_status":       booking.AllocationStatus,
			"venue_details_verified":  isVerified,
			"booking":                 booking,
		},
	})
}
