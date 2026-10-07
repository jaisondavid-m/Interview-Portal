package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"server/database"
	"server/models"
)

// DepartmentInfo represents aggregated department master data
type DepartmentInfo struct {
	Name          string   `json:"name"`
	Code          string   `json:"code"`
	TotalUsers    int64    `json:"total_users"`
	StudentCount  int64    `json:"student_count"`
	FacultyCount  int64    `json:"faculty_count"`
	AdminCount    int64    `json:"admin_count"`
	Sections      []string `json:"sections"`
	TotalBatches  int      `json:"total_batches"`
}

// GetDepartmentCode generates or maps standard department abbreviation
func GetDepartmentCode(deptName string) string {
	deptUpper := strings.ToUpper(strings.TrimSpace(deptName))
	switch {
	case strings.Contains(deptUpper, "ARTIFICIAL INTELLIGENCE") || strings.Contains(deptUpper, "DATA SCIENCE") || deptUpper == "AI&DS" || deptUpper == "AIDS":
		return "AI & DS"
	case strings.Contains(deptUpper, "COMPUTER SCIENCE") || deptUpper == "CSE":
		return "CSE"
	case strings.Contains(deptUpper, "INFORMATION TECHNOLOGY") || deptUpper == "IT":
		return "IT"
	case strings.Contains(deptUpper, "ELECTRONICS AND COMMUNICATION") || deptUpper == "ECE":
		return "ECE"
	case strings.Contains(deptUpper, "ELECTRICAL AND ELECTRONICS") || deptUpper == "EEE":
		return "EEE"
	case strings.Contains(deptUpper, "ELECTRONICS AND INSTRUMENTATION") || deptUpper == "EIE":
		return "EIE"
	case strings.Contains(deptUpper, "MECHATRONICS") || deptUpper == "MCT":
		return "MCT"
	case strings.Contains(deptUpper, "MECHANICAL") || deptUpper == "MECH":
		return "MECH"
	case strings.Contains(deptUpper, "BIOTECHNOLOGY") || deptUpper == "BT":
		return "BT"
	case strings.Contains(deptUpper, "AGRICULTURAL") || strings.Contains(deptUpper, "AGRICULTURE") || deptUpper == "AGRI":
		return "AGRI"
	case strings.Contains(deptUpper, "CIVIL"):
		return "CIVIL"
	case strings.Contains(deptUpper, "BIOMEDICAL") || deptUpper == "BME":
		return "BME"
	case strings.Contains(deptUpper, "CHEMICAL"):
		return "CHEM"
	case strings.Contains(deptUpper, "AEROSPACE") || strings.Contains(deptUpper, "AERONAUTICAL"):
		return "AERO"
	default:
		// Fallback: take initials of words
		words := strings.Fields(deptUpper)
		if len(words) == 1 {
			if len(deptUpper) <= 5 {
				return deptUpper
			}
			return deptUpper[:4]
		}
		var code strings.Builder
		for _, w := range words {
			if len(w) > 0 && w != "AND" && w != "OF" && w != "&" {
				code.WriteByte(w[0])
			}
		}
		if code.Len() > 0 {
			return code.String()
		}
		return "DEPT"
	}
}

// AdminGetDepartmentsOverview returns all unique departments with statistics and sections
func AdminGetDepartmentsOverview(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))
	sortBy := strings.ToLower(strings.TrimSpace(c.Query("sort_by")))
	order := strings.ToUpper(strings.TrimSpace(c.Query("order")))
	if order != "ASC" && order != "DESC" {
		order = "DESC"
	}

	type DeptStatRaw struct {
		Department string `gorm:"column:department"`
		TotalUsers int64  `gorm:"column:total_users"`
		Students   int64  `gorm:"column:students"`
		Faculty    int64  `gorm:"column:faculty"`
		Admins     int64  `gorm:"column:admins"`
	}

	query := database.DB.Model(&models.User{}).
		Select("department, COUNT(*) as total_users, SUM(CASE WHEN role='student' THEN 1 ELSE 0 END) as students, SUM(CASE WHEN role='faculty' THEN 1 ELSE 0 END) as faculty, SUM(CASE WHEN role='admin' THEN 1 ELSE 0 END) as admins").
		Where("department IS NOT NULL AND TRIM(department) != ''").
		Group("department")

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(department) LIKE ?", s)
	}

	switch sortBy {
	case "name":
		query = query.Order("department " + order)
	case "students":
		query = query.Order("students " + order + ", department ASC")
	case "faculty":
		query = query.Order("faculty " + order + ", department ASC")
	default:
		query = query.Order("total_users " + order + ", department ASC")
	}

	var rawStats []DeptStatRaw
	if err := query.Scan(&rawStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch department statistics",
			"error":   err.Error(),
		})
		return
	}

	// Fetch distinct sections per department for students
	type DeptSectionRaw struct {
		Department string `gorm:"column:department"`
		Section    string `gorm:"column:section"`
	}
	var deptSections []DeptSectionRaw
	database.DB.Model(&models.User{}).
		Select("department, section").
		Where("department IS NOT NULL AND TRIM(department) != '' AND section IS NOT NULL AND TRIM(section) != ''").
		Group("department, section").
		Order("department ASC, section ASC").
		Scan(&deptSections)

	sectionsMap := make(map[string][]string)
	for _, ds := range deptSections {
		sec := strings.TrimSpace(ds.Section)
		if sec != "" {
			sectionsMap[ds.Department] = append(sectionsMap[ds.Department], sec)
		}
	}

	var totalUsersCount int64
	var totalStudentsCount int64
	var totalFacultyCount int64
	departments := make([]DepartmentInfo, 0, len(rawStats))

	for _, r := range rawStats {
		secs := sectionsMap[r.Department]
		if secs == nil {
			secs = []string{}
		}
		totalUsersCount += r.TotalUsers
		totalStudentsCount += r.Students
		totalFacultyCount += r.Faculty

		departments = append(departments, DepartmentInfo{
			Name:         r.Department,
			Code:         GetDepartmentCode(r.Department),
			TotalUsers:   r.TotalUsers,
			StudentCount: r.Students,
			FacultyCount: r.Faculty,
			AdminCount:   r.Admins,
			Sections:     secs,
			TotalBatches: len(secs),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   departments,
		"summary": gin.H{
			"total_departments": len(departments),
			"total_users":       totalUsersCount,
			"total_students":    totalStudentsCount,
			"total_faculty":     totalFacultyCount,
		},
	})
}

// AdminGetDepartmentUsers lists users under a specific department with filters and pagination
func AdminGetDepartmentUsers(c *gin.Context) {
	deptName := strings.TrimSpace(c.Param("name"))
	if deptName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Department name is required"})
		return
	}

	role := strings.TrimSpace(c.Query("role"))
	section := strings.TrimSpace(c.Query("section"))
	search := strings.TrimSpace(c.Query("search"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 15
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.User{}).Where("LOWER(department) = ?", strings.ToLower(deptName))

	if role != "" && role != "all" {
		query = query.Where("role = ?", role)
	}

	if section != "" && section != "all" {
		if strings.EqualFold(section, "unassigned") {
			query = query.Where("section IS NULL OR section = ''")
		} else {
			query = query.Where("section = ?", section)
		}
	}

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(roll_no) LIKE ?", s, s, s)
	}

	var totalCount int64
	query.Count(&totalCount)

	var users []models.User
	if err := query.Order("role ASC, name ASC").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to fetch department users",
			"error":   err.Error(),
		})
		return
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int((totalCount + int64(limit) - 1) / int64(limit))
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "success",
		"department": deptName,
		"code":       GetDepartmentCode(deptName),
		"data":       users,
		"pagination": gin.H{
			"page":          page,
			"limit":         limit,
			"total_records": totalCount,
			"total_pages":   totalPages,
			"has_next":      page < totalPages,
			"has_prev":      page > 1,
		},
	})
}

// AdminGetDataManagementSummary provides global statistics across all institutional datasets
func AdminGetDataManagementSummary(c *gin.Context) {
	var totalUsers, totalStudents, totalFaculty int64
	var totalDepts int64
	var totalCourses int64
	var totalExperiments int64

	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("role = 'student'").Count(&totalStudents)
	database.DB.Model(&models.User{}).Where("role = 'faculty'").Count(&totalFaculty)

	database.DB.Model(&models.User{}).
		Where("department IS NOT NULL AND TRIM(department) != ''").
		Distinct("department").
		Count(&totalDepts)

	database.DB.Model(&models.LabCourse{}).Count(&totalCourses)
	database.DB.Model(&models.LabExperiment{}).Count(&totalExperiments)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"total_users":         totalUsers,
			"total_students":      totalStudents,
			"total_faculty":       totalFaculty,
			"total_departments":   totalDepts,
			"total_lab_courses":   totalCourses,
			"total_experiments":   totalExperiments,
		},
	})
}
