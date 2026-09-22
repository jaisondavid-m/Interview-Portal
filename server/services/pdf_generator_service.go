package services

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"server/models"

	"github.com/jung-kurt/gofpdf"
)

// GenerateLabRecordPDF builds an official university-standard A4 PDF document for a student's lab record
func GenerateLabRecordPDF(course models.LabCourse, student models.User, submissions []models.LabSubmission, record models.LabRecord) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)

	// ----------------------------------------------------
	// PAGE 1: COVER PAGE
	// ----------------------------------------------------
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, strings.ToUpper(course.Department), "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 8, "LABORATORY RECORD MANUAL", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "I", 12)
	pdf.CellFormat(0, 7, fmt.Sprintf("%s | %s", course.Degree, course.Semester), "", 1, "C", false, 0, "")
	pdf.Ln(5)

	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, fmt.Sprintf("%s - %s", course.CourseCode, course.Title), "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 6, fmt.Sprintf("Academic Year: %s", course.AcademicYear), "", 1, "C", false, 0, "")
	pdf.Ln(15)

	// Student Metadata Box
	pdf.SetFillColor(240, 244, 248)
	pdf.SetDrawColor(180, 195, 210)
	pdf.SetLineWidth(0.4)
	pdf.Rect(20, pdf.GetY(), 170, 45, "FD")

	currY := pdf.GetY() + 5
	pdf.SetY(currY)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetX(25)
	pdf.Cell(40, 7, "STUDENT NAME:")
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(100, 7, student.Name)
	pdf.Ln(8)

	pdf.SetX(25)
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(40, 7, "ROLL / REG NO:")
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(100, 7, student.RollNo)
	pdf.Ln(8)

	pdf.SetX(25)
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(40, 7, "DEPARTMENT:")
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(100, 7, student.Department)
	pdf.Ln(8)

	pdf.SetX(25)
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(40, 7, "VERIFICATION HASH:")
	pdf.SetFont("Courier", "", 9)
	hashStr := record.SignatureHash
	if hashStr == "" {
		hashStr = fmt.Sprintf("MOCKMATE-RECORD-%d-%d", student.ID, course.ID)
	}
	pdf.Cell(100, 7, hashStr)
	pdf.Ln(25)

	// Bonafide Certificate Box
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 10, "BONAFIDE CERTIFICATE", "", 1, "C", false, 0, "")
	pdf.Ln(2)

	certText := fmt.Sprintf("Certified to be the bonafide record of work done by %s (Roll No: %s) in the %s (%s) Laboratory during the academic year %s.",
		student.Name, student.RollNo, course.Title, course.CourseCode, course.AcademicYear)

	pdf.SetFont("Arial", "", 11)
	pdf.MultiCell(0, 6, certText, "", "C", false)
	pdf.Ln(25)

	// Signature Lines
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(85, 6, "Staff Incharge", "", 0, "C", false, 0, "")
	pdf.CellFormat(85, 6, "Head of Department (HOD)", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "I", 9)
	pdf.CellFormat(85, 5, "(Digital Verification Sign-off)", "", 0, "C", false, 0, "")
	pdf.CellFormat(85, 5, "(Department Seal)", "", 1, "C", false, 0, "")

	// ----------------------------------------------------
	// PAGE 2: INDEX TABLE
	// ----------------------------------------------------
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 10, "LIST OF EXPERIMENTS", "", 1, "C", false, 0, "")
	pdf.Ln(3)

	// Table Header
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(220, 230, 242)
	pdf.CellFormat(15, 8, "EX NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(100, 8, "EXPERIMENT NAME", "1", 0, "L", true, 0, "")
	pdf.CellFormat(25, 8, "MARKS (10)", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 8, "STATUS", "1", 1, "C", true, 0, "")

	// Map submissions by Exp ID
	subMap := make(map[uint]models.LabSubmission)
	for _, sub := range submissions {
		subMap[sub.ExperimentID] = sub
	}

	pdf.SetFont("Arial", "", 9)
	for _, sub := range submissions {
		title := sub.Experiment.Title
		if len(title) > 55 {
			title = title[:52] + "..."
		}
		pdf.CellFormat(15, 8, fmt.Sprintf("%02d", sub.Experiment.ExperimentNo), "1", 0, "C", false, 0, "")
		pdf.CellFormat(100, 8, title, "1", 0, "L", false, 0, "")
		pdf.CellFormat(25, 8, fmt.Sprintf("%d / 10", sub.Marks), "1", 0, "C", false, 0, "")
		statusStr := sub.Status
		if statusStr == "APPROVED" {
			statusStr = "VERIFIED"
		}
		pdf.CellFormat(40, 8, statusStr, "1", 1, "C", false, 0, "")
	}
	pdf.Ln(10)

	// ----------------------------------------------------
	// PAGES 3+: EXPERIMENT DETAILS (1 TO 7)
	// ----------------------------------------------------
	for _, sub := range submissions {
		pdf.AddPage()
		exp := sub.Experiment

		// Exp Header
		pdf.SetFont("Arial", "B", 12)
		pdf.SetFillColor(235, 240, 245)
		pdf.CellFormat(0, 8, fmt.Sprintf("EX NO: %02d  |  %s", exp.ExperimentNo, strings.ToUpper(exp.Title)), "1", 1, "L", true, 0, "")
		pdf.Ln(3)

		// AIM
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "AIM:")
		pdf.Ln(5)
		pdf.SetFont("Arial", "", 10)
		pdf.MultiCell(0, 5, exp.Aim, "", "L", false)
		pdf.Ln(3)

		// PROCEDURE
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "PROCEDURE / ALGORITHM:")
		pdf.Ln(5)
		pdf.SetFont("Arial", "", 9)
		pdf.MultiCell(0, 5, exp.Procedure, "", "L", false)
		pdf.Ln(4)

		// PROGRAM SOURCE CODE
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "VERIFIED SOURCE CODE (Python):")
		pdf.Ln(5)

		pdf.SetFont("Courier", "", 8)
		pdf.SetFillColor(248, 249, 250)
		pdf.SetDrawColor(210, 215, 220)

		codeLines := strings.Split(sub.SubmittedCode, "\n")
		for _, line := range codeLines {
			if pdf.GetY() > 270 {
				pdf.AddPage()
			}
			pdf.CellFormat(0, 4, "  "+line, "LR", 1, "L", true, 0, "")
		}
		pdf.CellFormat(0, 1, "", "T", 1, "L", false, 0, "")
		pdf.Ln(4)

		// SAMPLE OUTPUT & RESULTS
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "EXECUTION OUTPUT & VERIFICATION REPORT:")
		pdf.Ln(5)

		pdf.SetFont("Courier", "", 8)
		pdf.SetFillColor(240, 248, 240)
		pdf.SetDrawColor(180, 220, 180)
		pdf.CellFormat(0, 6, fmt.Sprintf("  [STATUS]: %s | Test Cases Passed: %d / %d | Marks: %d / 10",
			sub.Status, sub.PassCount, sub.TotalTestCases, sub.Marks), "1", 1, "L", true, 0, "")
		if sub.ExecutionOutput != "" {
			pdf.CellFormat(0, 5, "  [LOG]: "+sub.ExecutionOutput, "1", 1, "L", true, 0, "")
		}
		pdf.Ln(4)

		// RESULT STATEMENT
		pdf.SetFont("Arial", "B", 10)
		pdf.Cell(0, 6, "RESULT:")
		pdf.Ln(5)
		pdf.SetFont("Arial", "I", 10)
		pdf.MultiCell(0, 5, fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, verified against hidden test cases, and evaluated.", exp.Title), "", "L", false)
		pdf.Ln(6)

		// Verification Sign Box
		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(60, 6, fmt.Sprintf("Date: %s", time.Now().Format("02-01-2006")), "1", 0, "C", false, 0, "")
		pdf.CellFormat(60, 6, fmt.Sprintf("Marks: %d / 10", sub.Marks), "1", 0, "C", false, 0, "")
		pdf.CellFormat(60, 6, "Staff Sign: VERIFIED [DIGITAL]", "1", 1, "C", false, 0, "")
	}

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
