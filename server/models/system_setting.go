package models

import (
	"time"
)

// SystemSetting represents dynamic system configurations, feature flags, and global settings
type SystemSetting struct {
	Key         string    `gorm:"primaryKey;size:100;not null" json:"key"` // e.g. "quick_login_enabled"
	Value       string    `gorm:"type:text;not null" json:"value"`         // e.g. "true" or "false"
	DisplayName string    `gorm:"size:150;not null" json:"display_name"`
	Category    string    `gorm:"size:100;default:'General'" json:"category"`
	Description string    `gorm:"size:255" json:"description"`
	UpdatedAt   time.Time `json:"updated_at"`
}
