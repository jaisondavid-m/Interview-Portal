package controllers

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// RoleWithStats represents a role alongside its user count and permissions
type RoleWithStats struct {
	ID          uint                        `json:"id"`
	Name        string                      `json:"name"`
	DisplayName string                      `json:"display_name"`
	Description string                      `json:"description"`
	IsSystem    bool                        `json:"is_system"`
	UserCount   int64                       `json:"user_count"`
	Permissions map[string]bool             `json:"permissions"`
	CreatedAt   string                      `json:"created_at"`
	UpdatedAt   string                      `json:"updated_at"`
}

// AdminGetRoles retrieves all roles with user counts and page access mappings
func AdminGetRoles(c *gin.Context) {
	var roles []models.Role
	if err := database.DB.Order("is_system desc, name asc").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch roles",
			"error":   err.Error(),
		})
		return
	}

	// Fetch all permissions
	var permissions []models.RolePagePermission
	database.DB.Find(&permissions)

	permMap := make(map[string]map[string]bool)
	for _, p := range permissions {
		if _, exists := permMap[p.RoleName]; !exists {
			permMap[p.RoleName] = make(map[string]bool)
		}
		permMap[p.RoleName][p.PageKey] = p.CanAccess
	}

	// Count users per role
	type UserCountResult struct {
		Role  string
		Count int64
	}
	var userCounts []UserCountResult
	database.DB.Model(&models.User{}).Select("role, count(*) as count").Group("role").Scan(&userCounts)
	countMap := make(map[string]int64)
	for _, uc := range userCounts {
		countMap[strings.ToLower(uc.Role)] = uc.Count
	}

	var response []RoleWithStats
	for _, r := range roles {
		rolePerms := permMap[r.Name]
		if rolePerms == nil {
			rolePerms = make(map[string]bool)
		}
		response = append(response, RoleWithStats{
			ID:          r.ID,
			Name:        r.Name,
			DisplayName: r.DisplayName,
			Description: r.Description,
			IsSystem:    r.IsSystem,
			UserCount:   countMap[strings.ToLower(r.Name)],
			Permissions: rolePerms,
			CreatedAt:   r.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   r.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   response,
	})
}

// AdminCreateRole registers a new custom role and initializes its page access permissions
func AdminCreateRole(c *gin.Context) {
	var input struct {
		Name        string          `json:"name" binding:"required"`
		DisplayName string          `json:"display_name" binding:"required"`
		Description string          `json:"description"`
		Permissions map[string]bool `json:"permissions"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid role data provided",
			"error":   err.Error(),
		})
		return
	}

	// Format slug name: lowercase alphanumeric and hyphens/underscores only
	slug := strings.ToLower(strings.TrimSpace(input.Name))
	reg := regexp.MustCompile("[^a-z0-9_-]+")
	slug = reg.ReplaceAllString(slug, "_")
	slug = strings.Trim(slug, "_-")

	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Role identifier name cannot be empty",
		})
		return
	}

	// Check for existing role
	var existing models.Role
	if err := database.DB.Where("name = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Role with identifier '%s' already exists", slug),
		})
		return
	}

	displayName := strings.TrimSpace(input.DisplayName)
	if displayName == "" {
		displayName = strings.Title(strings.ReplaceAll(slug, "_", " "))
	}

	role := models.Role{
		Name:        slug,
		DisplayName: displayName,
		Description: strings.TrimSpace(input.Description),
		IsSystem:    false,
	}

	if err := database.DB.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create role",
			"error":   err.Error(),
		})
		return
	}

	// Fetch all app pages to ensure full matrix initialization
	var pages []models.AppPage
	database.DB.Find(&pages)

	for _, p := range pages {
		canAccess := false
		if input.Permissions != nil {
			canAccess = input.Permissions[p.Key]
		}
		database.DB.Create(&models.RolePagePermission{
			RoleName:  slug,
			PageKey:   p.Key,
			CanAccess: canAccess,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Role created successfully",
		"data":    role,
	})
}

// AdminUpdateRole modifies an existing role's metadata
func AdminUpdateRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Role not found",
		})
		return
	}

	var input struct {
		DisplayName string `json:"display_name"`
		Description string `json:"description"`
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
	if input.DisplayName != "" {
		updates["display_name"] = strings.TrimSpace(input.DisplayName)
	}
	if input.Description != "" {
		updates["description"] = strings.TrimSpace(input.Description)
	}

	if err := database.DB.Model(&role).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update role",
			"error":   err.Error(),
		})
		return
	}

	database.DB.First(&role, id)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Role updated successfully",
		"data":    role,
	})
}

// AdminDeleteRole removes a role (protects primary administrator from lockout)
func AdminDeleteRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := database.DB.First(&role, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Role not found",
		})
		return
	}

	if strings.ToLower(strings.TrimSpace(role.Name)) == "admin" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "The primary Administrator role cannot be deleted to prevent platform lockout.",
		})
		return
	}

	// Delete permissions associated with this role
	database.DB.Where("role_name = ?", role.Name).Delete(&models.RolePagePermission{})

	// Delete role
	if err := database.DB.Delete(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to delete role",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Role '%s' deleted successfully", role.DisplayName),
	})
}

// AdminGetAppPages returns all cataloged application pages grouped by category
func AdminGetAppPages(c *gin.Context) {
	var pages []models.AppPage
	if err := database.DB.Order("order_index asc, id asc").Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch application pages catalog",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   pages,
	})
}

// AdminCreateAppPage registers a new page in the application catalog
func AdminCreateAppPage(c *gin.Context) {
	var input struct {
		Key         string `json:"key"`
		Name        string `json:"name" binding:"required"`
		Path        string `json:"path" binding:"required"`
		Category    string `json:"category"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid page details provided",
			"error":   err.Error(),
		})
		return
	}

	key := strings.ToLower(strings.TrimSpace(input.Key))
	if key == "" {
		key = strings.ToLower(strings.TrimSpace(input.Name))
		reg := regexp.MustCompile("[^a-z0-9_]+")
		key = reg.ReplaceAllString(key, "_")
		key = strings.Trim(key, "_")
	}

	if key == "" {
		key = fmt.Sprintf("page_%d", time.Now().Unix())
	}

	// Check if key already exists
	var existing models.AppPage
	if err := database.DB.Where("`key` = ?", key).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("A page with identifier '%s' already exists", key),
		})
		return
	}

	category := strings.TrimSpace(input.Category)
	if category == "" {
		category = "General"
	}

	icon := strings.TrimSpace(input.Icon)
	if icon == "" {
		icon = "FileCode2"
	}

	page := models.AppPage{
		Key:         key,
		Name:        strings.TrimSpace(input.Name),
		Path:        strings.TrimSpace(input.Path),
		Category:    category,
		Icon:        icon,
		Description: strings.TrimSpace(input.Description),
	}

	if err := database.DB.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to create page",
			"error":   err.Error(),
		})
		return
	}

	// Initialize permissions for all existing roles
	var roles []models.Role
	database.DB.Find(&roles)
	for _, r := range roles {
		canAccess := false
		if r.Name == "admin" {
			canAccess = true
		}
		database.DB.Create(&models.RolePagePermission{
			RoleName:  r.Name,
			PageKey:   page.Key,
			CanAccess: canAccess,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "Page created successfully",
		"data":    page,
	})
}

// AdminUpdateAppPage modifies an existing application page
func AdminUpdateAppPage(c *gin.Context) {
	id := c.Param("id")
	var page models.AppPage
	if err := database.DB.First(&page, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Page not found",
		})
		return
	}

	var input struct {
		Name        string `json:"name"`
		Path        string `json:"path"`
		Category    string `json:"category"`
		Icon        string `json:"icon"`
		Description string `json:"description"`
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
		updates["name"] = strings.TrimSpace(input.Name)
	}
	if input.Path != "" {
		updates["path"] = strings.TrimSpace(input.Path)
	}
	if input.Category != "" {
		updates["category"] = strings.TrimSpace(input.Category)
	}
	if input.Icon != "" {
		updates["icon"] = strings.TrimSpace(input.Icon)
	}
	if input.Description != "" {
		updates["description"] = strings.TrimSpace(input.Description)
	}

	if err := database.DB.Model(&page).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to update page",
			"error":   err.Error(),
		})
		return
	}

	database.DB.First(&page, id)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Page updated successfully",
		"data":    page,
	})
}

// AdminDeleteAppPage removes a page from the catalog and all role permissions
func AdminDeleteAppPage(c *gin.Context) {
	id := c.Param("id")
	var page models.AppPage
	if err := database.DB.First(&page, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Page not found",
		})
		return
	}

	// Delete permissions
	database.DB.Where("page_key = ?", page.Key).Delete(&models.RolePagePermission{})

	// Delete page
	if err := database.DB.Delete(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to delete page",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Page deleted successfully",
	})
}

// AdminGetRoleMappings returns full mapping matrix of roles and page permissions
func AdminGetRoleMappings(c *gin.Context) {
	var pages []models.AppPage
	database.DB.Order("order_index asc, id asc").Find(&pages)

	var roles []models.Role
	database.DB.Order("is_system desc, name asc").Find(&roles)

	var permissions []models.RolePagePermission
	database.DB.Find(&permissions)

	matrix := make(map[string]map[string]bool)
	for _, r := range roles {
		matrix[r.Name] = make(map[string]bool)
		for _, p := range pages {
			matrix[r.Name][p.Key] = false
		}
	}

	for _, perm := range permissions {
		if _, exists := matrix[perm.RoleName]; exists {
			matrix[perm.RoleName][perm.PageKey] = perm.CanAccess
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"pages":   pages,
			"roles":   roles,
			"matrix":  matrix,
		},
	})
}

// UpdateRolePermissionsInput represents the body for saving role permissions
type UpdateRolePermissionsInput struct {
	RoleName    string          `json:"role_name" binding:"required"`
	Permissions map[string]bool `json:"permissions" binding:"required"`
}

// AdminUpdateRolePermissions updates page access permissions for a specific role
func AdminUpdateRolePermissions(c *gin.Context) {
	var input UpdateRolePermissionsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid permissions payload",
			"error":   err.Error(),
		})
		return
	}

	roleName := strings.ToLower(strings.TrimSpace(input.RoleName))

	// Verify role exists
	var role models.Role
	if err := database.DB.Where("name = ?", roleName).First(&role).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Role '%s' not found", roleName),
		})
		return
	}

	// Update or create permission records
	for pageKey, canAccess := range input.Permissions {
		var perm models.RolePagePermission
		res := database.DB.Where("role_name = ? AND page_key = ?", roleName, pageKey).First(&perm)
		if res.Error == nil {
			database.DB.Model(&perm).Update("can_access", canAccess)
		} else {
			database.DB.Create(&models.RolePagePermission{
				RoleName:  roleName,
				PageKey:   pageKey,
				CanAccess: canAccess,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Page access permissions for role '%s' updated successfully", role.DisplayName),
	})
}

// GetUserPagePermissions returns the list of accessible page keys and paths for the authenticated user
func GetUserPagePermissions(c *gin.Context) {
	roleVal, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "User role not found in session",
		})
		return
	}

	roleName := strings.ToLower(fmt.Sprintf("%v", roleVal))

	var permissions []models.RolePagePermission
	database.DB.Where("role_name = ? AND can_access = ?", roleName, true).Find(&permissions)

	allowedKeys := make([]string, 0)
	for _, p := range permissions {
		allowedKeys = append(allowedKeys, p.PageKey)
	}

	var pages []models.AppPage
	if len(allowedKeys) > 0 {
		database.DB.Where("`key` IN ?", allowedKeys).Order("order_index asc").Find(&pages)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"role":         roleName,
			"allowed_keys": allowedKeys,
			"pages":        pages,
		},
	})
}
