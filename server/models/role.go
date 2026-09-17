package models

import (
	"time"

	"gorm.io/gorm"
)

// Role represents a user role in the system (e.g. admin, student, developer, interviewer)
type Role struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:50;uniqueIndex;not null" json:"name" binding:"required"`
	DisplayName string         `gorm:"size:100;not null" json:"display_name" binding:"required"`
	Description string         `gorm:"size:255" json:"description"`
	IsSystem    bool           `gorm:"default:false" json:"is_system"` // System roles (admin, student, developer) cannot be deleted
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// AppPage represents an accessible page or route in the application catalog
type AppPage struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"size:100;uniqueIndex;not null" json:"key"` // e.g. "admin_users", "student_dashboard"
	Name        string    `gorm:"size:100;not null" json:"name"`
	Path        string    `gorm:"size:255;not null" json:"path"`
	Category    string    `gorm:"size:50;not null" json:"category"` // "Admin", "Developer", "Student"
	Description string    `gorm:"size:255" json:"description"`
	Icon        string    `gorm:"size:50" json:"icon"`
	OrderIndex  int       `gorm:"default:0" json:"order_index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RolePagePermission maps a Role to an AppPage with granted or restricted access
type RolePagePermission struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	RoleName  string    `gorm:"size:50;index;not null" json:"role_name"`
	PageKey   string    `gorm:"size:100;index;not null" json:"page_key"`
	CanAccess bool      `gorm:"default:true;not null" json:"can_access"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
