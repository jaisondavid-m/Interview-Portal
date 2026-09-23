package models

import (
	"time"

	"gorm.io/gorm"
)

// LabQuestionAllocation tracks the deterministic random allocation of a question variant to a student
type LabQuestionAllocation struct {
	ID           uint                  `gorm:"primaryKey" json:"id"`
	StudentID    uint                  `gorm:"not null;index;uniqueIndex:idx_student_course_exp" json:"student_id"`
	CourseID     uint                  `gorm:"not null;index;uniqueIndex:idx_student_course_exp" json:"course_id"`
	ExperimentID uint                  `gorm:"not null;index;uniqueIndex:idx_student_course_exp" json:"experiment_id"`
	QuestionID   uint                  `gorm:"not null;index" json:"question_id"`
	Question     LabExperimentQuestion `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
	AllocatedAt  time.Time             `json:"allocated_at"`
	CreatedAt    time.Time             `json:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at"`
	DeletedAt    gorm.DeletedAt        `gorm:"index" json:"-"`
}
