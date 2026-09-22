package models

import (
	"time"

	"gorm.io/gorm"
)

// LabSubmission represents a student's code submission for a specific experiment
type LabSubmission struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	StudentID       uint           `gorm:"not null;index" json:"student_id"`
	Student         User           `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	ExperimentID    uint           `gorm:"not null;index" json:"experiment_id"`
	Experiment      LabExperiment  `gorm:"foreignKey:ExperimentID" json:"experiment,omitempty"`
	SubmittedCode   string         `gorm:"type:text;not null" json:"submitted_code"`
	Language        string         `gorm:"size:50;not null" json:"language"`
	ExecutionOutput string         `gorm:"type:text" json:"execution_output"`
	PassCount       int            `gorm:"default:0" json:"pass_count"`
	TotalTestCases  int            `gorm:"default:0" json:"total_test_cases"`
	Status          string         `gorm:"size:50;default:'PENDING_APPROVAL'" json:"status"` // PENDING_APPROVAL, APPROVED, REVISION_REQUIRED
	Marks           int            `gorm:"default:0" json:"marks"`
	FacultyNotes    string         `gorm:"type:text" json:"faculty_notes"`
	VerifiedBy      *uint          `json:"verified_by,omitempty"`
	VerifiedAt      *time.Time     `json:"verified_at,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}
