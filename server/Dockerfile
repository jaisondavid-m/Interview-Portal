# ==========================================
# Build Stage
# ==========================================
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy all source files including vendored modules
COPY . .

# Build lightweight static binary offline using local vendor directory
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -ldflags="-w -s" -o /app/server main.go

# ==========================================
# Production Stage
# ==========================================
FROM alpine:3.20

WORKDIR /app

# Install Node.js and Python3 runtimes for real-time code evaluation engine
RUN apk add --no-cache nodejs python3

# Copy binary from build stage
COPY --from=builder /app/server /app/server

# Expose backend port
EXPOSE 8080

CMD ["/app/server"]
