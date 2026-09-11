package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Port       string
	GinMode    string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
}

// AppConfig is the global configuration instance
var AppConfig *Config

// LoadConfig initializes application configuration from .env or environment variables
func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("[INFO] .env file not found or could not be loaded, using system environment variables and defaults")
	}

	AppConfig = &Config{
		Port:       getEnv("PORT", "8080"),
		GinMode:    getEnv("GIN_MODE", "debug"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", "jaison"),
		DBName:     getEnv("DB_NAME", "mock_mate"),
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
