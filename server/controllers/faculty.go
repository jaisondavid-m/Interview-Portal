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

// UpdateAttendanceInput represents the request payload to mark individual attendance
type UpdateAttendanceInput struct {
	AttendanceStatus models.AttendanceStatus `json:"attendance_status" binding:"required"` // "present", "absent", "late", "pending"
}

// BulkAttendanceInput represents the request payload to mark attendance for multiple bookings at once
type BulkAttendanceInput struct {
	BookingIDs       []uint                  `json:"booking_ids" binding:"required"`
	AttendanceStatus models.AttendanceStatus `json:"attendance_status" binding:"required"`
}

// GetFacultyDashboardStats provides summary statistics for the authenticated faculty member
func GetFacultyDashboardStats(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	todayStr := time.Now().Format("2006-01-02")

	slotsQuery := database.DB.Model(&models.InterviewSlot{})
	if !isAdmin {
		slotsQuery = slotsQuery.Where("faculty_id = ?", facultyID)
	}

	var totalSlots int64
	var todaySlots int64
	slotsQuery.Count(&totalSlots)

	todaySlotsQuery := database.DB.Model(&models.InterviewSlot{}).Where("slot_date = ?", todayStr)
	if !isAdmin {
		todaySlotsQuery = todaySlotsQuery.Where("faculty_id = ?", facultyID)
	}
	todaySlotsQuery.Count(&todaySlots)

	// Get slot IDs assigned to this faculty for today
	var todaySlotIDs []uint
	todaySlotsQuery.Pluck("id", &todaySlotIDs)

	var totalBookingsToday int64
	var presentToday int64
	var absentToday int64
	var pendingToday int64

	if len(todaySlotIDs) > 0 {
		database.DB.Model(&models.SlotBooking{}).Where("slot_id IN ? AND status != 'cancelled'", todaySlotIDs).Count(&totalBookingsToday)
		database.DB.Model(&models.SlotBooking{}).Where("slot_id IN ? AND attendance_status = 'present'", todaySlotIDs).Count(&presentToday)
		database.DB.Model(&models.SlotBooking{}).Where("slot_id IN ? AND attendance_status = 'absent'", todaySlotIDs).Count(&absentToday)
		database.DB.Model(&models.SlotBooking{}).Where("slot_id IN ? AND attendance_status = 'pending'", todaySlotIDs).Count(&pendingToday)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"today_date":            todayStr,
			"today_slots_count":     todaySlots,
			"total_slots_count":     totalSlots,
			"today_students_booked": totalBookingsToday,
			"today_students_present": presentToday,
			"today_students_absent": absentToday,
			"today_students_pending": pendingToday,
		},
	})
}

// GetFacultyAssignedSlots lists all slots assigned to the faculty member
func GetFacultyAssignedSlots(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	scope := strings.ToLower(strings.TrimSpace(c.DefaultQuery("scope", "today"))) // "today", "upcoming", "all", "history"
	todayStr := time.Now().Format("2006-01-02")

	query := database.DB.Model(&models.InterviewSlot{}).
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Venues.Venue").
		Preload("Venues.Faculty")

	if !isAdmin {
		query = query.Where("faculty_id = ? OR id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?)", facultyID, facultyID)
	}

	switch scope {
	case "today":
		query = query.Where("slot_date = ?", todayStr)
	case "upcoming":
		query = query.Where("slot_date >= ? AND status IN ?", todayStr, []string{"scheduled", "active"})
	case "history":
		query = query.Where("slot_date < ? OR status IN ?", todayStr, []string{"completed", "cancelled"})
	}

	var slots []models.InterviewSlot
	if err := query.Order("slot_date asc, start_time asc").Find(&slots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch assigned slots",
			"error":   err.Error(),
		})
		return
	}

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

// GetFacultySlotRoster retrieves student roster for a specific venue slot with search and attendance breakdown
func GetFacultySlotRoster(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	idParam := c.Param("id")
	slotID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid slot ID"})
		return
	}

	var slot models.InterviewSlot
	slotQuery := database.DB.Preload("Venue").Preload("Faculty").Preload("Track").Preload("Venues.Venue").Preload("Venues.Faculty")
	if !isAdmin {
		slotQuery = slotQuery.Where("faculty_id = ? OR id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?)", facultyID, facultyID)
	}

	if err := slotQuery.First(&slot, uint(slotID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Slot not found or you are not assigned to this venue slot"})
		return
	}

	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	attendanceFilter := strings.ToLower(strings.TrimSpace(c.Query("attendance")))

	query := database.DB.Model(&models.SlotBooking{}).
		Where("slot_id = ? AND slot_bookings.status != 'cancelled'", slot.ID).
		Preload("Student").
		Preload("Track").
		Preload("AssignedVenue").
		Preload("AssignedFaculty")

	if !isAdmin {
		query = query.Where("assigned_faculty_id = ? OR (assigned_faculty_id IS NULL AND slot_id IN (SELECT id FROM interview_slots WHERE faculty_id = ?))", facultyID, facultyID)
	}

	if attendanceFilter != "" && attendanceFilter != "all" {
		query = query.Where("attendance_status = ?", attendanceFilter)
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Joins("JOIN users ON users.id = slot_bookings.student_id").
			Where("LOWER(users.name) LIKE ? OR LOWER(users.roll_no) LIKE ? OR LOWER(users.email) LIKE ?", s, s, s)
	}

	var bookings []models.SlotBooking
	if err := query.Order("slot_bookings.created_at asc").Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch student roster",
			"error":   err.Error(),
		})
		return
	}

	var totalCount int64
	var presentCount int64
	var absentCount int64
	var pendingCount int64
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", slot.ID).Count(&totalCount)
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND attendance_status = 'present'", slot.ID).Count(&presentCount)
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND attendance_status = 'absent'", slot.ID).Count(&absentCount)
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND attendance_status = 'pending'", slot.ID).Count(&pendingCount)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"slot": slot,
			"stats": gin.H{
				"total":   totalCount,
				"present": presentCount,
				"absent":  absentCount,
				"pending": pendingCount,
			},
			"roster": bookings,
		},
	})
}

// UpdateStudentAttendance marks a student present, absent, or late in the venue
func UpdateStudentAttendance(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)

	bookingIDParam := c.Param("bookingId")
	bookingID, err := strconv.ParseUint(bookingIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid booking ID"})
		return
	}

	var input UpdateAttendanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid attendance status payload",
			"error":   err.Error(),
		})
		return
	}

	var booking models.SlotBooking
	if err := database.DB.Preload("Slot").Preload("Student").First(&booking, uint(bookingID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Booking not found"})
		return
	}

	now := time.Now()
	booking.AttendanceStatus = input.AttendanceStatus
	booking.AttendanceMarkedAt = &now
	booking.AttendanceMarkedBy = &facultyID

	// If marked Present, unlock interview access!
	if input.AttendanceStatus == models.AttendancePresent {
		booking.CanStartInterview = true
	} else {
		booking.CanStartInterview = false
	}

	if err := database.DB.Save(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update attendance",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Attendance marked as '%s' for student %s", booking.AttendanceStatus, booking.Student.Name),
		"data":    booking,
	})
}

// BulkUpdateAttendance allows faculty to mark multiple or all students present/absent with 1 click
func BulkUpdateAttendance(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)

	var input BulkAttendanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid bulk attendance payload",
			"error":   err.Error(),
		})
		return
	}

	if len(input.BookingIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "No bookings selected"})
		return
	}

	now := time.Now()
	canStart := input.AttendanceStatus == models.AttendancePresent

	result := database.DB.Model(&models.SlotBooking{}).
		Where("id IN ?", input.BookingIDs).
		Updates(map[string]interface{}{
			"attendance_status":    input.AttendanceStatus,
			"can_start_interview":  canStart,
			"attendance_marked_at": &now,
			"attendance_marked_by": &facultyID,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update bulk attendance",
			"error":   result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Successfully marked %d student(s) as '%s'", result.RowsAffected, input.AttendanceStatus),
		"updated": result.RowsAffected,
	})
}
