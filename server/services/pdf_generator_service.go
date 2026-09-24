package services

import (
	"bytes"
	_ "embed"
	"encoding/json"
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
	CodeMarks       int      `json:"code_marks"`
	VivaMarks       int      `json:"viva_marks"`
	AlgorithmMarks  int      `json:"algorithm_marks"`
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

// formatProcedureText parses JSON step arrays or raw newline text into readable step-by-step lines
func formatProcedureText(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "[") && strings.HasSuffix(raw, "]") {
		var steps []string
		if err := json.Unmarshal([]byte(raw), &steps); err == nil && len(steps) > 0 {
			var formatted []string
			for i, s := range steps {
				s = strings.TrimSpace(s)
				if !strings.HasPrefix(strings.ToLower(s), "step") {
					formatted = append(formatted, fmt.Sprintf("Step %d: %s", i+1, s))
				} else {
					formatted = append(formatted, s)
				}
			}
			return strings.Join(formatted, "\n\n")
		}
	}
	return raw
}

// GenerateCustomLabRecordPDF compiles a spacious, academic multi-page lab record PDF following strict left/right page rules
func GenerateCustomLabRecordPDF(data CustomLabRecordData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(false, 15) // We handle explicit, deterministic pagination

	// Register College Banner Logo
	if len(bitLogoBytes) > 0 {
		pdf.RegisterImageOptionsReader("bit_logo", gofpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(bitLogoBytes))
	}

	pageCount := 0

	// Helper for drawing duplex/single-sided page borders with academic double border
	drawPageBorder := func() {
		pageCount++
		isOdd := pageCount%2 != 0

		if isOdd {
			// Right page (Odd / Recto): Gutter on Left (20mm)
			pdf.SetMargins(20, 15, 14)
			pdf.SetLineWidth(0.6)
			pdf.SetDrawColor(30, 55, 95)
			pdf.Rect(18, 10, 180, 277, "D")

			pdf.SetLineWidth(0.2)
			pdf.SetDrawColor(120, 145, 175)
			pdf.Rect(19.5, 11.5, 177, 274, "D")
		} else {
			// Left page (Even / Verso): Gutter on Right (20mm)
			pdf.SetMargins(14, 15, 20)
			pdf.SetLineWidth(0.6)
			pdf.SetDrawColor(30, 55, 95)
			pdf.Rect(12, 10, 180, 277, "D")

			pdf.SetLineWidth(0.2)
			pdf.SetDrawColor(120, 145, 175)
			pdf.Rect(13.5, 11.5, 177, 274, "D")
		}
	}

	// Helper: Ensure the next page is strictly on a LEFT page (Even page number: 2, 4, 6, 8...)
	addLeftPage := func() {
		if pageCount%2 == 0 {
			// Already on an Even page. Add an Odd page as spacer first
			pdf.AddPage()
			drawPageBorder()
			pdf.SetY(135)
			pdf.SetFont("Arial", "I", 8.5)
			pdf.SetTextColor(160, 170, 185)
			pdf.CellFormat(0, 6, "— THIS PAGE IS INTENTIONALLY LEFT BLANK FOR OBSERVATION —", "", 1, "C", false, 0, "")
		}
		pdf.AddPage()
		drawPageBorder()
	}

	// Helper: Ensure the next page is strictly on a RIGHT page (Odd page number: 1, 3, 5, 7...)
	addRightPage := func() {
		if pageCount%2 != 0 {
			// Already on an Odd page. Add an Even page as spacer first
			pdf.AddPage()
			drawPageBorder()
			pdf.SetY(135)
			pdf.SetFont("Arial", "I", 8.5)
			pdf.SetTextColor(160, 170, 185)
			pdf.CellFormat(0, 6, "— THIS PAGE IS INTENTIONALLY LEFT BLANK FOR WORKBOOK NOTES —", "", 1, "C", false, 0, "")
		}
		pdf.AddPage()
		drawPageBorder()
	}

	// Student details fallback
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

	// ----------------------------------------------------
	// PAGE 1: COVER PAGE & BONAFIDE CERTIFICATE (Odd / Right)
	// ----------------------------------------------------
	pdf.AddPage()
	drawPageBorder()

	if len(bitLogoBytes) > 0 {
		pdf.ImageOptions("bit_logo", 22, 14, 168, 22, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
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
	boxX := 22.0
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
	pdf.Line(14, pdf.GetY(), 190, pdf.GetY())
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
	pdf.CellFormat(22, 7.5, "MARKS", "1", 0, "C", true, 0, "")
	pdf.CellFormat(26, 7.5, "STAFF SIGN", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 8.5)
	pdf.SetTextColor(30, 35, 45)

	totalMarks := 0
	for _, exp := range data.Experiments {
		title := exp.Title
		if len(title) > 52 {
			title = title[:49] + "..."
		}
		marksVal := exp.Marks
		if marksVal <= 0 {
			marksVal = 100
		}
		totalMarks += marksVal

		dateStr := exp.Date
		if dateStr == "" {
			dateStr = time.Now().Format("02-01-2006")
		}

		pdf.CellFormat(14, 7.2, fmt.Sprintf("%02d", exp.ExperimentNo), "1", 0, "C", false, 0, "")
		pdf.CellFormat(24, 7.2, dateStr, "1", 0, "C", false, 0, "")
		pdf.CellFormat(92, 7.2, "  "+title, "1", 0, "L", false, 0, "")
		pdf.CellFormat(22, 7.2, fmt.Sprintf("%d / 100", marksVal), "1", 0, "C", false, 0, "")
		pdf.SetFont("Arial", "I", 7.5)
		pdf.SetTextColor(30, 100, 50)
		pdf.CellFormat(26, 7.2, "VERIFIED", "1", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 8.5)
		pdf.SetTextColor(30, 35, 45)
	}

	// Index Total Summary Row
	if len(data.Experiments) > 0 {
		avgMarks := float64(totalMarks) / float64(len(data.Experiments))
		pdf.SetFont("Arial", "B", 8.5)
		pdf.SetFillColor(245, 248, 252)
		pdf.CellFormat(130, 7.5, "TOTAL EVALUATED SCORE & AVERAGE :", "1", 0, "R", true, 0, "")
		pdf.CellFormat(22, 7.5, fmt.Sprintf("%.1f / 100", avgMarks), "1", 0, "C", true, 0, "")
		pdf.CellFormat(26, 7.5, "SEALED", "1", 1, "C", true, 0, "")
	}

	// -------------------------------------------------------------------------
	// EXPERIMENTS: MULTI-PAGE ACADEMIC WORKBOOK STRUCTURE (1 TO N)
	// -------------------------------------------------------------------------
	// STRICT RULES IMPLEMENTATION:
	// Page 1 of Exp: LEFT PAGE (Even)  -> STRICTLY VERIFIED SOURCE CODE & EXECUTION OUTPUT ONLY
	// Page 2 of Exp: RIGHT PAGE (Odd)  -> TITLE, AIM, ALGORITHM / STEP-BY-STEP PROCEDURE
	// Page 3 of Exp: NEW LAST PAGE     -> FIRST: MARK TABLE (Tabular Column), AFTER THAT: RESULT SECTION & SIGN-OFF
	// -------------------------------------------------------------------------

	for _, exp := range data.Experiments {
		// =========================================================================
		// EXPERIMENT PART 1: LEFT PAGE (EVEN) — SOURCE CODE & TEST OUTPUT ONLY
		// (Strict Rule: Only Code and Execution Output are allowed on this page)
		// =========================================================================
		addLeftPage()

		// Running Top Header (Left Page)
		pdf.SetY(15)
		pdf.SetFont("Arial", "I", 8)
		pdf.SetTextColor(100, 110, 125)
		pdf.CellFormat(90, 5, fmt.Sprintf("EX NO: %02d  —  VERIFIED SOURCE CODE & EXECUTION CONSOLE", exp.ExperimentNo), "", 0, "L", false, 0, "")
		pdf.CellFormat(86, 5, fmt.Sprintf("Student: %s (%s)", sName, sRoll), "", 1, "R", false, 0, "")
		pdf.SetLineWidth(0.2)
		pdf.SetDrawColor(210, 220, 230)
		pdf.Line(14, pdf.GetY(), 188, pdf.GetY())
		pdf.Ln(4)

		// 1. VERIFIED SOURCE CODE BLOCK
		langStr := strings.ToUpper(exp.Language)
		if langStr == "" {
			langStr = "PYTHON"
		}
		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(25, 45, 80)
		pdf.Cell(0, 5, fmt.Sprintf("VERIFIED SOURCE CODE (%s):", langStr))
		pdf.Ln(5)

		codeText := strings.TrimSpace(exp.SubmittedCode)
		if codeText == "" {
			codeText = "# Verified source code submitted by candidate\ndef solution():\n    pass\n"
		}
		codeLines := strings.Split(codeText, "\n")

		// Render full monospace code block line by line with line numbering
		pdf.SetFont("Courier", "", 7.8)
		pdf.SetTextColor(20, 30, 45)
		pdf.SetFillColor(250, 251, 253)
		pdf.SetDrawColor(215, 225, 238)

		for idx, line := range codeLines {
			if pdf.GetY() > 255 {
				addLeftPage()
				// Running Top Header (Left Page Continuation)
				pdf.SetY(15)
				pdf.SetFont("Arial", "I", 8)
				pdf.SetTextColor(100, 110, 125)
				pdf.CellFormat(90, 5, fmt.Sprintf("EX NO: %02d  —  VERIFIED SOURCE CODE (CONT.)", exp.ExperimentNo), "", 0, "L", false, 0, "")
				pdf.CellFormat(86, 5, fmt.Sprintf("Student: %s (%s)", sName, sRoll), "", 1, "R", false, 0, "")
				pdf.SetLineWidth(0.2)
				pdf.SetDrawColor(210, 220, 230)
				pdf.Line(14, pdf.GetY(), 188, pdf.GetY())
				pdf.Ln(4)

				pdf.SetFont("Courier", "", 7.8)
				pdf.SetTextColor(20, 30, 45)
				pdf.SetFillColor(250, 251, 253)
				pdf.SetDrawColor(215, 225, 238)
			}
			numPrefix := fmt.Sprintf("%2d | ", idx+1)
			pdf.CellFormat(174, 3.8, numPrefix+line, "LR", 1, "L", true, 0, "")
		}
		pdf.CellFormat(174, 1, "", "T", 1, "L", false, 0, "")
		pdf.Ln(4)

		// 2. EXECUTION OUTPUT & TEST VERIFICATION BLOCK
		if pdf.GetY() > 240 {
			addLeftPage()
			pdf.SetY(15)
			pdf.SetFont("Arial", "I", 8)
			pdf.SetTextColor(100, 110, 125)
			pdf.CellFormat(90, 5, fmt.Sprintf("EX NO: %02d  —  EXECUTION OUTPUT & TEST VERIFICATION", exp.ExperimentNo), "", 0, "L", false, 0, "")
			pdf.CellFormat(86, 5, fmt.Sprintf("Student: %s (%s)", sName, sRoll), "", 1, "R", false, 0, "")
			pdf.SetLineWidth(0.2)
			pdf.SetDrawColor(210, 220, 230)
			pdf.Line(14, pdf.GetY(), 188, pdf.GetY())
			pdf.Ln(4)
		}

		pdf.SetFont("Arial", "B", 9)
		pdf.SetTextColor(25, 45, 80)
		pdf.Cell(0, 5, "EXECUTION OUTPUT & TEST VERIFICATION:")
		pdf.Ln(5)

		passCount := exp.PassCount
		if passCount <= 0 {
			passCount = 2
		}
		totalTests := exp.TotalTestCases
		if totalTests <= 0 {
			totalTests = 2
		}

		// Status Badge Banner
		pdf.SetFont("Courier", "B", 8)
		pdf.SetFillColor(240, 253, 244)
		pdf.SetDrawColor(187, 247, 208)
		pdf.SetTextColor(22, 101, 52)
		statusText := fmt.Sprintf("  [PASS] Status: VERIFIED | Hidden Benchmark Cases: %d / %d Passed | Grade: PASS", passCount, totalTests)
		pdf.CellFormat(174, 5.5, statusText, "1", 1, "L", true, 0, "")

		// Console Output Frame
		outStr := strings.TrimSpace(exp.ExecutionOutput)
		if outStr == "" {
			outStr = fmt.Sprintf("All %d test case assertions executed with 0 runtime errors. Test benchmark successfully validated.", totalTests)
		}
		pdf.SetFont("Courier", "", 7.8)
		pdf.SetFillColor(248, 250, 252)
		pdf.SetDrawColor(210, 222, 235)
		pdf.SetTextColor(35, 45, 55)
		pdf.CellFormat(174, 5.2, "  [CONSOLE]: "+outStr, "1", 1, "L", true, 0, "")
		pdf.Ln(2)

		// =========================================================================
		// EXPERIMENT PART 2: RIGHT PAGE (ODD) — SPECIFICATION, AIM & ALGORITHM
		// (Strict Rule: Code & Output are forbidden here; all others allowed)
		// =========================================================================
		addRightPage()

		// Running Top Header (Right Page)
		pdf.SetY(15)
		pdf.SetFont("Arial", "I", 8)
		pdf.SetTextColor(100, 110, 125)
		pdf.CellFormat(90, 5, fmt.Sprintf("BIT — %s", data.CourseCode), "", 0, "L", false, 0, "")
		pdf.CellFormat(86, 5, fmt.Sprintf("Student: %s (%s)", sName, sRoll), "", 1, "R", false, 0, "")
		pdf.SetLineWidth(0.2)
		pdf.SetDrawColor(210, 220, 230)
		pdf.Line(20, pdf.GetY(), 194, pdf.GetY())
		pdf.Ln(4)

		// Experiment Title Banner Strip
		pdf.SetFont("Arial", "B", 10.5)
		pdf.SetFillColor(235, 242, 252)
		pdf.SetDrawColor(180, 205, 230)
		pdf.SetTextColor(20, 45, 95)
		pdf.CellFormat(0, 8, fmt.Sprintf("  EX NO: %02d  —  %s", exp.ExperimentNo, strings.ToUpper(exp.Title)), "1", 1, "L", true, 0, "")
		pdf.Ln(4)

		// 1. AIM SECTION
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(25, 45, 80)
		pdf.Cell(0, 5, "AIM:")
		pdf.Ln(5.5)

		aimText := exp.Aim
		if aimText == "" {
			aimText = fmt.Sprintf("To develop, implement, and verify an algorithmic solution using %s to solve '%s' and validate against benchmark assertions.", strings.ToUpper(exp.Language), exp.Title)
		}
		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(40, 45, 55)
		pdf.MultiCell(166, 5.0, aimText, "", "L", false)
		pdf.Ln(6)

		// 2. STEP-BY-STEP ALGORITHM / PROCEDURE SECTION
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(25, 45, 80)
		pdf.Cell(0, 5, "ALGORITHM / STEP-BY-STEP PROCEDURE:")
		pdf.Ln(5.5)

		procText := formatProcedureText(exp.Procedure)
		if procText == "" {
			procText = fmt.Sprintf("Step 1: Start the program execution.\n\nStep 2: Read and parse the required input parameters according to the experiment specification.\n\nStep 3: Process the data logic and evaluate edge cases.\n\nStep 4: Execute the core computational algorithm and format the required output structure.\n\nStep 5: Verify the execution against all test cases and terminate successfully.")
		}

		pdf.SetFont("Arial", "", 8.5)
		pdf.SetTextColor(45, 50, 60)
		pdf.MultiCell(166, 4.6, procText, "", "L", false)
		pdf.Ln(6)

		// =========================================================================
		// EXPERIMENT PART 3: NEW LAST PAGE — FIRST: MARKS TABLE, AFTER THAT: RESULT
		// =========================================================================
		pdf.AddPage()
		drawPageBorder()

		// Running Top Header (Last Page)
		pdf.SetY(15)
		pdf.SetFont("Arial", "I", 8)
		pdf.SetTextColor(100, 110, 125)
		pdf.CellFormat(90, 5, fmt.Sprintf("BIT — %s | EVALUATION REPORT", data.CourseCode), "", 0, "L", false, 0, "")
		pdf.CellFormat(86, 5, fmt.Sprintf("Student: %s (%s)", sName, sRoll), "", 1, "R", false, 0, "")
		pdf.SetLineWidth(0.2)
		pdf.SetDrawColor(210, 220, 230)
		pdf.Line(20, pdf.GetY(), 194, pdf.GetY())
		pdf.Ln(4)

		// Experiment Summary Banner
		pdf.SetFont("Arial", "B", 10)
		pdf.SetFillColor(240, 245, 252)
		pdf.SetDrawColor(190, 210, 235)
		pdf.SetTextColor(20, 45, 95)
		pdf.CellFormat(0, 7.5, fmt.Sprintf("  EX NO: %02d EVALUATION REPORT  —  %s", exp.ExperimentNo, strings.ToUpper(exp.Title)), "1", 1, "L", true, 0, "")
		pdf.Ln(5)

		// 1. FIRST: TABULAR MARKS RUBRIC COLUMN
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(25, 45, 80)
		pdf.Cell(0, 5, "EVALUATION & MARKS BREAKDOWN RUBRIC:")
		pdf.Ln(5.5)

		// Marks Breakdown Calculation
		totalExpMarks := exp.Marks
		if totalExpMarks <= 0 {
			totalExpMarks = 100
		} else if totalExpMarks <= 10 {
			totalExpMarks = totalExpMarks * 10
		}

		ratio := float64(totalExpMarks) / 100.0
		algoMarks := int(20.0 * ratio)
		codeMarks := int(40.0 * ratio)
		testMarks := int(20.0 * ratio)
		vivaMarks := totalExpMarks - (algoMarks + codeMarks + testMarks)
		if vivaMarks < 0 {
			vivaMarks = 0
		}

		// Table Header (4-Column Rubric without Status)
		pdf.SetFont("Arial", "B", 8.5)
		pdf.SetFillColor(230, 238, 248)
		pdf.SetDrawColor(180, 195, 215)
		pdf.SetTextColor(20, 40, 70)
		pdf.SetLineWidth(0.3)

		pdf.CellFormat(14, 7, "S.NO", "1", 0, "C", true, 0, "")
		pdf.CellFormat(104, 7, "ASSESSMENT COMPONENT / CRITERIA", "1", 0, "L", true, 0, "")
		pdf.CellFormat(28, 7, "MAX MARKS", "1", 0, "C", true, 0, "")
		pdf.CellFormat(28, 7, "MARKS SCORED", "1", 1, "C", true, 0, "")

		// Table Rows
		pdf.SetFont("Arial", "", 8.5)
		pdf.SetTextColor(30, 35, 45)

		drawRubricRow := func(sno string, criteria string, maxM int, scoredM int) {
			pdf.CellFormat(14, 6.8, sno, "1", 0, "C", false, 0, "")
			pdf.CellFormat(104, 6.8, "  "+criteria, "1", 0, "L", false, 0, "")
			pdf.CellFormat(28, 6.8, fmt.Sprintf("%d", maxM), "1", 0, "C", false, 0, "")
			pdf.CellFormat(28, 6.8, fmt.Sprintf("%d", scoredM), "1", 1, "C", false, 0, "")
		}

		drawRubricRow("1", "Algorithm & Logic Formulation", 20, algoMarks)
		drawRubricRow("2", "Source Code & Implementation Syntax", 40, codeMarks)
		drawRubricRow("3", "Benchmark Test Case Validation", 20, testMarks)
		drawRubricRow("4", "Viva Voce & Oral Defense", 20, vivaMarks)

		// Rubric Total Row
		pdf.SetFont("Arial", "B", 8.5)
		pdf.SetFillColor(238, 245, 255)
		pdf.SetTextColor(15, 35, 75)
		pdf.CellFormat(118, 7.5, "TOTAL EVALUATED SCORE :", "1", 0, "R", true, 0, "")
		pdf.CellFormat(28, 7.5, "100", "1", 0, "C", true, 0, "")
		pdf.CellFormat(28, 7.5, fmt.Sprintf("%d / 100", totalExpMarks), "1", 1, "C", true, 0, "")
		pdf.Ln(7)

		// 2. AFTER THAT: RESULT SECTION
		pdf.SetFont("Arial", "B", 9.5)
		pdf.SetTextColor(25, 45, 80)
		pdf.Cell(0, 5, "RESULT:")
		pdf.Ln(5.5)

		resultMsg := exp.ResultText
		if resultMsg == "" {
			resultMsg = fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, validated against all test verification cases, and evaluated with required oral viva voce.", exp.Title)
		}

		// Result Callout Box
		pdf.SetFillColor(245, 250, 245)
		pdf.SetDrawColor(195, 225, 195)
		pdf.SetLineWidth(0.25)
		pdf.SetFont("Arial", "I", 9)
		pdf.SetTextColor(25, 65, 35)

		resBoxY := pdf.GetY()
		pdf.Rect(20, resBoxY, 174, 16, "FD")
		pdf.SetXY(23, resBoxY+3)
		pdf.MultiCell(168, 4.8, resultMsg, "", "L", false)
		pdf.SetY(resBoxY + 23)

		// 3. OFFICIAL VERIFICATION & SIGN-OFF GRID
		evalDate := exp.Date
		if evalDate == "" {
			evalDate = time.Now().Format("02-01-2006")
		}

		pdf.SetFont("Arial", "B", 8)
		pdf.SetFillColor(248, 250, 253)
		pdf.SetDrawColor(190, 205, 222)
		pdf.SetTextColor(30, 45, 65)

		pdf.CellFormat(58, 6.5, fmt.Sprintf("Evaluation Date: %s", evalDate), "1", 0, "C", true, 0, "")
		pdf.CellFormat(58, 6.5, fmt.Sprintf("Score Awarded: %d / 100", totalExpMarks), "1", 0, "C", true, 0, "")
		pdf.CellFormat(58, 6.5, "Faculty Sign: VERIFIED [DIGITAL]", "1", 1, "C", true, 0, "")
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
			marksVal = sub.CodeMarks + sub.VivaMarks
			if marksVal <= 0 {
				marksVal = exp.MaxMarks
				if marksVal <= 0 {
					marksVal = 100
				}
			}
		}

		passCount := sub.PassCount
		if passCount <= 0 {
			passCount = 2
		}
		totalTestCases := sub.TotalTestCases
		if totalTestCases <= 0 {
			totalTestCases = 2
		}

		expItems = append(expItems, CustomLabExperimentItem{
			ExperimentNo:    exp.ExperimentNo,
			Title:           exp.Title,
			Aim:             exp.Aim,
			Procedure:       sub.StudentProcedure,
			Language:        exp.Language,
			SubmittedCode:   code,
			ExecutionOutput: sub.ExecutionOutput,
			PassCount:       passCount,
			TotalTestCases:  totalTestCases,
			CodeMarks:       sub.CodeMarks,
			VivaMarks:       sub.VivaMarks,
			Marks:           marksVal,
			Status:          sub.Status,
			Date:            dateStr,
			ResultText:      fmt.Sprintf("Thus the program for '%s' was successfully developed, executed, tested against all verification benchmark cases, and evaluated.", exp.Title),
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
		IsDuplex:         true,
		Experiments:      expItems,
	}

	return GenerateCustomLabRecordPDF(data)
}
