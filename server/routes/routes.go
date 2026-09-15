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
	router.Use(gin.Recovery())

	// Public Health Check
	router.GET("/", controllers.HealthCheck)
	router.GET("/health", controllers.HealthCheck)

	// Helper function to register auth & admin routes on any router group
	registerRoutes := func(g *gin.RouterGroup) {
		// Auth Routes
		auth := g.Group("/auth")
		{
			auth.POST("/login", controllers.Login)
			auth.POST("/logout", controllers.Logout)
			auth.GET("/me", middlewares.AuthMiddleware(), controllers.GetMe)
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
			interviews.POST("/sessions/:id/code", controllers.UpdateSessionCode)
			interviews.POST("/sessions/:id/whiteboard", controllers.UpdateSessionWhiteboard)
			interviews.POST("/sessions/:id/run", controllers.RunSessionCode)
			interviews.POST("/sessions/:id/submit", controllers.SubmitSessionCode)

			// Database Sandbox Playground Endpoints
			interviews.POST("/sessions/:id/database/provision", controllers.ProvisionSandboxDatabase)
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

		// Admin Protected Routes (Require JWT Cookie/Token + Admin Role)
		admin := g.Group("/admin")
		admin.Use(middlewares.AuthMiddleware(), middlewares.RequireAdmin())
		{
			// Admin-Only Audio Recording Streaming Route (Supports HTTP byte-range for players)
			admin.GET("/recordings/:filename", controllers.StreamInterviewRecording)

			// User Management
			admin.GET("/users", controllers.AdminGetUsers)
			admin.GET("/users/export", controllers.AdminExportUsersCSV)
			admin.GET("/users/:id", controllers.AdminGetUserByID)
			admin.POST("/users", controllers.AdminCreateUser)
			admin.POST("/users/bulk", controllers.AdminBulkCreateUsers)
			admin.POST("/users/bulk-delete", controllers.AdminBulkDeleteUsers)
			admin.PUT("/users/:id", controllers.AdminUpdateUser)
			admin.DELETE("/users/:id", controllers.AdminDeleteUser)

			// Interview Configuration: Tracks
			admin.GET("/interviews/tracks", controllers.AdminGetTracks)
			admin.GET("/interviews/tracks/:id", controllers.AdminGetTrackByID)
			admin.POST("/interviews/tracks", controllers.AdminCreateTrack)
			admin.PUT("/interviews/tracks/:id", controllers.AdminUpdateTrack)
			admin.DELETE("/interviews/tracks/:id", controllers.AdminDeleteTrack)

			// Interview Configuration: Levels
			admin.GET("/interviews/tracks/:id/levels", controllers.AdminGetLevels)
			admin.POST("/interviews/tracks/:id/levels", controllers.AdminCreateLevel)
			admin.GET("/interviews/levels/:id", controllers.AdminGetLevelByID)
			admin.PUT("/interviews/levels/:id", controllers.AdminUpdateLevel)
			admin.DELETE("/interviews/levels/:id", controllers.AdminDeleteLevel)

			// Interview Configuration: Questions
			admin.GET("/interviews/levels/:id/questions", controllers.AdminGetQuestions)
			admin.GET("/interviews/levels/:id/questions/export", controllers.AdminExportQuestions)
			admin.POST("/interviews/levels/:id/questions", controllers.AdminCreateQuestion)
			admin.POST("/interviews/levels/:id/questions/bulk", controllers.AdminBulkCreateQuestions)
			admin.POST("/interviews/questions/bulk-delete", controllers.AdminBulkDeleteQuestions)
			admin.GET("/interviews/questions/:id", controllers.AdminGetQuestionByID)
			admin.PUT("/interviews/questions/:id", controllers.AdminUpdateQuestion)
			admin.DELETE("/interviews/questions/:id", controllers.AdminDeleteQuestion)

			// Peer Feedback Configuration & Submissions
			admin.GET("/feedback/questions", controllers.AdminGetFeedbackQuestions)
			admin.POST("/feedback/questions", controllers.AdminCreateFeedbackQuestion)
			admin.PUT("/feedback/questions/:id", controllers.AdminUpdateFeedbackQuestion)
			admin.DELETE("/feedback/questions/:id", controllers.AdminDeleteFeedbackQuestion)
			admin.GET("/feedback/submissions", controllers.AdminGetFeedbackSubmissions)
			admin.GET("/feedback/leaderboard", controllers.AdminGetFeedbackLeaderboard)

			// Security Incident & Credential Solicitation Audits
			admin.GET("/security-reports", controllers.AdminGetSecurityReports)
			admin.PUT("/security-reports/:id", controllers.AdminUpdateSecurityReportStatus)

			// Interview History & Meeting Details
			admin.GET("/interviews/sessions", controllers.AdminGetInterviewSessions)
			admin.GET("/interviews/sessions/:id", controllers.AdminGetInterviewSessionByID)
			admin.GET("/interviews/sessions/:id/recording", controllers.GetSessionRecording)
			admin.GET("/interviews/sessions/:id/recording/stream", controllers.StreamInterviewRecording)
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
