package controllers

import (
	"net/http"

	"server/database"

	"github.com/gin-gonic/gin"
)

// HealthCheck returns the server status and database connectivity status
func HealthCheck(c *gin.Context) {
	dbStatus := "connected"
	if database.DB != nil {
		sqlDB, err := database.DB.DB()
		if err != nil || sqlDB.Ping() != nil {
			dbStatus = "disconnected"
		}
	} else {
		dbStatus = "disconnected"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"message":  "Server is up and running!",
		"database": dbStatus,
	})
}
