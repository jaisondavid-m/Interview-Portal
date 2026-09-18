package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

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
	identifierLower := strings.ToLower(identifier)

	// Search by Email OR Roll Number (case-insensitive)
	var user models.User
	err := database.DB.Where("LOWER(email) = ? OR LOWER(roll_no) = ?", identifierLower, identifierLower).First(&user).Error
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

	// Update active token and last login timestamp in DB (Enforce single-device session)
	now := time.Now()
	database.DB.Model(&user).Updates(map[string]interface{}{
		"active_token":  token,
		"last_login_at": &now,
	})

	// Set HttpOnly JWT Cookie (valid for 3 days = 259200 seconds)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", token, 72*3600, "/", "", false, true)

	// Fetch role's configured default page
	var userRole models.Role
	var defaultPage string
	if err := database.DB.Where("name = ?", strings.ToLower(user.Role)).First(&userRole).Error; err == nil {
		defaultPage = userRole.DefaultPage
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":           user.ID,
			"name":         user.Name,
			"email":        user.Email,
			"roll_no":      user.RollNo,
			"department":   user.Department,
			"role":         user.Role,
			"avatar_url":   user.AvatarURL,
			"auth_method":  user.AuthMethod,
			"default_page": defaultPage,
		},
	})
}

// GoogleLoginInput defines request payload for Google OAuth login
type GoogleLoginInput struct {
	Credential  string `json:"credential"`   // Google ID token JWT (from OneTap/GIS)
	AccessToken string `json:"access_token"` // Google OAuth2 Access Token (from popup tokenClient)
}

type googleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Aud           string `json:"aud"`
}

type googleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// GoogleLogin handles Google OAuth token validation and account provisioning/login
func GoogleLogin(c *gin.Context) {
	var input GoogleLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid Google login payload",
			"error":   err.Error(),
		})
		return
	}

	var verifiedEmail string
	var verifiedName string
	var googleSub string
	var pictureURL string

	client := &http.Client{Timeout: 8 * time.Second}

	// 1. Verify Google ID token if provided
	if strings.TrimSpace(input.Credential) != "" {
		resp, err := client.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + strings.TrimSpace(input.Credential))
		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var tokenInfo googleTokenInfo
			if jsonErr := json.NewDecoder(resp.Body).Decode(&tokenInfo); jsonErr == nil && tokenInfo.Email != "" {
				verifiedEmail = strings.ToLower(strings.TrimSpace(tokenInfo.Email))
				verifiedName = strings.TrimSpace(tokenInfo.Name)
				googleSub = strings.TrimSpace(tokenInfo.Sub)
				pictureURL = strings.TrimSpace(tokenInfo.Picture)
			}
		}
	}

	// 2. Verify Google OAuth Access Token if ID token wasn't provided/valid
	if verifiedEmail == "" && strings.TrimSpace(input.AccessToken) != "" {
		req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(input.AccessToken))
			resp, reqErr := client.Do(req)
			if reqErr == nil && resp.StatusCode == http.StatusOK {
				defer resp.Body.Close()
				var uInfo googleUserInfo
				if jsonErr := json.NewDecoder(resp.Body).Decode(&uInfo); jsonErr == nil && uInfo.Email != "" {
					verifiedEmail = strings.ToLower(strings.TrimSpace(uInfo.Email))
					verifiedName = strings.TrimSpace(uInfo.Name)
					googleSub = strings.TrimSpace(uInfo.Sub)
					pictureURL = strings.TrimSpace(uInfo.Picture)
				}
			}
		}
	}

	if verifiedEmail == "" || !strings.Contains(verifiedEmail, "@") {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Google authentication failed. Unable to verify your Google account credentials.",
		})
		return
	}

	if verifiedName == "" {
		parts := strings.Split(verifiedEmail, "@")
		verifiedName = strings.Title(strings.ReplaceAll(parts[0], ".", " "))
	}

	// 3. Search user by verified email or google_id
	var user models.User
	err := database.DB.Where("LOWER(email) = ? OR (google_id != '' AND google_id = ?)", verifiedEmail, googleSub).First(&user).Error

	if err != nil {
		// User is not registered in the database by admin
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "User not registered",
		})
		return
	}

	// User exists in database -> Update Google credentials & last login
	now := time.Now()
	updates := map[string]interface{}{
		"last_login_at": &now,
		"auth_method":   "google",
	}
	if googleSub != "" && user.GoogleID == "" {
		updates["google_id"] = googleSub
	}
	if pictureURL != "" && user.AvatarURL == "" {
		updates["avatar_url"] = pictureURL
	}
	database.DB.Model(&user).Updates(updates)

	// Generate JWT Token
	token, err := middlewares.GenerateJWT(&user, config.AppConfig.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to generate authentication token",
		})
		return
	}

	// Update active token in DB for single session enforcement
	database.DB.Model(&user).Update("active_token", token)

	// Set HttpOnly JWT Cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", token, 72*3600, "/", "", false, true)

	// Fetch role's configured default page
	var userRole models.Role
	var defaultPage string
	if err := database.DB.Where("name = ?", strings.ToLower(user.Role)).First(&userRole).Error; err == nil {
		defaultPage = userRole.DefaultPage
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Google authentication successful",
		"token":   token,
		"user": gin.H{
			"id":           user.ID,
			"name":         user.Name,
			"email":        user.Email,
			"roll_no":      user.RollNo,
			"department":   user.Department,
			"role":         user.Role,
			"avatar_url":   user.AvatarURL,
			"auth_method":  user.AuthMethod,
			"default_page": defaultPage,
		},
	})
}

// Logout clears the JWT authentication cookie and invalidates the database session token
func Logout(c *gin.Context) {
	// Clear cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", "", -1, "/", "", false, true)

	// Extract token if present and clear active_token in DB
	var tokenString string
	if cookieToken, err := c.Cookie("token"); err == nil && cookieToken != "" {
		tokenString = cookieToken
	} else {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if tokenString != "" {
		claims := &middlewares.JWTClaims{}
		token, err := middlewares.ParseJWTToken(tokenString, config.AppConfig.JWTSecret, claims)
		if err == nil && token.Valid && claims.UserID > 0 {
			database.DB.Model(&models.User{}).Where("id = ?", claims.UserID).Update("active_token", "")
		}
	}

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

	// Fetch role's configured default page
	var userRole models.Role
	var defaultPage string
	if err := database.DB.Where("name = ?", strings.ToLower(user.Role)).First(&userRole).Error; err == nil {
		defaultPage = userRole.DefaultPage
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"user": gin.H{
			"id":           user.ID,
			"name":         user.Name,
			"email":        user.Email,
			"roll_no":      user.RollNo,
			"department":   user.Department,
			"role":         user.Role,
			"default_page": defaultPage,
		},
	})
}
