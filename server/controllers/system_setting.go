package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// GetPublicQuickLoginStatus returns whether quick 1-click login is enabled without requiring authentication
func GetPublicQuickLoginStatus(c *gin.Context) {
	var setting models.SystemSetting
	if err := database.DB.Where("`key` = 'quick_login_enabled'").First(&setting).Error; err != nil {
		// Default to true if not found
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"quick_login_enabled": true,
			},
		})
		return
	}

	val := strings.ToLower(strings.TrimSpace(setting.Value))
	isEnabled := val == "true" || val == "1" || val == "yes" || val == "on"

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"quick_login_enabled": isEnabled,
		},
	})
}

// GetPublicSystemSettings returns safe public system configurations
func GetPublicSystemSettings(c *gin.Context) {
	var setting models.SystemSetting
	isEnabled := true
	if err := database.DB.Where("`key` = 'quick_login_enabled'").First(&setting).Error; err == nil {
		val := strings.ToLower(strings.TrimSpace(setting.Value))
		isEnabled = val == "true" || val == "1" || val == "yes" || val == "on"
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"quick_login_enabled": isEnabled,
		},
	})
}

// AdminGetSystemSettings returns all system settings with category grouping for admin/developer
func AdminGetSystemSettings(c *gin.Context) {
	var settings []models.SystemSetting
	database.DB.Order("category asc, `key` asc").Find(&settings)

	// Ensure quick_login_enabled exists in output
	hasQuickLogin := false
	for _, s := range settings {
		if s.Key == "quick_login_enabled" {
			hasQuickLogin = true
			break
		}
	}

	if !hasQuickLogin {
		defaultQL := models.SystemSetting{
			Key:         "quick_login_enabled",
			Value:       "true",
			DisplayName: "Quick 1-Click Login",
			Category:    "Authentication",
			Description: "Show quick 1-click demo login buttons on the login page for fast testing",
			UpdatedAt:   time.Now(),
		}
		database.DB.Create(&defaultQL)
		settings = append(settings, defaultQL)
	}

	// Map settings for convenient key-value access
	settingsMap := make(map[string]interface{})
	for _, s := range settings {
		if s.Key == "quick_login_enabled" {
			val := strings.ToLower(strings.TrimSpace(s.Value))
			settingsMap[s.Key] = val == "true" || val == "1" || val == "yes" || val == "on"
		} else {
			settingsMap[s.Key] = s.Value
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"settings":     settings,
			"settings_map": settingsMap,
		},
	})
}

// AdminUpdateSystemSetting updates one or multiple system configuration flags
func AdminUpdateSystemSetting(c *gin.Context) {
	var req struct {
		Key   string      `json:"key"`
		Value interface{} `json:"value"`
		// Or bulk settings map
		Settings map[string]interface{} `json:"settings"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request payload",
		})
		return
	}

	now := time.Now()

	// 1. Single setting update
	if req.Key != "" {
		valStr := fmt.Sprintf("%v", req.Value)
		var setting models.SystemSetting
		if err := database.DB.Where("`key` = ?", req.Key).First(&setting).Error; err != nil {
			setting = models.SystemSetting{
				Key:         req.Key,
				Value:       valStr,
				DisplayName: req.Key,
				Category:    "General",
				UpdatedAt:   now,
			}
			database.DB.Create(&setting)
		} else {
			database.DB.Model(&setting).Updates(map[string]interface{}{
				"value":      valStr,
				"updated_at": now,
			})
		}
	}

	// 2. Bulk settings map update
	if req.Settings != nil {
		for k, v := range req.Settings {
			valStr := fmt.Sprintf("%v", v)
			var setting models.SystemSetting
			if err := database.DB.Where("`key` = ?", k).First(&setting).Error; err != nil {
				setting = models.SystemSetting{
					Key:         k,
					Value:       valStr,
					DisplayName: k,
					Category:    "General",
					UpdatedAt:   now,
				}
				database.DB.Create(&setting)
			} else {
				database.DB.Model(&setting).Updates(map[string]interface{}{
					"value":      valStr,
					"updated_at": now,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "System settings updated successfully",
	})
}
