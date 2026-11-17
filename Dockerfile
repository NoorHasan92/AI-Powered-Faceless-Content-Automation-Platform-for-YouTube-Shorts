# Dockerfile for ShortForge Render Worker
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
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV IS_RENDER_WORKER=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=10000
# Build-time dummy variables to allow Next.js route collection without failing (overridden at runtime by Render)
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/build_dummy"
ENV JWT_SECRET="render_build_dummy_jwt_secret_32_chars_long"
ENV PEXELS_API_KEY="render_build_dummy_pexels_key"
ENV GEMINI_API_KEY="render_build_dummy_gemini_key"
ENV CLOUDINARY_CLOUD_NAME="render_build_dummy"
ENV CLOUDINARY_API_KEY="render_build_dummy"
ENV CLOUDINARY_API_SECRET="render_build_dummy"
ENV RESEND_API_KEY="re_dummy_build_key"

# Copy root package files and install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy Prisma schema and config
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY apps/dashboard/prisma ./apps/dashboard/prisma/
COPY apps/dashboard/prisma.config.ts ./apps/dashboard/

# Copy apps/dashboard package files and install dashboard dependencies (Next.js, React, Linux SWC)
COPY apps/dashboard/package.json ./apps/dashboard/
RUN cd apps/dashboard && npm install --include=dev

# Generate Prisma client
RUN npx prisma generate
RUN cd apps/dashboard && npx prisma generate 2>/dev/null || true

# Copy the rest of the application
COPY apps/dashboard ./apps/dashboard

# Build the Next.js app for production
RUN cd apps/dashboard && npm run build

# Create temporary pipeline working directory with proper permissions
RUN mkdir -p /tmp/tars-data && chmod 777 /tmp/tars-data

# Set runtime Node memory constraints to protect against container OOM on 512MB instances
ENV NODE_OPTIONS="--max-old-space-size=96 --expose-gc"

EXPOSE 10000

# Start Next.js production server listening on all network interfaces
CMD ["npm", "--prefix", "apps/dashboard", "run", "start", "--", "-p", "10000", "-H", "0.0.0.0"]
