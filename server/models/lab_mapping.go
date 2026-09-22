package models

import (
	"time"

	"gorm.io/gorm"
)

// LabMapping maps a Faculty (Lab Incharge) to a Lab Course, Section, and Semester
type LabMapping struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	CourseID     uint           `gorm:"not null;index" json:"course_id"`
	Course       LabCourse      `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	FacultyID    uint           `gorm:"not null;index" json:"faculty_id"`
	Faculty      User           `gorm:"foreignKey:FacultyID" json:"faculty,omitempty"`
	Section      string         `gorm:"size:50;not null;default:'ALL'" json:"section"` // e.g. CSE-A
	Semester     string         `gorm:"size:50;not null" json:"semester"`
	AcademicYear string         `gorm:"size:50;not null" json:"academic_year"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
