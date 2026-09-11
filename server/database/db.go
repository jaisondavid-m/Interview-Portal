package database

import (
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

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL database: %w", err)
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

	// Seed default Admin user
	seedAdminUser(db)

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
	)
	if err == nil {
		seedInterviewData(db)
	}
	return err
}

// seedInterviewData creates standard initial interview tracks, levels, and questions if none exist
func seedInterviewData(db *gorm.DB) {
	var count int64
	db.Model(&models.InterviewTrack{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("[INFO] Seeding default interview tracks and levels...")

	// 1. DSA Track
	dsaTrack := models.InterviewTrack{
		Title:       "Data Structures & Algorithms",
		Slug:        "dsa",
		Category:    "Technical",
		Icon:        "Code",
		Description: "Core computer science fundamentals, algorithmic problem solving, time complexity, and data structure manipulation.",
	}
	db.Create(&dsaTrack)

	level1DSA := models.InterviewLevel{
		TrackID:     dsaTrack.ID,
		LevelNumber: 1,
		Name:        "Level 1: Arrays, Strings & Basic Hashing",
		Description: "Fundamental array manipulation, two-pointer approach, and hash table lookup optimization.",
		Mode:        models.ModeCoding,
		DurationMin: 45,
	}
	db.Create(&level1DSA)

	db.Create(&models.InterviewQuestion{
		LevelID:    level1DSA.ID,
		Title:      "Two Sum with Target Index Lookup",
		Prompt:     "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
		Difficulty: "Easy",
		Type:       models.ModeCoding,
		PayloadJSON: `{"starter_code":"func twoSum(nums []int, target int) []int {\n    // Write your solution here\n    return nil\n}","test_cases":[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]"}],"constraints":"2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9"}`,
	})

	level2DSA := models.InterviewLevel{
		TrackID:     dsaTrack.ID,
		LevelNumber: 2,
		Name:        "Level 2: Graph Traversals & Dynamic Programming",
		Description: "Advanced problem solving involving BFS/DFS, topological sort, memoization, and tabulations.",
		Mode:        models.ModeCoding,
		DurationMin: 60,
	}
	db.Create(&level2DSA)

	// 2. System Design Track
	sysTrack := models.InterviewTrack{
		Title:       "System Design & Scalable Architecture",
		Slug:        "system-design",
		Category:    "Architecture",
		Icon:        "Layers",
		Description: "Distributed systems, database sharding, microservices, load balancing, caching tiers, and high-availability architecture.",
	}
	db.Create(&sysTrack)

	level1Sys := models.InterviewLevel{
		TrackID:     sysTrack.ID,
		LevelNumber: 1,
		Name:        "Level 1: Architectural Concepts & Tradeoffs",
		Description: "Evaluate understanding of CAP theorem, database indexing, caching strategies, and load balancers.",
		Mode:        models.ModeDiscussion,
		DurationMin: 45,
	}
	db.Create(&level1Sys)

	db.Create(&models.InterviewQuestion{
		LevelID:    level1Sys.ID,
		Title:      "Design a Distributed Rate Limiter",
		Prompt:     "Walk me through designing an API rate limiter capable of handling 100,000 requests per second across multiple regional data centers.",
		Difficulty: "Medium",
		Type:       models.ModeDiscussion,
		PayloadJSON: `{"scenario":"High-throughput global API gateway requiring strict IP and token-based rate limits.","talking_points":["Token Bucket vs Leaky Bucket vs Sliding Window Log","Redis distributed cache with atomic Lua scripts","Handling Redis failover and clock skew drift"],"tradeoffs_to_evaluate":["Consistency vs Latency in multi-region deployments","Local in-memory token buffering vs centralized Redis calls"]}`,
	})

	// 3. Core CS Verbal Q&A Track
	coreTrack := models.InterviewTrack{
		Title:       "Computer Science Core Fundamentals",
		Slug:        "cs-core",
		Category:    "Core",
		Icon:        "Cpu",
		Description: "Operating systems, concurrency, networking protocols, database ACID properties, and memory management.",
	}
	db.Create(&coreTrack)

	level1Core := models.InterviewLevel{
		TrackID:     coreTrack.ID,
		LevelNumber: 1,
		Name:        "Level 1: OS, Concurrency & Networking",
		Description: "Live verbal technical interview assessing candidate's conceptual clarity and communication.",
		Mode:        models.ModeVerbalQA,
		DurationMin: 30,
	}
	db.Create(&level1Core)

	db.Create(&models.InterviewQuestion{
		LevelID:    level1Core.ID,
		Title:      "Goroutines vs Operating System Threads",
		Prompt:     "Explain how lightweight green threads (such as Go goroutines) differ from standard OS kernel threads in terms of memory footprint, stack growth, and context-switching overhead.",
		Difficulty: "Medium",
		Type:       models.ModeVerbalQA,
		PayloadJSON: `{"ideal_answer":"Goroutines start with tiny 2KB stack that grows/shrinks dynamically vs 1-2MB fixed OS threads. Context switching is managed in user-space by the Go M:N scheduler without entering kernel mode.","rubric_criteria":["Mentions memory footprint (2KB vs 1MB+)","Explains user-space runtime scheduler vs kernel context switch","Mentions channel/mutex synchronization mechanisms"]}`,
	})

	// 4. Campus Placement MCQ Track
	mcqTrack := models.InterviewTrack{
		Title:       "Campus Aptitude & Technical Screening",
		Slug:        "screening-mcq",
		Category:    "Screening",
		Icon:        "CheckSquare",
		Description: "Rapid objective technical multiple choice screening covering language syntax, output prediction, and complexity.",
	}
	db.Create(&mcqTrack)

	level1MCQ := models.InterviewLevel{
		TrackID:     mcqTrack.ID,
		LevelNumber: 1,
		Name:        "Level 1: Output Prediction & Complexity MCQ",
		Description: "Multiple-choice diagnostic round with time-boxed questions.",
		Mode:        models.ModeMCQ,
		DurationMin: 30,
	}
	db.Create(&level1MCQ)

	db.Create(&models.InterviewQuestion{
		LevelID:    level1MCQ.ID,
		Title:      "Time Complexity of Hash Table Rehashing",
		Prompt:     "When an open-addressing or chained hash table reaches its load factor limit and doubles in capacity, what is the amortized time complexity per insertion?",
		Difficulty: "Easy",
		Type:       models.ModeMCQ,
		PayloadJSON: `{"options":[{"id":"A","text":"O(1) Amortized"},{"id":"B","text":"O(N) Strict Worst Case"},{"id":"C","text":"O(log N)"},{"id":"D","text":"O(N^2)"}],"correct_option":"A","explanation":"While resizing itself takes O(N) work, because it occurs exponentially less frequently (doubling capacity), the amortized cost per single insert operation remains O(1)."}`,
	})

	log.Println("[INFO] Seeding completed for interview tracks, levels, and questions.")
}

// seedAdminUser checks if default admin exists; if not, seeds admin@bitsathy.ac.in
func seedAdminUser(db *gorm.DB) {
	adminEmail := "admin@bitsathy.ac.in"
	var existingAdmin models.User
	err := db.Where("email = ?", adminEmail).First(&existingAdmin).Error

	hashedPassword, errHash := models.HashPassword("password")
	if errHash != nil {
		log.Printf("[ERROR] Failed to hash admin password: %v\n", errHash)
		return
	}

	if err != nil {
		// Admin does not exist, create
		admin := models.User{
			Name:       "System Administrator",
			Email:      adminEmail,
			RollNo:     "ADMIN01",
			Department: "Administration",
			Password:   hashedPassword,
			Role:       "admin",
		}
		if createErr := db.Create(&admin).Error; createErr != nil {
			log.Printf("[ERROR] Failed to seed default admin: %v\n", createErr)
		} else {
			log.Println("[INFO] Successfully seeded default admin user: admin@bitsathy.ac.in (Password: 'password')")
		}
	} else {
		// Update password to ensure it matches requirement if needed
		db.Model(&existingAdmin).Updates(map[string]interface{}{
			"role":     "admin",
			"password": hashedPassword,
		})
		log.Println("[INFO] Verified default admin user: admin@bitsathy.ac.in")
	}
}
