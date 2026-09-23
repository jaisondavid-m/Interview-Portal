package controllers

import (
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

// GetAdminLabData returns all courses, faculty, students, and mappings for Admin Setup
func GetAdminLabData(c *gin.Context) {
	var courses []models.LabCourse
	database.DB.Order("title asc").Find(&courses)

	// Fetch only users with role = 'faculty' from users table
	var facultyList []models.User
	if err := database.DB.Where("LOWER(role) = ?", "faculty").Order("name asc").Find(&facultyList).Error; err != nil {
		facultyList = []models.User{}
	}

	var studentList []models.User
	if err := database.DB.Where("LOWER(role) IN ?", []string{"student", "user"}).Order("name asc").Find(&studentList).Error; err != nil {
		studentList = []models.User{}
	}

	var mappings []models.LabMapping
	database.DB.Preload("Course").Preload("Faculty").Find(&mappings)

	var records []models.LabRecord
	database.DB.Preload("Student").Preload("Course").Find(&records)

	c.JSON(http.StatusOK, gin.H{
		"courses":     courses,
		"faculty":     facultyList,
		"students":    studentList,
		"mappings":    mappings,
		"lab_records": records,
	})
}

type CreateMappingReq struct {
	CourseID     uint   `json:"course_id" binding:"required"`
	FacultyID    uint   `json:"faculty_id" binding:"required"`
	Section      string `json:"section"`
	Semester     string `json:"semester"`
	AcademicYear string `json:"academic_year"`
}

// CreateLabMapping creates a faculty assignment mapping for a lab course
func CreateLabMapping(c *gin.Context) {
	var req CreateMappingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid mapping payload"})
		return
	}

	mapping := models.LabMapping{
		CourseID:     req.CourseID,
		FacultyID:    req.FacultyID,
		Section:      req.Section,
		Semester:     req.Semester,
		AcademicYear: req.AcademicYear,
	}

	if err := database.DB.Create(&mapping).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create lab mapping"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Faculty lab mapping created successfully!",
		"mapping": mapping,
	})
}

// DeleteLabMapping removes a lab mapping
func DeleteLabMapping(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 64)

	if err := database.DB.Delete(&models.LabMapping{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete mapping"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Mapping deleted successfully"})
}

// AdminPreviewStudentRecordPDF allows admin to inspect PDF preview for any student
func AdminPreviewStudentRecordPDF(c *gin.Context) {
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

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=PREVIEW_%s_%s.pdf", student.RollNo, course.CourseCode))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// AdminGetLabFacultyList queries users table for users where role = 'faculty' with optional search
func AdminGetLabFacultyList(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))
	query := database.DB.Model(&models.User{}).Where("LOWER(role) = ?", "faculty")

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(department) LIKE ? OR LOWER(roll_no) LIKE ?", s, s, s, s)
	}

	var facultyList []models.User
	if err := query.Order("name asc").Find(&facultyList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch faculty users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"faculty": facultyList,
	})
}

type BatchAssignSectionReq struct {
	StudentIDs []uint `json:"student_ids" binding:"required"`
	Section    string `json:"section"` // empty string unassigns/removes
}

// BatchAssignStudentSection updates section/batch for multiple students
func BatchAssignStudentSection(c *gin.Context) {
	var req BatchAssignSectionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload, student_ids required"})
		return
	}

	if len(req.StudentIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No students selected"})
		return
	}

	trimmedSection := strings.TrimSpace(req.Section)
	res := database.DB.Model(&models.User{}).
		Where("id IN ?", req.StudentIDs).
		Update("section", trimmedSection)

	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update student sections"})
		return
	}

	msg := fmt.Sprintf("Successfully assigned %d student(s) to %s", res.RowsAffected, trimmedSection)
	if trimmedSection == "" {
		msg = fmt.Sprintf("Successfully removed %d student(s) from batch", res.RowsAffected)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": msg,
		"count":   res.RowsAffected,
		"section": trimmedSection,
	})
}

// GetBatchStudentStats returns student count breakdown across all sections
func GetBatchStudentStats(c *gin.Context) {
	type SectionCount struct {
		Section string `json:"section"`
		Count   int64  `json:"count"`
	}

	var results []SectionCount
	database.DB.Model(&models.User{}).
		Select("COALESCE(NULLIF(section, ''), 'Unassigned') as section, count(*) as count").
		Where("LOWER(role) IN ?", []string{"student", "user"}).
		Group("COALESCE(NULLIF(section, ''), 'Unassigned')").
		Scan(&results)

	c.JSON(http.StatusOK, gin.H{
		"stats": results,
	})
}

type LabCourseInput struct {
	CourseCode       string `json:"course_code" binding:"required"`
	Title            string `json:"title" binding:"required"`
	Department       string `json:"department"`
	Degree           string `json:"degree"`
	Semester         string `json:"semester"`
	AcademicYear     string `json:"academic_year"`
	TotalExperiments int    `json:"total_experiments"`
	Description      string `json:"description"`
}

// CreateLabCourse creates a new lab course
func CreateLabCourse(c *gin.Context) {
	var input LabCourseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Course Code and Title are required"})
		return
	}

	if input.TotalExperiments <= 0 {
		input.TotalExperiments = 7
	}
	if input.Degree == "" {
		input.Degree = "B.Tech"
	}

	course := models.LabCourse{
		CourseCode:       strings.TrimSpace(input.CourseCode),
		Title:            strings.TrimSpace(input.Title),
		Department:       strings.TrimSpace(input.Department),
		Degree:           strings.TrimSpace(input.Degree),
		Semester:         strings.TrimSpace(input.Semester),
		AcademicYear:     strings.TrimSpace(input.AcademicYear),
		TotalExperiments: input.TotalExperiments,
		Description:      strings.TrimSpace(input.Description),
	}

	if err := database.DB.Create(&course).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create lab course: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Lab course created successfully",
		"course":  course,
	})
}

// UpdateLabCourse updates an existing lab course
func UpdateLabCourse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lab course not found"})
		return
	}

	var input LabCourseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course input data"})
		return
	}

	updates := map[string]interface{}{}
	if input.CourseCode != "" {
		updates["course_code"] = strings.TrimSpace(input.CourseCode)
	}
	if input.Title != "" {
		updates["title"] = strings.TrimSpace(input.Title)
	}
	if input.Department != "" {
		updates["department"] = strings.TrimSpace(input.Department)
	}
	if input.Degree != "" {
		updates["degree"] = strings.TrimSpace(input.Degree)
	}
	if input.Semester != "" {
		updates["semester"] = strings.TrimSpace(input.Semester)
	}
	if input.AcademicYear != "" {
		updates["academic_year"] = strings.TrimSpace(input.AcademicYear)
	}
	if input.TotalExperiments > 0 {
		updates["total_experiments"] = input.TotalExperiments
	}
	updates["description"] = strings.TrimSpace(input.Description)

	if err := database.DB.Model(&course).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update lab course: " + err.Error()})
		return
	}

	database.DB.First(&course, id)
	c.JSON(http.StatusOK, gin.H{
		"message": "Lab course updated successfully",
		"course":  course,
	})
}

// DeleteLabCourse removes a lab course
func DeleteLabCourse(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	if err := database.DB.Delete(&models.LabCourse{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete lab course"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Lab course deleted successfully",
	})
}

// AdminGetCourseExperiments fetches all experiments for a specific course and its details
func AdminGetCourseExperiments(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lab course not found"})
		return
	}

	var experiments []models.LabExperiment
	if err := database.DB.Where("course_id = ?", courseID).Order("experiment_no asc").Find(&experiments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch experiments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"course":      course,
		"experiments": experiments,
	})
}

type ExperimentInput struct {
	ExperimentNo    int    `json:"experiment_no" binding:"required"`
	Title           string `json:"title" binding:"required"`
	Aim             string `json:"aim" binding:"required"`
	Procedure       string `json:"procedure"`
	Language        string `json:"language"`
	StarterCode     string `json:"starter_code"`
	SampleTestCases string `json:"sample_test_cases"`
	HiddenTestCases string `json:"hidden_test_cases"`
	MaxMarks        int    `json:"max_marks"`
}

// AdminCreateExperiment adds a new experiment to a lab course
func AdminCreateExperiment(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var input ExperimentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Experiment Number, Title and Aim are required"})
		return
	}

	lang := input.Language
	if lang == "" {
		lang = "python"
	}
	maxMarks := input.MaxMarks
	if maxMarks <= 0 {
		maxMarks = 10
	}

	exp := models.LabExperiment{
		CourseID:        uint(courseID),
		ExperimentNo:    input.ExperimentNo,
		Title:           strings.TrimSpace(input.Title),
		Aim:             strings.TrimSpace(input.Aim),
		Procedure:       strings.TrimSpace(input.Procedure),
		Language:        lang,
		StarterCode:     input.StarterCode,
		SampleTestCases: input.SampleTestCases,
		HiddenTestCases: input.HiddenTestCases,
		MaxMarks:        maxMarks,
	}

	if err := database.DB.Create(&exp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create experiment: " + err.Error()})
		return
	}

	// Also update course's total_experiments count if needed
	var count int64
	database.DB.Model(&models.LabExperiment{}).Where("course_id = ?", courseID).Count(&count)
	database.DB.Model(&models.LabCourse{}).Where("id = ?", courseID).Update("total_experiments", count)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Experiment created successfully",
		"experiment": exp,
	})
}

// AdminUpdateExperiment updates an existing experiment
func AdminUpdateExperiment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	var exp models.LabExperiment
	if err := database.DB.First(&exp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	var input ExperimentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment input data"})
		return
	}

	updates := map[string]interface{}{}
	if input.ExperimentNo > 0 {
		updates["experiment_no"] = input.ExperimentNo
	}
	if input.Title != "" {
		updates["title"] = strings.TrimSpace(input.Title)
	}
	if input.Aim != "" {
		updates["aim"] = strings.TrimSpace(input.Aim)
	}
	updates["procedure"] = strings.TrimSpace(input.Procedure)
	if input.Language != "" {
		updates["language"] = input.Language
	}
	updates["starter_code"] = input.StarterCode
	updates["sample_test_cases"] = input.SampleTestCases
	updates["hidden_test_cases"] = input.HiddenTestCases
	if input.MaxMarks > 0 {
		updates["max_marks"] = input.MaxMarks
	}

	if err := database.DB.Model(&exp).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update experiment: " + err.Error()})
		return
	}

	database.DB.First(&exp, id)
	c.JSON(http.StatusOK, gin.H{
		"message":    "Experiment updated successfully",
		"experiment": exp,
	})
}

// AdminDeleteExperiment removes an experiment
func AdminDeleteExperiment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	var exp models.LabExperiment
	if err := database.DB.First(&exp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Experiment not found"})
		return
	}

	courseID := exp.CourseID

	if err := database.DB.Delete(&exp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete experiment"})
		return
	}

	// Update course's total_experiments count
	var count int64
	database.DB.Model(&models.LabExperiment{}).Where("course_id = ?", courseID).Count(&count)
	database.DB.Model(&models.LabCourse{}).Where("id = ?", courseID).Update("total_experiments", count)

	c.JSON(http.StatusOK, gin.H{
		"message": "Experiment deleted successfully",
	})
}

// AdminGetCoursePdfTemplate compiles and returns the full editable template data for all experiments of a course
func AdminGetCoursePdfTemplate(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lab course not found"})
		return
	}

	var experiments []models.LabExperiment
	database.DB.Where("course_id = ?", courseID).Order("experiment_no asc").Find(&experiments)

	var expItems []services.CustomLabExperimentItem
	for _, exp := range experiments {
		defaultCode := exp.StarterCode
		if strings.TrimSpace(defaultCode) == "" {
			defaultCode = fmt.Sprintf("# Solution for Ex %d: %s\n\ndef solution():\n    print('Experiment %d completed successfully')\n\nif __name__ == '__main__':\n    solution()", exp.ExperimentNo, exp.Title, exp.ExperimentNo)
		}

		marksVal := exp.MaxMarks
		if marksVal <= 0 {
			marksVal = 10
		}

		expItems = append(expItems, services.CustomLabExperimentItem{
			ExperimentNo:    exp.ExperimentNo,
			Title:           exp.Title,
			Aim:             exp.Aim,
			Procedure:       exp.Procedure,
			Language:        exp.Language,
			SubmittedCode:   defaultCode,
			ExecutionOutput: fmt.Sprintf("All test cases passed. Console output verified for '%s'.", exp.Title),
			PassCount:       3,
			TotalTestCases:  3,
			Marks:           marksVal,
			Status:          "APPROVED",
			Date:            time.Now().Format("02-01-2006"),
			ResultText:      fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification test cases, and evaluated.", exp.Title),
		})
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
		StudentName:      "JAISON DAVID M",
		RollNo:           "7376222AD145",
		RegisterNo:       "7376222AD145",
		BranchSection:    fmt.Sprintf("%s (A)", course.Department),
		VerificationID:   fmt.Sprintf("MOCKMATE-REC-OFFICIAL-%s", course.CourseCode),
		CertificateText:  fmt.Sprintf("Certified that this is the bonafide record of practical work done by the student of %s in the %s (%s) Laboratory of Bannari Amman Institute of Technology during the academic year %s.", course.Semester, course.Title, course.CourseCode, course.AcademicYear),
		StaffIncharge:    "Staff Incharge",
		HeadOfDepartment: "Head of Department",
		Experiments:      expItems,
	}

	c.JSON(http.StatusOK, gin.H{
		"course":   course,
		"template": templateData,
	})
}

// AdminSaveCoursePdfTemplate persists modified template defaults across all experiments for the course
func AdminSaveCoursePdfTemplate(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lab course not found"})
		return
	}

	var payload services.CustomLabRecordData
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template payload: " + err.Error()})
		return
	}

	// Update Course details if modified
	courseUpdates := map[string]interface{}{}
	if payload.Department != "" {
		courseUpdates["department"] = payload.Department
	}
	if payload.Degree != "" {
		courseUpdates["degree"] = payload.Degree
	}
	if payload.Semester != "" {
		courseUpdates["semester"] = payload.Semester
	}
	if payload.AcademicYear != "" {
		courseUpdates["academic_year"] = payload.AcademicYear
	}
	if len(payload.Experiments) > 0 {
		courseUpdates["total_experiments"] = len(payload.Experiments)
	}
	if len(courseUpdates) > 0 {
		database.DB.Model(&course).Updates(courseUpdates)
	}

	// Update or create each experiment in database
	for _, item := range payload.Experiments {
		var exp models.LabExperiment
		err := database.DB.Where("course_id = ? AND experiment_no = ?", courseID, item.ExperimentNo).First(&exp).Error
		if err != nil {
			// Create new experiment record
			exp = models.LabExperiment{
				CourseID:     uint(courseID),
				ExperimentNo: item.ExperimentNo,
				Title:        item.Title,
				Aim:          item.Aim,
				Procedure:    item.Procedure,
				Language:     item.Language,
				StarterCode:  item.SubmittedCode,
				MaxMarks:     item.Marks,
			}
			database.DB.Create(&exp)
		} else {
			// Update existing experiment
			expUpdates := map[string]interface{}{
				"title":        item.Title,
				"aim":          item.Aim,
				"procedure":    item.Procedure,
				"starter_code": item.SubmittedCode,
			}
			if item.Language != "" {
				expUpdates["language"] = item.Language
			}
			if item.Marks > 0 {
				expUpdates["max_marks"] = item.Marks
			}
			database.DB.Model(&exp).Updates(expUpdates)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Course Lab Record template successfully saved for all experiments!",
		"course":  course,
	})
}

// AdminGetExperimentQuestionVariants returns all question variants with viva questions for an experiment
func AdminGetExperimentQuestionVariants(c *gin.Context) {
	expIDStr := c.Param("expId")
	expID, err := strconv.ParseUint(expIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid experiment ID"})
		return
	}

	var questions []models.LabExperimentQuestion
	database.DB.Where("experiment_id = ?", expID).Order("id asc").Find(&questions)

	// Fetch Viva questions for each variant
	type VariantWithVivas struct {
		models.LabExperimentQuestion
		VivaQuestions []models.LabVivaQuestion `json:"viva_questions"`
	}

	var results []VariantWithVivas
	for _, q := range questions {
		var vivas []models.LabVivaQuestion
		database.DB.Where("question_id = ?", q.ID).Order("order_index asc, id asc").Find(&vivas)
		results = append(results, VariantWithVivas{
			LabExperimentQuestion: q,
			VivaQuestions:         vivas,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"variants": results,
	})
}

type SaveQuestionVariantReq struct {
	ID                 uint                     `json:"id"`
	ExperimentID       uint                     `json:"experiment_id" binding:"required"`
	CourseID           uint                     `json:"course_id" binding:"required"`
	QuestionCode       string                   `json:"question_code" binding:"required"`
	Title              string                   `json:"title" binding:"required"`
	Aim                string                   `json:"aim" binding:"required"`
	ReferenceAlgorithm string                   `json:"reference_algorithm"`
	SolutionCode       string                   `json:"solution_code"`
	Language           string                   `json:"language"`
	SampleTestCases    string                   `json:"sample_test_cases"`
	HiddenTestCases    string                   `json:"hidden_test_cases"`
	MaxMarks           int                      `json:"max_marks"`
	VivaQuestionsCount int                      `json:"viva_questions_count"`
	IsActive           bool                     `json:"is_active"`
	VivaQuestions      []models.LabVivaQuestion `json:"viva_questions"`
}

// AdminSaveExperimentQuestionVariant creates or updates a question variant along with its viva questions pool
func AdminSaveExperimentQuestionVariant(c *gin.Context) {
	var req SaveQuestionVariantReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid question variant payload: " + err.Error()})
		return
	}

	lang := req.Language
	if lang == "" {
		lang = "python"
	}
	marks := req.MaxMarks
	if marks <= 0 {
		marks = 10
	}
	vivaCount := req.VivaQuestionsCount
	if vivaCount <= 0 {
		vivaCount = 5
	}

	var variant models.LabExperimentQuestion
	isNew := true
	if req.ID > 0 {
		if err := database.DB.First(&variant, req.ID).Error; err == nil {
			isNew = false
		}
	}

	variant.ExperimentID = req.ExperimentID
	variant.CourseID = req.CourseID
	variant.QuestionCode = req.QuestionCode
	variant.Title = req.Title
	variant.Aim = req.Aim
	variant.ReferenceAlgorithm = req.ReferenceAlgorithm
	variant.SolutionCode = req.SolutionCode
	variant.Language = lang
	variant.SampleTestCases = req.SampleTestCases
	variant.HiddenTestCases = req.HiddenTestCases
	variant.MaxMarks = marks
	variant.VivaQuestionsCount = vivaCount
	variant.IsActive = req.IsActive

	if isNew {
		if err := database.DB.Create(&variant).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create question variant: " + err.Error()})
			return
		}
	} else {
		if err := database.DB.Save(&variant).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update question variant: " + err.Error()})
			return
		}
	}

	// Update Viva questions pool if provided
	if req.VivaQuestions != nil {
		// Delete old viva questions
		database.DB.Where("question_id = ?", variant.ID).Delete(&models.LabVivaQuestion{})
		for i, vq := range req.VivaQuestions {
			if strings.TrimSpace(vq.Question) != "" {
				newVq := models.LabVivaQuestion{
					QuestionID:   variant.ID,
					ExperimentID: variant.ExperimentID,
					Question:     strings.TrimSpace(vq.Question),
					Answer:       strings.TrimSpace(vq.Answer),
					OrderIndex:   i + 1,
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				database.DB.Create(&newVq)
			}
		}
	}

	var savedVivas []models.LabVivaQuestion
	database.DB.Where("question_id = ?", variant.ID).Order("order_index asc").Find(&savedVivas)

	c.JSON(http.StatusOK, gin.H{
		"message":        "Question variant saved successfully!",
		"variant":        variant,
		"viva_questions": savedVivas,
	})
}

// AdminDeleteExperimentQuestionVariant removes a question variant and its viva questions
func AdminDeleteExperimentQuestionVariant(c *gin.Context) {
	idStr := c.Param("variantId")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid variant ID"})
		return
	}

	database.DB.Where("question_id = ?", id).Delete(&models.LabVivaQuestion{})
	database.DB.Where("question_id = ?", id).Delete(&models.LabQuestionAllocation{})
	database.DB.Delete(&models.LabExperimentQuestion{}, id)

	c.JSON(http.StatusOK, gin.H{
		"message": "Question variant deleted successfully!",
	})
}

// AdminTestRunSolutionCode executes the reference solution code against all sample & hidden test cases
func AdminTestRunSolutionCode(c *gin.Context) {
	var req struct {
		Code            string `json:"code" binding:"required"`
		Language        string `json:"language" binding:"required"`
		SampleTestCases string `json:"sample_test_cases"`
		HiddenTestCases string `json:"hidden_test_cases"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code and Language are required"})
		return
	}

	var allCases []EvalTestCase
	idx := 1

	var sampleCases []RawTestCase
	if req.SampleTestCases != "" {
		_ = json.Unmarshal([]byte(req.SampleTestCases), &sampleCases)
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
	if req.HiddenTestCases != "" {
		_ = json.Unmarshal([]byte(req.HiddenTestCases), &hiddenCases)
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

	results, execErr := ExecuteTestCases(req.Code, req.Language, allCases)
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

// AdminBulkCreateExperiments handles batch insertion/updating of experiments for a lab course
func AdminBulkCreateExperiments(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := strconv.ParseUint(courseIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var course models.LabCourse
	if err := database.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lab course not found"})
		return
	}

	var inputs []ExperimentInput
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format. Expected an array of experiments: " + err.Error()})
		return
	}

	if len(inputs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No experiments provided in payload"})
		return
	}

	createdCount := 0
	updatedCount := 0
	var errors []string

	tx := database.DB.Begin()
	for i, input := range inputs {
		if strings.TrimSpace(input.Title) == "" {
			errors = append(errors, fmt.Sprintf("Item %d: Title is required", i+1))
			continue
		}
		if strings.TrimSpace(input.Aim) == "" {
			errors = append(errors, fmt.Sprintf("Item %d (%s): Aim is required", i+1, input.Title))
			continue
		}

		expNo := input.ExperimentNo
		if expNo <= 0 {
			expNo = i + 1
		}
		lang := input.Language
		if lang == "" {
			lang = "python"
		}
		maxMarks := input.MaxMarks
		if maxMarks <= 0 {
			maxMarks = 10
		}

		var existing models.LabExperiment
		err := tx.Where("course_id = ? AND experiment_no = ?", courseID, expNo).First(&existing).Error
		if err == nil {
			// Update existing
			existing.Title = strings.TrimSpace(input.Title)
			existing.Aim = strings.TrimSpace(input.Aim)
			existing.Procedure = strings.TrimSpace(input.Procedure)
			existing.Language = lang
			existing.StarterCode = input.StarterCode
			existing.SampleTestCases = input.SampleTestCases
			existing.HiddenTestCases = input.HiddenTestCases
			existing.MaxMarks = maxMarks
			if err := tx.Save(&existing).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Item %d: %s", i+1, err.Error()))
			} else {
				updatedCount++
			}
		} else {
			// Create new
			newExp := models.LabExperiment{
				CourseID:        uint(courseID),
				ExperimentNo:    expNo,
				Title:           strings.TrimSpace(input.Title),
				Aim:             strings.TrimSpace(input.Aim),
				Procedure:       strings.TrimSpace(input.Procedure),
				Language:        lang,
				StarterCode:     input.StarterCode,
				SampleTestCases: input.SampleTestCases,
				HiddenTestCases: input.HiddenTestCases,
				MaxMarks:        maxMarks,
			}
			if err := tx.Create(&newExp).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Item %d: %s", i+1, err.Error()))
			} else {
				createdCount++
				// Also create initial default variant if none exists
				var vCount int64
				tx.Model(&models.LabExperimentQuestion{}).Where("experiment_id = ?", newExp.ID).Count(&vCount)
				if vCount == 0 {
					defVariant := models.LabExperimentQuestion{
						ExperimentID:       newExp.ID,
						CourseID:           uint(courseID),
						QuestionCode:       fmt.Sprintf("EX%d_VAR_A", newExp.ExperimentNo),
						Title:              newExp.Title,
						Aim:                newExp.Aim,
						ReferenceAlgorithm: newExp.Procedure,
						SolutionCode:       newExp.StarterCode,
						Language:           lang,
						SampleTestCases:    newExp.SampleTestCases,
						HiddenTestCases:    newExp.HiddenTestCases,
						MaxMarks:           maxMarks,
						VivaQuestionsCount: 5,
						IsActive:           true,
					}
					tx.Create(&defVariant)
				}
			}
		}
	}

	if len(errors) > 0 && createdCount == 0 && updatedCount == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to process any experiments in batch",
			"details": errors,
		})
		return
	}

	tx.Commit()

	// Update course total_experiments count
	var totalCount int64
	database.DB.Model(&models.LabExperiment{}).Where("course_id = ?", courseID).Count(&totalCount)
	database.DB.Model(&models.LabCourse{}).Where("id = ?", courseID).Update("total_experiments", totalCount)

	c.JSON(http.StatusOK, gin.H{
		"message":       fmt.Sprintf("Bulk upload completed: %d created, %d updated", createdCount, updatedCount),
		"created_count": createdCount,
		"updated_count": updatedCount,
		"errors":        errors,
		"total_count":   totalCount,
	})
}

// AdminBulkCreateQuestionVariants handles batch insertion/updating of question variants for an experiment
func AdminBulkCreateQuestionVariants(c *gin.Context) {
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

	var inputs []SaveQuestionVariantReq
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format. Expected an array of question variants: " + err.Error()})
		return
	}

	if len(inputs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No question variants provided in payload"})
		return
	}

	createdCount := 0
	updatedCount := 0
	var errors []string

	tx := database.DB.Begin()
	for i, input := range inputs {
		if strings.TrimSpace(input.Title) == "" {
			errors = append(errors, fmt.Sprintf("Variant %d: Title is required", i+1))
			continue
		}
		if strings.TrimSpace(input.Aim) == "" {
			errors = append(errors, fmt.Sprintf("Variant %d (%s): Aim is required", i+1, input.Title))
			continue
		}

		qCode := strings.TrimSpace(input.QuestionCode)
		if qCode == "" {
			qCode = fmt.Sprintf("EX%d_VAR_%c", exp.ExperimentNo, rune('A'+i))
		}
		lang := input.Language
		if lang == "" {
			lang = exp.Language
		}
		if lang == "" {
			lang = "python"
		}
		marks := input.MaxMarks
		if marks <= 0 {
			marks = exp.MaxMarks
		}
		if marks <= 0 {
			marks = 10
		}
		vivaCount := input.VivaQuestionsCount
		if vivaCount <= 0 {
			vivaCount = 5
		}

		var variant models.LabExperimentQuestion
		var isNew bool
		if input.ID > 0 {
			if err := tx.First(&variant, input.ID).Error; err == nil {
				isNew = false
			} else {
				isNew = true
			}
		} else {
			// Check if code matches existing
			if err := tx.Where("experiment_id = ? AND question_code = ?", exp.ID, qCode).First(&variant).Error; err == nil {
				isNew = false
			} else {
				isNew = true
			}
		}

		variant.ExperimentID = exp.ID
		variant.CourseID = exp.CourseID
		variant.QuestionCode = qCode
		variant.Title = strings.TrimSpace(input.Title)
		variant.Aim = strings.TrimSpace(input.Aim)
		variant.ReferenceAlgorithm = input.ReferenceAlgorithm
		variant.SolutionCode = input.SolutionCode
		variant.Language = lang
		variant.SampleTestCases = input.SampleTestCases
		variant.HiddenTestCases = input.HiddenTestCases
		variant.MaxMarks = marks
		variant.VivaQuestionsCount = vivaCount
		variant.IsActive = true

		if isNew {
			if err := tx.Create(&variant).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Variant %d: %s", i+1, err.Error()))
				continue
			}
			createdCount++
		} else {
			if err := tx.Save(&variant).Error; err != nil {
				errors = append(errors, fmt.Sprintf("Variant %d: %s", i+1, err.Error()))
				continue
			}
			updatedCount++
		}

		// Save viva questions if present
		if len(input.VivaQuestions) > 0 {
			tx.Where("question_id = ?", variant.ID).Delete(&models.LabVivaQuestion{})
			for vi, vq := range input.VivaQuestions {
				if strings.TrimSpace(vq.Question) != "" {
					newVq := models.LabVivaQuestion{
						QuestionID:   variant.ID,
						ExperimentID: variant.ExperimentID,
						Question:     strings.TrimSpace(vq.Question),
						Answer:       strings.TrimSpace(vq.Answer),
						OrderIndex:   vi + 1,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					}
					tx.Create(&newVq)
				}
			}
		}
	}

	if len(errors) > 0 && createdCount == 0 && updatedCount == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to process any question variants in batch",
			"details": errors,
		})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message":       fmt.Sprintf("Bulk variants upload completed: %d created, %d updated", createdCount, updatedCount),
		"created_count": createdCount,
		"updated_count": updatedCount,
		"errors":        errors,
	})
}


