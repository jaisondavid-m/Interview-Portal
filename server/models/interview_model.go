package models

import (
	"time"

	"gorm.io/gorm"
)

// InterviewMode represents the type of interview assessment
type InterviewMode string

const (
	ModeCoding     InterviewMode = "coding"
	ModeVerbalQA   InterviewMode = "verbal_qa"
	ModeMCQ        InterviewMode = "mcq"
	ModeDiscussion InterviewMode = "discussion"
)

// InterviewTrack represents an interview domain / topic (e.g., DSA, System Design)
type InterviewTrack struct {
	ID          uint             `gorm:"primaryKey" json:"id"`
	Title       string           `gorm:"size:150;not null" json:"title" binding:"required"`
	Slug        string           `gorm:"size:150;uniqueIndex;not null" json:"slug"`
	Category    string           `gorm:"size:100;default:'Technical'" json:"category"`
	Icon        string           `gorm:"size:50;default:'Code'" json:"icon"`
	Description string           `gorm:"type:text" json:"description"`
	Levels      []InterviewLevel `gorm:"foreignKey:TrackID;constraint:OnDelete:CASCADE" json:"levels,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	DeletedAt   gorm.DeletedAt   `gorm:"index" json:"-"`
}

// InterviewLevel represents a difficulty tier within a track (e.g. Level 1, Level 2)
type InterviewLevel struct {
	ID          uint                `gorm:"primaryKey" json:"id"`
	TrackID     uint                `gorm:"not null;index" json:"track_id" binding:"required"`
	LevelNumber int                 `gorm:"not null" json:"level_number" binding:"required"`
	Name        string              `gorm:"size:150;not null" json:"name" binding:"required"`
	Description string              `gorm:"type:text" json:"description"`
	Mode        InterviewMode       `gorm:"size:50;default:'coding';not null" json:"mode" binding:"required"`
	DurationMin int                 `gorm:"default:45" json:"duration_minutes"`
	Questions   []InterviewQuestion `gorm:"foreignKey:LevelID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	DeletedAt   gorm.DeletedAt      `gorm:"index" json:"-"`
}

// InterviewQuestion represents an assessment question tailored to the level mode
type InterviewQuestion struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	LevelID     uint           `gorm:"not null;index" json:"level_id" binding:"required"`
	Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Prompt      string         `gorm:"type:text;not null" json:"prompt" binding:"required"`
	Difficulty  string         `gorm:"size:50;default:'Medium'" json:"difficulty"`
	Type        InterviewMode  `gorm:"size:50;not null" json:"type"`
	PayloadJSON string         `gorm:"type:longtext" json:"payload_json"` // Stores mode-specific configuration in JSON
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
