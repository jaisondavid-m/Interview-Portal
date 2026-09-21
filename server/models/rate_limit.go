package models

import (
	"time"

	"gorm.io/gorm"
)

// RateLimitConfig defines dynamic rate limiting parameters per role or unauthenticated scope
type RateLimitConfig struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	Scope             string         `gorm:"size:50;uniqueIndex;not null" json:"scope"` // "no_auth", "student", "faculty", "admin", "developer", "system"
	Name              string         `gorm:"size:100;not null" json:"name"`
	Description       string         `gorm:"type:text" json:"description"`
	RequestsPerMinute int            `gorm:"default:60;not null" json:"requests_per_minute"`
	BurstLimit        int            `gorm:"default:15;not null" json:"burst_limit"`
	WindowSeconds     int            `gorm:"default:60;not null" json:"window_seconds"`
	Enabled           bool           `gorm:"default:true;not null" json:"enabled"`
	ActionOnExceed    string         `gorm:"size:20;default:'block';not null" json:"action_on_exceed"` // "block" | "log_only"
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}
