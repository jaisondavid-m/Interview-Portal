package controllers

import (
	"net/http"
	"strings"

	"server/config"
	"server/database"
	"server/middlewares"
	"server/models"

	"github.com/gin-gonic/gin"
)

// LoginInput defines request payload for user login
type LoginInput struct {
	Identifier string `json:"identifier" binding:"required"` // Email or Roll No
	Password   string `json:"password" binding:"required"`
}

// Login authenticates a student or admin user, sets an HttpOnly JWT cookie, and returns user data
func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Please provide your email/roll number and password",
			"error":   err.Error(),
		})
		return
	}

	identifier := strings.TrimSpace(input.Identifier)

	// Search by Email OR Roll Number
	var user models.User
	err := database.DB.Where("email = ? OR roll_no = ?", identifier, identifier).First(&user).Error
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Invalid email/roll number or password",
		})
		return
	}

	// Verify Password Hash
	if !models.CheckPasswordHash(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Invalid email/roll number or password",
		})
		return
	}

	// Generate JWT Token
	token, err := middlewares.GenerateJWT(&user, config.AppConfig.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to generate authentication token",
		})
		return
	}

	// Set HttpOnly JWT Cookie (valid for 3 days = 259200 seconds)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", token, 72*3600, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":         user.ID,
			"name":       user.Name,
			"email":      user.Email,
			"roll_no":    user.RollNo,
			"department": user.Department,
			"role":       user.Role,
		},
	})
}

// Logout clears the JWT authentication cookie
func Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Logged out successfully",
	})
}

// GetMe returns the profile of the currently logged-in user
func GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "User session not found",
		})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"user": gin.H{
			"id":         user.ID,
			"name":       user.Name,
			"email":      user.Email,
			"roll_no":    user.RollNo,
			"department": user.Department,
			"role":       user.Role,
		},
	})
}
