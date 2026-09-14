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
	ModeWhiteboard InterviewMode = "whiteboard"
	ModeDiscussion InterviewMode = "discussion" // legacy alias for whiteboard
	ModeFrontend   InterviewMode = "frontend"
	ModeBackend    InterviewMode = "backend"
	ModeDatabase   InterviewMode = "database"
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
	DurationMin   int                 `gorm:"default:45" json:"duration_minutes"`
	QuestionCount int                 `gorm:"default:1" json:"question_count"`
	Questions     []InterviewQuestion `gorm:"foreignKey:LevelID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
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

	// Relational associations
	Detail      *InterviewQuestionDetail        `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE" json:"detail,omitempty"`
	Templates   []InterviewQuestionCodeTemplate `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE" json:"templates,omitempty"`
	TestCases   []InterviewQuestionTestCase     `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE" json:"test_cases,omitempty"`
	Hints       []InterviewQuestionHint         `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE" json:"hints,omitempty"`
	MCQOptions  []InterviewQuestionMCQOption    `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE" json:"mcq_options,omitempty"`

	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// InterviewQuestionDetail holds structured constraints, approaches, scenarios, and answers (1:1 with InterviewQuestion)
type InterviewQuestionDetail struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	QuestionID         uint      `gorm:"not null;uniqueIndex" json:"question_id"`
	Constraints        string    `gorm:"type:text" json:"constraints"`
	ExpectedApproach   string    `gorm:"type:text" json:"expected_approach"`
	ExpectedComplexity string    `gorm:"type:text" json:"expected_complexity"`
	IdealAnswer        string    `gorm:"type:text" json:"ideal_answer"`
	Scenario           string    `gorm:"type:text" json:"scenario"`
	CorrectOption      string    `gorm:"size:50" json:"correct_option"`
	Explanation        string    `gorm:"type:text" json:"explanation"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// InterviewQuestionCodeTemplate holds starter code for specific programming languages (1:N with InterviewQuestion)
type InterviewQuestionCodeTemplate struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	QuestionID  uint      `gorm:"not null;index" json:"question_id"`
	Language    string    `gorm:"size:50;not null;index" json:"language"` // "javascript", "python", "cpp", "java"
	StarterCode string    `gorm:"type:longtext;not null" json:"starter_code"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// InterviewQuestionTestCase holds individual open sample and hidden test cases (1:N with InterviewQuestion)
type InterviewQuestionTestCase struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	QuestionID     uint      `gorm:"not null;index" json:"question_id"`
	Input          string    `gorm:"type:text;not null" json:"input"`
	ExpectedOutput string    `gorm:"type:text;not null" json:"expected_output"`
	IsHidden       bool      `gorm:"default:false;index" json:"is_hidden"` // false = sample case, true = hidden verification case
	Explanation    string    `gorm:"type:text" json:"explanation"`
	OrderIndex     int       `gorm:"default:0" json:"order_index"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// InterviewQuestionHint holds hints, assessor tips, rubrics, talking points, and tradeoffs (1:N with InterviewQuestion)
type InterviewQuestionHint struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	QuestionID uint      `gorm:"not null;index" json:"question_id"`
	Type       string    `gorm:"size:50;default:'hint';index" json:"type"` // "hint", "interview_tip", "rubric", "talking_point", "tradeoff"
	Content    string    `gorm:"type:text;not null" json:"content"`
	OrderIndex int       `gorm:"default:0" json:"order_index"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// InterviewQuestionMCQOption holds multiple-choice options (1:N with InterviewQuestion)
type InterviewQuestionMCQOption struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	QuestionID uint      `gorm:"not null;index" json:"question_id"`
	OptionKey  string    `gorm:"size:10;not null" json:"option_key"` // "A", "B", "C", "D"
	OptionText string    `gorm:"type:text;not null" json:"option_text"`
	IsCorrect  bool      `gorm:"default:false" json:"is_correct"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
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
	CandidateCode        string             `gorm:"type:longtext" json:"candidate_code"`
	CandidateLang        string             `gorm:"size:50;default:'javascript'" json:"candidate_lang"`
	CandidateWhiteboard  string             `gorm:"type:longtext" json:"candidate_whiteboard"`
	LastExecutionJSON    string             `gorm:"type:longtext" json:"last_execution_json"`
	LastExecutionType    string             `gorm:"size:50" json:"last_execution_type"`       // "run" | "submit"
	LastExecutionVerdict string             `gorm:"size:100" json:"last_execution_verdict"`   // "Accepted", "Wrong Answer", "All Sample Cases Passed"
	LastExecutionPassed  int                `gorm:"default:0" json:"last_execution_passed"`
	LastExecutionTotal   int                `gorm:"default:0" json:"last_execution_total"`
	LastExecutedAt       *time.Time         `json:"last_executed_at"`
	RolesSwitched        bool               `gorm:"default:false" json:"roles_switched"`
	SwitchCount          int                `gorm:"default:0" json:"switch_count"` // Strictly 0 or 1 (max 1 one-time switch)
	SwitchRequestedBy    uint               `gorm:"default:0" json:"switch_requested_by"` // UserID who initiated the role swap request
	EndRequestedBy       uint               `gorm:"default:0" json:"end_requested_by"`    // UserID who initiated the end interview request
	CurrentQIndex        int                `gorm:"default:0" json:"current_question_index"`
	Notes                string             `gorm:"type:text" json:"notes"`
	StartedAt            time.Time          `json:"started_at"`
	EndedAt              *time.Time         `json:"ended_at"`
	CreatedAt            time.Time          `json:"created_at"`
	UpdatedAt            time.Time          `json:"updated_at"`
	DeletedAt         gorm.DeletedAt     `gorm:"index" json:"-"`
}

