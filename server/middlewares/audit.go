package middlewares

import (
	"bytes"
	"fmt"
	"io"
	"regexp"
	"strings"
	"time"

	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
)

// bodyLogWriter is a custom response writer that intercepts response bytes for logging
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w bodyLogWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

var (
	sensitiveRegex = regexp.MustCompile(`(?i)"(password|token|secret|jwt|credential|auth_token)"\s*:\s*"[^"]*"`)
	maxBodyLength  = 32768 // 32 KB threshold for stored payloads
)

// maskSensitiveData masks passwords and secret tokens in JSON strings
func maskSensitiveData(payload string) string {
	if payload == "" {
		return ""
	}
	return sensitiveRegex.ReplaceAllString(payload, `"$1": "[PROTECTED]"`)
}

// AuditLoggerMiddleware intercepts every HTTP request, calculates latency, and records the full audit log
func AuditLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Ignore static assets or health checks if needed
		path := c.Request.URL.Path
		if path == "/health" || path == "/favicon.ico" {
			c.Next()
			return
		}

		startTime := time.Now()

		// 1. Read and buffer the request body
		var requestBodyStr string
		contentType := c.GetHeader("Content-Type")

		if strings.HasPrefix(contentType, "multipart/form-data") {
			requestBodyStr = fmt.Sprintf("[Multipart Form Data - Content-Length: %d bytes]", c.Request.ContentLength)
		} else if strings.HasPrefix(contentType, "application/octet-stream") || strings.Contains(path, "/recording/chunk") {
			requestBodyStr = fmt.Sprintf("[Binary Audio/Stream Payload - %d bytes]", c.Request.ContentLength)
		} else if c.Request.Body != nil {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err == nil {
				// Reassign body so downstream handlers can still read it
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

				if len(bodyBytes) > 0 {
					if len(bodyBytes) > maxBodyLength {
						requestBodyStr = string(bodyBytes[:maxBodyLength]) + "... [TRUNCATED]"
					} else {
						requestBodyStr = string(bodyBytes)
					}
					requestBodyStr = maskSensitiveData(requestBodyStr)
				}
			}
		}

		// 2. Wrap ResponseWriter to capture the response body
		blw := &bodyLogWriter{
			body:           bytes.NewBufferString(""),
			ResponseWriter: c.Writer,
		}
		c.Writer = blw

		// 3. Process the request downstream
		c.Next()

		// 4. Capture response details
		latency := time.Since(startTime).Milliseconds()
		statusCode := c.Writer.Status()

		var responseBodyStr string
		respContentType := c.Writer.Header().Get("Content-Type")

		if strings.HasPrefix(respContentType, "audio/") || strings.Contains(path, "/recording/stream") {
			responseBodyStr = fmt.Sprintf("[Audio Stream Response - HTTP %d]", statusCode)
		} else if blw.body.Len() > 0 {
			rawResp := blw.body.String()
			if len(rawResp) > maxBodyLength {
				responseBodyStr = rawResp[:maxBodyLength] + "... [TRUNCATED]"
			} else {
				responseBodyStr = rawResp
			}
			responseBodyStr = maskSensitiveData(responseBodyStr)
		}

		// 5. Resolve user context if populated by AuthMiddleware
		var userIDPtr *uint
		var userEmail string
		var userName string
		var userRole string

		if rawUID, exists := c.Get("userID"); exists {
			if uid, ok := rawUID.(uint); ok && uid > 0 {
				userIDPtr = &uid
			}
		}
		if rawEmail, exists := c.Get("userEmail"); exists {
			userEmail = fmt.Sprintf("%v", rawEmail)
		}
		if rawName, exists := c.Get("userName"); exists {
			userName = fmt.Sprintf("%v", rawName)
		}
		if rawRole, exists := c.Get("userRole"); exists {
			userRole = fmt.Sprintf("%v", rawRole)
		}

		// Check errors attached to context
		var errMessage string
		if len(c.Errors) > 0 {
			errMessage = c.Errors.String()
		}

		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()
		if len(userAgent) > 250 {
			userAgent = userAgent[:250] + "..."
		}

		rawQuery := c.Request.URL.RawQuery

		// 6. Asynchronously save audit log record to MySQL
		auditEntry := models.AuditLog{
			UserID:       userIDPtr,
			UserEmail:    userEmail,
			UserName:     userName,
			UserRole:     userRole,
			Method:       c.Request.Method,
			Path:         path,
			Query:        rawQuery,
			IPAddress:    clientIP,
			UserAgent:    userAgent,
			StatusCode:   statusCode,
			LatencyMs:    latency,
			RequestBody:  requestBodyStr,
			ResponseBody: responseBodyStr,
			ErrorMessage: errMessage,
			CreatedAt:    startTime,
		}

		go func(entry models.AuditLog) {
			if database.DB != nil {
				_ = database.DB.Create(&entry)
			}
		}(auditEntry)
	}
}
