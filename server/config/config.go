package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Port              string
	GinMode           string
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBReplicaHosts    []string // List of replica hosts (e.g., ["localhost:3307", "localhost:3308"])
	DBMaxIdleConns    int
	DBMaxOpenConns    int
	DBConnMaxLifetime time.Duration
	JWTSecret         string
}

// AppConfig is the global configuration instance
var AppConfig *Config

// LoadConfig initializes application configuration from .env or environment variables
func LoadConfig() *Config {
	// Attempt to load .env from current directory or parent directory
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	replicaHostsStr := getEnv("DB_REPLICA_HOSTS", "")
	var replicaHosts []string
	if strings.TrimSpace(replicaHostsStr) != "" {
		for _, host := range strings.Split(replicaHostsStr, ",") {
			if h := strings.TrimSpace(host); h != "" {
				replicaHosts = append(replicaHosts, h)
			}
		}
	}

	maxIdle, _ := strconv.Atoi(getEnv("DB_MAX_IDLE_CONNS", "10"))
	maxOpen, _ := strconv.Atoi(getEnv("DB_MAX_OPEN_CONNS", "100"))

	AppConfig = &Config{
		Port:              getEnv("PORT", "8080"),
		GinMode:           getEnv("GIN_MODE", "debug"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "3306"),
		DBUser:            getEnv("DB_USER", "root"),
		DBPassword:        getEnv("DB_PASSWORD", "jaison"),
		DBName:            getEnv("DB_NAME", "mock_mate"),
		DBReplicaHosts:    replicaHosts,
		DBMaxIdleConns:    maxIdle,
		DBMaxOpenConns:    maxOpen,
		DBConnMaxLifetime: time.Hour,
		JWTSecret:         getEnv("JWT_SECRET", "mock_mate_secure_jwt_secret_2026"),
	}

	return AppConfig
}

// Helper function to get environment variable with fallback
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}
