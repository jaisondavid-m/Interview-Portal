package routes

import (
	"server/controllers"
	"server/middlewares"

	"github.com/gin-gonic/gin"
)

// SetupRouter initializes Gin engine with middlewares and routes
func SetupRouter() *gin.Engine {
	router := gin.Default()

	// Apply Middlewares
	router.Use(middlewares.CORSMiddleware())
	router.Use(middlewares.AuditLoggerMiddleware())
	router.Use(gin.Recovery())

	// Public Health Check
	router.GET("/", controllers.HealthCheck)
	router.GET("/health", controllers.HealthCheck)

	// Helper function to register auth, student, developer & admin routes on any router group
	registerRoutes := func(g *gin.RouterGroup) {
		// Auth Routes
		auth := g.Group("/auth")
		{
			auth.POST("/login", controllers.Login)
			auth.POST("/google", controllers.GoogleLogin)
			auth.POST("/logout", controllers.Logout)
			auth.GET("/me", middlewares.AuthMiddleware(), controllers.GetMe)
			auth.GET("/permissions", middlewares.AuthMiddleware(), controllers.GetUserPagePermissions)
			auth.GET("/settings", controllers.GetPublicSystemSettings)
			auth.GET("/quick-login-status", controllers.GetPublicQuickLoginStatus)
		}

		// Developer & System Audit Logs (Require JWT + audit_logs permission or Admin)
		developer := g.Group("/developer")
		developer.Use(middlewares.AuthMiddleware(), middlewares.RequirePermission("audit_logs", "system_settings"))
		{
			developer.GET("/audit-logs", controllers.GetAuditLogs)
			developer.GET("/audit-logs/stats", controllers.GetAuditStats)
			developer.GET("/audit-logs/:id", controllers.GetAuditLogByID)
			developer.DELETE("/audit-logs/clear", controllers.ClearAuditLogs)
			developer.GET("/settings", controllers.AdminGetSystemSettings)
			developer.POST("/settings", controllers.AdminUpdateSystemSetting)
			developer.PUT("/settings", controllers.AdminUpdateSystemSetting)
		}

		// Student Protected Routes (Require JWT)
		interviews := g.Group("/interviews")
		interviews.Use(middlewares.AuthMiddleware())
		{
			// Tracks & Domains listing for students
			interviews.GET("/tracks", controllers.GetStudentTracks)

			// Matchmaking
			interviews.POST("/matchmake", controllers.JoinMatchmaking)
			interviews.GET("/matchmake/status", controllers.GetMatchmakingStatus)
			interviews.POST("/matchmake/cancel", controllers.CancelMatchmaking)

			// Live Session
			interviews.GET("/sessions/:id", controllers.GetInterviewSession)
			interviews.POST("/sessions/:id/question", controllers.SwitchSessionQuestion)
			interviews.POST("/sessions/:id/code", controllers.UpdateSessionCode)
			interviews.POST("/sessions/:id/whiteboard", controllers.UpdateSessionWhiteboard)
			interviews.POST("/sessions/:id/rubrics", controllers.UpdateSessionRubrics)
			interviews.POST("/sessions/:id/run", controllers.RunSessionCode)
			interviews.POST("/sessions/:id/submit", controllers.SubmitSessionCode)

			// Database Sandbox Playground Endpoints
			interviews.GET("/sessions/:id/database/credentials", controllers.GetSandboxCredentials)
			interviews.POST("/sessions/:id/database/provision", controllers.ProvisionSandboxDatabase)
			interviews.POST("/sessions/:id/database/reset", controllers.ResetSandboxDatabase)
			interviews.POST("/sessions/:id/database/execute", controllers.ExecuteSandboxQuery)
			interviews.GET("/sessions/:id/database/schema", controllers.GetSandboxSchema)
			interviews.POST("/sessions/:id/database/teardown", controllers.TeardownSandboxDatabase)
			interviews.POST("/sessions/:id/switch-roles", controllers.SwitchSessionRoles)
			interviews.POST("/sessions/:id/request-switch", controllers.RequestSessionRoleSwitch)
			interviews.POST("/sessions/:id/accept-switch", controllers.AcceptSessionRoleSwitch)
			interviews.POST("/sessions/:id/decline-switch", controllers.DeclineSessionRoleSwitch)
			interviews.POST("/sessions/:id/cancel-switch", controllers.DeclineSessionRoleSwitch)
			interviews.POST("/sessions/:id/end", controllers.EndInterviewSession)
			interviews.POST("/sessions/:id/request-end", controllers.RequestSessionEndInterview)
			interviews.POST("/sessions/:id/accept-end", controllers.AcceptSessionEndInterview)
			interviews.POST("/sessions/:id/decline-end", controllers.DeclineSessionEndInterview)
			interviews.POST("/sessions/:id/cancel-end", controllers.DeclineSessionEndInterview)

			// Student Dashboard Stats & Attended Interview History
			interviews.GET("/dashboard/stats", controllers.GetStudentDashboardStats)
			interviews.GET("/history", controllers.GetStudentInterviewHistory)

			// Peer Feedback
			interviews.GET("/feedback/questions", controllers.GetActiveFeedbackQuestions)
			interviews.GET("/feedback/history", controllers.GetStudentFeedbackHistory)
			interviews.GET("/sessions/:id/feedback", controllers.GetSessionFeedbackStatus)
			interviews.POST("/sessions/:id/feedback", controllers.SubmitSessionFeedback)

			// Credential Solicitation Security Audit
			interviews.GET("/sessions/:id/security-report", controllers.GetSessionSecurityReportStatus)
			interviews.POST("/sessions/:id/security-report", controllers.SubmitSecurityReport)

			// WebRTC Live Audio Signaling & Chunk Streaming Recordings
			interviews.GET("/sessions/:id/ws", controllers.HandleWebRTCSignaling)
			interviews.POST("/sessions/:id/recording/chunk", controllers.UploadRecordingChunk)
			interviews.POST("/sessions/:id/recording/finalize", controllers.FinalizeInterviewRecording)
			interviews.POST("/sessions/:id/recording", controllers.UploadInterviewRecording)
			interviews.GET("/sessions/:id/recording", controllers.GetSessionRecording)
			interviews.GET("/sessions/:id/recording/stream", controllers.StreamInterviewRecording)
			interviews.GET("/recordings/:filename", controllers.StreamInterviewRecording)
		}

		// Direct authenticated recording route
		g.GET("/recordings/:filename", middlewares.AuthMiddleware(), controllers.StreamInterviewRecording)

		// Admin & Dynamic Portal Protected Routes (Require JWT Cookie/Token + Resource Specific Permission)
		admin := g.Group("/admin")
		admin.Use(middlewares.AuthMiddleware())
		{
			// Dashboard & Platform Analytics
			admin.GET("/analytics/dashboard", middlewares.RequirePermission("admin_dashboard"), controllers.AdminGetDashboardAnalytics)

			// Admin-Only Audio Recording Streaming Route (Supports HTTP byte-range for players)
			admin.GET("/recordings/:filename", middlewares.RequirePermission("admin_history", "student_history"), controllers.StreamInterviewRecording)

			// Audit Logs Unified Route
			admin.GET("/audit-logs", middlewares.RequirePermission("audit_logs"), controllers.GetAuditLogs)
			admin.GET("/audit-logs/stats", middlewares.RequirePermission("audit_logs"), controllers.GetAuditStats)
			admin.GET("/audit-logs/:id", middlewares.RequirePermission("audit_logs"), controllers.GetAuditLogByID)
			admin.DELETE("/audit-logs/clear", middlewares.RequirePermission("audit_logs"), controllers.ClearAuditLogs)

			// User Management
			adminUsers := admin.Group("/users")
			adminUsers.Use(middlewares.RequirePermission("admin_users"))
			{
				adminUsers.GET("", controllers.AdminGetUsers)
				adminUsers.GET("/departments", controllers.GetDistinctStudentDepartments)
				adminUsers.GET("/export", controllers.AdminExportUsersCSV)
				adminUsers.GET("/:id", controllers.AdminGetUserByID)
				adminUsers.POST("", controllers.AdminCreateUser)
				adminUsers.POST("/bulk", controllers.AdminBulkCreateUsers)
				adminUsers.POST("/bulk-update", controllers.AdminBulkUpdateUsers)
				adminUsers.POST("/bulk-delete", controllers.AdminBulkDeleteUsers)
				adminUsers.POST("/bulk-force-logout", controllers.AdminBulkForceLogoutUsers)
				adminUsers.POST("/:id/force-logout", controllers.AdminForceLogoutUser)
				adminUsers.PUT("/:id", controllers.AdminUpdateUser)
				adminUsers.DELETE("/:id", controllers.AdminDeleteUser)
			}

			admin.GET("/departments", controllers.GetDistinctStudentDepartments)

			// Role & Page Access Management (Strictly Superadmin Only)
			adminRoles := admin.Group("/roles")
			adminRoles.Use(middlewares.RequireAdmin())
			{
				adminRoles.GET("", controllers.AdminGetRoles)
				adminRoles.POST("", controllers.AdminCreateRole)
				adminRoles.PUT("/:id", controllers.AdminUpdateRole)
				adminRoles.DELETE("/:id", controllers.AdminDeleteRole)
				adminRoles.GET("/pages", controllers.AdminGetAppPages)
				adminRoles.POST("/pages", controllers.AdminCreateAppPage)
				adminRoles.PUT("/pages/:id", controllers.AdminUpdateAppPage)
				adminRoles.DELETE("/pages/:id", controllers.AdminDeleteAppPage)
				adminRoles.GET("/mappings", controllers.AdminGetRoleMappings)
				adminRoles.POST("/mappings", controllers.AdminUpdateRolePermissions)
			}

			// Interview Configuration: Tracks, Levels, Questions
			adminInterviews := admin.Group("/interviews")
			adminInterviews.Use(middlewares.RequirePermission("admin_interviews", "admin_history"))
			{
				// Tracks
				adminInterviews.GET("/tracks", controllers.AdminGetTracks)
				adminInterviews.GET("/tracks/:id", controllers.AdminGetTrackByID)
				adminInterviews.POST("/tracks", controllers.AdminCreateTrack)
				adminInterviews.PUT("/tracks/:id", controllers.AdminUpdateTrack)
				adminInterviews.PATCH("/tracks/:id/toggle-active", controllers.AdminToggleTrackActive)
				adminInterviews.DELETE("/tracks/:id", controllers.AdminDeleteTrack)

				// Levels
				adminInterviews.GET("/tracks/:id/levels", controllers.AdminGetLevels)
				adminInterviews.POST("/tracks/:id/levels", controllers.AdminCreateLevel)
				adminInterviews.GET("/levels/:id", controllers.AdminGetLevelByID)
				adminInterviews.PUT("/levels/:id", controllers.AdminUpdateLevel)
				adminInterviews.PATCH("/levels/:id/toggle-active", controllers.AdminToggleLevelActive)
				adminInterviews.DELETE("/levels/:id", controllers.AdminDeleteLevel)

				// Questions
				adminInterviews.GET("/levels/:id/questions", controllers.AdminGetQuestions)
				adminInterviews.GET("/levels/:id/questions/export", controllers.AdminExportQuestions)
				adminInterviews.POST("/levels/:id/questions", controllers.AdminCreateQuestion)
				adminInterviews.POST("/levels/:id/questions/bulk", controllers.AdminBulkCreateQuestions)
				adminInterviews.POST("/questions/bulk-delete", controllers.AdminBulkDeleteQuestions)
				adminInterviews.GET("/questions/:id", controllers.AdminGetQuestionByID)
				adminInterviews.PUT("/questions/:id", controllers.AdminUpdateQuestion)
				adminInterviews.PATCH("/questions/:id/toggle-active", controllers.AdminToggleQuestionActive)
				adminInterviews.DELETE("/questions/:id", controllers.AdminDeleteQuestion)

				// History & Sessions
				adminInterviews.GET("/sessions", controllers.AdminGetInterviewSessions)
				adminInterviews.GET("/sessions/:id", controllers.AdminGetInterviewSessionByID)
				adminInterviews.GET("/sessions/:id/recording", controllers.GetSessionRecording)
				adminInterviews.GET("/sessions/:id/recording/stream", controllers.StreamInterviewRecording)
			}

			// Peer Feedback Configuration & Submissions
			adminFeedback := admin.Group("/feedback")
			adminFeedback.Use(middlewares.RequirePermission("admin_feedback"))
			{
				adminFeedback.GET("/questions", controllers.AdminGetFeedbackQuestions)
				adminFeedback.POST("/questions", controllers.AdminCreateFeedbackQuestion)
				adminFeedback.PUT("/questions/:id", controllers.AdminUpdateFeedbackQuestion)
				adminFeedback.DELETE("/questions/:id", controllers.AdminDeleteFeedbackQuestion)
				adminFeedback.GET("/submissions", controllers.AdminGetFeedbackSubmissions)
				adminFeedback.GET("/leaderboard", controllers.AdminGetFeedbackLeaderboard)
			}

			// Leaderboard Dedicated Route
			admin.GET("/leaderboard", middlewares.RequirePermission("admin_leaderboard"), controllers.AdminGetFeedbackLeaderboard)

			// Security Incident & Credential Solicitation Audits
			adminSecurity := admin.Group("/security-reports")
			adminSecurity.Use(middlewares.RequirePermission("admin_dashboard", "admin_history"))
			{
				adminSecurity.GET("", controllers.AdminGetSecurityReports)
				adminSecurity.PUT("/:id", controllers.AdminUpdateSecurityReportStatus)
			}

			// Database Backup & SQL Dump Management
			adminBackup := admin.Group("/backup")
			adminBackup.Use(middlewares.RequirePermission("admin_backup", "audit_logs"))
			{
				adminBackup.GET("/stats", controllers.AdminGetDatabaseStats)
				adminBackup.GET("/dump", controllers.AdminExportDatabaseDump)
			}

			// Venues & Slot Scheduling Management
			adminVenues := admin.Group("/venues")
			adminVenues.Use(middlewares.RequirePermission("admin_venues"))
			{
				adminVenues.GET("", controllers.AdminGetVenues)
				adminVenues.POST("", controllers.AdminCreateVenue)
				adminVenues.GET("/faculty-list", controllers.AdminGetFacultyList)
				adminVenues.PUT("/:id", controllers.AdminUpdateVenue)
				adminVenues.DELETE("/:id", controllers.AdminDeleteVenue)
			}

			adminSlots := admin.Group("/slots")
			adminSlots.Use(middlewares.RequirePermission("admin_venues"))
			{
				adminSlots.GET("", controllers.AdminGetSlots)
				adminSlots.POST("", controllers.AdminCreateSlot)
				adminSlots.GET("/:id", controllers.AdminGetSlotDetail)
				adminSlots.GET("/:id/roster", controllers.AdminGetSlotRoster)
				adminSlots.PUT("/:id", controllers.AdminUpdateSlot)
				adminSlots.DELETE("/:id", controllers.AdminDeleteSlot)
				adminSlots.POST("/:id/publish-allocations", controllers.AdminPublishSlotAllocations)
				adminSlots.POST("/:id/reassign-venue", controllers.AdminReassignStudentVenue)
				adminSlots.POST("/:id/auto-balance", controllers.AdminAutoBalanceSlotVenues)
				adminSlots.POST("/bookings/:id/cancel", controllers.AdminCancelBooking)
				adminSlots.DELETE("/bookings/:id", controllers.AdminCancelBooking)
			}

			// System Settings
			adminSettings := admin.Group("/settings")
			adminSettings.Use(middlewares.RequirePermission("system_settings", "admin_dashboard", "audit_logs"))
			{
				adminSettings.GET("", controllers.AdminGetSystemSettings)
				adminSettings.POST("", controllers.AdminUpdateSystemSetting)
				adminSettings.PUT("", controllers.AdminUpdateSystemSetting)
			}

			// Interview History Dedicated Route
			admin.GET("/history", middlewares.RequirePermission("admin_history"), controllers.AdminGetInterviewSessions)
		}

		// Direct System Settings (Admin & Developer)
		systemSettings := g.Group("/system/settings")
		systemSettings.Use(middlewares.AuthMiddleware(), middlewares.RequirePermission("system_settings", "admin_dashboard", "audit_logs"))
		{
			systemSettings.GET("", controllers.AdminGetSystemSettings)
			systemSettings.POST("", controllers.AdminUpdateSystemSetting)
			systemSettings.PUT("", controllers.AdminUpdateSystemSetting)
		}

		// Faculty Portal & Live In-Venue Attendance (Require JWT + Faculty/Admin Permissions)
		faculty := g.Group("/faculty")
		faculty.Use(middlewares.AuthMiddleware(), middlewares.RequirePermission("faculty_dashboard", "faculty_attendance"))
		{
			faculty.GET("/dashboard/stats", controllers.GetFacultyDashboardStats)
			faculty.GET("/slots", controllers.GetFacultyAssignedSlots)
			faculty.GET("/slots/:id/roster", controllers.GetFacultySlotRoster)
			faculty.POST("/slots/:id/attendance/:bookingId", controllers.UpdateStudentAttendance)
			faculty.POST("/slots/:id/attendance/bulk", controllers.BulkUpdateAttendance)
			faculty.GET("/interviews/sessions", controllers.GetFacultyInterviewSessions)
			faculty.GET("/interviews/sessions/:id", controllers.GetFacultyInterviewSessionDetail)
			faculty.GET("/interviews/sessions/:id/recording", controllers.GetSessionRecording)
			faculty.GET("/interviews/sessions/:id/recording/stream", controllers.StreamInterviewRecording)
			faculty.GET("/recordings/:filename", controllers.StreamInterviewRecording)
		}

		// Student Slot Booking & Active In-Venue Check-in
		slots := g.Group("/slots")
		slots.Use(middlewares.AuthMiddleware())
		{
			slots.GET("/available", controllers.GetAvailableSlots)
			slots.POST("/book", controllers.BookSlot)
			slots.GET("/my-bookings", controllers.GetMyBookings)
			slots.POST("/bookings/:id/cancel", controllers.CancelBooking)
			slots.GET("/active-checkin", controllers.GetActiveSlotCheckInStatus)
		}
	}

	// 1. Primary API v1 group -> /api/v1/...
	v1 := router.Group("/api/v1")
	registerRoutes(v1)

	// 2. Fallback API group -> /api/...
	apiGroup := router.Group("/api")
	registerRoutes(apiGroup)

	// 3. Fallback root group -> /auth/..., /admin/...
	rootGroup := router.Group("")
	registerRoutes(rootGroup)

	return router
}
