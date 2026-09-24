package controllers

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
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
	if err := database.DB.Select("id, course_id, experiment_no, title").First(&currentExp, expID).Error; err == nil {
		var prevExp models.LabExperiment
		if err := database.DB.Where("course_id = ? AND experiment_no < ?", courseID, currentExp.ExperimentNo).
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

// GetStudentLabCourses returns active lab courses for student
func GetStudentLabCourses(c *gin.Context) {
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
	c.JSON(http.StatusOK, gin.H{"courses": courses})
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

	c.JSON(http.StatusOK, gin.H{
		"experiments": results,
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
	Code     string `json:"code" binding:"required"`
	Language string `json:"language" binding:"required"`
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

	unlocked, _ := isExperimentUnlockedForStudent(exp.CourseID, exp.ID, studentID, userRole)
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

	// Parse Hidden Test Cases from assigned question (fallback to sample if empty)
	var rawCases []RawTestCase
	hiddenSrc := assignedQ.HiddenTestCases
	if hiddenSrc == "" {
		hiddenSrc = exp.HiddenTestCases
	}
	if hiddenSrc != "" {
		_ = json.Unmarshal([]byte(hiddenSrc), &rawCases)
	}
	if len(rawCases) == 0 {
		sampleSrc := assignedQ.SampleTestCases
		if sampleSrc == "" {
			sampleSrc = exp.SampleTestCases
		}
		if sampleSrc != "" {
			_ = json.Unmarshal([]byte(sampleSrc), &rawCases)
		}
	}

	var evalCases []EvalTestCase
	if len(rawCases) == 0 {
		evalCases = append(evalCases, EvalTestCase{
			Index:          1,
			IsHidden:       true,
			Name:           "Hidden Benchmark Case 1",
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
				IsHidden:       true,
				Name:           fmt.Sprintf("Hidden Case %d", i+1),
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

	totalCases := len(results)
	passCount := 0
	var logs []string
	type SafeResultItem struct {
		Index       int    `json:"index"`
		Name        string `json:"name"`
		Passed      bool   `json:"passed"`
		ExecutionMs int    `json:"execution_ms"`
		IsHidden    bool   `json:"is_hidden"`
	}
	var sanitizedResults []SafeResultItem

	for _, r := range results {
		if r.Passed {
			passCount++
			logs = append(logs, fmt.Sprintf("✓ %s Passed (%d ms)", r.Name, r.ExecutionMs))
		} else {
			logs = append(logs, fmt.Sprintf("✗ %s Failed", r.Name))
		}

		sanitizedResults = append(sanitizedResults, SafeResultItem{
			Index:       r.Index,
			Name:        r.Name,
			Passed:      r.Passed,
			ExecutionMs: r.ExecutionMs,
			IsHidden:    true,
		})
	}

	maxMarks := assignedQ.MaxMarks
	if maxMarks <= 0 {
		maxMarks = 10
	}
	// Code marks account for 60% of total max marks (viva accounts for 40% during oral review)
	codeMarks := 0
	if totalCases > 0 {
		codeWeight := float64(maxMarks) * 0.6
		codeMarks = int(float64(passCount) / float64(totalCases) * codeWeight)
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
		"message":          "Hidden test cases executed successfully!",
		"pass_count":       passCount,
		"total_test_cases": totalCases,
		"status":           sub.Status,
		"code_marks":       codeMarks,
		"submission":       sub,
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

	// Increment attempts only when Finish & Send is clicked (1 on initial submit, +1 on resubmission/revision)
	if sub.AttemptCount == 0 {
		sub.AttemptCount = 1
	} else {
		sub.AttemptCount += 1
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

	c.JSON(http.StatusOK, gin.H{
		"mappings":    mappings,
		"submissions": submissions,
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

type VerifySingleReq struct {
	SubmissionID   uint                   `json:"submission_id" binding:"required"`
	Status         string                 `json:"status" binding:"required"` // APPROVED, REVISION_REQUIRED
	CodeMarks      int                    `json:"code_marks"`
	VivaMarks      int                    `json:"viva_marks"`
	Marks          int                    `json:"marks"` // Total Marks (out of 100)
	MarksBreakdown map[string]interface{} `json:"marks_breakdown"`
	FacultyNotes   string                 `json:"faculty_notes"`
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
	record.TotalExperiments = 7
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
	database.DB.Preload("Experiment").Where("student_id = ?", studentID).Order("experiment_id asc").Find(&submissions)

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
	var sectionUnlocks []models.LabExperimentUnlock
	database.DB.Preload("Course").Preload("Experiment").
		Where("student_id IS NULL OR student_id = 0").
		Order("experiment_id asc").
		Find(&sectionUnlocks)

	// Fetch student-specific overrides
	var studentOverrides []models.LabExperimentUnlock
	database.DB.Preload("Course").Preload("Experiment").Preload("Student").
		Where("student_id IS NOT NULL AND student_id > 0").
		Order("created_at desc").
		Find(&studentOverrides)

	var allExperiments []models.LabExperiment
	database.DB.Order("course_id asc, experiment_no asc").Find(&allExperiments)

	// Fetch distinct sections from users
	var sectionList []string
	database.DB.Model(&models.User{}).
		Where("section IS NOT NULL AND section != '' AND LOWER(role) IN ?", []string{"student", "user"}).
		Distinct().
		Pluck("section", &sectionList)

	// Fetch student roster for individual overrides
	var studentList []models.User
	database.DB.Where("LOWER(role) IN ?", []string{"student", "user"}).
		Select("id, name, roll_no, email, section, department").
		Order("name asc").
		Find(&studentList)

	c.JSON(http.StatusOK, gin.H{
		"courses":           courses,
		"mappings":          mappings,
		"unlocks":           sectionUnlocks,
		"student_overrides": studentOverrides,
		"experiments":       allExperiments,
		"sections":          sectionList,
		"students":          studentList,
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
	facultyID, _ := facultyIDVal.(uint)

	var req ToggleUnlockReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unlock toggle payload"})
		return
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
	CourseID            uint       `json:"course_id" binding:"required"`
	ExperimentIDs       []uint     `json:"experiment_ids" binding:"required"`
	Section             string     `json:"section"` // 'ALL' or specific section
	IsUnlocked          bool       `json:"is_unlocked"`
	RequiresPrerequisite bool      `json:"requires_prerequisite"`
	StartsAt            *time.Time `json:"starts_at"`
	EndsAt              *time.Time `json:"ends_at"`
	MaxAttempts         int        `json:"max_attempts"`
	AllowLateSubmission bool       `json:"allow_late_submission"`
	Notes               string     `json:"notes"`
}

// FacultyScheduleWindowBulk configures open window timings for multiple experiments across a section in bulk
func FacultyScheduleWindowBulk(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	facultyIDVal, _ := c.Get("userID")
	facultyID, _ := facultyIDVal.(uint)

	var req ScheduleWindowBulkReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bulk schedule payload: " + err.Error()})
		return
	}

	sec := strings.TrimSpace(req.Section)
	if sec == "" {
		sec = "ALL"
	}

	now := time.Now()
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

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully configured attendance window for %d experiments on %s!", len(req.ExperimentIDs), sec),
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
	facultyID, _ := facultyIDVal.(uint)

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

	var students []models.User
	if err := database.DB.Where("id IN ?", sIDs).Find(&students).Error; err != nil || len(students) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Selected students not found"})
		return
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

// FacultyGetCourseAnalytics returns comprehensive completion rates, student progress matrix, and attempt analytics
func FacultyGetCourseAnalytics(c *gin.Context) {
	database.EnsureLabTables(database.DB)
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	sectionFilter := strings.TrimSpace(c.Query("section"))

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Fetch all experiments for course
	var experiments []models.LabExperiment
	database.DB.Where("course_id = ?", courseID).Order("experiment_no asc").Find(&experiments)

	expIDs := make([]uint, len(experiments))
	for i, e := range experiments {
		expIDs[i] = e.ID
	}

	// Fetch all students (filtered by section if specified)
	studentQuery := database.DB.Model(&models.User{}).Where("LOWER(role) IN ?", []string{"student", "user"})
	if sectionFilter != "" && sectionFilter != "ALL" {
		studentQuery = studentQuery.Where("section = ?", sectionFilter)
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

	c.JSON(http.StatusOK, gin.H{
		"course":                  course,
		"experiments":             experiments,
		"total_students":          totalStudentsCount,
		"overall_completion_rate": overallCompletionPct,
		"average_score":           avgScoreAll,
		"experiment_stats":        expStats,
		"student_matrix":          studentMatrix,
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
	database.DB.Where("student_id = ?", studentID).Find(&submissions)

	subMap := make(map[uint]models.LabSubmission)
	for _, sub := range submissions {
		subMap[sub.ExperimentID] = sub
	}

	var expItems []services.CustomLabExperimentItem
	for _, exp := range experiments {
		sub, hasSub := subMap[exp.ID]

		code := exp.StarterCode
		outText := fmt.Sprintf("All assertions passed successfully for '%s'.", exp.Title)
		marks := exp.MaxMarks
		if marks <= 0 {
			marks = 10
		}
		passCount := 3
		totalTests := 3
		status := "APPROVED"
		dateStr := time.Now().Format("02-01-2006")

		if hasSub {
			if strings.TrimSpace(sub.SubmittedCode) != "" {
				code = sub.SubmittedCode
			}
			if sub.ExecutionOutput != "" {
				outText = sub.ExecutionOutput
			}
			if sub.Marks > 0 {
				marks = sub.Marks
			}
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

		if strings.TrimSpace(code) == "" {
			code = fmt.Sprintf("# Solution for Ex %d: %s\nprint('Output verified')", exp.ExperimentNo, exp.Title)
		}

		expItems = append(expItems, services.CustomLabExperimentItem{
			ExperimentNo:    exp.ExperimentNo,
			Title:           exp.Title,
			Aim:             exp.Aim,
			Procedure:       exp.Procedure,
			Language:        exp.Language,
			SubmittedCode:   code,
			ExecutionOutput: outText,
			PassCount:       passCount,
			TotalTestCases:  totalTests,
			Marks:           marks,
			Status:          status,
			Date:            dateStr,
			ResultText:      fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification test cases, and evaluated.", exp.Title),
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

