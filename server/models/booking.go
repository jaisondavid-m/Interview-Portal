package models

import (
	"time"

	"gorm.io/gorm"
)

// AttendanceStatus represents the student's physical verification status at the venue
type AttendanceStatus string

const (
	AttendancePending AttendanceStatus = "pending"
	AttendancePresent AttendanceStatus = "present"
	AttendanceAbsent  AttendanceStatus = "absent"
	AttendanceLate    AttendanceStatus = "late"
)

// SlotBooking represents a student's reservation for an interview slot
type SlotBooking struct {
	ID                 uint             `gorm:"primaryKey" json:"id"`
	SlotID             uint             `gorm:"not null;index:idx_slot_student,unique" json:"slot_id"`
	Slot               *InterviewSlot   `gorm:"foreignKey:SlotID" json:"slot,omitempty"`
	StudentID          uint             `gorm:"not null;index:idx_slot_student,unique;index:idx_student_booking" json:"student_id"`
	Student            *User            `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	TrackID            uint             `gorm:"not null;index" json:"track_id"`
	Track              *InterviewTrack  `gorm:"foreignKey:TrackID" json:"track,omitempty"`
	LevelID            uint             `gorm:"default:0" json:"level_id"`
	Level              *InterviewLevel  `gorm:"foreignKey:LevelID" json:"level,omitempty"`
	AssignedVenueID    *uint            `gorm:"index" json:"assigned_venue_id,omitempty"`
	AssignedVenue      *Venue           `gorm:"foreignKey:AssignedVenueID" json:"assigned_venue,omitempty"`
	AssignedFacultyID  *uint            `gorm:"index" json:"assigned_faculty_id,omitempty"`
	AssignedFaculty    *User            `gorm:"foreignKey:AssignedFacultyID" json:"assigned_faculty,omitempty"`
	AllocationStatus   string           `gorm:"size:30;default:'pending_verification';index" json:"allocation_status"` // pending_verification, verified, cancelled
	Status             string           `gorm:"size:30;default:'booked';index" json:"status"`                            // booked, completed, cancelled
	AttendanceStatus   AttendanceStatus `gorm:"size:30;default:'pending';index" json:"attendance_status"`
	CanStartInterview  bool             `gorm:"default:false" json:"can_start_interview"`
	AttendanceMarkedAt *time.Time       `json:"attendance_marked_at"`
	AttendanceMarkedBy *uint            `json:"attendance_marked_by"`
	SessionID          *uint            `gorm:"index" json:"session_id,omitempty"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
	DeletedAt          gorm.DeletedAt   `gorm:"index" json:"-"`
}
