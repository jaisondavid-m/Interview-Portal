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

	// Root / Health check route
	router.GET("/", controllers.HealthCheck)
	router.GET("/health", controllers.HealthCheck)

	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// Users endpoint group
		users := v1.Group("/users")
		{
			users.GET("", controllers.GetUsers)
			users.GET("/:id", controllers.GetUserByID)
			users.POST("", controllers.CreateUser)
			users.PUT("/:id", controllers.UpdateUser)
			users.DELETE("/:id", controllers.DeleteUser)
		}
	}

	return router
}
