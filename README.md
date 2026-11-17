<div align="center">

# 🎬 ShortForge
### Autonomous AI Video Production & Publishing Platform for YouTube Shorts & Mini-Docs

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.10-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Engine-007808?style=for-the-badge&logo=ffmpeg)](https://ffmpeg.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.1_Flash-8E75C2?style=for-the-badge&logo=google)](https://ai.google.dev/)

<p align="center">
  ShortForge is a production-grade, full-stack autonomous AI content platform. It transforms topic ideas, live YouTube trends, and research concepts into broadcast-ready, fully voiced, styled, and captioned video productions—rendered in 1080p and published directly to YouTube with zero manual video editing required.
</p>

[Live Production](https://shortsforge.tars.homes) • [Agent Architecture](AGENTS.md) • [Engineering Roadmap](IMPROVEMENTS.md)

</div>

---

## 🌟 Key Highlights & Capabilities

### 1. 2-Stage Creative Brief & Scriptwriting Architecture
To prevent generic hallucinations and narrative drift, ShortForge implements a dual-stage generation model powered by Google Gemini:
- **Stage 1 (Creative Brief & Deep Research Dossier)**: Automatically investigates topic seeds against verified historical records, scientific mechanisms, and competitor angles. Locks narrative anchors, forbidden drift topics, visual expectations, and closing payoff styles.
- **Stage 2 (Script & Cinematic Direction)**: Strictly executes the locked brief, breaking the script into 10–14 beat-timed scenes with dedicated visual prompts, camera pacing, on-screen text, and fallback search queries.

### 2. Multi-Format Video Studio (Vertical Shorts + 16:9 Long-Form)
- **9:16 Vertical Shorts (1080×1920)**: Fast-paced, punchy mobile storytelling (15s–60s) with kinetic subtitle transitions and rapid scene cuts.
- **16:9 Landscape Documentaries (1920×1080)**: Multi-act chapters (3–10 minutes) with deep factual dossiers, chapter cards, and cinematic wide-angle B-roll.

### 3. Live YouTube Trend Radar
- Real-time topic ideation engine that queries live cultural buzz, viral scores, and hook angles across niches (Science, History, Tech, Finance, Mysteries).
- 1-click wizard auto-fill populated directly from live trends.

### 4. Neural 24kHz Voiceover Generation
- Integrated with **Microsoft Edge TTS** neural speech synthesis with zero per-character API charges.
- Ground-truth word telemetry parsing for word-level subtitle alignment.
- Resilient WebSocket connection management, randomized exponential backoff, and incremental synthesis (resumes where it left off).

### 5. Kinetic Substation Alpha Subtitles (`.ass`)
- Replaces amateurish static captions with broadcast-styled kinetic typography using Montserrat bold typography, high-contrast drop shadows, and contextual word emphasis.

### 6. Hardware-Optimized Render Worker Engine
- Custom distributed rendering architecture: Offloads video composition from Vercel serverless functions to a dedicated **Render Linux Worker**.
- Engineered to compile 30-scene 1080p videos within a strict **512MB RAM free-tier budget** using single-threaded FFmpeg pipelines, streaming disk buffers, and active Node garbage collection.
- Real-time compilation progress bar (`0%` to `100%`) with per-scene indicators and on-demand **instant cancellation** (`SIGKILL`).

### 7. Direct YouTube Publishing & Hybrid Analytics
- Connect your YouTube channel via Google OAuth.
- Upload rendered MP4s directly with auto-generated metadata, descriptions, tags, and scheduling.
- Track combined internal pipeline performance and live YouTube channel analytics (views, likes, retention).

---

## 🏗 System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │          Client Web Dashboard           │
                    │         (shortsforge.tars.homes)        │
                    └────────────────────┬────────────────────┘
                                         │
                   Server Actions / API  │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │      Vercel Edge / Serverless API       │
                    │   - Gemini 3.1 Flash Research Engine    │
                    │   - Edge-TTS Voiceover Synthesizer      │
                    │   - Pexels Media Asset Finder           │
                    │   - YouTube Data API v3 OAuth           │
                    └────────────┬──────────────────┬─────────┘
                                 │                  │
           Atomic Pipeline State │                  │ Delegated Export Dispatch
                                 ▼                  ▼ (Bearer Token Auth)
┌──────────────────────────────────────┐     ┌────────────────────────────────────────┐
│     Neon Serverless PostgreSQL       │     │       Render Worker Web Service        │
│   - Projects, Scripts, Scenes        │     │        (shortforge-worker)             │
│   - Voiceovers, Assets, Subtitles    │     │  - FFmpeg 1080p / 9:16 Video Engine    │
│   - ExportJobs (Progress & Cancel)   │     │  - Continuous BGM Track Concat         │
└──────────────────────────────────────┘     │  - Cloudinary Streaming Uploader       │
                                             └──────────────────┬─────────────────────┘
                                                                │
                                                                ▼
                                             ┌────────────────────────────────────────┐
                                             │         Cloudinary CDN Storage         │
                                             │  - 24kHz Scene Audio (.mp3)            │
                                             │  - Final Master Video (.mp4)           │
                                             └────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, Turbopack, Server Actions) |
| **Language** | TypeScript 5.x |
| **Styling & UI** | Tailwind CSS 3.4, Framer Motion, Lucide Icons |
| **Database** | Neon Serverless PostgreSQL with Prisma 7 ORM |
| **AI Intelligence** | Google Gemini 3.1 Flash Lite API |
| **Voice Synthesis** | Microsoft Edge TTS (24kHz Neural) |
| **Visual Media** | Pexels REST API (Video & Photo endpoints) |
| **Video Engine** | FFmpeg (Native binary on Linux, `fluent-ffmpeg`) |
| **Cloud Storage** | Cloudinary REST SDK |
| **External Auth** | YouTube Data API v3 (Google OAuth2), Custom JWT Session Auth |

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm** or **pnpm**
- **FFmpeg**: Installed locally and accessible in your system `PATH` (for local video composition testing)

### 2. Clone the Repository
```bash
git clone https://github.com/NoorHasan92/AI-Powered-Faceless-Content-Automation-Platform-for-YouTube-Shorts.git
cd AI-Powered-Faceless-Content-Automation-Platform-for-YouTube-Shorts
```

### 3. Install Dependencies
```bash
# Install root workspace dependencies
npm install

# Install dashboard application dependencies
cd apps/dashboard
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` into `.env` at the root and inside `apps/dashboard/.env`:
```bash
cp .env.example .env
```

Fill in your service API keys:
```env
# Database
DATABASE_URL="postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require"

# Custom Auth
JWT_SECRET="your-ultra-secure-jwt-secret"

# AI / Gemini
GEMINI_API_KEY="your-gemini-api-key"

# Stock Media
PEXELS_API_KEY="your-pexels-api-key"

# Cloud Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Dedicated Worker Delegation
RENDER_WORKER_URL="https://shortforge-worker.onrender.com"
WORKER_SECRET="your-shared-worker-secret"

# YouTube OAuth (Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/youtube/callback"
```

### 5. Push Database Schema & Generate Prisma Client
```bash
npx prisma db push
npx prisma generate
```

### 6. Run the Development Server
```bash
cd apps/dashboard
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Production Deployment

### 1. Deploying Dashboard to Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `apps/dashboard`.
3. Add all environment variables listed in `.env.example`.
4. Deploy! Next.js Turbopack will compile the production bundle.

### 2. Deploying the Video Composer Worker to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect this repository and set the root directory to `apps/dashboard`.
3. Set the build and start commands:
   - **Build Command**: `prisma generate && next build`
   - **Start Command**: `node --max-old-space-size=96 ./node_modules/next/dist/bin/next start -p 10000 -H 0.0.0.0`
4. Set the environment variables:
   - `IS_RENDER_WORKER="true"`
   - `WORKER_SECRET="<same secret as Vercel>"`
   - `DATABASE_URL`, `PEXELS_API_KEY`, `CLOUDINARY_*`
5. The worker will listen on port `10000` and handle all FFmpeg export jobs dispatched from Vercel!

---

## 📖 Documentation & Agent Instructions

- **[AGENTS.md](AGENTS.md)**: Deep architectural guide and constraints manual for AI coding assistants working in this repository.
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)**: Technical research, benchmarks, and planned engineering enhancements for subtitle smoothness, audio mastering, and sidechain ducking.

---

## 📄 License & Credits

Distributed under the MIT License. Built with ❤️ by **Md Noor Hasan Ansari**.
