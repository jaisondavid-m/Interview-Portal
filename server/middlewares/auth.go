package middlewares

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"server/config"
	"server/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims holds custom JWT claims
type JWTClaims struct {
	UserID     uint   `json:"user_id"`
	Email      string `json:"email"`
	RollNo     string `json:"roll_no"`
	Name       string `json:"name"`
	Role       string `json:"role"`
	Department string `json:"department"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a signed JWT token for a given user
func GenerateJWT(user *models.User, secret string) (string, error) {
	claims := JWTClaims{
		UserID:     user.ID,
		Email:      user.Email,
		RollNo:     user.RollNo,
		Name:       user.Name,
		Role:       user.Role,
		Department: user.Department,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)), // 3 days expiry
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "mock-mate-server",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// AuthMiddleware validates the JWT token from HTTP Cookie or Authorization Header
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// 1. Try to read JWT token from HTTP Cookie "token"
		cookieToken, err := c.Cookie("token")
		if err == nil && cookieToken != "" {
			tokenString = cookieToken
		} else {
			// 2. Fallback to Authorization Header: Bearer <token>
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					tokenString = parts[1]
				}
			}
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"status":  "error",
				"message": "Authentication required. No session cookie or token provided.",
			})
			c.Abort()
			return
		}

		claims := &JWTClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"status":  "error",
				"message": "Invalid or expired session token",
			})
			c.Abort()
			return
		}

		// Store user context in request
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userName", claims.Name)
		c.Set("userRole", claims.Role)
		c.Set("userRollNo", claims.RollNo)
		c.Set("userDepartment", claims.Department)

		c.Next()
	}
}

// RequireRole ensures the authenticated user possesses one of the allowed roles
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"status":  "error",
				"message": "Access denied. User role not identified.",
			})
			c.Abort()
			return
		}

		userRole := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", roleVal)))
		for _, allowed := range allowedRoles {
			if userRole == strings.ToLower(strings.TrimSpace(allowed)) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Access restricted. You do not have permission to access this resource.",
		})
		c.Abort()
	}
}

// RequireAdmin ensures the authenticated user is strictly an administrator
func RequireAdmin() gin.HandlerFunc {
	return RequireRole("admin")
}

