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
			interviews.POST("/sessions/:id/switch-roles", controllers.SwitchSessionRoles)
			interviews.POST("/sessions/:id/end", controllers.EndInterviewSession)
		}

		// Admin Protected Routes (Require JWT Cookie/Token + Admin Role)
		admin := g.Group("/admin")
		admin.Use(middlewares.AuthMiddleware(), middlewares.RequireAdmin())
		{
			// User Management
			admin.GET("/users", controllers.AdminGetUsers)
			admin.GET("/users/:id", controllers.AdminGetUserByID)
			admin.POST("/users", controllers.AdminCreateUser)
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
			admin.POST("/interviews/levels/:id/questions", controllers.AdminCreateQuestion)
			admin.GET("/interviews/questions/:id", controllers.AdminGetQuestionByID)
			admin.PUT("/interviews/questions/:id", controllers.AdminUpdateQuestion)
			admin.DELETE("/interviews/questions/:id", controllers.AdminDeleteQuestion)

			// Interview History & Meeting Details
			admin.GET("/interviews/sessions", controllers.AdminGetInterviewSessions)
			admin.GET("/interviews/sessions/:id", controllers.AdminGetInterviewSessionByID)
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
