# Dockerfile for ShortForge Render Worker
# Debian Bookworm includes native FFmpeg with libx264, libass, and AAC support.
FROM node:20-bookworm-slim AS base

# Install system dependencies: FFmpeg, fonts, fontconfig, and SSL certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fontconfig \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    ca-certificates \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV IS_RENDER_WORKER=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY apps/dashboard/package.json ./apps/dashboard/

# Install dependencies
RUN npm ci --include=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy the rest of the application
COPY apps/dashboard ./apps/dashboard

# Build the Next.js app for production
RUN npm --prefix apps/dashboard run build

# Create temporary pipeline working directory with proper permissions
RUN mkdir -p /tmp/tars-data && chmod 777 /tmp/tars-data

EXPOSE 10000

# Start Next.js production server listening on all network interfaces
CMD ["npm", "--prefix", "apps/dashboard", "run", "start", "--", "-p", "10000", "-H", "0.0.0.0"]
