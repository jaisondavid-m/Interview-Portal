package models

import (
	"time"

	"gorm.io/gorm"
)

// LabBatch represents a configured student cohort/batch with its linked academic department, semester, and year
type LabBatch struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"size:100;not null;index" json:"name"`
	Department   string         `gorm:"size:150;not null" json:"department"`
	Semester     string         `gorm:"size:50;not null" json:"semester"`
	AcademicYear string         `gorm:"size:50;not null" json:"academic_year"`
	Regulation   string         `gorm:"size:50;default:'2022'" json:"regulation"`
	StudentCount int64          `gorm:"-" json:"student_count"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LabBatch) TableName() string {
	return "lab_batches"
}
