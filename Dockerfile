# Multi-stage build for Travel Buddy Finder
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for both frontend and backend
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm ci --only=production
RUN cd backend && npm ci --only=production

# Build frontend
FROM base AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source
COPY frontend/ .
COPY --from=deps /app/frontend/node_modules ./node_modules

# Build frontend
RUN npm run build

# Production backend stage
FROM base AS backend
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy backend dependencies and source
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/ .

# Copy built frontend to backend public directory
COPY --from=frontend-builder /app/frontend/build ./public/frontend

# Create upload directories
RUN mkdir -p public/uploads/profile-pictures public/uploads/marketplace
RUN chown -R appuser:nodejs public/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]