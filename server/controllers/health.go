package controllers

import (
	"net/http"
	"os"

	"server/config"
	"server/database"

	"github.com/gin-gonic/gin"
)

// HealthCheck returns the server status, database connectivity status, and color/version
func HealthCheck(c *gin.Context) {
	dbStatus := "connected"
	isHealthy := true

	if database.DB != nil {
		sqlDB, err := database.DB.DB()
		if err != nil || sqlDB.Ping() != nil {
			dbStatus = "disconnected"
			isHealthy = false
		}
	} else {
		dbStatus = "disconnected"
		isHealthy = false
	}

	appColor := "blue"
	appVersion := "v1.0.0"
	if config.AppConfig != nil {
		if config.AppConfig.AppColor != "" {
			appColor = config.AppConfig.AppColor
		}
		if config.AppConfig.AppVersion != "" {
			appVersion = config.AppConfig.AppVersion
		}
	} else {
		if val := os.Getenv("APP_COLOR"); val != "" {
			appColor = val
		}
		if val := os.Getenv("APP_VERSION"); val != "" {
			appVersion = val
		}
	}

	statusCode := http.StatusOK
	if !isHealthy {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"status":   "success",
		"message":  "Server is up and running!",
		"database": dbStatus,
		"version":  appColor,
		"release":  appVersion,
	})
}

// VersionCheck returns the active deployment color and semantic release version
func VersionCheck(c *gin.Context) {
	appColor := "blue"
	appVersion := "v1.0.0"

	if config.AppConfig != nil {
		if config.AppConfig.AppColor != "" {
			appColor = config.AppConfig.AppColor
		}
		if config.AppConfig.AppVersion != "" {
			appVersion = config.AppConfig.AppVersion
		}
	} else {
		if val := os.Getenv("APP_COLOR"); val != "" {
			appColor = val
		}
		if val := os.Getenv("APP_VERSION"); val != "" {
			appVersion = val
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"version": appColor,
		"release": appVersion,
		"status":  "online",
	})
}

