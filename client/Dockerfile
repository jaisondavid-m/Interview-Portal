# ==========================================
# API Portal Client - High Performance Nginx Production Image
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

# Copy package manifests and install dependencies
COPY package.json package-lock.json* ./
RUN npm install


# Copy client source files
COPY . .

# Build Vite application with relative or custom API path
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID=956639761791-ooo2p9kmj35nfekt5s6hli3maokv73qc.apps.googleusercontent.com
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# ==========================================
# Production Stage - Nginx
# ==========================================
FROM nginx:alpine

# Remove problematic IPv6 entrypoint script
RUN rm -f /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh

# Clean default nginx templates and assets
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy custom reverse proxy & SPA configuration
RUN echo 'upstream active_backend { server mockmate-app-blue:8080; }' > /etc/nginx/conf.d/active_upstream.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy pre-compiled Vite production bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
