package models

import (
	"time"

	"gorm.io/gorm"
)

// FeedbackQuestion represents a dynamic peer evaluation question configured by the Admin
type FeedbackQuestion struct {
	ID           uint                     `gorm:"primaryKey" json:"id"`
	QuestionText string                   `gorm:"type:text;not null" json:"question_text" binding:"required"`
	QuestionType string                   `gorm:"size:50;not null" json:"question_type" binding:"required"` // "mcq", "yes_no", "text"
	IsRequired   bool                     `gorm:"default:true" json:"is_required"`
	MaxMarks     float64                  `gorm:"default:0" json:"max_marks"` // Maximum marks / weightage for this question
	OrderIndex   int                      `gorm:"default:0" json:"order_index"`
	IsActive     bool                     `gorm:"default:true;index" json:"is_active"`
	Options      []FeedbackQuestionOption `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE" json:"options,omitempty"`
	CreatedAt    time.Time                `json:"created_at"`
	UpdatedAt    time.Time                `json:"updated_at"`
	DeletedAt    gorm.DeletedAt           `gorm:"index" json:"-"`
}

// FeedbackQuestionOption holds an individual selectable choice / rating for an MCQ question with its weightage marks
type FeedbackQuestionOption struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	QuestionID uint      `gorm:"not null;index" json:"question_id"`
	OptionText string    `gorm:"size:255;not null" json:"option_text" binding:"required"`
	Marks      float64   `gorm:"default:0" json:"marks"` // Marks awarded when this option is selected
	OrderIndex int       `gorm:"default:0" json:"order_index"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// InterviewFeedback represents the mutual peer feedback header submitted by one student evaluating another
type InterviewFeedback struct {
	ID              uint                        `gorm:"primaryKey" json:"id"`
	SessionID       uint                        `gorm:"not null;index" json:"session_id"`
	Session         *InterviewSession           `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	ReviewerID      uint                        `gorm:"not null;index" json:"reviewer_id"`
	Reviewer        *User                       `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
	RevieweeID      uint                        `gorm:"not null;index" json:"reviewee_id"`
	Reviewee        *User                       `gorm:"foreignKey:RevieweeID" json:"reviewee,omitempty"`
	TotalScore      float64                     `gorm:"default:0" json:"total_score"`
	MaxScore        float64                     `gorm:"default:0" json:"max_score"`
	ScorePercentage float64                     `gorm:"default:0" json:"score_percentage"`
	Responses       []InterviewFeedbackResponse `gorm:"foreignKey:FeedbackID;constraint:OnDelete:CASCADE" json:"responses,omitempty"`
	CreatedAt       time.Time                   `json:"created_at"`
	UpdatedAt       time.Time                   `json:"updated_at"`
	DeletedAt       gorm.DeletedAt              `gorm:"index" json:"-"`
}

// InterviewFeedbackResponse stores an individual answer given to a specific FeedbackQuestion
type InterviewFeedbackResponse struct {
	ID               uint                    `gorm:"primaryKey" json:"id"`
	FeedbackID       uint                    `gorm:"not null;index" json:"feedback_id"`
	QuestionID       uint                    `gorm:"not null;index" json:"question_id"`
	Question         *FeedbackQuestion       `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
	SelectedOptionID *uint                   `gorm:"index" json:"selected_option_id,omitempty"`
	SelectedOption   *FeedbackQuestionOption `gorm:"foreignKey:SelectedOptionID" json:"selected_option,omitempty"`
	AnswerValue      string                  `gorm:"type:text;not null" json:"answer_value"`
	AwardedMarks     float64                 `gorm:"default:0" json:"awarded_marks"`
	MaxMarks         float64                 `gorm:"default:0" json:"max_marks"`
	CreatedAt        time.Time               `json:"created_at"`
	UpdatedAt        time.Time               `json:"updated_at"`
}
