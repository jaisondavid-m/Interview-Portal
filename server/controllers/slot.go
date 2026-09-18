package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// SlotVenueInput represents a venue & faculty mapping within a slot
type SlotVenueInput struct {
	VenueID   uint `json:"venue_id"`
	FacultyID uint `json:"faculty_id"`
	Capacity  int  `json:"capacity"`
}

// CreateSlotInput represents the request payload for scheduling a new slot
type CreateSlotInput struct {
	SlotType              string           `json:"slot_type"`                // "physical" | "online"
	VenueID               *uint            `json:"venue_id"`                 // Optional/legacy fallback if venues array not provided
	FacultyID             *uint            `json:"faculty_id"`               // Optional/legacy fallback
	Venues                []SlotVenueInput `json:"venues"`                   // Multi-venue assignments (physical slots)
	PreventSameVenueMatch *bool            `json:"prevent_same_venue_match"` // Cross-venue matching
	TrackID               *uint            `json:"track_id"`
	LevelID               *uint            `json:"level_id"`
	AllowedTrackIDs       []uint           `json:"allowed_track_ids"`
	AllowedLevelIDs       []uint           `json:"allowed_level_ids"`
	SlotDate              string           `json:"slot_date" binding:"required"` // "YYYY-MM-DD"
	StartTime             string           `json:"start_time" binding:"required"` // "HH:MM" (e.g. "09:00")
	EndTime               string           `json:"end_time" binding:"required"`   // "HH:MM" (e.g. "10:30")
	Capacity              *int             `json:"capacity"`                      // Required for online slots, or auto-sum for physical
	Notes                 string           `json:"notes"`
}

// UpdateSlotInput represents the request payload for editing a slot
type UpdateSlotInput struct {
	SlotType              string             `json:"slot_type"`
	VenueID               *uint              `json:"venue_id"`
	FacultyID             *uint              `json:"faculty_id"`
	Venues                *[]SlotVenueInput  `json:"venues"`
	PreventSameVenueMatch *bool              `json:"prevent_same_venue_match"`
	AllocationsPublished  *bool              `json:"allocations_published"`
	TrackID               *uint              `json:"track_id"`
	LevelID               *uint              `json:"level_id"`
	AllowedTrackIDs       *[]uint            `json:"allowed_track_ids"`
	AllowedLevelIDs       *[]uint            `json:"allowed_level_ids"`
	SlotDate              string             `json:"slot_date"`
	StartTime             string             `json:"start_time"`
	EndTime               string             `json:"end_time"`
	Capacity              *int               `json:"capacity"`
	Status                *models.SlotStatus `json:"status"`
	Notes                 string             `json:"notes"`
}

// ParseSlotAllowedIDs extracts allowed track and level ID slices from JSON or legacy columns
func ParseSlotAllowedIDs(slot *models.InterviewSlot) {
	slot.AllowedTrackIDs = make([]uint, 0)
	slot.AllowedLevelIDs = make([]uint, 0)

	if strings.TrimSpace(slot.AllowedTracksJSON) != "" && slot.AllowedTracksJSON != "[]" {
		_ = json.Unmarshal([]byte(slot.AllowedTracksJSON), &slot.AllowedTrackIDs)
	} else if slot.TrackID != nil && *slot.TrackID > 0 {
		slot.AllowedTrackIDs = append(slot.AllowedTrackIDs, *slot.TrackID)
	}

	if strings.TrimSpace(slot.AllowedLevelsJSON) != "" && slot.AllowedLevelsJSON != "[]" {
		_ = json.Unmarshal([]byte(slot.AllowedLevelsJSON), &slot.AllowedLevelIDs)
	} else if slot.LevelID != nil && *slot.LevelID > 0 {
		slot.AllowedLevelIDs = append(slot.AllowedLevelIDs, *slot.LevelID)
	}
}

// PopulateSlotAllowedEntities attaches full Track and Level model lists to slots for rich UI display
func PopulateSlotAllowedEntities(slots []models.InterviewSlot) []models.InterviewSlot {
	if len(slots) == 0 {
		return slots
	}

	trackIDMap := make(map[uint]bool)
	levelIDMap := make(map[uint]bool)

	for i := range slots {
		ParseSlotAllowedIDs(&slots[i])
		for _, tid := range slots[i].AllowedTrackIDs {
			trackIDMap[tid] = true
		}
		for _, lid := range slots[i].AllowedLevelIDs {
			levelIDMap[lid] = true
		}
	}

	tracksById := make(map[uint]models.InterviewTrack)
	if len(trackIDMap) > 0 {
		var trackIDs []uint
		for tid := range trackIDMap {
			trackIDs = append(trackIDs, tid)
		}
		var tracks []models.InterviewTrack
		database.DB.Preload("Levels").Where("id IN ?", trackIDs).Find(&tracks)
		for _, t := range tracks {
			tracksById[t.ID] = t
		}
	}

	levelsById := make(map[uint]models.InterviewLevel)
	if len(levelIDMap) > 0 {
		var levelIDs []uint
		for lid := range levelIDMap {
			levelIDs = append(levelIDs, lid)
		}
		var levels []models.InterviewLevel
		database.DB.Where("id IN ?", levelIDs).Find(&levels)
		for _, l := range levels {
			levelsById[l.ID] = l
		}
	}

	for i := range slots {
		slots[i].AllowedTracks = make([]models.InterviewTrack, 0)
		for _, tid := range slots[i].AllowedTrackIDs {
			if t, ok := tracksById[tid]; ok {
				slots[i].AllowedTracks = append(slots[i].AllowedTracks, t)
			}
		}

		slots[i].AllowedLevels = make([]models.InterviewLevel, 0)
		for _, lid := range slots[i].AllowedLevelIDs {
			if l, ok := levelsById[lid]; ok {
				slots[i].AllowedLevels = append(slots[i].AllowedLevels, l)
			}
		}
	}

	return slots
}

// AdminGetSlots retrieves all interview slots with filters
func AdminGetSlots(c *gin.Context) {
	venueID := c.Query("venue_id")
	facultyID := c.Query("faculty_id")
	trackID := c.Query("track_id")
	levelID := strings.TrimSpace(c.Query("level_id"))
	dateStr := c.Query("date")
	status := c.Query("status")
	upcomingOnly := c.Query("upcoming") == "true"

	query := database.DB.Model(&models.InterviewSlot{}).
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level").
		Preload("Venues.Venue").
		Preload("Venues.Faculty")

	if venueID != "" && venueID != "all" {
		query = query.Where("id IN (SELECT slot_id FROM slot_venue_assignments WHERE venue_id = ?) OR venue_id = ?", venueID, venueID)
	}

	if facultyID != "" && facultyID != "all" {
		query = query.Where("id IN (SELECT slot_id FROM slot_venue_assignments WHERE faculty_id = ?) OR faculty_id = ?", facultyID, facultyID)
	}

	if trackID != "" && trackID != "all" {
		if tid, err := strconv.ParseUint(trackID, 10, 32); err == nil && tid > 0 {
			query = query.Where("(track_id = ? OR allowed_tracks_json LIKE ?)", uint(tid), fmt.Sprintf("%%%d%%", tid))
		}
	}

	if levelID != "" && levelID != "all" {
		if lid, err := strconv.ParseUint(levelID, 10, 32); err == nil && lid > 0 {
			query = query.Where("(level_id = ? OR allowed_levels_json LIKE ?)", uint(lid), fmt.Sprintf("%%%d%%", lid))
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

	// Enrich slots with allowed tracks and levels
	slots = PopulateSlotAllowedEntities(slots)

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

// AdminGetSlotDetail retrieves a single interview slot by ID
func AdminGetSlotDetail(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid slot ID"})
		return
	}

	var slot models.InterviewSlot
	if err := database.DB.
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level").
		Preload("Venues.Venue").
		Preload("Venues.Faculty").
		First(&slot, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Slot not found"})
		return
	}

	enriched := PopulateSlotAllowedEntities([]models.InterviewSlot{slot})
	if len(enriched) > 0 {
		slot = enriched[0]
	}

	var booked int64
	var present int64
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND status != 'cancelled'", slot.ID).Count(&booked)
	database.DB.Model(&models.SlotBooking{}).Where("slot_id = ? AND attendance_status = 'present'", slot.ID).Count(&present)
	slot.BookedCount = int(booked)
	slot.PresentCount = int(present)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   slot,
	})
}

// AdminCreateSlot creates a new interview time slot and assigns multiple venues with distinct faculty (or creates an online slot)
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

	slotType := "physical"
	if input.SlotType == "online" {
		slotType = "online"
	}

	// Process Allowed Tracks (Multi-select)
	allowedTracksJSON := ""
	var legacyTrackID *uint
	if len(input.AllowedTrackIDs) > 0 {
		b, _ := json.Marshal(input.AllowedTrackIDs)
		allowedTracksJSON = string(b)
		if len(input.AllowedTrackIDs) == 1 {
			legacyTrackID = &input.AllowedTrackIDs[0]
		}
	} else if input.TrackID != nil && *input.TrackID > 0 {
		legacyTrackID = input.TrackID
		b, _ := json.Marshal([]uint{*input.TrackID})
		allowedTracksJSON = string(b)
	}

	// Process Allowed Levels (Multi-select)
	allowedLevelsJSON := ""
	var legacyLevelID *uint
	if len(input.AllowedLevelIDs) > 0 {
		b, _ := json.Marshal(input.AllowedLevelIDs)
		allowedLevelsJSON = string(b)
		if len(input.AllowedLevelIDs) == 1 {
			legacyLevelID = &input.AllowedLevelIDs[0]
		}
	} else if input.LevelID != nil && *input.LevelID > 0 {
		legacyLevelID = input.LevelID
		b, _ := json.Marshal([]uint{*input.LevelID})
		allowedLevelsJSON = string(b)
	}

	if slotType == "online" {
		capacity := 50
		if input.Capacity != nil && *input.Capacity > 0 {
			capacity = *input.Capacity
		}

		slot := models.InterviewSlot{
			SlotType:              "online",
			VenueID:               0,
			FacultyID:             0,
			PreventSameVenueMatch: false,
			AllocationsPublished:  true, // Online slots have no physical rooms to hide
			TrackID:               legacyTrackID,
			LevelID:               legacyLevelID,
			AllowedTracksJSON:     allowedTracksJSON,
			AllowedLevelsJSON:     allowedLevelsJSON,
			SlotDate:              strings.TrimSpace(input.SlotDate),
			StartTime:             strings.TrimSpace(input.StartTime),
			EndTime:               strings.TrimSpace(input.EndTime),
			Capacity:              capacity,
			BookedCount:           0,
			PresentCount:          0,
			Status:                models.SlotScheduled,
			Notes:                 strings.TrimSpace(input.Notes),
		}

		if err := database.DB.Create(&slot).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to schedule online slot",
				"error":   err.Error(),
			})
			return
		}

		enriched := PopulateSlotAllowedEntities([]models.InterviewSlot{slot})
		if len(enriched) > 0 {
			slot = enriched[0]
		}

		c.JSON(http.StatusCreated, gin.H{
			"status":  "success",
			"message": "Online interview slot scheduled successfully",
			"data":    slot,
		})
		return
	}

	// Determine venues to assign (for physical slots)
	venuesToAssign := input.Venues
	if len(venuesToAssign) == 0 {
		// Fallback for single venue
		vID := uint(0)
		if input.VenueID != nil {
			vID = *input.VenueID
		}
		fID := uint(0)
		if input.FacultyID != nil {
			fID = *input.FacultyID
		}
		if vID == 0 || fID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "At least one examination venue and faculty member must be assigned for physical in-person slots"})
			return
		}
		capVal := 30
		if input.Capacity != nil && *input.Capacity > 0 {
			capVal = *input.Capacity
		}
		venuesToAssign = append(venuesToAssign, SlotVenueInput{
			VenueID:   vID,
			FacultyID: fID,
			Capacity:  capVal,
		})
	}

	// Validate distinct venues & distinct faculty members
	venueMap := make(map[uint]bool)
	facultyMap := make(map[uint]bool)
	totalCalculatedCapacity := 0

	for _, vInput := range venuesToAssign {
		if vInput.VenueID == 0 || vInput.FacultyID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Each assigned venue must have a valid venue and faculty invigilator"})
			return
		}

		if venueMap[vInput.VenueID] {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "The same venue cannot be added multiple times to the same time slot"})
			return
		}
		venueMap[vInput.VenueID] = true

		// Rule: Different faculty must be mapped to different venues in the same slot
		if facultyMap[vInput.FacultyID] {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Different venues in the same time slot must be assigned to different faculty invigilators (no duplicate faculty assignment in the same slot)"})
			return
		}
		facultyMap[vInput.FacultyID] = true

		var v models.Venue
		if err := database.DB.First(&v, vInput.VenueID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": fmt.Sprintf("Venue ID %d does not exist", vInput.VenueID)})
			return
		}

		var f models.User
		if err := database.DB.First(&f, vInput.FacultyID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": fmt.Sprintf("Faculty ID %d does not exist", vInput.FacultyID)})
			return
		}

		if vInput.Capacity <= 0 {
			vInput.Capacity = v.Capacity
		}
		totalCalculatedCapacity += vInput.Capacity
	}

	capacity := totalCalculatedCapacity
	if input.Capacity != nil && *input.Capacity > 0 {
		capacity = *input.Capacity
	}

	preventSameVenue := true
	if input.PreventSameVenueMatch != nil {
		preventSameVenue = *input.PreventSameVenueMatch
	}

	slot := models.InterviewSlot{
		SlotType:              "physical",
		VenueID:               venuesToAssign[0].VenueID,
		FacultyID:             venuesToAssign[0].FacultyID,
		PreventSameVenueMatch: preventSameVenue,
		AllocationsPublished:  false,
		TrackID:               legacyTrackID,
		LevelID:               legacyLevelID,
		AllowedTracksJSON:     allowedTracksJSON,
		AllowedLevelsJSON:     allowedLevelsJSON,
		SlotDate:              strings.TrimSpace(input.SlotDate),
		StartTime:             strings.TrimSpace(input.StartTime),
		EndTime:               strings.TrimSpace(input.EndTime),
		Capacity:              capacity,
		BookedCount:           0,
		PresentCount:          0,
		Status:                models.SlotScheduled,
		Notes:                 strings.TrimSpace(input.Notes),
	}

	if err := database.DB.Create(&slot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to schedule slot",
			"error":   err.Error(),
		})
		return
	}

	// Create venue assignments
	for _, vInput := range venuesToAssign {
		vCap := vInput.Capacity
		if vCap <= 0 {
			vCap = 30
		}
		assignment := models.SlotVenueAssignment{
			SlotID:    slot.ID,
			VenueID:   vInput.VenueID,
			FacultyID: vInput.FacultyID,
			Capacity:  vCap,
			Status:    "active",
		}
		database.DB.Create(&assignment)
	}

	// Load preloads for clean response
	database.DB.
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level").
		Preload("Venues.Venue").
		Preload("Venues.Faculty").
		First(&slot, slot.ID)
	enriched := PopulateSlotAllowedEntities([]models.InterviewSlot{slot})
	if len(enriched) > 0 {
		slot = enriched[0]
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Interview slot scheduled successfully",
		"data":    slot,
	})
}

// AdminUpdateSlot updates slot details, multi-venues, status, track/level, or faculty assignment
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
	if err := database.DB.Preload("Venues").First(&slot, uint(id)).Error; err != nil {
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

	// Handle slot type
	if input.SlotType != "" {
		slot.SlotType = input.SlotType
		if slot.SlotType == "online" {
			database.DB.Where("slot_id = ?", slot.ID).Delete(&models.SlotVenueAssignment{})
			slot.VenueID = 0
			slot.FacultyID = 0
			slot.AllocationsPublished = true
			slot.PreventSameVenueMatch = false
			if input.Capacity != nil && *input.Capacity > 0 {
				slot.Capacity = *input.Capacity
			}
		}
	}

	// Handle multi-venue update if provided (for physical slots)
	if slot.SlotType != "online" && input.Venues != nil && len(*input.Venues) > 0 {
		venueMap := make(map[uint]bool)
		facultyMap := make(map[uint]bool)
		totalCalculatedCapacity := 0

		for _, vInput := range *input.Venues {
			if vInput.VenueID == 0 || vInput.FacultyID == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Each assigned venue must have a valid venue and faculty invigilator"})
				return
			}
			if venueMap[vInput.VenueID] {
				c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "The same venue cannot be added multiple times to the same time slot"})
				return
			}
			venueMap[vInput.VenueID] = true

			// Rule: Unique faculty per venue in the same slot
			if facultyMap[vInput.FacultyID] {
				c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Different venues in the same time slot must be assigned to different faculty invigilators (no duplicate faculty assignment in the same slot)"})
				return
			}
			facultyMap[vInput.FacultyID] = true

			vCap := vInput.Capacity
			if vCap <= 0 {
				var v models.Venue
				if err := database.DB.First(&v, vInput.VenueID).Error; err == nil && v.Capacity > 0 {
					vCap = v.Capacity
				} else {
					vCap = 30
				}
			}
			totalCalculatedCapacity += vCap
		}

		// Delete existing assignments and recreate
		database.DB.Where("slot_id = ?", slot.ID).Delete(&models.SlotVenueAssignment{})
		for _, vInput := range *input.Venues {
			vCap := vInput.Capacity
			if vCap <= 0 {
				vCap = 30
			}
			assignment := models.SlotVenueAssignment{
				SlotID:    slot.ID,
				VenueID:   vInput.VenueID,
				FacultyID: vInput.FacultyID,
				Capacity:  vCap,
				Status:    "active",
			}
			database.DB.Create(&assignment)
		}

		slot.VenueID = (*input.Venues)[0].VenueID
		slot.FacultyID = (*input.Venues)[0].FacultyID
		if input.Capacity == nil {
			slot.Capacity = totalCalculatedCapacity
		}
	} else {
		if input.VenueID != nil {
			slot.VenueID = *input.VenueID
		}
		if input.FacultyID != nil {
			slot.FacultyID = *input.FacultyID
		}
	}

	if input.PreventSameVenueMatch != nil {
		slot.PreventSameVenueMatch = *input.PreventSameVenueMatch
	}

	if input.AllocationsPublished != nil {
		slot.AllocationsPublished = *input.AllocationsPublished
	}

	if input.AllowedTrackIDs != nil {
		if len(*input.AllowedTrackIDs) == 0 {
			slot.AllowedTracksJSON = ""
			slot.TrackID = nil
		} else {
			b, _ := json.Marshal(*input.AllowedTrackIDs)
			slot.AllowedTracksJSON = string(b)
			if len(*input.AllowedTrackIDs) == 1 {
				slot.TrackID = &(*input.AllowedTrackIDs)[0]
			} else {
				slot.TrackID = nil
			}
		}
	} else if input.TrackID != nil {
		if *input.TrackID == 0 {
			slot.TrackID = nil
			slot.AllowedTracksJSON = ""
		} else {
			slot.TrackID = input.TrackID
			b, _ := json.Marshal([]uint{*input.TrackID})
			slot.AllowedTracksJSON = string(b)
		}
	}

	if input.AllowedLevelIDs != nil {
		if len(*input.AllowedLevelIDs) == 0 {
			slot.AllowedLevelsJSON = ""
			slot.LevelID = nil
		} else {
			b, _ := json.Marshal(*input.AllowedLevelIDs)
			slot.AllowedLevelsJSON = string(b)
			if len(*input.AllowedLevelIDs) == 1 {
				slot.LevelID = &(*input.AllowedLevelIDs)[0]
			} else {
				slot.LevelID = nil
			}
		}
	} else if input.LevelID != nil {
		if *input.LevelID == 0 {
			slot.LevelID = nil
			slot.AllowedLevelsJSON = ""
		} else {
			slot.LevelID = input.LevelID
			b, _ := json.Marshal([]uint{*input.LevelID})
			slot.AllowedLevelsJSON = string(b)
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

	database.DB.
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level").
		Preload("Venues.Venue").
		Preload("Venues.Faculty").
		First(&slot, slot.ID)
	enriched := PopulateSlotAllowedEntities([]models.InterviewSlot{slot})
	if len(enriched) > 0 {
		slot = enriched[0]
	}

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

	database.DB.Where("slot_id = ?", slot.ID).Delete(&models.SlotVenueAssignment{})
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

// AdminGetSlotRoster retrieves the complete student roster for a specific slot with venue distribution
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
	if err := database.DB.
		Preload("Venue").
		Preload("Faculty").
		Preload("Track").
		Preload("Level").
		Preload("Venues.Venue").
		Preload("Venues.Faculty").
		First(&slot, uint(id)).Error; err != nil {
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
		Preload("Level").
		Preload("AssignedVenue").
		Preload("AssignedFaculty").
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

// AdminPublishSlotAllocations verifies and publishes venue assignments to all booked students
func AdminPublishSlotAllocations(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid slot ID"})
		return
	}

	var slot models.InterviewSlot
	if err := database.DB.First(&slot, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Slot not found"})
		return
	}

	slot.AllocationsPublished = true
	database.DB.Save(&slot)

	// Update all active bookings in this slot to verified allocation
	database.DB.Model(&models.SlotBooking{}).
		Where("slot_id = ? AND status != 'cancelled'", slot.ID).
		Update("allocation_status", "verified")

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Venue allocations verified and published to all booked students",
	})
}

// AdminReassignStudentVenue moves a student to a different venue in the same slot
func AdminReassignStudentVenue(c *gin.Context) {
	idParam := c.Param("id")
	slotID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid slot ID"})
		return
	}

	var req struct {
		BookingID uint `json:"booking_id" binding:"required"`
		VenueID   uint `json:"venue_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "booking_id and venue_id are required"})
		return
	}

	var booking models.SlotBooking
	if err := database.DB.Where("id = ? AND slot_id = ?", req.BookingID, uint(slotID)).First(&booking).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Booking not found for this slot"})
		return
	}

	// Find the corresponding assigned faculty for this venue in this slot
	var assignment models.SlotVenueAssignment
	var facultyID *uint
	if err := database.DB.Where("slot_id = ? AND venue_id = ?", uint(slotID), req.VenueID).First(&assignment).Error; err == nil {
		facultyID = &assignment.FacultyID
	} else {
		var slot models.InterviewSlot
		if err := database.DB.First(&slot, uint(slotID)).Error; err == nil && slot.VenueID == req.VenueID {
			facultyID = &slot.FacultyID
		}
	}

	booking.AssignedVenueID = &req.VenueID
	booking.AssignedFacultyID = facultyID
	if err := database.DB.Save(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to reassign venue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Student venue reassigned successfully",
		"data":    booking,
	})
}

// AdminAutoBalanceSlotVenues evenly balances students across all assigned venues in the slot
func AdminAutoBalanceSlotVenues(c *gin.Context) {
	idParam := c.Param("id")
	slotID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid slot ID"})
		return
	}

	var slot models.InterviewSlot
	if err := database.DB.Preload("Venues").First(&slot, uint(slotID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Slot not found"})
		return
	}

	venues := slot.Venues
	if len(venues) == 0 {
		if slot.VenueID > 0 {
			venues = append(venues, models.SlotVenueAssignment{
				SlotID:    slot.ID,
				VenueID:   slot.VenueID,
				FacultyID: slot.FacultyID,
				Capacity:  slot.Capacity,
			})
		}
	}

	if len(venues) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "No venues assigned to this slot to balance"})
		return
	}

	var bookings []models.SlotBooking
	database.DB.Where("slot_id = ? AND status != 'cancelled'", slot.ID).Order("id asc").Find(&bookings)

	if len(bookings) == 0 {
		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "No active bookings to balance"})
		return
	}

	// Round-robin distribution across available slot venues
	for i := range bookings {
		venueIndex := i % len(venues)
		targetVenue := venues[venueIndex]
		bookings[i].AssignedVenueID = &targetVenue.VenueID
		bookings[i].AssignedFacultyID = &targetVenue.FacultyID
		database.DB.Model(&bookings[i]).Updates(map[string]interface{}{
			"assigned_venue_id":   targetVenue.VenueID,
			"assigned_faculty_id": targetVenue.FacultyID,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Successfully auto-balanced %d student(s) across %d venue(s)", len(bookings), len(venues)),
	})
}

// AdminCancelBooking allows an administrator to cancel a student's booking for a slot
func AdminCancelBooking(c *gin.Context) {
	idParam := c.Param("id")
	bookingID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid booking ID"})
		return
	}

	var booking models.SlotBooking
	if err := database.DB.Preload("Student").Preload("Track").Preload("Level").First(&booking, uint(bookingID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Booking not found"})
		return
	}

	if booking.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Booking is already cancelled"})
		return
	}

	booking.Status = "cancelled"
	booking.CanStartInterview = false
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
		"message": "Student booking cancelled successfully",
		"data":    booking,
	})
}
