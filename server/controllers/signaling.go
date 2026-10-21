package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"server/config"
	"server/database"
	"server/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all cross-origin for student clients
	},
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

// SignalingMessage defines payload exchanged between WebRTC peers
type SignalingMessage struct {
	Type      string          `json:"type"` // "join", "offer", "answer", "ice-candidate", "mute-status", "peer_joined", "peer_ready", "peer_left", "ping", "pong"
	SenderID  uint            `json:"sender_id,omitempty"`
	TargetID  uint            `json:"target_id,omitempty"`
	Payload   json.RawMessage `json:"payload,omitempty"`
	IsMuted   bool            `json:"is_muted,omitempty"`
	Timestamp int64           `json:"timestamp,omitempty"`
}

// Client represents a connected student in an audio room
type Client struct {
	SessionID string
	UserID    uint
	Conn      *websocket.Conn
	Send      chan []byte
	Hub       *SignalingHub
	Closed    bool
	Mu        sync.Mutex
}

// Room represents an active interview session audio room
type Room struct {
	SessionID string
	Clients   map[uint]*Client
	Mutex     sync.RWMutex
}

// SignalingHub maintains active interview audio rooms
type SignalingHub struct {
	Rooms map[string]*Room
	Mutex sync.RWMutex
}

// GlobalSignalingHub is the singleton signaling router
var GlobalSignalingHub = &SignalingHub{
	Rooms: make(map[string]*Room),
}

// GetOrCreateRoom retrieves or creates a thread-safe room
func (h *SignalingHub) GetOrCreateRoom(sessionID string) *Room {
	h.Mutex.Lock()
	defer h.Mutex.Unlock()

	room, exists := h.Rooms[sessionID]
	if !exists {
		room = &Room{
			SessionID: sessionID,
			Clients:   make(map[uint]*Client),
		}
		h.Rooms[sessionID] = room
	}
	return room
}

// RemoveClient removes a client instance safely without breaking reconnects
func (h *SignalingHub) RemoveClient(sessionID string, client *Client) {
	h.Mutex.Lock()
	defer h.Mutex.Unlock()

	if room, exists := h.Rooms[sessionID]; exists {
		room.Mutex.Lock()
		// Only delete if the registered client in the room is this exact instance
		if currentClient, ok := room.Clients[client.UserID]; ok && currentClient == client {
			client.Mu.Lock()
			if !client.Closed {
				client.Closed = true
				close(client.Send)
			}
			client.Mu.Unlock()
			delete(room.Clients, client.UserID)

			// Broadcast peer_left to remaining clients
			for _, otherClient := range room.Clients {
				msg := SignalingMessage{
					Type:      "peer_left",
					SenderID:  client.UserID,
					Timestamp: time.Now().UnixMilli(),
				}
				data, _ := json.Marshal(msg)
				select {
				case otherClient.Send <- data:
				default:
				}
			}
		}
		isEmpty := len(room.Clients) == 0
		room.Mutex.Unlock()

		if isEmpty {
			delete(h.Rooms, sessionID)
		}
	}
}

// BroadcastToPeer relays a message to the other participant in the room
func (r *Room) BroadcastToPeer(senderID uint, message []byte) {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	for uid, client := range r.Clients {
		if uid != senderID {
			client.Mu.Lock()
			if !client.Closed {
				select {
				case client.Send <- message:
				default:
					log.Printf("[WARN] Signaling message buffer full for user %d in session %s\n", uid, r.SessionID)
				}
			}
			client.Mu.Unlock()
		}
	}
}

// HandleWebRTCSignaling handles the WebSocket handshake and peer signaling loop
func HandleWebRTCSignaling(c *gin.Context) {
	sessionID := c.Param("id")

	// 1. Authenticate user from JWT token
	tokenStr := c.Query("token")
	if tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	if tokenStr == "" {
		if cookie, err := c.Cookie("mockmate_token"); err == nil && cookie != "" {
			tokenStr = cookie
		} else if cookie, err := c.Cookie("token"); err == nil {
			tokenStr = cookie
		}
	}

	var userID uint
	if rawID, exists := c.Get("userID"); exists {
		userID = rawID.(uint)
	} else if tokenStr != "" {
		jwtSecret := "mock_mate_secure_jwt_secret_2026"
		if config.AppConfig != nil && config.AppConfig.JWTSecret != "" {
			jwtSecret = config.AppConfig.JWTSecret
		}
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})
		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if idFloat, ok := claims["user_id"].(float64); ok {
					userID = uint(idFloat)
				}
			}
		}
	}

	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Authentication required for audio connection"})
		return
	}

	// 2. Verify student is a participant in this interview session
	var session models.InterviewSession
	if err := database.DB.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Interview session not found"})
		return
	}

	if session.InterviewerID != userID && session.IntervieweeID != userID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "You are not a participant in this session"})
		return
	}

	// 3. Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[ERROR] WebRTC WebSocket upgrade failed: %v\n", err)
		return
	}

	client := &Client{
		SessionID: sessionID,
		UserID:    userID,
		Conn:      conn,
		Send:      make(chan []byte, 512),
		Hub:       GlobalSignalingHub,
		Closed:    false,
	}

	room := GlobalSignalingHub.GetOrCreateRoom(sessionID)

	room.Mutex.Lock()
	// Clean up any stale client from previous connection for this same user
	if oldClient, ok := room.Clients[userID]; ok && oldClient != client {
		oldClient.Mu.Lock()
		if !oldClient.Closed {
			oldClient.Closed = true
			close(oldClient.Send)
		}
		oldClient.Mu.Unlock()
		oldClient.Conn.Close()
	}
	room.Clients[userID] = client
	peerCount := len(room.Clients)
	room.Mutex.Unlock()

	// 4. Server-Side Heartbeat & Writer Pump
	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer func() {
			ticker.Stop()
			conn.Close()
		}()

		for {
			select {
			case message, ok := <-client.Send:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
					return
				}
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// 5. Notify peers of arrival
	if peerCount > 1 {
		// Broadcast to existing peer that a partner has joined
		joinMsg := SignalingMessage{
			Type:      "peer_joined",
			SenderID:  userID,
			Timestamp: time.Now().UnixMilli(),
		}
		data, _ := json.Marshal(joinMsg)
		room.BroadcastToPeer(userID, data)

		// Notify this client that peer is ready
		readyMsg := SignalingMessage{
			Type:      "peer_ready",
			SenderID:  userID,
			Timestamp: time.Now().UnixMilli(),
		}
		readyData, _ := json.Marshal(readyMsg)
		select {
		case client.Send <- readyData:
		default:
		}
	}

	// 6. Reader Pump
	defer func() {
		GlobalSignalingHub.RemoveClient(sessionID, client)
		conn.Close()
	}()

	conn.SetReadLimit(131072) // 128 KB limit for large SDP descriptions
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[INFO] Audio client %d disconnected from session %s: %v\n", userID, sessionID, err)
			}
			break
		}

		var sigMsg SignalingMessage
		if err := json.Unmarshal(rawMsg, &sigMsg); err != nil {
			continue
		}

		sigMsg.SenderID = userID
		sigMsg.Timestamp = time.Now().UnixMilli()

		if sigMsg.Type == "ping" {
			pongMsg := SignalingMessage{Type: "pong", Timestamp: time.Now().UnixMilli()}
			pongData, _ := json.Marshal(pongMsg)
			select {
			case client.Send <- pongData:
			default:
			}
			continue
		}

		// Relay signaling message (offer, answer, ice-candidate, mute-status) to peer
		relayedData, err := json.Marshal(sigMsg)
		if err == nil {
			room.BroadcastToPeer(userID, relayedData)
		}
	}
}
