package models

import (
	"time"

	"gorm.io/gorm"
)

// LabVivaQuestion represents an oral viva question with reference answer for a question variant
type LabVivaQuestion struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	QuestionID   uint           `gorm:"not null;index" json:"question_id"`   // FK to LabExperimentQuestion
	ExperimentID uint           `gorm:"not null;index" json:"experiment_id"` // FK to LabExperiment
	Question     string         `gorm:"type:text;not null" json:"question"`  // Question prompt
	Answer       string         `gorm:"type:text;not null" json:"answer"`    // Reference answer for faculty
	OrderIndex   int            `gorm:"default:0" json:"order_index"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabVivaQuestion) TableName() string {
	return "lab_viva_questions"
}
