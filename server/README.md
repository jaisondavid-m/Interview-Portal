# MockMate Backend Server (Go + Gin + GORM + MySQL)

A structured backend server for **MockMate** — a Student-to-Student Live Audio Mock Interview Platform built with [Gin Web Framework](https://github.com/gin-gonic/gin), [GORM](https://gorm.io/), and [MySQL](https://github.com/go-sql-driver/mysql).

---

## 📁 Project Structure

```
server/
├── cmd/
│   └── api/
│       └── main.go          # Application entry point
├── config/
│   └── config.go           # Environment variables & configuration loader
├── controllers/
│   ├── health_controller.go# Server & database health checks
│   └── user_controller.go  # User management and peer profiles
├── database/
│   └── db.go               # MySQL GORM connection, pool setup & migrations
├── middlewares/
│   └── cors.go             # CORS middleware
├── models/
│   └── user.go             # GORM database models
├── routes/
│   └── routes.go           # Router initialization & route group registration
├── .env                    # Environment variables (DB credentials, port)
├── .env.example            # Environment variables example template
├── go.mod                  # Go module definitions
├── go.sum                  # Go package checksums
├── main.go                 # Root runner entry point
└── README.md               # Project documentation
```

---

## ⚙️ Configuration (`.env`)

```env
# Server Configuration
PORT=8080
GIN_MODE=debug

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=jaison
DB_NAME=mock_mate
DB_CHARSET=utf8mb4
DB_PARSE_TIME=True
DB_LOC=Local
```

---

## 🚀 Getting Started

From the `server` directory:

```bash
# Run server directly
go run main.go
# or with air for hot reload
air
```
