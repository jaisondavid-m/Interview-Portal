package models

import (
	"time"

	"gorm.io/gorm"
)

// LabSubmission represents a student's code submission and assessment for a specific experiment
type LabSubmission struct {
	ID                 uint                   `gorm:"primaryKey" json:"id"`
	StudentID          uint                   `gorm:"not null;index" json:"student_id"`
	Student            User                   `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	ExperimentID       uint                   `gorm:"not null;index" json:"experiment_id"`
	Experiment         LabExperiment          `gorm:"foreignKey:ExperimentID" json:"experiment,omitempty"`
	QuestionID         uint                   `gorm:"index" json:"question_id"`
	Question           *LabExperimentQuestion `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
	StudentProcedure   string                 `gorm:"type:text" json:"student_procedure"` // JSON array of student's step-by-step algorithm
	SubmittedCode      string                 `gorm:"type:text;not null" json:"submitted_code"`
	Language           string                 `gorm:"size:50;not null" json:"language"`
	ExecutionOutput    string                 `gorm:"type:text" json:"execution_output"`
	PassCount          int                    `gorm:"default:0" json:"pass_count"`
	TotalTestCases     int                    `gorm:"default:0" json:"total_test_cases"`
	Status             string                 `gorm:"size:50;default:'DRAFT'" json:"status"` // DRAFT, TEST_PASSED, SUBMITTED_FOR_VERIFICATION, APPROVED, REVISION_REQUIRED
	CodeMarks          int                    `gorm:"default:0" json:"code_marks"`
	VivaMarks          int                    `gorm:"default:0" json:"viva_marks"`
	Marks              int                    `gorm:"default:0" json:"marks"` // Total Marks (CodeMarks + VivaMarks)
	VivaQuestionsAsked string                 `gorm:"type:text" json:"viva_questions_asked"` // JSON array of drawn viva questions and answers
	FacultyNotes       string                 `gorm:"type:text" json:"faculty_notes"`
	VerifiedBy         *uint                  `json:"verified_by,omitempty"`
	VerifiedAt         *time.Time             `json:"verified_at,omitempty"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
	DeletedAt          gorm.DeletedAt         `gorm:"index" json:"-"`
}
