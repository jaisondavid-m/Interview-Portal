package controllers

import (
	"math"
	"net/http"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// AdminGetDashboardAnalytics computes comprehensive platform-wide analytics for the Admin Dashboard
func AdminGetDashboardAnalytics(c *gin.Context) {
	// 1. User Metrics
	var totalStudents int64
	var totalAdmins int64
	database.DB.Model(&models.User{}).Where("role = ?", "student").Count(&totalStudents)
	database.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&totalAdmins)

	// 2. Session Metrics
	var allSessions []models.InterviewSession
	database.DB.
		Preload("Track").
		Preload("Level").
		Preload("Interviewer").
		Preload("Interviewee").
		Order("created_at desc").
		Find(&allSessions)

	var totalSessions int64 = int64(len(allSessions))
	var completedSessions int64
	var inProgressSessions int64
	var cancelledSessions int64
	var totalPracticeSecs float64

	for _, s := range allSessions {
		switch s.Status {
		case "completed":
			completedSessions++
			if s.EndedAt != nil && !s.StartedAt.IsZero() {
				diff := s.EndedAt.Sub(s.StartedAt).Seconds()
				if diff > 0 {
					totalPracticeSecs += diff
				} else {
					totalPracticeSecs += 2700
				}
			} else {
				totalPracticeSecs += 2700
			}
		case "in_progress":
			inProgressSessions++
		case "cancelled":
			cancelledSessions++
		default:
			if s.EndedAt != nil {
				completedSessions++
			}
		}
	}

	completionRate := 0.0
	validSessions := completedSessions + inProgressSessions
	if validSessions > 0 {
		completionRate = (float64(completedSessions) / float64(validSessions)) * 100.0
	} else if totalSessions > 0 {
		completionRate = (float64(completedSessions) / float64(totalSessions)) * 100.0
	}
	totalPracticeHours := math.Round((totalPracticeSecs/3600.0)*10) / 10

	// 3. Question Bank & Track Inventory
	var totalTracks int64
	var totalLevels int64
	var totalQuestions int64
	database.DB.Model(&models.InterviewTrack{}).Count(&totalTracks)
	database.DB.Model(&models.InterviewLevel{}).Count(&totalLevels)
	database.DB.Model(&models.InterviewQuestion{}).Count(&totalQuestions)

	// 4. Feedback & Score Analytics
	var allFeedbacks []models.InterviewFeedback
	database.DB.Find(&allFeedbacks)

	var totalFeedbacks int64 = int64(len(allFeedbacks))
	var sumScorePct float64
	var scoredFeedbackCount int64

	for _, fb := range allFeedbacks {
		if fb.MaxScore > 0 {
			pct := (fb.TotalScore / fb.MaxScore) * 100.0
			sumScorePct += pct
			scoredFeedbackCount++
		}
	}

	platformAvgScore := 0.0
	if scoredFeedbackCount > 0 {
		platformAvgScore = math.Round((sumScorePct/float64(scoredFeedbackCount))*10) / 10
	}

	platformGrade := "Unranked"
	if scoredFeedbackCount > 0 {
		if platformAvgScore >= 85 {
			platformGrade = "Outstanding (A+)"
		} else if platformAvgScore >= 70 {
			platformGrade = "Proficient (B)"
		} else if platformAvgScore >= 50 {
			platformGrade = "Average (C)"
		} else {
			platformGrade = "Needs Practice"
		}
	}

	// 5. Daily Time-Series Velocity (Last 30 Days)
	now := time.Now()
	type DailyActivity struct {
		Date          string  `json:"date"`           // "2026-03-15"
		Label         string  `json:"label"`          // "Mar 15"
		SessionsCount int     `json:"sessions_count"` // Completed or conducted
		PracticeHours float64 `json:"practice_hours"`
		AvgScorePct   float64 `json:"avg_score_pct"`
	}

	// Map days to date keys
	dailyMap := make(map[string]*DailyActivity)
	var dailyList []DailyActivity

	for i := 29; i >= 0; i-- {
		day := now.AddDate(0, 0, -i)
		dateKey := day.Format("2006-01-02")
		label := day.Format("Jan 02")
		da := &DailyActivity{
			Date:          dateKey,
			Label:         label,
			SessionsCount: 0,
			PracticeHours: 0,
			AvgScorePct:   0,
		}
		dailyMap[dateKey] = da
		dailyList = append(dailyList, *da)
	}

	for _, s := range allSessions {
		if s.Status == "cancelled" {
			continue
		}
		targetDate := s.CreatedAt.Format("2006-01-02")
		if da, exists := dailyMap[targetDate]; exists {
			da.SessionsCount++
			if s.EndedAt != nil && !s.StartedAt.IsZero() {
				diff := s.EndedAt.Sub(s.StartedAt).Hours()
				if diff > 0 {
					da.PracticeHours += diff
				} else {
					da.PracticeHours += 0.75
				}
			} else {
				da.PracticeHours += 0.75
			}
		}
	}

	// Re-sync dailyList from dailyMap with rounded values
	for idx, item := range dailyList {
		if da, exists := dailyMap[item.Date]; exists {
			da.PracticeHours = math.Round(da.PracticeHours*10) / 10
			dailyList[idx] = *da
		}
	}

	// 6. Track Breakdown
	type TrackStat struct {
		TrackID        uint    `json:"track_id"`
		Title          string  `json:"title"`
		Slug           string  `json:"slug"`
		Category       string  `json:"category"`
		Icon           string  `json:"icon"`
		SessionsCount  int     `json:"sessions_count"`
		CompletedCount int     `json:"completed_count"`
		StudentCount   int     `json:"student_count"`
		AvgScorePct    float64 `json:"avg_score_pct"`
		SharePct       float64 `json:"share_pct"`
	}

	var tracks []models.InterviewTrack
	database.DB.Order("id asc").Find(&tracks)

	var trackStats []TrackStat
	for _, t := range tracks {
		var sCount int
		var cCount int
		studentSet := make(map[uint]bool)

		for _, s := range allSessions {
			if s.TrackID == t.ID {
				if s.Status != "cancelled" {
					sCount++
					studentSet[s.InterviewerID] = true
					studentSet[s.IntervieweeID] = true
				}
				if s.Status == "completed" {
					cCount++
				}
			}
		}

		sharePct := 0.0
		if totalSessions > 0 {
			sharePct = math.Round((float64(sCount)/float64(totalSessions))*1000) / 10
		}

		trackStats = append(trackStats, TrackStat{
			TrackID:        t.ID,
			Title:          t.Title,
			Slug:           t.Slug,
			Category:       t.Category,
			Icon:           t.Icon,
			SessionsCount:  sCount,
			CompletedCount: cCount,
			StudentCount:   len(studentSet),
			AvgScorePct:    platformAvgScore, // base baseline
			SharePct:       sharePct,
		})
	}

	// 7. Rubric Competency Breakdown across peer feedback questions
	var feedbackQuestions []models.FeedbackQuestion
	database.DB.
		Where("question_type != ?", "text").
		Where("is_active = ?", true).
		Preload("Options").
		Order("order_index asc, id asc").
		Find(&feedbackQuestions)

	type RubricStat struct {
		QuestionID      uint    `json:"question_id"`
		QuestionText    string  `json:"question_text"`
		ShortLabel      string  `json:"short_label"`
		QuestionType    string  `json:"question_type"`
		MaxMarks        float64 `json:"max_marks"`
		ResponsesCount  int     `json:"responses_count"`
		AvgAwardedMarks float64 `json:"avg_awarded_marks"`
		AvgScorePct     float64 `json:"avg_score_pct"`
	}

	var rubricStats []RubricStat
	for _, q := range feedbackQuestions {
		var responses []models.InterviewFeedbackResponse
		database.DB.Where("question_id = ?", q.ID).Find(&responses)

		var totalAwarded float64
		var maxPossible float64
		for _, r := range responses {
			totalAwarded += r.AwardedMarks
			if r.MaxMarks > 0 {
				maxPossible += r.MaxMarks
			} else if q.MaxMarks > 0 {
				maxPossible += q.MaxMarks
			}
		}

		avgAwarded := 0.0
		avgPct := 0.0
		if len(responses) > 0 {
			avgAwarded = totalAwarded / float64(len(responses))
			if maxPossible > 0 {
				avgPct = (totalAwarded / maxPossible) * 100.0
			} else if q.MaxMarks > 0 {
				avgPct = (avgAwarded / q.MaxMarks) * 100.0
			}
		}

		label := q.ShortLabel
		if label == "" {
			if len(q.QuestionText) > 32 {
				label = q.QuestionText[:29] + "..."
			} else {
				label = q.QuestionText
			}
		}

		rubricStats = append(rubricStats, RubricStat{
			QuestionID:      q.ID,
			QuestionText:    q.QuestionText,
			ShortLabel:      label,
			QuestionType:    q.QuestionType,
			MaxMarks:        q.MaxMarks,
			ResponsesCount:  len(responses),
			AvgAwardedMarks: math.Round(avgAwarded*10) / 10,
			AvgScorePct:     math.Round(avgPct*10) / 10,
		})
	}

	// 8. Student Grade / Performance Cohorts
	type studentAgg struct {
		totalScore    float64
		totalMaxScore float64
		reviewCount   int
	}
	studentMap := make(map[uint]*studentAgg)
	for _, fb := range allFeedbacks {
		if _, exists := studentMap[fb.RevieweeID]; !exists {
			studentMap[fb.RevieweeID] = &studentAgg{}
		}
		studentMap[fb.RevieweeID].totalScore += fb.TotalScore
		studentMap[fb.RevieweeID].totalMaxScore += fb.MaxScore
		studentMap[fb.RevieweeID].reviewCount++
	}

	var tierOutstanding int
	var tierProficient int
	var tierAverage int
	var tierNeedsPractice int
	var tierUnranked int

	var students []models.User
	database.DB.Where("role = ?", "student").Find(&students)

	for _, st := range students {
		if agg, ok := studentMap[st.ID]; ok && agg.reviewCount > 0 && agg.totalMaxScore > 0 {
			pct := (agg.totalScore / agg.totalMaxScore) * 100.0
			if pct >= 85 {
				tierOutstanding++
			} else if pct >= 70 {
				tierProficient++
			} else if pct >= 50 {
				tierAverage++
			} else {
				tierNeedsPractice++
			}
		} else {
			tierUnranked++
		}
	}

	gradeDistribution := gin.H{
		"outstanding":    tierOutstanding,
		"proficient":     tierProficient,
		"average":        tierAverage,
		"needs_practice": tierNeedsPractice,
		"unranked":       tierUnranked,
		"total_students": len(students),
	}

	// 9. Recent Sessions Feed (Latest 6)
	type RecentSessionItem struct {
		ID              uint      `json:"id"`
		TrackTitle      string    `json:"track_title"`
		TrackIcon       string    `json:"track_icon"`
		InterviewerName string    `json:"interviewer_name"`
		InterviewerRoll string    `json:"interviewer_roll"`
		IntervieweeName string    `json:"interviewee_name"`
		IntervieweeRoll string    `json:"interviewee_roll"`
		Status          string    `json:"status"`
		Round           int       `json:"round"`
		DurationMinutes int       `json:"duration_minutes"`
		CreatedAt       time.Time `json:"created_at"`
	}

	var recentSessions []RecentSessionItem
	limit := 6
	if len(allSessions) < limit {
		limit = len(allSessions)
	}

	for i := 0; i < limit; i++ {
		s := allSessions[i]
		trackTitle := "General Mock"
		trackIcon := "Code"
		if s.Track != nil {
			trackTitle = s.Track.Title
			trackIcon = s.Track.Icon
		}

		interviewerName := "Student A"
		interviewerRoll := ""
		if s.Interviewer != nil {
			interviewerName = s.Interviewer.Name
			interviewerRoll = s.Interviewer.RollNo
		}

		intervieweeName := "Student B"
		intervieweeRoll := ""
		if s.Interviewee != nil {
			intervieweeName = s.Interviewee.Name
			intervieweeRoll = s.Interviewee.RollNo
		}

		durMin := 45
		if s.EndedAt != nil && !s.StartedAt.IsZero() {
			durMin = int(s.EndedAt.Sub(s.StartedAt).Minutes())
			if durMin <= 0 {
				durMin = 1
			}
		}

		recentSessions = append(recentSessions, RecentSessionItem{
			ID:              s.ID,
			TrackTitle:      trackTitle,
			TrackIcon:       trackIcon,
			InterviewerName: interviewerName,
			InterviewerRoll: interviewerRoll,
			IntervieweeName: intervieweeName,
			IntervieweeRoll: intervieweeRoll,
			Status:          s.Status,
			Round:           s.Round,
			DurationMinutes: durMin,
			CreatedAt:       s.CreatedAt,
		})
	}

	// 10. Top Performers Snapshot (Top 5)
	type TopPerformer struct {
		ID                 uint    `json:"id"`
		Name               string  `json:"name"`
		RollNo             string  `json:"roll_no"`
		Department         string  `json:"department"`
		TotalScore         float64 `json:"total_score"`
		InterviewsAttended int     `json:"interviews_attended"`
		ScorePercentage    float64 `json:"score_percentage"`
		Grade              string  `json:"grade"`
	}

	// Count interviews per student
	attendanceMap := make(map[uint]int)
	for _, s := range allSessions {
		if s.Status != "cancelled" {
			attendanceMap[s.InterviewerID]++
			attendanceMap[s.IntervieweeID]++
		}
	}

	var performers []TopPerformer
	for _, st := range students {
		if agg, ok := studentMap[st.ID]; ok && agg.reviewCount > 0 {
			pct := 0.0
			if agg.totalMaxScore > 0 {
				pct = math.Round((agg.totalScore/agg.totalMaxScore)*1000) / 10
			}
			grade := "Needs Practice"
			if pct >= 85 {
				grade = "Outstanding (A+)"
			} else if pct >= 70 {
				grade = "Proficient (B)"
			} else if pct >= 50 {
				grade = "Average (C)"
			}

			performers = append(performers, TopPerformer{
				ID:                 st.ID,
				Name:               st.Name,
				RollNo:             st.RollNo,
				Department:         st.Department,
				TotalScore:         math.Round(agg.totalScore*10) / 10,
				InterviewsAttended: attendanceMap[st.ID],
				ScorePercentage:    pct,
				Grade:              grade,
			})
		}
	}

	// Sort performers descending by TotalScore
	for i := 0; i < len(performers)-1; i++ {
		for j := i + 1; j < len(performers); j++ {
			if performers[i].TotalScore < performers[j].TotalScore {
				performers[i], performers[j] = performers[j], performers[i]
			}
		}
	}

	var topPerformers []TopPerformer
	if len(performers) > 5 {
		topPerformers = performers[:5]
	} else {
		topPerformers = performers
	}

	// Final Response
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"kpis": gin.H{
				"total_students":            totalStudents,
				"total_admins":              totalAdmins,
				"total_interviews":          totalSessions,
				"completed_interviews":      completedSessions,
				"in_progress_interviews":    inProgressSessions,
				"cancelled_interviews":      cancelledSessions,
				"completion_rate":           math.Round(completionRate*10) / 10,
				"total_practice_hours":      totalPracticeHours,
				"total_tracks":              totalTracks,
				"total_levels":              totalLevels,
				"total_questions":           totalQuestions,
				"total_feedbacks_submitted": totalFeedbacks,
				"platform_avg_score":        platformAvgScore,
				"platform_grade":            platformGrade,
			},
			"daily_activity":     dailyList,
			"track_distribution": trackStats,
			"rubric_breakdown":   rubricStats,
			"grade_distribution": gradeDistribution,
			"recent_sessions":    recentSessions,
			"top_performers":     topPerformers,
		},
	})
}
