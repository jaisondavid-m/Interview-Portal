package controllers

import (
	"net/http"

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
