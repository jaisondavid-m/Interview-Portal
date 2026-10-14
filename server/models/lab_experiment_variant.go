package models

import (
	"time"

	"gorm.io/gorm"
)

// LabExperimentVariant represents a variant group under a Lab Experiment (e.g., Variant A, Variant B)
type LabExperimentVariant struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ExperimentID uint           `gorm:"not null;index" json:"experiment_id"`
	CourseID     uint           `gorm:"not null;index" json:"course_id"`
	VariantCode  string         `gorm:"size:50;not null" json:"variant_code"` // e.g. "A", "B", "VAR_A"
	Title        string         `gorm:"size:255;not null" json:"title"`       // e.g. "Variant A"
	Description  string         `gorm:"type:text" json:"description"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabExperimentVariant) TableName() string {
	return "lab_experiment_variants"
}
