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

	// Seed default Admin & Student accounts
	seedAdminAndStudents(db)

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
		&models.MatchmakingQueueEntry{},
		&models.InterviewSession{},
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
	if count == 0 {
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
			Name:        "Arrays, Strings & Basic Hashing",
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
			PayloadJSON: `{"starter_code":"func twoSum(nums []int, target int) []int {\n    // Write your solution here\n    return nil\n}","open_test_cases":[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]"}],"hidden_test_cases":[{"input":"nums = [3,3], target = 6","output":"[0,1]"},{"input":"nums = [-1,-2,-3,-4,-5], target = -8","output":"[2,4]"}],"test_cases":[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]"}],"constraints":"2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9","hints":["Hint 1: A brute force approach checks all pairs in O(N^2) time. Can you do this in a single pass with extra space?","Hint 2: As you iterate through the array, consider what value is needed to sum to the target (complement = target - num).","Hint 3: Use a Hash Map to store numbers you have already visited along with their indices for instant O(1) lookup."],"expected_approach":"Use a Single-Pass Hash Map:\n1. Initialize an empty hash map (num -> index).\n2. Iterate through 'nums' with index 'i'.\n3. Calculate 'complement = target - nums[i]'.\n4. If 'complement' exists in the map, return [map[complement], i].\n5. Otherwise, insert 'nums[i]: i' into the map.","expected_complexity":"Time Complexity: O(N) — Single linear scan over array of N elements.\nSpace Complexity: O(N) — At most N elements stored in the hash map.","interview_tips":["Clarify input constraints: Can numbers be negative? Are duplicate numbers allowed?","Start by explaining the brute force O(N^2) approach before presenting the O(N) hash map optimization.","Walk through a dry run on a sample input like nums=[2,7,11,15], target=9 before writing the final code."]}`,
		})

		level2DSA := models.InterviewLevel{
			TrackID:     dsaTrack.ID,
			LevelNumber: 2,
			Name:        "Graph Traversals & Dynamic Programming",
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
			Name:        "Architectural Concepts & Tradeoffs",
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
			PayloadJSON: `{"scenario":"High-throughput global API gateway requiring strict IP and token-based rate limits.","talking_points":["Token Bucket vs Leaky Bucket vs Sliding Window Log","Redis distributed cache with atomic Lua scripts","Handling Redis failover and clock skew drift"],"tradeoffs":["Consistency vs Latency in multi-region deployments","Local in-memory token buffering vs centralized Redis calls"],"interview_tips":["Probe candidate on how they handle race conditions when two requests arrive at the exact same millisecond.","Ask how the system behaves if Redis goes down — Fail Open (availability) vs Fail Closed (protection).","Evaluate whether candidate asks for clarification on RPS requirements and user burst limits."]}`,
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
			Name:        "OS, Concurrency & Networking",
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
			PayloadJSON: `{"ideal_answer":"Goroutines start with tiny 2KB stack that grows/shrinks dynamically vs 1-2MB fixed OS threads. Context switching is managed in user-space by the Go M:N scheduler without entering kernel mode.","rubrics":["Mentions memory footprint (2KB vs 1MB+)","Explains user-space runtime scheduler vs kernel context switch","Mentions channel/mutex synchronization mechanisms"],"interview_tips":["Check if the candidate understands the distinction between User Space vs Kernel Space context switches.","Follow up on Go runtime work-stealing scheduler (GMP model: Goroutines, Machines, Processors).","Ask what happens if a goroutine blocks on a system call."]}`,
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
			Name:        "Output Prediction & Complexity MCQ",
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
			PayloadJSON: `{"options":[{"id":"A","text":"O(1) Amortized"},{"id":"B","text":"O(N) Strict Worst Case"},{"id":"C","text":"O(log N)"},{"id":"D","text":"O(N^2)"}],"correct_option":"A","explanation":"While resizing itself takes O(N) work, because it occurs exponentially less frequently (doubling capacity), the amortized cost per single insert operation remains O(1).","interview_tips":["Remind candidates that 'Amortized' analysis averages the worst-case operation over a long sequence of frequent cheap operations.","Common pitfall: Confusing worst-case single insert O(N) during a resizing event with overall amortized complexity O(1)."]}`,
		})

		log.Println("[INFO] Seeding completed for interview tracks, levels, and questions.")
	}

	// Update existing questions in the database with rich hints, approach, complexity, and tips if not present
	dsaPayload := `{"starter_code":"func twoSum(nums []int, target int) []int {\n    // Write your solution here\n    return nil\n}","open_test_cases":[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]"}],"hidden_test_cases":[{"input":"nums = [3,3], target = 6","output":"[0,1]"},{"input":"nums = [-1,-2,-3,-4,-5], target = -8","output":"[2,4]"}],"test_cases":[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]"}],"constraints":"2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9","hints":["Hint 1: A brute force approach checks all pairs in O(N^2) time. Can you do this in a single pass with extra space?","Hint 2: As you iterate through the array, consider what value is needed to sum to the target (complement = target - num).","Hint 3: Use a Hash Map to store numbers you have already visited along with their indices for instant O(1) lookup."],"expected_approach":"Use a Single-Pass Hash Map:\n1. Initialize an empty hash map (num -> index).\n2. Iterate through 'nums' with index 'i'.\n3. Calculate 'complement = target - nums[i]'.\n4. If 'complement' exists in the map, return [map[complement], i].\n5. Otherwise, insert 'nums[i]: i' into the map.","expected_complexity":"Time Complexity: O(N) — Single linear scan over array of N elements.\nSpace Complexity: O(N) — At most N elements stored in the hash map.","interview_tips":["Clarify input constraints: Can numbers be negative? Are duplicate numbers allowed?","Start by explaining the brute force O(N^2) approach before presenting the O(N) hash map optimization.","Walk through a dry run on a sample input like nums=[2,7,11,15], target=9 before writing the final code."]}`
	db.Exec("UPDATE interview_questions SET payload_json = ? WHERE title LIKE '%Two Sum%' AND (payload_json NOT LIKE '%hints%' OR payload_json NOT LIKE '%expected_approach%')", dsaPayload)

	sysPayload := `{"scenario":"High-throughput global API gateway requiring strict IP and token-based rate limits.","talking_points":["Token Bucket vs Leaky Bucket vs Sliding Window Log","Redis distributed cache with atomic Lua scripts","Handling Redis failover and clock skew drift"],"tradeoffs":["Consistency vs Latency in multi-region deployments","Local in-memory token buffering vs centralized Redis calls"],"interview_tips":["Probe candidate on how they handle race conditions when two requests arrive at the exact same millisecond.","Ask how the system behaves if Redis goes down — Fail Open (availability) vs Fail Closed (protection).","Evaluate whether candidate asks for clarification on RPS requirements and user burst limits."]}`
	db.Exec("UPDATE interview_questions SET payload_json = ? WHERE title LIKE '%Rate Limiter%' AND (payload_json NOT LIKE '%interview_tips%' OR payload_json LIKE '%tradeoffs_to_evaluate%')", sysPayload)

	corePayload := `{"ideal_answer":"Goroutines start with tiny 2KB stack that grows/shrinks dynamically vs 1-2MB fixed OS threads. Context switching is managed in user-space by the Go M:N scheduler without entering kernel mode.","rubrics":["Mentions memory footprint (2KB vs 1MB+)","Explains user-space runtime scheduler vs kernel context switch","Mentions channel/mutex synchronization mechanisms"],"interview_tips":["Check if the candidate understands the distinction between User Space vs Kernel Space context switches.","Follow up on Go runtime work-stealing scheduler (GMP model: Goroutines, Machines, Processors).","Ask what happens if a goroutine blocks on a system call."]}`
	db.Exec("UPDATE interview_questions SET payload_json = ? WHERE title LIKE '%Goroutines%' AND (payload_json NOT LIKE '%interview_tips%' OR payload_json LIKE '%rubric_criteria%')", corePayload)

	mcqPayload := `{"options":[{"id":"A","text":"O(1) Amortized"},{"id":"B","text":"O(N) Strict Worst Case"},{"id":"C","text":"O(log N)"},{"id":"D","text":"O(N^2)"}],"correct_option":"A","explanation":"While resizing itself takes O(N) work, because it occurs exponentially less frequently (doubling capacity), the amortized cost per single insert operation remains O(1).","interview_tips":["Remind candidates that 'Amortized' analysis averages the worst-case operation over a long sequence of frequent cheap operations.","Common pitfall: Confusing worst-case single insert O(N) during a resizing event with overall amortized complexity O(1)."]}`
	db.Exec("UPDATE interview_questions SET payload_json = ? WHERE title LIKE '%Rehashing%' AND payload_json NOT LIKE '%interview_tips%'", mcqPayload)
}

// seedAdminAndStudents checks and seeds default admin and demo student accounts
func seedAdminAndStudents(db *gorm.DB) {
	hashedPassword, errHash := models.HashPassword("password")
	if errHash != nil {
		log.Printf("[ERROR] Failed to hash password: %v\n", errHash)
		return
	}

	defaultUsers := []models.User{
		{
			Name:       "System Administrator",
			Email:      "admin@bitsathy.ac.in",
			RollNo:     "ADMIN01",
			Department: "Administration",
			Role:       "admin",
			Password:   hashedPassword,
		},
		{
			Name:       "Jaison David M",
			Email:      "jaisondavidm.cs25@bitsathy.ac.in",
			RollNo:     "7376251CS221",
			Department: "CSE",
			Role:       "student",
			Password:   hashedPassword,
		},
		{
			Name:       "Mani M R S",
			Email:      "manimozhichelvanmrs.ad25@bitsathy.ac.in",
			RollNo:     "7376252AD230",
			Department: "AI&DS",
			Role:       "student",
			Password:   hashedPassword,
		},
	}

	for _, u := range defaultUsers {
		var existing models.User
		err := db.Where("email = ?", u.Email).First(&existing).Error
		if err != nil {
			if createErr := db.Create(&u).Error; createErr != nil {
				log.Printf("[ERROR] Failed to seed user %s: %v\n", u.Email, createErr)
			} else {
				log.Printf("[INFO] Successfully seeded user: %s (Password: 'password')\n", u.Email)
			}
		} else {
			db.Model(&existing).Updates(map[string]interface{}{
				"password":   hashedPassword,
				"name":       u.Name,
				"roll_no":    u.RollNo,
				"department": u.Department,
				"role":       u.Role,
			})
		}
	}
}
