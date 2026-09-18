package database

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"server/config"
	"server/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/plugin/dbresolver"
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

	// Configure connection pool for Primary
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to configure connection pool: %w", err)
	}

	maxIdle := cfg.DBMaxIdleConns
	if maxIdle <= 0 {
		maxIdle = 10
	}
	maxOpen := cfg.DBMaxOpenConns
	if maxOpen <= 0 {
		maxOpen = 100
	}

	sqlDB.SetMaxIdleConns(maxIdle)
	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetConnMaxLifetime(cfg.DBConnMaxLifetime)

	log.Printf("[INFO] Connected successfully to MySQL Primary database '%s' at %s:%s\n", cfg.DBName, cfg.DBHost, cfg.DBPort)

	// Configure DBResolver for Read/Write splitting if Replicas are specified
	if len(cfg.DBReplicaHosts) > 0 {
		var replicaDialectors []gorm.Dialector
		for _, hostPort := range cfg.DBReplicaHosts {
			host := hostPort
			port := "3306"
			if strings.Contains(hostPort, ":") {
				parts := strings.Split(hostPort, ":")
				host = parts[0]
				port = parts[1]
			}
			replicaDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
				cfg.DBUser, cfg.DBPassword, host, port, cfg.DBName)
			replicaDialectors = append(replicaDialectors, mysql.Open(replicaDSN))
			log.Printf("[INFO] Registered MySQL Read Replica: %s:%s\n", host, port)
		}

		resolverCfg := dbresolver.Config{
			Sources:  []gorm.Dialector{mysql.Open(dsn)},
			Replicas: replicaDialectors,
			Policy:   dbresolver.RandomPolicy{},
		}

		err = db.Use(
			dbresolver.Register(resolverCfg).
				SetMaxIdleConns(maxIdle).
				SetMaxOpenConns(maxOpen).
				SetConnMaxLifetime(cfg.DBConnMaxLifetime),
		)
		if err != nil {
			log.Printf("[WARN] Failed to attach DBResolver read-replica plugin: %v\n", err)
		} else {
			log.Printf("[INFO] DBResolver initialized successfully with %d read replica(s)\n", len(replicaDialectors))
		}
	}

	// Run automatic database migrations on Primary
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
		&models.Venue{},
		&models.InterviewSlot{},
		&models.SlotVenueAssignment{},
		&models.SlotBooking{},
		&models.SystemSetting{},
	)
	if err == nil {
		migrateAndDropLegacyPayloadJSONColumn(db)
		syncAppPagesCatalog(db)
	}
	return err
}

// syncAppPagesCatalog ensures the app catalog page for My Bookings and System Settings are updated and mapped
func syncAppPagesCatalog(db *gorm.DB) {
	// 1. Seed default quick_login_enabled setting if not present
	var qlSetting models.SystemSetting
	if err := db.Where("`key` = 'quick_login_enabled'").First(&qlSetting).Error; err != nil {
		db.Create(&models.SystemSetting{
			Key:         "quick_login_enabled",
			Value:       "true",
			DisplayName: "Quick 1-Click Login",
			Category:    "Authentication",
			Description: "Show quick 1-click demo login buttons on the login page for fast testing",
			UpdatedAt:   time.Now(),
		})
	}

	// 2. Update or migrate any legacy /slots/book or student_slots page to /my-bookings
	db.Model(&models.AppPage{}).
		Where("`key` = 'student_slots' OR path = '/slots/book'").
		Updates(map[string]interface{}{
			"key":         "student_bookings",
			"name":        "My Bookings",
			"path":        "/my-bookings",
			"icon":        "CalendarCheck",
			"category":    "Interviews & Practice",
			"description": "View reserved interview sessions, check-in status, and launch peer assessments",
		})

	// Also ensure role permissions for student_bookings exist for student and admin
	var count int64
	db.Model(&models.AppPage{}).Where("`key` = 'student_bookings'").Count(&count)
	if count == 0 {
		myBookingsPage := models.AppPage{
			Key:         "student_bookings",
			Name:        "My Bookings",
			Path:        "/my-bookings",
			Icon:        "CalendarCheck",
			Category:    "Interviews & Practice",
			Description: "View reserved interview sessions, check-in status, and launch peer assessments",
			OrderIndex:  2,
		}
		if err := db.Create(&myBookingsPage).Error; err == nil {
			db.Create(&models.RolePagePermission{RoleName: "student", PageKey: "student_bookings", CanAccess: true})
			db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: "student_bookings", CanAccess: true})
		}
	} else {
		// Ensure student role permission
		var permCount int64
		db.Model(&models.RolePagePermission{}).Where("role_name = 'student' AND page_key = 'student_bookings'").Count(&permCount)
		if permCount == 0 {
			db.Create(&models.RolePagePermission{RoleName: "student", PageKey: "student_bookings", CanAccess: true})
		}
	}

	// 3. Ensure System Settings page exists in AppPage catalog and is mapped to admin & developer roles
	var settingsPageCount int64
	db.Model(&models.AppPage{}).Where("`key` = 'system_settings'").Count(&settingsPageCount)
	if settingsPageCount == 0 {
		settingsPage := models.AppPage{
			Key:         "system_settings",
			Name:        "System Settings",
			Path:        "/admin/settings",
			Icon:        "SlidersHorizontal",
			Category:    "System Administration",
			Description: "Manage platform feature toggles, quick login options, and global configurations",
			OrderIndex:  90,
		}
		if err := db.Create(&settingsPage).Error; err == nil {
			db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: "system_settings", CanAccess: true})
			db.Create(&models.RolePagePermission{RoleName: "developer", PageKey: "system_settings", CanAccess: true})
		}
	} else {
		db.Model(&models.AppPage{}).Where("`key` = 'system_settings'").Updates(map[string]interface{}{
			"name":        "System Settings",
			"path":        "/admin/settings",
			"icon":        "SlidersHorizontal",
			"category":    "System Administration",
			"description": "Manage platform feature toggles, quick login options, and global configurations",
		})
		// Ensure admin permission
		var adminPermCount int64
		db.Model(&models.RolePagePermission{}).Where("role_name = 'admin' AND page_key = 'system_settings'").Count(&adminPermCount)
		if adminPermCount == 0 {
			db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: "system_settings", CanAccess: true})
		}
		// Ensure developer permission
		var devPermCount int64
		db.Model(&models.RolePagePermission{}).Where("role_name = 'developer' AND page_key = 'system_settings'").Count(&devPermCount)
		if devPermCount == 0 {
			db.Create(&models.RolePagePermission{RoleName: "developer", PageKey: "system_settings", CanAccess: true})
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


