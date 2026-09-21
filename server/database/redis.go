package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RDB is the global Redis client instance
var RDB *redis.Client
var RedisAvailable bool = false

// RedisStatusInfo represents Redis connection health and performance telemetry
type RedisStatusInfo struct {
	Available    bool    `json:"available"`
	Host         string  `json:"host"`
	Port         string  `json:"port"`
	PingMs       float64 `json:"ping_ms"`
	Status       string  `json:"status"` // "connected" | "disconnected"
	ErrorMessage string  `json:"error_message,omitempty"`
	UsedMemory   string  `json:"used_memory,omitempty"`
	ClientsCount int     `json:"connected_clients,omitempty"`
}

// InitRedis connects to the Redis service for rate limiting and cache management
func InitRedis() {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	password := os.Getenv("REDIS_PASSWORD")
	dbStr := os.Getenv("REDIS_DB")
	dbNum := 0
	if val, err := strconv.Atoi(dbStr); err == nil {
		dbNum = val
	}

	addr := fmt.Sprintf("%s:%s", host, port)

	RDB = redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           dbNum,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
		PoolSize:     50,
		MinIdleConns: 5,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	start := time.Now()
	_, err := RDB.Ping(ctx).Result()
	if err != nil {
		log.Printf("[Redis Warning] Failed to connect to Redis at %s: %v. Rate limiter running in fail-open mode.", addr, err)
		RedisAvailable = false
	} else {
		latency := time.Since(start).Seconds() * 1000
		log.Printf("[Redis Success] Connected to Redis at %s (latency: %.2f ms)", addr, latency)
		RedisAvailable = true
	}
}

// GetRedisStatus returns live connection metrics and info from Redis
func GetRedisStatus() RedisStatusInfo {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	info := RedisStatusInfo{
		Host:      host,
		Port:      port,
		Available: false,
		Status:    "disconnected",
	}

	if RDB == nil {
		info.ErrorMessage = "Redis client not initialized"
		return info
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	start := time.Now()
	res, err := RDB.Ping(ctx).Result()
	if err != nil || res != "PONG" {
		RedisAvailable = false
		info.ErrorMessage = "Redis ping failed"
		if err != nil {
			info.ErrorMessage = err.Error()
		}
		return info
	}

	RedisAvailable = true
	info.Available = true
	info.Status = "connected"
	info.PingMs = float64(time.Since(start).Microseconds()) / 1000.0

	// Parse REDIS INFO memory and clients if possible
	if infoRaw, err := RDB.Info(ctx, "memory", "clients").Result(); err == nil {
		lines := strings.Split(infoRaw, "\r\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "used_memory_human:") {
				info.UsedMemory = strings.TrimPrefix(line, "used_memory_human:")
			}
			if strings.HasPrefix(line, "connected_clients:") {
				if c, err := strconv.Atoi(strings.TrimPrefix(line, "connected_clients:")); err == nil {
					info.ClientsCount = c
				}
			}
		}
	}

	return info
}
