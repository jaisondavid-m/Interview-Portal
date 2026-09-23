package models

import (
	"time"

	"gorm.io/gorm"
)

// LabRecord tracks a student's full semester lab record status for a course
type LabRecord struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	StudentID        uint           `gorm:"not null;index" json:"student_id"`
	Student          User           `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	CourseID         uint           `gorm:"not null;index" json:"course_id"`
	Course           LabCourse      `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	OverallStatus    string         `gorm:"size:50;default:'IN_PROGRESS'" json:"overall_status"` // IN_PROGRESS, SUBMITTED_FOR_SEMESTER_REVIEW, SEMESTER_APPROVED
	TotalApproved    int            `gorm:"default:0" json:"total_approved"`
	TotalExperiments int            `gorm:"default:7" json:"total_experiments"`
	TotalMarks       int            `gorm:"default:0" json:"total_marks"`
	SignatureHash    string         `gorm:"size:255" json:"signature_hash"`
	ApprovedBy       *uint          `json:"approved_by,omitempty"`
	ApprovedAt       *time.Time     `json:"approved_at,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabRecord) TableName() string {
	return "lab_records"
}
