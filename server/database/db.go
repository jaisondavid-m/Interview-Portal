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

	// Initialize Redis connection for sliding window rate limiting and caching
	InitRedis()

	DB = db
	return db, nil
}

// EnsureLabTables ensures all academic lab module tables exist and are properly migrated
func EnsureLabTables(db *gorm.DB) error {
	labModels := []interface{}{
		&models.LabCourse{},
		&models.LabExperiment{},
		&models.LabExperimentQuestion{},
		&models.LabVivaQuestion{},
		&models.LabQuestionAllocation{},
		&models.LabExperimentUnlock{},
		&models.LabMapping{},
		&models.LabSubmission{},
		&models.LabRecord{},
	}
	for _, m := range labModels {
		if err := db.AutoMigrate(m); err != nil {
			log.Printf("[WARN] AutoMigrate for lab model %T: %v\n", m, err)
		}
	}
	return nil
}

// runMigrations automatically migrates defined schemas
func runMigrations(db *gorm.DB) error {
	log.Println("[INFO] Running database migrations...")
	modelsToMigrate := []interface{}{
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
		&models.RateLimitConfig{},
		&models.LabCourse{},
		&models.LabExperiment{},
		&models.LabExperimentQuestion{},
		&models.LabVivaQuestion{},
		&models.LabQuestionAllocation{},
		&models.LabExperimentUnlock{},
		&models.LabMapping{},
		&models.LabSubmission{},
		&models.LabRecord{},
	}

	for _, m := range modelsToMigrate {
		if err := db.AutoMigrate(m); err != nil {
			log.Printf("[WARN] AutoMigrate for %T: %v\n", m, err)
		}
	}

	EnsureLabTables(db)

	migrateAndDropLegacyPayloadJSONColumn(db)
	syncAppPagesCatalog(db)
	seedRateLimitConfigs(db)
	// Backfill regulation for legacy courses
	db.Model(&models.LabCourse{}).Where("regulation IS NULL OR regulation = ''").Update("regulation", "2022")
	seedLabCourseAndExperiments(db)
	syncLabQuestionVariantsAndVivas(db)
	return nil
}

func seedLabCourseAndExperiments(db *gorm.DB) {
	var count int64
	db.Model(&models.LabCourse{}).Where("course_code = ?", "22AI304").Count(&count)
	if count > 0 {
		return
	}

	course := models.LabCourse{
		CourseCode:       "22AI304",
		Title:            "PRINCIPLES OF PROGRAMMING LABORATORY",
		Department:       "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
		Degree:           "B.Tech",
		Semester:         "Semester III",
		AcademicYear:     "2025-2026",
		TotalExperiments: 7,
		Description:      "Official laboratory course for AI & DS covering algorithmic problem solving, Python application development, security controls, and dynamic solver algorithms.",
	}
	if err := db.Create(&course).Error; err != nil {
		log.Printf("[ERROR] Failed to seed lab course 22AI304: %v", err)
		return
	}

	experiments := []models.LabExperiment{
		{
			CourseID:     course.ID,
			ExperimentNo: 1,
			Title:        "Online Shopping Cart & Bill Generator",
			Aim:          "The aim of this experiment is to develop an application using Python to implement an online shopping cart and generate bills for the purchased products.",
			Procedure:    "Step 1: Initialize an empty shopping cart list/dictionary.\nStep 2: Display available products with prices.\nStep 3: Allow user to add or remove items with quantity.\nStep 4: Calculate subtotals, apply percentage discounts, and compute taxes.\nStep 5: Output an itemized bill with final payable total.",
			Language:     "python",
			StarterCode: `# Shopping cart with bill generation
items = {"Apple": 50, "Banana": 20, "Milk": 30, "Bread": 40}
cart = {"Apple": 2, "Milk": 1}

def calculate_bill(cart_items):
    subtotal = sum(items[item] * qty for item, qty in cart_items.items() if item in items)
    tax = subtotal * 0.05
    total = subtotal + tax
    return round(total, 2)

print("Total Bill:", calculate_bill(cart))
`,
			SampleTestCases: `[{"input": "Apple: 2, Milk: 1", "expected_output": "136.5"}]`,
			HiddenTestCases: `[{"input": "Apple: 1, Banana: 5, Bread: 2", "expected_output": "241.5"}, {"input": "Milk: 3", "expected_output": "94.5"}]`,
			MaxMarks:        10,
		},
		{
			CourseID:     course.ID,
			ExperimentNo: 2,
			Title:        "Pocket Bazaar: Inventory Management System",
			Aim:          "To develop an application using Python to manage an inventory of products for grocery stores including stock addition, updates, and low-stock alerts.",
			Procedure:    "Step 1: Define an inventory database dictionary storing product details (ID, Name, Stock, Price).\nStep 2: Implement functions to add new products and restock existing stock.\nStep 3: Implement stock deduction on sales.\nStep 4: Generate low-stock warning alerts when quantity falls below threshold.",
			Language:     "python",
			StarterCode: `# Inventory management system
inventory = {}

def add_product(name, qty, price):
    inventory[name] = {"qty": qty, "price": price}

def check_low_stock(threshold=5):
    return [name for name, data in inventory.items() if data["qty"] < threshold]

add_product("Rice", 10, 60)
add_product("Sugar", 2, 45)
print("Low Stock:", check_low_stock(5))
`,
			SampleTestCases: `[{"input": "Sugar: 2", "expected_output": "['Sugar']"}]`,
			HiddenTestCases: `[{"input": "Salt: 1", "expected_output": "['Sugar', 'Salt']"}]`,
			MaxMarks:        10,
		},
		{
			CourseID:     course.ID,
			ExperimentNo: 3,
			Title:        "Vacation Destination Decision Maker",
			Aim:          "Create an application program that helps a user decide on their next vacation destination based on budget, climate preferences, and activities.",
			Procedure:    "Step 1: Accept user preferences (Max Budget, Preferred Climate e.g. Tropical/Cold, Preferred Activity e.g. Beach/Trekking).\nStep 2: Filter destination database against user criteria.\nStep 3: Return top matching vacation spots sorted by budget compatibility.",
			Language:     "python",
			StarterCode: `destinations = [
    {"name": "Goa", "budget": 15000, "climate": "tropical", "activity": "beach"},
    {"name": "Manali", "budget": 20000, "climate": "cold", "activity": "trekking"},
    {"name": "Kerala", "budget": 18000, "climate": "tropical", "activity": "nature"}
]

def recommend(max_budget, climate):
    return [d["name"] for d in destinations if d["budget"] <= max_budget and d["climate"] == climate]

print("Recommendations:", recommend(19000, "tropical"))
`,
			SampleTestCases: `[{"input": "19000, tropical", "expected_output": "['Goa', 'Kerala']"}]`,
			HiddenTestCases: `[{"input": "25000, cold", "expected_output": "['Manali']"}]`,
			MaxMarks:        10,
		},
		{
			CourseID:     course.ID,
			ExperimentNo: 4,
			Title:        "Temperature Monitor & Alert System",
			Aim:          "Develop an application for a temperature monitoring system and provide an alert message when temperatures exceed safety thresholds.",
			Procedure:    "Step 1: Read a series of temperature sensor values.\nStep 2: Calculate average, maximum, and minimum temperatures.\nStep 3: Flag CRITICAL ALERT if temp > 40C or FREEZING ALERT if temp < 0C.",
			Language:     "python",
			StarterCode: `def monitor_temperatures(readings):
    alerts = []
    for temp in readings:
        if temp > 40:
            alerts.append(f"CRITICAL: {temp}C")
        elif temp < 0:
            alerts.append(f"FREEZING: {temp}C")
    return alerts

print(monitor_temperatures([32, 42, 15, -2, 38]))
`,
			SampleTestCases: `[{"input": "[32, 42, 15, -2, 38]", "expected_output": "['CRITICAL: 42C', 'FREEZING: -2C']"}]`,
			HiddenTestCases: `[{"input": "[45, 50, -5]", "expected_output": "['CRITICAL: 45C', 'CRITICAL: 50C', 'FREEZING: -5C']"}]`,
			MaxMarks:        10,
		},
		{
			CourseID:     course.ID,
			ExperimentNo: 5,
			Title:        "Access Control System (Credential & PIN Verification)",
			Aim:          "Develop an access control system that simulates granting access to authorized personnel based on credentials such as ID cards and PIN codes.",
			Procedure:    "Step 1: Maintain authorized (ID, PIN) key-value records.\nStep 2: Accept user ID and PIN input.\nStep 3: Validate against database and enforce maximum 3 failed attempts lock-out penalty.",
			Language:     "python",
			StarterCode: `users_db = {"ADMIN01": "1234", "USER02": "9999"}

def authenticate(user_id, pin):
    if user_id in users_db and users_db[user_id] == pin:
        return "ACCESS GRANTED"
    return "ACCESS DENIED"

print(authenticate("ADMIN01", "1234"))
print(authenticate("ADMIN01", "0000"))
`,
			SampleTestCases: `[{"input": "ADMIN01, 1234", "expected_output": "ACCESS GRANTED"}]`,
			HiddenTestCases: `[{"input": "USER02, 9999", "expected_output": "ACCESS GRANTED"}, {"input": "HACKER, 0000", "expected_output": "ACCESS DENIED"}]`,
			MaxMarks:        10,
		},
		{
			CourseID:     course.ID,
			ExperimentNo: 6,
			Title:        "Math Quiz Generator",
			Aim:          "Design a math quiz generator that generates questions of various difficulty levels (Easy, Medium, Hard) and arithmetic operations.",
			Procedure:    "Step 1: Generate arithmetic problems (addition, subtraction, multiplication, division).\nStep 2: Evaluate candidate response against computed result.\nStep 3: Track score and calculate final accuracy percentage.",
			Language:     "python",
			StarterCode: `def evaluate_quiz(answers):
    score = 0
    for question, correct_ans, user_ans in answers:
        if correct_ans == user_ans:
            score += 1
    return f"{score}/{len(answers)}"

quiz_data = [("5 + 3", 8, 8), ("10 - 4", 6, 6), ("7 * 2", 14, 12)]
print("Score:", evaluate_quiz(quiz_data))
`,
			SampleTestCases: `[{"input": "3 questions with 2 correct", "expected_output": "2/3"}]`,
			HiddenTestCases: `[{"input": "5 questions with 5 correct", "expected_output": "5/5"}]`,
			MaxMarks:        10,
		},
		{
			CourseID:     course.ID,
			ExperimentNo: 7,
			Title:        "Maze Solver Application (Pathfinder)",
			Aim:          "Build a maze solver application that finds a path from the entrance (S) to the exit (E) of a 2D grid maze.",
			Procedure:    "Step 1: Represent 2D grid maze with open paths (0) and walls (1).\nStep 2: Implement BFS/DFS graph traversal to discover valid path from Start (0,0) to Exit (N-1, M-1).\nStep 3: Return coordinate path array.",
			Language:     "python",
			StarterCode: `def solve_maze(grid):
    # Simple BFS grid pathfinder
    rows, cols = len(grid), len(grid[0])
    queue = [(0, 0, [(0, 0)])]
    visited = set([(0, 0)])
    
    while queue:
        r, c, path = queue.pop(0)
        if r == rows - 1 and c == cols - 1:
            return path
        for dr, dc in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and (nr, nc) not in visited:
                visited.add((nr, nc))
                queue.append((nr, nc, path + [(nr, nc)]))
    return []

maze = [
    [0, 1, 0],
    [0, 0, 0],
    [1, 0, 0]
]
print("Path Found:", solve_maze(maze))
`,
			SampleTestCases: `[{"input": "3x3 maze", "expected_output": "[(0, 0), (1, 0), (1, 1), (2, 1), (2, 2)]"}]`,
			HiddenTestCases: `[{"input": "3x3 blocked maze", "expected_output": "[]"}]`,
			MaxMarks:        10,
		},
	}

	for _, exp := range experiments {
		db.Create(&exp)
	}
	log.Println("[INFO] Successfully seeded 22AI304 PPL Lab course and 7 experiments into database!")
}

// syncAppPagesCatalog ensures the app catalog page for My Bookings and System Settings are updated and mapped
func syncAppPagesCatalog(db *gorm.DB) {
	// Ensure default is_active for legacy interview tracks, levels, and questions
	db.Exec("UPDATE interview_tracks SET is_active = true WHERE is_active IS NULL")
	db.Exec("UPDATE interview_levels SET is_active = true WHERE is_active IS NULL")
	db.Exec("UPDATE interview_questions SET is_active = true WHERE is_active IS NULL")

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

	// 1b. Seed default quick_accounts JSON setting if not present
	var qaSetting models.SystemSetting
	if err := db.Where("`key` = 'quick_accounts'").First(&qaSetting).Error; err != nil {
		defaultAccounts := `[{"title":"Admin","email":"admin@bitsathy.ac.in","password":"password","role":"admin"},{"title":"Developer","email":"developer@bitsathy.ac.in","password":"password","role":"developer"},{"title":"Student 1","email":"jaisondavidm.cs25@bitsathy.ac.in","password":"password","role":"student"},{"title":"Student 2","email":"jagaprasanths.cs25@bitsathy.ac.in","password":"password","role":"student"}]`
		db.Create(&models.SystemSetting{
			Key:         "quick_accounts",
			Value:       defaultAccounts,
			DisplayName: "Quick Login Accounts",
			Category:    "Authentication",
			Description: "JSON array of demo accounts shown on the quick 1-click login section",
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

	// 4. Ensure Rate Limiting page exists in AppPage catalog and is mapped to admin & developer roles
	var rlPageCount int64
	db.Model(&models.AppPage{}).Where("`key` = 'rate_limiting'").Count(&rlPageCount)
	if rlPageCount == 0 {
		rlPage := models.AppPage{
			Key:         "rate_limiting",
			Name:        "Rate Limiting",
			Path:        "/developer/rate-limits",
			Icon:        "Zap",
			Category:    "System Administration",
			Description: "Configure Redis-backed rate limiting rules for user roles and unauthenticated endpoints",
			OrderIndex:  92,
		}
		if err := db.Create(&rlPage).Error; err == nil {
			db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: "rate_limiting", CanAccess: true})
			db.Create(&models.RolePagePermission{RoleName: "developer", PageKey: "rate_limiting", CanAccess: true})
		}
	} else {
		db.Model(&models.AppPage{}).Where("`key` = 'rate_limiting'").Updates(map[string]interface{}{
			"name":        "Rate Limiting",
			"path":        "/developer/rate-limits",
			"icon":        "Zap",
			"category":    "System Administration",
			"description": "Configure Redis-backed rate limiting rules for user roles and unauthenticated endpoints",
		})
		// Ensure admin permission
		var adminPermCount int64
		db.Model(&models.RolePagePermission{}).Where("role_name = 'admin' AND page_key = 'rate_limiting'").Count(&adminPermCount)
		if adminPermCount == 0 {
			db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: "rate_limiting", CanAccess: true})
		}
		// Ensure developer permission
		var devPermCount int64
		db.Model(&models.RolePagePermission{}).Where("role_name = 'developer' AND page_key = 'rate_limiting'").Count(&devPermCount)
		if devPermCount == 0 {
			db.Create(&models.RolePagePermission{RoleName: "developer", PageKey: "rate_limiting", CanAccess: true})
		}
	}

	// 5. Ensure Practical Lab pages exist in AppPage catalog
	labPages := []models.AppPage{
		{
			Key:         "practical_labs",
			Name:        "Practical Labs",
			Path:        "/labs",
			Icon:        "FlaskConical",
			Category:    "Academic Labs",
			Description: "Complete mandatory college practical lab experiments online with automated test case execution",
			OrderIndex:  30,
		},
		{
			Key:         "lab_incharge_verification",
			Name:        "Lab Incharge Verification",
			Path:        "/lab-incharge",
			Icon:        "UserCheck",
			Category:    "Academic Labs",
			Description: "Review student lab submissions and grant single-experiment or semester record approvals",
			OrderIndex:  31,
		},
		{
			Key:         "admin_lab_config",
			Name:        "Lab Configuration",
			Path:        "/admin/labs/config",
			Icon:        "FlaskConical",
			Category:    "Academic Labs",
			Description: "Add lab courses, configure experiments & test cases, manage sections/semesters/academic years, and map students to faculty lab incharges",
			OrderIndex:  32,
		},
		{
			Key:         "admin_lab_pdf_audit",
			Name:        "Student Lab PDF Audit",
			Path:        "/admin/labs/pdf-preview",
			Icon:        "FileCode2",
			Category:    "Academic Labs",
			Description: "Preview and audit official server-generated student PDF lab records",
			OrderIndex:  33,
		},
	}

	// Clean up legacy admin_lab_mapping page if present
	db.Exec("DELETE FROM role_page_permissions WHERE page_key = 'admin_lab_mapping'")
	db.Exec("DELETE FROM app_pages WHERE `key` = 'admin_lab_mapping'")

	for _, page := range labPages {
		var pageCount int64
		db.Model(&models.AppPage{}).Where("`key` = ?", page.Key).Count(&pageCount)
		if pageCount == 0 {
			if err := db.Create(&page).Error; err == nil {
				// Default role mappings
				if page.Key == "practical_labs" {
					db.Create(&models.RolePagePermission{RoleName: "student", PageKey: page.Key, CanAccess: true})
					db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: page.Key, CanAccess: true})
				}
				if page.Key == "lab_incharge_verification" {
					db.Create(&models.RolePagePermission{RoleName: "faculty", PageKey: page.Key, CanAccess: true})
					db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: page.Key, CanAccess: true})
				}
				if page.Key == "admin_lab_pdf_audit" || page.Key == "admin_lab_config" {
					db.Create(&models.RolePagePermission{RoleName: "admin", PageKey: page.Key, CanAccess: true})
				}
			}
		} else {
			db.Model(&models.AppPage{}).Where("`key` = ?", page.Key).Updates(map[string]interface{}{
				"name":        page.Name,
				"path":        page.Path,
				"icon":        page.Icon,
				"category":    page.Category,
				"description": page.Description,
				"order_index": page.OrderIndex,
			})
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
					if v, ok := payload["constraints"].(string); ok {
						detail.Constraints = v
					}
					if v, ok := payload["expected_approach"].(string); ok {
						detail.ExpectedApproach = v
					}
					if v, ok := payload["expected_complexity"].(string); ok {
						detail.ExpectedComplexity = v
					}
					if v, ok := payload["ideal_answer"].(string); ok {
						detail.IdealAnswer = v
					}
					if v, ok := payload["scenario"].(string); ok {
						detail.Scenario = v
					}
					if v, ok := payload["correct_option"].(string); ok {
						detail.CorrectOption = v
					}
					if v, ok := payload["explanation"].(string); ok {
						detail.Explanation = v
					}
					db.Create(&detail)
				}

				// 2. Templates
				var tmplCount int64
				db.Model(&models.InterviewQuestionCodeTemplate{}).Where("question_id = ?", rq.ID).Count(&tmplCount)
				if tmplCount == 0 && rq.Type == models.ModeCoding {
					for _, l := range []string{"c", "cpp", "javascript", "python", "java", "go"} {
						k := "starter_code_" + l
						if l == "javascript" {
							k = "starter_code"
						}
						sc := ""
						if v, ok := payload[k].(string); ok && v != "" {
							sc = v
						}
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
					if co, ok := payload["correct_option"].(string); ok {
						correctOpt = co
					}
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

// seedRateLimitConfigs initializes default role and unauthenticated rate limiting rules in MySQL
func seedRateLimitConfigs(db *gorm.DB) {
	defaults := []models.RateLimitConfig{
		{
			Scope:             "no_auth",
			Name:              "Unauthenticated / Public APIs",
			Description:       "Rate limit applied to login, register, public settings, and unauthenticated requests by Client IP",
			RequestsPerMinute: 30,
			BurstLimit:        10,
			WindowSeconds:     60,
			Enabled:           true,
			ActionOnExceed:    "block",
		},
		{
			Scope:             "student",
			Name:              "Student Account Tier",
			Description:       "Rate limit applied to authenticated students during mock assessments and slot bookings",
			RequestsPerMinute: 120,
			BurstLimit:        25,
			WindowSeconds:     60,
			Enabled:           true,
			ActionOnExceed:    "block",
		},
		{
			Scope:             "faculty",
			Name:              "Faculty Assessor Tier",
			Description:       "Rate limit applied to faculty members monitoring venues and conducting evaluations",
			RequestsPerMinute: 300,
			BurstLimit:        50,
			WindowSeconds:     60,
			Enabled:           true,
			ActionOnExceed:    "block",
		},
		{
			Scope:             "admin",
			Name:              "Platform Administrator Tier",
			Description:       "Rate limit applied to administrator management and analytics endpoints",
			RequestsPerMinute: 600,
			BurstLimit:        100,
			WindowSeconds:     60,
			Enabled:           true,
			ActionOnExceed:    "block",
		},
		{
			Scope:             "developer",
			Name:              "Developer Account Tier",
			Description:       "Rate limit applied to system developers inspecting logs and system configurations",
			RequestsPerMinute: 1000,
			BurstLimit:        200,
			WindowSeconds:     60,
			Enabled:           true,
			ActionOnExceed:    "block",
		},
		{
			Scope:             "system",
			Name:              "Internal / System API Tier",
			Description:       "Rate limit for automated system daemons and health reporting services",
			RequestsPerMinute: 2000,
			BurstLimit:        500,
			WindowSeconds:     60,
			Enabled:           true,
			ActionOnExceed:    "block",
		},
	}

	for _, item := range defaults {
		var count int64
		db.Model(&models.RateLimitConfig{}).Where("scope = ?", item.Scope).Count(&count)
		if count == 0 {
			item.CreatedAt = time.Now()
			item.UpdatedAt = time.Now()
			db.Create(&item)
		}
	}
}

// syncLabQuestionVariantsAndVivas ensures all experiments have question variants and viva question pools
func syncLabQuestionVariantsAndVivas(db *gorm.DB) {
	var experiments []models.LabExperiment
	db.Find(&experiments)

	for _, exp := range experiments {
		var qCount int64
		db.Model(&models.LabExperimentQuestion{}).Where("experiment_id = ?", exp.ID).Count(&qCount)
		if qCount == 0 {
			// Convert procedure into structured steps if possible
			refAlgo := exp.Procedure
			qVariant := models.LabExperimentQuestion{
				ExperimentID:       exp.ID,
				CourseID:           exp.CourseID,
				QuestionCode:       fmt.Sprintf("EX%d_VAR_A", exp.ExperimentNo),
				Title:              exp.Title,
				Aim:                exp.Aim,
				ReferenceAlgorithm: refAlgo,
				SolutionCode:       exp.StarterCode,
				Language:           exp.Language,
				SampleTestCases:    exp.SampleTestCases,
				HiddenTestCases:    exp.HiddenTestCases,
				MaxMarks:           exp.MaxMarks,
				VivaQuestionsCount: 5,
				IsActive:           true,
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}
			if err := db.Create(&qVariant).Error; err == nil {
				// Seed Viva Question Pool for this question variant
				defaultVivas := []models.LabVivaQuestion{
					{
						QuestionID:   qVariant.ID,
						ExperimentID: exp.ID,
						Question:     "What is the time and space complexity of your implemented algorithm?",
						Answer:       "Time complexity is typically O(N) or O(N log N) based on operations; Space complexity is O(N) or O(1) auxiliary space.",
						OrderIndex:   1,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
					{
						QuestionID:   qVariant.ID,
						ExperimentID: exp.ID,
						Question:     "How do you handle edge cases such as empty inputs, boundary values, or negative numbers?",
						Answer:       "Input validation checks at the start of functions and fallback/default return values.",
						OrderIndex:   2,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
					{
						QuestionID:   qVariant.ID,
						ExperimentID: exp.ID,
						Question:     "Which Python data structures (lists, dictionaries, sets) were chosen for this problem and why?",
						Answer:       "Dictionaries offer O(1) key lookup, lists provide ordered sequence storage, sets ensure uniqueness.",
						OrderIndex:   3,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
					{
						QuestionID:   qVariant.ID,
						ExperimentID: exp.ID,
						Question:     "Explain the step-by-step algorithm flow that connects user input to the final output.",
						Answer:       "1. Parsing and normalizing raw input; 2. Applying core business/mathematical rules; 3. Formatting and returning the structured result.",
						OrderIndex:   4,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
					{
						QuestionID:   qVariant.ID,
						ExperimentID: exp.ID,
						Question:     "How would you optimize this solution if the input dataset scaled to millions of entries?",
						Answer:       "Use generator streams, indexing, caching computed values, or batch processing instead of in-memory lists.",
						OrderIndex:   5,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
					{
						QuestionID:   qVariant.ID,
						ExperimentID: exp.ID,
						Question:     "What built-in functions or libraries did you utilize in this implementation?",
						Answer:       "Built-in functions like sum(), len(), round(), sorted() and standard data structure methods.",
						OrderIndex:   6,
						CreatedAt:    time.Now(),
						UpdatedAt:    time.Now(),
					},
				}
				for _, vq := range defaultVivas {
					db.Create(&vq)
				}
			}
		}

		// Ensure existing submissions have question_id backfilled
		var firstQ models.LabExperimentQuestion
		if err := db.Where("experiment_id = ?", exp.ID).Order("id asc").First(&firstQ).Error; err == nil {
			db.Model(&models.LabSubmission{}).
				Where("experiment_id = ? AND (question_id = 0 OR question_id IS NULL)", exp.ID).
				Update("question_id", firstQ.ID)
		}
	}
}
