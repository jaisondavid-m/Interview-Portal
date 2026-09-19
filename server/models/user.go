package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User represents a student or admin user in the system
type User struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	Name             string         `gorm:"size:100;not null" json:"name" binding:"required"`
	Email            string         `gorm:"size:100;uniqueIndex;not null" json:"email" binding:"required,email"`
	RollNo           string         `gorm:"size:50;index" json:"roll_no"`
	Department       string         `gorm:"size:100" json:"department"`
	Password         string         `gorm:"size:255;not null" json:"-"`
	Role             string         `gorm:"size:20;default:'student';not null" json:"role"` // 'admin' or 'student'
	GoogleID         string         `gorm:"size:100;index" json:"google_id,omitempty"`
	AvatarURL        string         `gorm:"size:255" json:"avatar_url,omitempty"`
	AuthMethod       string         `gorm:"size:30;default:'any'" json:"auth_method"` // 'any' or 'google_only'
	ActiveToken      string         `gorm:"type:text" json:"-"`                         // Current active session JWT token for single-device enforcement
	LastLoginAt      *time.Time     `json:"last_login_at"`
	HasActiveSession bool           `gorm:"-" json:"has_active_session"` // Virtual field populated for UI
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// HashPassword hashes a raw password string using bcrypt
func HashPassword(rawPassword string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash compares a raw password with a bcrypt hash
func CheckPasswordHash(rawPassword, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(rawPassword))
	return err == nil
}
