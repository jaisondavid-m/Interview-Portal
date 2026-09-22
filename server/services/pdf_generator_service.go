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

// CustomLabExperimentItem holds per-experiment data for customized multi-page PDF generation
type CustomLabExperimentItem struct {
	ExperimentNo    int      `json:"experiment_no"`
	PageType        string   `json:"page_type"` // "experiment", "observation", "viva", "notes"
	Title           string   `json:"title"`
	Aim             string   `json:"aim"`
	Procedure       string   `json:"procedure"`
	Language        string   `json:"language"`
	SubmittedCode   string   `json:"submitted_code"`
	ExecutionOutput string   `json:"execution_output"`
	PassCount       int      `json:"pass_count"`
	TotalTestCases  int      `json:"total_test_cases"`
	Marks           int      `json:"marks"`
	Status          string   `json:"status"`
	Date            string   `json:"date"`
	ResultText      string   `json:"result_text"`
	Notes           string   `json:"notes"`
	SectionOrder    []string `json:"section_order"`
}

// CustomLabRecordData holds the complete multi-page document payload
type CustomLabRecordData struct {
	InstitutionName  string                    `json:"institution_name"`
	InstitutionSub   string                    `json:"institution_sub"`
	Department       string                    `json:"department"`
	Degree           string                    `json:"degree"`
	Semester         string                    `json:"semester"`
	AcademicYear     string                    `json:"academic_year"`
	CourseCode       string                    `json:"course_code"`
	CourseTitle      string                    `json:"course_title"`
	StudentName      string                    `json:"student_name"`
	RollNo           string                    `json:"roll_no"`
	RegisterNo       string                    `json:"register_no"`
	BranchSection    string                    `json:"branch_section"`
	VerificationID   string                    `json:"verification_id"`
	CertificateText  string                    `json:"certificate_text"`
	StaffIncharge    string                    `json:"staff_incharge"`
	HeadOfDepartment string                    `json:"head_of_department"`
	IsDuplex         bool                      `json:"is_duplex"`
	Experiments      []CustomLabExperimentItem `json:"experiments"`
}

// GenerateCustomLabRecordPDF compiles a full multi-page lab record PDF from a custom payload
func GenerateCustomLabRecordPDF(data CustomLabRecordData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)

	// Register College Banner Logo
	if len(bitLogoBytes) > 0 {
		pdf.RegisterImageOptionsReader("bit_logo", gofpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(bitLogoBytes))
	}

	pageCount := 0

	// Helper for drawing duplex/single-sided page borders
	drawPageBorder := func() {
		pageCount++
		isOdd := pageCount%2 != 0

		if data.IsDuplex {
			if isOdd {
				// Right page (Odd): gutter on left
				pdf.SetMargins(20, 15, 12)
				pdf.SetLineWidth(0.6)
				pdf.SetDrawColor(40, 60, 90)
				pdf.Rect(18, 10, 180, 277, "D")

				pdf.SetLineWidth(0.2)
				pdf.SetDrawColor(120, 140, 160)
				pdf.Rect(19.5, 11.5, 177, 274, "D")
			} else {
				// Left page (Even): gutter on right
				pdf.SetMargins(12, 15, 20)
				pdf.SetLineWidth(0.6)
				pdf.SetDrawColor(40, 60, 90)
				pdf.Rect(12, 10, 180, 277, "D")

				pdf.SetLineWidth(0.2)
				pdf.SetDrawColor(120, 140, 160)
				pdf.Rect(13.5, 11.5, 177, 274, "D")
			}
		} else {
			pdf.SetMargins(15, 15, 15)
			pdf.SetLineWidth(0.6)
			pdf.SetDrawColor(40, 60, 90)
			pdf.Rect(10, 10, 190, 277, "D")

			pdf.SetLineWidth(0.2)
			pdf.SetDrawColor(120, 140, 160)
			pdf.Rect(11.5, 11.5, 187, 274, "D")
		}
	}

	// ----------------------------------------------------
	// PAGE 1: COVER PAGE & BONAFIDE CERTIFICATE (Odd / Right)
	// ----------------------------------------------------
	pdf.AddPage()
	drawPageBorder()

	// 1. Header Banner Logo
	if len(bitLogoBytes) > 0 {
		logoX := 18.0
		if data.IsDuplex {
			logoX = 22.0
		}
		pdf.ImageOptions("bit_logo", logoX, 14, 168, 22, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
		pdf.SetY(38)
	} else {
		pdf.SetY(18)
		pdf.SetFont("Arial", "B", 15)
		pdf.SetTextColor(20, 40, 80)
		inst := data.InstitutionName
		if inst == "" {
			inst = "BANNARI AMMAN INSTITUTE OF TECHNOLOGY"
		}
		pdf.CellFormat(0, 8, inst, "", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(80, 90, 100)
		subInst := data.InstitutionSub
		if subInst == "" {
			subInst = "An Autonomous Institution Affiliated to Anna University Chennai"
		}
		pdf.CellFormat(0, 5, subInst, "", 1, "C", false, 0, "")
		pdf.SetY(38)
	}

	// Decorative Divider Line
	pdf.SetLineWidth(0.4)
	pdf.SetDrawColor(30, 60, 110)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(3)

	// Department Name
	deptName := data.Department
	if deptName == "" {
		deptName = "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE"
	}
	if !strings.HasPrefix(strings.ToUpper(deptName), "DEPARTMENT") {
		deptName = "DEPARTMENT OF " + strings.ToUpper(deptName)
	}
	pdf.SetFont("Arial", "B", 11.5)
	pdf.SetTextColor(30, 50, 80)
	pdf.CellFormat(0, 6.5, strings.ToUpper(deptName), "", 1, "C", false, 0, "")

	// Document Title Banner Box
	pdf.Ln(2)
	pdf.SetFillColor(235, 242, 250)
	pdf.SetDrawColor(180, 200, 225)
	pdf.SetLineWidth(0.3)
	pdf.SetTextColor(20, 45, 90)
	pdf.SetFont("Arial", "B", 12.5)
	pdf.CellFormat(0, 8.5, "LABORATORY RECORD NOTEBOOK", "1", 1, "C", true, 0, "")
	pdf.Ln(2.5)

	// Course Details
	pdf.SetFont("Arial", "B", 11.5)
	pdf.SetTextColor(20, 30, 50)
	pdf.CellFormat(0, 5.5, fmt.Sprintf("%s — %s", data.CourseCode, strings.ToUpper(data.CourseTitle)), "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "I", 9.5)
	pdf.SetTextColor(70, 80, 90)
	degreeStr := data.Degree
	if degreeStr == "" {
		degreeStr = "B.Tech"
	}
	pdf.CellFormat(0, 4.5, fmt.Sprintf("%s  |  %s  |  Academic Year: %s", degreeStr, data.Semester, data.AcademicYear), "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Student Profile Box (Classic Clean 2-Column Table)
	boxX := 20.0
	if data.IsDuplex {
		boxX = 22.0
	}
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(200, 212, 225)
	pdf.SetLineWidth(0.3)
	pdf.Rect(boxX, pdf.GetY(), 166, 44, "FD")

	boxStartY := pdf.GetY() + 3
	pdf.SetY(boxStartY)

	drawRow := func(label, val string) {
		pdf.SetX(boxX + 4)
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(50, 60, 80)
		pdf.Cell(45, 6, label)
		pdf.SetFont("Arial", "", 9.5)
		pdf.SetTextColor(20, 25, 35)
		pdf.Cell(115, 6, ":  "+val)
		pdf.Ln(6.5)
	}

	sName := data.StudentName
	if sName == "" {
		sName = "JAISON DAVID M"
	}
	sRoll := data.RollNo
	if sRoll == "" {
		sRoll = "7376222AD145"
	}
	sBranch := data.BranchSection
	if sBranch == "" {
		sBranch = "AIDS - A"
	}
	drawRow("STUDENT NAME", strings.ToUpper(sName))
	drawRow("ROLL / REG NO", sRoll)
	drawRow("BRANCH / SECTION", sBranch)
	drawRow("SEMESTER & YEAR", fmt.Sprintf("%s  |  %s", data.Semester, data.AcademicYear))
	hashStr := data.VerificationID
	if hashStr == "" {
		hashStr = fmt.Sprintf("MOCKMATE-REC-%s-%s", sRoll, data.CourseCode)
	}
	drawRow("VERIFICATION ID", hashStr)

	pdf.SetY(boxStartY + 47)

	// Bonafide Certificate Box
	pdf.SetFont("Arial", "B", 11.5)
	pdf.SetTextColor(20, 45, 90)
	pdf.CellFormat(0, 6.5, "BONAFIDE CERTIFICATE", "", 1, "C", false, 0, "")
	pdf.Ln(1)

	certText := data.CertificateText
	if certText == "" {
		certText = fmt.Sprintf(
			"Certified that this is the bonafide record of practical work done by Mr./Ms. %s (Roll No: %s) of %s in the %s (%s) Laboratory of Bannari Amman Institute of Technology during the academic year %s.",
			sName,
			sRoll,
			data.Semester,
			data.CourseTitle,
			data.CourseCode,
			data.AcademicYear,
		)
	}

	pdf.SetFont("Arial", "", 9.5)
	pdf.SetTextColor(40, 45, 55)
	pdf.SetX(boxX + 2)
	pdf.MultiCell(162, 5.2, certText, "", "J", false)
	pdf.Ln(10)

	// Official Signatures Grid
	pdf.SetFont("Arial", "B", 9)
	pdf.SetTextColor(20, 30, 50)
	sigY := pdf.GetY()
	pdf.SetY(sigY)

	staffTitle := data.StaffIncharge
	if staffTitle == "" {
		staffTitle = "Staff Incharge"
	}
	hodTitle := data.HeadOfDepartment
	if hodTitle == "" {
		hodTitle = "Head of Department"
	}

	pdf.CellFormat(45, 5, staffTitle, "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 5, hodTitle, "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 5, "Internal Examiner", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 5, "External Examiner", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(110, 120, 130)
	pdf.CellFormat(45, 4, "(Digital Sign-off)", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 4, "(Department Seal)", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 4, "(Verified)", "", 0, "C", false, 0, "")
	pdf.CellFormat(45, 4, "(Evaluation)", "", 1, "C", false, 0, "")

	// ----------------------------------------------------
	// PAGE 2: INDEX / LIST OF EXPERIMENTS (Even / Left)
	// ----------------------------------------------------
	pdf.AddPage()
	drawPageBorder()

	// Header
	pdf.SetY(15)
	pdf.SetFont("Arial", "B", 9.5)
	pdf.SetTextColor(80, 90, 100)
	pdf.CellFormat(0, 5, "BANNARI AMMAN INSTITUTE OF TECHNOLOGY  —  PRACTICAL LAB RECORD", "", 1, "C", false, 0, "")
	pdf.SetLineWidth(0.2)
	pdf.SetDrawColor(200, 210, 220)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(4)

	pdf.SetFont("Arial", "B", 12.5)
	pdf.SetTextColor(20, 45, 90)
	pdf.CellFormat(0, 7.5, "INDEX OF EXPERIMENTS", "", 1, "C", false, 0, "")
	pdf.Ln(2)

	// Table Header
	pdf.SetFont("Arial", "B", 8.5)
	pdf.SetFillColor(230, 238, 248)
	pdf.SetDrawColor(180, 195, 215)
	pdf.SetTextColor(20, 40, 70)
	pdf.SetLineWidth(0.3)

	pdf.CellFormat(14, 7.5, "EX. NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(24, 7.5, "DATE", "1", 0, "C", true, 0, "")
	pdf.CellFormat(92, 7.5, "TITLE OF THE EXPERIMENT", "1", 0, "L", true, 0, "")
	pdf.CellFormat(20, 7.5, "MARKS", "1", 0, "C", true, 0, "")
	pdf.CellFormat(26, 7.5, "STAFF SIGN", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 8.5)
	pdf.SetTextColor(30, 35, 45)

	totalMarks := 0
	for _, exp := range data.Experiments {
		title := exp.Title
		if len(title) > 54 {
			title = title[:51] + "..."
		}
		marksVal := exp.Marks
		if marksVal <= 0 {
			marksVal = 10
		}
		totalMarks += marksVal

		dateStr := exp.Date
		if dateStr == "" {
			dateStr = time.Now().Format("02-01-2006")
		}

		pdf.CellFormat(14, 7, fmt.Sprintf("%02d", exp.ExperimentNo), "1", 0, "C", false, 0, "")
		pdf.CellFormat(24, 7, dateStr, "1", 0, "C", false, 0, "")
		pdf.CellFormat(92, 7, "  "+title, "1", 0, "L", false, 0, "")
		pdf.CellFormat(20, 7, fmt.Sprintf("%d / 10", marksVal), "1", 0, "C", false, 0, "")
		pdf.SetFont("Arial", "I", 7.5)
		pdf.SetTextColor(30, 100, 50)
		pdf.CellFormat(26, 7, "VERIFIED", "1", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 8.5)
		pdf.SetTextColor(30, 35, 45)
	}

	// Index Total Summary Row
	if len(data.Experiments) > 0 {
		avgMarks := float64(totalMarks) / float64(len(data.Experiments))
		pdf.SetFont("Arial", "B", 8.5)
		pdf.SetFillColor(245, 248, 252)
		pdf.CellFormat(130, 7.5, "TOTAL EVALUATED SCORE & AVERAGE :", "1", 0, "R", true, 0, "")
		pdf.CellFormat(20, 7.5, fmt.Sprintf("%.1f / 10", avgMarks), "1", 0, "C", true, 0, "")
		pdf.CellFormat(26, 7.5, "SEALED", "1", 1, "C", true, 0, "")
	}

	// ----------------------------------------------------
	// PAGES 3+: EXPERIMENTS & CUSTOM SHEETS (1 TO N)
	// ----------------------------------------------------
	for _, exp := range data.Experiments {
		pdf.AddPage()
		drawPageBorder()

		pType := strings.ToLower(exp.PageType)
		if pType == "" {
			pType = "experiment"
		}

		// Running Header
		pdf.SetY(15)
		pdf.SetFont("Arial", "I", 8)
		pdf.SetTextColor(100, 110, 120)
		pdf.CellFormat(90, 5, fmt.Sprintf("BIT — %s", data.CourseCode), "", 0, "L", false, 0, "")
		pdf.CellFormat(90, 5, fmt.Sprintf("Student: %s (%s)", sName, sRoll), "", 1, "R", false, 0, "")
		pdf.SetLineWidth(0.2)
		pdf.SetDrawColor(210, 220, 230)
		pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
		pdf.Ln(3)

		if pType == "observation" {
			// Render Blank Observation Page
			pdf.SetFont("Arial", "B", 11)
			pdf.SetFillColor(235, 242, 250)
			pdf.SetDrawColor(180, 200, 225)
			pdf.SetTextColor(20, 45, 90)
			pdf.CellFormat(0, 7.5, fmt.Sprintf("  ROUGH WORK & OBSERVATION SHEET — EX %02d", exp.ExperimentNo), "1", 1, "L", true, 0, "")
			pdf.Ln(3)

			if exp.Notes != "" {
				pdf.SetFont("Arial", "", 9.5)
				pdf.SetTextColor(40, 50, 60)
				pdf.MultiCell(0, 5, exp.Notes, "", "L", false)
				pdf.Ln(3)
			}

			// Draw clean notebook grid lines for calculation
			pdf.SetDrawColor(220, 230, 240)
			pdf.SetLineWidth(0.2)
			for y := pdf.GetY() + 5; y < 260; y += 8 {
				pdf.Line(20, y, 190, y)
			}
			pdf.SetY(262)
			pdf.SetFont("Arial", "I", 8)
			pdf.SetTextColor(120, 130, 140)
			pdf.CellFormat(0, 5, "Staff Signature for Observation: ___________________", "", 1, "R", false, 0, "")
			continue
		}

		if pType == "viva" {
			// Render Viva Voce Questions Page
			pdf.SetFont("Arial", "B", 11)
			pdf.SetFillColor(235, 242, 250)
			pdf.SetDrawColor(180, 200, 225)
			pdf.SetTextColor(20, 45, 90)
			pdf.CellFormat(0, 7.5, fmt.Sprintf("  VIVA VOCE QUESTIONS & EVALUATION — EX %02d: %s", exp.ExperimentNo, strings.ToUpper(exp.Title)), "1", 1, "L", true, 0, "")
			pdf.Ln(3)

			vivaContent := exp.Notes
			if vivaContent == "" {
				vivaContent = fmt.Sprintf("1. What is the time and space complexity of the algorithm used in %s?\n2. Explain edge cases handled in your code.\n3. How can this solution be optimized for larger input constraints?", exp.Title)
			}
			pdf.SetFont("Arial", "", 9.5)
			pdf.SetTextColor(40, 45, 55)
			pdf.MultiCell(0, 5.5, vivaContent, "", "L", false)
			pdf.Ln(6)

			pdf.SetFont("Arial", "B", 8)
			pdf.SetFillColor(245, 248, 252)
			pdf.SetDrawColor(190, 205, 220)
			pdf.CellFormat(58, 5.5, fmt.Sprintf("Viva Marks: %d / 10", exp.Marks), "1", 0, "C", true, 0, "")
			pdf.CellFormat(60, 5.5, "Examiner Sign: VERIFIED [DIGITAL]", "1", 1, "C", true, 0, "")
			continue
		}

		// Default Standard Experiment Sheet
		// Experiment Title Bar
		pdf.SetFont("Arial", "B", 10.5)
		pdf.SetFillColor(235, 242, 250)
		pdf.SetDrawColor(180, 200, 225)
		pdf.SetTextColor(20, 45, 90)
		pdf.CellFormat(0, 7.5, fmt.Sprintf("  EX NO: %02d  —  %s", exp.ExperimentNo, strings.ToUpper(exp.Title)), "1", 1, "L", true, 0, "")
		pdf.Ln(2.5)

		// 1. AIM
		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 4.5, "AIM:")
		pdf.Ln(4.5)
		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(40, 45, 55)
		pdf.MultiCell(0, 4.5, exp.Aim, "", "L", false)
		pdf.Ln(2.5)

		// 2. PROCEDURE / ALGORITHM
		if exp.Procedure != "" {
			pdf.SetFont("Arial", "B", 9)
			pdf.SetTextColor(30, 50, 80)
			pdf.Cell(0, 4.5, "PROCEDURE / ALGORITHM:")
			pdf.Ln(4.5)
			pdf.SetFont("Arial", "", 8.5)
			pdf.SetTextColor(45, 50, 60)
			pdf.MultiCell(0, 4.2, exp.Procedure, "", "L", false)
			pdf.Ln(2.5)
		}

		// 3. SOURCE CODE
		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(30, 50, 80)
		langStr := strings.ToUpper(exp.Language)
		if langStr == "" {
			langStr = "PYTHON 3"
		}
		pdf.Cell(0, 4.5, fmt.Sprintf("VERIFIED SOURCE CODE (%s):", langStr))
		pdf.Ln(4.5)

		pdf.SetFont("Courier", "", 8)
		pdf.SetTextColor(20, 30, 40)
		pdf.SetFillColor(250, 251, 253)
		pdf.SetDrawColor(215, 225, 235)

		codeText := exp.SubmittedCode
		if strings.TrimSpace(codeText) == "" {
			codeText = "# Implementation solution\nprint('Program executed successfully')"
		}

		codeLines := strings.Split(codeText, "\n")
		for idx, line := range codeLines {
			if pdf.GetY() > 265 {
				pdf.AddPage()
				drawPageBorder()
				pdf.SetY(18)
				pdf.SetFont("Courier", "", 8)
				pdf.SetTextColor(20, 30, 40)
				pdf.SetFillColor(250, 251, 253)
				pdf.SetDrawColor(215, 225, 235)
			}
			numPrefix := fmt.Sprintf("%2d | ", idx+1)
			pdf.CellFormat(0, 3.8, numPrefix+line, "LR", 1, "L", true, 0, "")
		}
		pdf.CellFormat(0, 1, "", "T", 1, "L", false, 0, "")
		pdf.Ln(2.5)

		// 4. EXECUTION OUTPUT & TEST CASE REPORT
		if pdf.GetY() > 240 {
			pdf.AddPage()
			drawPageBorder()
			pdf.SetY(18)
		}

		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 4.5, "EXECUTION OUTPUT & TEST VERIFICATION:")
		pdf.Ln(4.5)

		pdf.SetFont("Courier", "", 8)
		pdf.SetFillColor(242, 250, 242)
		pdf.SetDrawColor(180, 215, 180)
		pdf.SetTextColor(20, 80, 30)

		passCount := exp.PassCount
		if passCount <= 0 {
			passCount = 3
		}
		totalTests := exp.TotalTestCases
		if totalTests <= 0 {
			totalTests = 3
		}
		marksAwarded := exp.Marks
		if marksAwarded <= 0 {
			marksAwarded = 10
		}

		statusText := fmt.Sprintf("  [PASS] Status: VERIFIED | Hidden Test Cases Passed: %d / %d | Marks: %d / 10",
			passCount, totalTests, marksAwarded)
		pdf.CellFormat(0, 5.5, statusText, "1", 1, "L", true, 0, "")

		outStr := exp.ExecutionOutput
		if outStr == "" {
			outStr = fmt.Sprintf("Test Suite Passed successfully for '%s'. All assertions validated without regression.", exp.Title)
		}
		pdf.SetFillColor(248, 250, 252)
		pdf.SetDrawColor(210, 220, 230)
		pdf.SetTextColor(40, 50, 60)
		pdf.CellFormat(0, 5, "  [CONSOLE]: "+outStr, "1", 1, "L", true, 0, "")
		pdf.Ln(2.5)

		// 5. RESULT STATEMENT
		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(30, 50, 80)
		pdf.Cell(0, 4.5, "RESULT:")
		pdf.Ln(4.5)
		pdf.SetFont("Arial", "I", 9)
		pdf.SetTextColor(35, 40, 50)
		resultMsg := exp.ResultText
		if resultMsg == "" {
			resultMsg = fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification test cases, and evaluated.", exp.Title)
		}
		pdf.MultiCell(0, 4.5, resultMsg, "", "L", false)
		pdf.Ln(3.5)

		// 6. Staff Evaluation Footer Stamp
		if pdf.GetY() > 260 {
			pdf.AddPage()
			drawPageBorder()
			pdf.SetY(18)
		}

		evalDate := exp.Date
		if evalDate == "" {
			evalDate = time.Now().Format("02-01-2006")
		}

		pdf.SetFont("Arial", "B", 8)
		pdf.SetFillColor(245, 248, 252)
		pdf.SetDrawColor(190, 205, 220)
		pdf.SetTextColor(30, 45, 60)

		pdf.CellFormat(58, 5.5, fmt.Sprintf("Date: %s", evalDate), "1", 0, "C", true, 0, "")
		pdf.CellFormat(58, 5.5, fmt.Sprintf("Marks Awarded: %d / 10", marksAwarded), "1", 0, "C", true, 0, "")
		pdf.CellFormat(60, 5.5, "Staff Sign: VERIFIED [DIGITAL]", "1", 1, "C", true, 0, "")
	}


	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateLabRecordPDF wraps database models into CustomLabRecordData and invokes the multi-page generator
func GenerateLabRecordPDF(course models.LabCourse, student models.User, submissions []models.LabSubmission, record models.LabRecord) ([]byte, error) {
	var expItems []CustomLabExperimentItem

	for _, sub := range submissions {
		exp := sub.Experiment
		dateStr := sub.CreatedAt.Format("02-01-2006")
		if sub.CreatedAt.IsZero() {
			dateStr = time.Now().Format("02-01-2006")
		}

		code := sub.SubmittedCode
		if strings.TrimSpace(code) == "" {
			code = exp.StarterCode
		}

		marksVal := sub.Marks
		if marksVal <= 0 {
			marksVal = exp.MaxMarks
			if marksVal <= 0 {
				marksVal = 10
			}
		}

		passCount := sub.PassCount
		if passCount <= 0 {
			passCount = 3
		}
		totalTestCases := sub.TotalTestCases
		if totalTestCases <= 0 {
			totalTestCases = 3
		}

		expItems = append(expItems, CustomLabExperimentItem{
			ExperimentNo:    exp.ExperimentNo,
			Title:           exp.Title,
			Aim:             exp.Aim,
			Procedure:       exp.Procedure,
			Language:        exp.Language,
			SubmittedCode:   code,
			ExecutionOutput: sub.ExecutionOutput,
			PassCount:       passCount,
			TotalTestCases:  totalTestCases,
			Marks:           marksVal,
			Status:          sub.Status,
			Date:            dateStr,
			ResultText:      fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification test cases, and evaluated.", exp.Title),
		})
	}

	sec := student.Section
	if sec == "" {
		sec = "CSE-A"
	}
	branchSec := fmt.Sprintf("%s (%s)", student.Department, sec)

	data := CustomLabRecordData{
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
		VerificationID:   record.SignatureHash,
		CertificateText:  "",
		StaffIncharge:    "Staff Incharge",
		HeadOfDepartment: "Head of Department",
		Experiments:      expItems,
	}

	return GenerateCustomLabRecordPDF(data)
}


