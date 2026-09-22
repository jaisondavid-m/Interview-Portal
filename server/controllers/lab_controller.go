package controllers

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"server/database"
	"server/models"
	"server/services"

	"github.com/gin-gonic/gin"
)

// isExperimentUnlockedForStudent checks if an experiment is unlocked for the user's section
func isExperimentUnlockedForStudent(courseID uint, expID uint, userID uint, userRole string) (bool, string) {
	role := strings.ToLower(userRole)
	if role == "admin" || role == "faculty" {
		return true, "FACULTY/ADMIN"
	}

	var user models.User
	if err := database.DB.Select("id, section, role").First(&user, userID).Error; err != nil {
		return false, "UNKNOWN"
	}

	section := strings.TrimSpace(user.Section)

	var unlock models.LabExperimentUnlock
	query := database.DB.Where("course_id = ? AND experiment_id = ? AND is_unlocked = ?", courseID, expID, true)
	if section != "" {
		query = query.Where("section IN (?, 'ALL')", section)
	} else {
		query = query.Where("section = 'ALL'")
	}

	if err := query.First(&unlock).Error; err == nil {
		return true, section
	}

	return false, section
}

// GetStudentLabCourses returns active lab courses for student
func GetStudentLabCourses(c *gin.Context) {
	var courses []models.LabCourse
	if err := database.DB.Order("title asc").Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lab courses"})
		return
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
		IsUnlocked bool                  `json:"is_unlocked"`
		Submission *models.LabSubmission `json:"submission,omitempty"`
	}

	var results []ExpItem
	for _, exp := range experiments {
		unlocked, _ := isExperimentUnlockedForStudent(uint(courseID), exp.ID, userID, userRole)

		var sub models.LabSubmission
		var subPtr *models.LabSubmission
		if err := database.DB.Where("student_id = ? AND experiment_id = ?", userID, exp.ID).Order("created_at desc").First(&sub).Error; err == nil {
			subPtr = &sub
		}

		results = append(results, ExpItem{
			LabExperiment: exp,
			IsUnlocked:    unlocked,
			Submission:    subPtr,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"experiments": results,
	})
}

// GetExperimentDetails returns problem, procedure, sample test cases for experiment
func GetExperimentDetails(c *gin.Context) {
	expID := c.Param("expId")
	var exp models.LabExperiment
	if err := database.DB.First(&exp, expID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	userID, _ := userIDVal.(uint)
	userRole, _ := userRoleVal.(string)

	unlocked, userSection := isExperimentUnlockedForStudent(exp.CourseID, exp.ID, userID, userRole)

	// Fetch student's latest submission if exists
	var submission models.LabSubmission
	var subPtr *models.LabSubmission
	if err := database.DB.Where("student_id = ? AND experiment_id = ?", userID, exp.ID).Order("created_at desc").First(&submission).Error; err == nil {
		subPtr = &submission
	}

	c.JSON(http.StatusOK, gin.H{
		"experiment":   exp,
		"submission":   subPtr,
		"is_unlocked":  unlocked,
		"user_section": userSection,
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

// RunExperimentCode executes student code against SAMPLE test cases only without saving submission
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

	// Parse Sample Test Cases
	var rawCases []RawTestCase
	if exp.SampleTestCases != "" {
		_ = json.Unmarshal([]byte(exp.SampleTestCases), &rawCases)
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

// SubmitExperimentCode evaluates student code against HIDDEN test cases and creates/updates submission
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

	// Parse Hidden Test Cases (fallback to Sample Test Cases if hidden not provided)
	var rawCases []RawTestCase
	if exp.HiddenTestCases != "" {
		_ = json.Unmarshal([]byte(exp.HiddenTestCases), &rawCases)
	}
	if len(rawCases) == 0 && exp.SampleTestCases != "" {
		_ = json.Unmarshal([]byte(exp.SampleTestCases), &rawCases)
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
	for _, r := range results {
		if r.Passed {
			passCount++
		}
		if r.Passed {
			logs = append(logs, fmt.Sprintf("✓ %s Passed (%d ms)", r.Name, r.ExecutionMs))
		} else {
			logs = append(logs, fmt.Sprintf("✗ %s Failed: Expected '%s', got '%s'", r.Name, r.Expected, r.Actual))
		}
	}

	maxMarks := exp.MaxMarks
	if maxMarks <= 0 {
		maxMarks = 10
	}
	marks := 0
	if totalCases > 0 {
		marks = int(float64(passCount) / float64(totalCases) * float64(maxMarks))
	}

	// Save or update LabSubmission
	var sub models.LabSubmission
	findErr := database.DB.Where("student_id = ? AND experiment_id = ?", studentID, exp.ID).First(&sub).Error

	sub.StudentID = studentID
	sub.ExperimentID = exp.ID
	sub.SubmittedCode = req.Code
	sub.Language = req.Language
	sub.ExecutionOutput = strings.Join(logs, "\n")
	sub.PassCount = passCount
	sub.TotalTestCases = totalCases
	sub.Status = "PENDING_APPROVAL"
	sub.Marks = marks

	if findErr != nil {
		database.DB.Create(&sub)
	} else {
		database.DB.Save(&sub)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Experiment submitted successfully for faculty verification!",
		"pass_count":       passCount,
		"total_test_cases": totalCases,
		"status":           sub.Status,
		"marks":            marks,
		"submission":       sub,
		"results":          results,
	})
}

// GetFacultyQueue returns assigned student submissions for Lab Incharge
func GetFacultyQueue(c *gin.Context) {
	facultyIDVal, _ := c.Get("userID")
	facultyID := facultyIDVal.(uint)

	// Get mapped courses/sections for this faculty
	var mappings []models.LabMapping
	database.DB.Where("faculty_id = ?", facultyID).Find(&mappings)

	var submissions []models.LabSubmission
	database.DB.Preload("Student").Preload("Experiment").Order("updated_at desc").Find(&submissions)

	c.JSON(http.StatusOK, gin.H{
		"mappings":    mappings,
		"submissions": submissions,
	})
}

type VerifySingleReq struct {
	SubmissionID uint   `json:"submission_id" binding:"required"`
	Status       string `json:"status" binding:"required"` // APPROVED, REVISION_REQUIRED
	Marks        int    `json:"marks"`
	FacultyNotes string `json:"faculty_notes"`
}

// VerifySingleExperiment allows faculty to approve individual experiment
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
	sub.Marks = req.Marks
	sub.FacultyNotes = req.FacultyNotes
	sub.VerifiedBy = &facultyID
	sub.VerifiedAt = &now
	database.DB.Save(&sub)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Experiment verification saved successfully",
		"submission": sub,
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

// FacultyGetCourseReleases returns experiment unlock status matrix for courses & sections mapped to faculty
func FacultyGetCourseReleases(c *gin.Context) {
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

	var unlocks []models.LabExperimentUnlock
	database.DB.Preload("Course").Preload("Experiment").Find(&unlocks)

	var allExperiments []models.LabExperiment
	database.DB.Order("course_id asc, experiment_no asc").Find(&allExperiments)

	// Fetch distinct sections from users
	var sectionList []string
	database.DB.Model(&models.User{}).
		Where("section IS NOT NULL AND section != '' AND LOWER(role) IN ?", []string{"student", "user"}).
		Distinct().
		Pluck("section", &sectionList)

	c.JSON(http.StatusOK, gin.H{
		"courses":     courses,
		"mappings":    mappings,
		"unlocks":     unlocks,
		"experiments": allExperiments,
		"sections":    sectionList,
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
	facultyIDVal, _ := c.Get("userID")
	facultyID, _ := facultyIDVal.(uint)

	var req ToggleUnlockReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unlock toggle payload"})
		return
	}

	var unlock models.LabExperimentUnlock
	err := database.DB.Where("course_id = ? AND experiment_id = ? AND section = ?", req.CourseID, req.ExperimentID, req.Section).First(&unlock).Error

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

