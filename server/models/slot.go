package models

import (
	"time"

	"gorm.io/gorm"
)

// SlotStatus represents the lifecycle state of an interview time slot
type SlotStatus string

const (
	SlotScheduled SlotStatus = "scheduled"
	SlotActive    SlotStatus = "active"
	SlotCompleted SlotStatus = "completed"
	SlotCancelled SlotStatus = "cancelled"
)

// InterviewSlot represents a scheduled interview session in a physical venue assigned to a faculty member
type InterviewSlot struct {
	ID           uint            `gorm:"primaryKey" json:"id"`
	VenueID      uint            `gorm:"not null;index" json:"venue_id" binding:"required"`
	Venue        *Venue          `gorm:"foreignKey:VenueID" json:"venue,omitempty"`
	FacultyID    uint            `gorm:"not null;index" json:"faculty_id" binding:"required"`
	Faculty      *User           `gorm:"foreignKey:FacultyID" json:"faculty,omitempty"`
	TrackID           *uint            `gorm:"index" json:"track_id,omitempty"` // Nullable: legacy/fallback domain constraint
	Track             *InterviewTrack  `gorm:"foreignKey:TrackID" json:"track,omitempty"`
	LevelID           *uint            `gorm:"index" json:"level_id,omitempty"` // Nullable: legacy/fallback difficulty tier constraint
	Level             *InterviewLevel  `gorm:"foreignKey:LevelID" json:"level,omitempty"`
	AllowedTracksJSON string           `gorm:"type:text" json:"allowed_tracks_json"` // JSON array e.g. "[1, 2, 3]"
	AllowedLevelsJSON string           `gorm:"type:text" json:"allowed_levels_json"` // JSON array e.g. "[10, 11, 12]"
	AllowedTrackIDs   []uint           `gorm:"-" json:"allowed_track_ids"`
	AllowedLevelIDs   []uint           `gorm:"-" json:"allowed_level_ids"`
	AllowedTracks     []InterviewTrack `gorm:"-" json:"allowed_tracks,omitempty"`
	AllowedLevels     []InterviewLevel `gorm:"-" json:"allowed_levels,omitempty"`
	SlotDate          string           `gorm:"size:20;not null;index" json:"slot_date" binding:"required"` // "YYYY-MM-DD"
	StartTime         string           `gorm:"size:10;not null" json:"start_time" binding:"required"`       // "09:00"
	EndTime           string           `gorm:"size:10;not null" json:"end_time" binding:"required"`         // "10:30"
	Capacity          int              `gorm:"not null;default:30" json:"capacity"`
	BookedCount       int              `gorm:"default:0" json:"booked_count"`
	PresentCount      int              `gorm:"default:0" json:"present_count"`
	Status            SlotStatus       `gorm:"size:30;default:'scheduled';index" json:"status"`
	Notes             string           `gorm:"type:text" json:"notes"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
	DeletedAt         gorm.DeletedAt   `gorm:"index" json:"-"`
}
