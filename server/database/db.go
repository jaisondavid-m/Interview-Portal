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
	)
	if err == nil {
		migrateAndDropLegacyPayloadJSONColumn(db)
		seedInterviewData(db)
		seedFeedbackQuestions(db)
	}
	return err
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
					for _, l := range []string{"javascript", "python", "cpp", "java"} {
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

// seedInterviewData creates standard initial interview tracks, levels, and relational questions
func seedInterviewData(db *gorm.DB) {
	var count int64
	db.Model(&models.InterviewTrack{}).Count(&count)
	if count == 0 {
		log.Println("[INFO] Seeding default interview tracks, levels, and questions...")

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

		twoSum := models.InterviewQuestion{
			LevelID:    level1DSA.ID,
			Title:      "Two Sum with Target Index Lookup",
			Prompt:     "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
			Difficulty: "Easy",
			Type:       models.ModeCoding,
		}
		db.Create(&twoSum)

		db.Create(&models.InterviewQuestionDetail{
			QuestionID:         twoSum.ID,
			Constraints:        "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
			ExpectedApproach:   "Use a Single-Pass Hash Map:\n1. Initialize an empty hash map (num -> index).\n2. Iterate through 'nums' with index 'i'.\n3. Calculate 'complement = target - nums[i]'.\n4. If 'complement' exists in the map, return [map[complement], i].\n5. Otherwise, insert 'nums[i]: i' into the map.",
			ExpectedComplexity: "Time Complexity: O(N) — Single linear scan over array of N elements.\nSpace Complexity: O(N) — At most N elements stored in the hash map.",
		})

		db.Create(&models.InterviewQuestionCodeTemplate{
			QuestionID:  twoSum.ID,
			Language:    "javascript",
			StarterCode: "function twoSum(nums, target) {\n    // Write your solution here\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return [map.get(complement), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}",
		})
		db.Create(&models.InterviewQuestionCodeTemplate{
			QuestionID:  twoSum.ID,
			Language:    "python",
			StarterCode: "def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
		})
		db.Create(&models.InterviewQuestionCodeTemplate{
			QuestionID:  twoSum.ID,
			Language:    "cpp",
			StarterCode: "#include <vector>\n#include <unordered_map>\n\nstd::vector<int> twoSum(std::vector<int>& nums, int target) {\n    // Write your solution here\n    std::unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int comp = target - nums[i];\n        if (seen.find(comp) != seen.end()) return {seen[comp], i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}",
		})
		db.Create(&models.InterviewQuestionCodeTemplate{
			QuestionID:  twoSum.ID,
			Language:    "java",
			StarterCode: "import java.util.HashMap;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        HashMap<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}",
		})

		db.Create(&models.InterviewQuestionTestCase{QuestionID: twoSum.ID, Input: "nums = [2,7,11,15], target = 9", ExpectedOutput: "[0,1]", IsHidden: false, OrderIndex: 1})
		db.Create(&models.InterviewQuestionTestCase{QuestionID: twoSum.ID, Input: "nums = [3,2,4], target = 6", ExpectedOutput: "[1,2]", IsHidden: false, OrderIndex: 2})
		db.Create(&models.InterviewQuestionTestCase{QuestionID: twoSum.ID, Input: "nums = [3,3], target = 6", ExpectedOutput: "[0,1]", IsHidden: true, OrderIndex: 3})
		db.Create(&models.InterviewQuestionTestCase{QuestionID: twoSum.ID, Input: "nums = [-1,-2,-3,-4,-5], target = -8", ExpectedOutput: "[2,4]", IsHidden: true, OrderIndex: 4})

		db.Create(&models.InterviewQuestionHint{QuestionID: twoSum.ID, Type: "hint", Content: "Hint 1: A brute force approach checks all pairs in O(N^2) time. Can you do this in a single pass with extra space?", OrderIndex: 1})
		db.Create(&models.InterviewQuestionHint{QuestionID: twoSum.ID, Type: "hint", Content: "Hint 2: As you iterate through the array, consider what value is needed to sum to the target (complement = target - num).", OrderIndex: 2})
		db.Create(&models.InterviewQuestionHint{QuestionID: twoSum.ID, Type: "hint", Content: "Hint 3: Use a Hash Map to store numbers you have already visited along with their indices for instant O(1) lookup.", OrderIndex: 3})
		db.Create(&models.InterviewQuestionHint{QuestionID: twoSum.ID, Type: "interview_tip", Content: "Clarify input constraints: Can numbers be negative? Are duplicate numbers allowed?", OrderIndex: 4})
		db.Create(&models.InterviewQuestionHint{QuestionID: twoSum.ID, Type: "interview_tip", Content: "Start by explaining the brute force O(N^2) approach before presenting the O(N) hash map optimization.", OrderIndex: 5})

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

		rateLimiter := models.InterviewQuestion{
			LevelID:    level1Sys.ID,
			Title:      "Design a Distributed Rate Limiter",
			Prompt:     "Walk me through designing an API rate limiter capable of handling 100,000 requests per second across multiple regional data centers.",
			Difficulty: "Medium",
			Type:       models.ModeDiscussion,
		}
		db.Create(&rateLimiter)

		db.Create(&models.InterviewQuestionDetail{
			QuestionID: rateLimiter.ID,
			Scenario:   "High-throughput global API gateway requiring strict IP and token-based rate limits.",
		})
		db.Create(&models.InterviewQuestionHint{QuestionID: rateLimiter.ID, Type: "talking_point", Content: "Token Bucket vs Leaky Bucket vs Sliding Window Log", OrderIndex: 1})
		db.Create(&models.InterviewQuestionHint{QuestionID: rateLimiter.ID, Type: "talking_point", Content: "Redis distributed cache with atomic Lua scripts", OrderIndex: 2})
		db.Create(&models.InterviewQuestionHint{QuestionID: rateLimiter.ID, Type: "talking_point", Content: "Handling Redis failover and clock skew drift", OrderIndex: 3})
		db.Create(&models.InterviewQuestionHint{QuestionID: rateLimiter.ID, Type: "tradeoff", Content: "Consistency vs Latency in multi-region deployments", OrderIndex: 4})
		db.Create(&models.InterviewQuestionHint{QuestionID: rateLimiter.ID, Type: "tradeoff", Content: "Local in-memory token buffering vs centralized Redis calls", OrderIndex: 5})
		db.Create(&models.InterviewQuestionHint{QuestionID: rateLimiter.ID, Type: "interview_tip", Content: "Probe candidate on how they handle race conditions when two requests arrive at the exact same millisecond.", OrderIndex: 6})

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

		goroutines := models.InterviewQuestion{
			LevelID:    level1Core.ID,
			Title:      "Goroutines vs Operating System Threads",
			Prompt:     "Explain how lightweight green threads (such as Go goroutines) differ from standard OS kernel threads in terms of memory footprint, stack growth, and context-switching overhead.",
			Difficulty: "Medium",
			Type:       models.ModeVerbalQA,
		}
		db.Create(&goroutines)

		db.Create(&models.InterviewQuestionDetail{
			QuestionID:  goroutines.ID,
			IdealAnswer: "Goroutines start with tiny 2KB stack that grows/shrinks dynamically vs 1-2MB fixed OS threads. Context switching is managed in user-space by the Go M:N scheduler without entering kernel mode.",
		})
		db.Create(&models.InterviewQuestionHint{QuestionID: goroutines.ID, Type: "rubric", Content: "Mentions memory footprint (2KB vs 1MB+)", OrderIndex: 1})
		db.Create(&models.InterviewQuestionHint{QuestionID: goroutines.ID, Type: "rubric", Content: "Explains user-space runtime scheduler vs kernel context switch", OrderIndex: 2})
		db.Create(&models.InterviewQuestionHint{QuestionID: goroutines.ID, Type: "rubric", Content: "Mentions channel/mutex synchronization mechanisms", OrderIndex: 3})
		db.Create(&models.InterviewQuestionHint{QuestionID: goroutines.ID, Type: "interview_tip", Content: "Check if candidate understands User Space vs Kernel Space context switches.", OrderIndex: 4})

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

		mcqQ := models.InterviewQuestion{
			LevelID:    level1MCQ.ID,
			Title:      "Time Complexity of Hash Table Rehashing",
			Prompt:     "When an open-addressing or chained hash table reaches its load factor limit and doubles in capacity, what is the amortized time complexity per insertion?",
			Difficulty: "Easy",
			Type:       models.ModeMCQ,
		}
		db.Create(&mcqQ)

		db.Create(&models.InterviewQuestionDetail{
			QuestionID:    mcqQ.ID,
			CorrectOption: "A",
			Explanation:   "While resizing itself takes O(N) work, because it occurs exponentially less frequently (doubling capacity), the amortized cost per single insert operation remains O(1).",
		})
		db.Create(&models.InterviewQuestionMCQOption{QuestionID: mcqQ.ID, OptionKey: "A", OptionText: "O(1) Amortized", IsCorrect: true})
		db.Create(&models.InterviewQuestionMCQOption{QuestionID: mcqQ.ID, OptionKey: "B", OptionText: "O(N) Strict Worst Case", IsCorrect: false})
		db.Create(&models.InterviewQuestionMCQOption{QuestionID: mcqQ.ID, OptionKey: "C", OptionText: "O(log N)", IsCorrect: false})
		db.Create(&models.InterviewQuestionMCQOption{QuestionID: mcqQ.ID, OptionKey: "D", OptionText: "O(N^2)", IsCorrect: false})
		db.Create(&models.InterviewQuestionHint{QuestionID: mcqQ.ID, Type: "interview_tip", Content: "Remind candidates that 'Amortized' analysis averages the worst-case operation over a long sequence of frequent cheap operations.", OrderIndex: 1})

		log.Println("[INFO] Seeding completed for interview tracks, levels, and questions.")
	}

	// Ensure Valid Palindrome exists in Level 1 DSA
	var dsaLevel models.InterviewLevel
	if err := db.Joins("JOIN interview_tracks ON interview_tracks.id = interview_levels.track_id").
		Where("interview_tracks.slug = 'dsa' AND interview_levels.level_number = 1").
		First(&dsaLevel).Error; err == nil {
		var palCount int64
		db.Model(&models.InterviewQuestion{}).Where("level_id = ? AND title LIKE '%Valid Palindrome%'", dsaLevel.ID).Count(&palCount)
		if palCount == 0 {
			palQ := models.InterviewQuestion{
				LevelID:    dsaLevel.ID,
				Title:      "Valid Palindrome with Two Pointers",
				Prompt:     "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
				Difficulty: "Easy",
				Type:       models.ModeCoding,
			}
			db.Create(&palQ)

			db.Create(&models.InterviewQuestionDetail{
				QuestionID:         palQ.ID,
				Constraints:        "1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.",
				ExpectedApproach:   "Use Two Pointers (In-Place):\n1. Initialize left = 0, right = len(s) - 1.\n2. While left < right:\n   a. Skip non-alphanumeric.\n   b. Compare lowercase chars.\n3. Return true.",
				ExpectedComplexity: "Time Complexity: O(N) — Single linear pass.\nSpace Complexity: O(1) — In-place pointers.",
			})

			db.Create(&models.InterviewQuestionCodeTemplate{
				QuestionID:  palQ.ID,
				Language:    "javascript",
				StarterCode: "function isPalindrome(s) {\n    // Write your solution here\n    let left = 0, right = s.length - 1;\n    while (left < right) {\n        while (left < right && !/[a-zA-Z0-9]/.test(s[left])) left++;\n        while (left < right && !/[a-zA-Z0-9]/.test(s[right])) right--;\n        if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;\n        left++;\n        right--;\n    }\n    return true;\n}",
			})
			db.Create(&models.InterviewQuestionCodeTemplate{
				QuestionID:  palQ.ID,
				Language:    "python",
				StarterCode: "def isPalindrome(s: str) -> bool:\n    # Write your solution here\n    left, right = 0, len(s) - 1\n    while left < right:\n        while left < right and not s[left].isalnum(): left += 1\n        while left < right and not s[right].isalnum(): right -= 1\n        if s[left].lower() != s[right].lower(): return False\n        left += 1\n        right -= 1\n    return True",
			})

			db.Create(&models.InterviewQuestionTestCase{QuestionID: palQ.ID, Input: "s = \"A man, a plan, a canal: Panama\"", ExpectedOutput: "true", IsHidden: false, OrderIndex: 1})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: palQ.ID, Input: "s = \"race a car\"", ExpectedOutput: "false", IsHidden: false, OrderIndex: 2})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: palQ.ID, Input: "s = \" \"", ExpectedOutput: "true", IsHidden: false, OrderIndex: 3})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: palQ.ID, Input: "s = \"0P\"", ExpectedOutput: "false", IsHidden: true, OrderIndex: 4})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: palQ.ID, Input: "s = \"ab_a\"", ExpectedOutput: "true", IsHidden: true, OrderIndex: 5})

			db.Create(&models.InterviewQuestionHint{QuestionID: palQ.ID, Type: "hint", Content: "Hint 1: Consider using a Two-Pointer technique with left = 0 and right = len(s) - 1.", OrderIndex: 1})
			db.Create(&models.InterviewQuestionHint{QuestionID: palQ.ID, Type: "interview_tip", Content: "Ask candidate if alphanumeric includes numbers.", OrderIndex: 2})
			log.Println("[INFO] Successfully seeded question: 'Valid Palindrome with Two Pointers' in Level 1 DSA")
		}

		var anagramCount int64
		db.Model(&models.InterviewQuestion{}).Where("level_id = ? AND title LIKE '%Valid Anagram%'", dsaLevel.ID).Count(&anagramCount)
		if anagramCount == 0 {
			anagramQ := models.InterviewQuestion{
				LevelID:    dsaLevel.ID,
				Title:      "Valid Anagram Detection",
				Prompt:     "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
				Difficulty: "Easy",
				Type:       models.ModeCoding,
			}
			db.Create(&anagramQ)

			db.Create(&models.InterviewQuestionDetail{
				QuestionID:         anagramQ.ID,
				Constraints:        "1 <= s.length, t.length <= 5 * 10^4\ns and t consist of lowercase English letters.",
				ExpectedApproach:   "Use Fixed-Size Frequency Array (26 letters):\n1. Check if len(s) != len(t).\n2. Count frequency diff.\n3. Return true if all counts are 0.",
				ExpectedComplexity: "Time Complexity: O(N) — Single linear pass.\nSpace Complexity: O(1) — 26-element array.",
			})

			db.Create(&models.InterviewQuestionCodeTemplate{
				QuestionID:  anagramQ.ID,
				Language:    "javascript",
				StarterCode: "function isAnagram(s, t) {\n    // Write your solution here\n    if (s.length !== t.length) return false;\n    const count = {};\n    for (let c of s) count[c] = (count[c] || 0) + 1;\n    for (let c of t) {\n        if (!count[c]) return false;\n        count[c]--;\n    }\n    return true;\n}",
			})
			db.Create(&models.InterviewQuestionCodeTemplate{
				QuestionID:  anagramQ.ID,
				Language:    "python",
				StarterCode: "def isAnagram(s: str, t: str) -> bool:\n    # Write your solution here\n    if len(s) != len(t): return False\n    count = {}\n    for c in s: count[c] = count.get(c, 0) + 1\n    for c in t:\n        if c not in count or count[c] == 0: return False\n        count[c] -= 1\n    return True",
			})

			db.Create(&models.InterviewQuestionTestCase{QuestionID: anagramQ.ID, Input: "s = \"anagram\", t = \"nagaram\"", ExpectedOutput: "true", IsHidden: false, OrderIndex: 1})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: anagramQ.ID, Input: "s = \"rat\", t = \"car\"", ExpectedOutput: "false", IsHidden: false, OrderIndex: 2})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: anagramQ.ID, Input: "s = \"a\", t = \"a\"", ExpectedOutput: "true", IsHidden: false, OrderIndex: 3})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: anagramQ.ID, Input: "s = \"ab\", t = \"a\"", ExpectedOutput: "false", IsHidden: true, OrderIndex: 4})
			db.Create(&models.InterviewQuestionTestCase{QuestionID: anagramQ.ID, Input: "s = \"listen\", t = \"silent\"", ExpectedOutput: "true", IsHidden: true, OrderIndex: 5})

			db.Create(&models.InterviewQuestionHint{QuestionID: anagramQ.ID, Type: "hint", Content: "Hint 1: If lengths are different, return false immediately.", OrderIndex: 1})
			log.Println("[INFO] Successfully seeded question: 'Valid Anagram Detection' in Level 1 DSA")
		}
	}

	// Ensure System Design Level 1 has secondary question for Round 2
	var sysLevel models.InterviewLevel
	if err := db.Joins("JOIN interview_tracks ON interview_tracks.id = interview_levels.track_id").
		Where("interview_tracks.slug = 'system-design' AND interview_levels.level_number = 1").
		First(&sysLevel).Error; err == nil {
		var urlCount int64
		db.Model(&models.InterviewQuestion{}).Where("level_id = ? AND title LIKE '%URL Shortener%'", sysLevel.ID).Count(&urlCount)
		if urlCount == 0 {
			tinyURL := models.InterviewQuestion{
				LevelID:    sysLevel.ID,
				Title:      "Design a Scalable URL Shortener (TinyURL)",
				Prompt:     "Design a high-throughput URL shortening service like TinyURL that generates short aliases for long URLs, handling 100M new URLs created per month with sub-10ms redirect latency.",
				Difficulty: "Medium",
				Type:       models.ModeDiscussion,
			}
			db.Create(&tinyURL)
			db.Create(&models.InterviewQuestionDetail{
				QuestionID: tinyURL.ID,
				Scenario:   "Global URL redirection system with 10:1 read-to-write ratio, analytics tracking, and high cache availability.",
			})
			db.Create(&models.InterviewQuestionHint{QuestionID: tinyURL.ID, Type: "talking_point", Content: "Base62 Encoding vs MD5/SHA256 Hash Truncation vs Distributed Key Generation Service (KGS)", OrderIndex: 1})
			db.Create(&models.InterviewQuestionHint{QuestionID: tinyURL.ID, Type: "talking_point", Content: "Caching hot URLs with Redis LRU eviction tier", OrderIndex: 2})
			db.Create(&models.InterviewQuestionHint{QuestionID: tinyURL.ID, Type: "tradeoff", Content: "HTTP 301 (Permanent Redirect - browser cached) vs HTTP 302 (Temporary Redirect - accurate click tracking)", OrderIndex: 3})
			db.Create(&models.InterviewQuestionHint{QuestionID: tinyURL.ID, Type: "interview_tip", Content: "Probe on how the candidate generates unique 7-character Base62 keys without concurrency lock contention.", OrderIndex: 4})
			log.Println("[INFO] Successfully seeded question: 'Design a Scalable URL Shortener' in Level 1 System Design")
		}

		var chatCount int64
		db.Model(&models.InterviewQuestion{}).Where("level_id = ? AND title LIKE '%Real-Time Chat%'", sysLevel.ID).Count(&chatCount)
		if chatCount == 0 {
			chatQ := models.InterviewQuestion{
				LevelID:    sysLevel.ID,
				Title:      "Design a Scalable Real-Time Chat System",
				Prompt:     "Design a real-time messaging architecture like WhatsApp or Slack that supports 1-on-1 direct messaging, online presence status, and offline push notifications for 50 million daily active users.",
				Difficulty: "Hard",
				Type:       models.ModeDiscussion,
			}
			db.Create(&chatQ)
			db.Create(&models.InterviewQuestionDetail{
				QuestionID: chatQ.ID,
				Scenario:   "Low-latency bidirectional WebSocket connection pool with distributed message broker (Kafka/RabbitMQ) and Cassandra message storage.",
			})
			db.Create(&models.InterviewQuestionHint{QuestionID: chatQ.ID, Type: "talking_point", Content: "WebSockets vs Long Polling vs Server-Sent Events (SSE)", OrderIndex: 1})
			db.Create(&models.InterviewQuestionHint{QuestionID: chatQ.ID, Type: "talking_point", Content: "User session gateway service with Redis connection mapping", OrderIndex: 2})
			db.Create(&models.InterviewQuestionHint{QuestionID: chatQ.ID, Type: "tradeoff", Content: "Message ordering guarantees: Sequential ID generation vs Snowflake IDs", OrderIndex: 3})
			log.Println("[INFO] Successfully seeded question: 'Design a Scalable Real-Time Chat System' in Level 1 System Design")
		}
	}

	// Ensure Core CS Level 1 has secondary question for Round 2
	var coreLevel models.InterviewLevel
	if err := db.Joins("JOIN interview_tracks ON interview_tracks.id = interview_levels.track_id").
		Where("interview_tracks.slug = 'cs-core' AND interview_levels.level_number = 1").
		First(&coreLevel).Error; err == nil {
		var acidCount int64
		db.Model(&models.InterviewQuestion{}).Where("level_id = ? AND title LIKE '%ACID%'", coreLevel.ID).Count(&acidCount)
		if acidCount == 0 {
			acidQ := models.InterviewQuestion{
				LevelID:    coreLevel.ID,
				Title:      "Database ACID Properties & Isolation Levels",
				Prompt:     "Walk me through the 4 ACID properties of relational databases and explain the differences between Read Committed, Repeatable Read, and Serializable isolation levels with real concurrency anomalies (Dirty Read, Non-repeatable Read, Phantom Read).",
				Difficulty: "Medium",
				Type:       models.ModeVerbalQA,
			}
			db.Create(&acidQ)
			db.Create(&models.InterviewQuestionDetail{
				QuestionID:  acidQ.ID,
				IdealAnswer: "Atomicity ensures all-or-nothing transactions; Consistency preserves schema invariants; Isolation defines visibility across concurrent transactions; Durability guarantees committed writes survive crashes. Isolation levels mitigate Dirty Reads (Read Uncommitted), Non-Repeatable Reads (Read Committed), and Phantom Reads (Repeatable Read/Serializable) via MVCC or two-phase locking.",
			})
			db.Create(&models.InterviewQuestionHint{QuestionID: acidQ.ID, Type: "rubric", Content: "Defines all 4 ACID properties clearly", OrderIndex: 1})
			db.Create(&models.InterviewQuestionHint{QuestionID: acidQ.ID, Type: "rubric", Content: "Explains MVCC (Multi-Version Concurrency Control) mechanism", OrderIndex: 2})
			db.Create(&models.InterviewQuestionHint{QuestionID: acidQ.ID, Type: "rubric", Content: "Distinguishes Dirty Read vs Phantom Read accurately", OrderIndex: 3})
			log.Println("[INFO] Successfully seeded question: 'Database ACID Properties' in Level 1 CS Core")
		}
	}

	// Ensure MCQ Level 1 has secondary question for Round 2
	var mcqLevel models.InterviewLevel
	if err := db.Joins("JOIN interview_tracks ON interview_tracks.id = interview_levels.track_id").
		Where("interview_tracks.slug = 'screening-mcq' AND interview_levels.level_number = 1").
		First(&mcqLevel).Error; err == nil {
		var bstCount int64
		db.Model(&models.InterviewQuestion{}).Where("level_id = ? AND title LIKE '%Binary Search Tree%'", mcqLevel.ID).Count(&bstCount)
		if bstCount == 0 {
			bstQ := models.InterviewQuestion{
				LevelID:    mcqLevel.ID,
				Title:      "Binary Search Tree In-Order Traversal",
				Prompt:     "Which tree traversal method always visits all keys of a valid Binary Search Tree (BST) in non-decreasing sorted order?",
				Difficulty: "Easy",
				Type:       models.ModeMCQ,
			}
			db.Create(&bstQ)
			db.Create(&models.InterviewQuestionDetail{
				QuestionID:    bstQ.ID,
				CorrectOption: "B",
				Explanation:   "In-order traversal visits the Left Subtree, Root Node, and Right Subtree in sequence. For any BST, this visits every node in strictly sorted ascending order.",
			})
			db.Create(&models.InterviewQuestionMCQOption{QuestionID: bstQ.ID, OptionKey: "A", OptionText: "Pre-order Traversal (Root, Left, Right)", IsCorrect: false})
			db.Create(&models.InterviewQuestionMCQOption{QuestionID: bstQ.ID, OptionKey: "B", OptionText: "In-order Traversal (Left, Root, Right)", IsCorrect: true})
			db.Create(&models.InterviewQuestionMCQOption{QuestionID: bstQ.ID, OptionKey: "C", OptionText: "Post-order Traversal (Left, Right, Root)", IsCorrect: false})
			db.Create(&models.InterviewQuestionMCQOption{QuestionID: bstQ.ID, OptionKey: "D", OptionText: "Level-order BFS Traversal", IsCorrect: false})
			log.Println("[INFO] Successfully seeded question: 'Binary Search Tree In-Order Traversal' in Level 1 MCQ")
		}
	}
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

// seedFeedbackQuestions creates default relational feedback questions if none exist
func seedFeedbackQuestions(db *gorm.DB) {
	var count int64
	db.Model(&models.FeedbackQuestion{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("[INFO] Seeding default peer feedback questions...")

	type SeedQuestion struct {
		Text       string
		Type       string
		IsRequired bool
		OrderIndex int
		Options    []string
	}

	questions := []SeedQuestion{
		{
			Text:       "How would you rate the student's technical knowledge?",
			Type:       "mcq",
			IsRequired: true,
			OrderIndex: 1,
			Options:    []string{"1", "2", "3", "4", "5"},
		},
		{
			Text:       "How would you rate the student's communication?",
			Type:       "mcq",
			IsRequired: true,
			OrderIndex: 2,
			Options:    []string{"1", "2", "3", "4", "5"},
		},
		{
			Text:       "Was the student able to explain their approach clearly?",
			Type:       "yes_no",
			IsRequired: true,
			OrderIndex: 3,
			Options:    []string{"Yes", "No"},
		},
		{
			Text:       "Did the student actively participate in the interview?",
			Type:       "yes_no",
			IsRequired: true,
			OrderIndex: 4,
			Options:    []string{"Yes", "No"},
		},
		{
			Text:       "How well did the student handle feedback?",
			Type:       "mcq",
			IsRequired: true,
			OrderIndex: 5,
			Options:    []string{"Excellent", "Good", "Average", "Poor"},
		},
		{
			Text:       "Additional feedback & suggestions:",
			Type:       "text",
			IsRequired: false,
			OrderIndex: 6,
			Options:    nil,
		},
	}

	for _, q := range questions {
		questionRecord := models.FeedbackQuestion{
			QuestionText: q.Text,
			QuestionType: q.Type,
			IsRequired:   q.IsRequired,
			OrderIndex:   q.OrderIndex,
			IsActive:     true,
		}

		if err := db.Create(&questionRecord).Error; err != nil {
			log.Printf("[ERROR] Failed to seed feedback question '%s': %v\n", q.Text, err)
			continue
		}

		// Relational child options
		for optIdx, optText := range q.Options {
			optRecord := models.FeedbackQuestionOption{
				QuestionID: questionRecord.ID,
				OptionText: optText,
				OrderIndex: optIdx + 1,
			}
			if err := db.Create(&optRecord).Error; err != nil {
				log.Printf("[ERROR] Failed to seed option '%s' for question %d: %v\n", optText, questionRecord.ID, err)
			}
		}
	}

	log.Println("[INFO] Successfully seeded peer feedback questions.")
}

