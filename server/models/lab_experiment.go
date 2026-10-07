package models

import (
	"time"

	"gorm.io/gorm"
)

// LabExperiment represents an individual lab experiment (Ex 1 to 7)
type LabExperiment struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	CourseID        uint           `gorm:"not null;index" json:"course_id"`
	ExperimentNo    int            `gorm:"not null" json:"experiment_no"` // e.g. 1
	Title           string         `gorm:"size:255;not null" json:"title"`
	Aim             string         `gorm:"type:text;not null" json:"aim"`
	Procedure       string         `gorm:"type:text" json:"procedure"` // Step by step algorithm
	Language        string         `gorm:"size:50;default:'python'" json:"language"`
	StarterCode     string         `gorm:"type:text" json:"starter_code"`
	SampleTestCases string         `gorm:"type:text" json:"sample_test_cases"` // JSON array of [{input, expected_output}]
	HiddenTestCases string         `gorm:"type:text" json:"hidden_test_cases"` // JSON array of [{input, expected_output}]
	MaxMarks        int            `gorm:"default:100" json:"max_marks"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabExperiment) TableName() string {
	return "lab_experiments"
}
