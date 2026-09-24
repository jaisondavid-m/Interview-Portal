package models

import (
	"time"

	"gorm.io/gorm"
)

// LabExperimentUnlock records whether an experiment is released/unlocked for a specific section & course by faculty
type LabExperimentUnlock struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	CourseID     uint           `gorm:"not null;index" json:"course_id"`
	Course       LabCourse      `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	ExperimentID uint           `gorm:"not null;index" json:"experiment_id"`
	Experiment   LabExperiment  `gorm:"foreignKey:ExperimentID" json:"experiment,omitempty"`
	Section             string         `gorm:"size:50;not null;index" json:"section"` // e.g. CSE-A, AI&DS-B, or ALL
	StudentID           *uint          `gorm:"index" json:"student_id,omitempty"`     // Specific student override if non-nil
	Student             *User          `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	FacultyID           uint           `gorm:"not null;index" json:"faculty_id"`
	Faculty             User           `gorm:"foreignKey:FacultyID" json:"faculty,omitempty"`
	IsUnlocked          bool           `gorm:"default:false;not null" json:"is_unlocked"`
	RequiresPrerequisite bool          `gorm:"default:false" json:"requires_prerequisite"`
	BypassPrerequisite   bool          `gorm:"default:false" json:"bypass_prerequisite"`
	StartsAt            *time.Time     `json:"starts_at,omitempty"` // Window start datetime
	EndsAt              *time.Time     `json:"ends_at,omitempty"`   // Window end datetime
	MaxAttempts         int            `gorm:"default:0" json:"max_attempts"` // 0 = unlimited
	AllowLateSubmission bool           `gorm:"default:false" json:"allow_late_submission"`
	Notes               string         `gorm:"type:text" json:"notes,omitempty"`
	UnlockedAt          *time.Time     `json:"unlocked_at,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabExperimentUnlock) TableName() string {
	return "lab_experiment_unlocks"
}
