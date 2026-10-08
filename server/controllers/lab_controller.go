package controllers

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"
	"server/services"

	"github.com/gin-gonic/gin"
)

// StudentUnlockStatus contains fine-grained access details for a student on an experiment
type StudentUnlockStatus struct {
	IsUnlocked          bool       `json:"is_unlocked"`
	Section             string     `json:"section"`
	Status              string     `json:"status"` // "OPEN", "UPCOMING", "EXPIRED", "LOCKED", "PREREQUISITE_LOCKED"
	StartsAt            *time.Time `json:"starts_at,omitempty"`
	EndsAt              *time.Time `json:"ends_at,omitempty"`
	IsStudentOverride   bool       `json:"is_student_override"`
	MaxAttempts         int        `json:"max_attempts"`
	Notes               string     `json:"notes,omitempty"`
	PrerequisiteExpID   uint       `json:"prerequisite_exp_id,omitempty"`
	PrerequisiteExpNo   int        `json:"prerequisite_exp_no,omitempty"`
	PrerequisiteTitle   string     `json:"prerequisite_title,omitempty"`
	BypassPrerequisite bool       `json:"bypass_prerequisite,omitempty"`
}

// getStudentExperimentAccess resolves whether an experiment is currently open for a student
func getStudentExperimentAccess(courseID uint, expID uint, userID uint, userRole string) StudentUnlockStatus {
	database.EnsureLabTables(database.DB)
	role := strings.ToLower(userRole)
	if role == "admin" || role == "faculty" || role == "faculty_incharge" {
		return StudentUnlockStatus{
			IsUnlocked: true,
			Section:    "FACULTY/ADMIN",
			Status:     "OPEN",
		}
	}

	var user models.User
	if err := database.DB.Select("id, section, role").First(&user, userID).Error; err != nil {
		return StudentUnlockStatus{IsUnlocked: false, Section: "UNKNOWN", Status: "LOCKED"}
	}

	section := strings.TrimSpace(user.Section)
	now := time.Now()

	// 0. Sequential Milestone Prerequisite Check (Always Enforced by Default)
	var currentExp models.LabExperiment
	if err := database.DB.Select("id, course_id, experiment_no, title, is_active").First(&currentExp, expID).Error; err == nil {
		if !currentExp.IsActive {
			return StudentUnlockStatus{
				IsUnlocked: false,
				Section:    section,
				Status:     "INACTIVE",
				Notes:      "This experiment is currently inactive.",
			}
		}

		var prevExp models.LabExperiment
		if err := database.DB.Where("course_id = ? AND experiment_no < ? AND (is_active IS NULL OR is_active = true)", courseID, currentExp.ExperimentNo).
			Order("experiment_no desc").First(&prevExp).Error; err == nil && prevExp.ID > 0 {

			// Check if current student has an explicit override with BypassPrerequisite
			var studentOverride models.LabExperimentUnlock
			hasOverrideBypass := false
			if err := database.DB.Where("course_id = ? AND experiment_id = ? AND student_id = ? AND is_unlocked = ? AND bypass_prerequisite = ?", courseID, expID, userID, true, true).First(&studentOverride).Error; err == nil {
				hasOverrideBypass = true
			}

			if !hasOverrideBypass {
				var prevSub models.LabSubmission
				err := database.DB.Where("student_id = ? AND experiment_id = ? AND (status IN ('TEST_PASSED', 'SUBMITTED_FOR_VERIFICATION', 'APPROVED') OR marks > 0)", userID, prevExp.ID).First(&prevSub).Error
				if err != nil {
					return StudentUnlockStatus{
						IsUnlocked:        false,
						Section:           section,
						Status:            "PREREQUISITE_LOCKED",
						PrerequisiteExpID: prevExp.ID,
						PrerequisiteExpNo: prevExp.ExperimentNo,
						PrerequisiteTitle: prevExp.Title,
						Notes:             fmt.Sprintf("Locked: Complete Experiment %d (%s) first.", prevExp.ExperimentNo, prevExp.Title),
					}
				}
			}
		}
	}

	// 1. Check if an individual student override exists
	var studentUnlock models.LabExperimentUnlock
	if err := database.DB.Where("course_id = ? AND experiment_id = ? AND student_id = ?", courseID, expID, userID).First(&studentUnlock).Error; err == nil {
		if !studentUnlock.IsUnlocked {
			return StudentUnlockStatus{
				IsUnlocked:        false,
				Section:           section,
				Status:            "LOCKED",
				StartsAt:          studentUnlock.StartsAt,
				EndsAt:            studentUnlock.EndsAt,
				IsStudentOverride: true,
				MaxAttempts:       studentUnlock.MaxAttempts,
				Notes:             studentUnlock.Notes,
			}
		}
		if studentUnlock.StartsAt != nil && now.Before(*studentUnlock.StartsAt) {
			return StudentUnlockStatus{
				IsUnlocked:        false,
				Section:           section,
				Status:            "UPCOMING",
				StartsAt:          studentUnlock.StartsAt,
				EndsAt:            studentUnlock.EndsAt,
				IsStudentOverride: true,
				MaxAttempts:       studentUnlock.MaxAttempts,
				Notes:             studentUnlock.Notes,
			}
		}
		if studentUnlock.EndsAt != nil && now.After(*studentUnlock.EndsAt) {
			return StudentUnlockStatus{
				IsUnlocked:        false,
				Section:           section,
				Status:            "EXPIRED",
				StartsAt:          studentUnlock.StartsAt,
				EndsAt:            studentUnlock.EndsAt,
				IsStudentOverride: true,
				MaxAttempts:       studentUnlock.MaxAttempts,
				Notes:             studentUnlock.Notes,
			}
		}
		return StudentUnlockStatus{
			IsUnlocked:        true,
			Section:           section,
			Status:            "OPEN",
			StartsAt:          studentUnlock.StartsAt,
			EndsAt:            studentUnlock.EndsAt,
			IsStudentOverride: true,
			MaxAttempts:       studentUnlock.MaxAttempts,
			Notes:             studentUnlock.Notes,
		}
	}

	// 2. Check Section or ALL rule (where student_id is null or 0)
	var sectionUnlock models.LabExperimentUnlock
	query := database.DB.Where("course_id = ? AND experiment_id = ? AND (student_id IS NULL OR student_id = 0) AND is_unlocked = ?", courseID, expID, true)
	if section != "" {
		query = query.Where("section IN (?, 'ALL')", section)
	} else {
		query = query.Where("section = 'ALL'")
	}

	if err := query.Order("CASE WHEN section = 'ALL' THEN 1 ELSE 0 END ASC").First(&sectionUnlock).Error; err == nil {
		if sectionUnlock.StartsAt != nil && now.Before(*sectionUnlock.StartsAt) {
			return StudentUnlockStatus{
				IsUnlocked:  false,
				Section:     section,
				Status:      "UPCOMING",
				StartsAt:    sectionUnlock.StartsAt,
				EndsAt:      sectionUnlock.EndsAt,
				MaxAttempts: sectionUnlock.MaxAttempts,
				Notes:       sectionUnlock.Notes,
			}
		}
		if sectionUnlock.EndsAt != nil && now.After(*sectionUnlock.EndsAt) {
			return StudentUnlockStatus{
				IsUnlocked:  false,
				Section:     section,
				Status:      "EXPIRED",
				StartsAt:    sectionUnlock.StartsAt,
				EndsAt:      sectionUnlock.EndsAt,
				MaxAttempts: sectionUnlock.MaxAttempts,
				Notes:       sectionUnlock.Notes,
			}
		}
		return StudentUnlockStatus{
			IsUnlocked:  true,
			Section:     section,
			Status:      "OPEN",
			StartsAt:    sectionUnlock.StartsAt,
			EndsAt:      sectionUnlock.EndsAt,
			MaxAttempts: sectionUnlock.MaxAttempts,
			Notes:       sectionUnlock.Notes,
		}
	}

	return StudentUnlockStatus{IsUnlocked: false, Section: section, Status: "LOCKED"}
}

// isExperimentUnlockedForStudent checks if an experiment is unlocked for the user's section or override
func isExperimentUnlockedForStudent(courseID uint, expID uint, userID uint, userRole string) (bool, string) {
	status := getStudentExperimentAccess(courseID, expID, userID, userRole)
	return status.IsUnlocked, status.Section
}

// isExperimentUnlockedForSubmission checks unlock status with a 120-second grace period to safely process auto-submissions when timer expires
func isExperimentUnlockedForSubmission(courseID uint, expID uint, userID uint, userRole string) (bool, string) {
	role := strings.ToLower(userRole)
	if role == "admin" || role == "faculty" || role == "faculty_incharge" {
		return true, "FACULTY/ADMIN"
	}

	var exp models.LabExperiment
	if err := database.DB.Select("id, is_active").First(&exp, expID).Error; err == nil && !exp.IsActive {
		return false, "INACTIVE"
	}

	var user models.User
	if err := database.DB.Select("id, section, role").First(&user, userID).Error; err != nil {
		return false, "UNKNOWN"
	}

	section := strings.TrimSpace(user.Section)
	now := time.Now()
	graceBuffer := 120 * time.Second

	// 1. Check if an individual student override exists
	var studentUnlock models.LabExperimentUnlock
	if err := database.DB.Where("course_id = ? AND experiment_id = ? AND student_id = ?", courseID, expID, userID).First(&studentUnlock).Error; err == nil {
		if !studentUnlock.IsUnlocked {
			return false, section
		}
		if studentUnlock.StartsAt != nil && now.Before(*studentUnlock.StartsAt) {
			return false, section
		}
		if studentUnlock.EndsAt != nil && now.After(studentUnlock.EndsAt.Add(graceBuffer)) {
			return false, section
		}
		return true, section
	}

	// 2. Check Section or ALL rule (where student_id is null or 0)
	var sectionUnlock models.LabExperimentUnlock
	query := database.DB.Where("course_id = ? AND experiment_id = ? AND (student_id IS NULL OR student_id = 0) AND is_unlocked = ?", courseID, expID, true)
	if section != "" {
		query = query.Where("section IN (?, 'ALL')", section)
	} else {
		query = query.Where("section = 'ALL'")
	}

	if err := query.Order("CASE WHEN section = 'ALL' THEN 1 ELSE 0 END ASC").First(&sectionUnlock).Error; err == nil {
		if sectionUnlock.StartsAt != nil && now.Before(*sectionUnlock.StartsAt) {
			return false, section
		}
		if sectionUnlock.EndsAt != nil && now.After(sectionUnlock.EndsAt.Add(graceBuffer)) {
			return false, section
		}
		return true, section
	}

	return false, section
}

// isSectionMatch checks whether a mapped section (e.g. "ALL", "CSE-A", "A", "Section A") matches a student's assigned section
func isSectionMatch(mappedSec, studentSec string) bool {
	m := strings.TrimSpace(strings.ToLower(mappedSec))
	s := strings.TrimSpace(strings.ToLower(studentSec))
	if m == "" || s == "" {
		return false
	}
	if m == "all" || s == "all" {
		return true
	}
	if m == s {
		return true
	}
	mClean := strings.TrimPrefix(m, "section ")
	sClean := strings.TrimPrefix(s, "section ")
	if mClean == sClean {
		return true
	}
	if strings.Contains(sClean, "-") {
		parts := strings.Split(sClean, "-")
		if parts[len(parts)-1] == mClean {
			return true
		}
	}
	if strings.Contains(mClean, "-") {
		parts := strings.Split(mClean, "-")
		if parts[len(parts)-1] == sClean {
			return true
		}
	}
	return strings.Contains(sClean, mClean) || strings.Contains(mClean, sClean)
}

// GetStudentLabCourses returns active lab courses for student with assigned faculty, sections, and progress statistics
func GetStudentLabCourses(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	userIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	userID, _ := userIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var courses []models.LabCourse
	if err := database.DB.Order("title asc").Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lab courses"})
		return
	}

	for i := range courses {
		if strings.TrimSpace(courses[i].Regulation) == "" {
			if courses[i].AcademicYear != "" && !strings.Contains(courses[i].AcademicYear, "-") {
				courses[i].Regulation = courses[i].AcademicYear
			} else {
				courses[i].Regulation = "2022"
			}
		}
	}

	var mappings []models.LabMapping
	database.DB.Preload("Faculty").Find(&mappings)

	// Fetch current user details if student
	var currentUser models.User
	studentSection := ""
	if userID > 0 {
		database.DB.First(&currentUser, userID)
		studentSection = strings.TrimSpace(currentUser.Section)
	}

	// Determine assigned courses for student users
	assignedCourseIDs := make(map[uint]bool)
	isStudentRole := strings.ToLower(userRole) == "student" || strings.ToLower(userRole) == "user"

	type SubStat struct {
		CompletedCount int
		EarnedMarks    int
	}
	studentStats := make(map[uint]*SubStat)

	if userID > 0 {
		var submissions []models.LabSubmission
		database.DB.Preload("Experiment").Where("student_id = ?", userID).Find(&submissions)
		for _, sub := range submissions {
			cID := sub.Experiment.CourseID
			if cID > 0 {
				if studentStats[cID] == nil {
					studentStats[cID] = &SubStat{}
				}
				if sub.Status == "APPROVED" {
					studentStats[cID].CompletedCount++
					studentStats[cID].EarnedMarks += sub.Marks
				}
			}
		}
	}

	if isStudentRole {
		for _, m := range mappings {
			sec := strings.TrimSpace(m.Section)
			if strings.ToUpper(sec) == "ALL" {
				assignedCourseIDs[m.CourseID] = true
			} else if studentSection != "" && isSectionMatch(sec, studentSection) {
				assignedCourseIDs[m.CourseID] = true
			}
		}

		// Also include courses with existing submissions or question allocations
		for cID := range studentStats {
			assignedCourseIDs[cID] = true
		}

		var allocCourseIDs []uint
		database.DB.Model(&models.LabQuestionAllocation{}).Where("student_id = ?", userID).Distinct().Pluck("course_id", &allocCourseIDs)
		for _, cID := range allocCourseIDs {
			assignedCourseIDs[cID] = true
		}
	}

	// Build maps of courseID -> faculty names & sections
	courseFacultyMap := make(map[uint][]string)
	courseSectionMap := make(map[uint][]string)
	for _, m := range mappings {
		if m.Faculty.Name != "" {
			exists := false
			for _, fn := range courseFacultyMap[m.CourseID] {
				if fn == m.Faculty.Name {
					exists = true
					break
				}
			}
			if !exists {
				courseFacultyMap[m.CourseID] = append(courseFacultyMap[m.CourseID], m.Faculty.Name)
			}
		}
		if m.Section != "" {
			exists := false
			for _, sec := range courseSectionMap[m.CourseID] {
				if sec == m.Section {
					exists = true
					break
				}
			}
			if !exists {
				courseSectionMap[m.CourseID] = append(courseSectionMap[m.CourseID], m.Section)
			}
		}
	}

	type EnhancedCourse struct {
		models.LabCourse
		AssignedFaculty  []string `json:"assigned_faculty"`
		AssignedSections []string `json:"assigned_sections"`
		CompletedExps    int      `json:"completed_experiments"`
		EarnedMarks      int      `json:"earned_marks"`
		OverallPct       float64  `json:"overall_pct"`
	}

	var result []EnhancedCourse
	for _, course := range courses {
		// Filter out unassigned courses for students if lab mappings exist in system
		if isStudentRole && len(mappings) > 0 {
			if !assignedCourseIDs[course.ID] {
				continue
			}
		}

		facs := courseFacultyMap[course.ID]
		if facs == nil {
			facs = []string{}
		}
		secs := courseSectionMap[course.ID]
		if secs == nil {
			secs = []string{}
		}

		completed := 0
		marks := 0
		if st, ok := studentStats[course.ID]; ok {
			completed = st.CompletedCount
			marks = st.EarnedMarks
		}

		total := course.TotalExperiments
		if total <= 0 {
			total = 7
		}

		pct := 0.0
		if completed > 0 && total > 0 {
			pct = (float64(completed) / float64(total)) * 100.0
			if pct > 100.0 {
				pct = 100.0
			}
		}

		result = append(result, EnhancedCourse{
			LabCourse:        course,
			AssignedFaculty:  facs,
			AssignedSections: secs,
			CompletedExps:    completed,
			EarnedMarks:      marks,
			OverallPct:       float64(int(pct*10)) / 10.0,
		})
	}

	// Search filter
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	if search != "" {
		var filtered []EnhancedCourse
		for _, item := range result {
			if strings.Contains(strings.ToLower(item.Title), search) ||
				strings.Contains(strings.ToLower(item.CourseCode), search) ||
				strings.Contains(strings.ToLower(item.Department), search) {
				filtered = append(filtered, item)
			}
		}
		result = filtered
	}

	totalCount := len(result)
	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "10"))

	page := 1
	limit := 10
	if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l >= 1 {
		limit = l
	}

	var paginated []EnhancedCourse
	if limitStr == "all" || limitStr == "0" || limitStr == "-1" {
		paginated = result
		limit = totalCount
		if limit == 0 {
			limit = 1
		}
	} else {
		start := (page - 1) * limit
		if start < totalCount {
			end := start + limit
			if end > totalCount {
				end = totalCount
			}
			paginated = result[start:end]
		} else {
			paginated = []EnhancedCourse{}
		}
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int(math.Ceil(float64(totalCount) / float64(limit)))
	}

	var allSections []string
	database.DB.Model(&models.User{}).
		Where("section IS NOT NULL AND section != '' AND LOWER(role) IN ?", []string{"student", "user"}).
		Distinct().
		Pluck("section", &allSections)

	c.JSON(http.StatusOK, gin.H{
		"courses":     paginated,
		"sections":    allSections,
		"role":        userRole,
		"total":       totalCount,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

// GetCourseExperimentsForStudent returns experiments of a course with student-specific unlock status
func GetCourseExperimentsForStudent(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var experiments []models.LabExperiment
	if err := database.DB.Where("course_id = ?", courseID).Order("experiment_no asc").Find(&experiments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch experiments"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	userID, _ := userIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	type ExpItem struct {
		models.LabExperiment
		IsUnlocked   bool                  `json:"is_unlocked"`
		UnlockStatus StudentUnlockStatus   `json:"unlock_status"`
		Submission   *models.LabSubmission `json:"submission,omitempty"`
	}

	var results []ExpItem
	for _, exp := range experiments {
		status := getStudentExperimentAccess(uint(courseID), exp.ID, userID, userRole)

		var sub models.LabSubmission
		var subPtr *models.LabSubmission
		if err := database.DB.Where("student_id = ? AND experiment_id = ?", userID, exp.ID).Order("created_at desc").First(&sub).Error; err == nil {
			subPtr = &sub
		}

		// Security: Never leak hidden test cases to student in list API
		exp.HiddenTestCases = ""

		results = append(results, ExpItem{
			LabExperiment: exp,
			IsUnlocked:    status.IsUnlocked,
			UnlockStatus:  status,
			Submission:    subPtr,
		})
	}

	// Search filter
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	if search != "" {
		var filtered []ExpItem
		for _, item := range results {
			if strings.Contains(strings.ToLower(item.Title), search) ||
				strings.Contains(strings.ToLower(item.Aim), search) ||
				strings.Contains(strconv.Itoa(item.ExperimentNo), search) {
				filtered = append(filtered, item)
			}
		}
		results = filtered
	}

	totalCount := len(results)
	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "12"))

	page := 1
	limit := 12
	if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l >= 1 {
		limit = l
	}

	var paginated []ExpItem
	if limitStr == "all" || limitStr == "0" || limitStr == "-1" {
		paginated = results
		limit = totalCount
		if limit == 0 {
			limit = 1
		}
	} else {
		start := (page - 1) * limit
		if start < totalCount {
			end := start + limit
			if end > totalCount {
				end = totalCount
			}
			paginated = results[start:end]
		} else {
			paginated = []ExpItem{}
		}
	}

	totalPages := 1
	if limit > 0 && totalCount > 0 {
		totalPages = int(math.Ceil(float64(totalCount) / float64(limit)))
	}

	c.JSON(http.StatusOK, gin.H{
		"experiments": paginated,
		"total":       totalCount,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

// getOrAllocateQuestionForStudent deterministically retrieves or allocates a question variant for a student
func getOrAllocateQuestionForStudent(courseID uint, expID uint, studentID uint) (*models.LabExperimentQuestion, error) {
	database.EnsureLabTables(database.DB)
	// Check if already allocated
	var alloc models.LabQuestionAllocation
	err := database.DB.Where("student_id = ? AND course_id = ? AND experiment_id = ?", studentID, courseID, expID).First(&alloc).Error
	if err == nil && alloc.QuestionID > 0 {
		var q models.LabExperimentQuestion
		if err := database.DB.First(&q, alloc.QuestionID).Error; err == nil {
			return &q, nil
		}
	}

	// Fetch active question variants for this experiment
	var questions []models.LabExperimentQuestion
	database.DB.Where("experiment_id = ? AND is_active = ?", expID, true).Order("id asc").Find(&questions)
	if len(questions) == 0 {
		database.DB.Where("experiment_id = ?", expID).Order("id asc").Find(&questions)
	}

	if len(questions) == 0 {
		// Auto-create initial default question variant from parent experiment
		var parentExp models.LabExperiment
		if err := database.DB.First(&parentExp, expID).Error; err == nil {
			q := models.LabExperimentQuestion{
				ExperimentID:       parentExp.ID,
				CourseID:           parentExp.CourseID,
				QuestionCode:       fmt.Sprintf("EX%d_VAR_A", parentExp.ExperimentNo),
				Title:              parentExp.Title,
				Aim:                parentExp.Aim,
				ReferenceAlgorithm: parentExp.Procedure,
				SolutionCode:       parentExp.StarterCode,
				Language:           parentExp.Language,
				SampleTestCases:    parentExp.SampleTestCases,
				HiddenTestCases:    parentExp.HiddenTestCases,
				MaxMarks:           parentExp.MaxMarks,
				VivaQuestionsCount: 5,
				IsActive:           true,
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}
			database.DB.Create(&q)
			questions = append(questions, q)
		}
	}

	if len(questions) == 0 {
		return nil, fmt.Errorf("no question variants configured for experiment %d", expID)
	}

	// Deterministic random selection for this student
	seed := time.Now().UnixNano() + int64(studentID*1000) + int64(expID)
	r := rand.New(rand.NewSource(seed))
	selectedQ := questions[r.Intn(len(questions))]

	// Save allocation lock
	newAlloc := models.LabQuestionAllocation{
		StudentID:    studentID,
		CourseID:     courseID,
		ExperimentID: expID,
		QuestionID:   selectedQ.ID,
		AllocatedAt:  time.Now(),
	}
	database.DB.Create(&newAlloc)

	return &selectedQ, nil
}

// GetExperimentDetails returns problem, allocated question, procedure, sample test cases for student
func GetExperimentDetails(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	var exp models.LabExperiment
	if err := database.DB.First(&exp, expID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	userID, _ := userIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	accessStatus := getStudentExperimentAccess(exp.CourseID, exp.ID, userID, userRole)

	// Fetch or Allocate Question Variant for Student
	assignedQ, qErr := getOrAllocateQuestionForStudent(exp.CourseID, exp.ID, userID)
	if qErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to allocate question: " + qErr.Error()})
		return
	}

	// Sanitized experiment payload (NEVER leak HiddenTestCases to student)
	safeExperiment := gin.H{
		"id":                exp.ID,
		"course_id":         exp.CourseID,
		"experiment_no":     exp.ExperimentNo,
		"title":             exp.Title,
		"aim":               exp.Aim,
		"procedure":         exp.Procedure,
		"language":          exp.Language,
		"starter_code":      exp.StarterCode,
		"sample_test_cases": exp.SampleTestCases,
		"max_marks":         exp.MaxMarks,
		"is_active":         exp.IsActive,
		"created_at":        exp.CreatedAt,
		"updated_at":        exp.UpdatedAt,
	}

	// Sanitized question payload for student (NEVER send SolutionCode or HiddenTestCases to student)
	safeQuestion := gin.H{
		"id":                   assignedQ.ID,
		"experiment_id":        assignedQ.ExperimentID,
		"course_id":            assignedQ.CourseID,
		"question_code":        assignedQ.QuestionCode,
		"title":                assignedQ.Title,
		"aim":                  assignedQ.Aim,
		"language":             assignedQ.Language,
		"sample_test_cases":    assignedQ.SampleTestCases,
		"max_marks":            assignedQ.MaxMarks,
		"viva_questions_count": assignedQ.VivaQuestionsCount,
	}

	// Fetch student's latest submission if exists
	var submission models.LabSubmission
	var subPtr *models.LabSubmission
	if err := database.DB.Where("student_id = ? AND experiment_id = ?", userID, exp.ID).Order("created_at desc").First(&submission).Error; err == nil {
		subPtr = &submission
	}

	c.JSON(http.StatusOK, gin.H{
		"experiment":        safeExperiment,
		"assigned_question": safeQuestion,
		"submission":        subPtr,
		"is_unlocked":       accessStatus.IsUnlocked,
		"user_section":      accessStatus.Section,
		"access_status":     accessStatus,
	})
}

type CodeExecutionRequest struct {
	Code        string `json:"code" binding:"required"`
	Language    string `json:"language" binding:"required"`
	CustomInput string `json:"custom_input"`
	UseCustom   bool   `json:"use_custom"`
}

type RawTestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	Expected       string `json:"expected"`
}

// RunExperimentCode executes student code against SAMPLE test cases only without grading
func RunExperimentCode(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	userID, _ := userIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var exp models.LabExperiment
	if err := database.DB.First(&exp, expID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	unlocked, _ := isExperimentUnlockedForStudent(exp.CourseID, exp.ID, userID, userRole)
	if !unlocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "This experiment is currently locked by your faculty incharge."})
		return
	}

	var req CodeExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code and Language are required"})
		return
	}

	assignedQ, qErr := getOrAllocateQuestionForStudent(exp.CourseID, exp.ID, userID)
	if qErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve assigned question"})
		return
	}

	// Enforce configured language engine (e.g. python, cpp, java)
	requiredLang := strings.TrimSpace(assignedQ.Language)
	if requiredLang == "" {
		requiredLang = strings.TrimSpace(exp.Language)
	}
	if requiredLang != "" && strings.ToLower(requiredLang) != "all" {
		req.Language = strings.ToLower(requiredLang)
	}

	// If custom input was provided, run directly with custom stdin
	if req.UseCustom {
		res, execErr := ExecuteCustomInput(req.Code, req.Language, req.CustomInput)
		if execErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Execution error: " + execErr.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success":          true,
			"is_custom":        true,
			"custom_input":     req.CustomInput,
			"custom_output":    res.Actual,
			"results":          []EvalResult{res},
			"pass_count":       1,
			"total_test_cases": 1,
		})
		return
	}

	// Parse Sample Test Cases from assigned question
	var rawCases []RawTestCase
	sampleSrc := assignedQ.SampleTestCases
	if sampleSrc == "" {
		sampleSrc = exp.SampleTestCases
	}
	if sampleSrc != "" {
		_ = json.Unmarshal([]byte(sampleSrc), &rawCases)
	}

	var evalCases []EvalTestCase
	if len(rawCases) == 0 {
		evalCases = append(evalCases, EvalTestCase{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "",
			ExpectedOutput: "",
		})
	} else {
		for i, rc := range rawCases {
			expOut := rc.ExpectedOutput
			if expOut == "" {
				expOut = rc.Expected
			}
			evalCases = append(evalCases, EvalTestCase{
				Index:          i + 1,
				IsHidden:       false,
				Name:           fmt.Sprintf("Sample Case %d", i+1),
				Input:          rc.Input,
				ExpectedOutput: expOut,
			})
		}
	}

	results, execErr := ExecuteTestCases(req.Code, req.Language, evalCases)
	if execErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Execution error: " + execErr.Error()})
		return
	}

	passCount := 0
	for _, r := range results {
		if r.Passed {
			passCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"results":          results,
		"pass_count":       passCount,
		"total_test_cases": len(results),
	})
}

// SubmitExperimentCode evaluates student code against HIDDEN test cases and records progress
func SubmitExperimentCode(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	studentID, _ := userIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var exp models.LabExperiment
	if err := database.DB.First(&exp, expID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	unlocked, _ := isExperimentUnlockedForSubmission(exp.CourseID, exp.ID, studentID, userRole)
	if !unlocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "This experiment is currently locked by your faculty incharge."})
		return
	}

	var req CodeExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code and Language are required"})
		return
	}

	assignedQ, qErr := getOrAllocateQuestionForStudent(exp.CourseID, exp.ID, studentID)
	if qErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve assigned question"})
		return
	}

	// Enforce configured language engine (e.g. python, cpp, java)
	requiredLang := strings.TrimSpace(assignedQ.Language)
	if requiredLang == "" {
		requiredLang = strings.TrimSpace(exp.Language)
	}
	if requiredLang != "" && strings.ToLower(requiredLang) != "all" {
		req.Language = strings.ToLower(requiredLang)
	}

	// Parse Sample Test Cases from assigned question (fallback to exp)
	var sampleCases []RawTestCase
	sampleSrc := assignedQ.SampleTestCases
	if sampleSrc == "" {
		sampleSrc = exp.SampleTestCases
	}
	if sampleSrc != "" {
		_ = json.Unmarshal([]byte(sampleSrc), &sampleCases)
	}

	// Parse Hidden Test Cases from assigned question (fallback to exp)
	var hiddenCases []RawTestCase
	hiddenSrc := assignedQ.HiddenTestCases
	if hiddenSrc == "" {
		hiddenSrc = exp.HiddenTestCases
	}
	if hiddenSrc != "" {
		_ = json.Unmarshal([]byte(hiddenSrc), &hiddenCases)
	}

	var evalCases []EvalTestCase
	caseIdx := 1

	for i, sc := range sampleCases {
		expOut := sc.ExpectedOutput
		if expOut == "" {
			expOut = sc.Expected
		}
		evalCases = append(evalCases, EvalTestCase{
			Index:          caseIdx,
			IsHidden:       false,
			Name:           fmt.Sprintf("Sample Case %d", i+1),
			Input:          sc.Input,
			ExpectedOutput: expOut,
		})
		caseIdx++
	}

	for j, hc := range hiddenCases {
		expOut := hc.ExpectedOutput
		if expOut == "" {
			expOut = hc.Expected
		}
		evalCases = append(evalCases, EvalTestCase{
			Index:          caseIdx,
			IsHidden:       true,
			Name:           fmt.Sprintf("Hidden Case %d", j+1),
			Input:          hc.Input,
			ExpectedOutput: expOut,
		})
		caseIdx++
	}

	if len(evalCases) == 0 {
		evalCases = append(evalCases, EvalTestCase{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "",
			ExpectedOutput: "",
		})
	}

	results, execErr := ExecuteTestCases(req.Code, req.Language, evalCases)
	if execErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Execution error: " + execErr.Error()})
		return
	}

	totalCases := len(results)
	passCount := 0
	var logs []string
	type SafeResultItem struct {
		Index       int    `json:"index"`
		Name        string `json:"name"`
		Passed      bool   `json:"passed"`
		ExecutionMs int    `json:"execution_ms"`
		IsHidden    bool   `json:"is_hidden"`
		Input       string `json:"input,omitempty"`
		Expected    string `json:"expected,omitempty"`
		Actual      string `json:"actual,omitempty"`
	}
	var sanitizedResults []SafeResultItem

	for _, r := range results {
		if r.Passed {
			passCount++
			logs = append(logs, fmt.Sprintf("✓ %s Passed (%d ms)", r.Name, r.ExecutionMs))
		} else {
			logs = append(logs, fmt.Sprintf("✗ %s Failed", r.Name))
		}

		if r.IsHidden {
			sanitizedResults = append(sanitizedResults, SafeResultItem{
				Index:       r.Index,
				Name:        r.Name,
				Passed:      r.Passed,
				ExecutionMs: r.ExecutionMs,
				IsHidden:    true,
				Input:       "",
				Expected:    "",
				Actual:      "",
			})
		} else {
			sanitizedResults = append(sanitizedResults, SafeResultItem{
				Index:       r.Index,
				Name:        r.Name,
				Passed:      r.Passed,
				ExecutionMs: r.ExecutionMs,
				IsHidden:    false,
				Input:       r.Input,
				Expected:    r.Expected,
				Actual:      r.Actual,
			})
		}
	}

	// Calculate Program & Output marks (out of 45 by default or according to course rubric)
	programMaxMarks := 45
	var course models.LabCourse
	if exp.CourseID > 0 && database.DB.First(&course, exp.CourseID).Error == nil {
		if course.EvaluationRubric != "" {
			var rubricItems []struct {
				Key      string `json:"key"`
				MaxMarks int    `json:"max_marks"`
			}
			if err := json.Unmarshal([]byte(course.EvaluationRubric), &rubricItems); err == nil {
				for _, item := range rubricItems {
					if item.Key == "program" && item.MaxMarks > 0 {
						programMaxMarks = item.MaxMarks
						break
					}
				}
			}
		}
	}

	codeMarks := 0
	if totalCases > 0 {
		codeMarks = int(math.Round(float64(passCount) / float64(totalCases) * float64(programMaxMarks)))
	}

	// Save or update LabSubmission
	var sub models.LabSubmission
	findErr := database.DB.Where("student_id = ? AND experiment_id = ?", studentID, exp.ID).First(&sub).Error

	sub.StudentID = studentID
	sub.ExperimentID = exp.ID
	sub.QuestionID = assignedQ.ID
	sub.SubmittedCode = req.Code
	sub.Language = req.Language
	sub.ExecutionOutput = strings.Join(logs, "\n")
	sub.PassCount = passCount
	sub.TotalTestCases = totalCases
	sub.CodeMarks = codeMarks

	// Auto-populate MarksBreakdown with calculated program marks in DB
	var breakdownMap map[string]interface{}
	if sub.MarksBreakdown != "" {
		_ = json.Unmarshal([]byte(sub.MarksBreakdown), &breakdownMap)
	}
	if breakdownMap == nil {
		breakdownMap = make(map[string]interface{})
	}
	breakdownMap["program"] = codeMarks
	breakdownJSON, _ := json.Marshal(breakdownMap)
	sub.MarksBreakdown = string(breakdownJSON)

	if sub.Status != "SUBMITTED_FOR_VERIFICATION" && sub.Status != "APPROVED" {
		if passCount == totalCases {
			sub.Status = "TEST_PASSED"
		} else {
			sub.Status = "DRAFT"
		}
	}

	// Note: Running/submitting code does NOT count as an attempt; attempts are counted on Finish & Send
	if findErr != nil {
		sub.AttemptCount = 0
		database.DB.Create(&sub)
	} else {
		database.DB.Save(&sub)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Code submitted and test cases executed successfully!",
		"pass_count":       passCount,
		"total_test_cases": totalCases,
		"status":           sub.Status,
		"results":          sanitizedResults,
	})
}

type SaveProcedureReq struct {
	Procedure string `json:"procedure" binding:"required"` // JSON array string or raw text
}

// SaveStudentProcedure persists student's written step-by-step algorithm
func SaveStudentProcedure(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	studentID, _ := userIDVal.(uint)

	var req SaveProcedureReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Procedure steps are required"})
		return
	}

	var exp models.LabExperiment
	if err := database.DB.First(&exp, expID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	assignedQ, _ := getOrAllocateQuestionForStudent(exp.CourseID, exp.ID, studentID)
	qID := uint(0)
	if assignedQ != nil {
		qID = assignedQ.ID
	}

	var sub models.LabSubmission
	findErr := database.DB.Where("student_id = ? AND experiment_id = ?", studentID, exp.ID).First(&sub).Error

	sub.StudentID = studentID
	sub.ExperimentID = exp.ID
	if qID > 0 {
		sub.QuestionID = qID
	}
	sub.StudentProcedure = req.Procedure

	if findErr != nil {
		if sub.SubmittedCode == "" {
			sub.SubmittedCode = "# Solution placeholder"
			sub.Language = "python"
			sub.Status = "DRAFT"
		}
		database.DB.Create(&sub)
	} else {
		database.DB.Save(&sub)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Step-by-step algorithm saved successfully!",
		"submission": sub,
	})
}

// RecordTabSwitch increments and records tab switch / blur count for student during experiment assessment
func RecordTabSwitch(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	studentID, _ := userIDVal.(uint)

	var sub models.LabSubmission
	findErr := database.DB.Where("student_id = ? AND experiment_id = ?", studentID, expID).First(&sub).Error
	if findErr != nil {
		var exp models.LabExperiment
		if err := database.DB.First(&exp, expID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
			return
		}
		assignedQ, _ := getOrAllocateQuestionForStudent(exp.CourseID, exp.ID, studentID)
		qID := uint(0)
		if assignedQ != nil {
			qID = assignedQ.ID
		}
		sub = models.LabSubmission{
			StudentID:      studentID,
			ExperimentID:   uint(expID),
			QuestionID:     qID,
			Language:       exp.Language,
			SubmittedCode:  "",
			Status:         "DRAFT",
			TabSwitchCount: 1,
		}
		database.DB.Create(&sub)
	} else {
		sub.TabSwitchCount++
		database.DB.Model(&sub).Update("tab_switch_count", sub.TabSwitchCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"tab_switch_count": sub.TabSwitchCount,
	})
}

// FinishAndSendForVerification locks the student's submission, draws random viva questions, and queues for faculty
func FinishAndSendForVerification(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	studentID, _ := userIDVal.(uint)

	var exp models.LabExperiment
	if err := database.DB.First(&exp, expID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	var sub models.LabSubmission
	if err := database.DB.Where("student_id = ? AND experiment_id = ?", studentID, exp.ID).First(&sub).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please execute and submit your code before finishing the experiment."})
		return
	}

	if strings.TrimSpace(sub.SubmittedCode) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Submitted code cannot be empty."})
		return
	}

	assignedQ, _ := getOrAllocateQuestionForStudent(exp.CourseID, exp.ID, studentID)
	qID := exp.ID
	vivaCount := 5
	if assignedQ != nil {
		qID = assignedQ.ID
		if assignedQ.VivaQuestionsCount > 0 {
			vivaCount = assignedQ.VivaQuestionsCount
		}
	}

	// Fetch all Viva questions in pool for this question
	var vivaPool []models.LabVivaQuestion
	database.DB.Where("question_id = ?", qID).Order("order_index asc, id asc").Find(&vivaPool)
	if len(vivaPool) == 0 {
		database.DB.Where("experiment_id = ?", exp.ID).Order("order_index asc, id asc").Find(&vivaPool)
	}

	// Randomly pick N viva questions
	var selectedVivas []models.LabVivaQuestion
	if len(vivaPool) <= vivaCount {
		selectedVivas = vivaPool
	} else {
		// Shuffle
		r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(studentID)))
		perm := r.Perm(len(vivaPool))
		for i := 0; i < vivaCount; i++ {
			selectedVivas = append(selectedVivas, vivaPool[perm[i]])
		}
	}

	vivaJSON, _ := json.Marshal(selectedVivas)
	sub.VivaQuestionsAsked = string(vivaJSON)

	// Attempt & Revision Lifecycle Handling:
	// - If student was in revision mode (faculty requested revision), do NOT increase AttemptCount.
	// - If fresh submission / new assessment round, increase AttemptCount by +1.
	isRevision := sub.Status == "REVISION_REQUESTED" || sub.IsUnderRevision
	if isRevision {
		sub.RevisionCount += 1
		sub.IsUnderRevision = false
	} else {
		if sub.AttemptCount == 0 {
			sub.AttemptCount = 1
		} else {
			sub.AttemptCount += 1
		}
	}
	now := time.Now()
	sub.LastSubmittedAt = &now

	// Ensure auto-calculated Program & Output marks are saved into MarksBreakdown
	if sub.TotalTestCases > 0 {
		progMax := 45
		if exp.CourseID > 0 {
			var course models.LabCourse
			if database.DB.First(&course, exp.CourseID).Error == nil && course.EvaluationRubric != "" {
				var rubricItems []struct {
					Key      string `json:"key"`
					MaxMarks int    `json:"max_marks"`
				}
				if err := json.Unmarshal([]byte(course.EvaluationRubric), &rubricItems); err == nil {
					for _, item := range rubricItems {
						if item.Key == "program" && item.MaxMarks > 0 {
							progMax = item.MaxMarks
							break
						}
					}
				}
			}
		}
		autoProgMarks := int(math.Round(float64(sub.PassCount) / float64(sub.TotalTestCases) * float64(progMax)))
		sub.CodeMarks = autoProgMarks

		var breakdownMap map[string]interface{}
		if sub.MarksBreakdown != "" {
			_ = json.Unmarshal([]byte(sub.MarksBreakdown), &breakdownMap)
		}
		if breakdownMap == nil {
			breakdownMap = make(map[string]interface{})
		}
		breakdownMap["program"] = autoProgMarks
		breakdownJSON, _ := json.Marshal(breakdownMap)
		sub.MarksBreakdown = string(breakdownJSON)
	}

	sub.Status = "SUBMITTED_FOR_VERIFICATION"
	database.DB.Save(&sub)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Experiment submitted for faculty verification! Please meet your lab faculty for viva voce evaluation.",
		"submission": sub,
		"status":     sub.Status,
	})
}

// GetFacultyQueue returns assigned student submissions for Lab Incharge
func GetFacultyQueue(c *gin.Context) {
	facultyIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	facultyID := facultyIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var mappings []models.LabMapping
	if strings.ToLower(userRole) == "admin" {
		database.DB.Preload("Course").Preload("Faculty").Find(&mappings)
	} else {
		database.DB.Where("faculty_id = ?", facultyID).Find(&mappings)
	}

	var submissions []models.LabSubmission
	database.DB.Preload("Student").Preload("Experiment").Preload("Question").Order("updated_at desc").Find(&submissions)

	// Compute Semester Batch Sign-Off summaries grouped by (student_id, course_id)
	var allExperiments []models.LabExperiment
	database.DB.Find(&allExperiments)
	courseExpCountMap := make(map[uint]int)
	for _, e := range allExperiments {
		courseExpCountMap[e.CourseID]++
	}

	// Fetch course titles
	var allCourses []models.LabCourse
	database.DB.Find(&allCourses)
	courseMap := make(map[uint]models.LabCourse)
	for _, c := range allCourses {
		courseMap[c.ID] = c
	}

	// Fetch existing LabRecords for signed status
	var allLabRecords []models.LabRecord
	database.DB.Find(&allLabRecords)
	recordMap := make(map[string]models.LabRecord)
	for _, r := range allLabRecords {
		key := fmt.Sprintf("%d_%d", r.StudentID, r.CourseID)
		recordMap[key] = r
	}

	type SemesterStudentItem struct {
		StudentID        uint        `json:"student_id"`
		Student          models.User `json:"student"`
		CourseID         uint        `json:"course_id"`
		CourseTitle      string      `json:"course_title"`
		CourseCode       string      `json:"course_code"`
		Section          string      `json:"section"`
		TotalExperiments int         `json:"total_experiments"`
		CompletedCount   int         `json:"completed_count"`
		ApprovedCount    int         `json:"approved_count"`
		AllFinished      bool        `json:"all_finished"`
		IsSemesterSigned bool        `json:"is_semester_signed"`
		SignatureHash    string      `json:"signature_hash,omitempty"`
		ApprovedAt       *time.Time  `json:"approved_at,omitempty"`
	}

	studentCourseMap := make(map[string]*SemesterStudentItem)
	var orderedKeys []string

	for _, sub := range submissions {
		cID := sub.Experiment.CourseID
		if cID == 0 && sub.Question != nil {
			cID = sub.Question.CourseID
		}
		if cID == 0 {
			cID = 1
		}

		key := fmt.Sprintf("%d_%d", sub.StudentID, cID)
		item, exists := studentCourseMap[key]
		if !exists {
			tot := courseExpCountMap[cID]
			if tot == 0 {
				tot = 7
			}

			cTitle := "Practical Laboratory"
			cCode := ""
			if crs, ok := courseMap[cID]; ok {
				if crs.Title != "" {
					cTitle = crs.Title
				}
				cCode = crs.CourseCode
			}

			rec, isSigned := recordMap[key]
			item = &SemesterStudentItem{
				StudentID:        sub.StudentID,
				Student:          sub.Student,
				CourseID:         cID,
				CourseTitle:      cTitle,
				CourseCode:       cCode,
				Section:          sub.Student.Section,
				TotalExperiments: tot,
				CompletedCount:   0,
				ApprovedCount:    0,
				AllFinished:      false,
				IsSemesterSigned: isSigned && rec.OverallStatus == "SEMESTER_APPROVED",
				SignatureHash:    rec.SignatureHash,
				ApprovedAt:       rec.ApprovedAt,
			}
			studentCourseMap[key] = item
			orderedKeys = append(orderedKeys, key)
		}

		item.CompletedCount++
		if sub.Status == "APPROVED" {
			item.ApprovedCount++
		}
	}

	var semesterStudents []SemesterStudentItem
	for _, key := range orderedKeys {
		item := studentCourseMap[key]
		if item.CompletedCount >= item.TotalExperiments && item.TotalExperiments > 0 {
			item.AllFinished = true
		}
		semesterStudents = append(semesterStudents, *item)
	}

	c.JSON(http.StatusOK, gin.H{
		"mappings":          mappings,
		"submissions":       submissions,
		"semester_students": semesterStudents,
	})
}

// GetFacultySubmissionDetail returns complete side-by-side verification payload for a submission
func GetFacultySubmissionDetail(c *gin.Context) {
	subIDStr := c.Param("subId")
	subID, err := strconv.ParseUint(subIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var sub models.LabSubmission
	if err := database.DB.Preload("Student").Preload("Experiment").Preload("Question").First(&sub, subID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	// Fetch question details & reference solution
	var question models.LabExperimentQuestion
	if sub.QuestionID > 0 {
		database.DB.First(&question, sub.QuestionID)
	}
	if question.ID == 0 {
		database.DB.Where("experiment_id = ?", sub.ExperimentID).Order("id asc").First(&question)
	}

	// Fetch course details & rubric
	var course models.LabCourse
	if sub.Experiment.CourseID > 0 {
		database.DB.First(&course, sub.Experiment.CourseID)
	} else if question.CourseID > 0 {
		database.DB.First(&course, question.CourseID)
	}

	// Ensure auto-calculated program marks are set in MarksBreakdown if not already present
	var breakdownMap map[string]interface{}
	if sub.MarksBreakdown != "" {
		_ = json.Unmarshal([]byte(sub.MarksBreakdown), &breakdownMap)
	}
	if breakdownMap == nil {
		breakdownMap = make(map[string]interface{})
	}
	if _, exists := breakdownMap["program"]; (!exists || breakdownMap["program"] == nil || breakdownMap["program"] == "") && sub.TotalTestCases > 0 {
		progMax := 45
		if course.EvaluationRubric != "" {
			var rubricItems []struct {
				Key      string `json:"key"`
				MaxMarks int    `json:"max_marks"`
			}
			if err := json.Unmarshal([]byte(course.EvaluationRubric), &rubricItems); err == nil {
				for _, item := range rubricItems {
					if item.Key == "program" && item.MaxMarks > 0 {
						progMax = item.MaxMarks
						break
					}
				}
			}
		}
		autoScore := int(math.Round(float64(sub.PassCount) / float64(sub.TotalTestCases) * float64(progMax)))
		breakdownMap["program"] = autoScore
		breakdownJSON, _ := json.Marshal(breakdownMap)
		sub.MarksBreakdown = string(breakdownJSON)
		if sub.CodeMarks == 0 {
			sub.CodeMarks = autoScore
		}
		database.DB.Model(&sub).Updates(map[string]interface{}{
			"marks_breakdown": sub.MarksBreakdown,
			"code_marks":      sub.CodeMarks,
		})
	}

	// Parse Viva questions asked
	var vivas []models.LabVivaQuestion
	if sub.VivaQuestionsAsked != "" {
		_ = json.Unmarshal([]byte(sub.VivaQuestionsAsked), &vivas)
	}
	if len(vivas) == 0 {
		// Fallback to all viva questions configured for this question
		database.DB.Where("question_id = ?", question.ID).Order("order_index asc").Find(&vivas)
	}

	c.JSON(http.StatusOK, gin.H{
		"submission":         sub,
		"student":            sub.Student,
		"course":             course,
		"experiment":         sub.Experiment,
		"question":           question,
		"reference_solution": question.SolutionCode,
		"reference_algo":     question.ReferenceAlgorithm,
		"viva_questions":     vivas,
	})
}

type FacultyRunSubmissionTestCasesReq struct {
	Code     string `json:"code"`
	Language string `json:"language"`
}

// FacultyRunSubmissionTestCases executes student code against all sample and hidden test cases for faculty verification
func FacultyRunSubmissionTestCases(c *gin.Context) {
	subIDStr := c.Param("subId")
	subID, err := strconv.ParseUint(subIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var sub models.LabSubmission
	if err := database.DB.Preload("Experiment").Preload("Question").First(&sub, subID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	var req FacultyRunSubmissionTestCasesReq
	_ = c.ShouldBindJSON(&req)

	code := req.Code
	if strings.TrimSpace(code) == "" {
		if strings.TrimSpace(sub.FacultyEditedCode) != "" {
			code = sub.FacultyEditedCode
		} else {
			code = sub.SubmittedCode
		}
	}
	lang := req.Language
	if strings.TrimSpace(lang) == "" {
		lang = sub.Language
	}
	if strings.TrimSpace(lang) == "" {
		lang = "python"
	}

	// Fetch Question or Experiment test cases
	var question models.LabExperimentQuestion
	if sub.QuestionID > 0 {
		database.DB.First(&question, sub.QuestionID)
	}
	if question.ID == 0 {
		database.DB.Where("experiment_id = ?", sub.ExperimentID).Order("id asc").First(&question)
	}

	sampleSrc := question.SampleTestCases
	if sampleSrc == "" {
		sampleSrc = sub.Experiment.SampleTestCases
	}
	hiddenSrc := question.HiddenTestCases
	if hiddenSrc == "" {
		hiddenSrc = sub.Experiment.HiddenTestCases
	}

	var allCases []EvalTestCase
	idx := 1

	var sampleCases []RawTestCase
	if sampleSrc != "" {
		_ = json.Unmarshal([]byte(sampleSrc), &sampleCases)
		for _, sc := range sampleCases {
			expOut := sc.ExpectedOutput
			if expOut == "" {
				expOut = sc.Expected
			}
			allCases = append(allCases, EvalTestCase{
				Index:          idx,
				IsHidden:       false,
				Name:           fmt.Sprintf("Sample Case %d", idx),
				Input:          sc.Input,
				ExpectedOutput: expOut,
			})
			idx++
		}
	}

	var hiddenCases []RawTestCase
	if hiddenSrc != "" {
		_ = json.Unmarshal([]byte(hiddenSrc), &hiddenCases)
		for _, hc := range hiddenCases {
			expOut := hc.ExpectedOutput
			if expOut == "" {
				expOut = hc.Expected
			}
			allCases = append(allCases, EvalTestCase{
				Index:          idx,
				IsHidden:       true,
				Name:           fmt.Sprintf("Hidden Case %d", idx),
				Input:          hc.Input,
				ExpectedOutput: expOut,
			})
			idx++
		}
	}

	if len(allCases) == 0 {
		allCases = append(allCases, EvalTestCase{
			Index:          1,
			IsHidden:       false,
			Name:           "Default Execution Test",
			Input:          "",
			ExpectedOutput: "",
		})
	}

	results, execErr := ExecuteTestCases(code, lang, allCases)
	if execErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Execution error: " + execErr.Error()})
		return
	}

	passCount := 0
	samplePassCount := 0
	sampleTotal := 0
	hiddenPassCount := 0
	hiddenTotal := 0

	for _, r := range results {
		if r.Passed {
			passCount++
		}
		if r.IsHidden {
			hiddenTotal++
			if r.Passed {
				hiddenPassCount++
			}
		} else {
			sampleTotal++
			if r.Passed {
				samplePassCount++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"results":           results,
		"pass_count":        passCount,
		"total_test_cases":  len(results),
		"sample_pass_count": samplePassCount,
		"sample_total":      sampleTotal,
		"hidden_pass_count": hiddenPassCount,
		"hidden_total":      hiddenTotal,
	})
}

type FacultyAutosaveDraftReq struct {
	CodeMarks         *int                   `json:"code_marks"`
	VivaMarks         *int                   `json:"viva_marks"`
	Marks             *int                   `json:"marks"`
	MarksBreakdown    map[string]interface{} `json:"marks_breakdown"`
	FacultyNotes      *string                `json:"faculty_notes"`
	FacultyEditedCode *string                `json:"faculty_edited_code"`
}

// FacultyAutosaveSubmissionDraft autosaves marks, breakdown, faculty notes, and edited code in real time without approving
func FacultyAutosaveSubmissionDraft(c *gin.Context) {
	subIDStr := c.Param("subId")
	subID, err := strconv.ParseUint(subIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var sub models.LabSubmission
	if err := database.DB.First(&sub, subID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	var req FacultyAutosaveDraftReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	updates := make(map[string]interface{})

	if req.FacultyEditedCode != nil {
		updates["faculty_edited_code"] = *req.FacultyEditedCode
		sub.FacultyEditedCode = *req.FacultyEditedCode
	}

	if req.FacultyNotes != nil {
		updates["faculty_notes"] = *req.FacultyNotes
		sub.FacultyNotes = *req.FacultyNotes
	}

	if req.MarksBreakdown != nil {
		breakdownJSON, err := json.Marshal(req.MarksBreakdown)
		if err == nil {
			updates["marks_breakdown"] = string(breakdownJSON)
			sub.MarksBreakdown = string(breakdownJSON)
		}
	}

	if req.CodeMarks != nil {
		updates["code_marks"] = *req.CodeMarks
		sub.CodeMarks = *req.CodeMarks
	}

	if req.VivaMarks != nil {
		updates["viva_marks"] = *req.VivaMarks
		sub.VivaMarks = *req.VivaMarks
	}

	if req.Marks != nil {
		updates["marks"] = *req.Marks
		sub.Marks = *req.Marks
	}

	if len(updates) > 0 {
		database.DB.Model(&sub).Updates(updates)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Draft auto-saved successfully",
		"submission": sub,
	})
}

type VerifySingleReq struct {
	SubmissionID      uint                   `json:"submission_id" binding:"required"`
	Status            string                 `json:"status" binding:"required"` // APPROVED, REVISION_REQUIRED
	CodeMarks         int                    `json:"code_marks"`
	VivaMarks         int                    `json:"viva_marks"`
	Marks             int                    `json:"marks"` // Total Marks (out of 100)
	MarksBreakdown    map[string]interface{} `json:"marks_breakdown"`
	FacultyNotes      string                 `json:"faculty_notes"`
	FacultyEditedCode string                 `json:"faculty_edited_code"`
}

// VerifySingleExperiment allows faculty to evaluate viva, award marks, and approve experiment
func VerifySingleExperiment(c *gin.Context) {
	facultyIDVal, _ := c.Get("userID")
	facultyID := facultyIDVal.(uint)

	var req VerifySingleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification payload"})
		return
	}

	var sub models.LabSubmission
	if err := database.DB.First(&sub, req.SubmissionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	now := time.Now()
	sub.Status = req.Status
	if req.Status == "REVISION_REQUESTED" {
		sub.IsUnderRevision = true
	} else if req.Status == "APPROVED" {
		sub.IsUnderRevision = false
	}
	sub.CodeMarks = req.CodeMarks
	sub.VivaMarks = req.VivaMarks
	totalMarks := req.Marks
	if totalMarks == 0 && (req.CodeMarks > 0 || req.VivaMarks > 0) {
		totalMarks = req.CodeMarks + req.VivaMarks
	}
	sub.Marks = totalMarks
	if req.MarksBreakdown != nil {
		breakdownJSON, err := json.Marshal(req.MarksBreakdown)
		if err == nil {
			sub.MarksBreakdown = string(breakdownJSON)
		}
	}
	sub.FacultyNotes = req.FacultyNotes
	if req.FacultyEditedCode != "" {
		sub.FacultyEditedCode = req.FacultyEditedCode
	}
	sub.VerifiedBy = &facultyID
	sub.VerifiedAt = &now
	database.DB.Save(&sub)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Experiment verification & marks evaluation saved successfully!",
		"submission": sub,
	})
}

type ResetAllocationReq struct {
	StudentID    uint `json:"student_id" binding:"required"`
	CourseID     uint `json:"course_id" binding:"required"`
	ExperimentID uint `json:"experiment_id" binding:"required"`
}

// ResetStudentQuestionAllocation allows faculty or admin to reset a student's assigned question
func ResetStudentQuestionAllocation(c *gin.Context) {
	var req ResetAllocationReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	database.DB.Where("student_id = ? AND course_id = ? AND experiment_id = ?", req.StudentID, req.CourseID, req.ExperimentID).
		Delete(&models.LabQuestionAllocation{})

	// Re-allocate a fresh random variant
	newQ, err := getOrAllocateQuestionForStudent(req.CourseID, req.ExperimentID, req.StudentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reallocate question: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "Student question allocation reset successfully!",
		"assigned_question": newQ,
	})
}

type VerifySemesterReq struct {
	StudentID uint `json:"student_id" binding:"required"`
	CourseID  uint `json:"course_id" binding:"required"`
}

// VerifySemesterRecord approves all 7 experiments for a student in 1-click
func VerifySemesterRecord(c *gin.Context) {
	facultyIDVal, _ := c.Get("userID")
	facultyID := facultyIDVal.(uint)

	var req VerifySemesterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Count total experiments configured for this course
	var totalExps int64
	database.DB.Model(&models.LabExperiment{}).Where("course_id = ?", req.CourseID).Count(&totalExps)
	if totalExps == 0 {
		totalExps = 7
	}

	// Count completed experiments by student for this course
	var completedCount int64
	database.DB.Model(&models.LabSubmission{}).
		Joins("JOIN lab_experiments ON lab_experiments.id = lab_submissions.experiment_id").
		Where("lab_submissions.student_id = ? AND lab_experiments.course_id = ?", req.StudentID, req.CourseID).
		Count(&completedCount)

	if completedCount < totalExps {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot sign and verify semester record. Student has only completed %d of %d experiments. All experiments must be completed first.", completedCount, totalExps),
		})
		return
	}

	// Update all submissions of student to APPROVED
	var submissions []models.LabSubmission
	database.DB.Where("student_id = ?", req.StudentID).Find(&submissions)

	now := time.Now()
	totalMarks := 0
	for _, sub := range submissions {
		sub.Status = "APPROVED"
		if sub.Marks == 0 {
			sub.Marks = 10
		}
		totalMarks += sub.Marks
		sub.VerifiedBy = &facultyID
		sub.VerifiedAt = &now
		database.DB.Save(&sub)
	}

	// Generate Digital Signature Hash
	sigString := fmt.Sprintf("MOCKMATE-RECORD-%d-%d-%d-%d", req.StudentID, req.CourseID, facultyID, now.Unix())
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(sigString)))

	// Create or update LabRecord
	var record models.LabRecord
	err := database.DB.Where("student_id = ? AND course_id = ?", req.StudentID, req.CourseID).First(&record).Error
	record.StudentID = req.StudentID
	record.CourseID = req.CourseID
	record.OverallStatus = "SEMESTER_APPROVED"
	record.TotalApproved = len(submissions)
	record.TotalExperiments = int(totalExps)
	record.TotalMarks = totalMarks
	record.SignatureHash = hash
	record.ApprovedBy = &facultyID
	record.ApprovedAt = &now

	if err != nil {
		database.DB.Create(&record)
	} else {
		database.DB.Save(&record)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Entire semester lab record approved successfully!",
		"record":  record,
	})
}

// DownloadStudentRecordPDF streams official server-generated PDF for a student
func DownloadStudentRecordPDF(c *gin.Context) {
	studentIDStr := c.Param("studentId")
	courseIDStr := c.Param("courseId")

	studentID, _ := strconv.ParseUint(studentIDStr, 10, 64)
	courseID, _ := strconv.ParseUint(courseIDStr, 10, 64)

	var student models.User
	if err := database.DB.First(&student, studentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	var submissions []models.LabSubmission
	database.DB.Preload("Experiment").Preload("Question").Where("student_id = ?", studentID).Order("experiment_id asc").Find(&submissions)

	var record models.LabRecord
	database.DB.Where("student_id = ? AND course_id = ?", studentID, course.ID).First(&record)

	pdfBytes, err := services.GenerateLabRecordPDF(course, student, submissions, record)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate lab record PDF"})
		return
	}

	fileName := fmt.Sprintf("%s_%s_LabRecord.pdf", student.RollNo, course.CourseCode)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// FacultyGetCourseReleases returns experiment unlock status matrix and student overrides for courses & sections mapped to faculty
func FacultyGetCourseReleases(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	facultyIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	facultyID, _ := facultyIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	courseIDQuery := strings.TrimSpace(c.Query("course_id"))
	sectionQuery := strings.TrimSpace(c.Query("section"))
	searchQuery := strings.TrimSpace(c.Query("search"))

	// Pagination for student overrides
	overridePage, _ := strconv.Atoi(c.DefaultQuery("override_page", "1"))
	if overridePage < 1 {
		overridePage = 1
	}
	overrideLimit, _ := strconv.Atoi(c.DefaultQuery("override_limit", "25"))
	if overrideLimit < 1 {
		overrideLimit = 25
	} else if overrideLimit > 200 {
		overrideLimit = 200
	}
	overrideOffset := (overridePage - 1) * overrideLimit

	// Filter for student roster search
	studentQuery := strings.TrimSpace(c.Query("student_search"))
	studentSection := strings.TrimSpace(c.Query("student_section"))
	studentLimit, _ := strconv.Atoi(c.DefaultQuery("student_limit", "100"))
	if studentLimit < 1 || studentLimit > 500 {
		studentLimit = 100
	}

	var mappings []models.LabMapping
	var courses []models.LabCourse

	if strings.ToLower(userRole) == "admin" {
		database.DB.Order("title asc").Find(&courses)
		database.DB.Preload("Course").Preload("Faculty").Find(&mappings)
	} else {
		database.DB.Preload("Course").Where("faculty_id = ?", facultyID).Find(&mappings)
		var courseIDs []uint
		for _, m := range mappings {
			courseIDs = append(courseIDs, m.CourseID)
		}
		if len(courseIDs) > 0 {
			database.DB.Where("id IN ?", courseIDs).Order("title asc").Find(&courses)
		}
	}

	// Fetch section-level unlocks
	unlockQuery := database.DB.Preload("Course").Preload("Experiment").
		Where("student_id IS NULL OR student_id = 0")
	if courseIDQuery != "" && courseIDQuery != "0" {
		unlockQuery = unlockQuery.Where("course_id = ?", courseIDQuery)
	}
	if sectionQuery != "" && sectionQuery != "ALL" {
		unlockQuery = unlockQuery.Where("section = ? OR section = 'ALL'", sectionQuery)
	}
	var sectionUnlocks []models.LabExperimentUnlock
	unlockQuery.Order("experiment_id asc").Find(&sectionUnlocks)

	// Fetch student-specific overrides with pagination & search
	var studentOverrides []models.LabExperimentUnlock
	var overrideTotal int64

	overrideCountDB := database.DB.Model(&models.LabExperimentUnlock{}).
		Where("lab_experiment_unlocks.student_id IS NOT NULL AND lab_experiment_unlocks.student_id > 0")

	if courseIDQuery != "" && courseIDQuery != "0" {
		overrideCountDB = overrideCountDB.Where("lab_experiment_unlocks.course_id = ?", courseIDQuery)
	}
	if sectionQuery != "" && sectionQuery != "ALL" {
		overrideCountDB = overrideCountDB.Where("lab_experiment_unlocks.section = ?", sectionQuery)
	}
	if searchQuery != "" {
		searchPattern := "%" + searchQuery + "%"
		overrideCountDB = overrideCountDB.Joins("LEFT JOIN users ON users.id = lab_experiment_unlocks.student_id").
			Joins("LEFT JOIN lab_experiments ON lab_experiments.id = lab_experiment_unlocks.experiment_id").
			Where("users.name LIKE ? OR users.roll_no LIKE ? OR users.email LIKE ? OR lab_experiments.title LIKE ?",
				searchPattern, searchPattern, searchPattern, searchPattern)
	}

	overrideCountDB.Count(&overrideTotal)

	overrideDataDB := database.DB.Model(&models.LabExperimentUnlock{}).
		Where("lab_experiment_unlocks.student_id IS NOT NULL AND lab_experiment_unlocks.student_id > 0")

	if courseIDQuery != "" && courseIDQuery != "0" {
		overrideDataDB = overrideDataDB.Where("lab_experiment_unlocks.course_id = ?", courseIDQuery)
	}
	if sectionQuery != "" && sectionQuery != "ALL" {
		overrideDataDB = overrideDataDB.Where("lab_experiment_unlocks.section = ?", sectionQuery)
	}
	if searchQuery != "" {
		searchPattern := "%" + searchQuery + "%"
		overrideDataDB = overrideDataDB.Joins("LEFT JOIN users ON users.id = lab_experiment_unlocks.student_id").
			Joins("LEFT JOIN lab_experiments ON lab_experiments.id = lab_experiment_unlocks.experiment_id").
			Where("users.name LIKE ? OR users.roll_no LIKE ? OR users.email LIKE ? OR lab_experiments.title LIKE ?",
				searchPattern, searchPattern, searchPattern, searchPattern)
	}

	overrideDataDB.Preload("Course").Preload("Experiment").Preload("Student").
		Order("lab_experiment_unlocks.created_at desc").
		Offset(overrideOffset).
		Limit(overrideLimit).
		Find(&studentOverrides)

	overrideTotalPages := int((overrideTotal + int64(overrideLimit) - 1) / int64(overrideLimit))
	if overrideTotalPages < 1 {
		overrideTotalPages = 1
	}

	var allExperiments []models.LabExperiment
	expDB := database.DB
	if courseIDQuery != "" && courseIDQuery != "0" {
		expDB = expDB.Where("course_id = ?", courseIDQuery)
	}
	expDB.Order("course_id asc, experiment_no asc").Find(&allExperiments)

	// Fetch distinct sections based on faculty mapping or all if admin
	var sectionList []string
	if strings.ToLower(userRole) == "admin" {
		database.DB.Model(&models.User{}).
			Where("section IS NOT NULL AND section != '' AND LOWER(role) IN ?", []string{"student", "user"}).
			Distinct().
			Pluck("section", &sectionList)
	} else {
		secMap := make(map[string]bool)
		for _, m := range mappings {
			sec := strings.TrimSpace(m.Section)
			if sec != "" && !strings.EqualFold(sec, "ALL") {
				secMap[sec] = true
			}
		}
		for s := range secMap {
			sectionList = append(sectionList, s)
		}
		sort.Strings(sectionList)
	}

	// Fetch student roster for individual overrides with optional search/section filter & limit
	var studentList []models.User
	var studentTotal int64
	studentDB := database.DB.Model(&models.User{}).
		Where("LOWER(role) IN ?", []string{"student", "user"})

	if strings.ToLower(userRole) != "admin" {
		if len(sectionList) > 0 {
			studentDB = studentDB.Where("section IN ?", sectionList)
		} else {
			studentDB = studentDB.Where("1 = 0")
		}
	}

	if studentSection != "" && studentSection != "ALL" {
		studentDB = studentDB.Where("section = ?", studentSection)
	}
	if studentQuery != "" {
		sqPattern := "%" + studentQuery + "%"
		studentDB = studentDB.Where("name LIKE ? OR roll_no LIKE ? OR email LIKE ?", sqPattern, sqPattern, sqPattern)
	}
	studentDB.Count(&studentTotal)
	studentDB.Select("id, name, roll_no, email, section, department").
		Order("name asc").
		Limit(studentLimit).
		Find(&studentList)

	c.JSON(http.StatusOK, gin.H{
		"courses":              courses,
		"mappings":             mappings,
		"unlocks":              sectionUnlocks,
		"student_overrides":    studentOverrides,
		"override_total":       overrideTotal,
		"override_page":        overridePage,
		"override_limit":       overrideLimit,
		"override_total_pages": overrideTotalPages,
		"experiments":          allExperiments,
		"sections":             sectionList,
		"students":             studentList,
		"student_total":        studentTotal,
	})
}

type ToggleUnlockReq struct {
	CourseID     uint   `json:"course_id" binding:"required"`
	ExperimentID uint   `json:"experiment_id" binding:"required"`
	Section      string `json:"section" binding:"required"`
	IsUnlocked   bool   `json:"is_unlocked"`
}

// FacultyToggleExperimentUnlock toggles unlock status for a specific course, experiment and section
func FacultyToggleExperimentUnlock(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	facultyIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	facultyID, _ := facultyIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var req ToggleUnlockReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unlock toggle payload"})
		return
	}

	if strings.ToLower(userRole) != "admin" {
		var mappingCount int64
		database.DB.Model(&models.LabMapping{}).Where("faculty_id = ? AND course_id = ?", facultyID, req.CourseID).Count(&mappingCount)
		if mappingCount == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not assigned to teach this lab course"})
			return
		}
	}

	var unlock models.LabExperimentUnlock
	err := database.DB.Where("course_id = ? AND experiment_id = ? AND section = ? AND (student_id IS NULL OR student_id = 0)", req.CourseID, req.ExperimentID, req.Section).First(&unlock).Error

	now := time.Now()
	unlock.CourseID = req.CourseID
	unlock.ExperimentID = req.ExperimentID
	unlock.Section = req.Section
	unlock.FacultyID = facultyID
	unlock.IsUnlocked = req.IsUnlocked
	if req.IsUnlocked {
		unlock.UnlockedAt = &now
	}

	if err != nil {
		if createErr := database.DB.Create(&unlock).Error; createErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create unlock state: " + createErr.Error()})
			return
		}
	} else {
		if saveErr := database.DB.Save(&unlock).Error; saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update unlock state: " + saveErr.Error()})
			return
		}
	}

	database.DB.Preload("Course").Preload("Experiment").First(&unlock, unlock.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Experiment unlock state updated successfully",
		"unlock":  unlock,
	})
}

type ScheduleWindowBulkReq struct {
	CourseID             uint       `json:"course_id" binding:"required"`
	ExperimentIDs        []uint     `json:"experiment_ids"`
	LockExperimentIDs    []uint     `json:"lock_experiment_ids"`
	Section              string     `json:"section"` // 'ALL' or specific section
	Sections             []string   `json:"sections"`
	IsUnlocked           bool       `json:"is_unlocked"`
	RequiresPrerequisite bool       `json:"requires_prerequisite"`
	StartsAt             *time.Time `json:"starts_at"`
	EndsAt               *time.Time `json:"ends_at"`
	MaxAttempts          int        `json:"max_attempts"`
	AllowLateSubmission  bool       `json:"allow_late_submission"`
	Notes                string     `json:"notes"`
}

// FacultyScheduleWindowBulk configures open window timings for multiple experiments across a section in bulk
func FacultyScheduleWindowBulk(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	facultyIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	facultyID, _ := facultyIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var req ScheduleWindowBulkReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bulk schedule payload: " + err.Error()})
		return
	}

	var targetSections []string
	if len(req.Sections) > 0 {
		for _, s := range req.Sections {
			s = strings.TrimSpace(s)
			if s != "" {
				targetSections = append(targetSections, s)
			}
		}
	}
	if len(targetSections) == 0 {
		sec := strings.TrimSpace(req.Section)
		if sec == "" {
			sec = "ALL"
		}
		targetSections = []string{sec}
	}

	if strings.ToLower(userRole) != "admin" {
		var facultyMappings []models.LabMapping
		database.DB.Where("faculty_id = ? AND course_id = ?", facultyID, req.CourseID).Find(&facultyMappings)
		if len(facultyMappings) == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not assigned to teach this lab course"})
			return
		}
		var allowedSections []string
		for _, m := range facultyMappings {
			sec := strings.TrimSpace(m.Section)
			if sec != "" && !strings.EqualFold(sec, "ALL") {
				allowedSections = append(allowedSections, sec)
			}
		}
		if len(allowedSections) > 0 {
			var filtered []string
			for _, ts := range targetSections {
				if strings.EqualFold(ts, "ALL") {
					filtered = append(filtered, allowedSections...)
				} else {
					for _, as := range allowedSections {
						if strings.EqualFold(as, ts) {
							filtered = append(filtered, ts)
							break
						}
					}
				}
			}
			secMap := make(map[string]bool)
			var deduped []string
			for _, f := range filtered {
				if !secMap[f] {
					secMap[f] = true
					deduped = append(deduped, f)
				}
			}
			if len(deduped) > 0 {
				targetSections = deduped
			}
		}
	}

	now := time.Now()
	for _, sec := range targetSections {
		// 1. Process experiments to unlock / schedule
		for _, expID := range req.ExperimentIDs {
			var unlock models.LabExperimentUnlock
			err := database.DB.Where("course_id = ? AND experiment_id = ? AND section = ? AND (student_id IS NULL OR student_id = 0)", req.CourseID, expID, sec).First(&unlock).Error

			unlock.CourseID = req.CourseID
			unlock.ExperimentID = expID
			unlock.Section = sec
			unlock.FacultyID = facultyID
			unlock.IsUnlocked = req.IsUnlocked
			unlock.RequiresPrerequisite = req.RequiresPrerequisite
			unlock.StartsAt = req.StartsAt
			unlock.EndsAt = req.EndsAt
			unlock.MaxAttempts = req.MaxAttempts
			unlock.AllowLateSubmission = req.AllowLateSubmission
			unlock.Notes = strings.TrimSpace(req.Notes)
			if req.IsUnlocked {
				unlock.UnlockedAt = &now
			}

			if err != nil {
				database.DB.Create(&unlock)
			} else {
				database.DB.Save(&unlock)
			}
		}

		// 2. Process experiments to lock
		for _, expID := range req.LockExperimentIDs {
			var unlock models.LabExperimentUnlock
			err := database.DB.Where("course_id = ? AND experiment_id = ? AND section = ? AND (student_id IS NULL OR student_id = 0)", req.CourseID, expID, sec).First(&unlock).Error

			unlock.CourseID = req.CourseID
			unlock.ExperimentID = expID
			unlock.Section = sec
			unlock.FacultyID = facultyID
			unlock.IsUnlocked = false

			if err != nil {
				database.DB.Create(&unlock)
			} else {
				database.DB.Save(&unlock)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully configured attendance window for %d experiments across %d section(s)!", len(req.ExperimentIDs), len(targetSections)),
	})
}

type SetStudentOverrideReq struct {
	CourseID            uint       `json:"course_id" binding:"required"`
	ExperimentID        uint       `json:"experiment_id"`
	ExperimentIDs       []uint     `json:"experiment_ids"`
	StudentID           uint       `json:"student_id"`
	StudentIDs          []uint     `json:"student_ids"`
	IsUnlocked          bool       `json:"is_unlocked"`
	BypassPrerequisite  bool       `json:"bypass_prerequisite"`
	StartsAt            *time.Time `json:"starts_at"`
	EndsAt              *time.Time `json:"ends_at"`
	MaxAttempts         int        `json:"max_attempts"`
	AllowLateSubmission bool       `json:"allow_late_submission"`
	Notes               string     `json:"notes"`
}

// FacultySetStudentOverride creates or updates individual or multi-student window extensions / waivers
func FacultySetStudentOverride(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	facultyIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	facultyID, _ := facultyIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	var req SetStudentOverrideReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student override payload: " + err.Error()})
		return
	}

	// 1. Resolve Student IDs
	sIDs := req.StudentIDs
	if len(sIDs) == 0 && req.StudentID > 0 {
		sIDs = []uint{req.StudentID}
	}
	if len(sIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please select at least one student"})
		return
	}

	// 2. Resolve Experiment IDs
	eIDs := req.ExperimentIDs
	if len(eIDs) == 0 && req.ExperimentID > 0 {
		eIDs = []uint{req.ExperimentID}
	}
	if len(eIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please select at least one experiment"})
		return
	}

	if strings.ToLower(userRole) != "admin" {
		var facultyMappings []models.LabMapping
		database.DB.Where("faculty_id = ? AND course_id = ?", facultyID, req.CourseID).Find(&facultyMappings)
		if len(facultyMappings) == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not assigned to teach this lab course"})
			return
		}
	}

	var students []models.User
	if err := database.DB.Where("id IN ?", sIDs).Find(&students).Error; err != nil || len(students) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Selected students not found"})
		return
	}

	if strings.ToLower(userRole) != "admin" {
		var facultyMappings []models.LabMapping
		database.DB.Where("faculty_id = ? AND course_id = ?", facultyID, req.CourseID).Find(&facultyMappings)
		allowedSecMap := make(map[string]bool)
		for _, m := range facultyMappings {
			sec := strings.TrimSpace(m.Section)
			if sec != "" && !strings.EqualFold(sec, "ALL") {
				allowedSecMap[strings.ToUpper(sec)] = true
			}
		}
		if len(allowedSecMap) > 0 {
			var allowedStudents []models.User
			for _, s := range students {
				if allowedSecMap[strings.ToUpper(strings.TrimSpace(s.Section))] {
					allowedStudents = append(allowedStudents, s)
				}
			}
			students = allowedStudents
			if len(students) == 0 {
				c.JSON(http.StatusForbidden, gin.H{"error": "None of the selected students belong to your assigned sections"})
				return
			}
		}
	}

	now := time.Now()
	count := 0

	for _, student := range students {
		sec := student.Section
		if strings.TrimSpace(sec) == "" {
			sec = "ALL"
		}
		sID := student.ID

		for _, expID := range eIDs {
			var override models.LabExperimentUnlock
			err := database.DB.Where("course_id = ? AND experiment_id = ? AND student_id = ?", req.CourseID, expID, sID).First(&override).Error

			override.CourseID = req.CourseID
			override.ExperimentID = expID
			override.StudentID = &sID
			override.Section = sec
			override.FacultyID = facultyID
			override.IsUnlocked = req.IsUnlocked
			override.BypassPrerequisite = req.BypassPrerequisite
			override.StartsAt = req.StartsAt
			override.EndsAt = req.EndsAt
			override.MaxAttempts = req.MaxAttempts
			override.AllowLateSubmission = req.AllowLateSubmission
			override.Notes = strings.TrimSpace(req.Notes)
			if req.IsUnlocked {
				override.UnlockedAt = &now
			}

			if err != nil {
				database.DB.Create(&override)
			} else {
				database.DB.Save(&override)
			}
			count++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully configured window overrides for %d student(s) across %d experiment(s)!", len(students), len(eIDs)),
		"count":   count,
	})
}

type UpdateProgressionModeReq struct {
	ProgressionMode string `json:"progression_mode" binding:"required"` // "OPEN" or "SEQUENTIAL"
}

// FacultyUpdateCourseProgressionMode toggles whether experiments in a course must be completed sequentially
func FacultyUpdateCourseProgressionMode(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var req UpdateProgressionModeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	mode := strings.ToUpper(strings.TrimSpace(req.ProgressionMode))
	if mode != "SEQUENTIAL" && mode != "OPEN" {
		mode = "OPEN"
	}

	if err := database.DB.Model(&models.LabCourse{}).Where("id = ?", courseID).Update("progression_mode", mode).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progression mode: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          fmt.Sprintf("Progression mode updated to %s", mode),
		"progression_mode": mode,
	})
}

// FacultyDeleteStudentOverride removes an individual student override
func FacultyDeleteStudentOverride(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid override ID"})
		return
	}

	database.DB.Delete(&models.LabExperimentUnlock{}, id)

	c.JSON(http.StatusOK, gin.H{
		"message": "Student window override removed successfully",
	})
}

type BulkDeleteStudentOverridesReq struct {
	IDs []uint `json:"ids" binding:"required"`
}

// FacultyBulkDeleteStudentOverrides removes multiple student overrides in one call
func FacultyBulkDeleteStudentOverrides(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	var req BulkDeleteStudentOverridesReq
	if err := c.ShouldBindJSON(&req); err != nil || len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide override IDs to delete"})
		return
	}

	res := database.DB.Where("id IN ?", req.IDs).Delete(&models.LabExperimentUnlock{})
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully removed %d student window override(s)!", res.RowsAffected),
		"count":   res.RowsAffected,
	})
}

type BulkUpdateStudentOverridesReq struct {
	IDs                 []uint     `json:"ids" binding:"required"`
	BypassPrerequisite  *bool      `json:"bypass_prerequisite"`
	StartsAt            *time.Time `json:"starts_at"`
	UpdateStartsAt      bool       `json:"update_starts_at"`
	EndsAt              *time.Time `json:"ends_at"`
	UpdateEndsAt        bool       `json:"update_ends_at"`
	AllowLateSubmission *bool      `json:"allow_late_submission"`
	Notes               *string    `json:"notes"`
}

// FacultyBulkUpdateStudentOverrides updates multiple student overrides in one call
func FacultyBulkUpdateStudentOverrides(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	var req BulkUpdateStudentOverridesReq
	if err := c.ShouldBindJSON(&req); err != nil || len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide override IDs to update"})
		return
	}

	updates := map[string]interface{}{}
	if req.BypassPrerequisite != nil {
		updates["bypass_prerequisite"] = *req.BypassPrerequisite
	}
	if req.UpdateStartsAt {
		updates["starts_at"] = req.StartsAt
	}
	if req.UpdateEndsAt {
		updates["ends_at"] = req.EndsAt
	}
	if req.AllowLateSubmission != nil {
		updates["allow_late_submission"] = *req.AllowLateSubmission
	}
	if req.Notes != nil {
		updates["notes"] = strings.TrimSpace(*req.Notes)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No update fields provided"})
		return
	}

	res := database.DB.Model(&models.LabExperimentUnlock{}).Where("id IN ?", req.IDs).Updates(updates)
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bulk update overrides: " + res.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully updated %d student override(s)!", res.RowsAffected),
		"count":   res.RowsAffected,
	})
}

type UpdateSingleOverrideReq struct {
	BypassPrerequisite  bool       `json:"bypass_prerequisite"`
	StartsAt            *time.Time `json:"starts_at"`
	EndsAt              *time.Time `json:"ends_at"`
	AllowLateSubmission bool       `json:"allow_late_submission"`
	Notes               string     `json:"notes"`
}

// FacultyUpdateStudentOverride updates an individual student override
func FacultyUpdateStudentOverride(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid override ID"})
		return
	}

	var req UpdateSingleOverrideReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	var override models.LabExperimentUnlock
	if err := database.DB.First(&override, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Override not found"})
		return
	}

	override.BypassPrerequisite = req.BypassPrerequisite
	override.StartsAt = req.StartsAt
	override.EndsAt = req.EndsAt
	override.AllowLateSubmission = req.AllowLateSubmission
	override.Notes = strings.TrimSpace(req.Notes)

	if err := database.DB.Save(&override).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update override"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Student window override updated successfully!",
		"override": override,
	})
}

// FacultyGetCourseAnalytics returns comprehensive completion rates, student progress matrix, and attempt analytics
func FacultyGetCourseAnalytics(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	facultyIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	facultyID, _ := facultyIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	sectionFilter := strings.TrimSpace(c.Query("section"))
	searchQuery := strings.TrimSpace(c.Query("search"))

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// 1. Fetch lab mappings for assigned sections
	var mappings []models.LabMapping
	mapQuery := database.DB.Where("course_id = ?", courseID)
	if strings.ToLower(userRole) != "admin" && facultyID > 0 {
		mapQuery = mapQuery.Where("faculty_id = ?", facultyID)
	}
	mapQuery.Find(&mappings)

	mappedSecSet := make(map[string]bool)
	var assignedSections []string
	for _, m := range mappings {
		sec := strings.TrimSpace(m.Section)
		if sec != "" && !mappedSecSet[sec] {
			mappedSecSet[sec] = true
			assignedSections = append(assignedSections, sec)
		}
	}

	// Fetch all distinct sections across student users
	var allStudentSections []string
	database.DB.Model(&models.User{}).
		Where("section IS NOT NULL AND section != '' AND LOWER(role) IN ?", []string{"student", "user"}).
		Distinct().
		Pluck("section", &allStudentSections)

	finalSectionsMap := make(map[string]bool)
	var finalSections []string

	for _, s := range assignedSections {
		if strings.ToUpper(s) != "ALL" && !finalSectionsMap[s] {
			finalSectionsMap[s] = true
			finalSections = append(finalSections, s)
		}
	}

	if len(finalSections) == 0 {
		for _, s := range allStudentSections {
			if !finalSectionsMap[s] {
				finalSectionsMap[s] = true
				finalSections = append(finalSections, s)
			}
		}
	}

	// Fetch all experiments for course
	var experiments []models.LabExperiment
	database.DB.Where("course_id = ?", courseID).Order("experiment_no asc").Find(&experiments)

	expIDs := make([]uint, len(experiments))
	for i, e := range experiments {
		expIDs[i] = e.ID
	}

	// Fetch all students (filtered by section and search if specified)
	studentQuery := database.DB.Model(&models.User{}).Where("LOWER(role) IN ?", []string{"student", "user"})

	if sectionFilter != "" && sectionFilter != "ALL" {
		sFilter := strings.TrimSpace(sectionFilter)
		sPattern := "%" + strings.ToLower(sFilter) + "%"
		studentQuery = studentQuery.Where("section = ? OR LOWER(section) LIKE ?", sFilter, sPattern)
	} else if strings.ToLower(userRole) != "admin" && len(finalSections) > 0 {
		var secConds []string
		var secArgs []interface{}
		for _, s := range finalSections {
			secConds = append(secConds, "section = ? OR LOWER(section) LIKE ?")
			secArgs = append(secArgs, s, "%"+strings.ToLower(s)+"%")
		}
		if len(secConds) > 0 {
			studentQuery = studentQuery.Where(strings.Join(secConds, " OR "), secArgs...)
		}
	}

	if searchQuery != "" {
		s := "%" + strings.ToLower(searchQuery) + "%"
		studentQuery = studentQuery.Where("LOWER(name) LIKE ? OR LOWER(roll_no) LIKE ? OR LOWER(email) LIKE ?", s, s, s)
	}

	var students []models.User
	studentQuery.Order("roll_no asc, name asc").Find(&students)

	// Fetch all submissions for these experiments
	var submissions []models.LabSubmission
	if len(expIDs) > 0 {
		database.DB.Preload("Question").
			Where("experiment_id IN ?", expIDs).
			Find(&submissions)
	}

	// Fetch all student question allocations for this course
	var allocations []models.LabQuestionAllocation
	database.DB.Preload("Question").Where("course_id = ?", courseID).Find(&allocations)

	// Fetch all student overrides for this course
	var studentOverrides []models.LabExperimentUnlock
	database.DB.Where("course_id = ? AND student_id IS NOT NULL AND student_id > 0", courseID).Find(&studentOverrides)

	// Maps for fast lookup
	// subMap[studentID][experimentID] -> LabSubmission
	subMap := make(map[uint]map[uint]models.LabSubmission)
	for _, sub := range submissions {
		if subMap[sub.StudentID] == nil {
			subMap[sub.StudentID] = make(map[uint]models.LabSubmission)
		}
		subMap[sub.StudentID][sub.ExperimentID] = sub
	}

	// allocMap[studentID][experimentID] -> LabQuestionAllocation
	allocMap := make(map[uint]map[uint]models.LabQuestionAllocation)
	for _, alloc := range allocations {
		if allocMap[alloc.StudentID] == nil {
			allocMap[alloc.StudentID] = make(map[uint]models.LabQuestionAllocation)
		}
		allocMap[alloc.StudentID][alloc.ExperimentID] = alloc
	}

	// overrideMap[studentID][experimentID] -> LabExperimentUnlock
	overrideMap := make(map[uint]map[uint]models.LabExperimentUnlock)
	for _, ov := range studentOverrides {
		if ov.StudentID != nil {
			sID := *ov.StudentID
			if overrideMap[sID] == nil {
				overrideMap[sID] = make(map[uint]models.LabExperimentUnlock)
			}
			overrideMap[sID][ov.ExperimentID] = ov
		}
	}

	// Build Per-Experiment Stats
	type ExpStat struct {
		ExperimentID    uint    `json:"experiment_id"`
		ExperimentNo    int     `json:"experiment_no"`
		Title           string  `json:"title"`
		Aim             string  `json:"aim"`
		MaxMarks        int     `json:"max_marks"`
		Language        string  `json:"language"`
		TotalEnrolled   int     `json:"total_enrolled"`
		CompletedCount  int     `json:"completed_count"`  // APPROVED
		SubmittedCount  int     `json:"submitted_count"`  // SUBMITTED_FOR_VERIFICATION
		InProgressCount int     `json:"in_progress_count"`// DRAFT, TEST_PASSED, REVISION_REQUIRED
		NotStartedCount int     `json:"not_started_count"`
		AvgAttempts     float64 `json:"avg_attempts"`
		AvgMarks        float64 `json:"avg_marks"`
	}

	totalStudentsCount := len(students)
	expStats := make([]ExpStat, len(experiments))

	for i, exp := range experiments {
		approvedCount := 0
		inReviewCount := 0
		inProgCount := 0
		totalAttempts := 0
		attemptsCountWithSub := 0
		totalMarksApproved := 0

		for _, st := range students {
			sub, hasSub := subMap[st.ID][exp.ID]
			if hasSub {
				attempts := sub.AttemptCount
				if attempts <= 0 {
					attempts = 1
				}
				totalAttempts += attempts
				attemptsCountWithSub++

				switch sub.Status {
				case "APPROVED":
					approvedCount++
					totalMarksApproved += sub.Marks
				case "SUBMITTED_FOR_VERIFICATION":
					inReviewCount++
				default:
					inProgCount++
				}
			}
		}

		notStarted := totalStudentsCount - (approvedCount + inReviewCount + inProgCount)
		if notStarted < 0 {
			notStarted = 0
		}

		avgAtt := 0.0
		if attemptsCountWithSub > 0 {
			avgAtt = float64(totalAttempts) / float64(attemptsCountWithSub)
		}

		avgMks := 0.0
		if approvedCount > 0 {
			avgMks = float64(totalMarksApproved) / float64(approvedCount)
		}

		expStats[i] = ExpStat{
			ExperimentID:    exp.ID,
			ExperimentNo:    exp.ExperimentNo,
			Title:           exp.Title,
			Aim:             exp.Aim,
			MaxMarks:        exp.MaxMarks,
			Language:        exp.Language,
			TotalEnrolled:   totalStudentsCount,
			CompletedCount:  approvedCount,
			SubmittedCount:  inReviewCount,
			InProgressCount: inProgCount,
			NotStartedCount: notStarted,
			AvgAttempts:     avgAtt,
			AvgMarks:        avgMks,
		}
	}

	// Build Student Matrix
	type StudentExpDetail struct {
		ExperimentID       uint                       `json:"experiment_id"`
		ExperimentNo       int                        `json:"experiment_no"`
		Status             string                     `json:"status"` // NOT_STARTED, DRAFT, TEST_PASSED, SUBMITTED_FOR_VERIFICATION, APPROVED, REVISION_REQUIRED
		AttemptCount       int                        `json:"attempt_count"`
		PassCount          int                        `json:"pass_count"`
		TotalTestCases     int                        `json:"total_test_cases"`
		Marks              int                        `json:"marks"`
		MarksBreakdown     string                     `json:"marks_breakdown,omitempty"`
		FacultyNotes       string                     `json:"faculty_notes,omitempty"`
		SubmittedAt        *time.Time                 `json:"submitted_at,omitempty"`
		VerifiedAt         *time.Time                 `json:"verified_at,omitempty"`
		QuestionCode       string                     `json:"question_code,omitempty"`
		QuestionTitle      string                     `json:"question_title,omitempty"`
		OverrideWindow     *models.LabExperimentUnlock `json:"override_window,omitempty"`
	}

	type StudentMatrixRow struct {
		StudentID        uint               `json:"student_id"`
		Name             string             `json:"name"`
		RollNo           string             `json:"roll_no"`
		Email            string             `json:"email"`
		Section          string             `json:"section"`
		Department       string             `json:"department"`
		CompletedCount   int                `json:"completed_count"`
		TotalExperiments int                `json:"total_experiments"`
		TotalMarks       int                `json:"total_marks"`
		OverallPct       int                `json:"overall_pct"`
		Experiments      []StudentExpDetail `json:"experiments"`
	}

	studentMatrix := make([]StudentMatrixRow, len(students))
	totalApprovedAll := 0
	grandTotalMarksAll := 0
	pendingReviewCount := 0

	for i, st := range students {
		compCount := 0
		totMarks := 0
		expDetails := make([]StudentExpDetail, len(experiments))

		for j, exp := range experiments {
			sub, hasSub := subMap[st.ID][exp.ID]
			alloc := allocMap[st.ID][exp.ID]
			var ovPtr *models.LabExperimentUnlock
			if ov, hasOv := overrideMap[st.ID][exp.ID]; hasOv {
				ovPtr = &ov
			}

			qCode := ""
			qTitle := ""
			if alloc.QuestionID > 0 && alloc.Question.ID > 0 {
				qCode = alloc.Question.QuestionCode
				qTitle = alloc.Question.Title
			} else if sub.QuestionID > 0 && sub.Question != nil {
				qCode = sub.Question.QuestionCode
				qTitle = sub.Question.Title
			}

			if hasSub {
				if sub.Status == "APPROVED" {
					compCount++
					totMarks += sub.Marks
				} else if sub.Status == "SUBMITTED_FOR_VERIFICATION" {
					pendingReviewCount++
				}
				attempts := sub.AttemptCount
				if attempts <= 0 {
					attempts = 1
				}

				var subAt *time.Time
				if !sub.CreatedAt.IsZero() {
					subAt = &sub.CreatedAt
				}

				expDetails[j] = StudentExpDetail{
					ExperimentID:   exp.ID,
					ExperimentNo:   exp.ExperimentNo,
					Status:         sub.Status,
					AttemptCount:   attempts,
					PassCount:      sub.PassCount,
					TotalTestCases: sub.TotalTestCases,
					Marks:          sub.Marks,
					MarksBreakdown: sub.MarksBreakdown,
					FacultyNotes:   sub.FacultyNotes,
					SubmittedAt:    subAt,
					VerifiedAt:     sub.VerifiedAt,
					QuestionCode:   qCode,
					QuestionTitle:  qTitle,
					OverrideWindow: ovPtr,
				}
			} else {
				expDetails[j] = StudentExpDetail{
					ExperimentID:   exp.ID,
					ExperimentNo:   exp.ExperimentNo,
					Status:         "NOT_STARTED",
					AttemptCount:   0,
					QuestionCode:   qCode,
					QuestionTitle:  qTitle,
					OverrideWindow: ovPtr,
				}
			}
		}

		maxMarksPossible := len(experiments) * 100
		pct := 0
		if maxMarksPossible > 0 {
			pct = (totMarks * 100) / maxMarksPossible
		}

		totalApprovedAll += compCount
		grandTotalMarksAll += totMarks

		studentMatrix[i] = StudentMatrixRow{
			StudentID:        st.ID,
			Name:             st.Name,
			RollNo:           st.RollNo,
			Email:            st.Email,
			Section:          st.Section,
			Department:       st.Department,
			CompletedCount:   compCount,
			TotalExperiments: len(experiments),
			TotalMarks:       totMarks,
			OverallPct:       pct,
			Experiments:      expDetails,
		}
	}

	overallCompletionPct := 0
	totalPossibleCompletions := totalStudentsCount * len(experiments)
	if totalPossibleCompletions > 0 {
		overallCompletionPct = (totalApprovedAll * 100) / totalPossibleCompletions
	}

	avgScoreAll := 0
	if totalStudentsCount > 0 {
		avgScoreAll = grandTotalMarksAll / totalStudentsCount
	}

	pageStr := strings.TrimSpace(c.DefaultQuery("page", "1"))
	limitStr := strings.TrimSpace(c.DefaultQuery("limit", "15"))
	page := 1
	limit := 15
	if p, err := strconv.Atoi(pageStr); err == nil && p >= 1 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l >= 0 {
		limit = l
	}

	totalPages := 1
	paginatedStudentMatrix := studentMatrix

	if limitStr != "all" && limitStr != "0" && limitStr != "-1" && limit > 0 && totalStudentsCount > 0 {
		totalPages = int((int64(totalStudentsCount) + int64(limit) - 1) / int64(limit))
		start := (page - 1) * limit
		if start > totalStudentsCount {
			start = totalStudentsCount
		}
		end := start + limit
		if end > totalStudentsCount {
			end = totalStudentsCount
		}
		paginatedStudentMatrix = studentMatrix[start:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"course":                  course,
		"experiments":             experiments,
		"total_students":          totalStudentsCount,
		"overall_completion_rate": overallCompletionPct,
		"average_score":           avgScoreAll,
		"experiment_stats":        expStats,
		"student_matrix":          paginatedStudentMatrix,
		"sections":                finalSections,
		"total":                   totalStudentsCount,
		"page":                    page,
		"limit":                   limit,
		"total_pages":             totalPages,
		"summary": gin.H{
			"total_students":         totalStudentsCount,
			"completion_rate_pct":    overallCompletionPct,
			"completed_submissions":  totalApprovedAll,
			"avg_score_pct":          avgScoreAll,
			"pending_review_count":   pendingReviewCount,
		},
	})
}

// GetStudentCoursePdfTemplate returns the course's official template populated with this student's data and submissions
func GetStudentCoursePdfTemplate(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	studentID, _ := userIDVal.(uint)

	var student models.User
	if err := database.DB.First(&student, studentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student profile not found"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	var experiments []models.LabExperiment
	database.DB.Where("course_id = ?", courseID).Order("experiment_no asc").Find(&experiments)

	var submissions []models.LabSubmission
	database.DB.Preload("Question").Where("student_id = ?", studentID).Find(&submissions)

	subMap := make(map[uint]models.LabSubmission)
	for _, sub := range submissions {
		subMap[sub.ExperimentID] = sub
	}

	var allocations []models.LabQuestionAllocation
	database.DB.Preload("Question").Where("student_id = ? AND course_id = ?", studentID, courseID).Find(&allocations)
	allocMap := make(map[uint]models.LabQuestionAllocation)
	for _, a := range allocations {
		allocMap[a.ExperimentID] = a
	}

	var expItems []services.CustomLabExperimentItem
	for _, exp := range experiments {
		sub, hasSub := subMap[exp.ID]
		alloc, hasAlloc := allocMap[exp.ID]

		title := exp.Title
		aim := exp.Aim
		procedure := exp.Procedure
		code := exp.StarterCode
		outText := fmt.Sprintf("All assertions passed successfully for '%s'.", exp.Title)
		marks := exp.MaxMarks
		if marks <= 0 {
			marks = 100
		}
		passCount := 3
		totalTests := 3
		status := "APPROVED"
		dateStr := time.Now().Format("02-01-2006")
		marksBreakdown := ""
		codeMarks := 0
		vivaMarks := 0

		var assignedQ *models.LabExperimentQuestion
		if hasSub && sub.Question != nil && sub.Question.ID > 0 {
			assignedQ = sub.Question
		} else if hasSub && sub.QuestionID > 0 {
			var q models.LabExperimentQuestion
			if err := database.DB.First(&q, sub.QuestionID).Error; err == nil {
				assignedQ = &q
			}
		} else if hasAlloc && alloc.Question.ID > 0 {
			assignedQ = &alloc.Question
		} else if hasAlloc && alloc.QuestionID > 0 {
			var q models.LabExperimentQuestion
			if err := database.DB.First(&q, alloc.QuestionID).Error; err == nil {
				assignedQ = &q
			}
		}

		if assignedQ != nil {
			if strings.TrimSpace(assignedQ.Title) != "" {
				title = assignedQ.Title
			}
			if strings.TrimSpace(assignedQ.Aim) != "" {
				aim = assignedQ.Aim
			}
			if strings.TrimSpace(assignedQ.ReferenceAlgorithm) != "" {
				procedure = assignedQ.ReferenceAlgorithm
			}
		}

		if hasSub {
			if strings.TrimSpace(sub.StudentProcedure) != "" {
				procedure = sub.StudentProcedure
			}
			if strings.TrimSpace(sub.FacultyEditedCode) != "" {
				code = sub.FacultyEditedCode
			} else if strings.TrimSpace(sub.SubmittedCode) != "" {
				code = sub.SubmittedCode
			}
			if strings.TrimSpace(sub.ExecutionOutput) != "" {
				outText = sub.ExecutionOutput
			}
			if sub.Marks > 0 {
				marks = sub.Marks
			}
			codeMarks = sub.CodeMarks
			vivaMarks = sub.VivaMarks
			marksBreakdown = sub.MarksBreakdown
			if sub.PassCount > 0 {
				passCount = sub.PassCount
			}
			if sub.TotalTestCases > 0 {
				totalTests = sub.TotalTestCases
			}
			if sub.Status != "" {
				status = sub.Status
			}
			if !sub.CreatedAt.IsZero() {
				dateStr = sub.CreatedAt.Format("02-01-2006")
			}
		}

		rawCases := ""
		if assignedQ != nil && strings.TrimSpace(assignedQ.SampleTestCases) != "" {
			rawCases = assignedQ.SampleTestCases
		} else if strings.TrimSpace(exp.SampleTestCases) != "" {
			rawCases = exp.SampleTestCases
		}

		if strings.TrimSpace(outText) == "" && rawCases != "" {
			var testCases []map[string]interface{}
			if err := json.Unmarshal([]byte(rawCases), &testCases); err == nil && len(testCases) > 0 {
				var formattedOutput strings.Builder
				for idx, tc := range testCases {
					inp, _ := tc["input"].(string)
					out, _ := tc["expected_output"].(string)
					if out == "" {
						out, _ = tc["expected"].(string)
					}
					if out == "" {
						out, _ = tc["output"].(string)
					}
					if len(testCases) > 1 {
						formattedOutput.WriteString(fmt.Sprintf("[SAMPLE TEST CASE %d]\n", idx+1))
					}
					if strings.TrimSpace(inp) != "" {
						formattedOutput.WriteString(fmt.Sprintf("Sample Input:\n%s\n\n", strings.TrimSpace(inp)))
					}
					formattedOutput.WriteString(fmt.Sprintf("Sample Console Output:\n%s\n", strings.TrimSpace(out)))
					if idx < len(testCases)-1 {
						formattedOutput.WriteString("\n----------------------------------------\n\n")
					}
				}
				outText = strings.TrimSpace(formattedOutput.String())
			}
		}

		if strings.TrimSpace(code) == "" {
			code = fmt.Sprintf("# Solution for Ex %d: %s\nprint('Output verified')", exp.ExperimentNo, title)
		}

		expItems = append(expItems, services.CustomLabExperimentItem{
			ExperimentNo:     exp.ExperimentNo,
			Title:            title,
			Aim:              aim,
			Procedure:        procedure,
			StudentProcedure: sub.StudentProcedure,
			Language:         exp.Language,
			SubmittedCode:    code,
			ExecutionOutput:  outText,
			SampleTestCases:  rawCases,
			PassCount:        passCount,
			TotalTestCases:   totalTests,
			CodeMarks:        codeMarks,
			VivaMarks:        vivaMarks,
			Marks:            marks,
			MarksBreakdown:   marksBreakdown,
			Status:           status,
			Date:             dateStr,
			ResultText:       fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification test cases, and evaluated.", title),
		})
	}

	sec := student.Section
	if sec == "" {
		sec = "CSE-A"
	}
	branchSec := fmt.Sprintf("%s (%s)", student.Department, sec)

	var record models.LabRecord
	database.DB.Where("student_id = ? AND course_id = ?", studentID, course.ID).First(&record)
	hashStr := record.SignatureHash
	if hashStr == "" {
		hashStr = fmt.Sprintf("MOCKMATE-REC-%s-%s", student.RollNo, course.CourseCode)
	}

	templateData := services.CustomLabRecordData{
		InstitutionName:  "BANNARI AMMAN INSTITUTE OF TECHNOLOGY",
		InstitutionSub:   "An Autonomous Institution Affiliated to Anna University Chennai",
		Department:       course.Department,
		Degree:           course.Degree,
		Semester:         course.Semester,
		AcademicYear:     course.AcademicYear,
		CourseCode:       course.CourseCode,
		CourseTitle:      course.Title,
		StudentName:      student.Name,
		RollNo:           student.RollNo,
		RegisterNo:       student.RollNo,
		BranchSection:    branchSec,
		VerificationID:   hashStr,
		CertificateText:  fmt.Sprintf("Certified that this is the bonafide record of practical work done by Mr./Ms. %s (Roll No: %s) of %s, %s in the %s (%s) Laboratory of Bannari Amman Institute of Technology during the academic year %s.", student.Name, student.RollNo, course.Semester, student.Department, course.Title, course.CourseCode, course.AcademicYear),
		StaffIncharge:    "Staff Incharge",
		HeadOfDepartment: "Head of Department",
		Experiments:      expItems,
	}

	c.JSON(http.StatusOK, gin.H{
		"course":   course,
		"template": templateData,
	})
}

// DownloadCustomLabRecordPDF compiles and streams a customized multi-page lab record PDF
func DownloadCustomLabRecordPDF(c *gin.Context) {
	var payload services.CustomLabRecordData
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid custom PDF payload: " + err.Error()})
		return
	}

	pdfBytes, err := services.GenerateCustomLabRecordPDF(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compile custom lab record PDF: " + err.Error()})
		return
	}

	fileName := fmt.Sprintf("%s_%s_LabRecord.pdf", payload.RollNo, payload.CourseCode)
	if strings.TrimSpace(payload.RollNo) == "" {
		fileName = fmt.Sprintf("LabRecord_%s.pdf", payload.CourseCode)
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

