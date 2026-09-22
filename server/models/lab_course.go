package models

import (
	"time"

	"gorm.io/gorm"
)

// LabCourse represents an academic laboratory course (e.g., 22AI304 PPL Lab)
type LabCourse struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	CourseCode       string         `gorm:"size:50;not null;index" json:"course_code"` // e.g. 22AI304
	Title            string         `gorm:"size:255;not null" json:"title"`           // e.g. Principles of Programming Laboratory
	Department       string         `gorm:"size:150;not null" json:"department"`      // e.g. Artificial Intelligence and Data Science
	Degree           string         `gorm:"size:50;default:'B.Tech'" json:"degree"`
	Semester         string         `gorm:"size:50;not null" json:"semester"`         // e.g. Semester III
	AcademicYear     string         `gorm:"size:50;not null" json:"academic_year"`    // e.g. 2025-2026
	TotalExperiments int            `gorm:"default:7" json:"total_experiments"`
	Description      string         `gorm:"type:text" json:"description"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}
