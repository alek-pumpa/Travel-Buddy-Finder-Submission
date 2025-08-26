FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies that might be needed)
RUN npm ci

# If dotenv is missing, install it specifically
RUN npm install dotenv

# Copy source code
COPY . .

# Create upload directories
RUN mkdir -p public/uploads/profile-pictures public/uploads/marketplace
RUN chown -R appuser:nodejs public/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]