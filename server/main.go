package main

import (
	"fmt"
	"log"

	"server/config"
	"server/database"
	"server/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load configuration from environment / .env
	cfg := config.LoadConfig()

	// 2. Set Gin mode
	gin.SetMode(cfg.GinMode)

	// 3. Connect to MySQL Database
	_, err := database.ConnectDB(cfg)
	if err != nil {
		log.Printf("[WARN] Database connection failed: %v\n", err)
		log.Println("[WARN] Server will start, but database-dependent endpoints may fail. Please ensure MySQL is running.")
	}

	// 4. Setup routes
	router := routes.SetupRouter()

	// 5. Start HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[INFO] Server is starting on http://localhost:%s\n", cfg.Port)

	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("[FATAL] Failed to start server: %v\n", err)
	}
}
