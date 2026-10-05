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
# Multi-stage Runtime stages
# ==========================================
FROM python:3.12-alpine AS python-runtime
FROM eclipse-temurin:17-alpine AS java-runtime

FROM node:22-alpine3.21

WORKDIR /app

# Install GCC, G++, libc-dev for native C/C++ compilation
RUN apk add --no-cache build-base

# Copy Java runtime from eclipse-temurin:17-alpine (instant multi-stage copy, zero APK network timeouts)
COPY --from=java-runtime /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="/opt/java/openjdk/bin:${PATH}"

# Copy Python runtime from official python:3.12-alpine (zero network dependency during build)
COPY --from=python-runtime /usr/local/bin/python3* /usr/local/bin/
COPY --from=python-runtime /usr/local/bin/pip3* /usr/local/bin/
COPY --from=python-runtime /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=python-runtime /usr/local/lib/libpython* /usr/local/lib/
COPY --from=python-runtime /usr/local/include/python3.12 /usr/local/include/python3.12

# Symlink python and node for universal path resolution
RUN ln -sf /usr/local/bin/python3 /usr/bin/python3 && \
    ln -sf /usr/local/bin/python3 /usr/bin/python && \
    ln -sf /usr/local/bin/node /usr/bin/node 2>/dev/null || true

# Copy Go runtime from official golang builder (zero network dependency during build)
COPY --from=builder /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}"

# Copy binary from build stage
COPY --from=builder /app/server /app/server

# Expose backend port
EXPOSE 8080

CMD ["/app/server"]
