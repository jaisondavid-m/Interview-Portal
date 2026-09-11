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

		// Admin Protected Routes (Require JWT Cookie/Token + Admin Role)
		admin := g.Group("/admin")
		admin.Use(middlewares.AuthMiddleware(), middlewares.RequireAdmin())
		{
			admin.GET("/users", controllers.AdminGetUsers)
			admin.GET("/users/:id", controllers.AdminGetUserByID)
			admin.POST("/users", controllers.AdminCreateUser)
			admin.PUT("/users/:id", controllers.AdminUpdateUser)
			admin.DELETE("/users/:id", controllers.AdminDeleteUser)
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
