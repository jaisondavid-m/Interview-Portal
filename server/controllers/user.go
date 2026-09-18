package controllers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// AdminGetUsers retrieves registered students and administrators with fast database pagination & search filters
func AdminGetUsers(c *gin.Context) {
	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "25"))
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	role := strings.TrimSpace(c.Query("role"))
	department := strings.TrimSpace(c.Query("department"))
	sortBy := strings.ToLower(strings.TrimSpace(c.DefaultQuery("sort_by", "created_at")))
	order := strings.ToLower(strings.TrimSpace(c.DefaultQuery("order", "desc")))

	query := database.DB.Model(&models.User{})

	if role != "" && !strings.EqualFold(role, "all") {
		query = query.Where("role = ?", role)
	}
	if department != "" && !strings.EqualFold(department, "all") {
		query = query.Where("LOWER(department) = ?", strings.ToLower(department))
	}
	if search != "" {
		s := "%" + search + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(roll_no) LIKE ?", s, s, s)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to count users",
			"error":   err.Error(),
		})
		return
	}

	// Determine ordering
	orderClause := "created_at desc"
	validSortColumns := map[string]string{
		"created_at": "created_at",
		"name":       "name",
		"email":      "email",
		"roll_no":    "roll_no",
		"department": "department",
		"role":       "role",
	}
	if col, ok := validSortColumns[sortBy]; ok {
		if order == "asc" {
			orderClause = col + " asc"
		} else {
			orderClause = col + " desc"
		}
	}

	dbQuery := query.Order(orderClause)

	var users []models.User
	page := 1
	limit := 25

	if limitStr == "all" || limitStr == "0" || limitStr == "-1" {
		// Return all records for unbounded export/processing
		limit = int(totalCount)
		if limit == 0 {
			limit = 1
		}
		if err := dbQuery.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to fetch users",
				"error":   err.Error(),
			})
			return
		}
	} else {
		if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
			page = p
		}
		if l, err := strconv.Atoi(limitStr); err == nil && l >= 1 {
			limit = l
			if limit > 200 {
				limit = 200
			}
		}
		offset := (page - 1) * limit
		if err := dbQuery.Limit(limit).Offset(offset).Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Failed to fetch users",
				"error":   err.Error(),
			})
			return
		}
	}

	for i := range users {
		users[i].HasActiveSession = strings.TrimSpace(users[i].ActiveToken) != ""
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int((totalCount + int64(limit) - 1) / int64(limit))
	}
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
		"pagination": gin.H{
			"page":          page,
			"limit":         limit,
			"total_records": totalCount,
			"total_pages":   totalPages,
			"has_next":      hasNext,
			"has_prev":      hasPrev,
		},
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

	user.HasActiveSession = strings.TrimSpace(user.ActiveToken) != ""

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

// BulkUserItem represents a single user row in a bulk creation/update request
type BulkUserItem struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	RollNo     string `json:"roll_no"`
	Department string `json:"department"`
	Password   string `json:"password"`
	Role       string `json:"role"`
}

// BulkCreateUsersInput represents the JSON body for bulk creation/update
type BulkCreateUsersInput struct {
	Users           []BulkUserItem `json:"users" binding:"required"`
	DefaultPassword string         `json:"default_password"`
	Mode            string         `json:"mode"`            // "upsert" (default), "create_only", "update_only"
	UpdateExisting  *bool          `json:"update_existing"` // Legacy boolean compatibility
}

// AdminBulkCreateUsers creates or updates multiple users in a single operation
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

	mode := strings.ToLower(strings.TrimSpace(input.Mode))
	if mode == "" {
		if input.UpdateExisting != nil && !*input.UpdateExisting {
			mode = "create_only"
		} else {
			mode = "upsert"
		}
	}

	defaultPW := strings.TrimSpace(input.DefaultPassword)
	if defaultPW == "" {
		defaultPW = "mockmate-bitsathy-4321"
	}

	defaultHashedPW, err := models.HashPassword(defaultPW)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to hash default password",
		})
		return
	}

	// Fetch existing users mapped by lowercase email
	var existingUsers []models.User
	database.DB.Find(&existingUsers)
	existingUserMap := make(map[string]models.User)
	for _, u := range existingUsers {
		existingUserMap[strings.ToLower(strings.TrimSpace(u.Email))] = u
	}

	var createdUsers []models.User
	var updatedUsers []models.User
	var skippedDetails []string
	seenInBatch := make(map[string]bool)

	for idx, item := range input.Users {
		name := strings.TrimSpace(item.Name)
		email := strings.ToLower(strings.TrimSpace(item.Email))
		rollNo := strings.TrimSpace(item.RollNo)
		department := strings.TrimSpace(item.Department)
		role := strings.ToLower(strings.TrimSpace(item.Role))

		if email == "" {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d: Missing required email", idx+1))
			continue
		}

		if !strings.Contains(email, "@") {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Invalid email format", idx+1, email))
			continue
		}

		if seenInBatch[email] {
			skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Duplicate email within upload batch", idx+1, email))
			continue
		}
		seenInBatch[email] = true

		existingUser, exists := existingUserMap[email]

		if exists {
			// Record already exists in DB
			if mode == "create_only" {
				skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Email already registered (skipped in create-only mode)", idx+1, email))
				continue
			}

			// Mode is "upsert" or "update_only" -> Update existing user record
			updates := map[string]interface{}{}
			if name != "" {
				updates["name"] = name
			}
			if rollNo != "" {
				updates["roll_no"] = rollNo
			}
			if department != "" {
				updates["department"] = department
			}
			if role != "" {
				if role == "admin" || role == "developer" {
					updates["role"] = role
				} else {
					updates["role"] = "student"
				}
			}
			if customPW := strings.TrimSpace(item.Password); len(customPW) >= 4 {
				if hp, err := models.HashPassword(customPW); err == nil {
					updates["password"] = hp
				}
			}

			if len(updates) > 0 {
				if err := database.DB.Model(&existingUser).Updates(updates).Error; err != nil {
					skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Failed to update user in database: %v", idx+1, email, err.Error()))
					continue
				}
			}

			// Reload updated user
			database.DB.First(&existingUser, existingUser.ID)
			updatedUsers = append(updatedUsers, existingUser)
		} else {
			// Record does not exist in DB
			if mode == "update_only" {
				skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): User does not exist in database (skipped in update-only mode)", idx+1, email))
				continue
			}

			if name == "" {
				parts := strings.Split(email, "@")
				name = strings.Title(strings.ReplaceAll(parts[0], ".", " "))
			}

			if role != "admin" && role != "developer" {
				role = "student"
			}

			if department == "" {
				department = "CSE"
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
				AuthMethod: "local",
			}

			if err := database.DB.Create(&newUser).Error; err != nil {
				skippedDetails = append(skippedDetails, fmt.Sprintf("Row %d (%s): Database insert error: %v", idx+1, email, err.Error()))
				continue
			}

			existingUserMap[email] = newUser
			createdUsers = append(createdUsers, newUser)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"message":         fmt.Sprintf("Bulk provisioning complete: %d created, %d updated, %d skipped", len(createdUsers), len(updatedUsers), len(skippedDetails)),
		"created_count":   len(createdUsers),
		"updated_count":   len(updatedUsers),
		"skipped_count":   len(skippedDetails),
		"skipped_details": skippedDetails,
		"created_users":   createdUsers,
		"updated_users":   updatedUsers,
	})
}

// AdminBulkUpdateUsers allows admins to batch-update selected user accounts (e.g. change department, role, or reset password)
func AdminBulkUpdateUsers(c *gin.Context) {
	var input struct {
		UserIDs    []uint `json:"user_ids" binding:"required"`
		Department string `json:"department"`
		Role       string `json:"role"`
		Password   string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || len(input.UserIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No users selected or invalid payload",
		})
		return
	}

	updates := map[string]interface{}{}
	if d := strings.TrimSpace(input.Department); d != "" {
		updates["department"] = d
	}
	if r := strings.TrimSpace(input.Role); r != "" {
		updates["role"] = r
	}
	if pw := strings.TrimSpace(input.Password); len(pw) >= 4 {
		if hp, err := models.HashPassword(pw); err == nil {
			updates["password"] = hp
		}
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No valid fields provided to update (provide department, role, or new password)",
		})
		return
	}

	res := database.DB.Model(&models.User{}).Where("id IN ?", input.UserIDs).Updates(updates)
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to batch update users",
			"error":   res.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       fmt.Sprintf("Successfully updated %d user accounts", res.RowsAffected),
		"updated_count": res.RowsAffected,
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

// AdminForceLogoutUser terminates the active session for a specific user
func AdminForceLogoutUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	if err := database.DB.Model(&user).Update("active_token", "").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to force logout user",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Successfully logged out %s from active session", user.Name),
	})
}

// AdminBulkForceLogoutUsers terminates active sessions for multiple selected users
func AdminBulkForceLogoutUsers(c *gin.Context) {
	var input struct {
		UserIDs []uint `json:"user_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil || len(input.UserIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No user IDs provided for force logout",
		})
		return
	}

	res := database.DB.Model(&models.User{}).Where("id IN ?", input.UserIDs).Update("active_token", "")
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to force logout selected users",
			"error":   res.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"message":       fmt.Sprintf("Successfully terminated %d active user sessions", res.RowsAffected),
		"updated_count": res.RowsAffected,
	})
}
