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

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MySQL database: %w", err)
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

	// Seed default Admin user
	seedAdminUser(db)

	DB = db
	return db, nil
}

// runMigrations automatically migrates defined schemas
func runMigrations(db *gorm.DB) error {
	log.Println("[INFO] Running database migrations...")
	return db.AutoMigrate(
		&models.User{},
	)
}

// seedAdminUser checks if default admin exists; if not, seeds admin@bitsathy.ac.in
func seedAdminUser(db *gorm.DB) {
	adminEmail := "admin@bitsathy.ac.in"
	var existingAdmin models.User
	err := db.Where("email = ?", adminEmail).First(&existingAdmin).Error

	hashedPassword, errHash := models.HashPassword("password")
	if errHash != nil {
		log.Printf("[ERROR] Failed to hash admin password: %v\n", errHash)
		return
	}

	if err != nil {
		// Admin does not exist, create
		admin := models.User{
			Name:       "System Administrator",
			Email:      adminEmail,
			RollNo:     "ADMIN01",
			Department: "Administration",
			Password:   hashedPassword,
			Role:       "admin",
		}
		if createErr := db.Create(&admin).Error; createErr != nil {
			log.Printf("[ERROR] Failed to seed default admin: %v\n", createErr)
		} else {
			log.Println("[INFO] Successfully seeded default admin user: admin@bitsathy.ac.in (Password: 'password')")
		}
	} else {
		// Update password to ensure it matches requirement if needed
		db.Model(&existingAdmin).Updates(map[string]interface{}{
			"role":     "admin",
			"password": hashedPassword,
		})
		log.Println("[INFO] Verified default admin user: admin@bitsathy.ac.in")
	}
}
