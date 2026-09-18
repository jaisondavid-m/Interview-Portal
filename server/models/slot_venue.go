package models

import (
	"time"

	"gorm.io/gorm"
)

// SlotVenueAssignment represents a physical venue assigned to an interview slot with a dedicated faculty member
type SlotVenueAssignment struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	SlotID    uint           `gorm:"not null;index" json:"slot_id"`
	VenueID   uint           `gorm:"not null;index" json:"venue_id"`
	Venue     *Venue         `gorm:"foreignKey:VenueID" json:"venue,omitempty"`
	FacultyID uint           `gorm:"not null;index" json:"faculty_id"`
	Faculty   *User          `gorm:"foreignKey:FacultyID" json:"faculty,omitempty"`
	Capacity  int            `gorm:"not null;default:30" json:"capacity"`
	Status    string         `gorm:"size:30;default:'active';index" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
