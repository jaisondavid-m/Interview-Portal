package models

import (
	"time"

	"gorm.io/gorm"
)

// InterviewMode represents the type of interview assessment
type InterviewMode string

const (
	ModeCoding     InterviewMode = "coding"
	ModeVerbalQA   InterviewMode = "verbal_qa"
	ModeMCQ        InterviewMode = "mcq"
	ModeDiscussion InterviewMode = "discussion"
)

// InterviewTrack represents an interview domain / topic (e.g., DSA, System Design)
type InterviewTrack struct {
	ID          uint             `gorm:"primaryKey" json:"id"`
	Title       string           `gorm:"size:150;not null" json:"title" binding:"required"`
	Slug        string           `gorm:"size:150;uniqueIndex;not null" json:"slug"`
	Category    string           `gorm:"size:100;default:'Technical'" json:"category"`
	Icon        string           `gorm:"size:50;default:'Code'" json:"icon"`
	Description string           `gorm:"type:text" json:"description"`
	Levels      []InterviewLevel `gorm:"foreignKey:TrackID;constraint:OnDelete:CASCADE" json:"levels,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
	DeletedAt   gorm.DeletedAt   `gorm:"index" json:"-"`
}

// InterviewLevel represents a difficulty tier within a track (e.g. Level 1, Level 2)
type InterviewLevel struct {
	ID          uint                `gorm:"primaryKey" json:"id"`
	TrackID     uint                `gorm:"not null;index" json:"track_id" binding:"required"`
	LevelNumber int                 `gorm:"not null" json:"level_number" binding:"required"`
	Name        string              `gorm:"size:150;not null" json:"name" binding:"required"`
	Description string              `gorm:"type:text" json:"description"`
	Mode        InterviewMode       `gorm:"size:50;default:'coding';not null" json:"mode" binding:"required"`
	DurationMin int                 `gorm:"default:45" json:"duration_minutes"`
	Questions   []InterviewQuestion `gorm:"foreignKey:LevelID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	DeletedAt   gorm.DeletedAt      `gorm:"index" json:"-"`
}

// InterviewQuestion represents an assessment question tailored to the level mode
type InterviewQuestion struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	LevelID     uint           `gorm:"not null;index" json:"level_id" binding:"required"`
	Title       string         `gorm:"size:255;not null" json:"title" binding:"required"`
	Prompt      string         `gorm:"type:text;not null" json:"prompt" binding:"required"`
	Difficulty  string         `gorm:"size:50;default:'Medium'" json:"difficulty"`
	Type        InterviewMode  `gorm:"size:50;not null" json:"type"`
	PayloadJSON string         `gorm:"type:longtext" json:"payload_json"` // Stores mode-specific configuration in JSON
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// MatchmakingQueueEntry represents a student waiting in queue to be paired
type MatchmakingQueueEntry struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	UserID           uint           `gorm:"not null;index" json:"user_id"`
	User             *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TrackID          uint           `gorm:"not null;index" json:"track_id"`
	Track            *InterviewTrack `gorm:"foreignKey:TrackID" json:"track,omitempty"`
	LevelID          uint           `gorm:"default:0" json:"level_id"`
	Status           string         `gorm:"size:50;default:'waiting';index" json:"status"` // waiting, matched, cancelled
	MatchedSessionID uint           `gorm:"default:0" json:"matched_session_id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// InterviewSession represents a live peer-to-peer interview room between two students
type InterviewSession struct {
	ID                uint               `gorm:"primaryKey" json:"id"`
	TrackID           uint               `gorm:"not null;index" json:"track_id"`
	Track             *InterviewTrack    `gorm:"foreignKey:TrackID" json:"track,omitempty"`
	LevelID           uint               `gorm:"default:0" json:"level_id"`
	Level             *InterviewLevel    `gorm:"foreignKey:LevelID" json:"level,omitempty"`
	InterviewerID     uint               `gorm:"not null;index" json:"interviewer_id"`
	Interviewer       *User              `gorm:"foreignKey:InterviewerID" json:"interviewer,omitempty"`
	IntervieweeID     uint               `gorm:"not null;index" json:"interviewee_id"`
	Interviewee       *User              `gorm:"foreignKey:IntervieweeID" json:"interviewee,omitempty"`
	Status            string             `gorm:"size:50;default:'in_progress';index" json:"status"` // in_progress, completed, cancelled
	Round             int                `gorm:"default:1" json:"round"`                            // 1 = Round 1 (Student A interviewing), 2 = Round 2 (Student B interviewing)
	CurrentQuestionID uint               `gorm:"default:0;index" json:"current_question_id"`
	CurrentQuestion   *InterviewQuestion `gorm:"foreignKey:CurrentQuestionID" json:"current_question,omitempty"`
	Round1QuestionID  uint               `gorm:"default:0" json:"round1_question_id"`
	Round2QuestionID  uint               `gorm:"default:0" json:"round2_question_id"`
	CandidateCode     string             `gorm:"type:longtext" json:"candidate_code"`
	CandidateLang     string             `gorm:"size:50;default:'javascript'" json:"candidate_lang"`
	RolesSwitched     bool               `gorm:"default:false" json:"roles_switched"`
	SwitchCount       int                `gorm:"default:0" json:"switch_count"` // Strictly 0 or 1 (max 1 one-time switch)
	CurrentQIndex     int                `gorm:"default:0" json:"current_question_index"`
	Notes             string             `gorm:"type:text" json:"notes"`
	StartedAt         time.Time          `json:"started_at"`
	EndedAt           *time.Time         `json:"ended_at"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	DeletedAt         gorm.DeletedAt     `gorm:"index" json:"-"`
}

