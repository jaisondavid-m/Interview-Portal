package database

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"server/config"
	"server/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database connection instance
var DB *gorm.DB

// ConnectDB establishes connection to MySQL using configuration
func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	logLevel := logger.Info
	if cfg.GinMode == "release" {
		logLevel = logger.Error
	}

	var db *gorm.DB
	var err error
	maxRetries := 10
	retryInterval := 2 * time.Second

	for i := 1; i <= maxRetries; i++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logLevel),
		})
		if err == nil {
			break
		}
		log.Printf("[WARN] Attempt %d/%d: Failed to connect to MySQL database: %v. Retrying in %v...\n", i, maxRetries, err, retryInterval)
		time.Sleep(retryInterval)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL database after %d attempts: %w", maxRetries, err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to configure connection pool: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Printf("[INFO] Connected successfully to MySQL database '%s' at %s:%s\n", cfg.DBName, cfg.DBHost, cfg.DBPort)

	// Run automatic database migrations
	if err := runMigrations(db); err != nil {
		log.Printf("[WARN] Migration warning: %v\n", err)
	}

	// Clean up duplicate "Level X: " prefix in level names if any exist
	db.Exec("UPDATE interview_levels SET name = TRIM(SUBSTRING(name, INSTR(name, ':') + 1)) WHERE name LIKE 'Level %:%'")

	DB = db
	return db, nil
}

// runMigrations automatically migrates defined schemas
func runMigrations(db *gorm.DB) error {
	log.Println("[INFO] Running database migrations...")
	err := db.AutoMigrate(
		&models.User{},
		&models.InterviewTrack{},
		&models.InterviewLevel{},
		&models.InterviewQuestion{},
		&models.InterviewQuestionDetail{},
		&models.InterviewQuestionCodeTemplate{},
		&models.InterviewQuestionTestCase{},
		&models.InterviewQuestionHint{},
		&models.InterviewQuestionMCQOption{},
		&models.MatchmakingQueueEntry{},
		&models.InterviewSession{},
		&models.FeedbackQuestion{},
		&models.FeedbackQuestionOption{},
		&models.InterviewFeedback{},
		&models.InterviewFeedbackResponse{},
		&models.InterviewRecording{},
		&models.SessionSecurityReport{},
		&models.AuditLog{},
		&models.Role{},
		&models.AppPage{},
		&models.RolePagePermission{},
	)
	if err == nil {
		migrateAndDropLegacyPayloadJSONColumn(db)
		seedDefaultDeveloperUser(db)
		seedDefaultRolesAndPermissions(db)
	}
	return err
}

// DefaultPagesCatalog contains the initial hardcoded catalog of all application pages
var DefaultPagesCatalog = []models.AppPage{
	{Key: "admin_dashboard", Name: "Dashboard", Path: "/admin/dashboard", Category: "Admin", Icon: "LayoutDashboard", OrderIndex: 1, Description: "Administrative overview metrics and platform engagement telemetry"},
	{Key: "admin_users", Name: "User Management", Path: "/admin/users", Category: "Admin", Icon: "Users", OrderIndex: 2, Description: "Manage candidate and administrator credentials and department profiles"},
	{Key: "admin_roles", Name: "Role Management", Path: "/admin/roles", Category: "Admin", Icon: "ShieldCheck", OrderIndex: 3, Description: "Configure role definitions and page access permissions matrix"},
	{Key: "admin_interviews", Name: "Interview Configuration", Path: "/admin/interviews", Category: "Admin", Icon: "SlidersHorizontal", OrderIndex: 4, Description: "Manage domain tracks, experience levels, and question bank editor"},
	{Key: "admin_feedback", Name: "Peer Feedback Config", Path: "/admin/feedback", Category: "Admin", Icon: "MessageSquareCheck", OrderIndex: 5, Description: "Configure peer evaluation questionnaires and rating rubrics"},
	{Key: "admin_leaderboard", Name: "Leaderboard", Path: "/admin/leaderboard", Category: "Admin", Icon: "Trophy", OrderIndex: 6, Description: "Global performance rankings and peer mock score leaderboard"},
	{Key: "admin_history", Name: "Interview History", Path: "/admin/history", Category: "Admin", Icon: "History", OrderIndex: 7, Description: "Review completed sessions, peer scorecards, and session audio recordings"},
	{Key: "audit_logs", Name: "Audit Logs", Path: "/admin/audit-logs", Category: "Admin", Icon: "Terminal", OrderIndex: 8, Description: "Platform-wide administrative activity, developer diagnostics, and security audit trail"},
	{Key: "student_dashboard", Name: "Student Dashboard", Path: "/dashboard", Category: "Student", Icon: "LayoutDashboard", OrderIndex: 9, Description: "Candidate dashboard with upcoming sessions, readiness stats, and tracks"},
	{Key: "student_interviews", Name: "Interviews Portal", Path: "/interviews", Category: "Student", Icon: "Video", OrderIndex: 10, Description: "Interview track selection and automated peer matchmaking queue"},
	{Key: "student_history", Name: "Interview History", Path: "/history", Category: "Student", Icon: "History", OrderIndex: 11, Description: "Personal mock interview history, recordings, and peer feedback reports"},
	{Key: "interview_room", Name: "Live Interview Room", Path: "/interviews/room/:sessionId", Category: "Student", Icon: "Video", OrderIndex: 12, Description: "Live dual-candidate collaborative coding, whiteboard, and sandbox room"},
}

// DefaultRoleMappings defines the seeded hardcoded permissions per role
var DefaultRoleMappings = map[string][]string{
	"admin": {
		"admin_dashboard",
		"admin_users",
		"admin_roles",
		"admin_interviews",
		"admin_feedback",
		"admin_leaderboard",
		"admin_history",
		"audit_logs",
		"student_dashboard",
		"student_interviews",
		"student_history",
		"interview_room",
	},
	"developer": {
		"audit_logs",
	},
	"student": {
		"student_dashboard",
		"student_interviews",
		"student_history",
		"interview_room",
	},
}

// seedDefaultRolesAndPermissions ensures system roles, pages catalog, and mappings exist
func seedDefaultRolesAndPermissions(db *gorm.DB) {
	// 0. Clean up legacy separate audit logs rows if any
	db.Exec("DELETE FROM app_pages WHERE `key` IN ('admin_audit_logs', 'developer_audit_logs')")
	db.Exec("DELETE FROM role_page_permissions WHERE page_key IN ('admin_audit_logs', 'developer_audit_logs')")

	// 1. Seed Roles
	systemRoles := []models.Role{
		{
			Name:        "admin",
			DisplayName: "Administrator",
			Description: "Full administrative access to manage users, tracks, roles, and platform settings",
			IsSystem:    true,
		},
		{
			Name:        "developer",
			DisplayName: "Developer",
			Description: "Technical developer diagnostics and audit log telemetry portal",
			IsSystem:    true,
		},
		{
			Name:        "student",
			DisplayName: "Student Candidate",
			Description: "Standard candidate access for peer mock interviews, history, and feedback",
			IsSystem:    true,
		},
	}

	for _, r := range systemRoles {
		var existing models.Role
		if err := db.Where("name = ?", r.Name).First(&existing).Error; err != nil {
			db.Create(&r)
			log.Printf("[INFO] Seeded system role: %s (%s)\n", r.Name, r.DisplayName)
		}
	}

	// 2. Seed / Upsert App Pages Catalog
	for _, page := range DefaultPagesCatalog {
		var existing models.AppPage
		if err := db.Where("`key` = ?", page.Key).First(&existing).Error; err != nil {
			db.Create(&page)
			log.Printf("[INFO] Seeded app page: %s (%s)\n", page.Key, page.Name)
		} else {
			// Ensure path, category, icon, and order index stay up to date
			db.Model(&existing).Updates(map[string]interface{}{
				"name":        page.Name,
				"path":        page.Path,
				"category":    page.Category,
				"icon":        page.Icon,
				"order_index": page.OrderIndex,
				"description": page.Description,
			})
		}
	}

	// 3. Ensure permissions mapping exist
	for roleName, pageKeys := range DefaultRoleMappings {
		var count int64
		db.Model(&models.RolePagePermission{}).Where("role_name = ?", roleName).Count(&count)
		if count == 0 {
			// Populate all default permissions
			for _, page := range DefaultPagesCatalog {
				canAccess := false
				for _, allowedKey := range pageKeys {
					if page.Key == allowedKey {
						canAccess = true
						break
					}
				}
				perm := models.RolePagePermission{
					RoleName:  roleName,
					PageKey:   page.Key,
					CanAccess: canAccess,
				}
				db.Create(&perm)
			}
			log.Printf("[INFO] Seeded default page permissions mapping for role '%s'\n", roleName)
		} else {
			// Ensure audit_logs is populated for existing roles if missing
			for _, page := range DefaultPagesCatalog {
				var permCount int64
				db.Model(&models.RolePagePermission{}).Where("role_name = ? AND page_key = ?", roleName, page.Key).Count(&permCount)
				if permCount == 0 {
					canAccess := false
					for _, allowedKey := range pageKeys {
						if page.Key == allowedKey {
							canAccess = true
							break
						}
					}
					db.Create(&models.RolePagePermission{
						RoleName:  roleName,
						PageKey:   page.Key,
						CanAccess: canAccess,
					})
				}
			}
		}
	}
}

// seedDefaultDeveloperUser seeds a developer account if none exists
func seedDefaultDeveloperUser(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Where("email = ? OR role = ?", "developer@bitsathy.ac.in", "developer").Count(&count)
	if count == 0 {
		hashedPass, err := models.HashPassword("password")
		if err == nil {
			devUser := models.User{
				Name:       "Lead Developer",
				Email:      "developer@bitsathy.ac.in",
				RollNo:     "DEV01",
				Department: "CSE",
				Password:   hashedPass,
				Role:       "developer",
			}
			db.Create(&devUser)
			log.Println("[INFO] Default developer user seeded: developer@bitsathy.ac.in / password (role: developer)")
		}
	}
}

// migrateAndDropLegacyPayloadJSONColumn migrates any unmigrated JSON records then permanently drops payload_json column
func migrateAndDropLegacyPayloadJSONColumn(db *gorm.DB) {
	if db.Migrator().HasColumn(&models.InterviewQuestion{}, "payload_json") {
		log.Println("[INFO] Detected legacy payload_json column. Migrating contents to relational tables before dropping column...")
		type RawQuestion struct {
			ID          uint
			Type        models.InterviewMode
			PayloadJSON string
		}
		var rawQuestions []RawQuestion
		db.Raw("SELECT id, type, payload_json FROM interview_questions WHERE payload_json IS NOT NULL AND payload_json != ''").Scan(&rawQuestions)

		for _, rq := range rawQuestions {
			var payload map[string]interface{}
			if err := json.Unmarshal([]byte(rq.PayloadJSON), &payload); err == nil && payload != nil {
				// 1. Detail
				var detailCount int64
				db.Model(&models.InterviewQuestionDetail{}).Where("question_id = ?", rq.ID).Count(&detailCount)
				if detailCount == 0 {
					detail := models.InterviewQuestionDetail{QuestionID: rq.ID}
					if v, ok := payload["constraints"].(string); ok { detail.Constraints = v }
					if v, ok := payload["expected_approach"].(string); ok { detail.ExpectedApproach = v }
					if v, ok := payload["expected_complexity"].(string); ok { detail.ExpectedComplexity = v }
					if v, ok := payload["ideal_answer"].(string); ok { detail.IdealAnswer = v }
					if v, ok := payload["scenario"].(string); ok { detail.Scenario = v }
					if v, ok := payload["correct_option"].(string); ok { detail.CorrectOption = v }
					if v, ok := payload["explanation"].(string); ok { detail.Explanation = v }
					db.Create(&detail)
				}

				// 2. Templates
				var tmplCount int64
				db.Model(&models.InterviewQuestionCodeTemplate{}).Where("question_id = ?", rq.ID).Count(&tmplCount)
				if tmplCount == 0 && rq.Type == models.ModeCoding {
					for _, l := range []string{"c", "cpp", "javascript", "python", "java", "go"} {
						k := "starter_code_" + l
						if l == "javascript" { k = "starter_code" }
						sc := ""
						if v, ok := payload[k].(string); ok && v != "" { sc = v }
						if sc != "" {
							db.Create(&models.InterviewQuestionCodeTemplate{QuestionID: rq.ID, Language: l, StarterCode: sc})
						}
					}
				}

				// 3. Test Cases
				var tcCount int64
				db.Model(&models.InterviewQuestionTestCase{}).Where("question_id = ?", rq.ID).Count(&tcCount)
				if tcCount == 0 && rq.Type == models.ModeCoding {
					order := 1
					if otc, ok := payload["open_test_cases"].([]interface{}); ok {
						for _, tc := range otc {
							if tcMap, ok := tc.(map[string]interface{}); ok {
								inStr, _ := tcMap["input"].(string)
								outStr, _ := tcMap["output"].(string)
								db.Create(&models.InterviewQuestionTestCase{
									QuestionID: rq.ID, Input: inStr, ExpectedOutput: outStr, IsHidden: false, OrderIndex: order,
								})
								order++
							}
						}
					}
					if htc, ok := payload["hidden_test_cases"].([]interface{}); ok {
						for _, tc := range htc {
							if tcMap, ok := tc.(map[string]interface{}); ok {
								inStr, _ := tcMap["input"].(string)
								outStr, _ := tcMap["output"].(string)
								db.Create(&models.InterviewQuestionTestCase{
									QuestionID: rq.ID, Input: inStr, ExpectedOutput: outStr, IsHidden: true, OrderIndex: order,
								})
								order++
							}
						}
					}
				}

				// 4. Hints
				var hintCount int64
				db.Model(&models.InterviewQuestionHint{}).Where("question_id = ?", rq.ID).Count(&hintCount)
				if hintCount == 0 {
					order := 1
					if hints, ok := payload["hints"].([]interface{}); ok {
						for _, h := range hints {
							if hs, ok := h.(string); ok && hs != "" {
								db.Create(&models.InterviewQuestionHint{QuestionID: rq.ID, Type: "hint", Content: hs, OrderIndex: order})
								order++
							}
						}
					}
					if tips, ok := payload["interview_tips"].([]interface{}); ok {
						for _, t := range tips {
							if ts, ok := t.(string); ok && ts != "" {
								db.Create(&models.InterviewQuestionHint{QuestionID: rq.ID, Type: "interview_tip", Content: ts, OrderIndex: order})
								order++
							}
						}
					}
					if rubrics, ok := payload["rubrics"].([]interface{}); ok {
						for _, r := range rubrics {
							if rs, ok := r.(string); ok && rs != "" {
								db.Create(&models.InterviewQuestionHint{QuestionID: rq.ID, Type: "rubric", Content: rs, OrderIndex: order})
								order++
							}
						}
					}
					if tps, ok := payload["talking_points"].([]interface{}); ok {
						for _, tp := range tps {
							if tpsStr, ok := tp.(string); ok && tpsStr != "" {
								db.Create(&models.InterviewQuestionHint{QuestionID: rq.ID, Type: "talking_point", Content: tpsStr, OrderIndex: order})
								order++
							}
						}
					}
					if trs, ok := payload["tradeoffs"].([]interface{}); ok {
						for _, tr := range trs {
							if trStr, ok := tr.(string); ok && trStr != "" {
								db.Create(&models.InterviewQuestionHint{QuestionID: rq.ID, Type: "tradeoff", Content: trStr, OrderIndex: order})
								order++
							}
						}
					}
				}

				// 5. MCQ Options
				var mcqCount int64
				db.Model(&models.InterviewQuestionMCQOption{}).Where("question_id = ?", rq.ID).Count(&mcqCount)
				if mcqCount == 0 && rq.Type == models.ModeMCQ {
					correctOpt := "A"
					if co, ok := payload["correct_option"].(string); ok { correctOpt = co }
					if opts, ok := payload["options"].([]interface{}); ok {
						for _, opt := range opts {
							if optMap, ok := opt.(map[string]interface{}); ok {
								optID, _ := optMap["id"].(string)
								optText, _ := optMap["text"].(string)
								db.Create(&models.InterviewQuestionMCQOption{
									QuestionID: rq.ID, OptionKey: optID, OptionText: optText, IsCorrect: optID == correctOpt,
								})
							}
						}
					}
				}
			}
		}

		log.Println("[INFO] Permanently dropping payload_json column from interview_questions...")
		_ = db.Migrator().DropColumn(&models.InterviewQuestion{}, "payload_json")
		_ = db.Exec("ALTER TABLE interview_questions DROP COLUMN payload_json")
	}
}


