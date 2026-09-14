package models

import (
	"time"

	"gorm.io/gorm"
)

// InterviewRecording represents a full-session dual-speaker audio recording of an interview
type InterviewRecording struct {
	ID              uint              `gorm:"primaryKey" json:"id"`
	SessionID       uint              `gorm:"not null;uniqueIndex" json:"session_id"`
	Session         *InterviewSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	UploaderID      uint              `gorm:"not null;index" json:"uploader_id"`
	Uploader        *User             `gorm:"foreignKey:UploaderID" json:"uploader,omitempty"`
	FilePath        string            `gorm:"size:500;not null" json:"file_path"`
	FileName        string            `gorm:"size:255;not null" json:"file_name"`
	FileSize        int64             `gorm:"default:0" json:"file_size"` // bytes
	DurationSeconds int               `gorm:"default:0" json:"duration_seconds"`
	MimeType        string            `gorm:"size:100;default:'audio/webm'" json:"mime_type"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	DeletedAt       gorm.DeletedAt    `gorm:"index" json:"-"`
}
