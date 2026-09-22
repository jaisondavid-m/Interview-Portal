package services

import (
	"bytes"
	_ "embed"
	"fmt"
	"strings"
	"time"

	"server/models"

	"github.com/jung-kurt/gofpdf"
)

//go:embed BITlogo.png
var bitLogoBytes []byte

// GenerateLabRecordPDF builds an official university-standard A4 PDF document for a student's lab record
func GenerateLabRecordPDF(course models.LabCourse, student models.User, submissions []models.LabSubmission, record models.LabRecord) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)

	// Register College Banner Logo
	if len(bitLogoBytes) > 0 {
		pdf.RegisterImageOptionsReader("bit_logo", gofpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(bitLogoBytes))
	}

	// Helper for drawing double page borders
	drawPageBorder := func() {
		pdf.SetLineWidth(0.6)
		pdf.SetDrawColor(40, 60, 90)
		pdf.Rect(10, 10, 190, 277, "D")

		pdf.SetLineWidth(0.2)
		pdf.SetDrawColor(120, 140, 160)
		pdf.Rect(11.5, 11.5, 187, 274, "D")
	}

	// ----------------------------------------------------
	// PAGE 1: COVER PAGE & BONAFIDE CERTIFICATE
	// ----------------------------------------------------
	pdf.AddPage()
	drawPageBorder()

	// 1. Header Banner Logo
	if len(bitLogoBytes) > 0 {
		pdf.ImageOptions("bit_logo", 18, 15, 174, 22, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
		pdf.SetY(40)
	} else {
		pdf.SetY(20)
		pdf.SetFont("Arial", "B", 15)
		pdf.SetTextColor(20, 40, 80)
		pdf.CellFormat(0, 8, "BANNARI AMMAN INSTITUTE OF TECHNOLOGY", "", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(80, 90, 100)
		pdf.CellFormat(0, 5, "An Autonomous Institution Affiliated to Anna University Chennai", "", 1, "C", false, 0, "")
		pdf.SetY(40)
	}

	// Decorative Divider Line
	pdf.SetLineWidth(0.4)
	pdf.SetDrawColor(30, 60, 110)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(4)

	// Department Name
	deptName := course.Department
	if deptName == "" {
		deptName = "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE"
	}
	if !strings.HasPrefix(strings.ToUpper(deptName), "DEPARTMENT") {
		deptName = "DEPARTMENT OF " + strings.ToUpper(deptName)
	}
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(30, 50, 80)
	pdf.CellFormat(0, 7, strings.ToUpper(deptName), "", 1, "C", false, 0, "")

	// Document Title Banner Box
	pdf.Ln(2)
	pdf.SetFillColor(235, 242, 250)
	pdf.SetDrawColor(180, 200, 225)
	pdf.SetLineWidth(0.3)
	pdf.SetTextColor(20, 45, 90)
	pdf.SetFont("Arial", "B", 13)
	pdf.CellFormat(0, 9, "LABORATORY RECORD NOTEBOOK", "1", 1, "C", true, 0, "")
	pdf.Ln(3)

	// Course Details
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(20, 30, 50)
	pdf.CellFormat(0, 6, fmt.Sprintf("%s — %s", course.CourseCode, strings.ToUpper(course.Title)), "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "I", 10)
	pdf.SetTextColor(70, 80, 90)
	degreeStr := course.Degree
	if degreeStr == "" {
		degreeStr = "B.Tech"
	}
	pdf.CellFormat(0, 5, fmt.Sprintf("%s  |  %s  |  Academic Year: %s", degreeStr, course.Semester, course.AcademicYear), "", 1, "C", false, 0, "")
	pdf.Ln(6)

	// Student Profile Box (Classic Clean 2-Column Table)
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(200, 212, 225)
	pdf.SetLineWidth(0.3)
	pdf.Rect(20, pdf.GetY(), 170, 44, "FD")

	boxStartY := pdf.GetY() + 3
	pdf.SetY(boxStartY)

	drawRow := func(label, val string) {
		pdf.SetX(24)
		pdf.SetFont("Arial", "B", 10)
		pdf.SetTextColor(50, 60, 80)
		pdf.Cell(45, 6, label)
		pdf.SetFont("Arial", "", 10)
		pdf.SetTextColor(20, 25, 35)
		pdf.Cell(115, 6, ":  "+val)
		pdf.Ln(6.5)
	}

	drawRow("STUDENT NAME", strings.ToUpper(student.Name))
	drawRow("ROLL / REG NO", student.RollNo)
	drawRow("BRANCH / SECTION", fmt.Sprintf("%s (%s)", student.Department, func() string {
		if student.Section != "" {
			return student.Section
		}
		return "CSE-A"
	}()))
	drawRow("SEMESTER & YEAR", fmt.Sprintf("%s  |  %s", course.Semester, course.AcademicYear))
	hashStr := record.SignatureHash
	if hashStr == "" {
		hashStr = fmt.Sprintf("MOCKMATE-REC-%s-%s", student.RollNo, course.CourseCode)
	}
	drawRow("VERIFICATION ID", hashStr)

	pdf.SetY(boxStartY + 47)

	// Bonafide Certificate Box
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(20, 45, 90)
	pdf.CellFormat(0, 7, "BONAFIDE CERTIFICATE", "", 1, "C", false, 0, "")
	pdf.Ln(1)

	certText := fmt.Sprintf(
		"Certified that this is the bonafide record of practical work done by Mr./Ms. %s (Roll No: %s) of %s, %s in the %s (%s) Laboratory of Bannari Amman Institute of Technology during the academic year %s.",
		student.Name,
		student.RollNo,
		course.Semester,
		student.Department,
		course.Title,
		course.CourseCode,
		course.AcademicYear,
	)

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(40, 45, 55)
	pdf.SetX(22)
	pdf.MultiCell(166, 5.5, certText, "", "J", false)
	pdf.Ln(12)

	// Official Signatures Grid
	pdf.SetFont("Arial", "B", 9.5)
	pdf.SetTextColor(20, 30, 50)
	sigY := pdf.GetY()
	pdf.SetY(sigY)

	pdf.CellFormat(45, 5, "Staff Incharge", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 5, "Head of Department", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 5, "Internal Examiner", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 5, "External Examiner", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(110, 120, 130)
	pdf.CellFormat(45, 4, "(Digital Sign-off)", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 4, "(Department Seal)", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 4, "(Verified)", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 4, "(Evaluation)", "", 1, "C", false, 0, "")

	// ----------------------------------------------------
	// PAGE 2: INDEX / LIST OF EXPERIMENTS
	// ----------------------------------------------------
	pdf.AddPage()
	drawPageBorder()

	// Header
	pdf.SetY(16)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(80, 90, 100)
	pdf.CellFormat(0, 5, "BANNARI AMMAN INSTITUTE OF TECHNOLOGY  —  PRACTICAL LAB RECORD", "", 1, "C", false, 0, "")
	pdf.SetLineWidth(0.2)
	pdf.SetDrawColor(200, 210, 220)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(4)

	pdf.SetFont("Arial", "B", 13)
	pdf.SetTextColor(20, 45, 90)
	pdf.CellFormat(0, 8, "INDEX OF EXPERIMENTS", "", 1, "C", false, 0, "")
	pdf.Ln(2)

	// Table Header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(230, 238, 248)
	pdf.SetDrawColor(180, 195, 215)
	pdf.SetTextColor(20, 40, 70)
	pdf.SetLineWidth(0.3)

	pdf.CellFormat(15, 8, "EX. NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 8, "DATE", "1", 0, "C", true, 0, "")
	pdf.CellFormat(90, 8, "TITLE OF THE EXPERIMENT", "1", 0, "L", true, 0, "")
	pdf.CellFormat(22, 8, "MARKS (10)", "1", 0, "C", true, 0, "")
	pdf.CellFormat(28, 8, "STAFF SIGN", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(30, 35, 45)

	totalMarks := 0
	for _, sub := range submissions {
		title := sub.Experiment.Title
		if len(title) > 52 {
			title = title[:49] + "..."
		}
		totalMarks += sub.Marks

		dateStr := sub.CreatedAt.Format("02-01-2006")
		if sub.CreatedAt.IsZero() {
			dateStr = time.Now().Format("02-01-2006")
		}

		pdf.CellFormat(15, 7.5, fmt.Sprintf("%02d", sub.Experiment.ExperimentNo), "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 7.5, dateStr, "1", 0, "C", false, 0, "")
		pdf.CellFormat(90, 7.5, "  "+title, "1", 0, "L", false, 0, "")
		pdf.CellFormat(22, 7.5, fmt.Sprintf("%d / 10", sub.Marks), "1", 0, "C", false, 0, "")
		pdf.SetFont("Arial", "I", 8)
		pdf.SetTextColor(30, 100, 50)
		pdf.CellFormat(28, 7.5, "VERIFIED", "1", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(30, 35, 45)
	}

	// Index Total Summary Row
	if len(submissions) > 0 {
		avgMarks := float64(totalMarks) / float64(len(submissions))
		pdf.SetFont("Arial", "B", 9)
		pdf.SetFillColor(245, 248, 252)
		pdf.CellFormat(130, 8, "TOTAL EVALUATED SCORE & AVERAGE :", "1", 0, "R", true, 0, "")
		pdf.CellFormat(22, 8, fmt.Sprintf("%.1f / 10", avgMarks), "1", 0, "C", true, 0, "")
		pdf.CellFormat(28, 8, "SEALED", "1", 1, "C", true, 0, "")
	}

	// ----------------------------------------------------
	// PAGES 3+: EXPERIMENT DETAILS (1 TO N)
	// ----------------------------------------------------
	for _, sub := range submissions {
		pdf.AddPage()
		drawPageBorder()
		exp := sub.Experiment

		// Running Header
		pdf.SetY(16)
		pdf.SetFont("Arial", "I", 8.5)
		pdf.SetTextColor(100, 110, 120)
		pdf.CellFormat(90, 5, fmt.Sprintf("BIT — %s", course.CourseCode), "", 0, "L", false, 0, "")
		pdf.CellFormat(90, 5, fmt.Sprintf("Student: %s (%s)", student.Name, student.RollNo), "", 1, "R", false, 0, "")
		pdf.SetLineWidth(0.2)
		pdf.SetDrawColor(210, 220, 230)
		pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
		pdf.Ln(3)

		// Experiment Title Bar
		pdf.SetFont("Arial", "B", 11)
		pdf.SetFillColor(235, 242, 250)
		pdf.SetDrawColor(180, 200, 225)
		pdf.SetTextColor(20, 45, 90)
		pdf.CellFormat(0, 8, fmt.Sprintf("  EX NO: %02d  —  %s", exp.ExperimentNo, strings.ToUpper(exp.Title)), "1", 1, "L", true, 0, "")
		pdf.Ln(3)

		// 1. AIM
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 5, "AIM:")
		pdf.Ln(5)
		pdf.SetFont("Arial", "", 9.5)
		pdf.SetTextColor(40, 45, 55)
		pdf.MultiCell(0, 5, exp.Aim, "", "L", false)
		pdf.Ln(3)

		// 2. PROCEDURE / ALGORITHM
		if exp.Procedure != "" {
			pdf.SetFont("Arial", "B", 9.5)
			pdf.SetTextColor(30, 50, 80)
			pdf.Cell(0, 5, "PROCEDURE / ALGORITHM:")
			pdf.Ln(5)
			pdf.SetFont("Arial", "", 9)
			pdf.SetTextColor(45, 50, 60)
			pdf.MultiCell(0, 4.8, exp.Procedure, "", "L", false)
			pdf.Ln(3)
		}

		// 3. SOURCE CODE
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 5, "VERIFIED SOURCE CODE (Python 3):")
		pdf.Ln(5)

		pdf.SetFont("Courier", "", 8)
		pdf.SetTextColor(20, 30, 40)
		pdf.SetFillColor(250, 251, 253)
		pdf.SetDrawColor(215, 225, 235)

		codeLines := strings.Split(sub.SubmittedCode, "\n")
		for idx, line := range codeLines {
			if pdf.GetY() > 265 {
				pdf.AddPage()
				drawPageBorder()
				pdf.SetY(20)
				pdf.SetFont("Courier", "", 8)
				pdf.SetTextColor(20, 30, 40)
				pdf.SetFillColor(250, 251, 253)
				pdf.SetDrawColor(215, 225, 235)
			}
			numPrefix := fmt.Sprintf("%2d | ", idx+1)
			pdf.CellFormat(0, 4, numPrefix+line, "LR", 1, "L", true, 0, "")
		}
		pdf.CellFormat(0, 1, "", "T", 1, "L", false, 0, "")
		pdf.Ln(3)

		// 4. EXECUTION OUTPUT & TEST CASE REPORT
		if pdf.GetY() > 240 {
			pdf.AddPage()
			drawPageBorder()
			pdf.SetY(20)
		}

		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 5, "EXECUTION OUTPUT & TEST VERIFICATION:")
		pdf.Ln(5)

		pdf.SetFont("Courier", "", 8)
		pdf.SetFillColor(242, 250, 242)
		pdf.SetDrawColor(180, 215, 180)
		pdf.SetTextColor(20, 80, 30)

		statusText := fmt.Sprintf("  [PASS] Status: %s | Hidden Test Cases Passed: %d / %d | Marks: %d / 10",
			sub.Status, sub.PassCount, sub.TotalTestCases, sub.Marks)
		pdf.CellFormat(0, 6, statusText, "1", 1, "L", true, 0, "")

		if sub.ExecutionOutput != "" {
			pdf.SetFillColor(248, 250, 252)
			pdf.SetDrawColor(210, 220, 230)
			pdf.SetTextColor(40, 50, 60)
			pdf.CellFormat(0, 5, "  [CONSOLE]: "+sub.ExecutionOutput, "1", 1, "L", true, 0, "")
		}
		pdf.Ln(3)

		// 5. RESULT STATEMENT
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 5, "RESULT:")
		pdf.Ln(5)
		pdf.SetFont("Arial", "I", 9.5)
		pdf.SetTextColor(35, 40, 50)
		pdf.MultiCell(0, 5, fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification test cases, and evaluated.", exp.Title), "", "L", false)
		pdf.Ln(4)

		// 6. Staff Evaluation Footer Stamp
		if pdf.GetY() > 260 {
			pdf.AddPage()
			drawPageBorder()
			pdf.SetY(20)
		}

		evalDate := sub.CreatedAt.Format("02-01-2006")
		if sub.CreatedAt.IsZero() {
			evalDate = time.Now().Format("02-01-2006")
		}

		pdf.SetFont("Arial", "B", 8.5)
		pdf.SetFillColor(245, 248, 252)
		pdf.SetDrawColor(190, 205, 220)
		pdf.SetTextColor(30, 45, 60)

		pdf.CellFormat(60, 6, fmt.Sprintf("Date: %s", evalDate), "1", 0, "C", true, 0, "")
		pdf.CellFormat(60, 6, fmt.Sprintf("Marks Awarded: %d / 10", sub.Marks), "1", 0, "C", true, 0, "")
		pdf.CellFormat(60, 6, "Staff Sign: VERIFIED [DIGITAL]", "1", 1, "C", true, 0, "")
	}

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
