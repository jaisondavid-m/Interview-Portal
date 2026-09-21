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

// CleanupStaleInterviewSessions automatically updates sessions that have been in 'in_progress'
// for over 2 hours without completion to 'completed' with ended_at set to current time.
func CleanupStaleInterviewSessions() {
	database.DB.Exec("UPDATE interview_sessions SET status = 'completed', ended_at = NOW() WHERE status = 'in_progress' AND created_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)")
}

// GetFacultyDashboardStats provides summary statistics for the authenticated faculty member
func GetFacultyDashboardStats(c *gin.Context) {
	CleanupStaleInterviewSessions()

	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	todayStr := time.Now().Format("2006-01-02")

	// Get all slot IDs assigned to this faculty member (both direct and multi-venue assigned)
	var allFacultySlotIDs []uint
	if isAdmin {
		database.DB.Model(&models.InterviewSlot{}).Pluck("id", &allFacultySlotIDs)
	} else {
		database.DB.Model(&models.InterviewSlot{}).
			Where("faculty_id = ? OR id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?)", facultyID, facultyID).
			Pluck("id", &allFacultySlotIDs)
	}

	var totalSlots int64 = 0
	var activeUpcomingSlots int64
	var completedSlots int64
	var todaySlots int64
	var todaySlotIDs []uint

	if len(allFacultySlotIDs) > 0 {
		database.DB.Model(&models.InterviewSlot{}).
			Where("id IN ? AND status != 'cancelled'", allFacultySlotIDs).
			Count(&totalSlots)

		database.DB.Model(&models.InterviewSlot{}).
			Where("id IN ? AND status IN ?", allFacultySlotIDs, []string{"scheduled", "active"}).
			Count(&activeUpcomingSlots)

		database.DB.Model(&models.InterviewSlot{}).
			Where("id IN ? AND status = 'completed'", allFacultySlotIDs).
			Count(&completedSlots)

		database.DB.Model(&models.InterviewSlot{}).
			Where("id IN ? AND slot_date = ? AND status != 'cancelled'", allFacultySlotIDs, todayStr).
			Pluck("id", &todaySlotIDs)
		todaySlots = int64(len(todaySlotIDs))
	}

	// Today's attendance counts
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

	// Total students evaluated / attended across all faculty slots
	var totalEvaluated int64
	if len(allFacultySlotIDs) > 0 {
		database.DB.Model(&models.SlotBooking{}).
			Where("slot_id IN ? AND attendance_status = 'present'", allFacultySlotIDs).
			Count(&totalEvaluated)
	}

	// Currently running live sessions in this faculty's venues
	var liveSessionsCount int64
	if len(allFacultySlotIDs) > 0 {
		var facultyStudentIDs []uint
		database.DB.Model(&models.SlotBooking{}).
			Where("slot_id IN ? AND status != 'cancelled'", allFacultySlotIDs).
			Distinct("student_id").
			Pluck("student_id", &facultyStudentIDs)

		if len(facultyStudentIDs) > 0 {
			database.DB.Model(&models.InterviewSession{}).
				Where("status = 'in_progress' AND (interviewer_id IN ? OR interviewee_id IN ?)", facultyStudentIDs, facultyStudentIDs).
				Count(&liveSessionsCount)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"today_date":                todayStr,
			"today_slots_count":         todaySlots,
			"total_slots_count":         totalSlots,
			"total_slots_managed":       totalSlots,
			"active_upcoming_slots":     activeUpcomingSlots,
			"completed_slots":           completedSlots,
			"live_sessions_count":       liveSessionsCount,
			"total_students_evaluated":  totalEvaluated,
			"today_students_booked":     totalBookingsToday,
			"today_students_present":    presentToday,
			"today_students_absent":     absentToday,
			"today_students_pending":    pendingToday,
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

	scope := strings.ToLower(strings.TrimSpace(c.DefaultQuery("scope", "all"))) // "all", "today", "upcoming", "history"
	todayStr := time.Now().Format("2006-01-02")

	query := database.DB.Model(&models.InterviewSlot{}).
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level").
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
	orderClause := "CASE WHEN status = 'active' THEN 1 WHEN status = 'scheduled' THEN 2 WHEN status = 'completed' THEN 3 WHEN status = 'cancelled' THEN 4 ELSE 5 END asc, slot_date desc, start_time asc"
	if err := query.Order(orderClause).Find(&slots).Error; err != nil {
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

// GetFacultyInterviewSessions retrieves live running sessions and history for students mapped to this faculty's venues
func GetFacultyInterviewSessions(c *gin.Context) {
	CleanupStaleInterviewSessions()

	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "20"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))

	// Find all slot IDs belonging to this faculty
	var facultySlotIDs []uint
	if isAdmin {
		database.DB.Model(&models.InterviewSlot{}).Pluck("id", &facultySlotIDs)
	} else {
		database.DB.Model(&models.InterviewSlot{}).
			Where("faculty_id = ? OR id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?)", facultyID, facultyID).
			Pluck("id", &facultySlotIDs)
	}

	if len(facultySlotIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   []models.InterviewSession{},
			"pagination": gin.H{
				"page":          1,
				"limit":         20,
				"total_records": 0,
				"total_pages":   1,
				"has_next":      false,
				"has_prev":      false,
			},
		})
		return
	}

	// Find student IDs who have bookings in this faculty's slots/venues
	var studentIDs []uint
	database.DB.Model(&models.SlotBooking{}).
		Where("slot_id IN ? AND status != 'cancelled'", facultySlotIDs).
		Distinct("student_id").
		Pluck("student_id", &studentIDs)

	if len(studentIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data":   []models.InterviewSession{},
			"pagination": gin.H{
				"page":          1,
				"limit":         20,
				"total_records": 0,
				"total_pages":   1,
				"has_next":      false,
				"has_prev":      false,
			},
		})
		return
	}

	query := database.DB.Model(&models.InterviewSession{}).
		Where("interview_sessions.interviewer_id IN ? OR interview_sessions.interviewee_id IN ?", studentIDs, studentIDs)

	if statusFilter != "" && !strings.EqualFold(statusFilter, "all") {
		query = query.Where("interview_sessions.status = ?", statusFilter)
	}

	if search != "" {
		// Clean up search term for room # matching (e.g. "room 10", "room #10", "#10")
		cleanSearch := strings.TrimPrefix(strings.TrimPrefix(search, "room"), "#")
		cleanSearch = strings.TrimSpace(cleanSearch)

		s := "%" + search + "%"
		cs := "%" + cleanSearch + "%"

		query = query.Joins("LEFT JOIN users AS interviewer ON interviewer.id = interview_sessions.interviewer_id").
			Joins("LEFT JOIN users AS interviewee ON interviewee.id = interview_sessions.interviewee_id").
			Joins("LEFT JOIN interview_tracks ON interview_tracks.id = interview_sessions.track_id").
			Joins("LEFT JOIN interview_levels ON interview_levels.id = interview_sessions.level_id").
			Where("CAST(interview_sessions.id AS CHAR) LIKE ? OR CAST(interview_sessions.id AS CHAR) LIKE ? OR LOWER(interviewer.name) LIKE ? OR LOWER(interviewer.email) LIKE ? OR LOWER(interviewer.roll_no) LIKE ? OR LOWER(interviewer.department) LIKE ? OR LOWER(interviewee.name) LIKE ? OR LOWER(interviewee.email) LIKE ? OR LOWER(interviewee.roll_no) LIKE ? OR LOWER(interviewee.department) LIKE ? OR LOWER(interview_tracks.title) LIKE ? OR LOWER(interview_levels.name) LIKE ? OR LOWER(interview_levels.mode) LIKE ?", cs, s, s, s, s, s, s, s, s, s, s, s, s)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to count faculty interview sessions",
			"error":   err.Error(),
		})
		return
	}

	page := 1
	limit := 20
	if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l >= 1 {
		limit = l
		if limit > 200 {
			limit = 200
		}
	}
	offset := (page - 1) * limit

	var sessions []models.InterviewSession
	// Prioritize live 'in_progress' sessions first, then most recent completed
	orderClause := "CASE WHEN interview_sessions.status = 'in_progress' THEN 1 ELSE 2 END asc, interview_sessions.created_at desc"
	if err := query.
		Preload("Track").
		Preload("Level").
		Preload("Interviewer").
		Preload("Interviewee").
		Order(orderClause).
		Limit(limit).
		Offset(offset).
		Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch faculty interview sessions",
			"error":   err.Error(),
		})
		return
	}

	type UserSummary struct {
		ID         uint   `json:"id"`
		Name       string `json:"name"`
		Email      string `json:"email"`
		RollNo     string `json:"roll_no"`
		Department string `json:"department"`
		Role       string `json:"role"`
	}

	type SessionDTO struct {
		ID            uint         `json:"id"`
		TrackID       uint         `json:"track_id"`
		TrackTitle    string       `json:"track_title"`
		TrackCategory string       `json:"track_category"`
		LevelID       uint         `json:"level_id"`
		LevelName     string       `json:"level_name"`
		LevelNumber   int          `json:"level_number"`
		LevelMode     string       `json:"level_mode"`
		Interviewer   *UserSummary `json:"interviewer"`
		Interviewee   *UserSummary `json:"interviewee"`
		Status        string       `json:"status"`
		Round         int          `json:"round"`
		SwitchCount   int          `json:"switch_count"`
		HasRecording  bool         `json:"has_recording"`
		HasReport     bool         `json:"has_security_report"`
		StartedAt     time.Time    `json:"started_at"`
		EndedAt       *time.Time   `json:"ended_at"`
		CreatedAt     time.Time    `json:"created_at"`
	}

	dtoList := make([]SessionDTO, 0, len(sessions))
	for _, s := range sessions {
		var hasRec int64
		database.DB.Model(&models.InterviewRecording{}).Where("session_id = ?", s.ID).Count(&hasRec)

		var hasSec int64
		database.DB.Model(&models.SessionSecurityReport{}).Where("session_id = ?", s.ID).Count(&hasSec)

		var interviewerSummary *UserSummary
		if s.Interviewer != nil {
			interviewerSummary = &UserSummary{
				ID:         s.Interviewer.ID,
				Name:       s.Interviewer.Name,
				Email:      s.Interviewer.Email,
				RollNo:     s.Interviewer.RollNo,
				Department: s.Interviewer.Department,
				Role:       s.Interviewer.Role,
			}
		}

		var intervieweeSummary *UserSummary
		if s.Interviewee != nil {
			intervieweeSummary = &UserSummary{
				ID:         s.Interviewee.ID,
				Name:       s.Interviewee.Name,
				Email:      s.Interviewee.Email,
				RollNo:     s.Interviewee.RollNo,
				Department: s.Interviewee.Department,
				Role:       s.Interviewee.Role,
			}
		}

		trackTitle := "Technical Track"
		trackCategory := "Technical"
		if s.Track != nil {
			trackTitle = s.Track.Title
			trackCategory = s.Track.Category
		}

		levelName := "Assessment Level"
		levelNumber := 1
		levelMode := "coding"
		if s.Level != nil {
			levelName = s.Level.Name
			levelNumber = s.Level.LevelNumber
			levelMode = string(s.Level.Mode)
		}

		startedAt := s.StartedAt
		if startedAt.IsZero() {
			startedAt = s.CreatedAt
		}

		dtoList = append(dtoList, SessionDTO{
			ID:            s.ID,
			TrackID:       s.TrackID,
			TrackTitle:    trackTitle,
			TrackCategory: trackCategory,
			LevelID:       s.LevelID,
			LevelName:     levelName,
			LevelNumber:   levelNumber,
			LevelMode:     levelMode,
			Interviewer:   interviewerSummary,
			Interviewee:   intervieweeSummary,
			Status:        s.Status,
			Round:         s.Round,
			SwitchCount:   s.SwitchCount,
			HasRecording:  hasRec > 0,
			HasReport:     hasSec > 0,
			StartedAt:     startedAt,
			EndedAt:       s.EndedAt,
			CreatedAt:     s.CreatedAt,
		})
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int((totalCount + int64(limit) - 1) / int64(limit))
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   dtoList,
		"pagination": gin.H{
			"page":          page,
			"limit":         limit,
			"total_records": totalCount,
			"total_pages":   totalPages,
			"has_next":      page < totalPages,
			"has_prev":      page > 1,
		},
	})
}

// GetFacultyInterviewSessionDetail retrieves complete session detail for a faculty member
func GetFacultyInterviewSessionDetail(c *gin.Context) {
	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	sessionIDParam := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid session ID"})
		return
	}

	var session models.InterviewSession
	if err := database.DB.
		Preload("Track").
		Preload("Level").
		Preload("Interviewer").
		Preload("Interviewee").
		Preload("CurrentQuestion").
		First(&session, uint(sessionID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	// Security validation: ensure the session belongs to this faculty's mapped slots & venues
	if !isAdmin {
		var count int64
		database.DB.Model(&models.SlotBooking{}).
			Where("(student_id = ? OR student_id = ?) AND (assigned_faculty_id = ? OR slot_id IN (SELECT id FROM interview_slots WHERE faculty_id = ?) OR slot_id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?))", session.InterviewerID, session.IntervieweeID, facultyID, facultyID, facultyID).
			Count(&count)
		if count == 0 {
			c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "Access restricted: This interview session did not take place at your assigned venue/slot"})
			return
		}
	}

	var recording *models.InterviewRecording
	var rec models.InterviewRecording
	if err := database.DB.Where("session_id = ?", session.ID).First(&rec).Error; err == nil {
		recording = &rec
	}

	var feedbacks []models.InterviewFeedback
	database.DB.Where("session_id = ?", session.ID).
		Preload("Reviewer").
		Preload("Reviewee").
		Preload("Responses.Question").
		Find(&feedbacks)

	var securityReports []models.SessionSecurityReport
	database.DB.Where("session_id = ?", session.ID).
		Preload("Reporter").
		Preload("ReportedUser").
		Find(&securityReports)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"session":          session,
			"recording":        recording,
			"feedbacks":        feedbacks,
			"security_reports": securityReports,
		},
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
		query = query.Where(
			"assigned_faculty_id = ? OR (assigned_faculty_id IS NULL AND slot_id IN (SELECT id FROM interview_slots WHERE faculty_id = ?)) OR (assigned_faculty_id IS NULL AND slot_id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?))",
			facultyID, facultyID, facultyID,
		)
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

// VenueMonitorSessionItem represents live interview session & connected candidate details in a venue
type VenueMonitorSessionItem struct {
	SessionID            string               `json:"session_id"`
	Status               string               `json:"status"`
	TrackTitle           string               `json:"track_title"`
	CurrentQuestionTitle string               `json:"current_question_title"`
	StartedAt            *time.Time           `json:"started_at"`
	ElapsedSeconds       int64                `json:"elapsed_seconds"`
	VenueName            string               `json:"venue_name"`
	RoomNumber           string               `json:"room_number"`
	Building             string               `json:"building"`
	Interviewee          *models.User         `json:"interviewee"`
	Interviewer          *models.User         `json:"interviewer"`
	IntervieweeConnected bool                 `json:"interviewee_connected"`
	InterviewerConnected bool                 `json:"interviewer_connected"`
	AudioStreamURL       string               `json:"audio_stream_url"`
}

// GetFacultyVenueMonitorData returns live venue interview sessions & connected student statuses for faculty
func GetFacultyVenueMonitorData(c *gin.Context) {
	CleanupStaleInterviewSessions()

	rawUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required"})
		return
	}
	facultyID := rawUserID.(uint)
	roleVal, _ := c.Get("userRole")
	isAdmin := strings.ToLower(fmt.Sprintf("%v", roleVal)) == "admin"

	// 1. Get assigned slots/venues for this faculty (or all slots if admin)
	var allFacultySlotIDs []uint
	if isAdmin {
		database.DB.Model(&models.InterviewSlot{}).Pluck("id", &allFacultySlotIDs)
	} else {
		database.DB.Model(&models.InterviewSlot{}).
			Where("faculty_id = ? OR id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?)", facultyID, facultyID).
			Pluck("id", &allFacultySlotIDs)
	}

	if len(allFacultySlotIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status":   "success",
			"count":    0,
			"sessions": []VenueMonitorSessionItem{},
		})
		return
	}

	// 2. Query active bookings in these faculty slots
	var activeBookings []models.SlotBooking
	database.DB.
		Preload("Slot").
		Preload("AssignedVenue").
		Preload("Student").
		Where("slot_id IN ? AND status != 'cancelled'", allFacultySlotIDs).
		Find(&activeBookings)

	studentIDMap := make(map[uint]models.SlotBooking)
	for _, b := range activeBookings {
		studentIDMap[b.StudentID] = b
	}

	studentIDs := make([]uint, 0, len(studentIDMap))
	for sid := range studentIDMap {
		studentIDs = append(studentIDs, sid)
	}

	if len(studentIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"status":   "success",
			"count":    0,
			"sessions": []VenueMonitorSessionItem{},
		})
		return
	}

	// 3. Find active interview sessions involving these students
	var liveSessions []models.InterviewSession
	database.DB.
		Preload("Interviewee").
		Preload("Interviewer").
		Preload("CurrentQuestion").
		Preload("Track").
		Where("(interviewee_id IN ? OR interviewer_id IN ?) AND status = 'in_progress'", studentIDs, studentIDs).
		Find(&liveSessions)

	resultItems := make([]VenueMonitorSessionItem, 0)
	now := time.Now()

	for _, s := range liveSessions {
		booking := studentIDMap[s.IntervieweeID]
		if booking.ID == 0 {
			booking = studentIDMap[s.InterviewerID]
		}

		venueName := "Online / Virtual Venue"
		roomNum := "N/A"
		building := "Remote"

		if booking.AssignedVenue != nil && booking.AssignedVenue.Name != "" {
			venueName = booking.AssignedVenue.Name
			roomNum = booking.AssignedVenue.RoomNumber
			building = booking.AssignedVenue.Building
		} else if booking.Slot != nil && booking.Slot.VenueID > 0 {
			var v models.Venue
			if err := database.DB.First(&v, booking.Slot.VenueID).Error; err == nil {
				venueName = v.Name
				roomNum = v.RoomNumber
				building = v.Building
			}
		}

		elapsedSecs := int64(0)
		var startPtr *time.Time
		if !s.StartedAt.IsZero() {
			startPtr = &s.StartedAt
			elapsedSecs = int64(now.Sub(s.StartedAt).Seconds())
			if elapsedSecs < 0 {
				elapsedSecs = 0
			}
		}

		sessStrID := fmt.Sprintf("%d", s.ID)

		// Check WebRTC WebSocket signaling hub room connection status
		intervieweeConn := false
		interviewerConn := false
		GlobalSignalingHub.Mutex.RLock()
		if room, exists := GlobalSignalingHub.Rooms[sessStrID]; exists {
			room.Mutex.RLock()
			if _, ok := room.Clients[s.IntervieweeID]; ok {
				intervieweeConn = true
			}
			if _, ok := room.Clients[s.InterviewerID]; ok {
				interviewerConn = true
			}
			room.Mutex.RUnlock()
		}
		GlobalSignalingHub.Mutex.RUnlock()

		qTitle := "General Assessment Benchmark"
		if s.CurrentQuestion != nil && s.CurrentQuestion.Title != "" {
			qTitle = s.CurrentQuestion.Title
		}

		tTitle := "System Design & Coding"
		if s.Track != nil && s.Track.Title != "" {
			tTitle = s.Track.Title
		}

		audioURL := fmt.Sprintf("/api/v1/interviews/sessions/%d/recording/stream", s.ID)

		item := VenueMonitorSessionItem{
			SessionID:            sessStrID,
			Status:               s.Status,
			TrackTitle:           tTitle,
			CurrentQuestionTitle: qTitle,
			StartedAt:            startPtr,
			ElapsedSeconds:       elapsedSecs,
			VenueName:            venueName,
			RoomNumber:           roomNum,
			Building:             building,
			Interviewee:          s.Interviewee,
			Interviewer:          s.Interviewer,
			IntervieweeConnected: intervieweeConn,
			InterviewerConnected: interviewerConn,
			AudioStreamURL:       audioURL,
		}
		resultItems = append(resultItems, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"count":    len(resultItems),
		"sessions": resultItems,
	})
}
