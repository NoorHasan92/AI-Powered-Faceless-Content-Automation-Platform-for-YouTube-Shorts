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

# Copy root package files and install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy apps/dashboard package files and install dashboard dependencies (Next.js, React, Linux SWC)
COPY apps/dashboard/package.json ./apps/dashboard/
RUN cd apps/dashboard && npm install --include=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate
RUN mkdir -p ./apps/dashboard/node_modules/@prisma && cp -r node_modules/@prisma/client ./apps/dashboard/node_modules/@prisma/client 2>/dev/null || true

# Copy the rest of the application
COPY apps/dashboard ./apps/dashboard

# Build the Next.js app for production
RUN cd apps/dashboard && npm run build

# Create temporary pipeline working directory with proper permissions
RUN mkdir -p /tmp/tars-data && chmod 777 /tmp/tars-data

EXPOSE 10000

# Start Next.js production server listening on all network interfaces
CMD ["npm", "--prefix", "apps/dashboard", "run", "start", "--", "-p", "10000", "-H", "0.0.0.0"]
