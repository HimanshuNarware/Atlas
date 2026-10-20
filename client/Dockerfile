# Multi-stage Dockerfile for DocReader Frontend (React + Vite + Nginx)
# Stage 1: Build production static assets
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy client source code
COPY . .

# Optional build-time argument to override API URL if not using reverse proxy
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle to dist/
RUN npm run build

# Stage 2: Serve static files with lightweight Nginx
FROM nginx:alpine AS runner

# Copy custom Nginx configuration with SPA routing & reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
