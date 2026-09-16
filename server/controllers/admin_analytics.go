package controllers

import (
	"math"
	"net/http"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// AdminGetDashboardAnalytics computes comprehensive platform-wide analytics for the Admin Dashboard
func AdminGetDashboardAnalytics(c *gin.Context) {
	selectedDept := strings.TrimSpace(c.Query("department"))
	selectedDomain := strings.TrimSpace(c.Query("domain"))
	if selectedDomain == "" {
		selectedDomain = strings.TrimSpace(c.Query("track_id"))
	}

	// 1. User Metrics
	var totalStudents int64
	var totalAdmins int64
	database.DB.Model(&models.User{}).Where("role = ?", "student").Count(&totalStudents)
	database.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&totalAdmins)

	// Fetch distinct student departments for the filter dropdown
	var departments []string
	database.DB.Model(&models.User{}).
		Where("role = ? AND department IS NOT NULL AND department != ''", "student").
		Distinct("department").
		Order("department asc").
		Pluck("department", &departments)

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

	// 5. Track Breakdown
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
			AvgScorePct:    platformAvgScore,
			SharePct:       sharePct,
		})
	}

	// 6. Overall Rubric Competency & Feedback Question Averages (Supports Dept & Domain filters)
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
		AverageScore    float64 `json:"average_score"`
		ScorePercentage float64 `json:"score_percentage"`
		AvgAwardedMarks float64 `json:"avg_awarded_marks"`
		AvgScorePct     float64 `json:"avg_score_pct"`
	}

	var rubricStats []RubricStat
	var totalFilteredEvals int

	for _, q := range feedbackQuestions {
		query := database.DB.Model(&models.InterviewFeedbackResponse{}).
			Joins("JOIN interview_feedbacks ON interview_feedbacks.id = interview_feedback_responses.feedback_id").
			Joins("JOIN users ON users.id = interview_feedbacks.reviewee_id").
			Joins("JOIN interview_sessions ON interview_sessions.id = interview_feedbacks.session_id").
			Where("interview_feedback_responses.question_id = ?", q.ID)

		if selectedDept != "" && selectedDept != "all" {
			query = query.Where("users.department = ?", selectedDept)
		}
		if selectedDomain != "" && selectedDomain != "all" {
			query = query.Where("interview_sessions.track_id = ?", selectedDomain)
		}

		var responses []models.InterviewFeedbackResponse
		query.Find(&responses)

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
			if len(responses) > totalFilteredEvals {
				totalFilteredEvals = len(responses)
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

		roundedAvg := math.Round(avgAwarded*10) / 10
		roundedPct := math.Round(avgPct*10) / 10

		rubricStats = append(rubricStats, RubricStat{
			QuestionID:      q.ID,
			QuestionText:    q.QuestionText,
			ShortLabel:      label,
			QuestionType:    q.QuestionType,
			MaxMarks:        q.MaxMarks,
			ResponsesCount:  len(responses),
			AverageScore:    roundedAvg,
			ScorePercentage: roundedPct,
			AvgAwardedMarks: roundedAvg,
			AvgScorePct:     roundedPct,
		})
	}

	// 7. Student Grade / Performance Cohorts
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

	// 8. Recent Sessions Feed (Latest 6)
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

	// 9. Top Performers Snapshot (Top 5)
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
			"departments":                departments,
			"tracks":                     tracks,
			"feedback_averages":          rubricStats,
			"rubric_breakdown":           rubricStats,
			"total_filtered_evaluations": totalFilteredEvals,
			"selected_department":        selectedDept,
			"selected_domain":            selectedDomain,
			"track_distribution":         trackStats,
			"grade_distribution":         gradeDistribution,
			"recent_sessions":            recentSessions,
			"top_performers":             topPerformers,
		},
	})
}
