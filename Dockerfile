FROM node:18-alpine

# Install FFmpeg and bash
RUN apk add --no-cache ffmpeg bash

WORKDIR /app

# Copy package files and Prisma schema first for better caching
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (this layer is cached unless package files change)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code (changes frequently, so do this last)
COPY . .

# Generate Prisma client and build (npm run build already includes prisma generate)
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Copy and make start script executable
COPY start.sh ./
RUN chmod +x start.sh

# Start the app with migration deployment
CMD ["./start.sh"]
