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
# Production Stage (Node.js + Python3 Runtime)
# ==========================================
FROM python:3.12-alpine AS python-runtime

FROM node:22-alpine

WORKDIR /app

# Copy Python runtime from official python:3.12-alpine (zero network dependency during build)
COPY --from=python-runtime /usr/local/bin/python3* /usr/local/bin/
COPY --from=python-runtime /usr/local/bin/pip3* /usr/local/bin/
COPY --from=python-runtime /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=python-runtime /usr/local/lib/libpython* /usr/local/lib/
COPY --from=python-runtime /usr/local/include/python3.12 /usr/local/include/python3.12

# Symlink python for universal path resolution
RUN ln -sf /usr/local/bin/python3 /usr/bin/python3 && \
    ln -sf /usr/local/bin/python3 /usr/bin/python && \
    ln -sf /usr/local/bin/node /usr/bin/node 2>/dev/null || true

# Copy binary from build stage
COPY --from=builder /app/server /app/server

# Expose backend port
EXPOSE 8080

CMD ["/app/server"]
