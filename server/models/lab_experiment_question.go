package models

import (
	"time"

	"gorm.io/gorm"
)

// LabExperimentQuestion represents a specific question variant under a Lab Experiment
type LabExperimentQuestion struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	ExperimentID       uint           `gorm:"not null;index" json:"experiment_id"`
	CourseID           uint           `gorm:"not null;index" json:"course_id"`
	QuestionCode       string         `gorm:"size:100;not null" json:"question_code"` // e.g. "VAR_A", "Q1.1"
	Title              string         `gorm:"size:255;not null" json:"title"`
	Aim                string         `gorm:"type:text;not null" json:"aim"`
	ReferenceAlgorithm string         `gorm:"type:text" json:"reference_algorithm"` // JSON array of reference algorithm steps
	SolutionCode       string         `gorm:"type:text" json:"solution_code"`       // Reference solution code for faculty
	Language           string         `gorm:"size:50;default:'python'" json:"language"`
	SampleTestCases    string         `gorm:"type:text" json:"sample_test_cases"` // JSON array of [{input, expected_output}]
	HiddenTestCases    string         `gorm:"type:text" json:"hidden_test_cases"` // JSON array of [{input, expected_output}]
	MaxMarks           int            `gorm:"default:10" json:"max_marks"`
	VivaQuestionsCount int            `gorm:"default:5" json:"viva_questions_count"` // Number of viva questions to draw for evaluation
	IsActive           bool           `gorm:"default:true" json:"is_active"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}
