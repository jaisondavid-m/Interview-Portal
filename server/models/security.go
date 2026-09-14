package models

import (
	"time"

	"gorm.io/gorm"
)

// SessionSecurityReport tracks student credential solicitation or security incident reports
type SessionSecurityReport struct {
	ID               uint              `gorm:"primaryKey" json:"id"`
	SessionID        uint              `gorm:"not null;index" json:"session_id"`
	Session          *InterviewSession `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	ReporterID       uint              `gorm:"not null;index" json:"reporter_id"`
	Reporter         *User             `gorm:"foreignKey:ReporterID" json:"reporter,omitempty"`
	ReportedUserID   uint              `gorm:"not null;index" json:"reported_user_id"`
	ReportedUser     *User             `gorm:"foreignKey:ReportedUserID" json:"reported_user,omitempty"`
	AskedCredentials bool              `gorm:"not null;default:false" json:"asked_credentials"`
	IncidentType     string            `gorm:"size:100;default:'credential_solicitation'" json:"incident_type"`
	Details          string            `gorm:"type:text" json:"details"`
	Status           string            `gorm:"size:50;default:'pending';index" json:"status"` // "pending", "reviewed", "dismissed"
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
	DeletedAt        gorm.DeletedAt    `gorm:"index" json:"-"`
}
