package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// parseQuickAccounts reads the quick_accounts setting from DB and returns parsed slice.
// Returns nil slice (not an error) when the setting simply doesn't exist yet.
func parseQuickAccounts() []map[string]interface{} {
	var setting models.SystemSetting
	if err := database.DB.Where("`key` = 'quick_accounts'").First(&setting).Error; err != nil {
		return nil
	}
	var accounts []map[string]interface{}
	if err := json.Unmarshal([]byte(setting.Value), &accounts); err != nil {
		return nil
	}
	return accounts
}

// GetPublicQuickLoginStatus returns whether quick 1-click login is enabled without requiring authentication.
// It also includes the quick_accounts array so the login page only needs one API call.
func GetPublicQuickLoginStatus(c *gin.Context) {
	var setting models.SystemSetting
	isEnabled := true
	if err := database.DB.Where("`key` = 'quick_login_enabled'").First(&setting).Error; err == nil {
		val := strings.ToLower(strings.TrimSpace(setting.Value))
		isEnabled = val == "true" || val == "1" || val == "yes" || val == "on"
	}

	accounts := parseQuickAccounts()
	if accounts == nil {
		accounts = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"quick_login_enabled": isEnabled,
			"quick_accounts":      accounts,
		},
	})
}

// GetPublicQuickAccounts returns just the quick_accounts array for public consumption.
func GetPublicQuickAccounts(c *gin.Context) {
	accounts := parseQuickAccounts()
	if accounts == nil {
		accounts = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"quick_accounts": accounts,
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

	accounts := parseQuickAccounts()
	if accounts == nil {
		accounts = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"quick_login_enabled": isEnabled,
			"quick_accounts":      accounts,
		},
	})
}

// AdminGetSystemSettings returns all system settings with category grouping for admin/developer
func AdminGetSystemSettings(c *gin.Context) {
	var settings []models.SystemSetting
	database.DB.Order("category asc, `key` asc").Find(&settings)

	// Ensure quick_login_enabled exists in output
	hasQuickLogin := false
	hasQuickAccounts := false
	for _, s := range settings {
		if s.Key == "quick_login_enabled" {
			hasQuickLogin = true
		}
		if s.Key == "quick_accounts" {
			hasQuickAccounts = true
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

	if !hasQuickAccounts {
		defaultAccounts := `[{"title":"Admin","email":"admin@bitsathy.ac.in","password":"password","role":"admin"},{"title":"Developer","email":"developer@bitsathy.ac.in","password":"password","role":"developer"},{"title":"Student 1","email":"jaisondavidm.cs25@bitsathy.ac.in","password":"password","role":"student"},{"title":"Student 2","email":"jagaprasanths.cs25@bitsathy.ac.in","password":"password","role":"student"}]`
		defaultQA := models.SystemSetting{
			Key:         "quick_accounts",
			Value:       defaultAccounts,
			DisplayName: "Quick Login Accounts",
			Category:    "Authentication",
			Description: "JSON array of demo accounts shown on the quick 1-click login section",
			UpdatedAt:   time.Now(),
		}
		database.DB.Create(&defaultQA)
		settings = append(settings, defaultQA)
	}

	// Map settings for convenient key-value access
	settingsMap := make(map[string]interface{})
	for _, s := range settings {
		if s.Key == "quick_login_enabled" {
			val := strings.ToLower(strings.TrimSpace(s.Value))
			settingsMap[s.Key] = val == "true" || val == "1" || val == "yes" || val == "on"
		} else if s.Key == "quick_accounts" {
			var accounts []map[string]interface{}
			if err := json.Unmarshal([]byte(s.Value), &accounts); err == nil {
				settingsMap[s.Key] = accounts
			} else {
				settingsMap[s.Key] = []map[string]interface{}{}
			}
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
		var valStr string
		// For quick_accounts, allow passing a JSON array directly
		if req.Key == "quick_accounts" {
			switch v := req.Value.(type) {
			case string:
				valStr = v
			default:
				b, err := json.Marshal(req.Value)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"status":  "error",
						"message": "Invalid quick_accounts format",
					})
					return
				}
				valStr = string(b)
			}
		} else {
			valStr = fmt.Sprintf("%v", req.Value)
		}

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
			var valStr string
			if k == "quick_accounts" {
				switch vv := v.(type) {
				case string:
					valStr = vv
				default:
					b, err := json.Marshal(v)
					if err != nil {
						continue
					}
					valStr = string(b)
				}
			} else {
				valStr = fmt.Sprintf("%v", v)
			}
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


