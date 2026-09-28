package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSetupRouter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Verify SetupRouter() initializes without duplicate route registration panics
	router := SetupRouter()
	if router == nil {
		t.Fatal("expected SetupRouter to return a non-nil gin.Engine instance")
	}

	testCases := []struct {
		name string
		path string
	}{
		{"Root Health", "/health"},
		{"Root Version", "/version"},
		{"API v1 Health", "/api/v1/health"},
		{"API v1 Version", "/api/v1/version"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, _ := http.NewRequest(http.MethodGet, tc.path, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Response status may be 200 or 503 depending on DB connection state,
			// but router MUST successfully match and execute handler without panicking
			if w.Code == http.StatusNotFound {
				t.Errorf("path %s was not found (HTTP 404)", tc.path)
			}
		})
	}
}
