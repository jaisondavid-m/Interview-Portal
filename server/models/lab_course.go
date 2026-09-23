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
	Regulation       string         `gorm:"size:50;default:'2022'" json:"regulation"` // e.g. 2022, 2026
	AcademicYear     string         `gorm:"size:50" json:"academic_year"`            // Optional legacy fallback
	TotalExperiments int            `gorm:"default:7" json:"total_experiments"`
	EvaluationRubric string         `gorm:"type:text" json:"evaluation_rubric"` // JSON array of rubric criteria
	Description      string         `gorm:"type:text" json:"description"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabCourse) TableName() string {
	return "lab_courses"
}
