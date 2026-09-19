package models

import (
	"time"

	"gorm.io/gorm"
)

// Venue represents a physical examination or venue for mock interviews
type Venue struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:150;not null" json:"name" binding:"required"` // e.g. "TIFAC Core Venue 1"
	Building    string         `gorm:"size:100;not null" json:"building" binding:"required"` // e.g. "Main Block"
	RoomNumber  string         `gorm:"size:50;not null" json:"room_number" binding:"required"` // e.g. "MB-204"
	Capacity    int            `gorm:"not null;default:30" json:"capacity" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
