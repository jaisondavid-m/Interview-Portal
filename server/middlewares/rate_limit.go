package middlewares

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitMiddleware enforces dynamic sliding-window rate limits backed by Redis
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting for static options preflight requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Determine user authentication scope & identifier
		rawUserID, loggedIn := c.Get("userID")
		rawRole, _ := c.Get("userRole")

		scope := "no_auth"
		identifier := c.ClientIP()

		if loggedIn && rawUserID != nil {
			userRoleStr := strings.ToLower(fmt.Sprintf("%v", rawRole))
			if userRoleStr != "" {
				scope = userRoleStr
			} else {
				scope = "student"
			}
			identifier = fmt.Sprintf("user_%v", rawUserID)
		}

		// Fetch Rate Limit Config for this scope (with caching)
		cfg, err := getRateLimitConfig(scope)
		if err != nil || cfg == nil || !cfg.Enabled {
			c.Next()
			return
		}

		// If Redis is offline or unavailable, fail open gracefully
		if database.RDB == nil || !database.RedisAvailable {
			c.Next()
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 1*time.Second)
		defer cancel()

		now := time.Now()
		nowUnix := now.Unix()
		windowSecs := int64(cfg.WindowSeconds)
		if windowSecs <= 0 {
			windowSecs = 60
		}

		maxLimit := cfg.RequestsPerMinute + cfg.BurstLimit
		if maxLimit <= 0 {
			maxLimit = 60
		}

		key := fmt.Sprintf("rate_limit:%s:%s", scope, identifier)
		clearBefore := nowUnix - windowSecs

		// Execute sliding window algorithm using Redis Pipeline
		pipe := database.RDB.Pipeline()
		pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", clearBefore))
		cardCmd := pipe.ZCard(ctx, key)
		_, err = pipe.Exec(ctx)

		if err != nil && err != redis.Nil {
			log.Printf("[RateLimit Warning] Redis error on scope %s: %v", scope, err)
			c.Next()
			return
		}

		currentCount := int(cardCmd.Val())

		// Set Standard Rate Limiting Headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(maxLimit))
		remaining := maxLimit - currentCount
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(nowUnix+windowSecs, 10))

		// Check if request limit exceeded
		if currentCount >= maxLimit {
			retryAfter := int(windowSecs)
			c.Header("Retry-After", strconv.Itoa(retryAfter))

			// Track blocked request in Redis stats
			database.RDB.Incr(ctx, "rate_limit_stats:total_blocked")

			if strings.EqualFold(cfg.ActionOnExceed, "block") {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"status":      "error",
					"code":        429,
					"message":     fmt.Sprintf("Rate limit exceeded for %s scope. Max %d req/min allowed.", scope, maxLimit),
					"scope":       scope,
					"retry_after": retryAfter,
				})
				c.Abort()
				return
			}
		}

		// Record current request timestamp in sliding window
		reqID := fmt.Sprintf("%d_%d", now.UnixNano(), time.Now().Nanosecond())
		pipeAdd := database.RDB.Pipeline()
		pipeAdd.ZAdd(ctx, key, redis.Z{Score: float64(nowUnix), Member: reqID})
		pipeAdd.Expire(ctx, key, time.Duration(windowSecs*2)*time.Second)
		_, _ = pipeAdd.Exec(ctx)

		c.Next()
	}
}

// getRateLimitConfig retrieves rule config from Redis cache or MySQL fallback
func getRateLimitConfig(scope string) (*models.RateLimitConfig, error) {
	cacheKey := fmt.Sprintf("rate_limit_cfg:%s", scope)
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	if database.RDB != nil && database.RedisAvailable {
		if val, err := database.RDB.Get(ctx, cacheKey).Result(); err == nil && val != "" {
			var cfg models.RateLimitConfig
			if json.Unmarshal([]byte(val), &cfg) == nil {
				return &cfg, nil
			}
		}
	}

	// Database Fallback
	var cfg models.RateLimitConfig
	err := database.DB.Where("scope = ?", scope).First(&cfg).Error
	if err != nil {
		return nil, err
	}

	// Write to Redis cache with 5-minute TTL
	if database.RDB != nil && database.RedisAvailable {
		if data, err := json.Marshal(cfg); err == nil {
			_ = database.RDB.Set(ctx, cacheKey, string(data), 5*time.Minute).Err()
		}
	}

	return &cfg, nil
}

// InvalidateRateLimitConfigCache clears cached config for a scope
func InvalidateRateLimitConfigCache(scope string) {
	if database.RDB != nil && database.RedisAvailable {
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()
		_ = database.RDB.Del(ctx, fmt.Sprintf("rate_limit_cfg:%s", scope)).Err()
	}
}
