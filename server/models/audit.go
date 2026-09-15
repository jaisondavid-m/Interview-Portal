package models

import (
	"time"
)

// AuditLog records every incoming HTTP request, method, query, payload, response, status code, and latency
type AuditLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       *uint     `gorm:"index" json:"user_id"`
	UserEmail    string    `gorm:"size:100;index" json:"user_email"`
	UserName     string    `gorm:"size:100" json:"user_name"`
	UserRole     string    `gorm:"size:50;index" json:"user_role"`
	Method       string    `gorm:"size:10;index;not null" json:"method"`
	Path         string    `gorm:"size:255;index;not null" json:"path"`
	Query        string    `gorm:"type:text" json:"query"`
	IPAddress    string    `gorm:"size:50" json:"ip_address"`
	UserAgent    string    `gorm:"size:255" json:"user_agent"`
	StatusCode   int       `gorm:"index;not null" json:"status_code"`
	LatencyMs    int64     `json:"latency_ms"`
	RequestBody  string    `gorm:"type:longtext" json:"request_body"`
	ResponseBody string    `gorm:"type:longtext" json:"response_body"`
	ErrorMessage string    `gorm:"type:text" json:"error_message"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}
