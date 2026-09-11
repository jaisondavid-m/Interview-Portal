package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user model in the system
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name" binding:"required"`
	Email     string         `gorm:"size:100;uniqueIndex;not null" json:"email" binding:"required,email"`
	Role      string         `gorm:"size:50;default:'user'" json:"role"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
