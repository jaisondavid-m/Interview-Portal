# ==========================================
# Build Stage
# ==========================================
FROM golang:1.24-alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOFLAGS="-mod=vendor"
ENV GOPROXY="https://goproxy.io,https://proxy.golang.org,direct"

# Copy all source files including vendor
COPY . .

# Build lightweight static binary using Go vendor
RUN go build -mod=vendor -ldflags="-w -s" -o /app/server main.go


# ==========================================
# Multi-stage Runtime stage
# ==========================================
FROM mock-mate-server:latest

WORKDIR /app

# Copy newly compiled binary from build stage
COPY --from=builder /app/server /app/server

# Expose backend port
EXPOSE 8080

CMD ["/app/server"]
