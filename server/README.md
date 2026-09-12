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

---

## 🎙️ Audio Recording Storage Flow (Where / When / How)

### 1) From where is audio captured?
- Audio is captured in the frontend WebRTC hook at `/home/runner/work/Mock-Mate/Mock-Mate/client/src/utils/useWebRTCAudio.js`.
- It creates a mixed stream (local mic + remote peer audio) using Web Audio API (`createMediaStreamDestination`) and records it with `MediaRecorder`.

### 2) When is audio uploaded/stored?
- Upload happens when `stopAndUploadRecording()` is triggered in `/home/runner/work/Mock-Mate/Mock-Mate/client/src/Pages/InterviewRoom.jsx`.
- It is called:
  - automatically when session status becomes `completed`,
  - and during explicit interview end flows (end now / accept end / request-end immediate completion).

### 3) How is audio stored?
- Frontend sends `multipart/form-data` to:
  - `POST /api/v1/interviews/sessions/:id/recording`
  - with fields: `file` (audio blob, usually WebM) and `duration_seconds`.
- Backend handler `/home/runner/work/Mock-Mate/Mock-Mate/server/controllers/recording_controller.go`:
  - validates the user is part of the interview session,
  - stores the file on disk as `session_<sessionId>_<timestamp>.<ext>`,
  - saves metadata in MySQL table mapped by `InterviewRecording` model (`file_path`, `file_name`, `file_size`, `mime_type`, `duration_seconds`, `uploader_id`).

### 4) Exact disk location used by backend
- If `UPLOADS_DIR` env var is set: uses that directory.
- Otherwise:
  - if process sees a `server` directory in current working dir: `server/uploads/recordings`
  - else fallback: `uploads/recordings`
