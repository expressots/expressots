# ExpressoTS Micro Template - Production Dockerfile
# Multi-stage build for optimal image size

# ============================================================================
# Build Stage
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================================================
# Production Stage
# ============================================================================
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S expressots -u 1001 -G nodejs

# Copy built files from builder
COPY --from=builder --chown=expressots:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressots:nodejs /app/dist ./dist
COPY --from=builder --chown=expressots:nodejs /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER expressots

# Expose port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/src/api.js"]
