package controllers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// AdminGetUsers retrieves all registered students and administrators
func AdminGetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("created_at desc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch users",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
	})
}

// AdminGetUserByID retrieves a specific user by ID
func AdminGetUserByID(c *gin.Context) {
	id := c.Param("id")
	var user models.User

	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   user,
	})
}

// AdminCreateUser allows administrator to register a new student or admin
func AdminCreateUser(c *gin.Context) {
	var input struct {
		Name       string `json:"name" binding:"required"`
		Email      string `json:"email" binding:"required,email"`
		RollNo     string `json:"roll_no"`
		Department string `json:"department"`
		Password   string `json:"password" binding:"required,min=4"`
		Role       string `json:"role"` // 'student' or 'admin'
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid user details provided",
			"error":   err.Error(),
		})
		return
	}

	// Check if Email already registered
	var existing models.User
	if err := database.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User with this email already exists",
		})
		return
	}

	// Hash password
	hashedPassword, err := models.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to hash password",
		})
		return
	}

	role := input.Role
	if role != "admin" {
		role = "student"
	}

	user := models.User{
		Name:       input.Name,
		Email:      input.Email,
		RollNo:     input.RollNo,
		Department: input.Department,
		Password:   hashedPassword,
		Role:       role,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create user in database",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "User created successfully",
		"data":    user,
	})
}

// AdminUpdateUser allows admin to edit student information or reset password
func AdminUpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User

	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	var input struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		RollNo     string `json:"roll_no"`
		Department string `json:"department"`
		Role       string `json:"role"`
		Password   string `json:"password"` // Optional password reset
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid input data",
			"error":   err.Error(),
		})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Email != "" {
		updates["email"] = input.Email
	}
	if input.RollNo != "" {
		updates["roll_no"] = input.RollNo
	}
	if input.Department != "" {
		updates["department"] = input.Department
	}
	if input.Role != "" {
		updates["role"] = input.Role
	}
	if input.Password != "" {
		hashed, err := models.HashPassword(input.Password)
		if err == nil {
			updates["password"] = hashed
		}
	}

	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update user",
			"error":   err.Error(),
		})
		return
	}

	// Reload updated user
	database.DB.First(&user, id)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "User updated successfully",
		"data":    user,
	})
}

// AdminDeleteUser removes a student or admin user
func AdminDeleteUser(c *gin.Context) {
	id := c.Param("id")
	currentUserID, _ := c.Get("userID")

	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Prevent admin from deleting themselves
	if user.ID == currentUserID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "You cannot delete your own admin account",
		})
		return
	}

	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to delete user",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "User deleted successfully",
	})
}

// BulkUserItem represents a single user row in a bulk creation request
type BulkUserItem struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	RollNo     string `json:"roll_no"`
	Department string `json:"department"`
	Password   string `json:"password"`
	Role       string `json:"role"`
}

// BulkCreateUsersInput represents the JSON body for bulk creation
type BulkCreateUsersInput struct {
	Users           []BulkUserItem `json:"users" binding:"required"`
	DefaultPassword string         `json:"default_password"`
}

// AdminBulkCreateUsers creates multiple users in a single operation
func AdminBulkCreateUsers(c *gin.Context) {
	var input BulkCreateUsersInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid bulk user input data",
			"error":   err.Error(),
		})
		return
	}

	if len(input.Users) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No user records provided",
		})
		return
	}

	defaultPW := strings.TrimSpace(input.DefaultPassword)
	if defaultPW == "" {
		defaultPW = "mockmate123"
	}

	defaultHashedPW, err := models.HashPassword(defaultPW)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to hash default password",
		})
		return
	}

	// Fetch existing emails to prevent duplicate key errors
	var existingUsers []models.User
	database.DB.Select("email").Find(&existingUsers)
	existingEmailMap := make(map[string]bool)
	for _, u := range existingUsers {
		existingEmailMap[strings.ToLower(strings.TrimSpace(u.Email))] = true
	}

	var createdUsers []models.User
	var skippedDetails []string
	seenInBatch := make(map[string]bool)

	for idx, item := range input.Users {
		name := strings.TrimSpace(item.Name)
		email := strings.ToLower(strings.TrimSpace(item.Email))
		rollNo := strings.TrimSpace(item.RollNo)
		department := strings.TrimSpace(item.Department)
		role := strings.ToLower(strings.TrimSpace(item.Role))

		if name == "" || email == "" {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d: Missing required name or email", idx+1))
			continue
		}

		if !strings.Contains(email, "@") {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Invalid email format", idx+1, email))
			continue
		}

		if existingEmailMap[email] {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Email already registered in system", idx+1, email))
			continue
		}

		if seenInBatch[email] {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Duplicate email within upload batch", idx+1, email))
			continue
		}
		seenInBatch[email] = true

		if role != "admin" {
			role = "student"
		}

		hashedPW := defaultHashedPW
		if customPW := strings.TrimSpace(item.Password); len(customPW) >= 4 {
			if hp, err := models.HashPassword(customPW); err == nil {
				hashedPW = hp
			}
		}

		newUser := models.User{
			Name:       name,
			Email:      email,
			RollNo:     rollNo,
			Department: department,
			Password:   hashedPW,
			Role:       role,
		}

		if err := database.DB.Create(&newUser).Error; err != nil {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Database insert error: %v", idx+1, email, err.Error()))
			continue
		}

		existingEmailMap[email] = true
		createdUsers = append(createdUsers, newUser)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"message":         fmt.Sprintf("Bulk provisioning complete: %d created, %d skipped", len(createdUsers), len(skippedDetails)),
		"created_count":   len(createdUsers),
		"skipped_count":   len(skippedDetails),
		"skipped_details": skippedDetails,
		"created_users":   createdUsers,
	})
}

// AdminBulkDeleteUsers deletes multiple users by their IDs
func AdminBulkDeleteUsers(c *gin.Context) {
	currentUserID, _ := c.Get("userID")

	var input struct {
		UserIDs []uint `json:"user_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || len(input.UserIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No user IDs provided for deletion",
		})
		return
	}

	// Filter out the calling admin's own ID
	var safeIDs []uint
	for _, id := range input.UserIDs {
		if currentUserID != nil && id == currentUserID.(uint) {
			continue
		}
		safeIDs = append(safeIDs, id)
	}

	if len(safeIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Cannot delete current admin user",
		})
		return
	}

	res := database.DB.Where("id IN ?", safeIDs).Delete(&models.User{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to bulk delete users",
			"error":   res.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       fmt.Sprintf("Successfully deleted %d accounts", res.RowsAffected),
		"deleted_count": res.RowsAffected,
	})
}

// AdminExportUsersCSV streams all users in CSV format
func AdminExportUsersCSV(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("created_at desc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch users for export",
		})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=mockmate_users_%s.csv", time.Now().Format("20060102_150405")))
	c.Header("Content-Type", "text/csv; charset=utf-8")

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Header row
	_ = writer.Write([]string{"ID", "Name", "Email", "Roll No", "Department", "Role", "Created At"})

	for _, u := range users {
		_ = writer.Write([]string{
			fmt.Sprintf("%d", u.ID),
			u.Name,
			u.Email,
			u.RollNo,
			u.Department,
			u.Role,
			u.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}
}
