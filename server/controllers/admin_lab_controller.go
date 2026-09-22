package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"server/database"
	"server/models"
	"server/services"

	"github.com/gin-gonic/gin"
)

// GetAdminLabData returns all courses, faculty, students, and mappings for Admin Setup
func GetAdminLabData(c *gin.Context) {
	var courses []models.LabCourse
	database.DB.Find(&courses)

	var users []models.User
	database.DB.Find(&users)

	var facultyList []models.User
	var studentList []models.User
	for _, u := range users {
		if u.Role == "admin" || u.Role == "faculty" {
			facultyList = append(facultyList, u)
		}
		if u.Role == "student" || u.Role == "user" {
			studentList = append(studentList, u)
		}
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
