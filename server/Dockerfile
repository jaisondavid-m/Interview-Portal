# ==========================================
# Build Stage
# ==========================================
FROM golang:1.24-alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto

# Install CA certificates, tzdata, and git
RUN apk add --no-cache git ca-certificates tzdata

# Copy module files first
COPY go.mod ./
COPY go.sum* ./

# Copy all source files
COPY . .

# Ensure dependencies are tidied and downloaded cleanly
RUN go mod tidy && go mod download

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
