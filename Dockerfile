# Dockerfile for HealthyMe Self-Hosted Health Tracker
FROM node:24-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend static bundle
RUN npm run build

# Prune dev dependencies for a lightweight production image
RUN npm prune --production

# Create persistent data directory
RUN mkdir -p /app/server/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=4228
ENV HOST=0.0.0.0
ENV DB_PATH=/app/server/data/healthyme.sqlite

EXPOSE 4228

VOLUME ["/app/server/data"]

CMD ["node", "server/index.js"]
