# ==========================================
# Build Stage
# ==========================================
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install CA certificates, tzdata and git for private/public modules
RUN apk add --no-cache git ca-certificates tzdata

# Download dependencies first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy application source
COPY . .

# Build lightweight, static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server main.go

# ==========================================
# Production Stage
# ==========================================
FROM alpine:3.20

WORKDIR /app

# Install runtime dependencies (certificates & timezone data)
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from build stage
COPY --from=builder /app/server /app/server

# Expose backend port
EXPOSE 8080

CMD ["/app/server"]
