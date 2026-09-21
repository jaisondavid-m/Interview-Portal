package controllers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"server/database"
	"server/middlewares"
	"server/models"

	"github.com/gin-gonic/gin"
)

// UpdateRateLimitInput defines the request body for modifying rate limit parameters
type UpdateRateLimitInput struct {
	RequestsPerMinute *int   `json:"requests_per_minute"`
	BurstLimit        *int   `json:"burst_limit"`
	WindowSeconds     *int   `json:"window_seconds"`
	Enabled           *bool  `json:"enabled"`
	ActionOnExceed    *string `json:"action_on_exceed"` // "block" | "log_only"
}

// TestRateLimitInput defines input payload to run synthetic rate limiter tests
type TestRateLimitInput struct {
	Scope        string `json:"scope" binding:"required"` // "no_auth", "student", "faculty", "admin", "developer", "system"
	RequestCount int    `json:"request_count"`            // e.g. 50
}

// GetDeveloperRateLimitConfigs returns rate limit rules, Redis connection health, and telemetry stats
func GetDeveloperRateLimitConfigs(c *gin.Context) {
	var configs []models.RateLimitConfig
	if err := database.DB.Order("id asc").Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch rate limit configurations",
			"error":   err.Error(),
		})
		return
	}

	redisStatus := database.GetRedisStatus()

	totalBlocked := int64(0)
	if database.RDB != nil && database.RedisAvailable {
		ctx := context.Background()
		if val, err := database.RDB.Get(ctx, "rate_limit_stats:total_blocked").Result(); err == nil {
			if count, err := strconv.ParseInt(val, 10, 64); err == nil {
				totalBlocked = count
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"redis":         redisStatus,
		"configs":       configs,
		"total_blocked": totalBlocked,
	})
}

// UpdateDeveloperRateLimitConfig updates rate limit settings for a specific role/scope
func UpdateDeveloperRateLimitConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid configuration ID"})
		return
	}

	var input UpdateRateLimitInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid request payload", "error": err.Error()})
		return
	}

	var cfg models.RateLimitConfig
	if err := database.DB.First(&cfg, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Rate limit configuration not found"})
		return
	}

	if input.RequestsPerMinute != nil {
		if *input.RequestsPerMinute < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Requests per minute must be at least 1"})
			return
		}
		cfg.RequestsPerMinute = *input.RequestsPerMinute
	}

	if input.BurstLimit != nil {
		if *input.BurstLimit < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Burst limit cannot be negative"})
			return
		}
		cfg.BurstLimit = *input.BurstLimit
	}

	if input.WindowSeconds != nil {
		if *input.WindowSeconds < 5 {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Window duration must be at least 5 seconds"})
			return
		}
		cfg.WindowSeconds = *input.WindowSeconds
	}

	if input.Enabled != nil {
		cfg.Enabled = *input.Enabled
	}

	if input.ActionOnExceed != nil {
		action := *input.ActionOnExceed
		if action != "block" && action != "log_only" {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Action must be 'block' or 'log_only'"})
			return
		}
		cfg.ActionOnExceed = action
	}

	if err := database.DB.Save(&cfg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to update rate limit configuration"})
		return
	}

	// Invalidate Redis config cache for instant update
	middlewares.InvalidateRateLimitConfigCache(cfg.Scope)

	// Audit Log
	rawUserID, _ := c.Get("userID")
	if rawUserID != nil {
		userID := rawUserID.(uint)
		actionDetails := fmt.Sprintf("Updated rate limit rule for scope '%s': RPM=%d, Burst=%d, Action=%s, Enabled=%v",
			cfg.Scope, cfg.RequestsPerMinute, cfg.BurstLimit, cfg.ActionOnExceed, cfg.Enabled)
		auditLog := models.AuditLog{
			UserID:       &userID,
			Method:       c.Request.Method,
			Path:         c.Request.URL.Path,
			StatusCode:   200,
			IPAddress:    c.ClientIP(),
			UserAgent:    c.GetHeader("User-Agent"),
			ErrorMessage: actionDetails,
			CreatedAt:    time.Now(),
		}
		_ = database.DB.Create(&auditLog).Error
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Rate limit rule for scope '%s' updated successfully", cfg.Scope),
		"config":  cfg,
	})
}

// ResetDeveloperRateLimitCounters clears all active rate limit window keys from Redis
func ResetDeveloperRateLimitCounters(c *gin.Context) {
	if database.RDB == nil || !database.RedisAvailable {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "message": "Redis is currently offline or unreachable"})
		return
	}

	ctx := context.Background()
	keys, err := database.RDB.Keys(ctx, "rate_limit:*").Result()
	if err == nil && len(keys) > 0 {
		database.RDB.Del(ctx, keys...)
	}

	database.RDB.Set(ctx, "rate_limit_stats:total_blocked", 0, 0)

	// Invalidate all rate limit config caches
	scopes := []string{"no_auth", "student", "faculty", "admin", "developer", "system"}
	for _, s := range scopes {
		middlewares.InvalidateRateLimitConfigCache(s)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Successfully flushed all active rate limit counters and configuration caches",
	})
}

// TestDeveloperRateLimit simulates request bursts to test rate limiting
func TestDeveloperRateLimit(c *gin.Context) {
	var input TestRateLimitInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Scope is required"})
		return
	}

	reqCount := input.RequestCount
	if reqCount <= 0 {
		reqCount = 20
	}
	if reqCount > 500 {
		reqCount = 500
	}

	var cfg models.RateLimitConfig
	if err := database.DB.Where("scope = ?", input.Scope).First(&cfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Rate limit scope configuration not found"})
		return
	}

	maxAllowed := cfg.RequestsPerMinute + cfg.BurstLimit
	allowed := 0
	blocked := 0

	for i := 1; i <= reqCount; i++ {
		if i <= maxAllowed && cfg.Enabled {
			allowed++
		} else if cfg.Enabled {
			blocked++
		} else {
			allowed++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"scope":           cfg.Scope,
		"simulated_count": reqCount,
		"max_limit":       maxAllowed,
		"allowed_count":   allowed,
		"blocked_count":   blocked,
		"action_on_exceed": cfg.ActionOnExceed,
		"message":         fmt.Sprintf("Simulated %d requests for %s scope: %d allowed, %d blocked (%s mode)", reqCount, cfg.Scope, allowed, blocked, cfg.ActionOnExceed),
	})
}
