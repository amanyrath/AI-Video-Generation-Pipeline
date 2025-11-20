FROM node:18-alpine

# Install FFmpeg and bash for startup script
RUN apk add --no-cache ffmpeg bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build the app
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Start the app with migration deployment
CMD npx prisma migrate deploy && npm start
